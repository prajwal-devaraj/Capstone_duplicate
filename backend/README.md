# SmartSpend Backend (Flask + MongoDB)

A production-style starter backend implementing your SmartSpend flows.

## ✅ Features
- Two-step signup with **email verification** (link printed to console)
- **JWT auth**: login required for protected routes
- **MongoDB** data model matching SmartSpend
- Dashboard metrics: current balance, burn rate, days left, upcoming bills, NWG split
- Transactions + filters, Bills CRUD, simple ML projection (next 7 days burn rate)
- CORS configured for local static frontend

## 🚀 Quickstart
```bash
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate
pip install -r requirements.txt

# Configure env (create .env from .env.example and fill MONGO_URI/JWT_SECRET)
python app.py
```

Server runs at `http://localhost:5000`.

## 🔐 Auth Flow
1) `POST /auth/signup_page1` body: `{name,email,password}`  
2) `POST /auth/signup_page2_income` body: `{email, amt, pay_frequency, weekly_days, anchor_biweekly, monthly_date}`  
   - The **verification link** prints in the terminal (replace with SMTP later).  
3) `GET /auth/verify/<token>` – marks account verified.  
4) `POST /auth/login` – returns JWT token.

Send `Authorization: Bearer <token>` for protected endpoints.

## 📚 Endpoints (high level)
- `/auth/signup_page1`, `/auth/signup_page2_income`, `/auth/verify/<token>`, `/auth/login`
- `/dashboard/summary`
- `/transactions` (POST, GET with filters/sorting)
- `/income` (POST)
- `/expenses` (POST; auto-creates bill when `need_recurrence`)
- `/bills` (GET with filters), `/bills/<id>` (PATCH, DELETE)
- `/ml/next7_burnrate`

## 🧠 Filters (Transactions)
- merchant, category (need/wants/guilts/need_recurrence), mood (happy/neutral/sad)
- amt_min, amt_max
- range = 7days | 30days | 90days | all
- sort = date_up | date_down | amt_up | amt_down

## 🧾 Bills Filters
- search, status (active/pause), cadence (weekly/biweekly/monthly/others), due (today/next7/overdue), category

## 🧮 Dashboard Math
- `current_balance = sum(income) - sum(expenses)`
- `burn_rate = total_spent_past_30_days / active_spend_days`
- `days_left = current_balance / burn_rate` (capped if 0)

## 🧱 Indexes
- users: email unique
- transactions: (user_id, created_at)
- expenses: (transaction_id)
- bills: (user_id, status, next_due)

