"""
src/ai.py — AI-powered message drafting via Claude API.

POST /api/draft-message   — generate an intro message (requires auth)
"""

import logging
import os

logger = logging.getLogger(__name__)

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from .db import db
from .models import Tenant, User
from .plans import is_pro, upgrade_error

bp = Blueprint("ai", __name__)


@bp.post("/api/draft-message")
@jwt_required()
def draft_message():
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    tenant = db.session.get(Tenant, user.tenant_id) if user else None
    if not is_pro(tenant):
        return upgrade_error("AI-drafted messages are a Pro feature. Upgrade to use Claude-powered intros.")

    try:
        import anthropic
    except ImportError:
        return jsonify(error="anthropic package not installed. Run: pip install anthropic"), 500

    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key:
        return jsonify(error="ANTHROPIC_API_KEY not configured in .env"), 500

    data = request.get_json(silent=True) or {}
    path = data.get("path", [])    # list of {first_name, last_name}
    target = data.get("target", {})
    context = data.get("context", "")

    target_name = (
        f"{target.get('first_name', '')} {target.get('last_name', '')}".strip() or "them"
    )

    if len(path) >= 3:
        connector = path[1]
        connector_name = f"{connector.get('first_name', '')} {connector.get('last_name', '')}".strip()
        chain = " → ".join(p.get("first_name", "").strip() for p in path)
        prompt = (
            f"Write a short, warm LinkedIn message from me to {connector_name} asking them to introduce me to {target_name}.\n"
            f"Connection path: {chain}\n"
            f"{'Context about why I want to connect: ' + context if context else ''}\n\n"
            "Rules:\n"
            f"- Start with: Hi {connector_name},\n"
            "- 3-4 sentences max\n"
            "- Friendly and specific, not generic\n"
            "- Leave [your reason] as a placeholder for the specific ask\n"
            "- End with: Thanks!\n"
            "- Output only the message text, nothing else"
        )
    else:
        prompt = (
            f"Write a short, warm direct LinkedIn connection request message to {target_name}.\n"
            f"{'Context: ' + context if context else ''}\n\n"
            "Rules:\n"
            f"- Start with: Hi {target_name},\n"
            "- 2-3 sentences max\n"
            "- Friendly and professional\n"
            "- End with: Best,\n"
            "- Output only the message text, nothing else"
        )

    client = anthropic.Anthropic(api_key=api_key)
    try:
        result = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=300,
            messages=[{"role": "user", "content": prompt}],
        )
        return jsonify(message=result.content[0].text)
    except Exception as e:
        logger.error("draft_message failed for user %s: %s", user_id, e)
        return jsonify(error="Failed to generate message. Please try again."), 502
