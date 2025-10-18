from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from utils import generate_id, now_iso, next_due_from, parse_date
import datetime

bills_bp = Blueprint("bills_bp", __name__)

@bills_bp.route("/", methods=["GET"])
def list_bills():
    user_id = request.args.get("user_id")
    q = {}
    if user_id:
        q["user_id"] = user_id
    bills = list(current_app.db.bills.find(q, {"_id":0}))
    return jsonify(bills), 200

@bills_bp.route("/", methods=["POST"])
@jwt_required(optional=True)
def create_bill():
    data = request.get_json() or {}
    required = ["name", "amount", "cadence"]
    for r in required:
        if r not in data:
            return jsonify({"error": f"{r} required"}), 400
    bill = {
        "id": generate_id(),
        "user_id": data.get("user_id", get_jwt_identity()),
        "name": data["name"],
        "amount": data["amount"],
        "cadence": data["cadence"],
        "category": data.get("category"),
        "nwg": data.get("nwg"),
        "next_due": data.get("next_due", datetime.date.today().isoformat()),
        "status": data.get("status", "upcoming"),
        "created_at": now_iso()
    }
    current_app.db.bills.insert_one(bill)
    return jsonify(bill), 201

@bills_bp.route("/<billid>", methods=["PUT"])
@jwt_required(optional=True)
def update_bill(billid):
    data = request.get_json() or {}
    allowed = {"name","amount","cadence","category","nwg","next_due","status"}
    update = {k:v for k,v in data.items() if k in allowed}
    if not update:
        return jsonify({"error":"no updatable fields"}), 400
    current_app.db.bills.update_one({"id": billid}, {"$set": update})
    doc = current_app.db.bills.find_one({"id": billid}, {"_id":0})
    if not doc:
        return jsonify({"error":"not found"}), 404
    return jsonify(doc), 200

@bills_bp.route("/<billid>", methods=["DELETE"])
@jwt_required(optional=True)
def delete_bill(billid):
    res = current_app.db.bills.delete_one({"id": billid})
    if res.deleted_count:
        return jsonify({"deleted": billid}), 200
    return jsonify({"error":"not found"}), 404

@bills_bp.route("/<billid>/mark-paid", methods=["POST"])
@jwt_required(optional=True)
def mark_paid(billid):
    """
    Marks a bill paid:
    - creates a transaction using bill amount and name
    - advances the bill's next_due using cadence and returns updated bill and the tx
    """
    user_id = get_jwt_identity()
    bill = current_app.db.bills.find_one({"id": billid})
    if not bill:
        return jsonify({"error":"bill not found"}), 404

    # create transaction
    tx = {
        "id": generate_id(),
        "user_id": bill.get("user_id", user_id),
        "type": "expense",
        "amount": bill.get("amount"),
        "merchant": bill.get("name"),
        "category": bill.get("category"),
        "occurred_at": request.json.get("occurred_at") if request.is_json and request.json.get("occurred_at") else now_iso(),
        "nwg": bill.get("nwg"),
        "note": f"Bill payment for {bill.get('name')}"
    }
    current_app.db.transactions.insert_one(tx)

    # compute next due
    current_next = bill.get("next_due")
    cadence = bill.get("cadence", "monthly")
    new_next = next_due_from(cadence, current_next)
    current_app.db.bills.update_one({"id": billid}, {"$set": {"next_due": new_next, "status": "upcoming"}})
    new_bill = current_app.db.bills.find_one({"id": billid}, {"_id":0})
    return jsonify({"bill": new_bill, "transaction": tx}), 200
