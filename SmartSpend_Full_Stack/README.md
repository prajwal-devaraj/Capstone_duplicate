# SmartSpend Full Stack (One Zip)

## Quick Start

### Backend
```bash
cd SmartSpend_Full_Stack/backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python app.py
```
Backend: http://127.0.0.1:5000

### Frontend
```bash
cd SmartSpend_Full_Stack/frontend
npm install
npm run dev
```
Frontend: http://localhost:3000

> If MongoDB Atlas blocks TLS, we already included `tls=true` and `tlsAllowInvalidCertificates=true` for development.
