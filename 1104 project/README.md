# SmartSpend Full Working System

This bundle includes your **React frontend** and a **Flask + MongoDB backend** wired for development.

## Structure
```
SmartSpend/
├── frontend/   # your React app (from capstone3-main.zip)
└── backend/    # Flask API (JWT auth, MongoDB, bills/transactions/dashboard)
```

## Quickstart

### Backend
```
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env and set your MONGO_URI and JWT_SECRET
python app.py
```

Backend runs at **http://127.0.0.1:5000**.

### Frontend (React)
```
cd frontend
npm install
npm start
```
Opens **http://localhost:3000**.

> Dev note: I added `"proxy": "http://127.0.0.1:5000"` to `frontend/package.json` so relative requests will hit the Flask API.

## Auth Flow
1. `POST /auth/signup_page1` (name, email, password)
2. `POST /auth/signup_page2_income` (email + income details) → verification link appears in backend console
3. `GET /auth/verify/<token>`
4. `POST /auth/login` → saves JWT; use in `Authorization: Bearer <token>`

## Endpoints
- `/dashboard/summary`
- `/transactions` (GET with filters, POST)
- `/income` (POST), `/expenses` (POST)
- `/bills` (GET filters), `/bills/:id` (PATCH, DELETE)
- `/ml/next7_burnrate`

If you want me to wire any specific React components to these endpoints, tell me the component filenames and I’ll add the code.
