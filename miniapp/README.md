# VERUM Mini App MVP

This folder contains a separate MVP stack for the VERUM Telegram Mini App:

- `backend/` — FastAPI API + SQLAlchemy models + aiogram bot entrypoint
- `frontend/` — React/Vite Telegram Mini App shell

## What is already implemented

- demo auth bootstrap for Mini App
- participant profile endpoint
- global rating endpoints
- events feed
- partners ticker and partners page data
- news feed
- self-registration endpoint for events
- Telegram bot `/start` button that opens the Mini App
- seeded demo data for fast local boot

## Local run

### Backend

```powershell
cd miniapp\backend
copy .env.example .env
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Backend will start at `http://localhost:8000`.

Docs:
- `http://localhost:8000/docs`

### Frontend

```powershell
cd miniapp\frontend
copy .env.example .env
npm install
npm run dev
```

Frontend will start at `http://localhost:5173`.

## Telegram bot

Set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_WEBAPP_URL` in `backend/.env`, then run:

```powershell
cd miniapp\backend
python -m app.bot.main
```

## Railway deployment

### Fastest MVP path

Deploy the **repository root** as one Railway service.

What it does:

- builds `miniapp/frontend`
- serves the built frontend from FastAPI
- exposes API routes at `/api/v1`
- can run Telegram bot polling inside the same container

Required variables:

- `DATABASE_URL`
- `JWT_SECRET`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_WEBAPP_URL`
- `ADMIN_EMAIL`

Recommended:

- `ENVIRONMENT=production`
- `ENABLE_BOT_POLLING=true`

Optional for real email verification:

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASSWORD`
- `SMTP_FROM`
- `SMTP_USE_TLS`

Advanced option: create **two separate services** in Railway from the same GitHub repo if you want to split frontend and backend.

### 1. Backend service

- Service name: `verum-miniapp-api`
- Root directory: `miniapp/backend`
- Config file: `miniapp/backend/railway.json`
- Start command: picked up automatically from `railway.json`
- Required variables:
  - `DATABASE_URL`
  - `JWT_SECRET`
  - `TELEGRAM_BOT_TOKEN`
  - `TELEGRAM_WEBAPP_URL`
  - `ADMIN_EMAIL`

### 2. Frontend service

- Service name: `verum-miniapp-web`
- Root directory: `miniapp/frontend`
- Config file: `miniapp/frontend/railway.json`
- Start command: picked up automatically from `railway.json`
- Required variable:
  - `VITE_API_BASE_URL=https://<your-api-domain>/api/v1`

Optional:
- add PostgreSQL service in Railway and connect its `DATABASE_URL` to the backend
- expose the backend and frontend domains after the first successful deploy
- point BotFather Mini App URL to the deployed frontend domain

## GitHub flow

Recommended flow:

1. Create a new GitHub repository
2. Push this workspace
3. Connect the repo to Railway
4. Create two services with the root directories above
5. Add environment variables
6. Configure your Telegram BotFather Mini App URL to the frontend service domain

## Important note

This is a working MVP scaffold. The next bigger steps are:

1. PostgreSQL migrations with Alembic
2. admin moderation flows
3. organizer and coach protected flows
4. xlsx/docx import pipeline from VERUM
