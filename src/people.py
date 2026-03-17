"""
src/people.py — people endpoints.

GET  /api/people       — list all people in the authenticated tenant
POST /api/people/bulk  — bulk import up to 200 people
GET  /api/stats        — connection count + basic stats for dashboard
"""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from .db import db
from .models import Person, User

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

    people = Person.query.filter_by(tenant_id=user.tenant_id).order_by(
        Person.is_self.desc(), Person.first_name, Person.last_name
    ).all()

    return jsonify(people=[_person_dict(p) for p in people])


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

    total = Person.query.filter_by(tenant_id=user.tenant_id, is_self=False).count()
    return jsonify(connections=total)


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
    db.session.commit()

    return jsonify(imported=imported, updated=updated, skipped=skipped), 201


def _clean(val):
    """Strip and return None for empty strings."""
    if not isinstance(val, str):
        return None
    val = val.strip()
    return val if val else None
