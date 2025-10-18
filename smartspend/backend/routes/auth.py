from flask import Blueprint, request, jsonify, current_app
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from datetime import timedelta
from utils import generate_id, now_iso

auth_bp = Blueprint("auth_bp", __name__)

# ---------------- USER REGISTER ----------------
@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json() or {}
    email = data.get("email")
    password = data.get("password")
    name = data.get("name", "")

    if not email or not password:
        return jsonify({"error": "email and password required"}), 400

    users = current_app.db.users
    if users.find_one({"email": email}):
        return jsonify({"error": "user already exists"}), 400

    uid = generate_id()
    user_obj = {
        "id": uid,
        "email": email,
        "name": name,
        "password": generate_password_hash(password),
        "created_at": now_iso()
    }
    users.insert_one(user_obj)
    user_obj.pop("password")
    return jsonify({"user": user_obj}), 201

# ---------------- USER LOGIN ----------------
@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"error": "email and password required"}), 400

    user = current_app.db.users.find_one({"email": email})
    if not user or not check_password_hash(user.get("password", ""), password):
        return jsonify({"error": "invalid credentials"}), 401

    # Create JWT token valid for 7 days
    access_token = create_access_token(
        identity=user["id"], expires_delta=timedelta(days=7)
    )
    user_data = {k: v for k, v in user.items() if k not in ["_id", "password"]}
    return jsonify({"token": access_token, "user": user_data}), 200

# ---------------- CURRENT USER ("me") ----------------
@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def me():
    uid = get_jwt_identity()
    user = current_app.db.users.find_one({"id": uid}, {"_id": 0, "password": 0})
    if not user:
        return jsonify({"error": "not found"}), 404
    return jsonify({"user": user}), 200
