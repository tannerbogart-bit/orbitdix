import io
import pytest
from src.app import create_app
from src.models import db as _db
from src.linkedin_import import normalize_linkedin_url


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


def auth_headers(client):
    token = signup(client).get_json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


# ── URL normalization ─────────────────────────────────────────────────────────

@pytest.mark.parametrize("raw,expected", [
    # already canonical
    ("https://www.linkedin.com/in/johndoe", "https://www.linkedin.com/in/johndoe"),
    # trailing slash removed
    ("https://www.linkedin.com/in/johndoe/", "https://www.linkedin.com/in/johndoe"),
    # http -> https
    ("http://www.linkedin.com/in/johndoe", "https://www.linkedin.com/in/johndoe"),
    # missing scheme
    ("www.linkedin.com/in/johndoe", "https://www.linkedin.com/in/johndoe"),
    # linkedin.com without www
    ("https://linkedin.com/in/johndoe", "https://www.linkedin.com/in/johndoe"),
    # query string stripped
    ("https://www.linkedin.com/in/johndoe?trk=foo", "https://www.linkedin.com/in/johndoe"),
    # fragment stripped
    ("https://www.linkedin.com/in/johndoe#section", "https://www.linkedin.com/in/johndoe"),
    # whitespace trimmed
    ("  https://www.linkedin.com/in/johndoe  ", "https://www.linkedin.com/in/johndoe"),
    # all variants normalize to same string
    ("http://linkedin.com/in/johndoe/", "https://www.linkedin.com/in/johndoe"),
])
def test_normalize_linkedin_url_equivalences(raw, expected):
    assert normalize_linkedin_url(raw) == expected


def test_normalize_linkedin_url_empty():
    assert normalize_linkedin_url("") is None
    assert normalize_linkedin_url("   ") is None
    assert normalize_linkedin_url(None) is None


def test_normalize_linkedin_url_non_linkedin():
    assert normalize_linkedin_url("https://twitter.com/foo") is None


# ── import endpoint basics ────────────────────────────────────────────────────

def test_import_requires_auth(client):
    resp = client.post("/api/import/linkedin", data={"csv": "First Name,Last Name\nJohn,Doe"})
    assert resp.status_code == 401


def test_import_no_csv(client):
    headers = auth_headers(client)
    resp = client.post("/api/import/linkedin", json={}, headers=headers)
    assert resp.status_code == 400


def test_import_creates_person_and_edge(client):
    headers = auth_headers(client)
    csv_data = "First Name,Last Name,URL,Email Address,Company,Position\nJohn,Doe,https://www.linkedin.com/in/johndoe,john@doe.com,Acme,Engineer"
    resp = client.post(
        "/api/import/linkedin",
        json={"csv": csv_data},
        headers=headers,
    )
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["created_people"] == 1
    assert data["updated_people"] == 0
    assert data["edges_created"] == 1
    assert data["skipped"] == 0


def test_import_skips_missing_name(client):
    headers = auth_headers(client)
    csv_data = "First Name,Last Name\n,Doe\nJohn,"
    resp = client.post("/api/import/linkedin", json={"csv": csv_data}, headers=headers)
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["skipped"] == 2
    assert len(data["errors"]) == 2


# ── upsert / dedupe rules ─────────────────────────────────────────────────────

def test_upsert_by_linkedin_url(client):
    headers = auth_headers(client)
    csv1 = "First Name,Last Name,URL\nJohn,Doe,https://www.linkedin.com/in/johndoe"
    csv2 = "First Name,Last Name,URL\nJohn,Updated,https://www.linkedin.com/in/johndoe"
    client.post("/api/import/linkedin", json={"csv": csv1}, headers=headers)
    resp = client.post("/api/import/linkedin", json={"csv": csv2}, headers=headers)
    data = resp.get_json()
    # Second import should update, not create
    assert data["created_people"] == 0
    assert data["updated_people"] == 1


def test_upsert_by_email(client):
    headers = auth_headers(client)
    csv1 = "First Name,Last Name,Email Address\nJohn,Doe,john@doe.com"
    csv2 = "First Name,Last Name,Email Address\nJohn,Updated,john@doe.com"
    client.post("/api/import/linkedin", json={"csv": csv1}, headers=headers)
    resp = client.post("/api/import/linkedin", json={"csv": csv2}, headers=headers)
    data = resp.get_json()
    assert data["created_people"] == 0
    assert data["updated_people"] == 1


def test_no_name_merge_creates_new_person(client):
    """Without URL or email, each row creates a new person (no name-based merge)."""
    headers = auth_headers(client)
    csv1 = "First Name,Last Name\nJohn,Doe"
    csv2 = "First Name,Last Name\nJohn,Doe"
    client.post("/api/import/linkedin", json={"csv": csv1}, headers=headers)
    resp = client.post("/api/import/linkedin", json={"csv": csv2}, headers=headers)
    data = resp.get_json()
    # No URL or email -> always new person
    assert data["created_people"] == 1
    assert data["updated_people"] == 0


# ── idempotent re-import ──────────────────────────────────────────────────────

def test_idempotent_reimport_no_duplicates(client):
    headers = auth_headers(client)
    csv_data = "First Name,Last Name,URL,Email Address\nJohn,Doe,https://www.linkedin.com/in/johndoe,john@doe.com"

    resp1 = client.post("/api/import/linkedin", json={"csv": csv_data}, headers=headers)
    resp2 = client.post("/api/import/linkedin", json={"csv": csv_data}, headers=headers)

    d1 = resp1.get_json()
    d2 = resp2.get_json()

    assert d1["created_people"] == 1
    assert d2["created_people"] == 0
    assert d2["updated_people"] == 1

    # Edge must not be duplicated
    assert d1["edges_created"] == 1
    assert d2["edges_created"] == 0
    assert d2["edges_updated"] == 1


# ── edge upsert idempotency ───────────────────────────────────────────────────

def test_edge_idempotency_multiple_imports(client):
    headers = auth_headers(client)
    csv_data = "First Name,Last Name,URL\nAlice,Wonder,https://www.linkedin.com/in/alicewonder"

    for _ in range(3):
        client.post("/api/import/linkedin", json={"csv": csv_data}, headers=headers)

    from src.models import Edge, Person
    with client.application.app_context():
        alice = Person.query.filter_by(linkedin_url="https://www.linkedin.com/in/alicewonder").first()
        assert alice is not None
        edges = Edge.query.filter_by(to_person_id=alice.id, source="linkedin_csv").all()
        assert len(edges) == 1


# ── URL normalization in import ───────────────────────────────────────────────

def test_import_normalizes_url_variants(client):
    """Different URL variants for the same person should result in one person."""
    headers = auth_headers(client)
    csv1 = "First Name,Last Name,URL\nJohn,Doe,http://linkedin.com/in/johndoe/"
    csv2 = "First Name,Last Name,URL\nJohn,Updated,https://www.linkedin.com/in/johndoe"
    client.post("/api/import/linkedin", json={"csv": csv1}, headers=headers)
    resp = client.post("/api/import/linkedin", json={"csv": csv2}, headers=headers)
    data = resp.get_json()
    assert data["created_people"] == 0
    assert data["updated_people"] == 1


def test_import_bad_url_falls_back_to_email(client):
    headers = auth_headers(client)
    csv1 = "First Name,Last Name,Email Address\nJohn,Doe,john@example.com"
    csv2 = "First Name,Last Name,URL,Email Address\nJohn,Updated,not-a-linkedin-url,john@example.com"
    client.post("/api/import/linkedin", json={"csv": csv1}, headers=headers)
    resp = client.post("/api/import/linkedin", json={"csv": csv2}, headers=headers)
    data = resp.get_json()
    # Bad URL but valid email -> should match existing person
    assert data["updated_people"] == 1
    assert data["created_people"] == 0


# ── multipart file upload ─────────────────────────────────────────────────────

def test_import_via_file_upload(client):
    headers = auth_headers(client)
    csv_bytes = b"First Name,Last Name,URL\nJane,Smith,https://www.linkedin.com/in/janesmith"
    resp = client.post(
        "/api/import/linkedin",
        data={"file": (io.BytesIO(csv_bytes), "connections.csv")},
        content_type="multipart/form-data",
        headers=headers,
    )
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["created_people"] == 1
