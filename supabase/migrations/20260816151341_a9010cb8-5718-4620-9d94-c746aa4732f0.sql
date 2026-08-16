-- ENUMS
CREATE TYPE public.app_role AS ENUM ('admin','member');
CREATE TYPE public.trip_status AS ENUM ('upcoming','live','completed','coming_soon');
CREATE TYPE public.participation_status AS ENUM ('pending','confirmed','not_interested');
CREATE TYPE public.payment_status AS ENUM ('pending','verified','rejected');
CREATE TYPE public.txn_type AS ENUM ('income','expense');
CREATE TYPE public.media_type AS ENUM ('photo','video');

-- APPROVED PHONES
CREATE TABLE public.allowed_phones (
  phone TEXT PRIMARY KEY,
  full_name TEXT NOT NULL DEFAULT '',
  approved BOOLEAN NOT NULL DEFAULT true,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  phone TEXT NOT NULL DEFAULT '',
  full_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  last_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- HELPER FUNCTIONS
CREATE OR REPLACE FUNCTION public.current_phone()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(auth.jwt() ->> 'phone', '')
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
    OR EXISTS (
      SELECT 1 FROM public.allowed_phones a
      WHERE a.is_admin AND a.phone IN (public.current_phone(), '+' || public.current_phone())
    )
  )
$$;

CREATE OR REPLACE FUNCTION public.is_member()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND (
    NOT EXISTS (SELECT 1 FROM public.allowed_phones)
    OR EXISTS (
      SELECT 1 FROM public.allowed_phones a
      WHERE a.approved AND a.phone IN (public.current_phone(), '+' || public.current_phone())
    )
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid())
  )
$$;

-- bootstrap: first ever signed-in user becomes admin + approved member
CREATE OR REPLACE FUNCTION public.bootstrap_me(_full_name TEXT)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _phone TEXT; _first BOOLEAN; _name TEXT;
BEGIN
  IF auth.uid() IS NULL THEN RETURN 'unauthenticated'; END IF;
  _phone := public.current_phone();
  IF _phone <> '' AND left(_phone,1) <> '+' THEN _phone := '+' || _phone; END IF;
  _first := NOT EXISTS (SELECT 1 FROM public.allowed_phones);

  IF _first THEN
    INSERT INTO public.allowed_phones (phone, full_name, approved, is_admin)
    VALUES (_phone, COALESCE(NULLIF(_full_name,''),'Admin'), true, true)
    ON CONFLICT (phone) DO UPDATE SET approved = true, is_admin = true;
    INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), 'admin')
    ON CONFLICT DO NOTHING;
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
$$;

-- TRIPS
CREATE TABLE public.trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  destination TEXT NOT NULL DEFAULT '',
  start_location TEXT NOT NULL DEFAULT '',
  start_date DATE,
  end_date DATE,
  details TEXT NOT NULL DEFAULT '',
  cover_image TEXT,
  budget_per_person NUMERIC NOT NULL DEFAULT 0,
  status public.trip_status NOT NULL DEFAULT 'upcoming',
  maps_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.trip_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips ON DELETE CASCADE,
  url TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0
);

CREATE TABLE public.itinerary_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips ON DELETE CASCADE,
  day_no INT NOT NULL DEFAULT 1,
  day_date DATE,
  title TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  maps_url TEXT
);

CREATE TABLE public.trip_participation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  status public.participation_status NOT NULL DEFAULT 'pending',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (trip_id, user_id)
);

CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  amount NUMERIC NOT NULL DEFAULT 0,
  utr TEXT NOT NULL DEFAULT '',
  status public.payment_status NOT NULL DEFAULT 'pending',
  note TEXT,
  verified_by UUID,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES public.trips ON DELETE SET NULL,
  type public.txn_type NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'general',
  note TEXT NOT NULL DEFAULT '',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES public.trips ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  media_type public.media_type NOT NULL DEFAULT 'photo',
  storage_path TEXT NOT NULL,
  thumbnail_path TEXT,
  caption TEXT NOT NULL DEFAULT '',
  hidden BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES public.trips ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  body TEXT NOT NULL DEFAULT '',
  media_url TEXT,
  media_kind public.media_type,
  pinned BOOLEAN NOT NULL DEFAULT false,
  deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.chat_messages ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  UNIQUE (message_id, user_id, emoji)
);

CREATE TABLE public.live_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES public.trips ON DELETE SET NULL,
  host_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  host_name TEXT NOT NULL DEFAULT '',
  stream_url TEXT,
  title TEXT NOT NULL DEFAULT 'Live Trip',
  is_active BOOLEAN NOT NULL DEFAULT true,
  public_access BOOLEAN NOT NULL DEFAULT true,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX one_active_live ON public.live_sessions (is_active) WHERE is_active;

CREATE TABLE public.live_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.live_sessions ON DELETE CASCADE,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.live_chat (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.live_sessions ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users ON DELETE SET NULL,
  display_name TEXT NOT NULL DEFAULT 'Guest',
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.live_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.live_sessions ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users ON DELETE SET NULL,
  emoji TEXT NOT NULL DEFAULT '❤️',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.thirukkural (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number INT,
  kural TEXT NOT NULL,
  explanation TEXT NOT NULL DEFAULT '',
  scheduled_date DATE,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  kind TEXT NOT NULL DEFAULT 'general',
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- GRANTS
GRANT SELECT, INSERT, UPDATE, DELETE ON public.allowed_phones, public.profiles, public.user_roles,
  public.trips, public.trip_images, public.itinerary_days, public.trip_participation, public.payments,
  public.wallet_transactions, public.memories, public.chat_messages, public.message_reactions,
  public.live_sessions, public.live_locations, public.live_chat, public.live_reactions,
  public.thirukkural, public.notifications TO authenticated;
GRANT ALL ON public.allowed_phones, public.profiles, public.user_roles,
  public.trips, public.trip_images, public.itinerary_days, public.trip_participation, public.payments,
  public.wallet_transactions, public.memories, public.chat_messages, public.message_reactions,
  public.live_sessions, public.live_locations, public.live_chat, public.live_reactions,
  public.thirukkural, public.notifications TO service_role;
GRANT SELECT ON public.trips, public.trip_images, public.itinerary_days, public.live_sessions,
  public.live_locations, public.live_chat, public.live_reactions, public.thirukkural TO anon;
GRANT INSERT ON public.live_chat, public.live_reactions TO anon;

-- RLS
ALTER TABLE public.allowed_phones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itinerary_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_participation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_chat ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thirukkural ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- allowed_phones: admin only (members see nothing)
CREATE POLICY ap_admin_all ON public.allowed_phones FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- profiles
CREATE POLICY pr_member_read ON public.profiles FOR SELECT TO authenticated USING (public.is_member());
CREATE POLICY pr_self_upsert ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY pr_self_update ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_admin()) WITH CHECK (id = auth.uid() OR public.is_admin());
CREATE POLICY pr_admin_delete ON public.profiles FOR DELETE TO authenticated USING (public.is_admin());

-- user_roles
CREATE POLICY ur_read ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY ur_admin_write ON public.user_roles FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- trips + images + itinerary: public read, admin write
CREATE POLICY tr_read ON public.trips FOR SELECT USING (true);
CREATE POLICY tr_admin ON public.trips FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY ti_read ON public.trip_images FOR SELECT USING (true);
CREATE POLICY ti_admin ON public.trip_images FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY id_read ON public.itinerary_days FOR SELECT USING (true);
CREATE POLICY id_admin ON public.itinerary_days FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- participation: members read all, own write
CREATE POLICY tp_read ON public.trip_participation FOR SELECT TO authenticated USING (public.is_member());
CREATE POLICY tp_own_insert ON public.trip_participation FOR INSERT TO authenticated
  WITH CHECK (public.is_member() AND (user_id = auth.uid() OR public.is_admin()));
CREATE POLICY tp_own_update ON public.trip_participation FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin()) WITH CHECK (user_id = auth.uid() OR public.is_admin());
CREATE POLICY tp_admin_delete ON public.trip_participation FOR DELETE TO authenticated USING (public.is_admin());

-- payments: members read all (transparency), insert own pending only, admin verifies
CREATE POLICY pay_read ON public.payments FOR SELECT TO authenticated USING (public.is_member());
CREATE POLICY pay_own_insert ON public.payments FOR INSERT TO authenticated
  WITH CHECK (public.is_member() AND ((user_id = auth.uid() AND status = 'pending' AND verified_by IS NULL) OR public.is_admin()));
CREATE POLICY pay_admin_update ON public.payments FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY pay_admin_delete ON public.payments FOR DELETE TO authenticated USING (public.is_admin());

-- wallet: members read, admin write
CREATE POLICY wt_read ON public.wallet_transactions FOR SELECT TO authenticated USING (public.is_member());
CREATE POLICY wt_admin ON public.wallet_transactions FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- memories
CREATE POLICY me_read ON public.memories FOR SELECT TO authenticated USING (public.is_member() AND (NOT hidden OR public.is_admin() OR user_id = auth.uid()));
CREATE POLICY me_insert ON public.memories FOR INSERT TO authenticated WITH CHECK (public.is_member() AND user_id = auth.uid());
CREATE POLICY me_update ON public.memories FOR UPDATE TO authenticated
  USING (public.is_admin() OR user_id = auth.uid()) WITH CHECK (public.is_admin() OR user_id = auth.uid());
CREATE POLICY me_delete ON public.memories FOR DELETE TO authenticated USING (public.is_admin() OR user_id = auth.uid());

-- chat
CREATE POLICY cm_read ON public.chat_messages FOR SELECT TO authenticated USING (public.is_member());
CREATE POLICY cm_insert ON public.chat_messages FOR INSERT TO authenticated
  WITH CHECK (public.is_member() AND user_id = auth.uid() AND NOT pinned);
CREATE POLICY cm_update ON public.chat_messages FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY cm_delete ON public.chat_messages FOR DELETE TO authenticated USING (public.is_admin() OR user_id = auth.uid());
CREATE POLICY mr_read ON public.message_reactions FOR SELECT TO authenticated USING (public.is_member());
CREATE POLICY mr_insert ON public.message_reactions FOR INSERT TO authenticated WITH CHECK (public.is_member() AND user_id = auth.uid());
CREATE POLICY mr_delete ON public.message_reactions FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.is_admin());

-- live sessions: public can read, only members can host
CREATE POLICY ls_read ON public.live_sessions FOR SELECT USING (true);
CREATE POLICY ls_host_insert ON public.live_sessions FOR INSERT TO authenticated
  WITH CHECK (public.is_member() AND host_id = auth.uid());
CREATE POLICY ls_host_update ON public.live_sessions FOR UPDATE TO authenticated
  USING (host_id = auth.uid() OR public.is_admin()) WITH CHECK (host_id = auth.uid() OR public.is_admin());
CREATE POLICY ls_admin_delete ON public.live_sessions FOR DELETE TO authenticated USING (public.is_admin());

CREATE POLICY ll_read ON public.live_locations FOR SELECT USING (true);
CREATE POLICY ll_host_insert ON public.live_locations FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.live_sessions s WHERE s.id = session_id AND s.is_active AND (s.host_id = auth.uid() OR public.is_admin())));
CREATE POLICY ll_admin_delete ON public.live_locations FOR DELETE TO authenticated USING (public.is_admin());

CREATE POLICY lc_read ON public.live_chat FOR SELECT USING (true);
CREATE POLICY lc_insert ON public.live_chat FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.live_sessions s WHERE s.id = session_id AND s.is_active));
CREATE POLICY lc_anon_insert ON public.live_chat FOR INSERT TO anon
  WITH CHECK (user_id IS NULL AND EXISTS (SELECT 1 FROM public.live_sessions s WHERE s.id = session_id AND s.is_active AND s.public_access));
CREATE POLICY lc_admin_all ON public.live_chat FOR DELETE TO authenticated USING (public.is_admin());

CREATE POLICY lr_read ON public.live_reactions FOR SELECT USING (true);
CREATE POLICY lr_insert ON public.live_reactions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.live_sessions s WHERE s.id = session_id AND s.is_active));
CREATE POLICY lr_anon_insert ON public.live_reactions FOR INSERT TO anon
  WITH CHECK (user_id IS NULL AND EXISTS (SELECT 1 FROM public.live_sessions s WHERE s.id = session_id AND s.is_active AND s.public_access));

-- thirukkural: public read, admin write
CREATE POLICY tk_read ON public.thirukkural FOR SELECT USING (true);
CREATE POLICY tk_admin ON public.thirukkural FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- notifications
CREATE POLICY nt_read ON public.notifications FOR SELECT TO authenticated USING (public.is_member() AND (user_id = auth.uid() OR user_id IS NULL));
CREATE POLICY nt_admin ON public.notifications FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY nt_own_update ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- payment verification -> wallet income (server side, trustworthy)
CREATE OR REPLACE FUNCTION public.on_payment_verified()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'verified' AND COALESCE(OLD.status,'pending') <> 'verified' THEN
    NEW.verified_at := now();
    NEW.verified_by := auth.uid();
    INSERT INTO public.wallet_transactions (trip_id, type, amount, category, note, created_by)
    VALUES (NEW.trip_id, 'income', NEW.amount, 'member_contribution',
            'Payment verified (UTR: ' || NEW.utr || ')', auth.uid());
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_payment_verified BEFORE UPDATE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.on_payment_verified();

-- REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages, public.message_reactions,
  public.live_sessions, public.live_chat, public.live_reactions, public.live_locations,
  public.trip_participation, public.payments, public.memories, public.profiles;

-- SEED thirukkural
INSERT INTO public.thirukkural (number, kural, explanation) VALUES
 (1, 'அகர முதல எழுத்தெல்லாம் ஆதி
பகவன் முதற்றே உலகு.', 'எழுத்துக்கள் எல்லாம் அகரத்தை அடிப்படையாகக் கொண்டிருக்கின்றன; அதுபோல உலகம் கடவுளை அடிப்படையாகக் கொண்டிருக்கிறது.'),
 (789, 'நட்பிற்கு வீற்றிருக்கை யாதெனின் கொட்பின்றி
ஒல்லும்வா யூன்றும் நிலை.', 'நட்பிற்கு தலைமையான இடம் எது என்றால், மனம் மாறாமல் இயன்ற இடங்களில் எல்லாம் தாங்கி நிற்கும் நிலையே.'),
 (781, 'செயற்கரிய யாவுள நட்பின் அதுபோல்
வினைக்கரிய யாவுள காப்பு.', 'நட்பைப் போல் செய்வதற்கு அரிய பொருள் வேறு எதுவும் இல்லை; அது போல் தீய செயல்களிலிருந்து காக்கும் காவலும் வேறு இல்லை.'),
 (788, 'உடுக்கை இழந்தவன் கைபோல ஆங்கே
இடுக்கண் களைவதாம் நட்பு.', 'ஆடை நழுவும் போது கை உடனே காப்பது போல், துன்பம் வந்தபோது உடனே உதவி செய்து நீக்குவதே நட்பு.'),
 (786, 'முகநக நட்பது நட்பன்று நெஞ்சத்து
அகநக நட்பது நட்பு.', 'முகம் மட்டும் மலர்ந்து பேசுவது நட்பு அல்ல; உள்ளம் மகிழ்ந்து கலப்பதே உண்மையான நட்பு.'),
 (784, 'நகுதற் பொருட்டன்று நட்டல் மிகுதிக்கண்
மேற்சென்று இடித்தற் பொருட்டு.', 'நட்பு வெறும் மகிழ்ச்சிக்காக அல்ல; தவறு செய்யும் போது கடிந்து திருத்துவதற்கும் ஆகும்.'),
 (782, 'நிறைநீர நீரவர் கேண்மை பிறைமதிப்
பின்நீர பேதையார் கேண்மை.', 'அறிவுடையவர் நட்பு பிறை நிலவு போல் வளரும்; அறிவில்லாதவர் நட்பு முழுமதி போல் தேய்ந்து குறையும்.');