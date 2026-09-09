-- ===========================================================================
-- ASL_ZIYO — Admin sets a user's password (admin_set_user_password)
-- ---------------------------------------------------------------------------
-- Run AFTER supabase/schema.sql. Paste the WHOLE file into the Supabase SQL
-- Editor (Dashboard -> SQL -> New query) and Run. Idempotent.
--
-- Supabase stores passwords ONLY as bcrypt hashes (auth.users.encrypted_password),
-- so an existing password can never be displayed. What an admin CAN do is set
-- a NEW password for an account from the "Foydalanuvchilar" page. This
-- function does exactly that, server-side, for admins only:
--   * caller must be an active admin (public.current_app_role() = 'admin');
--   * password must be at least 6 characters (same rule as sign-up);
--   * hashed with bcrypt via pgcrypto, exactly like Supabase Auth does;
--   * the target's other sessions are revoked so the old password stops
--     working everywhere immediately.
-- ===========================================================================

create extension if not exists "pgcrypto";

create or replace function public.admin_set_user_password(target_user_id uuid, new_password text)
returns void
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
begin
  if public.current_app_role() is distinct from 'admin' then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if new_password is null or length(new_password) < 6 then
    raise exception 'Parol kamida 6 ta belgi bo''lsin' using errcode = '22023';
  end if;
  if not exists (select 1 from public.profiles where id = target_user_id) then
    raise exception 'Foydalanuvchi topilmadi' using errcode = 'P0002';
  end if;

  update auth.users
  set encrypted_password = extensions.crypt(new_password, extensions.gen_salt('bf', 10)),
      updated_at = now()
  where id = target_user_id;

  -- Log everyone out of that account (refresh tokens + sessions).
  delete from auth.refresh_tokens where user_id = target_user_id::text;
  begin
    delete from auth.sessions where user_id = target_user_id;
  exception when undefined_table then
    null;
  end;
end;
$$;

revoke all on function public.admin_set_user_password(uuid, text) from public;
grant execute on function public.admin_set_user_password(uuid, text) to authenticated;
