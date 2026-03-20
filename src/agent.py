"""
src/agent.py — AI agent with tool use for network intelligence.

GET    /api/agent/context         — get user's business context
PUT    /api/agent/context         — save/update business context
GET    /api/agent/targets         — list target accounts
POST   /api/agent/targets         — add target account
DELETE /api/agent/targets/<id>    — remove target account
POST   /api/agent/chat            — streaming SSE chat with Claude + tools
"""

import json
import os
from collections import deque

from flask import Blueprint, Response, jsonify, request, stream_with_context
from flask_jwt_extended import get_jwt_identity, jwt_required
from sqlalchemy import and_, func

from .db import db
from .models import AgentContext, Edge, Person, TargetAccount, Tenant, User
from .plans import is_pro, upgrade_error

bp = Blueprint("agent", __name__)


# ── TOOL DEFINITIONS ──────────────────────────────────────────────────────────

TOOLS = [
    {
        "name": "search_network",
        "description": (
            "Search the user's professional network for people matching a query. "
            "Use this to find specific people by name, discover who works at a company, "
            "or find people with a certain job title. Always search before referencing a specific person."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Search query — name, company name, job title, or combination"
                }
            },
            "required": ["query"]
        }
    },
    {
        "name": "find_path",
        "description": (
            "Find the shortest warm introduction path from the user to a target person. "
            "Returns the full chain of intermediaries. Use this when the user wants to "
            "reach someone specific."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "target_name": {
                    "type": "string",
                    "description": "Full or partial name of the person to find a path to"
                }
            },
            "required": ["target_name"]
        }
    },
    {
        "name": "get_network_overview",
        "description": (
            "Get a high-level overview of the user's network — total connections, "
            "top companies represented, and network statistics. Use this for general "
            "network analysis questions."
        ),
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": []
        }
    },
    {
        "name": "get_target_accounts",
        "description": "Get the user's saved list of target accounts (companies they want to reach via warm introductions).",
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": []
        }
    },
    {
        "name": "add_target_account",
        "description": "Save a new company to the user's target accounts list.",
        "input_schema": {
            "type": "object",
            "properties": {
                "company_name": {
                    "type": "string",
                    "description": "Name of the company to add"
                },
                "reason": {
                    "type": "string",
                    "description": "Why this company is a target (e.g., 'Series B fintech, ideal buyer for our API product')"
                }
            },
            "required": ["company_name"]
        }
    },
    {
        "name": "remove_target_account",
        "description": "Remove a company from the user's target accounts list.",
        "input_schema": {
            "type": "object",
            "properties": {
                "company_name": {
                    "type": "string",
                    "description": "Name of the company to remove"
                }
            },
            "required": ["company_name"]
        }
    },
]


# ── TOOL IMPLEMENTATIONS ──────────────────────────────────────────────────────

def _person_dict(p):
    return {
        "id": p.id,
        "name": f"{p.first_name or ''} {p.last_name or ''}".strip(),
        "first_name": p.first_name,
        "last_name": p.last_name,
        "company": p.company,
        "title": p.title,
    }


def tool_search_network(query: str, tenant_id: int) -> dict:
    terms = query.strip().split()
    base_q = Person.query.filter_by(tenant_id=tenant_id, is_self=False)
    if terms:
        filters = [
            db.or_(
                Person.first_name.ilike(f"%{t}%"),
                Person.last_name.ilike(f"%{t}%"),
                Person.company.ilike(f"%{t}%"),
                Person.title.ilike(f"%{t}%"),
            )
            for t in terms
        ]
        persons = base_q.filter(and_(*filters)).limit(20).all()
    else:
        persons = base_q.limit(20).all()
    return {"people": [_person_dict(p) for p in persons], "count": len(persons)}


def tool_find_path(target_name: str, user_id: int, tenant_id: int) -> dict:
    self_person = Person.query.filter_by(user_id=user_id, is_self=True).first()
    if not self_person:
        return {"error": "Your profile (self person) not found in network"}

    # Search for target by name
    terms = target_name.strip().split()
    base_q = Person.query.filter_by(tenant_id=tenant_id, is_self=False)

    candidates = []
    if len(terms) >= 2:
        candidates = base_q.filter(
            Person.first_name.ilike(f"%{terms[0]}%"),
            Person.last_name.ilike(f"%{terms[-1]}%"),
        ).all()

    if not candidates and terms:
        for term in terms:
            candidates = base_q.filter(
                db.or_(Person.first_name.ilike(f"%{term}%"), Person.last_name.ilike(f"%{term}%"))
            ).all()
            if candidates:
                break

    if not candidates:
        return {"error": f"No one named '{target_name}' found in your network"}
    if len(candidates) > 1:
        return {
            "ambiguous": True,
            "message": f"Found {len(candidates)} people matching '{target_name}'. Please be more specific.",
            "matches": [_person_dict(p) for p in candidates[:5]],
        }

    target = candidates[0]
    if self_person.id == target.id:
        return {"path": [_person_dict(self_person)], "degrees": 0}

    # BFS
    edges = Edge.query.filter_by(tenant_id=tenant_id).all()
    adjacency: dict[int, list[int]] = {}
    for edge in edges:
        adjacency.setdefault(edge.from_person_id, []).append(edge.to_person_id)
        adjacency.setdefault(edge.to_person_id, []).append(edge.from_person_id)

    visited = {self_person.id}
    queue: deque = deque([[self_person.id]])
    while queue:
        path_ids = queue.popleft()
        current = path_ids[-1]
        for neighbor in adjacency.get(current, []):
            if neighbor == target.id:
                full_ids = path_ids + [neighbor]
                persons_by_id = {
                    p.id: p
                    for p in Person.query.filter(Person.id.in_(full_ids)).all()
                }
                return {
                    "path": [_person_dict(persons_by_id[pid]) for pid in full_ids if pid in persons_by_id],
                    "degrees": len(full_ids) - 1,
                }
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append(path_ids + [neighbor])

    return {"error": f"No connection path found to {target.first_name} {target.last_name}"}


def tool_get_network_overview(tenant_id: int) -> dict:
    total = Person.query.filter_by(tenant_id=tenant_id, is_self=False).count()
    total_edges = Edge.query.filter_by(tenant_id=tenant_id).count()
    company_counts = (
        db.session.query(Person.company, func.count(Person.id).label("count"))
        .filter(
            Person.tenant_id == tenant_id,
            Person.is_self == False,
            Person.company.isnot(None),
            Person.company != "",
        )
        .group_by(Person.company)
        .order_by(func.count(Person.id).desc())
        .limit(10)
        .all()
    )
    return {
        "total_connections": total,
        "total_edges": total_edges,
        "top_companies": [{"company": c, "count": n} for c, n in company_counts],
    }


def tool_get_target_accounts(user_id: int) -> dict:
    targets = TargetAccount.query.filter_by(user_id=user_id).order_by(TargetAccount.created_at.desc()).all()
    return {"targets": [{"id": t.id, "company_name": t.company_name, "reason": t.reason} for t in targets]}


def tool_add_target_account(company_name: str, reason: str, user_id: int, tenant_id: int) -> dict:
    existing = TargetAccount.query.filter_by(user_id=user_id, company_name=company_name).first()
    if existing:
        if reason:
            existing.reason = reason
            db.session.commit()
        return {"success": True, "message": f"Updated target account: {company_name}", "id": existing.id}
    target = TargetAccount(user_id=user_id, tenant_id=tenant_id, company_name=company_name, reason=reason or "")
    db.session.add(target)
    db.session.commit()
    return {"success": True, "message": f"Added {company_name} to your target accounts", "id": target.id}


def tool_remove_target_account(company_name: str, user_id: int) -> dict:
    target = TargetAccount.query.filter(
        TargetAccount.user_id == user_id,
        TargetAccount.company_name.ilike(f"%{company_name}%"),
    ).first()
    if not target:
        return {"error": f"No target account found matching '{company_name}'"}
    name = target.company_name
    db.session.delete(target)
    db.session.commit()
    return {"success": True, "message": f"Removed {name} from target accounts"}


def execute_tool(name: str, tool_input: dict, user_id: int, tenant_id: int) -> str:
    try:
        if name == "search_network":
            result = tool_search_network(tool_input["query"], tenant_id)
        elif name == "find_path":
            result = tool_find_path(tool_input["target_name"], user_id, tenant_id)
        elif name == "get_network_overview":
            result = tool_get_network_overview(tenant_id)
        elif name == "get_target_accounts":
            result = tool_get_target_accounts(user_id)
        elif name == "add_target_account":
            result = tool_add_target_account(
                tool_input["company_name"], tool_input.get("reason", ""), user_id, tenant_id
            )
        elif name == "remove_target_account":
            result = tool_remove_target_account(tool_input["company_name"], user_id)
        else:
            result = {"error": f"Unknown tool: {name}"}
    except Exception as e:
        result = {"error": str(e)}
    return json.dumps(result)


# ── CONTEXT ENDPOINTS ─────────────────────────────────────────────────────────

@bp.get("/api/agent/context")
@jwt_required()
def get_context():
    user_id = int(get_jwt_identity())
    ctx = AgentContext.query.filter_by(user_id=user_id).first()
    if not ctx:
        return jsonify(context=None)
    return jsonify(context={
        "my_company":      ctx.my_company,
        "my_role":         ctx.my_role,
        "what_i_sell":     ctx.what_i_sell,
        "icp_description": ctx.icp_description,
    })


@bp.put("/api/agent/context")
@jwt_required()
def save_context():
    user_id = int(get_jwt_identity())
    data = request.get_json(silent=True) or {}
    ctx = AgentContext.query.filter_by(user_id=user_id).first()
    if not ctx:
        ctx = AgentContext(user_id=user_id)
        db.session.add(ctx)
    ctx.my_company      = (data.get("my_company")      or "").strip() or None
    ctx.my_role         = (data.get("my_role")         or "").strip() or None
    ctx.what_i_sell     = (data.get("what_i_sell")     or "").strip() or None
    ctx.icp_description = (data.get("icp_description") or "").strip() or None
    db.session.commit()
    return jsonify(success=True)


# ── TARGET ACCOUNTS ───────────────────────────────────────────────────────────

@bp.get("/api/agent/targets")
@jwt_required()
def list_targets():
    user_id = int(get_jwt_identity())
    targets = TargetAccount.query.filter_by(user_id=user_id).order_by(TargetAccount.created_at.desc()).all()
    return jsonify(targets=[
        {"id": t.id, "company_name": t.company_name, "reason": t.reason} for t in targets
    ])


@bp.post("/api/agent/targets")
@jwt_required()
def add_target():
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    data = request.get_json(silent=True) or {}
    company_name = (data.get("company_name") or "").strip()
    if not company_name:
        return jsonify(error="company_name is required"), 400
    existing = TargetAccount.query.filter_by(user_id=user_id, company_name=company_name).first()
    if existing:
        return jsonify(error="Already in target accounts"), 409
    target = TargetAccount(
        user_id=user_id,
        tenant_id=user.tenant_id,
        company_name=company_name,
        reason=(data.get("reason") or "").strip(),
    )
    db.session.add(target)
    db.session.commit()
    return jsonify(id=target.id, company_name=target.company_name, reason=target.reason), 201


@bp.delete("/api/agent/targets/<int:target_id>")
@jwt_required()
def delete_target(target_id):
    user_id = int(get_jwt_identity())
    target = TargetAccount.query.filter_by(id=target_id, user_id=user_id).first()
    if not target:
        return jsonify(error="Not found"), 404
    db.session.delete(target)
    db.session.commit()
    return "", 204


# ── CHAT ──────────────────────────────────────────────────────────────────────

@bp.post("/api/agent/chat")
@jwt_required()
def agent_chat():
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    tenant = db.session.get(Tenant, user.tenant_id) if user else None
    if not is_pro(tenant):
        return upgrade_error(
            "The AI Agent is a Pro feature. Upgrade to access your network intelligence assistant."
        )

    try:
        import anthropic
    except ImportError:
        return jsonify(error="anthropic package not installed. Run: pip install anthropic"), 500

    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key:
        return jsonify(error="ANTHROPIC_API_KEY not configured"), 500

    data = request.get_json(silent=True) or {}
    incoming_messages = data.get("messages", [])
    if not incoming_messages:
        return jsonify(error="messages is required"), 400

    # Build system prompt with user context
    self_person = Person.query.filter_by(user_id=user_id, is_self=True).first()
    ctx = AgentContext.query.filter_by(user_id=user_id).first()

    user_name = "the user"
    if self_person:
        user_name = f"{self_person.first_name or ''} {self_person.last_name or ''}".strip() or "the user"

    system_lines = [
        "You are a strategic networking assistant for OrbitSix — a professional network intelligence platform built around the six-degrees-of-separation principle.",
        f"\nThe user you're helping is {user_name}.",
    ]
    if ctx:
        if ctx.my_role:
            system_lines.append(f"Their role: {ctx.my_role}")
        if ctx.my_company:
            system_lines.append(f"Their company: {ctx.my_company}")
        if ctx.what_i_sell:
            system_lines.append(f"What they sell / their business: {ctx.what_i_sell}")
        if ctx.icp_description:
            system_lines.append(f"Their ideal customer profile (ICP): {ctx.icp_description}")

    system_lines += [
        "\nYour responsibilities:",
        "- Find warm introduction paths to target contacts using the network tools",
        "- Surface relevant connections the user may have overlooked",
        "- Recommend who to reach out to based on their business goals and ICP",
        "- Draft compelling, personalized intro messages when asked (reference the connector by name)",
        "- Help manage and prioritize their target accounts list",
        "- Identify network gaps and suggest actionable strategies to fill them",
        "\nGuidelines:",
        "- Always be specific and actionable — reference real people and paths from tool results",
        "- Use search_network before referencing any specific person",
        "- Use find_path when the user wants to reach someone specific",
        "- Keep responses concise and focused; lead with the most useful insight",
        "- When drafting intro messages, make them personal and reference the shared connection",
        "- If the network is small, acknowledge it and suggest ways to grow strategically",
    ]

    system_prompt = "\n".join(system_lines)
    client = anthropic.Anthropic(api_key=api_key)
    messages_hist = list(incoming_messages)

    def generate():
        nonlocal messages_hist
        for _turn in range(8):  # cap at 8 agentic turns
            try:
                with client.messages.stream(
                    model="claude-opus-4-6",
                    max_tokens=4096,
                    system=system_prompt,
                    tools=TOOLS,
                    messages=messages_hist,
                    thinking={"type": "adaptive"},
                ) as stream:
                    for event in stream:
                        if (
                            hasattr(event, "type")
                            and event.type == "content_block_delta"
                            and hasattr(event, "delta")
                            and getattr(event.delta, "type", None) == "text_delta"
                        ):
                            yield f"data: {json.dumps({'type': 'text', 'text': event.delta.text})}\n\n"

                    response = stream.get_final_message()

                # Append assistant turn (SDK content objects are accepted by next API call)
                messages_hist.append({"role": "assistant", "content": response.content})

                tool_use_blocks = [b for b in response.content if b.type == "tool_use"]
                if response.stop_reason == "end_turn" or not tool_use_blocks:
                    break

                # Execute tools
                tool_results = []
                for block in tool_use_blocks:
                    yield f"data: {json.dumps({'type': 'tool_start', 'tool': block.name})}\n\n"
                    result_str = execute_tool(block.name, block.input, user_id, user.tenant_id)
                    yield f"data: {json.dumps({'type': 'tool_done', 'tool': block.name})}\n\n"
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": result_str,
                    })

                messages_hist.append({"role": "user", "content": tool_results})

            except Exception as e:
                yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
                return

        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return Response(
        stream_with_context(generate()),
        mimetype="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
