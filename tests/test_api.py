import pytest
from src.app import create_app
from src.models import db as _db


@pytest.fixture
def app():
    app = create_app()
    app.config["TESTING"] = True
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
    with app.app_context():
        _db.create_all()
        yield app
        _db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


def signup(client, **kwargs):
    payload = {
        "tenant_name": "Acme",
        "email": "alice@example.com",
        "password": "secret123",
        "first_name": "Alice",
        "last_name": "Smith",
    }
    payload.update(kwargs)
    return client.post("/api/auth/signup", json=payload)


# ── signup ────────────────────────────────────────────────────────────────────

def test_signup_success(client):
    resp = signup(client)
    assert resp.status_code == 201
    data = resp.get_json()
    assert "access_token" in data
    assert data["user_id"] is not None
    assert data["tenant_id"] is not None
    assert data["person_id"] is not None


def test_signup_duplicate_email(client):
    signup(client)
    resp = signup(client)
    assert resp.status_code == 409


def test_signup_missing_fields(client):
    resp = client.post("/api/auth/signup", json={"email": "x@x.com"})
    assert resp.status_code == 400


# ── login ─────────────────────────────────────────────────────────────────────

def test_login_success(client):
    signup(client)
    resp = client.post(
        "/api/auth/login", json={"email": "alice@example.com", "password": "secret123"}
    )
    assert resp.status_code == 200
    assert "access_token" in resp.get_json()


def test_login_wrong_password(client):
    signup(client)
    resp = client.post(
        "/api/auth/login", json={"email": "alice@example.com", "password": "wrong"}
    )
    assert resp.status_code == 401


def test_login_unknown_email(client):
    resp = client.post(
        "/api/auth/login", json={"email": "nobody@example.com", "password": "x"}
    )
    assert resp.status_code == 401


# ── /api/me ───────────────────────────────────────────────────────────────────

def test_me_success(client):
    token = signup(client).get_json()["access_token"]
    resp = client.get("/api/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["user"]["email"] == "alice@example.com"
    assert data["tenant"]["name"] == "Acme"
    assert data["self_person_id"] is not None


def test_me_no_token(client):
    resp = client.get("/api/me")
    assert resp.status_code == 401


# ── intro-path ────────────────────────────────────────────────────────────────

def _setup_graph(client):
    """Signup, then add persons and edges to build: self—B—C."""
    token = signup(client).get_json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Get self_person_id
    me = client.get("/api/me", headers=headers).get_json()
    self_pid = me["self_person_id"]
    tenant_id = me["tenant"]["id"]

    from src.models import Person, Edge, db

    with client.application.app_context():
        b = Person(tenant_id=tenant_id, first_name="Bob", email="bob@example.com")
        c = Person(tenant_id=tenant_id, first_name="Carol", email="carol@example.com")
        db.session.add_all([b, c])
        db.session.flush()
        db.session.add(Edge(
            tenant_id=tenant_id,
            from_person_id=self_pid,
            to_person_id=b.id,
            relationship_type="colleague",
        ))
        db.session.add(Edge(
            tenant_id=tenant_id,
            from_person_id=b.id,
            to_person_id=c.id,
            relationship_type="friend",
        ))
        db.session.commit()
        b_id, c_id = b.id, c.id

    return token, self_pid, b_id, c_id


def test_intro_path_direct(client):
    token, self_pid, b_id, _ = _setup_graph(client)
    resp = client.post(
        "/api/intro-path",
        json={"to_person_id": b_id},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    path = resp.get_json()["path"]
    assert path[0] == self_pid
    assert path[-1] == b_id


def test_intro_path_two_hops(client):
    token, self_pid, b_id, c_id = _setup_graph(client)
    resp = client.post(
        "/api/intro-path",
        json={"to_person_id": c_id},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    path = resp.get_json()["path"]
    assert path[0] == self_pid
    assert path[-1] == c_id
    assert len(path) == 3


def test_intro_path_self(client):
    token, self_pid, _, _ = _setup_graph(client)
    resp = client.post(
        "/api/intro-path",
        json={"to_person_id": self_pid},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    assert resp.get_json()["path"] == [self_pid]


def test_intro_path_no_path(client):
    token, _, _, _ = _setup_graph(client)
    # Add an isolated person
    me = client.get(
        "/api/me", headers={"Authorization": f"Bearer {token}"}
    ).get_json()
    tenant_id = me["tenant"]["id"]
    from src.models import Person, db
    with client.application.app_context():
        isolated = Person(
            tenant_id=tenant_id, first_name="Isolated", email="iso@example.com"
        )
        db.session.add(isolated)
        db.session.commit()
        iso_id = isolated.id

    resp = client.post(
        "/api/intro-path",
        json={"to_person_id": iso_id},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 404


def test_intro_path_requires_jwt(client):
    resp = client.post("/api/intro-path", json={"to_person_id": 1})
    assert resp.status_code == 401
