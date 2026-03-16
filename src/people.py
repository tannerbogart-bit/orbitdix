"""
src/people.py — bulk people import endpoint.

POST /api/people/bulk
  Accepts a JSON array of people, deduplicates by linkedin_url then email
  within the authenticated user's tenant, and bulk-inserts new records.
"""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from .db import db
from .models import Person, User

bp = Blueprint("people", __name__)

MAX_BATCH = 200


@bp.post("/api/people/bulk")
@jwt_required()
def bulk_import_people():
    user_id = get_jwt_identity()
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

    # Pre-fetch existing linkedin_urls and emails for this tenant to avoid N+1 queries
    existing_urls = {
        p.linkedin_url
        for p in Person.query.filter(
            Person.tenant_id == tenant_id,
            Person.linkedin_url.isnot(None),
        ).with_entities(Person.linkedin_url)
    }
    existing_emails = {
        p.email
        for p in Person.query.filter(
            Person.tenant_id == tenant_id,
            Person.email.isnot(None),
        ).with_entities(Person.email)
    }

    imported = 0
    skipped  = 0
    new_people = []

    for item in people_data:
        linkedin_url = _clean(item.get("linkedin_url"))
        email        = _clean(item.get("email"))

        # Deduplicate within existing DB records
        if linkedin_url and linkedin_url in existing_urls:
            skipped += 1
            continue
        if email and email in existing_emails:
            skipped += 1
            continue

        # Also deduplicate within the current batch (same person appears twice)
        if linkedin_url and any(p.linkedin_url == linkedin_url for p in new_people):
            skipped += 1
            continue
        if email and any(p.email == email for p in new_people):
            skipped += 1
            continue

        person = Person(
            tenant_id         = tenant_id,
            first_name        = _clean(item.get("first_name")),
            last_name         = _clean(item.get("last_name")),
            email             = email,
            linkedin_url      = linkedin_url,
            is_self           = False,
        )
        new_people.append(person)
        imported += 1

        # Track in-memory for intra-batch dedup
        if linkedin_url: existing_urls.add(linkedin_url)
        if email:        existing_emails.add(email)

    if new_people:
        db.session.add_all(new_people)
        db.session.commit()

    return jsonify(imported=imported, skipped=skipped), 201


def _clean(val):
    """Strip and return None for empty strings."""
    if not isinstance(val, str):
        return None
    val = val.strip()
    return val if val else None
