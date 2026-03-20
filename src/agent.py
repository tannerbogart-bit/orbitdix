"""
src/agent.py — AI agent with tool use for network intelligence.

GET    /api/agent/context         — get user's business context
PUT    /api/agent/context         — save/update business context
GET    /api/agent/targets         — list target accounts
POST   /api/agent/targets         — add target account
DELETE /api/agent/targets/<id>    — remove target account
GET    /api/agent/history         — get recent chat history
DELETE /api/agent/history         — clear chat history
GET    /api/agent/suggestions     — proactive suggestions based on network + targets
POST   /api/agent/chat            — streaming SSE chat with Claude + tools
"""

import json
import os
from collections import deque

from flask import Blueprint, Response, jsonify, request, stream_with_context
from flask_jwt_extended import get_jwt_identity, jwt_required
from sqlalchemy import and_, func

from .db import db
from .models import AgentContext, AgentMessage, Edge, Person, TargetAccount, Tenant, User
from .plans import is_pro, upgrade_error

bp = Blueprint("agent", __name__)

HISTORY_LIMIT  = 30   # messages kept in DB per user
HISTORY_INJECT = 20   # messages fed into each chat request


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
        "name": "analyze_network_gaps",
        "description": (
            "Analyze gaps in the user's network relative to their target accounts and ICP. "
            "For each target company, checks how many direct connections exist, finds 2nd-degree "
            "bridge contacts that could open a path, and surfaces which target accounts have no "
            "warm route at all. Also highlights industry segments that are underrepresented. "
            "Use this when the user wants to understand where their network is weak or how to "
            "prioritize outreach."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "focus": {
                    "type": "string",
                    "description": "Optional: narrow the analysis to a specific company, industry, or role (e.g. 'fintech', 'VP Sales'). Leave empty for a full analysis."
                }
            },
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
                    "description": "Why this company is a target (e.g. 'Series B fintech, ideal buyer for our API product')"
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


def tool_analyze_network_gaps(focus: str, user_id: int, tenant_id: int) -> dict:
    """
    For each target account:
      - direct_count: people in network who work there and are directly connected
      - bridge_contacts: 1st-degree connections who know someone at that company (2nd-degree path)
      - gap: True if no direct or bridged path exists at all
    Also surfaces top companies in network not yet targeted (opportunity list).
    """
    targets = TargetAccount.query.filter_by(user_id=user_id).all()

    edges = Edge.query.filter_by(tenant_id=tenant_id).all()
    adjacency: dict[int, list[int]] = {}
    for edge in edges:
        adjacency.setdefault(edge.from_person_id, []).append(edge.to_person_id)
        adjacency.setdefault(edge.to_person_id, []).append(edge.from_person_id)

    self_person = Person.query.filter_by(user_id=user_id, is_self=True).first()
    direct_neighbor_ids = set(adjacency.get(self_person.id, [])) if self_person else set()

    all_people = Person.query.filter_by(tenant_id=tenant_id, is_self=False).all()
    people_by_id = {p.id: p for p in all_people}

    company_index: dict[str, list[int]] = {}
    for p in all_people:
        if p.company:
            company_index.setdefault(p.company.lower(), []).append(p.id)

    focus_lower = (focus or "").lower()

    gap_results = []
    for target in targets:
        cn_lower = target.company_name.lower()
        if focus_lower and focus_lower not in cn_lower:
            continue

        direct_ids = [pid for pid in company_index.get(cn_lower, []) if pid in direct_neighbor_ids]
        at_company_ids = set(company_index.get(cn_lower, []))

        bridges = []
        for neighbor_id in direct_neighbor_ids:
            neighbor_connections = set(adjacency.get(neighbor_id, []))
            overlap = neighbor_connections & at_company_ids
            if overlap and neighbor_id not in at_company_ids:
                p = people_by_id.get(neighbor_id)
                if p:
                    bridges.append({
                        "name": f"{p.first_name or ''} {p.last_name or ''}".strip(),
                        "title": p.title,
                        "company": p.company,
                        "connects_to_count": len(overlap),
                    })

        bridges.sort(key=lambda x: -x["connects_to_count"])

        gap_results.append({
            "company": target.company_name,
            "reason": target.reason,
            "direct_connections": len(direct_ids),
            "direct_people": [
                {"name": f"{people_by_id[pid].first_name or ''} {people_by_id[pid].last_name or ''}".strip(),
                 "title": people_by_id[pid].title}
                for pid in direct_ids if pid in people_by_id
            ],
            "reachable_via_bridges": len(bridges) > 0,
            "top_bridges": bridges[:3],
            "gap": len(direct_ids) == 0 and len(bridges) == 0,
        })

    gap_results.sort(key=lambda x: (not x["gap"], x["direct_connections"]))

    targeted_lower = {t.company_name.lower() for t in targets}
    opportunity_companies = [
        {"company": c, "count": len(ids)}
        for c, ids in sorted(company_index.items(), key=lambda x: -len(x[1]))
        if c not in targeted_lower
    ][:5]

    return {
        "target_gaps": gap_results,
        "true_gaps": [g for g in gap_results if g["gap"]],
        "bridgeable": [g for g in gap_results if not g["gap"] and g["direct_connections"] == 0],
        "already_connected": [g for g in gap_results if g["direct_connections"] > 0],
        "opportunity_companies": opportunity_companies,
        "summary": {
            "total_targets": len(targets),
            "true_gaps": sum(1 for g in gap_results if g["gap"]),
            "bridgeable": sum(1 for g in gap_results if not g["gap"] and g["direct_connections"] == 0),
            "already_connected": sum(1 for g in gap_results if g["direct_connections"] > 0),
        }
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
        elif name == "analyze_network_gaps":
            result = tool_analyze_network_gaps(tool_input.get("focus", ""), user_id, tenant_id)
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


# ── SYSTEM PROMPT BUILDER ─────────────────────────────────────────────────────

def _build_system_prompt(user_id: int, tenant_id: int) -> str:
    self_person = Person.query.filter_by(user_id=user_id, is_self=True).first()
    ctx = AgentContext.query.filter_by(user_id=user_id).first()

    user_name = "the user"
    if self_person:
        user_name = f"{self_person.first_name or ''} {self_person.last_name or ''}".strip() or "the user"

    lines = [
        "You are a strategic networking assistant for OrbitSix — a professional network intelligence platform built around the six-degrees-of-separation principle.",
        f"\nThe user you're helping is {user_name}.",
    ]

    if ctx:
        if ctx.my_role:         lines.append(f"Their role: {ctx.my_role}")
        if ctx.my_company:      lines.append(f"Their company: {ctx.my_company}")
        if ctx.what_i_sell:     lines.append(f"What they sell / their business: {ctx.what_i_sell}")
        if ctx.icp_description: lines.append(f"Their ideal customer profile (ICP): {ctx.icp_description}")

    # ── Richer context: inject live network snapshot so agent knows the landscape ──
    try:
        total_people  = Person.query.filter_by(tenant_id=tenant_id, is_self=False).count()
        total_edges   = Edge.query.filter_by(tenant_id=tenant_id).count()
        top_companies = (
            db.session.query(Person.company, func.count(Person.id).label("c"))
            .filter(
                Person.tenant_id == tenant_id,
                Person.is_self == False,
                Person.company.isnot(None),
                Person.company != "",
            )
            .group_by(Person.company)
            .order_by(func.count(Person.id).desc())
            .limit(5)
            .all()
        )
        targets = TargetAccount.query.filter_by(user_id=user_id).all()

        lines.append("\n## Live Network Snapshot")
        lines.append(f"- Total connections: {total_people}")
        lines.append(f"- Total relationships (edges): {total_edges}")
        if top_companies:
            top_str = ", ".join(f"{c} ({n})" for c, n in top_companies)
            lines.append(f"- Top companies in network: {top_str}")
        if targets:
            target_str = ", ".join(t.company_name for t in targets[:8])
            lines.append(f"- Target accounts ({len(targets)}): {target_str}")
        else:
            lines.append("- No target accounts saved yet")
    except Exception:
        pass

    lines += [
        "\n## Your responsibilities",
        "- Find warm introduction paths to target contacts using the network tools",
        "- Run gap analysis to surface which target accounts lack warm paths and identify bridge contacts",
        "- Recommend who to reach out to based on their business goals and ICP",
        "- Draft compelling, personalized intro messages when asked (reference the connector by name)",
        "- Help manage and prioritize their target accounts list",
        "- Identify network gaps and suggest actionable strategies to fill them",
        "\n## Guidelines",
        "- Always be specific and actionable — reference real people and paths from tool results",
        "- Use search_network before referencing any specific person",
        "- Use analyze_network_gaps when asked about gaps, blind spots, or where the network is weak",
        "- Use find_path when the user wants to reach someone specific",
        "- Keep responses concise and focused; lead with the most useful insight",
        "- When drafting intro messages, make them personal and reference the shared connection",
        "- If the network is small, acknowledge it and suggest strategic ways to grow it",
        "- You already know the network size from the snapshot above — no need to call get_network_overview unless you need more detail",
    ]

    return "\n".join(lines)


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


# ── CONVERSATION HISTORY ──────────────────────────────────────────────────────

@bp.get("/api/agent/history")
@jwt_required()
def get_history():
    user_id = int(get_jwt_identity())
    msgs = (
        AgentMessage.query
        .filter_by(user_id=user_id)
        .order_by(AgentMessage.created_at.asc())
        .limit(HISTORY_INJECT)
        .all()
    )
    return jsonify(messages=[{"role": m.role, "content": m.content} for m in msgs])


@bp.delete("/api/agent/history")
@jwt_required()
def clear_history():
    user_id = int(get_jwt_identity())
    AgentMessage.query.filter_by(user_id=user_id).delete()
    db.session.commit()
    return "", 204


def _save_messages(user_id: int, user_text: str, assistant_text: str):
    """Persist the exchange, then trim to HISTORY_LIMIT."""
    if user_text:
        db.session.add(AgentMessage(user_id=user_id, role="user", content=user_text))
    if assistant_text:
        db.session.add(AgentMessage(user_id=user_id, role="assistant", content=assistant_text))
    db.session.commit()

    total = AgentMessage.query.filter_by(user_id=user_id).count()
    if total > HISTORY_LIMIT:
        oldest_ids = (
            AgentMessage.query
            .filter_by(user_id=user_id)
            .order_by(AgentMessage.created_at.asc())
            .limit(total - HISTORY_LIMIT)
            .with_entities(AgentMessage.id)
            .all()
        )
        AgentMessage.query.filter(
            AgentMessage.id.in_([r.id for r in oldest_ids])
        ).delete(synchronize_session=False)
        db.session.commit()


# ── PROACTIVE SUGGESTIONS ─────────────────────────────────────────────────────

@bp.get("/api/agent/suggestions")
@jwt_required()
def get_suggestions():
    """
    Returns up to 3 quick actionable suggestions surfaced as prompt chips on the agent page.
    """
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    if not user:
        return jsonify(suggestions=[])

    tenant_id = user.tenant_id
    suggestions = []

    targets = TargetAccount.query.filter_by(user_id=user_id).all()
    total   = Person.query.filter_by(tenant_id=tenant_id, is_self=False).count()

    # Find the first target with no direct connections → suggest a gap prompt
    if targets and total > 0:
        self_person = Person.query.filter_by(user_id=user_id, is_self=True).first()
        if self_person:
            edges = Edge.query.filter_by(tenant_id=tenant_id).all()
            adjacency: dict[int, list[int]] = {}
            for e in edges:
                adjacency.setdefault(e.from_person_id, []).append(e.to_person_id)
                adjacency.setdefault(e.to_person_id, []).append(e.from_person_id)
            direct_ids = set(adjacency.get(self_person.id, []))

            company_index: dict[str, set[int]] = {}
            for p in Person.query.filter_by(tenant_id=tenant_id, is_self=False).all():
                if p.company:
                    company_index.setdefault(p.company.lower(), set()).add(p.id)

            for t in targets:
                at_company = company_index.get(t.company_name.lower(), set())
                if not (at_company & direct_ids):
                    suggestions.append({
                        "label": f"Bridge into {t.company_name}",
                        "prompt": f"Analyze my network gaps for {t.company_name} — who can bridge me in?",
                        "icon": "gap",
                    })
                    break

    # Full gap analysis if multiple targets
    if len(targets) >= 2:
        suggestions.append({
            "label": "Full gap analysis",
            "prompt": "Analyze gaps across all my target accounts and tell me where to focus first.",
            "icon": "analysis",
        })

    # Outreach recommendation
    if total > 0 and len(suggestions) < 3:
        suggestions.append({
            "label": "Who should I reach out to?",
            "prompt": "Based on my target accounts and ICP, who in my network should I reach out to this week?",
            "icon": "recommend",
        })

    # Add targets nudge if none set
    if not targets and total > 0:
        suggestions.append({
            "label": "Set up target accounts",
            "prompt": "Help me identify which companies I should add to my target accounts based on my network.",
            "icon": "target",
        })

    return jsonify(suggestions=suggestions[:3])


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

    # Extract last user message text for history persistence
    last_user_msg = ""
    for m in reversed(incoming_messages):
        if m.get("role") == "user":
            content = m.get("content", "")
            if isinstance(content, str):
                last_user_msg = content
            elif isinstance(content, list):
                last_user_msg = " ".join(
                    block.get("text", "") for block in content
                    if isinstance(block, dict) and block.get("type") == "text"
                )
            break

    # Load persisted history and prepend (unless frontend already sent it)
    history_rows = (
        AgentMessage.query
        .filter_by(user_id=user_id)
        .order_by(AgentMessage.created_at.asc())
        .limit(HISTORY_INJECT)
        .all()
    )
    history_msgs = [{"role": m.role, "content": m.content} for m in history_rows]

    if history_msgs and incoming_messages and incoming_messages[0].get("content") == history_msgs[0].get("content"):
        messages_hist = list(incoming_messages)
    else:
        messages_hist = history_msgs + list(incoming_messages)

    system_prompt = _build_system_prompt(user_id, user.tenant_id)
    client = anthropic.Anthropic(api_key=api_key)

    def generate():
        nonlocal messages_hist
        full_response_text = ""

        for _turn in range(8):
            try:
                with client.messages.stream(
                    model="claude-opus-4-6",
                    max_tokens=4096,
                    system=system_prompt,
                    tools=TOOLS,
                    messages=messages_hist,
                    thinking={"type": "adaptive"},
                ) as stream:
                    turn_text = ""
                    for event in stream:
                        if (
                            hasattr(event, "type")
                            and event.type == "content_block_delta"
                            and hasattr(event, "delta")
                            and getattr(event.delta, "type", None) == "text_delta"
                        ):
                            chunk = event.delta.text
                            turn_text += chunk
                            yield f"data: {json.dumps({'type': 'text', 'text': chunk})}\n\n"

                    response = stream.get_final_message()
                    full_response_text += turn_text

                messages_hist.append({"role": "assistant", "content": response.content})

                tool_use_blocks = [b for b in response.content if b.type == "tool_use"]
                if response.stop_reason == "end_turn" or not tool_use_blocks:
                    break

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

        # Persist exchange to conversation memory
        try:
            _save_messages(user_id, last_user_msg, full_response_text)
        except Exception:
            pass

        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return Response(
        stream_with_context(generate()),
        mimetype="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
