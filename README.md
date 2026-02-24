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

| Method | Path                | Auth required | Description                              |
|--------|---------------------|---------------|------------------------------------------|
| GET    | `/health`           | No            | Health check                             |
| POST   | `/api/auth/signup`  | No            | Create tenant + user + self person       |
| POST   | `/api/auth/login`   | No            | Authenticate and receive JWT             |
| GET    | `/api/me`           | JWT           | Return current user / tenant / person    |
| POST   | `/api/intro-path`   | JWT           | BFS warm-intro path between two persons  |

## Run with a WSGI server (production)

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
│   └── intro_path.py       # /api/intro-path blueprint (BFS graph search)
├── tests/
│   ├── test_health.py      # Health endpoint tests
│   └── test_api.py         # Auth and intro-path tests
├── wsgi.py                 # WSGI entrypoint
├── requirements.txt
└── .env                    # local env vars (git-ignored)
```
