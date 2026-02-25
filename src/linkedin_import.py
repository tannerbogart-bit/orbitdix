import csv
import io
from urllib.parse import urlparse, urlunparse

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from src.models import Edge, Person, User, db

bp = Blueprint("linkedin_import", __name__)


def normalize_linkedin_url(url: str) -> str | None:
    """Return a canonical LinkedIn URL, or None if the input cannot be normalized."""
    if not url:
        return None
    url = url.strip()
    if not url:
        return None
    # Add scheme if missing
    if not url.startswith(("http://", "https://")):
        url = "https://" + url
    try:
        parsed = urlparse(url)
    except Exception:
        return None
    # Must look like a LinkedIn host after normalization
    host = parsed.netloc.lower()
    if "linkedin.com" not in host:
        return None
    path = parsed.path.rstrip("/")
    if not path:
        return None
    return urlunparse(("https", "www.linkedin.com", path, "", "", ""))


def _get_field(row: dict, *keys: str) -> str:
    """Return the first non-empty value from a CSV row matching any of the given header names (case/space-insensitive)."""
    for key in keys:
        for k, v in row.items():
            if k.strip().lower() == key.lower() and v is not None:
                val = v.strip()
                if val:
                    return val
    return ""


@bp.post("/api/import/linkedin")
@jwt_required()
def import_linkedin():
    user_id = get_jwt_identity()
    user = db.session.get(User, user_id)
    if user is None:
        return jsonify(error="User not found"), 404

    self_person = Person.query.filter_by(user_id=user_id, is_self=True).first()
    if self_person is None:
        return jsonify(error="Self person not found"), 404

    tenant_id = user.tenant_id

    # Accept CSV as multipart file upload, JSON body {"csv": "..."}, or raw text body
    csv_text = None
    if request.files:
        f = request.files.get("file")
        if f:
            csv_text = f.read().decode("utf-8-sig")
    if csv_text is None:
        content_type = request.content_type or ""
        if "application/json" in content_type:
            data = request.get_json(silent=True) or {}
            csv_text = data.get("csv") or ""
        else:
            csv_text = request.get_data(as_text=True)

    if not csv_text or not csv_text.strip():
        return jsonify(error="No CSV data provided"), 400

    reader = csv.DictReader(io.StringIO(csv_text))

    created_people = 0
    updated_people = 0
    edges_created = 0
    edges_updated = 0
    skipped = 0
    errors = []

    for idx, row in enumerate(reader, start=1):
        first_name = _get_field(row, "first name")
        last_name = _get_field(row, "last name")
        url_raw = _get_field(row, "url")
        email = _get_field(row, "email address", "email")
        company = _get_field(row, "company")
        position = _get_field(row, "position", "title")

        if not first_name or not last_name:
            errors.append({"row": idx, "error": "Missing required fields: first_name and/or last_name"})
            skipped += 1
            continue

        linkedin_url = normalize_linkedin_url(url_raw) if url_raw else None
        # If URL was provided but couldn't be normalized, fall back gracefully
        if url_raw and not linkedin_url:
            errors.append({"row": idx, "error": f"Could not normalize URL: {url_raw!r}"})

        # Identity resolution in priority order
        person = None
        if linkedin_url:
            person = Person.query.filter_by(
                tenant_id=tenant_id, linkedin_url=linkedin_url
            ).first()
        if person is None and email:
            person = Person.query.filter_by(
                tenant_id=tenant_id, email=email
            ).first()

        is_new = person is None
        if is_new:
            person = Person(tenant_id=tenant_id)

        person.first_name = first_name
        person.last_name = last_name
        if email:
            person.email = email
        if linkedin_url:
            person.linkedin_url = linkedin_url
        if company:
            person.company = company
        if position:
            person.position = position

        db.session.add(person)
        db.session.flush()

        if is_new:
            created_people += 1
        else:
            updated_people += 1

        # Upsert edge: self -> imported person (idempotent by source)
        edge = Edge.query.filter_by(
            tenant_id=tenant_id,
            from_person_id=self_person.id,
            to_person_id=person.id,
            source="linkedin_csv",
        ).first()
        if edge is None:
            db.session.add(Edge(
                tenant_id=tenant_id,
                from_person_id=self_person.id,
                to_person_id=person.id,
                relationship_type="linkedin_connection",
                source="linkedin_csv",
            ))
            edges_created += 1
        else:
            edges_updated += 1

    db.session.commit()

    return jsonify(
        created_people=created_people,
        updated_people=updated_people,
        edges_created=edges_created,
        edges_updated=edges_updated,
        skipped=skipped,
        errors=errors,
    ), 200
