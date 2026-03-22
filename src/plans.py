"""
src/plans.py — Plan limits and enforcement helpers.

Free:
  - 50 contacts (excluding self)
  - 5 path searches per calendar month
  - 10 AI agent messages per calendar month
  - No saved paths

Pro ($19/mo):
  - Unlimited contacts, paths, saved paths
  - 200 AI agent messages per calendar month
  - Outreach tracker

Max ($49/mo):
  - Everything in Pro, unlimited AI messages
  - Up to 5 team seats (shared workspace)
  - Priority support
"""

from datetime import datetime, timezone

from .models import Activity, AgentMessage, Person, Tenant, User

FREE_CONTACT_LIMIT    = 50
FREE_MONTHLY_PATH_LIMIT = 5
FREE_AGENT_MSG_LIMIT  = 10
PRO_AGENT_MSG_LIMIT   = 200   # Max plan = unlimited (no check)


def is_pro(tenant: Tenant | None) -> bool:
    """True for Pro or Max subscribers with an active subscription."""
    if tenant is None:
        return False
    return tenant.plan in ("pro", "max", "team") and tenant.subscription_status in ("active",)


def is_max(tenant: Tenant | None) -> bool:
    """True only for Max (or legacy Team) subscribers."""
    if tenant is None:
        return False
    return tenant.plan in ("max", "team") and tenant.subscription_status in ("active",)


def monthly_paths_used(tenant_id: int) -> int:
    """Count path_found activities for this tenant in the current calendar month."""
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    return Activity.query.filter(
        Activity.tenant_id == tenant_id,
        Activity.type == "path_found",
        Activity.created_at >= month_start,
    ).count()


def monthly_agent_messages_used(user_id: int) -> int:
    """Count user-role agent messages sent this calendar month."""
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    return AgentMessage.query.filter(
        AgentMessage.user_id == user_id,
        AgentMessage.role == "user",
        AgentMessage.created_at >= month_start,
    ).count()


def contact_count(tenant_id: int) -> int:
    """Count non-self contacts for this tenant."""
    return Person.query.filter_by(tenant_id=tenant_id, is_self=False).count()


def upgrade_error(message: str):
    """Return a (json_body, status_code) tuple for plan gate rejections."""
    from flask import jsonify
    return jsonify(error=message, upgrade_required=True), 403
