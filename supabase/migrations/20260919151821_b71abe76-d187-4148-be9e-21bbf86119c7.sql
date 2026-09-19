CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT auth.uid() IS NOT NULL AND (
    lower(coalesce(auth.jwt() ->> 'email', '')) = 'onlineoffice.me@gmail.com'
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
$$;

CREATE OR REPLACE FUNCTION private.is_member()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT auth.uid() IS NOT NULL AND (
    lower(coalesce(auth.jwt() ->> 'email', '')) = 'onlineoffice.me@gmail.com'
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.member_invites m
      WHERE lower(m.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
        AND m.active
    )
  )
$$;

CREATE OR REPLACE FUNCTION private.bootstrap_me(_full_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  _email text;
  _inv public.member_invites;
  _name text;
  _is_admin boolean;
BEGIN
  IF auth.uid() IS NULL THEN RETURN 'unauthenticated'; END IF;
  _email := lower(coalesce(auth.jwt() ->> 'email', ''));

  SELECT * INTO _inv
  FROM public.member_invites
  WHERE lower(email) = _email;

  _is_admin := _email = 'onlineoffice.me@gmail.com' OR COALESCE(_inv.role, 'member') = 'admin';

  IF _email <> 'onlineoffice.me@gmail.com'
     AND (_inv.email IS NULL OR NOT _inv.active)
     AND NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()) THEN
    RETURN 'not_approved';
  END IF;

  _name := COALESCE(NULLIF(_full_name, ''), NULLIF(_inv.full_name, ''), split_part(_email, '@', 1));

  INSERT INTO public.profiles (id, email, full_name, phone, dob, blood_group, address, avatar_url)
  VALUES (auth.uid(), _email, _name, COALESCE(_inv.phone, ''), _inv.dob,
          COALESCE(_inv.blood_group, ''), COALESCE(_inv.address, ''), _inv.avatar_url)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    last_seen = now(),
    full_name = CASE WHEN _full_name <> '' THEN _full_name
                     ELSE COALESCE(NULLIF(public.profiles.full_name, ''), EXCLUDED.full_name) END;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (auth.uid(), 'member')
  ON CONFLICT DO NOTHING;

  IF _is_admin THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (auth.uid(), 'admin')
    ON CONFLICT DO NOTHING;
  END IF;

  IF _inv.email IS NOT NULL AND _inv.invitation_status <> 'accepted' THEN
    UPDATE public.member_invites
    SET invitation_status = 'accepted', accepted_at = now()
    WHERE id = _inv.id;
  END IF;

  RETURN CASE WHEN _is_admin THEN 'admin' ELSE 'member' END;
END;
$$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.is_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.is_member() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.bootstrap_me(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_member() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.bootstrap_me(text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.current_email()
RETURNS text
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT lower(coalesce(auth.jwt() ->> 'email', ''))
$$;

CREATE OR REPLACE FUNCTION public.current_phone()
RETURNS text
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT coalesce(auth.jwt() ->> 'phone', '')
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, private, pg_temp
AS $$
  SELECT private.has_role(_user_id, _role)
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, private, pg_temp
AS $$
  SELECT private.is_admin()
$$;

CREATE OR REPLACE FUNCTION public.is_member()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, private, pg_temp
AS $$
  SELECT private.is_member()
$$;

CREATE OR REPLACE FUNCTION public.bootstrap_me(_full_name text)
RETURNS text
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, private, pg_temp
AS $$
  SELECT private.bootstrap_me(_full_name)
$$;

ALTER FUNCTION public.archive_trip_financials(uuid) SECURITY INVOKER;
ALTER FUNCTION public.reset_trip_wallet(uuid) SECURITY INVOKER;
ALTER FUNCTION public.trip_upload_open(uuid) SECURITY INVOKER;

REVOKE EXECUTE ON FUNCTION public.current_email() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.current_phone() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_member() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.bootstrap_me(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.archive_trip_financials(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reset_trip_wallet(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.trip_upload_open(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.current_email() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_phone() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_member() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.bootstrap_me(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.archive_trip_financials(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reset_trip_wallet(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.trip_upload_open(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS lc_read ON public.live_chat;
CREATE POLICY lc_read ON public.live_chat
FOR SELECT TO authenticated
USING (public.is_member());
DROP POLICY IF EXISTS lc_anon_insert ON public.live_chat;
REVOKE ALL ON public.live_chat FROM anon;

DROP POLICY IF EXISTS ll_read ON public.live_locations;
CREATE POLICY ll_read ON public.live_locations
FOR SELECT TO authenticated
USING (public.is_member());
REVOKE ALL ON public.live_locations FROM anon;

DROP POLICY IF EXISTS lr_read ON public.live_reactions;
CREATE POLICY lr_read ON public.live_reactions
FOR SELECT TO authenticated
USING (public.is_member());
DROP POLICY IF EXISTS lr_anon_insert ON public.live_reactions;
REVOKE ALL ON public.live_reactions FROM anon;

DROP POLICY IF EXISTS ls_read ON public.live_sessions;
CREATE POLICY ls_read ON public.live_sessions
FOR SELECT TO authenticated
USING (public.is_member());
REVOKE ALL ON public.live_sessions FROM anon;

ALTER PUBLICATION supabase_realtime DROP TABLE public.profiles;