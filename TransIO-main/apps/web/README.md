# TransIO Web

Premium freight load board and dispatch workspace.

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env` from `.env.example` and fill Supabase/API values.

3. Start the app:

```bash
npm run dev
```

## Production Checklist

- Configure Supabase Auth email/password.
- Configure Supabase Auth Google provider.
- Add the production URL and `https://your-domain.com/reset-password` to
  Supabase Auth redirect URLs.
- Run `supabase/schema.sql` against the Supabase project.
- Deploy `services/api` with `SUPABASE_SERVICE_ROLE_KEY`.
- Set `VITE_API_BASE_URL` to the deployed API URL.
- Create the first admin user in Supabase Auth and promote that profile to
  `admin` in `public.users`.

## Auth

The app supports email/password login, email/password registration, and Google
OAuth through Supabase Auth. There are no demo or hardcoded login accounts in
the frontend.

## First Admin Account

1. Create the admin user in Supabase Auth with a real email and strong
   password.

2. Promote the matching profile with `supabase/admin-bootstrap.sql` or this
   query:

```sql
update public.users
set role = 'admin'
where email = 'admin@your-company.com';
```

3. Sign in with that email/password. Admin panel access is granted only when
   `public.users.role = 'admin'`.
