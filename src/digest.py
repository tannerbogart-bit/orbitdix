"""
src/digest.py — Weekly re-engagement digest.

POST /api/admin/digest
  Protected by X-Cron-Secret header (set CRON_SECRET in .env).
  Call this weekly from an external cron (Fly.io, GitHub Actions, cron-job.org, etc.).

For each active user (has contacts + target accounts) it:
  1. Counts contacts added in the last 7 days
  2. Finds the target company with the most direct connections (bridge contacts)
  3. Sends a digest email via Resend

Dev mode (no RESEND_API_KEY): prints highlights to stdout instead.
"""

import os
from collections import Counter
from datetime import datetime, timedelta, timezone

from flask import Blueprint, jsonify, request

from .db import db
from .email import send_digest_email
from .models import Person, TargetAccount, User

bp = Blueprint("digest", __name__)


@bp.post("/api/admin/digest")
def send_weekly_digest():
    secret = os.getenv("CRON_SECRET", "")
    if secret and request.headers.get("X-Cron-Secret") != secret:
        return jsonify(error="Forbidden"), 403

    one_week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    sent = skipped = 0

    users = User.query.all()
    for user in users:
        try:
            targets = TargetAccount.query.filter_by(user_id=user.id).all()
            if not targets:
                continue  # no targets configured — nothing meaningful to say

            # All non-self people in this tenant
            all_people = Person.query.filter_by(tenant_id=user.tenant_id, is_self=False).all()
            if not all_people:
                continue  # imported nothing yet

            total_contacts = len(all_people)

            # Contacts added in last 7 days
            new_contacts = sum(
                1 for p in all_people
                if p.created_at and p.created_at.replace(tzinfo=timezone.utc) >= one_week_ago
            )

            # Find which target company has the most direct connections
            # (people whose company name fuzzy-matches a target)
            target_names = [t.company_name.lower() for t in targets]
            company_counts = Counter()
            for p in all_people:
                if not p.company:
                    continue
                pc = p.company.lower()
                for tn in target_names:
                    if tn in pc or pc in tn:
                        company_counts[tn] += 1
                        break

            top_target = ""
            bridge_count = 0
            if company_counts:
                top_target_lower, bridge_count = company_counts.most_common(1)[0]
                # Map back to original casing
                for t in targets:
                    if t.company_name.lower() == top_target_lower:
                        top_target = t.company_name
                        break

            # Skip if nothing interesting to say
            if new_contacts == 0 and bridge_count == 0:
                skipped += 1
                continue

            highlights = {
                "top_target":     top_target,
                "bridge_count":   bridge_count,
                "new_contacts":   new_contacts,
                "total_contacts": total_contacts,
            }

            # Get first name from self-person record
            self_person = Person.query.filter_by(user_id=user.id, is_self=True).first()
            first_name  = self_person.first_name if self_person else ""

            ok = send_digest_email(user.email, first_name, highlights)
            if ok:
                sent += 1
            else:
                # Dev fallback — print summary
                print(
                    f"[digest] {user.email}: +{new_contacts} new, "
                    f"{bridge_count} bridges into {top_target or 'n/a'}, "
                    f"{total_contacts} total",
                    flush=True,
                )
                sent += 1

        except Exception as e:
            print(f"[digest] Error processing {user.email}: {e}", flush=True)

    return jsonify(sent=sent, skipped=skipped)
