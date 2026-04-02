"""
src/billing.py — Stripe checkout and webhook endpoints.

POST /api/checkout              — create a Stripe Checkout session (requires auth)
POST /api/webhooks/stripe       — Stripe webhook (no auth, verified by signature)
GET  /api/billing/plan          — return current plan for the logged-in tenant
"""

import logging
import os

import stripe
from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

logger = logging.getLogger(__name__)

from .db import db
from .models import Tenant, User

bp = Blueprint("billing", __name__)

stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "")

PLAN_PRICES = {
    "pro":  os.getenv("STRIPE_PRO_PRICE_ID",  ""),
    "max":  os.getenv("STRIPE_MAX_PRICE_ID",  ""),
    "team": os.getenv("STRIPE_TEAM_PRICE_ID", ""),  # legacy alias
}


@bp.post("/api/checkout")
@jwt_required()
def create_checkout():
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    if user is None:
        return jsonify(error="User not found"), 404

    data     = request.get_json(silent=True) or {}
    plan     = data.get("plan")          # "pro" or "team"
    success_url = data.get("success_url", "http://localhost:5174/pricing/success")
    cancel_url  = data.get("cancel_url",  "http://localhost:5174/pricing")

    if plan not in PLAN_PRICES:
        return jsonify(error="Invalid plan. Choose 'pro' or 'max'"), 400

    price_id = PLAN_PRICES[plan]
    if not price_id or price_id == "price_REPLACE_ME":
        return jsonify(error="Stripe price ID not configured. Add STRIPE_PRO_PRICE_ID / STRIPE_MAX_PRICE_ID to .env"), 500

    if not stripe.api_key or stripe.api_key == "sk_test_REPLACE_ME":
        return jsonify(error="Stripe secret key not configured. Add STRIPE_SECRET_KEY to .env"), 500

    tenant = db.session.get(Tenant, user.tenant_id)

    try:
        # Re-use existing Stripe customer if we have one
        customer_kwargs = {}
        if tenant and tenant.stripe_customer_id:
            customer_kwargs["customer"] = tenant.stripe_customer_id
        else:
            customer_kwargs["customer_email"] = user.email

        session = stripe.checkout.Session.create(
            mode="subscription",
            line_items=[{"price": price_id, "quantity": 1}],
            metadata={"tenant_id": str(user.tenant_id), "plan": plan},
            success_url=success_url + "?session_id={CHECKOUT_SESSION_ID}",
            cancel_url=cancel_url,
            **customer_kwargs,
        )
        return jsonify(url=session.url)
    except stripe.StripeError as e:
        return jsonify(error=str(e)), 502


@bp.post("/api/webhooks/stripe")
def stripe_webhook():
    webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET", "")
    payload        = request.get_data()
    sig_header     = request.headers.get("Stripe-Signature", "")

    if not webhook_secret or webhook_secret == "whsec_REPLACE_ME":
        return jsonify(error="Webhook secret not configured"), 500

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
    except stripe.errors.SignatureVerificationError:
        return jsonify(error="Invalid signature"), 400

    try:
        if event["type"] == "checkout.session.completed":
            session   = event["data"]["object"]
            metadata  = session.get("metadata") or {}
            tenant_id = metadata.get("tenant_id")
            plan      = metadata.get("plan", "pro")

            if not tenant_id:
                logger.warning("Stripe checkout.session.completed missing tenant_id in metadata")
            else:
                try:
                    tid = int(tenant_id)
                except (ValueError, TypeError):
                    logger.error("Stripe webhook: invalid tenant_id %r in metadata", tenant_id)
                    return jsonify(received=True)  # ack so Stripe doesn't retry

                tenant = db.session.get(Tenant, tid)
                if tenant:
                    tenant.plan                   = plan
                    tenant.subscription_status    = "active"
                    tenant.stripe_customer_id     = session.get("customer")
                    tenant.stripe_subscription_id = session.get("subscription")
                    db.session.commit()
                    logger.info("Tenant %s upgraded to plan=%s", tid, plan)
                else:
                    logger.error("Stripe webhook: tenant %s not found", tid)

        elif event["type"] == "customer.subscription.deleted":
            sub         = event["data"]["object"]
            customer_id = sub.get("customer")
            if customer_id:
                tenant = Tenant.query.filter_by(stripe_customer_id=customer_id).first()
                if tenant:
                    tenant.plan                = "free"
                    tenant.subscription_status = "canceled"
                    db.session.commit()
                    logger.info("Tenant %s subscription canceled", tenant.id)

        elif event["type"] == "invoice.payment_failed":
            sub         = event["data"]["object"]
            customer_id = sub.get("customer")
            if customer_id:
                tenant = Tenant.query.filter_by(stripe_customer_id=customer_id).first()
                if tenant:
                    tenant.subscription_status = "past_due"
                    db.session.commit()
                    logger.info("Tenant %s payment failed — marked past_due", tenant.id)

    except Exception as e:
        logger.error("Stripe webhook processing error (event=%s): %s", event.get("type"), e)
        # Still return 200 so Stripe doesn't retry — log for manual investigation
        return jsonify(received=True, error="processing_error")

    return jsonify(received=True)


@bp.post("/api/billing/portal")
@jwt_required()
def billing_portal():
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    if user is None:
        return jsonify(error="User not found"), 404

    tenant = db.session.get(Tenant, user.tenant_id)
    if not tenant or not tenant.stripe_customer_id:
        return jsonify(error="No Stripe customer found. Subscribe first."), 400

    if not stripe.api_key:
        return jsonify(error="Stripe not configured"), 500

    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    try:
        session = stripe.billing_portal.Session.create(
            customer=tenant.stripe_customer_id,
            return_url=f"{frontend_url}/dashboard",
        )
        return jsonify(url=session.url)
    except stripe.StripeError as e:
        return jsonify(error=str(e)), 502


@bp.get("/api/billing/plan")
@jwt_required()
def get_plan():
    user_id = int(get_jwt_identity())
    user    = db.session.get(User, user_id)
    if user is None:
        return jsonify(error="User not found"), 404

    tenant = db.session.get(Tenant, user.tenant_id)
    return jsonify(
        plan=tenant.plan if tenant else "free",
        subscription_status=tenant.subscription_status if tenant else "active",
    )
