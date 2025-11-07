# backend/ml.py
from datetime import datetime, timedelta
from sqlalchemy import func
from models import db, Transaction

def predict_next7_burn():
    """Simple moving-average baseline: mean of last 7 daily expenses as 'next 7 days burn rate'"""
    since = datetime.utcnow() - timedelta(days=7)
    day_expenses = db.session.query(func.date(Transaction.occurred_at), func.sum(Transaction.amount))\
        .filter(Transaction.type=="expense", Transaction.occurred_at>=since)\
        .group_by(func.date(Transaction.occurred_at)).all()
    if not day_expenses:
        return 0.0
    avg = sum([float(v or 0) for _, v in day_expenses]) / len(day_expenses)
    return round(avg, 2)

def compute_runway(balance: float, burn_rate: float, goal_days: int):
    """Compute current runway and a hypothetical power-save runway (+30% improvement)."""
    if burn_rate <= 0:
        current = goal_days
        power = goal_days + 10
    else:
        current = int(balance / burn_rate) if balance > 0 else 0
        power = int(balance / (burn_rate * 0.7)) if balance > 0 else 0  # 30% saving
    return current, power
