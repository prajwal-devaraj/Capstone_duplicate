# backend/models.py
from datetime import datetime, date
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Transaction(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    type = db.Column(db.String(20), nullable=False)  # 'expense' or 'income'
    amount = db.Column(db.Float, nullable=False)
    merchant = db.Column(db.String(120))
    nwg = db.Column(db.String(20))  # Need/Want/Guilt
    mood = db.Column(db.String(20))  # happy/neutral/stressed/impulse/sad
    late_night = db.Column(db.Boolean, default=False)
    note = db.Column(db.Text)
    occurred_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "type": self.type,
            "amount": self.amount,
            "merchant": self.merchant,
            "nwg": self.nwg,
            "mood": self.mood,
            "late_night": self.late_night,
            "note": self.note,
            "occurred_at": self.occurred_at.isoformat()
        }

class Bill(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120))
    category = db.Column(db.String(50))
    amount = db.Column(db.Float, default=0)
    cadence = db.Column(db.String(20))  # weekly/biweekly/monthly
    next_due = db.Column(db.String(20))  # ISO date
    active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "category": self.category,
            "amount": self.amount,
            "cadence": self.cadence,
            "next_due": self.next_due,
            "active": self.active,
            "created_at": self.created_at.isoformat()
        }

class Achievement(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    earned_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {"id": self.id, "name": self.name, "earned_at": self.earned_at.isoformat()}

class Goal(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    goal_days = db.Column(db.Integer, default=30)
