import os
from flask import Flask, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from dotenv import load_dotenv
from flask_jwt_extended import JWTManager  # JWT

load_dotenv()

def create_app():
    app = Flask(__name__)
    CORS(app)

    # ---------------- CONFIG ----------------
    app.config["MONGO_URI"] = os.getenv("MONGO_URI")
    app.config["DB_NAME"] = os.getenv("DB_NAME", "smartspend")
    app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "change-me")

    # ---------------- MONGO CLIENT ----------------
    client = MongoClient(app.config["MONGO_URI"])
    db = client[app.config["DB_NAME"]]
    app.db = db

    # ---------------- JWT INITIALIZATION ----------------
    app.jwt = JWTManager(app)

    # ---------------- REGISTER ROUTES ----------------
    from routes.auth import auth_bp
    from routes.transactions import tx_bp
    from routes.bills import bills_bp
    from routes.goals import goals_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(tx_bp, url_prefix="/api/transactions")
    app.register_blueprint(bills_bp, url_prefix="/api/bills")
    app.register_blueprint(goals_bp, url_prefix="/api/goals")

    # ---------------- PING ROUTE ----------------
    @app.route("/api/ping")
    def ping():
        return jsonify({"ok": True, "msg": "SmartSpend backend alive"}), 200

    return app

if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0", port=5000, debug=True)
