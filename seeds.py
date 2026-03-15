"""
seeds.py — populate a fresh OrbitSix database with realistic test data.

Run with:
    python seeds.py

Creates:
    1 Tenant   — "Acme Corp"
    1 User     — jordan@acme.com / password: password123
    10 People  — the user's self-person + 9 contacts
    15 Edges   — directed connections forming a connected graph for BFS testing

Path-finding sanity check is printed at the end.
"""
import sys
from collections import deque

from werkzeug.security import generate_password_hash

from src.app import create_app
from src.db import db
from src.models import Edge, Person, Tenant, User


# ── Seed data ─────────────────────────────────────────────────────────────────

TENANT_NAME = "Acme Corp"

SEED_USER = {
    "email": "jordan@acme.com",
    "password": "password123",
    "role": "owner",
    "first_name": "Jordan",
    "last_name": "Blake",
}

SEED_CONTACTS = [
    {"first_name": "Priya",   "last_name": "Sharma",   "email": "priya@techflow.io",      "linkedin_url": "https://linkedin.com/in/priya-sharma"},
    {"first_name": "Marcus",  "last_name": "Chen",     "email": "marcus@launchpadai.com",  "linkedin_url": "https://linkedin.com/in/marcus-chen"},
    {"first_name": "Sofia",   "last_name": "Reyes",    "email": "sofia@scaleup.co",        "linkedin_url": "https://linkedin.com/in/sofia-reyes"},
    {"first_name": "Tobias",  "last_name": "Muller",   "email": "tobias@buildfast.dev",    "linkedin_url": "https://linkedin.com/in/tobias-muller"},
    {"first_name": "Aisha",   "last_name": "Okonkwo",  "email": "aisha@craftstudio.io",    "linkedin_url": "https://linkedin.com/in/aisha-okonkwo"},
    {"first_name": "James",   "last_name": "Park",     "email": "james@horizonvc.com",     "linkedin_url": "https://linkedin.com/in/james-park"},
    {"first_name": "Elena",   "last_name": "Vasquez",  "email": "elena@growthos.com",      "linkedin_url": "https://linkedin.com/in/elena-vasquez"},
    {"first_name": "Noel",    "last_name": "Adeyemi",  "email": "noel@datastack.io",       "linkedin_url": "https://linkedin.com/in/noel-adeyemi"},
    {"first_name": "Cassidy", "last_name": "Wells",    "email": "cassidy@firstround.com",  "linkedin_url": "https://linkedin.com/in/cassidy-wells"},
]

# Edges: (from_index, to_index) into the persons list.
# persons[0] = Jordan (self), persons[1..9] = contacts above
# Graph is stored directed; BFS treats it as undirected by adding both directions.
SEED_EDGES = [
    (0, 1),  # Jordan  → Priya
    (0, 4),  # Jordan  → Tobias
    (1, 2),  # Priya   → Marcus
    (1, 6),  # Priya   → James
    (2, 3),  # Marcus  → Sofia
    (2, 9),  # Marcus  → Cassidy
    (3, 5),  # Sofia   → Aisha
    (4, 7),  # Tobias  → Elena
    (5, 8),  # Aisha   → Noel
    (6, 9),  # James   → Cassidy
    (7, 8),  # Elena   → Noel
    (8, 9),  # Noel    → Cassidy
    (1, 3),  # Priya   → Sofia    (shortcut)
    (2, 6),  # Marcus  → James
    (4, 5),  # Tobias  → Aisha
]


# ── BFS helper (for sanity-check output) ──────────────────────────────────────

def bfs(edges_list, from_id, to_id):
    graph = {}
    for e in edges_list:
        graph.setdefault(e.from_person_id, []).append(e.to_person_id)
        graph.setdefault(e.to_person_id,   []).append(e.from_person_id)

    queue, visited = deque([[from_id]]), {from_id}
    while queue:
        path = queue.popleft()
        node = path[-1]
        for nb in graph.get(node, []):
            if nb == to_id:
                return path + [nb]
            if nb not in visited:
                visited.add(nb)
                queue.append(path + [nb])
    return None


# ── Main ──────────────────────────────────────────────────────────────────────

def seed():
    app = create_app()
    with app.app_context():
        # Bail if already seeded
        if Tenant.query.filter_by(name=TENANT_NAME).first():
            print(f"[seeds] Tenant '{TENANT_NAME}' already exists — skipping.")
            return

        print("[seeds] Creating tenant …")
        tenant = Tenant(name=TENANT_NAME)
        db.session.add(tenant)
        db.session.flush()

        print("[seeds] Creating user …")
        user = User(
            tenant_id=tenant.id,
            email=SEED_USER["email"],
            password_hash=generate_password_hash(SEED_USER["password"]),
            role=SEED_USER["role"],
        )
        db.session.add(user)
        db.session.flush()

        print("[seeds] Creating 10 people …")
        persons = []

        # Self-person (index 0)
        self_person = Person(
            tenant_id=tenant.id,
            user_id=user.id,
            is_self=True,
            first_name=SEED_USER["first_name"],
            last_name=SEED_USER["last_name"],
            email=SEED_USER["email"],
        )
        db.session.add(self_person)
        persons.append(self_person)

        # Contacts (indices 1-9)
        for c in SEED_CONTACTS:
            p = Person(
                tenant_id=tenant.id,
                user_id=None,
                is_self=False,
                **c,
            )
            db.session.add(p)
            persons.append(p)

        db.session.flush()  # get IDs before creating edges

        print("[seeds] Creating 15 edges …")
        edges = []
        for from_i, to_i in SEED_EDGES:
            e = Edge(
                tenant_id=tenant.id,
                from_person_id=persons[from_i].id,
                to_person_id=persons[to_i].id,
                relationship_type="linkedin",
                strength=3,
            )
            db.session.add(e)
            edges.append(e)

        db.session.commit()
        print(f"[seeds] Done. tenant_id={tenant.id}, user_id={user.id}, persons={len(persons)}, edges={len(edges)}")

        # ── Sanity check: BFS path from Jordan to Cassidy ─────────────────
        db.session.refresh(persons[0])
        db.session.refresh(persons[-1])
        all_edges = Edge.query.filter_by(tenant_id=tenant.id).all()
        path = bfs(all_edges, persons[0].id, persons[-1].id)
        if path:
            names = [f"{persons[p_id - persons[0].id].first_name}" if 0 <= p_id - persons[0].id < len(persons) else str(p_id) for p_id in path]
            # Simpler: look up by id
            id_to_name = {p.id: p.first_name for p in persons}
            chain = " → ".join(id_to_name.get(pid, str(pid)) for pid in path)
            print(f"[seeds] BFS Jordan->Cassidy: {chain} ({len(path)-1} degrees)")
        else:
            print("[seeds] WARNING: no path found between Jordan and Cassidy — check edges.")


if __name__ == "__main__":
    seed()
