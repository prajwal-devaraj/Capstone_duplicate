from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from utils import generate_id, now_iso

goals_bp = Blueprint("goals_bp", __name__)

@goals_bp.route("/", methods=["GET"])
def list_goals():
    user_id = request.args.get("user_id")
    q = {}
    if user_id:
        q["user_id"] = user_id
    goals = list(current_app.db.goals.find(q, {"_id":0}))
    return jsonify(goals), 200

@goals_bp.route("/", methods=["POST"])
@jwt_required(optional=True)
def create_goal():
    data = request.get_json() or {}
    if "title" not in data or "target_amount" not in data:
        return jsonify({"error":"title and target_amount required"}), 400
    g = {
        "id": generate_id(),
        "user_id": data.get("user_id", get_jwt_identity()),
        "title": data["title"],
        "target_amount": data["target_amount"],
        "current_amount": data.get("current_amount", 0),
        "currency": data.get("currency", "USD"),
        "created_at": now_iso()
    }
    current_app.db.goals.insert_one(g)
    return jsonify(g), 201

@goals_bp.route("/<gid>", methods=["PUT"])
@jwt_required(optional=True)
def update_goal(gid):
    data = request.get_json() or {}
    allowed = {"title","target_amount","current_amount","currency"}
    update = {k:v for k,v in data.items() if k in allowed}
    if not update:
        return jsonify({"error":"no updatable fields"}), 400
    current_app.db.goals.update_one({"id":gid}, {"$set": update})
    doc = current_app.db.goals.find_one({"id":gid}, {"_id":0})
    if not doc:
        return jsonify({"error":"not found"}), 404
    return jsonify(doc), 200

@goals_bp.route("/<gid>", methods=["DELETE"])
@jwt_required(optional=True)
def delete_goal(gid):
    res = current_app.db.goals.delete_one({"id": gid})
    if res.deleted_count:
        return jsonify({"deleted": gid}), 200
    return jsonify({"error":"not found"}), 404

@goals_bp.route("/achievements", methods=["GET"])
def achievements():
    # simple computed endpoint: returns mock achievements or derived ones
    res = list(current_app.db.achievements.find({}, {"_id":0}))
    return jsonify(res), 200
