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
import logging
import os
from collections import deque

from flask import Blueprint, Response, jsonify, request, stream_with_context

logger = logging.getLogger(__name__)
from flask_jwt_extended import get_jwt_identity, jwt_required
from sqlalchemy import and_, func

from .db import db
from .models import AgentContext, AgentMessage, Edge, Outreach, Person, TargetAccount, Tenant, User
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
            "Find the shortest warm introduction path from the user to a specific named person. "
            "Returns the full chain of intermediaries. Use this only when the user names a specific person. "
            "If the user names a COMPANY (e.g. 'find a path to Stripe'), use find_path_to_company instead."
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
        "name": "find_path_to_company",
        "description": (
            "Find the best warm introduction path into a target company. "
            "Tries all known contacts at that company and returns the shortest reachable path. "
            "Use this when the user says 'find a path to [Company]', 'get me into [Company]', "
            "'who can introduce me to someone at [Company]', or any company-level path request. "
            "Optionally prioritize reaching a person with a specific title (e.g. 'VP Sales', 'CTO')."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "company_name": {
                    "type": "string",
                    "description": "Name of the target company to find a path into"
                },
                "preferred_title": {
                    "type": "string",
                    "description": "Optional: prioritize reaching someone with this title (e.g. 'VP Sales', 'Head of Engineering')"
                }
            },
            "required": ["company_name"]
        }
    },
    {
        "name": "list_people_at_company",
        "description": (
            "List all people in the user's network who work at a specific company, with their titles. "
            "Use this to understand who you know at a company before finding a path or drafting a message. "
            "Useful for 'who do I know at X?' or 'who works at X in my network?'"
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "company_name": {
                    "type": "string",
                    "description": "Name of the company to look up"
                }
            },
            "required": ["company_name"]
        }
    },
    {
        "name": "save_outreach_draft",
        "description": (
            "Save a drafted intro message to the user's outreach tracker so they can act on it later. "
            "Call this AFTER drafting a message and ONLY if the user explicitly asks to save it "
            "or confirms they want it saved. Include the full message text and path details."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "target_name": {
                    "type": "string",
                    "description": "Full name of the person being reached"
                },
                "target_company": {
                    "type": "string",
                    "description": "Company the target person works at"
                },
                "via_person_name": {
                    "type": "string",
                    "description": "Name of the bridge/connector being used for the intro"
                },
                "message": {
                    "type": "string",
                    "description": "The full drafted message text"
                },
                "path_summary": {
                    "type": "string",
                    "description": "Human-readable path description, e.g. 'You → John Smith → Jane Doe at Stripe'"
                }
            },
            "required": ["target_name", "via_person_name", "message"]
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
    {
        "name": "get_outreach_history",
        "description": (
            "Get the user's outreach history — messages drafted or sent via warm intro paths. "
            "Use this before suggesting a path to check if the user has already attempted contact, "
            "to surface follow-up opportunities, or to understand which bridges have been used. "
            "Returns status (drafted/sent/replied/no_reply), the via contact, and timing."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "company": {
                    "type": "string",
                    "description": "Optional: filter to outreach targeting contacts at this company"
                },
                "status": {
                    "type": "string",
                    "description": "Optional: filter by status — 'drafted', 'sent', 'replied', or 'no_reply'"
                }
            },
            "required": []
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
                # Annotate intermediaries with prior outreach context
                outreach_by_via: dict[str, dict] = {}
                try:
                    prior = Outreach.query.filter_by(user_id=user_id).all()
                    for o in prior:
                        if o.via_person_name:
                            outreach_by_via[o.via_person_name.lower()] = {
                                "status": o.status,
                                "target": o.target_name,
                            }
                except Exception as e:
                    logger.warning("Failed to load outreach history for context: %s", e)

                path_nodes = []
                for pid in full_ids:
                    if pid not in persons_by_id:
                        continue
                    node = _person_dict(persons_by_id[pid])
                    via_key = node["name"].lower()
                    if via_key in outreach_by_via:
                        prior_info = outreach_by_via[via_key]
                        node["prior_outreach_via"] = (
                            f"Previously used as bridge for {prior_info['target']} "
                            f"(status: {prior_info['status']})"
                        )
                    path_nodes.append(node)

                return {
                    "path": path_nodes,
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


def tool_get_outreach_history(user_id: int, company: str = "", status: str = "") -> dict:
    from datetime import datetime, timezone
    q = Outreach.query.filter_by(user_id=user_id)
    if company:
        q = q.filter(Outreach.target_company.ilike(f"%{company}%"))
    if status and status in ("drafted", "sent", "replied", "no_reply"):
        q = q.filter(Outreach.status == status)
    records = q.order_by(Outreach.created_at.desc()).limit(25).all()

    now = datetime.now(timezone.utc)
    result = []
    for o in records:
        item = {
            "target": o.target_name,
            "company": o.target_company,
            "via": o.via_person_name,
            "status": o.status,
            "days_ago": (now - o.created_at.replace(tzinfo=timezone.utc)).days if o.created_at else None,
        }
        if o.follow_up_at:
            item["follow_up_in_days"] = (o.follow_up_at.replace(tzinfo=timezone.utc) - now).days
        if o.notes:
            item["notes"] = o.notes
        result.append(item)

    overdue = sum(
        1 for o in records
        if o.follow_up_at and o.follow_up_at.replace(tzinfo=timezone.utc) <= now and o.status != "replied"
    )
    return {
        "outreach": result,
        "total": len(result),
        "summary": {
            "drafted":         sum(1 for o in records if o.status == "drafted"),
            "sent":            sum(1 for o in records if o.status == "sent"),
            "replied":         sum(1 for o in records if o.status == "replied"),
            "no_reply":        sum(1 for o in records if o.status == "no_reply"),
            "overdue_follow_ups": overdue,
        },
    }


def tool_find_path_to_company(company_name: str, preferred_title: str, user_id: int, tenant_id: int) -> dict:
    """Find the best warm path into a company by trying all known contacts there."""
    self_person = Person.query.filter_by(user_id=user_id, is_self=True).first()
    if not self_person:
        return {"error": "Your profile (self person) not found in network"}

    company_lower = company_name.strip().lower()
    candidates = Person.query.filter(
        Person.tenant_id == tenant_id,
        Person.is_self == False,
        Person.company.ilike(f"%{company_lower}%"),
    ).all()

    if not candidates:
        return {"error": f"No one at '{company_name}' found in your network. Try importing more connections or check the company name."}

    # Build adjacency
    edges = Edge.query.filter_by(tenant_id=tenant_id).all()
    adjacency: dict[int, list[int]] = {}
    for edge in edges:
        adjacency.setdefault(edge.from_person_id, []).append(edge.to_person_id)
        adjacency.setdefault(edge.to_person_id, []).append(edge.from_person_id)

    # Sort candidates: preferred title first, then direct connections first
    preferred_lower = (preferred_title or "").lower()
    direct_ids = set(adjacency.get(self_person.id, []))

    def _rank(p):
        title_match = 1 if preferred_lower and preferred_lower in (p.title or "").lower() else 0
        is_direct = 1 if p.id in direct_ids else 0
        return (-title_match, -is_direct)

    candidates_sorted = sorted(candidates, key=_rank)

    # BFS for each candidate, return shortest path found
    target_ids = {p.id for p in candidates}
    persons_by_id = {p.id: p for p in Person.query.filter(
        Person.tenant_id == tenant_id
    ).all()}

    best_path = None
    best_target = None

    for target in candidates_sorted:
        if target.id == self_person.id:
            continue
        if target.id in direct_ids:
            # Direct connection — path length 1, no better possible
            best_path = [self_person.id, target.id]
            best_target = target
            break

        visited = {self_person.id}
        queue: deque = deque([[self_person.id]])
        found = None
        while queue:
            path_ids = queue.popleft()
            current = path_ids[-1]
            for neighbor in adjacency.get(current, []):
                if neighbor == target.id:
                    found = path_ids + [neighbor]
                    break
                if neighbor not in visited:
                    visited.add(neighbor)
                    queue.append(path_ids + [neighbor])
            if found:
                break

        if found:
            if best_path is None or len(found) < len(best_path):
                best_path = found
                best_target = target
                if len(found) == 2:
                    break  # direct connection, can't get shorter

    if not best_path or not best_target:
        # All contacts at the company are unreachable — show who's there anyway
        people_there = [
            {"name": f"{p.first_name or ''} {p.last_name or ''}".strip(), "title": p.title}
            for p in candidates[:5]
        ]
        return {
            "error": f"No connection path found to anyone at {company_name}.",
            "contacts_there": people_there,
            "hint": "Your network has these people at the company but no edges connect you to them. Adding more connections or relationship edges may open a path.",
        }

    path_nodes = []
    for pid in best_path:
        p = persons_by_id.get(pid)
        if p:
            path_nodes.append(_person_dict(p))

    return {
        "company": company_name,
        "target": _person_dict(best_target),
        "path": path_nodes,
        "degrees": len(best_path) - 1,
        "people_at_company": len(candidates),
        "other_contacts": [
            {"name": f"{p.first_name or ''} {p.last_name or ''}".strip(), "title": p.title}
            for p in candidates if p.id != best_target.id
        ][:4],
    }


def tool_list_people_at_company(company_name: str, tenant_id: int) -> dict:
    company_lower = company_name.strip().lower()
    people = Person.query.filter(
        Person.tenant_id == tenant_id,
        Person.is_self == False,
        Person.company.ilike(f"%{company_lower}%"),
    ).order_by(Person.last_name).all()

    if not people:
        return {"people": [], "count": 0, "message": f"No one at '{company_name}' found in your network."}

    return {
        "company": company_name,
        "count": len(people),
        "people": [
            {"name": f"{p.first_name or ''} {p.last_name or ''}".strip(), "title": p.title, "id": p.id}
            for p in people
        ],
    }


def tool_save_outreach_draft(
    target_name: str, target_company: str, via_person_name: str,
    message: str, path_summary: str, user_id: int, tenant_id: int
) -> dict:
    from datetime import datetime, timezone
    record = Outreach(
        user_id=user_id,
        tenant_id=tenant_id,
        target_name=target_name.strip(),
        target_company=(target_company or "").strip() or None,
        via_person_name=via_person_name.strip(),
        message=message.strip(),
        path_summary=(path_summary or "").strip() or None,
        status="drafted",
        created_at=datetime.now(timezone.utc),
    )
    db.session.add(record)
    db.session.commit()
    return {
        "success": True,
        "message": f"Saved outreach draft for {target_name} to your Outreach Tracker.",
        "id": record.id,
    }


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
        elif name == "get_outreach_history":
            result = tool_get_outreach_history(
                user_id,
                company=tool_input.get("company", ""),
                status=tool_input.get("status", ""),
            )
        elif name == "find_path_to_company":
            result = tool_find_path_to_company(
                tool_input["company_name"],
                tool_input.get("preferred_title", ""),
                user_id, tenant_id,
            )
        elif name == "list_people_at_company":
            result = tool_list_people_at_company(tool_input["company_name"], tenant_id)
        elif name == "save_outreach_draft":
            result = tool_save_outreach_draft(
                tool_input["target_name"],
                tool_input.get("target_company", ""),
                tool_input["via_person_name"],
                tool_input["message"],
                tool_input.get("path_summary", ""),
                user_id, tenant_id,
            )
        else:
            result = {"error": f"Unknown tool: {name}"}
    except Exception as e:
        result = {"error": str(e)}
    return json.dumps(result)


# ── SYSTEM PROMPT BUILDER ─────────────────────────────────────────────────────

def _build_system_prompt(user_id: int, tenant_id: int) -> str:
    from datetime import datetime, timezone
    self_person = Person.query.filter_by(user_id=user_id, is_self=True).first()
    ctx = AgentContext.query.filter_by(user_id=user_id).first()

    user_name = "the user"
    if self_person:
        user_name = f"{self_person.first_name or ''} {self_person.last_name or ''}".strip() or "the user"

    today_str = datetime.now(timezone.utc).strftime("%B %d, %Y")

    lines = [
        "You are a strategic networking assistant for OrbitSix — a professional network intelligence platform built around the six-degrees-of-separation principle.",
        f"\nToday's date: {today_str}",
        f"The user you're helping is {user_name}.",
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

        # Sync freshness
        tenant_obj = Tenant.query.get(tenant_id)
        if tenant_obj and tenant_obj.last_synced_at:
            from datetime import datetime, timezone
            delta = datetime.now(timezone.utc) - tenant_obj.last_synced_at.replace(tzinfo=timezone.utc)
            days_ago = delta.days
            if days_ago == 0:
                lines.append("- Network data synced today (fresh)")
            elif days_ago <= 7:
                lines.append(f"- Network data last synced {days_ago} day{'s' if days_ago != 1 else ''} ago (recent)")
            elif days_ago <= 30:
                lines.append(f"- Network data last synced {days_ago} days ago (may have minor gaps)")
            else:
                lines.append(f"- Network data last synced {days_ago} days ago — mention this could be stale when relevant")
        else:
            lines.append("- Network data has never been synced — mention to the user that importing their LinkedIn connections will unlock full functionality")
    except Exception as e:
        logger.warning("Failed to build network context for system prompt: %s", e)

    # ── Outreach context ──────────────────────────────────────────────────────
    try:
        from datetime import datetime, timezone
        outreach_records = (
            Outreach.query.filter_by(user_id=user_id)
            .order_by(Outreach.created_at.desc())
            .limit(30)
            .all()
        )
        if outreach_records:
            now = datetime.now(timezone.utc)
            drafted      = [o for o in outreach_records if o.status == "drafted"]
            sent         = [o for o in outreach_records if o.status == "sent"]
            no_reply     = [o for o in outreach_records if o.status == "no_reply"]
            replied      = [o for o in outreach_records if o.status == "replied"]
            overdue      = [
                o for o in outreach_records
                if o.follow_up_at and o.follow_up_at.replace(tzinfo=timezone.utc) <= now
                and o.status != "replied"
            ]

            def _fmt(records, n=4):
                return ", ".join(
                    f"{o.target_name or '?'} @ {o.target_company or '?'}"
                    for o in records[:n]
                )

            lines.append("\n## Active Outreach")
            if drafted:
                lines.append(f"- {len(drafted)} drafted (not yet sent): {_fmt(drafted)}")
            if sent:
                lines.append(f"- {len(sent)} sent, awaiting reply: {_fmt(sent)}")
            if no_reply:
                lines.append(f"- {len(no_reply)} marked no reply — consider different bridge or timing: {_fmt(no_reply)}")
            if replied:
                lines.append(f"- {len(replied)} replied (active conversations): {_fmt(replied, 3)}")
            if overdue:
                overdue_str = ", ".join(
                    f"{o.target_name or '?'} (via {o.via_person_name or '?'})"
                    for o in overdue[:3]
                )
                lines.append(f"- ⚠️ {len(overdue)} overdue follow-ups: {overdue_str}")
            if not any([drafted, sent, no_reply, replied]):
                lines.append("- No outreach started yet — a great first ask after finding a path")
    except Exception as e:
        logger.warning("Failed to build outreach context for system prompt: %s", e)

    lines += [
        "\n## Your responsibilities",
        "- Find warm introduction paths to target contacts using the network tools",
        "- Run gap analysis to surface which target accounts lack warm paths and identify bridge contacts",
        "- Recommend who to reach out to based on their business goals and ICP",
        "- Draft compelling, personalized intro messages when asked (reference the connector by name)",
        "- Check outreach history with get_outreach_history before suggesting a path — flag if already attempted",
        "- Help manage and prioritize their target accounts list",
        "- Identify network gaps and suggest actionable strategies to fill them",
        "- Surface overdue follow-ups proactively when relevant",

        "\n## Intro message frames — pick the right one",
        "**Cold ask** (first contact, no prior relationship with target): Lead with the connector's name in sentence 1. "
        "State why THIS person specifically, not generic flattery. One tight ask ('15 minutes' not 'coffee sometime'). "
        "Example opening: 'Hi [target], [connector] suggested I reach out — I'm [role] at [company] and [one-line why].'",

        "**Warm re-connect** (user has met the target before, or target worked at same company): "
        "Open with the specific shared touchpoint. Bridge to why now. "
        "Example opening: 'Hi [target], we met at [event/place] back in [year] — I've been following [their work] since.'",

        "**Trigger hook** (target recently changed jobs, raised funding, launched product, published content): "
        "Open with genuine acknowledgment of the specific event — make it feel timely, not canned. "
        "Example opening: 'Congratulations on the [Series B / new role at X / launch of Y] — [one genuine observation].'",

        "Always: name the connector explicitly, keep under 150 words, end with exactly one clear ask. "
        "Label the frame you chose at the top of your response so the user understands the approach.",

        "\n## Gap analysis output format",
        "When presenting gap analysis results, always structure your response as:",
        "1. One-line verdict: 'X of your Y targets are completely unreachable — no path at all.'",
        "2. True gaps first (sorted worst → better): for each, name the best available bridge even if 2nd-degree.",
        "3. Bridgeable targets: name the specific bridge contact and how many connections they have there.",
        "4. Already-connected targets: briefly confirm strength.",
        "5. End with 1-2 opportunity companies worth adding as targets (from network data).",
        "6. Suggest ONE concrete next action the user should take today.",

        "\n## Tool selection guide",
        "- User says 'find a path to [Company]' → use find_path_to_company (NOT find_path)",
        "- User says 'find a path to [Person name]' → use find_path",
        "- User says 'who do I know at [Company]?' → use list_people_at_company",
        "- User says 'analyze my gaps' / 'where is my network weak?' → use analyze_network_gaps",
        "- User says 'save this' / 'save the draft' / 'add to outreach' → use save_outreach_draft",
        "- Use search_network before referencing any specific person by name",
        "- Use get_outreach_history when asked about past attempts, follow-ups, or pipeline status",
        "- You already know the network size from the snapshot above — no need to call get_network_overview unless you need more detail",

        "\n## General guidelines",
        "- Always be specific and actionable — reference real people and paths from tool results",
        "- If a path node has a 'prior_outreach_via' field, mention it so the user knows that bridge has been used",
        "- Keep responses concise and focused; lead with the most useful insight",
        "- If the network is small, acknowledge it and suggest strategic ways to grow it",
        "- After drafting an intro message, always offer to save it to the Outreach Tracker ('Want me to save this draft?')",
        "- When find_path_to_company returns other_contacts, mention them briefly so the user knows who else is reachable at that company",
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
        {
            "id": t.id, "company_name": t.company_name, "reason": t.reason,
            "website_url": t.website_url, "linkedin_url": t.linkedin_url,
        } for t in targets
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
        website_url=(data.get("website_url") or "").strip() or None,
        linkedin_url=(data.get("linkedin_url") or "").strip() or None,
    )
    db.session.add(target)
    db.session.commit()
    return jsonify(
        id=target.id, company_name=target.company_name, reason=target.reason,
        website_url=target.website_url, linkedin_url=target.linkedin_url,
    ), 201


@bp.patch("/api/agent/targets/<int:target_id>")
@jwt_required()
def update_target(target_id):
    user_id = int(get_jwt_identity())
    target = TargetAccount.query.filter_by(id=target_id, user_id=user_id).first()
    if not target:
        return jsonify(error="Not found"), 404
    data = request.get_json(silent=True) or {}
    if "reason" in data:
        target.reason = (data["reason"] or "").strip() or None
    if "website_url" in data:
        target.website_url = (data["website_url"] or "").strip() or None
    if "linkedin_url" in data:
        target.linkedin_url = (data["linkedin_url"] or "").strip() or None
    db.session.commit()
    return jsonify(
        id=target.id, company_name=target.company_name, reason=target.reason,
        website_url=target.website_url, linkedin_url=target.linkedin_url,
    )


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


@bp.post("/api/agent/targets/bulk")
@jwt_required()
def bulk_add_targets():
    """Accept a list of company names and add any that don't already exist."""
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    data = request.get_json(silent=True) or {}
    names = [n.strip() for n in (data.get("companies") or []) if n.strip()]
    if not names:
        return jsonify(error="companies list is required"), 400

    existing_names = {
        t.company_name.lower()
        for t in TargetAccount.query.filter_by(user_id=user_id).all()
    }
    added = []
    skipped = []
    for name in names[:50]:  # cap at 50 per bulk import
        if name.lower() in existing_names:
            skipped.append(name)
            continue
        target = TargetAccount(
            user_id=user_id, tenant_id=user.tenant_id, company_name=name
        )
        db.session.add(target)
        existing_names.add(name.lower())
        added.append(name)
    db.session.commit()
    return jsonify(added=added, skipped=skipped, added_count=len(added)), 201


@bp.get("/api/targets/intelligence")
@jwt_required()
def targets_intelligence():
    """
    REST version of gap analysis — returns per-target intelligence for the UI.
    Each target gets: status, direct connections, bridge contacts, paths count.
    """
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    tenant_id = user.tenant_id

    targets = TargetAccount.query.filter_by(user_id=user_id).order_by(TargetAccount.created_at.desc()).all()
    if not targets:
        return jsonify(targets=[], summary={"total": 0, "connected": 0, "bridgeable": 0, "gap": 0})

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

    results = []
    for t in targets:
        cn_lower = t.company_name.lower()
        at_company_ids = set(company_index.get(cn_lower, []))
        direct_ids = [pid for pid in at_company_ids if pid in direct_neighbor_ids]

        bridges = []
        for nid in direct_neighbor_ids:
            if nid in at_company_ids:
                continue
            overlap = set(adjacency.get(nid, [])) & at_company_ids
            if overlap:
                p = people_by_id.get(nid)
                if p:
                    # find one person at the company this bridge knows
                    sample_target = people_by_id.get(next(iter(overlap)))
                    bridges.append({
                        "id": p.id,
                        "name": f"{p.first_name or ''} {p.last_name or ''}".strip(),
                        "title": p.title,
                        "company": p.company,
                        "connects_to_count": len(overlap),
                        "connects_to_name": f"{sample_target.first_name or ''} {sample_target.last_name or ''}".strip() if sample_target else None,
                        "connects_to_title": sample_target.title if sample_target else None,
                    })
        bridges.sort(key=lambda x: -x["connects_to_count"])

        if direct_ids:
            status = "connected"
        elif bridges:
            status = "bridgeable"
        else:
            status = "gap"

        results.append({
            "id": t.id,
            "company_name": t.company_name,
            "reason": t.reason,
            "website_url": t.website_url,
            "linkedin_url": t.linkedin_url,
            "status": status,
            "direct_count": len(direct_ids),
            "direct_people": [
                {"name": f"{people_by_id[pid].first_name or ''} {people_by_id[pid].last_name or ''}".strip(),
                 "title": people_by_id[pid].title, "id": pid}
                for pid in direct_ids if pid in people_by_id
            ],
            "bridge_count": len(bridges),
            "top_bridges": bridges[:3],
        })

    summary = {
        "total": len(results),
        "connected": sum(1 for r in results if r["status"] == "connected"),
        "bridgeable": sum(1 for r in results if r["status"] == "bridgeable"),
        "gap": sum(1 for r in results if r["status"] == "gap"),
    }
    return jsonify(targets=results, summary=summary)


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


# ── INLINE SUGGESTION BUILDER ─────────────────────────────────────────────────

def _build_inline_suggestions(user_id: int, tenant_id: int, user_msg: str, response_text: str, tools_called: list) -> list:
    """
    Generate 2–3 contextual follow-up suggestion chips after an agent turn.
    Rule-based — no extra LLM call needed.
    """
    suggestions = []
    msg_lower = (user_msg + " " + response_text).lower()

    # If we just found a path → offer to draft the message
    if "find_path" in tools_called or "path" in msg_lower:
        suggestions.append({
            "label": "Draft the intro message",
            "prompt": "Draft a warm intro message I can send through this path.",
            "icon": "recommend",
        })

    # If gap analysis was run → offer per-company drill-down
    if "analyze_network_gaps" in tools_called:
        # Try to find a company name from the response to make the prompt specific
        targets = TargetAccount.query.filter_by(user_id=user_id).all()
        if targets:
            suggestions.append({
                "label": f"Find a path into {targets[0].company_name}",
                "prompt": f"Find the best path to reach someone at {targets[0].company_name}.",
                "icon": "gap",
            })

    # If outreach history was checked → offer follow-up drafting
    if "get_outreach_history" in tools_called or "no reply" in msg_lower or "follow-up" in msg_lower:
        suggestions.append({
            "label": "Draft a follow-up",
            "prompt": "Help me draft a follow-up message for the outreach that hasn't gotten a reply.",
            "icon": "recommend",
        })

    # If a company was mentioned → offer to check who they know there
    for keyword in ["who at", "people at", "connections at", "network at"]:
        if keyword in msg_lower:
            suggestions.append({
                "label": "Run full gap analysis",
                "prompt": "Analyze all my target accounts and rank where I should focus next.",
                "icon": "analysis",
            })
            break

    # Always offer something if list is empty
    if not suggestions:
        try:
            total = Person.query.filter_by(tenant_id=tenant_id, is_self=False).count()
            target_count = TargetAccount.query.filter_by(user_id=user_id).count()
            if target_count >= 2:
                suggestions.append({
                    "label": "Full gap analysis",
                    "prompt": "Analyze gaps across all my target accounts and tell me where to focus first.",
                    "icon": "analysis",
                })
            if total > 0:
                suggestions.append({
                    "label": "Who should I reach out to?",
                    "prompt": "Based on my targets and ICP, who should I reach out to this week?",
                    "icon": "recommend",
                })
        except Exception as e:
            logger.warning("Failed to build agent suggestions: %s", e)

    return suggestions[:3]


# ── CHAT ──────────────────────────────────────────────────────────────────────

@bp.post("/api/agent/chat")
@jwt_required()
def agent_chat():
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    tenant = db.session.get(Tenant, user.tenant_id) if user else None
    from .plans import FREE_AGENT_MSG_LIMIT, PRO_AGENT_MSG_LIMIT, is_max, monthly_agent_messages_used
    if not is_max(tenant):
        used = monthly_agent_messages_used(user_id)
        if not is_pro(tenant) and used >= FREE_AGENT_MSG_LIMIT:
            return upgrade_error(
                f"You've used your {FREE_AGENT_MSG_LIMIT} free AI messages this month. "
                "Upgrade to Pro for 200 messages/month, or Max for unlimited."
            )
        if is_pro(tenant) and used >= PRO_AGENT_MSG_LIMIT:
            return upgrade_error(
                f"You've used your {PRO_AGENT_MSG_LIMIT} Pro AI messages this month. "
                "Upgrade to Max for unlimited AI messages."
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
        except Exception as e:
            logger.error("Failed to persist conversation history for user %s: %s", user_id, e)
            # Retry once after rolling back the session
            try:
                db.session.rollback()
                _save_messages(user_id, last_user_msg, full_response_text)
            except Exception as e2:
                logger.error("Retry also failed for conversation persist user %s: %s", user_id, e2)

        # Stream contextual follow-up suggestions based on this turn
        try:
            inline_suggestions = _build_inline_suggestions(
                user_id, user.tenant_id, last_user_msg, full_response_text,
                tools_called=[b.name for turn_msgs in messages_hist for b in
                              (turn_msgs.get("content", []) if isinstance(turn_msgs.get("content"), list) else [])
                              if hasattr(b, "type") and getattr(b, "type", None) == "tool_use"],
            )
            if inline_suggestions:
                yield f"data: {json.dumps({'type': 'suggestions', 'items': inline_suggestions})}\n\n"
        except Exception as e:
            logger.warning("Failed to build inline suggestions: %s", e)

        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return Response(
        stream_with_context(generate()),
        mimetype="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
