-- Run after creating the first admin user in Supabase Auth.
-- Replace the email with the real admin account email.

update public.users
set
  role = 'admin',
  updated_at = timezone('utc', now())
where email = 'mozartmoreka864@gmail.com';

-- Verify:
select id, email, full_name, role
from public.users
where email = 'mozartmoreka864@gmail.com';
