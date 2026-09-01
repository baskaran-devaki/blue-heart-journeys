-- 1. profiles extra fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS dob date,
  ADD COLUMN IF NOT EXISTS blood_group text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS address text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

-- 2. member roster / invitations (email is the login identity)
CREATE TABLE IF NOT EXISTS public.member_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  full_name text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  dob date,
  blood_group text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  avatar_url text,
  role app_role NOT NULL DEFAULT 'member',
  active boolean NOT NULL DEFAULT true,
  invitation_status text NOT NULL DEFAULT 'pending',
  invited_at timestamptz,
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.member_invites TO authenticated;
GRANT ALL ON public.member_invites TO service_role;
ALTER TABLE public.member_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY mi_admin_all ON public.member_invites FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY mi_self_read ON public.member_invites FOR SELECT TO authenticated
  USING (lower(email) = public.current_email() OR public.is_member());

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $fn$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$fn$;

CREATE TRIGGER member_invites_updated_at BEFORE UPDATE ON public.member_invites
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- seed the admin roster row
INSERT INTO public.member_invites (email, full_name, role, invitation_status, accepted_at)
VALUES ('onlineoffice.me@gmail.com', 'Admin', 'admin', 'accepted', now())
ON CONFLICT (email) DO NOTHING;

-- 3. trips: journey places, total budget, new statuses
ALTER TYPE trip_status ADD VALUE IF NOT EXISTS 'active';
ALTER TYPE trip_status ADD VALUE IF NOT EXISTS 'closed';
ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS journey_places text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS total_budget numeric NOT NULL DEFAULT 0;

-- 4. expenses / wallet extra fields
ALTER TABLE public.wallet_transactions
  ADD COLUMN IF NOT EXISTS title text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS txn_date date NOT NULL DEFAULT current_date,
  ADD COLUMN IF NOT EXISTS receipt_path text;

-- 5. favourite songs per trip
CREATE TABLE IF NOT EXISTS public.trip_songs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid REFERENCES public.trips(id) ON DELETE CASCADE,
  title text NOT NULL,
  url text NOT NULL DEFAULT '',
  storage_path text,
  added_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.trip_songs TO authenticated;
GRANT ALL ON public.trip_songs TO service_role;
ALTER TABLE public.trip_songs ENABLE ROW LEVEL SECURITY;
CREATE POLICY ts_read ON public.trip_songs FOR SELECT TO authenticated USING (public.is_member());
CREATE POLICY ts_insert ON public.trip_songs FOR INSERT TO authenticated
  WITH CHECK (public.is_member() AND added_by = auth.uid());
CREATE POLICY ts_delete ON public.trip_songs FOR DELETE TO authenticated USING (public.is_admin());

-- 6. live viewer presence
CREATE TABLE IF NOT EXISTS public.live_viewers (
  session_id uuid NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT '',
  last_seen timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (session_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_viewers TO authenticated;
GRANT ALL ON public.live_viewers TO service_role;
ALTER TABLE public.live_viewers ENABLE ROW LEVEL SECURITY;
CREATE POLICY lv_read ON public.live_viewers FOR SELECT TO authenticated USING (public.is_member());
CREATE POLICY lv_upsert ON public.live_viewers FOR INSERT TO authenticated
  WITH CHECK (public.is_member() AND user_id = auth.uid());
CREATE POLICY lv_update ON public.live_viewers FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY lv_delete ON public.live_viewers FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

-- 7. chat: only latest 30 days visible + cleanup routine
DROP POLICY IF EXISTS cm_read ON public.chat_messages;
CREATE POLICY cm_read ON public.chat_messages FOR SELECT TO authenticated
  USING (public.is_member() AND created_at > now() - interval '30 days');

CREATE OR REPLACE FUNCTION public.purge_old_chat()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer;
BEGIN
  DELETE FROM public.chat_messages WHERE created_at < now() - interval '30 days';
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;
GRANT EXECUTE ON FUNCTION public.purge_old_chat() TO authenticated;

-- 8. email-based membership / admin checks (phones no longer authenticate)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND (
    public.current_email() = 'onlineoffice.me@gmail.com'
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  )
$$;

CREATE OR REPLACE FUNCTION public.is_member()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND (
    public.current_email() = 'onlineoffice.me@gmail.com'
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.member_invites m
      WHERE lower(m.email) = public.current_email() AND m.active
    )
  )
$$;

CREATE OR REPLACE FUNCTION public.bootstrap_me(_full_name text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _email text; _inv public.member_invites; _name text; _is_admin boolean;
BEGIN
  IF auth.uid() IS NULL THEN RETURN 'unauthenticated'; END IF;
  _email := public.current_email();

  SELECT * INTO _inv FROM public.member_invites WHERE lower(email) = _email;

  _is_admin := _email = 'onlineoffice.me@gmail.com' OR COALESCE(_inv.role, 'member') = 'admin';

  IF _email <> 'onlineoffice.me@gmail.com'
     AND (_inv.email IS NULL OR NOT _inv.active)
     AND NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()) THEN
    RETURN 'not_approved';
  END IF;

  _name := COALESCE(NULLIF(_full_name, ''), NULLIF(_inv.full_name, ''),
                    split_part(_email, '@', 1));

  INSERT INTO public.profiles (id, email, full_name, phone, dob, blood_group, address, avatar_url)
  VALUES (auth.uid(), _email, _name, COALESCE(_inv.phone, ''), _inv.dob,
          COALESCE(_inv.blood_group, ''), COALESCE(_inv.address, ''), _inv.avatar_url)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    last_seen = now(),
    full_name = CASE WHEN _full_name <> '' THEN _full_name
                     ELSE COALESCE(NULLIF(public.profiles.full_name, ''), EXCLUDED.full_name) END;

  INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), 'member') ON CONFLICT DO NOTHING;
  IF _is_admin THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), 'admin') ON CONFLICT DO NOTHING;
  END IF;

  IF _inv.email IS NOT NULL AND _inv.invitation_status <> 'accepted' THEN
    UPDATE public.member_invites SET invitation_status = 'accepted', accepted_at = now()
    WHERE id = _inv.id;
  END IF;

  RETURN CASE WHEN _is_admin THEN 'admin' ELSE 'member' END;
END;
$$;

-- 9. profiles: admin may manage every member profile
DROP POLICY IF EXISTS pr_self_update ON public.profiles;
CREATE POLICY pr_self_update ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_admin())
  WITH CHECK (id = auth.uid() OR public.is_admin());