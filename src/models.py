from datetime import datetime, timezone

from .db import db


class Tenant(db.Model):
    __tablename__ = "tenants"

    id               = db.Column(db.Integer,  primary_key=True)
    name             = db.Column(db.String(255), nullable=False)
    paths_found      = db.Column(db.Integer,  nullable=False, default=0)
    messages_drafted = db.Column(db.Integer,  nullable=False, default=0)
    created_at       = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    users   = db.relationship("User",   back_populates="tenant", lazy=True, cascade="all, delete-orphan", passive_deletes=True)
    persons = db.relationship("Person", back_populates="tenant", lazy=True, cascade="all, delete-orphan", passive_deletes=True)
    edges   = db.relationship("Edge",   back_populates="tenant", lazy=True, cascade="all, delete-orphan", passive_deletes=True)


class User(db.Model):
    __tablename__ = "users"
    __table_args__ = (
        db.Index("ix_users_tenant_id", "tenant_id"),
        db.Index("ix_users_email",     "email"),
    )

    id            = db.Column(db.Integer,      primary_key=True)
    tenant_id     = db.Column(db.Integer,      db.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    email         = db.Column(db.String(255),  nullable=False, unique=True)
    password_hash = db.Column(db.String(255),  nullable=False)
    role          = db.Column(db.String(50),   nullable=False, default="owner")
    created_at    = db.Column(db.DateTime,     default=lambda: datetime.now(timezone.utc))

    tenant  = db.relationship("Tenant", back_populates="users")
    persons = db.relationship("Person", back_populates="user", lazy=True, cascade="all, delete-orphan", passive_deletes=True)


class Person(db.Model):
    __tablename__ = "persons"
    __table_args__ = (
        db.Index("ix_persons_tenant_id",          "tenant_id"),
        db.Index("ix_persons_user_id",             "user_id"),
        db.Index("ix_persons_email",               "email"),
        # Fast dedup lookups scoped to tenant
        db.Index("ix_persons_tenant_linkedin_url", "tenant_id", "linkedin_url"),
        db.Index("ix_persons_tenant_email",        "tenant_id", "email"),
        # Only one self-person per user (NULL user_id rows are excluded by DB NULL semantics)
        db.UniqueConstraint("user_id", "is_self", name="uq_person_user_is_self"),
    )

    id                = db.Column(db.Integer,     primary_key=True)
    tenant_id         = db.Column(db.Integer,     db.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    user_id           = db.Column(db.Integer,     db.ForeignKey("users.id",   ondelete="SET NULL"), nullable=True)
    is_self           = db.Column(db.Boolean,     nullable=False, default=False)
    first_name        = db.Column(db.String(255), nullable=True)
    last_name         = db.Column(db.String(255), nullable=True)
    email             = db.Column(db.String(255), nullable=True)
    linkedin_url      = db.Column(db.String(500), nullable=True)
    title             = db.Column(db.String(255), nullable=True)
    company           = db.Column(db.String(255), nullable=True)
    profile_image_url = db.Column(db.String(1000), nullable=True)
    created_at        = db.Column(db.DateTime,    default=lambda: datetime.now(timezone.utc))

    tenant = db.relationship("Tenant", back_populates="persons")
    user   = db.relationship("User",   back_populates="persons")

    # passive_deletes lets the DB CASCADE handle edge removal when a Person is deleted
    edges_from = db.relationship(
        "Edge", foreign_keys="Edge.from_person_id",
        back_populates="from_person", lazy=True, passive_deletes=True,
    )
    edges_to = db.relationship(
        "Edge", foreign_keys="Edge.to_person_id",
        back_populates="to_person", lazy=True, passive_deletes=True,
    )


class SavedPath(db.Model):
    __tablename__ = "saved_paths"
    __table_args__ = (
        db.Index("ix_saved_paths_user_id",   "user_id"),
        db.Index("ix_saved_paths_tenant_id", "tenant_id"),
    )

    id             = db.Column(db.Integer,    primary_key=True)
    tenant_id      = db.Column(db.Integer,    db.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    user_id        = db.Column(db.Integer,    db.ForeignKey("users.id",   ondelete="CASCADE"), nullable=False)
    from_person_id = db.Column(db.Integer,    db.ForeignKey("persons.id", ondelete="CASCADE"), nullable=False)
    to_person_id   = db.Column(db.Integer,    db.ForeignKey("persons.id", ondelete="CASCADE"), nullable=False)
    path_ids       = db.Column(db.Text,       nullable=False)  # JSON array of person IDs
    degrees        = db.Column(db.Integer,    nullable=False, default=0)
    created_at     = db.Column(db.DateTime,   default=lambda: datetime.now(timezone.utc))


class Activity(db.Model):
    __tablename__ = "activities"
    __table_args__ = (
        db.Index("ix_activities_tenant_id", "tenant_id"),
        db.Index("ix_activities_user_id",   "user_id"),
        db.Index("ix_activities_created_at","created_at"),
    )

    id         = db.Column(db.Integer,    primary_key=True)
    tenant_id  = db.Column(db.Integer,    db.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    user_id    = db.Column(db.Integer,    db.ForeignKey("users.id",   ondelete="CASCADE"), nullable=False)
    type       = db.Column(db.String(50), nullable=False)  # path_found | message_drafted | connection_added | person_imported
    text       = db.Column(db.String(500), nullable=True)
    created_at = db.Column(db.DateTime,   default=lambda: datetime.now(timezone.utc))


class Edge(db.Model):
    __tablename__ = "edges"
    __table_args__ = (
        db.Index("ix_edges_tenant_id",      "tenant_id"),
        db.Index("ix_edges_from_person_id", "from_person_id"),
        db.Index("ix_edges_to_person_id",   "to_person_id"),
        # Composite index for BFS traversal (tenant-scoped adjacency lookups)
        db.Index("ix_edges_bfs", "tenant_id", "from_person_id", "to_person_id"),
        # No duplicate directed edges within a tenant
        db.UniqueConstraint("tenant_id", "from_person_id", "to_person_id", name="uq_edge_tenant_pair"),
        # No self-loops
        db.CheckConstraint("from_person_id != to_person_id", name="ck_edge_no_self_loop"),
    )

    id               = db.Column(db.Integer,    primary_key=True)
    tenant_id        = db.Column(db.Integer,    db.ForeignKey("tenants.id",  ondelete="CASCADE"), nullable=False)
    from_person_id   = db.Column(db.Integer,    db.ForeignKey("persons.id",  ondelete="CASCADE"), nullable=False)
    to_person_id     = db.Column(db.Integer,    db.ForeignKey("persons.id",  ondelete="CASCADE"), nullable=False)
    relationship_type = db.Column(db.String(100), nullable=False, default="linkedin")
    relationship_note = db.Column(db.Text,       nullable=True)
    strength         = db.Column(db.Integer,    nullable=True)
    created_at       = db.Column(db.DateTime,   default=lambda: datetime.now(timezone.utc))

    tenant      = db.relationship("Tenant", back_populates="edges")
    from_person = db.relationship("Person", foreign_keys=[from_person_id], back_populates="edges_from")
    to_person   = db.relationship("Person", foreign_keys=[to_person_id],   back_populates="edges_to")
