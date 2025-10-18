import os
from datetime import datetime, timedelta, date
import uuid
from dotenv import load_dotenv

load_dotenv()

def generate_id():
    return uuid.uuid4().hex

def now_iso():
    return datetime.utcnow().isoformat() + "Z"

def parse_date(s):
    # expects YYYY-MM-DD or ISO-8601; returns date object
    if not s:
        return None
    try:
        return datetime.fromisoformat(s).date()
    except Exception:
        return datetime.strptime(s, "%Y-%m-%d").date()

def next_due_from(cadence: str, current_due: str):
    """
    cadence: one of 'monthly','weekly','biweekly','yearly' or a day count 'N' (string)
    current_due: 'YYYY-MM-DD' or ISO date
    returns next_due string 'YYYY-MM-DD'
    """
    d = parse_date(current_due)
    if not d:
        d = date.today()
    if cadence == "monthly":
        month = d.month + 1
        year = d.year + (month - 1) // 12
        month = ((month - 1) % 12) + 1
        day = min(d.day, 28)  # safe default
        try:
            nd = date(year, month, d.day)
        except Exception:
            nd = date(year, month, day)
    elif cadence == "weekly":
        nd = d + timedelta(weeks=1)
    elif cadence == "biweekly":
        nd = d + timedelta(weeks=2)
    elif cadence == "yearly":
        nd = date(d.year + 1, d.month, d.day)
    else:
        # try parse integer days
        try:
            days = int(cadence)
            nd = d + timedelta(days=days)
        except Exception:
            # fallback to monthly
            month = d.month + 1
            year = d.year + (month - 1) // 12
            month = ((month - 1) % 12) + 1
            try:
                nd = date(year, month, d.day)
            except Exception:
                nd = date(year, month, 1)
    return nd.isoformat()
