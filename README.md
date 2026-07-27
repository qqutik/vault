# Vault

Universal API vault for confidential data (passwords, secure notes, arbitrary
private information) with **passwordless authentication via Passkey
(WebAuthn/FIDO2)**.

Monorepo:

- `backend/` — Laravel 13 API (PHP 8.4, PostgreSQL) — API-only, no Blade
- `frontend/` — React + TypeScript SPA (Vite)

See [PLAN.md](../PLAN.md) for the full design (architecture, DB schema, roadmap).

## Stack

| | |
|---|---|
| Backend | Laravel 13, PHP 8.4 |
| Auth | Passkey (`laragear/webauthn`) + Laravel Sanctum (Bearer tokens) |
| Database | PostgreSQL |
| Frontend | React + TypeScript + Vite, `@simplewebauthn/browser` |

## Requirements

- PHP **8.4+** (this project needs 8.4 — 8.3 will fail the Composer platform check)
- Composer
- Node 20.19+ / 22+
- PostgreSQL 16/17

## Backend setup

```bash
cd backend
cp .env.example .env          # then fill DB_* and WEBAUTHN_* values
composer install
php artisan key:generate
php artisan migrate
php artisan serve             # http://localhost:8000
```

Encryption at rest depends on `APP_KEY` — **back it up**. Losing it makes every
encrypted vault item unreadable.

## Frontend setup

```bash
cd frontend
npm install
npm run dev                   # http://localhost:5173
```

`frontend/.env` → `VITE_API_URL=http://localhost:8000/api`

## Security notes

- Passwordless: users authenticate only with passkeys; recovery codes are the
  fallback if all devices are lost.
- Sensitive data (`vault_items.data`) is encrypted at rest (AES-256-GCM).
- WebAuthn requires HTTPS in production (`localhost` is treated as secure in dev).
