# TransIO API

Express service for load collector ingest and admin reporting.

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env` from `.env.example`.

3. Start the API:

```bash
npm run dev
```

## Endpoints

- `GET /health`
- `POST /ingest`
- `GET /stats`
- `GET /users`

Admin endpoints require `x-user-id` for a user whose `public.users.role` is `admin`.

## Production Notes

- Keep `SUPABASE_SERVICE_ROLE_KEY` only on the server.
- Set `CORS_ORIGIN` to the deployed web app origin.
- Do not expose admin credentials in this repository.
- Create admin users through Supabase Auth, then promote them with
  `supabase/admin-bootstrap.sql`.
