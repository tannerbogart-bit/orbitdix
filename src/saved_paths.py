"""
src/saved_paths.py — saved paths + activity feed endpoints.

GET    /api/saved-paths          — list saved paths for current user
POST   /api/saved-paths          — save a path
DELETE /api/saved-paths/<id>     — remove a saved path

GET    /api/activity             — recent activity feed (last 50)
"""

import json

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from .db import db
from .models import Activity, Person, SavedPath, Tenant, User
from .plans import is_pro, upgrade_error

bp = Blueprint("saved_paths", __name__)


def _person_dict(p):
    if p is None:
        return None
    return {
        "id": p.id,
        "first_name": p.first_name,
        "last_name": p.last_name,
        "title": p.title,
        "company": p.company,
        "is_self": p.is_self,
    }


def _saved_path_dict(sp, people_by_id):
    path_ids = json.loads(sp.path_ids)
    return {
        "id":          sp.id,
        "from_person": _person_dict(people_by_id.get(sp.from_person_id)),
        "to_person":   _person_dict(people_by_id.get(sp.to_person_id)),
        "path_ids":    path_ids,
        "path_people": [_person_dict(people_by_id.get(pid)) for pid in path_ids if people_by_id.get(pid)],
        "degrees":     sp.degrees,
        "created_at":  sp.created_at.isoformat(),
    }


@bp.get("/api/saved-paths")
@jwt_required()
def list_saved_paths():
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    if user is None:
        return jsonify(error="User not found"), 404

    paths = SavedPath.query.filter_by(user_id=user_id).order_by(SavedPath.created_at.desc()).all()

    # Bulk-fetch all people referenced
    person_ids = set()
    for sp in paths:
        person_ids.update(json.loads(sp.path_ids))
    people = Person.query.filter(Person.id.in_(person_ids), Person.tenant_id == user.tenant_id).all()
    people_by_id = {p.id: p for p in people}

    return jsonify(saved_paths=[_saved_path_dict(sp, people_by_id) for sp in paths])


@bp.post("/api/saved-paths")
@jwt_required()
def save_path():
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    if user is None:
        return jsonify(error="User not found"), 404

    # Plan enforcement
    tenant = db.session.get(Tenant, user.tenant_id)
    if not is_pro(tenant):
        return upgrade_error("Saving paths is a Pro feature. Upgrade to save and revisit paths.")

    data = request.get_json(silent=True) or {}
    path_ids = data.get("path_ids")

    if not isinstance(path_ids, list) or len(path_ids) < 2:
        return jsonify(error="path_ids must be an array of at least 2 person IDs"), 400

    from_id = path_ids[0]
    to_id   = path_ids[-1]

    # Check not already saved
    existing = SavedPath.query.filter_by(user_id=user_id, from_person_id=from_id, to_person_id=to_id).first()
    if existing:
        return jsonify(error="Path already saved"), 409

    sp = SavedPath(
        tenant_id=user.tenant_id,
        user_id=user_id,
        from_person_id=from_id,
        to_person_id=to_id,
        path_ids=json.dumps(path_ids),
        degrees=len(path_ids) - 1,
    )
    db.session.add(sp)

    # Log activity
    to_person = db.session.get(Person, to_id)
    _log_activity(user, "path_found", f"Saved path to {to_person.first_name} {to_person.last_name}" if to_person else "Saved a path")

    db.session.commit()

    people = Person.query.filter(Person.id.in_(path_ids), Person.tenant_id == user.tenant_id).all()
    people_by_id = {p.id: p for p in people}
    return jsonify(saved_path=_saved_path_dict(sp, people_by_id)), 201


@bp.delete("/api/saved-paths/<int:path_id>")
@jwt_required()
def delete_saved_path(path_id):
    user_id = int(get_jwt_identity())
    sp = SavedPath.query.filter_by(id=path_id, user_id=user_id).first()
    if sp is None:
        return jsonify(error="Saved path not found"), 404
    db.session.delete(sp)
    db.session.commit()
    return '', 204


@bp.get("/api/activity")
@jwt_required()
def list_activity():
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    if user is None:
        return jsonify(error="User not found"), 404

    activities = (
        Activity.query
        .filter_by(tenant_id=user.tenant_id)
        .order_by(Activity.created_at.desc())
        .limit(50)
        .all()
    )
    return jsonify(activities=[{
        "id":         a.id,
        "type":       a.type,
        "text":       a.text,
        "created_at": a.created_at.isoformat(),
    } for a in activities])


def log_activity(user, type_, text):
    """Public helper for other blueprints to log activity."""
    _log_activity(user, type_, text)


def _log_activity(user, type_, text):
    db.session.add(Activity(tenant_id=user.tenant_id, user_id=user.id, type=type_, text=text))
