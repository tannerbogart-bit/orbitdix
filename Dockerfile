# ── Stage 1: Build React frontend ────────────────────────────────────────────
FROM node:20-alpine AS frontend-build

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --prefer-offline

COPY frontend/ ./
RUN npm run build


# ── Stage 2: Python backend ───────────────────────────────────────────────────
FROM python:3.11-slim

WORKDIR /app

# System deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
  && rm -rf /var/lib/apt/lists/*

# Python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# App source
COPY . .

# Built frontend from stage 1
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

# Make startup script executable
RUN chmod +x start.sh

EXPOSE 8000

CMD ["./start.sh"]
