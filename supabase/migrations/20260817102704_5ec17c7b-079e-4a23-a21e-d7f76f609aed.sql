create or replace function public.current_email()
returns text language sql stable security definer set search_path to 'public'
as $$ select lower(coalesce(auth.jwt() ->> 'email', '')) $$;

create or replace function public.bootstrap_me(_full_name text)
returns text language plpgsql security definer set search_path to 'public'
as $function$
DECLARE _phone TEXT; _email TEXT; _first BOOLEAN; _name TEXT;
BEGIN
  IF auth.uid() IS NULL THEN RETURN 'unauthenticated'; END IF;
  _email := public.current_email();
  _phone := public.current_phone();
  IF _phone <> '' AND left(_phone,1) <> '+' THEN _phone := '+' || _phone; END IF;

  IF _email = 'onlineoffice.me@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), 'admin') ON CONFLICT DO NOTHING;
    INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), 'member') ON CONFLICT DO NOTHING;
    INSERT INTO public.profiles (id, phone, full_name)
    VALUES (auth.uid(), _phone, COALESCE(NULLIF(_full_name,''),'Admin'))
    ON CONFLICT (id) DO UPDATE SET last_seen = now();
    RETURN 'admin';
  END IF;

  IF _phone <> '' THEN
    _first := NOT EXISTS (SELECT 1 FROM public.allowed_phones);
    IF _first THEN
      INSERT INTO public.allowed_phones (phone, full_name, approved, is_admin)
      VALUES (_phone, COALESCE(NULLIF(_full_name,''),'Admin'), true, true)
      ON CONFLICT (phone) DO UPDATE SET approved = true, is_admin = true;
      INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), 'admin') ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  IF NOT public.is_member() THEN RETURN 'not_approved'; END IF;

  SELECT COALESCE(NULLIF(_full_name,''), NULLIF(a.full_name,''), 'Member') INTO _name
  FROM public.allowed_phones a WHERE a.phone = _phone;
  IF _name IS NULL THEN _name := COALESCE(NULLIF(_full_name,''),'Member'); END IF;

  INSERT INTO public.profiles (id, phone, full_name)
  VALUES (auth.uid(), _phone, _name)
  ON CONFLICT (id) DO UPDATE SET phone = EXCLUDED.phone, last_seen = now(),
    full_name = CASE WHEN _full_name <> '' THEN _full_name ELSE public.profiles.full_name END;

  INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), 'member') ON CONFLICT DO NOTHING;
  RETURN CASE WHEN public.is_admin() THEN 'admin' ELSE 'member' END;
END;
$function$;