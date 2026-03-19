#!/bin/sh
set -e

echo "Running database migrations..."
flask --app src.app:create_app db upgrade

echo "Starting gunicorn..."
exec gunicorn \
  --bind "0.0.0.0:${PORT:-8000}" \
  --workers "${WEB_CONCURRENCY:-2}" \
  --timeout 120 \
  --access-logfile - \
  --error-logfile - \
  wsgi:app
