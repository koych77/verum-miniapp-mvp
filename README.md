# VERUM Mini App MVP

Telegram Mini App MVP for the VERUM ecosystem.

## Included

- `miniapp/backend` - FastAPI backend with demo seed data
- `miniapp/frontend` - React + Vite Telegram Mini App frontend
- `.github/workflows/miniapp-ci.yml` - CI for backend import check and frontend build

## Product Scope

- participant profiles
- global rating
- events list and event detail pages
- partners ticker and partner page foundation
- coach, organizer, and admin entry points
- Telegram bot launcher for opening the Mini App

## Local Development

See [miniapp/README.md](miniapp/README.md) for local setup and deployment notes.

## Railway Deploy

The repository root can now be deployed as a single Railway service.

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

This deploy mode:

- builds the frontend from `miniapp/frontend`
- serves the built Mini App from FastAPI
- exposes the API under `/api/v1`
- can run Telegram bot polling in the same container for MVP use

## Notes

- This repository contains the Mini App MVP only
- Local secret files such as `.env` are intentionally excluded from git
