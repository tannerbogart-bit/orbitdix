"""
src/admin.py — Internal admin API for monitoring beta users.

All endpoints require the logged-in user's email to be in ADMIN_EMAILS env var.
Set ADMIN_EMAILS=you@email.com in Railway (comma-separated for multiple admins).

GET    /api/admin/stats              — platform-wide totals
GET    /api/admin/users              — all users with per-user stats
GET    /api/admin/users/<id>         — single user deep-dive
PATCH  /api/admin/users/<id>/plan   — manually override plan
DELETE /api/admin/users/<id>        — delete a user + their data
"""

import logging
import os

from datetime import datetime, timezone
from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from sqlalchemy import func

from .db import db
from .models import (
    Activity, AgentContext, AgentMessage, Edge, Outreach,
    Person, SavedPath, Tenant, TargetAccount, User,
)

logger = logging.getLogger(__name__)
bp = Blueprint("admin", __name__)

ADMIN_EMAILS = {
    e.strip().lower()
    for e in os.getenv("ADMIN_EMAILS", "").split(",")
    if e.strip()
}


def _require_admin():
    """Return (user, error_response) — caller checks if error_response is not None."""
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    if user is None or user.email.lower() not in ADMIN_EMAILS:
        return None, (jsonify(error="Forbidden"), 403)
    return user, None


def _days_ago(dt):
    if not dt:
        return None
    dt_aware = dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt
    return max(0, (datetime.now(timezone.utc) - dt_aware).days)


# ── Platform stats ────────────────────────────────────────────────────────────

@bp.get("/api/admin/stats")
@jwt_required()
def admin_stats():
    _, err = _require_admin()
    if err:
        return err

    total_users    = db.session.query(func.count(User.id)).scalar() or 0
    total_tenants  = db.session.query(func.count(Tenant.id)).scalar() or 0
    total_contacts = db.session.query(func.count(Person.id)).filter(Person.is_self == False).scalar() or 0
    total_paths    = db.session.query(func.count(SavedPath.id)).scalar() or 0
    total_outreach = db.session.query(func.count(Outreach.id)).scalar() or 0
    total_messages = db.session.query(func.count(AgentMessage.id)).filter(AgentMessage.role == "user").scalar() or 0
    total_edges    = db.session.query(func.count(Edge.id)).scalar() or 0

    plan_counts = dict(
        db.session.query(Tenant.plan, func.count(Tenant.id))
        .group_by(Tenant.plan)
        .all()
    )

    from datetime import timedelta
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    new_this_week = db.session.query(func.count(User.id)).filter(User.created_at >= week_ago).scalar() or 0

    return jsonify(
        total_users=total_users,
        total_tenants=total_tenants,
        total_contacts=total_contacts,
        total_paths=total_paths,
        total_outreach=total_outreach,
        total_agent_messages=total_messages,
        total_edges=total_edges,
        new_this_week=new_this_week,
        plans=plan_counts,
    )


# ── User list ─────────────────────────────────────────────────────────────────

@bp.get("/api/admin/users")
@jwt_required()
def admin_users():
    _, err = _require_admin()
    if err:
        return err

    users = (
        db.session.query(User, Tenant)
        .join(Tenant, User.tenant_id == Tenant.id)
        .order_by(User.created_at.desc())
        .all()
    )

    # Batch-load per-user counts
    contact_counts = dict(
        db.session.query(Person.user_id, func.count(Person.id))
        .filter(Person.is_self == False)
        .group_by(Person.user_id).all()
    )
    agent_msg_counts = dict(
        db.session.query(AgentMessage.user_id, func.count(AgentMessage.id))
        .filter(AgentMessage.role == "user")
        .group_by(AgentMessage.user_id).all()
    )
    path_counts = dict(
        db.session.query(SavedPath.user_id, func.count(SavedPath.id))
        .group_by(SavedPath.user_id).all()
    )
    outreach_counts = dict(
        db.session.query(Outreach.user_id, func.count(Outreach.id))
        .group_by(Outreach.user_id).all()
    )
    target_counts = dict(
        db.session.query(TargetAccount.user_id, func.count(TargetAccount.id))
        .group_by(TargetAccount.user_id).all()
    )
    last_activity = dict(
        db.session.query(Activity.user_id, func.max(Activity.created_at))
        .group_by(Activity.user_id).all()
    )
    # Edge counts per tenant
    edge_counts = dict(
        db.session.query(Edge.tenant_id, func.count(Edge.id))
        .group_by(Edge.tenant_id).all()
    )
    # Self-person (name + signup source) per user
    self_persons = {
        p.user_id: p
        for p in Person.query.filter_by(is_self=True).all()
    }
    # Onboarding complete = has AgentContext row
    has_context = {
        row[0]
        for row in db.session.query(AgentContext.user_id).all()
    }

    rows = []
    for user, tenant in users:
        last_active = last_activity.get(user.id)
        self_p = self_persons.get(user.id)
        first_name = self_p.first_name if self_p else ""
        last_name  = self_p.last_name  if self_p else ""
        signup_source = self_p.source if self_p else None

        rows.append({
            "id":                user.id,
            "email":             user.email,
            "first_name":        first_name,
            "last_name":         last_name,
            "signup_source":     signup_source,
            "plan":              tenant.plan,
            "subscription_status": tenant.subscription_status,
            "created_at":        user.created_at.isoformat() if user.created_at else None,
            "email_verified":    user.email_verified,
            "agreed_to_terms":   user.agreed_to_terms_at is not None,
            "signup_ip":         user.signup_ip,
            "onboarding_complete": user.id in has_context,
            "contacts":          contact_counts.get(user.id, 0),
            "agent_messages":    agent_msg_counts.get(user.id, 0),
            "saved_paths":       path_counts.get(user.id, 0),
            "outreach":          outreach_counts.get(user.id, 0),
            "targets":           target_counts.get(user.id, 0),
            "edges":             edge_counts.get(tenant.id, 0),
            "last_synced_at":    tenant.last_synced_at.isoformat() if tenant.last_synced_at else None,
            "last_active_at":    last_active.isoformat() if last_active else None,
            "days_since_active": _days_ago(last_active),
            "paths_found":       tenant.paths_found,
            "messages_drafted":  tenant.messages_drafted,
        })

    return jsonify(users=rows)


# ── Single user deep-dive ─────────────────────────────────────────────────────

@bp.get("/api/admin/users/<int:target_id>")
@jwt_required()
def admin_user_detail(target_id):
    _, err = _require_admin()
    if err:
        return err

    user = db.session.get(User, target_id)
    if not user:
        return jsonify(error="User not found"), 404

    tenant = db.session.get(Tenant, user.tenant_id)
    self_person = Person.query.filter_by(user_id=user.id, is_self=True).first()

    contacts = Person.query.filter_by(tenant_id=tenant.id, is_self=False).order_by(Person.created_at.desc()).limit(20).all()
    recent_activity = (
        Activity.query.filter_by(user_id=user.id)
        .order_by(Activity.created_at.desc())
        .limit(20).all()
    )
    targets = TargetAccount.query.filter_by(user_id=user.id).all()
    outreach = Outreach.query.filter_by(user_id=user.id).order_by(Outreach.created_at.desc()).limit(10).all()
    context = AgentContext.query.filter_by(user_id=user.id).first()

    # Last 10 agent conversations (user messages only, most recent first)
    recent_messages = (
        AgentMessage.query.filter_by(user_id=user.id, role="user")
        .order_by(AgentMessage.created_at.desc())
        .limit(10).all()
    )

    return jsonify(
        user={
            "id":               user.id,
            "email":            user.email,
            "first_name":       self_person.first_name if self_person else "",
            "last_name":        self_person.last_name  if self_person else "",
            "signup_source":    self_person.source     if self_person else None,
            "email_verified":   user.email_verified,
            "agreed_to_terms_at": user.agreed_to_terms_at.isoformat() if user.agreed_to_terms_at else None,
            "terms_version":    user.terms_version,
            "signup_ip":        user.signup_ip,
            "created_at":       user.created_at.isoformat() if user.created_at else None,
            "onboarding_complete": context is not None,
        },
        tenant={
            "id":                  tenant.id,
            "name":                tenant.name,
            "plan":                tenant.plan,
            "subscription_status": tenant.subscription_status,
            "paths_found":         tenant.paths_found,
            "messages_drafted":    tenant.messages_drafted,
            "last_synced_at":      tenant.last_synced_at.isoformat() if tenant.last_synced_at else None,
        },
        agent_context={
            "my_role":         context.my_role,
            "my_company":      context.my_company,
            "what_i_sell":     context.what_i_sell,
            "icp_description": context.icp_description,
        } if context else None,
        contacts=[{
            "name":    f"{p.first_name or ''} {p.last_name or ''}".strip(),
            "company": p.company,
            "source":  p.source,
        } for p in contacts],
        targets=[{"company": t.company_name} for t in targets],
        recent_activity=[{
            "type":       a.type,
            "text":       a.text,
            "created_at": a.created_at.isoformat() if a.created_at else None,
        } for a in recent_activity],
        outreach=[{
            "target":     o.target_name,
            "company":    o.target_company,
            "status":     o.status,
            "created_at": o.created_at.isoformat() if o.created_at else None,
        } for o in outreach],
        recent_messages=[{
            "content":    m.content[:300],  # truncate long messages
            "created_at": m.created_at.isoformat() if m.created_at else None,
        } for m in recent_messages],
    )


# ── Manual plan override ──────────────────────────────────────────────────────

VALID_PLANS    = {"free", "pro", "max"}
VALID_STATUSES = {"active", "canceled", "past_due"}

@bp.patch("/api/admin/users/<int:target_id>/plan")
@jwt_required()
def admin_set_plan(target_id):
    _, err = _require_admin()
    if err:
        return err

    user = db.session.get(User, target_id)
    if not user:
        return jsonify(error="User not found"), 404

    data = request.get_json(silent=True) or {}
    new_plan   = data.get("plan")
    new_status = data.get("subscription_status", "active")

    if new_plan not in VALID_PLANS:
        return jsonify(error=f"Invalid plan. Must be one of: {', '.join(VALID_PLANS)}"), 400
    if new_status not in VALID_STATUSES:
        return jsonify(error=f"Invalid status. Must be one of: {', '.join(VALID_STATUSES)}"), 400

    tenant = db.session.get(Tenant, user.tenant_id)
    old_plan = tenant.plan
    tenant.plan                = new_plan
    tenant.subscription_status = new_status
    db.session.commit()

    logger.info("Admin changed plan for user %s (%s): %s → %s (%s)", target_id, user.email, old_plan, new_plan, new_status)
    return jsonify(ok=True, plan=new_plan, subscription_status=new_status)


# ── Delete user ───────────────────────────────────────────────────────────────

@bp.delete("/api/admin/users/<int:target_id>")
@jwt_required()
def admin_delete_user(target_id):
    admin_user, err = _require_admin()
    if err:
        return err

    if admin_user.id == target_id:
        return jsonify(error="Cannot delete your own account via admin"), 400

    user = db.session.get(User, target_id)
    if not user:
        return jsonify(error="User not found"), 404

    tenant = db.session.get(Tenant, user.tenant_id)
    email = user.email

    db.session.delete(tenant)   # CASCADE deletes user + all their data
    db.session.commit()

    logger.info("Admin deleted user %s (%s)", target_id, email)
    return jsonify(deleted=True, email=email)
