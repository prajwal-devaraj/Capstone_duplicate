# SmartSpend Backend (Flask + MongoDB Atlas)

## Quick Start
```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

Server runs at: http://127.0.0.1:5000

## Environment
We already set `.env` for you. If your real password contains `@`, keep it URL-encoded as `%40`.
If Atlas has strict TLS, we already added `tls=true` and `tlsAllowInvalidCertificates=true` for dev.

## Endpoints (minimal)
- `GET /` — health check
- `POST /auth/signup_page1` — name, email, password
- `POST /auth/signup_page2_income` — email, amt, pay_frequency
- `GET /auth/verify/<token>` — email verify (console link)
- `POST /auth/login` — returns JWT
- `GET /dashboard/summary` — requires JWT
- `POST /transactions` — requires JWT
- `GET /transactions` — requires JWT
- `POST /expenses` — requires JWT
- `GET /bills` — requires JWT
- `PATCH /bills/<id>` — requires JWT
- `DELETE /bills/<id>` — requires JWT
