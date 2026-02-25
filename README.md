# orbitdix — Backend

Flask backend using the app-factory pattern with `python-dotenv`.

## Prerequisites

- Python 3.11+
- A virtual environment tool (e.g. `venv`)

## Setup (Windows PowerShell)

```powershell
# Create and activate a virtual environment
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt
```

## Setup (Linux / macOS)

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Environment Variables

Create a `.env` file in the project root (it is git-ignored):

```
PORT=5000
DEBUG=True
DATABASE_URL=sqlite:///orbitdix.db
JWT_SECRET_KEY=change-me-in-production
```

| Variable          | Default                   | Description                          |
|-------------------|---------------------------|--------------------------------------|
| `PORT`            | `5000`                    | Port for the development server      |
| `DEBUG`           | `False`                   | Enable Flask debug mode              |
| `DATABASE_URL`    | `sqlite:///orbitdix.db`   | SQLAlchemy database URL              |
| `JWT_SECRET_KEY`  | `dev-secret-change-me`    | Secret key for JWT signing           |

## Database Migrations

This project uses [Flask-Migrate](https://flask-migrate.readthedocs.io/) (Alembic) to manage schema changes.

```bash
# Apply all pending migrations (run this on first setup and after every pull)
flask db upgrade

# (Dev only) Generate a new migration after changing src/models.py
flask db migrate -m "describe your change"
flask db upgrade
```

## Run (development)

```bash
python wsgi.py
```

Available endpoints:

| Method | Path                    | Auth required | Description                              |
|--------|-------------------------|---------------|------------------------------------------|
| GET    | `/health`               | No            | Health check                             |
| POST   | `/api/auth/signup`      | No            | Create tenant + user + self person       |
| POST   | `/api/auth/login`       | No            | Authenticate and receive JWT             |
| GET    | `/api/me`               | JWT           | Return current user / tenant / person    |
| POST   | `/api/intro-path`       | JWT           | BFS warm-intro path between two persons  |
| POST   | `/api/import/linkedin`  | JWT           | Import LinkedIn connections from CSV     |

## LinkedIn CSV Import

Import LinkedIn connections via `POST /api/import/linkedin` (JWT required).

### CSV Format

Export your connections from LinkedIn (*My Network → Manage → Export connections*) and upload the resulting CSV. The endpoint accepts:

| Header | Required | Notes |
|---|---|---|
| `First Name` | ✅ | |
| `Last Name` | ✅ | |
| `URL` | optional | LinkedIn profile URL — used as primary identity key |
| `Email Address` / `Email` | optional | Used as secondary identity key when URL is absent |
| `Company` | optional | Stored as current company on the person |
| `Position` / `Title` | optional | Stored as current position on the person |

Headers are matched case- and whitespace-insensitively.

### Upload methods

**Multipart file upload (recommended):**
```bash
curl -X POST https://<host>/api/import/linkedin \
  -H "Authorization: Bearer <token>" \
  -F "file=@connections.csv"
```

**JSON body:**
```bash
curl -X POST https://<host>/api/import/linkedin \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"csv": "First Name,Last Name,...\nJohn,Doe,..."}'
```

### Identity resolution and deduplication

Rows are matched to existing people in this order:
1. **LinkedIn URL** — normalized to `https://www.linkedin.com/in/<handle>` and matched per tenant. Re-importing the same CSV never creates duplicates.
2. **Email** — matched per tenant when no URL is provided.
3. **Name only** — if neither URL nor email is present, a new person is always created (no false-positive name merges).

### Response

```json
{
  "created_people": 42,
  "updated_people": 3,
  "edges_created": 42,
  "edges_updated": 3,
  "skipped": 1,
  "errors": [
    {"row": 5, "error": "Missing required fields: first_name and/or last_name"}
  ]
}
```

A bad row does not abort the whole import; it is counted in `skipped` and described in `errors`.



```bash
pip install gunicorn        # or waitress on Windows
gunicorn wsgi:app
```

## Test

```bash
pytest
```

## Project Layout

```
orbitdix/
├── migrations/             # Alembic migration scripts
├── src/
│   ├── app.py              # Flask app factory
│   ├── models.py           # SQLAlchemy models (Tenant, User, Person, Edge)
│   ├── auth.py             # /api/auth/* and /api/me blueprints
│   ├── intro_path.py       # /api/intro-path blueprint (BFS graph search)
│   └── linkedin_import.py  # /api/import/linkedin blueprint (LinkedIn CSV import)
├── tests/
│   ├── test_health.py      # Health endpoint tests
│   ├── test_api.py         # Auth and intro-path tests
│   └── test_linkedin_import.py  # LinkedIn CSV import tests
├── wsgi.py                 # WSGI entrypoint
├── requirements.txt
└── .env                    # local env vars (git-ignored)
```
