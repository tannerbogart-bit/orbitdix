"""
src/people.py — people endpoints.

GET  /api/people       — list all people in the authenticated tenant
POST /api/people/bulk  — bulk import up to 200 people
GET  /api/stats        — connection count + basic stats for dashboard
"""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from .db import db
from .models import Edge, Person, Tenant, User
from .saved_paths import log_activity

bp = Blueprint("people", __name__)

MAX_BATCH = 200


def _person_dict(p):
    return {
        "id":                p.id,
        "first_name":        p.first_name,
        "last_name":         p.last_name,
        "email":             p.email,
        "title":             p.title,
        "company":           p.company,
        "linkedin_url":      p.linkedin_url,
        "profile_image_url": p.profile_image_url,
        "is_self":           p.is_self,
    }


@bp.get("/api/people")
@jwt_required()
def list_people():
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    if user is None:
        return jsonify(error="User not found"), 404

    page     = request.args.get('page',  1,    type=int)
    per_page = min(request.args.get('per_page', 500, type=int), 500)

    query = Person.query.filter_by(tenant_id=user.tenant_id).order_by(
        Person.is_self.desc(), Person.first_name, Person.last_name
    )
    total  = query.count()
    people = query.offset((page - 1) * per_page).limit(per_page).all()

    return jsonify(people=[_person_dict(p) for p in people], total=total, page=page, per_page=per_page)


@bp.put("/api/people/<int:person_id>")
@jwt_required()
def update_person(person_id):
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    if user is None:
        return jsonify(error="User not found"), 404

    person = Person.query.filter_by(id=person_id, tenant_id=user.tenant_id).first()
    if person is None:
        return jsonify(error="Person not found"), 404

    data = request.get_json(silent=True) or {}
    for field in ("first_name", "last_name", "email", "title", "company", "linkedin_url", "profile_image_url"):
        if field in data:
            setattr(person, field, _clean(data[field]))

    db.session.commit()
    return jsonify(person=_person_dict(person))


@bp.delete("/api/people/<int:person_id>")
@jwt_required()
def delete_person(person_id):
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    if user is None:
        return jsonify(error="User not found"), 404

    person = Person.query.filter_by(id=person_id, tenant_id=user.tenant_id).first()
    if person is None:
        return jsonify(error="Person not found"), 404
    if person.is_self:
        return jsonify(error="Cannot delete your own profile"), 400

    db.session.delete(person)
    db.session.commit()
    return '', 204


@bp.get("/api/stats")
@jwt_required()
def get_stats():
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    if user is None:
        return jsonify(error="User not found"), 404

    total  = Person.query.filter_by(tenant_id=user.tenant_id, is_self=False).count()
    tenant = db.session.get(Tenant, user.tenant_id)
    return jsonify(
        connections=total,
        paths_found=tenant.paths_found if tenant else 0,
        messages_drafted=tenant.messages_drafted if tenant else 0,
    )


@bp.post("/api/stats/message-drafted")
@jwt_required()
def record_message_drafted():
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    if user is None:
        return jsonify(error="User not found"), 404
    tenant = db.session.get(Tenant, user.tenant_id)
    if tenant:
        tenant.messages_drafted = (tenant.messages_drafted or 0) + 1
        db.session.commit()
    return jsonify(ok=True)


@bp.post("/api/people/bulk")
@jwt_required()
def bulk_import_people():
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    if user is None:
        return jsonify(error="User not found"), 404

    data = request.get_json(silent=True) or {}
    people_data = data.get("people")

    if not isinstance(people_data, list) or len(people_data) == 0:
        return jsonify(error="'people' must be a non-empty array"), 400

    if len(people_data) > MAX_BATCH:
        return jsonify(error=f"Maximum {MAX_BATCH} people per request"), 400

    tenant_id = user.tenant_id

    # Pre-fetch existing people keyed by linkedin_url and email
    existing_by_url = {
        p.linkedin_url: p
        for p in Person.query.filter(
            Person.tenant_id == tenant_id,
            Person.linkedin_url.isnot(None),
        ).all()
    }
    existing_by_email = {
        p.email: p
        for p in Person.query.filter(
            Person.tenant_id == tenant_id,
            Person.email.isnot(None),
        ).all()
    }

    imported = 0
    updated  = 0
    skipped  = 0
    new_people = []
    seen_urls   = set(existing_by_url.keys())
    seen_emails = set(existing_by_email.keys())

    for item in people_data:
        linkedin_url = _clean(item.get("linkedin_url"))
        email        = _clean(item.get("email"))
        title             = _clean(item.get("title"))
        company           = _clean(item.get("company"))
        profile_image_url = _clean(item.get("profile_image_url"))

        # If person already exists, fill in any missing enrichment fields
        existing = (
            existing_by_url.get(linkedin_url) if linkedin_url else None
        ) or (
            existing_by_email.get(email) if email else None
        )

        if existing:
            changed = False
            if not existing.title and title:
                existing.title = title
                changed = True
            if not existing.company and company:
                existing.company = company
                changed = True
            if not existing.profile_image_url and profile_image_url:
                existing.profile_image_url = profile_image_url
                changed = True
            if changed:
                updated += 1
            else:
                skipped += 1
            continue

        # Deduplicate within the current batch
        if linkedin_url and linkedin_url in seen_urls:
            skipped += 1
            continue
        if email and email in seen_emails:
            skipped += 1
            continue

        person = Person(
            tenant_id         = tenant_id,
            first_name        = _clean(item.get("first_name")),
            last_name         = _clean(item.get("last_name")),
            email             = email,
            linkedin_url      = linkedin_url,
            title             = title,
            company           = company,
            profile_image_url = profile_image_url,
            is_self           = False,
        )
        new_people.append(person)
        imported += 1

        if linkedin_url: seen_urls.add(linkedin_url)
        if email:        seen_emails.add(email)

    if new_people:
        db.session.add_all(new_people)
    if imported > 0:
        log_activity(user, "person_imported", f"Imported {imported} contact{'s' if imported != 1 else ''}")
    db.session.commit()

    return jsonify(imported=imported, updated=updated, skipped=skipped), 201


@bp.get("/api/edges")
@jwt_required()
def list_edges():
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    if user is None:
        return jsonify(error="User not found"), 404

    edges = Edge.query.filter_by(tenant_id=user.tenant_id).all()
    return jsonify(edges=[
        {"id": e.id, "from_person_id": e.from_person_id, "to_person_id": e.to_person_id, "relationship_note": e.relationship_note}
        for e in edges
    ])


@bp.post("/api/edges")
@jwt_required()
def create_edge():
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    if user is None:
        return jsonify(error="User not found"), 404

    data = request.get_json(silent=True) or {}
    from_id = data.get("from_person_id")
    to_id   = data.get("to_person_id")

    if not from_id or not to_id:
        return jsonify(error="from_person_id and to_person_id are required"), 400
    if from_id == to_id:
        return jsonify(error="Cannot connect a person to themselves"), 400

    tid = user.tenant_id

    # Verify both people belong to this tenant
    from_person = Person.query.filter_by(id=from_id, tenant_id=tid).first()
    to_person   = Person.query.filter_by(id=to_id,   tenant_id=tid).first()
    if not from_person or not to_person:
        return jsonify(error="One or both people not found"), 404

    # Check both directions to keep the graph logically undirected
    existing = Edge.query.filter(
        Edge.tenant_id == tid,
        db.or_(
            db.and_(Edge.from_person_id == from_id, Edge.to_person_id == to_id),
            db.and_(Edge.from_person_id == to_id,   Edge.to_person_id == from_id),
        )
    ).first()
    if existing:
        return jsonify(error="These people are already connected"), 409

    note = _clean(data.get("relationship_note"))
    edge = Edge(tenant_id=tid, from_person_id=from_id, to_person_id=to_id, relationship_note=note)
    db.session.add(edge)
    log_activity(user, "connection_added", f"Connected {from_person.first_name} {from_person.last_name} and {to_person.first_name} {to_person.last_name}")
    db.session.commit()

    return jsonify(edge={"id": edge.id, "from_person_id": edge.from_person_id, "to_person_id": edge.to_person_id}), 201


def _clean(val):
    """Strip and return None for empty strings."""
    if not isinstance(val, str):
        return None
    val = val.strip()
    return val if val else None
