from collections import deque

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from src.models import Edge, Person, db

bp = Blueprint("intro_path", __name__)


@bp.post("/api/intro-path")
@jwt_required()
def intro_path():
    user_id = get_jwt_identity()
    data = request.get_json(silent=True) or {}
    to_person_id = data.get("to_person_id")

    if to_person_id is None:
        return jsonify(error="to_person_id is required"), 400

    # Resolve current user's self person
    self_person = Person.query.filter_by(user_id=user_id, is_self=True).first()
    if self_person is None:
        return jsonify(error="Self person not found for current user"), 404

    start_id = self_person.id
    target_id = int(to_person_id)

    if start_id == target_id:
        return jsonify(path=[start_id])

    # Confirm target exists in same tenant
    target = Person.query.filter_by(
        id=target_id, tenant_id=self_person.tenant_id
    ).first()
    if target is None:
        return jsonify(error="Target person not found"), 404

    # Build adjacency list from edges scoped to the tenant (undirected)
    edges = Edge.query.filter_by(tenant_id=self_person.tenant_id).all()
    adjacency: dict[int, list[int]] = {}
    for edge in edges:
        adjacency.setdefault(edge.from_person_id, []).append(edge.to_person_id)
        adjacency.setdefault(edge.to_person_id, []).append(edge.from_person_id)

    # BFS
    visited = {start_id}
    queue: deque[list[int]] = deque([[start_id]])

    while queue:
        path = queue.popleft()
        current = path[-1]
        for neighbor in adjacency.get(current, []):
            if neighbor == target_id:
                return jsonify(path=path + [neighbor])
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append(path + [neighbor])

    return jsonify(error="No path found"), 404
