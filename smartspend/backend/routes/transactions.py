from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from utils import generate_id, now_iso
from datetime import datetime

tx_bp = Blueprint("tx_bp", __name__)

@tx_bp.route("/", methods=["GET"])
def list_transactions():
    # optional query parameters: user_id, start, end, type
    q = {}
    user_id = request.args.get("user_id")
    if user_id:
        q["user_id"] = user_id
    _type = request.args.get("type")
    if _type:
        q["type"] = _type
    start = request.args.get("start")
    end = request.args.get("end")
    if start or end:
        # store occurred_at as ISO strings; we can filter lexicographically if isoformat
        if start:
            q["occurred_at"] = {"$gte": start}
        if end:
            q.setdefault("occurred_at", {})
            q["occurred_at"]["$lte"] = end

    res = list(current_app.db.transactions.find(q, {"_id":0}))
    return jsonify(res), 200

@tx_bp.route("/", methods=["POST"])
@jwt_required(optional=True)
def create_transaction():
    data = request.get_json() or {}
    # minimal validation
    if "amount" not in data or "type" not in data:
        return jsonify({"error":"amount and type required"}), 400
    tx = {
        "id": generate_id(),
        "user_id": data.get("user_id", get_jwt_identity() or data.get("user_id")),
        "type": data.get("type"),
        "amount": data.get("amount"),
        "merchant": data.get("merchant", ""),
        "category": data.get("category", ""),
        "occurred_at": data.get("occurred_at", now_iso()),
        "nwg": data.get("nwg"),
        "late_night": data.get("late_night", False),
        "mood": data.get("mood"),
        "note": data.get("note")
    }
    current_app.db.transactions.insert_one(tx)
    return jsonify(tx), 201

@tx_bp.route("/<txid>", methods=["PUT"])
@jwt_required(optional=True)
def update_transaction(txid):
    data = request.get_json() or {}
    allowed = {"amount","merchant","category","occurred_at","nwg","late_night","mood","note"}
    update = {k:v for k,v in data.items() if k in allowed}
    if not update:
        return jsonify({"error":"no updatable fields"}), 400
    current_app.db.transactions.update_one({"id":txid}, {"$set": update})
    tx = current_app.db.transactions.find_one({"id":txid}, {"_id":0})
    if not tx:
        return jsonify({"error":"not found"}), 404
    return jsonify(tx), 200

@tx_bp.route("/<txid>", methods=["DELETE"])
@jwt_required(optional=True)
def delete_transaction(txid):
    res = current_app.db.transactions.delete_one({"id": txid})
    if res.deleted_count:
        return jsonify({"deleted": txid}), 200
    return jsonify({"error":"not found"}), 404
