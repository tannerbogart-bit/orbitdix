from datetime import datetime, timezone

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from .models import Outreach, User, db

bp = Blueprint("outreach", __name__)


def _serialize(o):
    return {
        "id":              o.id,
        "target_name":     o.target_name,
        "target_company":  o.target_company,
        "via_person_name": o.via_person_name,
        "path_summary":    o.path_summary,
        "message":         o.message,
        "status":          o.status,
        "notes":           o.notes,
        "follow_up_at":    o.follow_up_at.isoformat() if o.follow_up_at else None,
        "sent_at":         o.sent_at.isoformat()      if o.sent_at      else None,
        "created_at":      o.created_at.isoformat()   if o.created_at   else None,
    }


@bp.get("/api/outreach")
@jwt_required()
def list_outreach():
    user_id = int(get_jwt_identity())
    user    = db.session.get(User, user_id)
    if not user:
        return jsonify(error="User not found"), 404

    status = request.args.get("status")  # optional filter
    q = Outreach.query.filter_by(user_id=user_id)
    if status:
        q = q.filter_by(status=status)
    records = q.order_by(Outreach.created_at.desc()).all()
    return jsonify(outreach=[_serialize(r) for r in records])


@bp.post("/api/outreach")
@jwt_required()
def create_outreach():
    user_id = int(get_jwt_identity())
    user    = db.session.get(User, user_id)
    if not user:
        return jsonify(error="User not found"), 404

    data = request.get_json(silent=True) or {}

    def _str(key, max_len):
        v = (data.get(key) or "").strip()
        return v[:max_len] if v else None

    record = Outreach(
        user_id         = user_id,
        tenant_id       = user.tenant_id,
        target_name     = _str("target_name",     255),
        target_company  = _str("target_company",  255),
        via_person_name = _str("via_person_name", 255),
        path_summary    = _str("path_summary",    1000),
        message         = _str("message",         10000),
        status          = data.get("status", "drafted"),
        notes           = _str("notes",           2000),
    )
    db.session.add(record)
    db.session.commit()
    return jsonify(_serialize(record)), 201


@bp.patch("/api/outreach/<int:outreach_id>")
@jwt_required()
def update_outreach(outreach_id):
    user_id = int(get_jwt_identity())
    record  = Outreach.query.filter_by(id=outreach_id, user_id=user_id).first()
    if not record:
        return jsonify(error="Not found"), 404

    data = request.get_json(silent=True) or {}

    if "status" in data:
        new_status = data["status"]
        if new_status not in ("drafted", "sent", "replied", "no_reply"):
            return jsonify(error="Invalid status"), 400
        record.status = new_status
        if new_status == "sent" and not record.sent_at:
            record.sent_at = datetime.now(timezone.utc)

    if "notes" in data:
        record.notes = data["notes"]

    if "message" in data:
        record.message = data["message"]

    if "follow_up_at" in data:
        raw = data["follow_up_at"]
        record.follow_up_at = datetime.fromisoformat(raw) if raw else None

    db.session.commit()
    return jsonify(_serialize(record))


@bp.delete("/api/outreach/<int:outreach_id>")
@jwt_required()
def delete_outreach(outreach_id):
    user_id = int(get_jwt_identity())
    record  = Outreach.query.filter_by(id=outreach_id, user_id=user_id).first()
    if not record:
        return jsonify(error="Not found"), 404
    db.session.delete(record)
    db.session.commit()
    return "", 204
