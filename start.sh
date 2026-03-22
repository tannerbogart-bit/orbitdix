#!/bin/sh
set -e

export FLASK_APP=src.app:create_app

echo "Running database migrations..."
flask db upgrade

echo "Starting gunicorn..."
exec gunicorn \
  --bind "0.0.0.0:${PORT:-8000}" \
  --workers "${WEB_CONCURRENCY:-2}" \
  --worker-class sync \
  --timeout 120 \
  --keep-alive 5 \
  --access-logfile - \
  --error-logfile - \
  wsgi:app
