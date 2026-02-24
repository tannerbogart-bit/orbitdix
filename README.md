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
```

| Variable | Default | Description                  |
|----------|---------|------------------------------|
| `PORT`   | `5000`  | Port for the development server |
| `DEBUG`  | `False` | Enable Flask debug mode       |

## Run (development)

```bash
python wsgi.py
```

The `/health` endpoint will be available at `http://127.0.0.1:5000/health`.

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
├── src/
│   └── app.py          # Flask app factory
├── tests/
│   └── test_health.py  # pytest test suite
├── wsgi.py             # WSGI entrypoint
├── requirements.txt
└── .env                # local env vars (git-ignored)
```
