from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from passlib.hash import bcrypt
from pymongo import MongoClient, ASCENDING, DESCENDING
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta
import os
from bson import ObjectId

# ---------------- Config ----------------
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "smartspend")
JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret")
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "*")
TOKEN_SALT = os.getenv("TOKEN_SALT", "verify-email")

app = Flask(__name__)
CORS(app, supports_credentials=True, origins=[FRONTEND_ORIGIN] if FRONTEND_ORIGIN!="*" else "*")
app.config["JWT_SECRET_KEY"] = JWT_SECRET
jwt = JWTManager(app)

client = MongoClient(MONGO_URI)
db = client[DB_NAME]

# ---------------- Collections ----------------
users = db.users
income = db.income
transactions = db.transactions
expenses = db.expenses
bills = db.bills
insights = db.insights
goals = db.goals
notifications = db.notifications
achievements = db.achievements
forecast = db.forecast_groundtruth
flags = db.flag_patterns
dashboard = db.dashboard
current_balance = db.current_balance
perday = db.perday
month = db.month
accumulate = db.accumulate

# Indexes
users.create_index([("email", ASCENDING)], unique=True)
transactions.create_index([("user_id", ASCENDING), ("created_at", DESCENDING)])
expenses.create_index([("transaction_id", ASCENDING)])
bills.create_index([("user_id", ASCENDING), ("status", ASCENDING), ("next_due", ASCENDING)])

ts = URLSafeTimedSerializer(JWT_SECRET)
now = lambda : datetime.utcnow()

# ---------------- Helpers ----------------
def send_verification_link(email, token):
    # Dev mode: prints link to console. Replace with SMTP to send emails.
    verify_url = f"/auth/verify/{token}"
    print(f"[VERIFY] Send this link to {email}: {verify_url}")
    return verify_url

def compute_current_balance(user_id):
    inc_sum = sum(float(x.get("amt",0)) for x in income.find({"user_id":user_id}))
    exp_sum = sum(float(x.get("amt",0)) for x in expenses.find({"user_id":user_id}))
    return inc_sum - exp_sum

def compute_burn_rate(user_id, days=30):
    since = now() - timedelta(days=days)
    totals = {}
    for e in expenses.find({"user_id":user_id}):
        try:
            d = datetime.fromisoformat(e.get("date")).date()
        except Exception:
            continue
        if d >= since.date():
            key = d.isoformat()
            totals[key] = totals.get(key, 0.0) + float(e.get("amt",0))
    if not totals: return 0.0
    return sum(totals.values()) / len(totals)

def days_left(user_id):
    br = compute_burn_rate(user_id)
    bal = compute_current_balance(user_id)
    return 365 if br <= 0 else round(bal/br, 2)

def next_due_from(cadence, date_iso):
    d = datetime.fromisoformat(date_iso).date()
    if cadence == "weekly": return (d + timedelta(days=7)).isoformat()
    if cadence == "biweekly": return (d + timedelta(days=14)).isoformat()
    if cadence == "monthly": return (d + relativedelta(months=1)).isoformat()
    return (d + relativedelta(months=1)).isoformat()

# ---------------- Auth ----------------
@app.post("/auth/signup_page1")
def signup_page1():
    data = request.get_json()
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").lower().strip()
    password = data.get("password") or ""
    if not (name and email and password): return jsonify({"error":"Missing fields"}), 400
    if users.find_one({"email":email}): return jsonify({"error":"Email exists"}), 409
    users.insert_one({"name":name,"email":email,"password":bcrypt.hash(password),"verified":False,"created_at":now(),"updated_at":now()})
    return jsonify({"ok":True})

@app.post("/auth/signup_page2_income")
def signup_page2_income():
    data = request.get_json()
    email = (data.get("email") or "").lower().strip()
    u = users.find_one({"email":email})
    if not u: return jsonify({"error":"User not found"}), 404
    income.insert_one({
        "user_id": str(u["_id"]),
        "amt": float(data.get("amt",0)),
        "pay_frequency": data.get("pay_frequency","monthly"),
        "weekly_days": data.get("weekly_days"),
        "anchor_biweekly": data.get("anchor_biweekly"),
        "monthly_date": data.get("monthly_date"),
        "created_at": now()
    })
    token = ts.dumps(email, salt=TOKEN_SALT)
    link = send_verification_link(email, token)
    return jsonify({"ok":True, "verify_link": link})

@app.get("/auth/verify/<token>")
def verify_email(token):
    try:
        email = ts.loads(token, salt=TOKEN_SALT, max_age=60*60*24*7)
    except SignatureExpired:
        return jsonify({"error":"Token expired"}), 400
    except BadSignature:
        return jsonify({"error":"Bad token"}), 400
    users.update_one({"email":email}, {"$set":{"verified":True, "updated_at":now()}})
    return jsonify({"ok":True, "message":"Email verified. You can login now."})

@app.post("/auth/login")
def login():
    data = request.get_json()
    email = (data.get("email") or "").lower().strip()
    password = data.get("password") or ""
    u = users.find_one({"email":email})
    if not u or not bcrypt.verify(password, u["password"]):
        return jsonify({"error":"Invalid credentials"}), 401
    if not u.get("verified"):
        return jsonify({"error":"Account not verified"}), 403
    token = create_access_token(identity=str(u["_id"]), additional_claims={"email": email})
    return jsonify({"ok":True, "token":token, "user":{"id":str(u["_id"]), "name":u["name"], "email":u["email"]}})

# ---------------- Dashboard ----------------
@app.get("/dashboard/summary")
@jwt_required()
def dashboard_summary():
    user_id = get_jwt_identity()
    bal = compute_current_balance(user_id)
    br = compute_burn_rate(user_id)
    dl = days_left(user_id)
    today = now().date(); next7 = today + timedelta(days=7)
    ups = list(bills.find({"user_id":user_id, "status":"active", "next_due":{"$gte": today.isoformat(), "$lte": next7.isoformat()}}, {"_id":0}).limit(10))
    cat_map = {"need":0.0,"wants":0.0,"guilts":0.0,"need_recurrence":0.0}
    for e in expenses.find({"user_id":user_id}):
        cat = e.get("allele_frequency","need")
        cat_map[cat] = cat_map.get(cat,0.0) + float(e.get("amt",0))
    return jsonify({"current_balance": bal, "burn_rate": br, "days_left": dl, "upcoming_bills": ups, "nwg": cat_map})

# ---------------- Transactions ----------------
@app.post("/transactions")
@jwt_required()
def add_transaction():
    user_id = get_jwt_identity()
    data = request.get_json()
    t = {
        "user_id": user_id,
        "income_id": data.get("income_id"),
        "expense_id": data.get("expense_id"),
        "merchant": data.get("merchant"),
        "created_at": now()
    }
    res = transactions.insert_one(t)
    t["id"] = str(res.inserted_id)
    return jsonify({"ok":True, "transaction": t})

@app.get("/transactions")
@jwt_required()
def list_transactions():
    user_id = get_jwt_identity()
    merchant = request.args.get("merchant")
    category = request.args.get("category")
    mood = request.args.get("mood")
    amt_min = request.args.get("amt_min", type=float)
    amt_max = request.args.get("amt_max", type=float)
    range_days = request.args.get("range", default="all")
    sort = request.args.get("sort")

    exp_map = {str(e["_id"]): e for e in expenses.find({"user_id":user_id})}
    items = []
    for t in transactions.find({"user_id":user_id}):
        exp = None
        if t.get("expense_id"):
            exp = exp_map.get(str(t.get("expense_id")))
        row = {
            "id": str(t["_id"]), "created_at": t.get("created_at"),
            "merchant": (exp or {}).get("merchant"),
            "category": (exp or {}).get("allele_frequency"),
            "mood": (exp or {}).get("mood"),
            "amt": float((exp or {}).get("amt",0))
        }
        items.append(row)

    def row_dt(row):
        ca = row.get("created_at")
        if isinstance(ca, str):
            try: return datetime.fromisoformat(ca.replace("Z",""))
            except: return now()
        return ca or now()

    def in_range(row):
        if range_days == "all": return True
        days = {"7days":7, "30days":30, "90days":90}.get(range_days, None)
        if not days: return True
        return (now() - row_dt(row)).days <= days

    filtered = []
    for row in items:
        if merchant and (not (row.get("merchant") or "").lower().startswith(merchant.lower())): continue
        if category and row.get("category")!=category: continue
        if mood and row.get("mood")!=mood: continue
        if amt_min is not None and row.get("amt",0)<amt_min: continue
        if amt_max is not None and row.get("amt",0)>amt_max: continue
        if not in_range(row): continue
        filtered.append(row)

    if sort == "date_up":
        filtered.sort(key=row_dt)
    elif sort == "date_down":
        filtered.sort(key=row_dt, reverse=True)
    elif sort == "amt_up":
        filtered.sort(key=lambda x: x.get("amt",0))
    elif sort == "amt_down":
        filtered.sort(key=lambda x: x.get("amt",0), reverse=True)

    month_start = now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    month_txn = [r for r in filtered if row_dt(r) >= month_start]
    income_sum = sum(x.get("amt",0) for x in month_txn if x.get("category") is None)
    expense_sum = sum(x.get("amt",0) for x in month_txn if x.get("category") in {"need","need_recurrence","wants","guilts"})
    return jsonify({"ok":True, "items": filtered, "rollup": {"income": income_sum, "expense": expense_sum, "net": income_sum - expense_sum}})

# ---------------- Income & Expenses ----------------
@app.post("/income")
@jwt_required()
def add_income():
    user_id = get_jwt_identity()
    data = request.get_json()
    inc = {
        "user_id": user_id,
        "amt": float(data.get("amt",0)),
        "pay_frequency": data.get("pay_frequency","others"),
        "weekly_days": data.get("weekly_days"),
        "anchor_biweekly": data.get("anchor_biweekly"),
        "monthly_date": data.get("monthly_date"),
        "other_note": data.get("other_note"),
        "created_at": now()
    }
    res = income.insert_one(inc)
    return jsonify({"ok":True, "id": str(res.inserted_id)})

@app.post("/expenses")
@jwt_required()
def add_expense():
    user_id = get_jwt_identity()
    data = request.get_json()
    allele = data.get("category")  # need / wants / guilts
    is_rec = bool(data.get("need_recurrence", False))
    e = {
        "user_id": user_id,
        "transaction_id": data.get("transaction_id"),
        "amt": float(data.get("amt",0)),
        "allele_frequency": "need_recurrence" if allele=="need" and is_rec else allele,
        "date": data.get("date", now().date().isoformat()),
        "time": data.get("time", now().strftime("%H:%M")),
        "merchant": data.get("merchant",""),
        "mood": data.get("mood","neutral"),
        "created_at": now(),
    }
    res = expenses.insert_one(e)

    if e["allele_frequency"] == "need_recurrence":
        cadence = data.get("cadence","monthly")
        cur_date = datetime.fromisoformat(e["date"]).date()
        if cadence == "weekly":
            next_due = (cur_date + timedelta(days=7)).isoformat()
        elif cadence == "biweekly":
            next_due = (cur_date + timedelta(days=14)).isoformat()
        elif cadence == "monthly":
            next_due = (cur_date + relativedelta(months=1)).isoformat()
        else:
            next_due = (cur_date + relativedelta(months=1)).isoformat()
        bills.insert_one({
            "user_id": user_id,
            "name": data.get("bill_name","Bill"),
            "amt": e["amt"],
            "category": data.get("bill_category","Misc"),
            "cadence": cadence,
            "status": "active",
            "last_paid": e["date"],
            "next_due": next_due,
            "notes": data.get("note",""),
            "created_at": now()
        })

    return jsonify({"ok":True, "id": str(res.inserted_id)})

# ---------------- Bills ----------------
@app.get("/bills")
@jwt_required()
def list_bills():
    user_id = get_jwt_identity()
    q = {"user_id": user_id}
    search = request.args.get("search")
    status = request.args.get("status")
    cadence = request.args.get("cadence")
    due = request.args.get("due")  # today, next7, overdue
    category = request.args.get("category")

    if search: q["name"] = {"$regex": f"^{search}", "$options":"i"}
    if status: q["status"] = status
    if cadence: q["cadence"] = cadence
    if category: q["category"] = category

    today = datetime.utcnow().date()
    if due == "today":
        q["next_due"] = today.isoformat()
    elif due == "next7":
        q["next_due"] = {"$gte": today.isoformat(), "$lte": (today+timedelta(days=7)).isoformat()}
    elif due == "overdue":
        q["next_due"] = {"$lt": today.isoformat()}

    docs = []
    for b in bills.find(q).sort("next_due", ASCENDING):
        d = {k:(str(v) if k=="_id" else v) for k,v in b.items()}
        d["id"] = d.pop("_id")
        docs.append(d)
    total_this_month = sum(b.get("amt",0) for b in bills.find({"user_id":user_id, "status":"active"}))
    next7 = sum(b.get("amt",0) for b in bills.find({"user_id":user_id, "status":"active", "next_due":{"$lte": (today+timedelta(days=7)).isoformat()}}))
    active_count = bills.count_documents({"user_id":user_id, "status":"active"})
    return jsonify({"ok":True, "items":docs, "summary":{"total_this_month":total_this_month, "next7":next7, "active":active_count}})

@app.patch("/bills/<bid>")
@jwt_required()
def update_bill(bid):
    user_id = get_jwt_identity()
    data = request.get_json()
    try:
        q = {"_id": ObjectId(bid), "user_id": user_id}
    except Exception:
        return jsonify({"error":"Invalid bill id"}), 400
    upd = {k:v for k,v in data.items() if k in ["name","amt","category","cadence","next_due","status","notes"]}
    if not upd: return jsonify({"error":"No fields to update"}), 400
    bills.update_one(q, {"$set":upd})
    return jsonify({"ok":True})

@app.delete("/bills/<bid>")
@jwt_required()
def delete_bill(bid):
    try:
        bills.delete_one({"_id": ObjectId(bid)})
        return jsonify({"ok":True})
    except Exception:
        return jsonify({"error":"Invalid bill id"}), 400

# ---------------- ML Stub ----------------
@app.get("/ml/next7_burnrate")
@jwt_required()
def ml_next7():
    user_id = get_jwt_identity()
    day_map = {}
    for e in expenses.find({"user_id":user_id}):
        day = e.get("date")
        if not day: continue
        day_map[day] = day_map.get(day, 0.0) + float(e.get("amt",0))
    days = sorted(day_map.keys())[-7:]
    avg = (sum(day_map[d] for d in days)/len(days)) if days else 0.0
    proj = [round(avg,2) for _ in range(7)]
    return jsonify({"ok":True, "avg_last7": round(avg,2), "projection_next7": proj})

@app.get("/health")
def health():
    return {"ok":True, "time": datetime.utcnow().isoformat()}

if __name__ == "__main__":
    app.run(host=os.getenv("APP_HOST","0.0.0.0"), port=int(os.getenv("APP_PORT","5000")), debug=os.getenv("APP_DEBUG","true")=="true")
