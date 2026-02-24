from datetime import datetime, timezone
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


class Tenant(db.Model):
    __tablename__ = "tenants"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    users = db.relationship("User", back_populates="tenant", lazy=True)
    persons = db.relationship("Person", back_populates="tenant", lazy=True)
    edges = db.relationship("Edge", back_populates="tenant", lazy=True)


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey("tenants.id"), nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(50), nullable=False, default="owner")
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    tenant = db.relationship("Tenant", back_populates="users")
    persons = db.relationship("Person", back_populates="user", lazy=True)


class Person(db.Model):
    __tablename__ = "persons"

    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey("tenants.id"), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    is_self = db.Column(db.Boolean, nullable=False, default=False)
    first_name = db.Column(db.String(255), nullable=True)
    last_name = db.Column(db.String(255), nullable=True)
    email = db.Column(db.String(255), nullable=True)
    linkedin_url = db.Column(db.String(500), nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    tenant = db.relationship("Tenant", back_populates="persons")
    user = db.relationship("User", back_populates="persons")
    edges_from = db.relationship(
        "Edge",
        foreign_keys="Edge.from_person_id",
        back_populates="from_person",
        lazy=True,
    )
    edges_to = db.relationship(
        "Edge",
        foreign_keys="Edge.to_person_id",
        back_populates="to_person",
        lazy=True,
    )


class Edge(db.Model):
    __tablename__ = "edges"

    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey("tenants.id"), nullable=False)
    from_person_id = db.Column(db.Integer, db.ForeignKey("persons.id"), nullable=False)
    to_person_id = db.Column(db.Integer, db.ForeignKey("persons.id"), nullable=False)
    relationship_type = db.Column(db.String(100), nullable=False)
    strength = db.Column(db.Integer, nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    tenant = db.relationship("Tenant", back_populates="edges")
    from_person = db.relationship(
        "Person", foreign_keys=[from_person_id], back_populates="edges_from"
    )
    to_person = db.relationship(
        "Person", foreign_keys=[to_person_id], back_populates="edges_to"
    )
