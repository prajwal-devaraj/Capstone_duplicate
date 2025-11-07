# backend/app.py
from datetime import datetime, timedelta, date
import os
from flask import Flask, jsonify, request
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy import func

from models import db, User, Transaction, Bill, Achievement, Goal
from ml import predict_next7_burn, compute_runway

def create_app():
    app = Flask(__name__)
    # ---- CORS (allow Vite dev server and all by default) ----
    CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)

    # ---- Config ----
    app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL", "sqlite:///smartspend.db")
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    db.init_app(app)

    with app.app_context():
        db.create_all()
        # ensure a default goal row exists for user 1
        if not Goal.query.first():
            g = Goal(goal_days=30)
            db.session.add(g)
            db.session.commit()

    @app.get("/")
    def root():
        return jsonify({"message": "SmartSpend API is running!"})

    # ---------------------- AUTH ----------------------
    @app.post("/api/signup")
    def signup():
        data = request.get_json(force=True)
        name = data.get("name")
        email = data.get("email")
        password = data.get("password")
        if not all([name, email, password]):
            return jsonify({"error": "Missing fields"}), 400
        if User.query.filter_by(email=email).first():
            return jsonify({"error": "Email already registered"}), 400
        hashed = generate_password_hash(password)
        user = User(name=name, email=email, password_hash=hashed)
        db.session.add(user)
        db.session.commit()
        return jsonify({"message": "User created", "user": {"id": user.id, "name": user.name, "email": user.email}}), 201

    @app.post("/api/login")
    def login():
        data = request.get_json(force=True)
        email = data.get("email")
        password = data.get("password")
        user = User.query.filter_by(email=email).first()
        if not user or not check_password_hash(user.password_hash, password):
            return jsonify({"error": "Invalid credentials"}), 401
        return jsonify({"message": "Login successful", "user": {"id": user.id, "name": user.name, "email": user.email}})

    # ---------------------- PROFILE ----------------------
    @app.get("/api/profile")
    def get_profile():
        # single-user demo
        user = User.query.first()
        if not user:
            return jsonify({"error": "No user"}), 404
        return jsonify({"id": user.id, "name": user.name, "email": user.email, "created_at": user.created_at.isoformat()})

    @app.put("/api/profile")
    def update_profile():
        user = User.query.first()
        if not user:
            return jsonify({"error": "No user"}), 404
        data = request.get_json(force=True)
        user.name = data.get("name", user.name)
        new_email = data.get("email")
        if new_email and new_email != user.email:
            if User.query.filter_by(email=new_email).first():
                return jsonify({"error": "Email already in use"}), 400
            user.email = new_email
        if data.get("password"):
            user.password_hash = generate_password_hash(data["password"])
        db.session.commit()
        return jsonify({"message": "Updated"})

    # ---------------------- DASHBOARD SNAPSHOT ----------------------
    @app.get("/api/dashboard")
    def dashboard():
        # total balance = sum(income) - sum(expense)
        inc = db.session.query(func.coalesce(func.sum(Transaction.amount), 0)).filter(Transaction.type=="income").scalar()
        exp = db.session.query(func.coalesce(func.sum(Transaction.amount), 0)).filter(Transaction.type=="expense").scalar()
        balance = float(inc) - float(exp)
        # Burn rate = average daily expense in last N days (default 30)
        days = int(request.args.get("days", 30))
        since = datetime.utcnow() - timedelta(days=days)
        day_expenses = db.session.query(func.date(Transaction.occurred_at), func.sum(Transaction.amount))\
            .filter(Transaction.type=="expense", Transaction.occurred_at>=since)\
            .group_by(func.date(Transaction.occurred_at)).all()
        burn_rate = round((sum([float(s or 0) for _, s in day_expenses]) / max(len(day_expenses), 1)), 2)

        goal = Goal.query.first()
        current_regular, power_save = compute_runway(balance, burn_rate, goal.goal_days if goal else 30)
        next7 = predict_next7_burn()

        return jsonify({
            "balance": round(balance, 2),
            "days_left_regular": current_regular,
            "days_left_power_save": power_save,
            "burn_rate": burn_rate,
            "next7_burn": next7
        })

    # ---------------------- TRANSACTIONS ----------------------
    @app.get("/api/transactions")
    def list_tx():
        q = Transaction.query.order_by(Transaction.occurred_at.desc()).all()
        return jsonify([t.to_dict() for t in q])

    @app.post("/api/transactions")
    def add_tx():
        data = request.get_json(force=True)
        t = Transaction(
            type=data.get("type", "expense"),
            amount=float(data.get("amount", 0)),
            merchant=data.get("merchant"),
            nwg=data.get("nwg"),
            mood=data.get("mood"),
            late_night=data.get("late_night", False),
            note=data.get("note"),
            occurred_at=datetime.fromisoformat(data.get("occurred_at")) if data.get("occurred_at") else datetime.utcnow()
        )
        db.session.add(t)
        db.session.commit()
        return jsonify({"message": "created", "id": t.id}), 201

    @app.delete("/api/transactions/<int:tid>")
    def delete_tx(tid):
        t = Transaction.query.get(tid)
        if not t:
            return jsonify({"error": "Not found"}), 404
        db.session.delete(t)
        db.session.commit()
        return jsonify({"message": "deleted"})

    # ---------------------- BILLS ----------------------
    @app.get("/api/bills")
    def list_bills():
        return jsonify([b.to_dict() for b in Bill.query.order_by(Bill.next_due.asc()).all()])

    @app.post("/api/bills")
    def add_bill():
        data = request.get_json(force=True)
        b = Bill(
            name=data.get("name", data.get("category", "Bill")),
            category=data.get("category", "Other"),
            amount=float(data.get("amount", 0)),
            cadence=data.get("cadence", "monthly"),
            next_due=data.get("next_due"),
            active=bool(data.get("active", True))
        )
        db.session.add(b)
        db.session.commit()
        return jsonify({"message": "bill created", "id": b.id}), 201

    @app.put("/api/bills/<int:bid>")
    def update_bill(bid):
        b = Bill.query.get(bid)
        if not b:
            return jsonify({"error": "Not found"}), 404
        data = request.get_json(force=True)
        for f in ["name","category","amount","cadence","next_due","active"]:
            if f in data:
                setattr(b, f, data[f])
        db.session.commit()
        return jsonify({"message": "updated"})

    @app.delete("/api/bills/<int:bid>")
    def delete_bill(bid):
        b = Bill.query.get(bid)
        if not b:
            return jsonify({"error": "Not found"}), 404
        db.session.delete(b)
        db.session.commit()
        return jsonify({"message": "deleted"})

    # ---------------------- GOALS & ACHIEVEMENTS ----------------------
    @app.get("/api/goals")
    def get_goal():
        g = Goal.query.first()
        return jsonify({"goal_days": g.goal_days if g else 30})

    @app.put("/api/goals")
    def set_goal():
        g = Goal.query.first()
        if not g:
            g = Goal(goal_days=30)
            db.session.add(g)
        data = request.get_json(force=True)
        g.goal_days = int(data.get("goal_days", g.goal_days))
        db.session.commit()
        return jsonify({"message": "goal updated"})

    @app.get("/api/achievements")
    def get_achievements():
        ach = Achievement.query.order_by(Achievement.earned_at.desc()).all()
        return jsonify([a.to_dict() for a in ach])

    @app.post("/api/seed")
    def seed():
        # Simple seed to help the UI look alive
        if not User.query.first():
            u = User(name="Demo", email="demo@example.com", password_hash=generate_password_hash("Demo@1234"))
            db.session.add(u)
        # some transactions
        if not Transaction.query.first():
            today = datetime.utcnow().date()
            for i in range(1, 11):
                t = Transaction(
                    type="expense",
                    amount=10 + i*3,
                    merchant="Cafe",
                    nwg="Want" if i%3==0 else "Need",
                    mood="happy" if i%2==0 else "neutral",
                    late_night=(i%5==0),
                    occurred_at=datetime.combine(today - timedelta(days=10-i), datetime.min.time()) + timedelta(hours=10+i)
                )
                db.session.add(t)
        if not Bill.query.first():
            db.session.add(Bill(name="Rent", category="Need", amount=800, cadence="monthly", next_due=(date.today().replace(day=1) + timedelta(days=30)).isoformat(), active=True))
        if not Achievement.query.first():
            db.session.add(Achievement(name="7-day streak"))
        db.session.commit()
        return jsonify({"message": "seeded"})

    return app

app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", 5000)), debug=True)
