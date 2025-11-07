# SmartSpend Backend (Flask + SQLite)

## Quick start
```bash
cd backend
pip install -r requirements.txt
python app.py          # serves on http://localhost:5000
# (optional) seed demo data
curl -X POST http://localhost:5000/api/seed
```
## Env
- `DATABASE_URL` (optional) defaults to `sqlite:///smartspend.db`

## Endpoints (subset)
- `POST /api/signup` — {name,email,password}
- `POST /api/login` — {email,password}
- `GET /api/dashboard`
- `GET/POST/DELETE /api/transactions`
- `GET/POST/PUT/DELETE /api/bills`
- `GET/PUT /api/goals`
- `GET /api/achievements`

Integrates with your existing React frontend via `VITE_API_URL=http://localhost:5000`.
