
-- 1. payments instalments
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS instalment_no smallint NOT NULL DEFAULT 1;
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_instalment_no_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_instalment_no_check CHECK (instalment_no BETWEEN 1 AND 4);

-- 2. memories folders
ALTER TABLE public.memories ADD COLUMN IF NOT EXISTS folder text NOT NULL DEFAULT '';

-- 3. permanent archive of completed trip finances
CREATE TABLE IF NOT EXISTS public.trip_financials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid REFERENCES public.trips(id) ON DELETE SET NULL,
  trip_name text NOT NULL DEFAULT '',
  start_date date,
  end_date date,
  total_budget numeric NOT NULL DEFAULT 0,
  amount_per_member numeric NOT NULL DEFAULT 0,
  total_collection numeric NOT NULL DEFAULT 0,
  total_expenses numeric NOT NULL DEFAULT 0,
  final_balance numeric NOT NULL DEFAULT 0,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  archived_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.trip_financials TO authenticated;
GRANT ALL ON public.trip_financials TO service_role;
ALTER TABLE public.trip_financials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tf_read ON public.trip_financials;
CREATE POLICY tf_read ON public.trip_financials FOR SELECT TO authenticated USING (public.is_member());
DROP POLICY IF EXISTS tf_admin ON public.trip_financials;
CREATE POLICY tf_admin ON public.trip_financials FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 4. archive + reset wallet for a trip (admin only)
CREATE OR REPLACE FUNCTION public.archive_trip_financials(_trip_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _t public.trips; _inc numeric; _exp numeric; _snap jsonb; _id uuid;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Only admin can archive trip finances'; END IF;
  SELECT * INTO _t FROM public.trips WHERE id = _trip_id;
  IF _t.id IS NULL THEN RAISE EXCEPTION 'Trip not found'; END IF;

  SELECT COALESCE(SUM(CASE WHEN type='income' THEN amount END),0),
         COALESCE(SUM(CASE WHEN type='expense' THEN amount END),0)
    INTO _inc, _exp FROM public.wallet_transactions WHERE trip_id = _trip_id;

  _snap := jsonb_build_object(
    'payments', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'member', COALESCE(pr.full_name, ''), 'amount', p.amount, 'utr', p.utr,
        'status', p.status, 'instalment_no', p.instalment_no,
        'created_at', p.created_at, 'verified_at', p.verified_at) ORDER BY p.created_at)
      FROM public.payments p LEFT JOIN public.profiles pr ON pr.id = p.user_id
      WHERE p.trip_id = _trip_id), '[]'::jsonb),
    'transactions', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'type', w.type, 'title', w.title, 'category', w.category, 'amount', w.amount,
        'note', w.note, 'txn_date', w.txn_date) ORDER BY w.created_at)
      FROM public.wallet_transactions w WHERE w.trip_id = _trip_id), '[]'::jsonb)
  );

  INSERT INTO public.trip_financials (trip_id, trip_name, start_date, end_date, total_budget,
    amount_per_member, total_collection, total_expenses, final_balance, snapshot)
  VALUES (_trip_id, _t.name, _t.start_date, _t.end_date, _t.total_budget,
    _t.budget_per_person, _inc, _exp, _inc - _exp, _snap)
  RETURNING id INTO _id;
  RETURN _id;
END; $$;

CREATE OR REPLACE FUNCTION public.reset_trip_wallet(_trip_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _archive uuid;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Only admin can reset the wallet'; END IF;
  _archive := public.archive_trip_financials(_trip_id);
  DELETE FROM public.wallet_transactions WHERE trip_id = _trip_id;
  DELETE FROM public.payments WHERE trip_id = _trip_id;
  RETURN _archive;
END; $$;

GRANT EXECUTE ON FUNCTION public.archive_trip_financials(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_trip_wallet(uuid) TO authenticated;

-- 5. upload window: photos only, only during the trip dates
CREATE OR REPLACE FUNCTION public.trip_upload_open(_trip_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = _trip_id
      AND t.start_date IS NOT NULL AND t.end_date IS NOT NULL
      AND (now() AT TIME ZONE 'Asia/Kolkata')::date BETWEEN t.start_date AND t.end_date
  )
$$;
GRANT EXECUTE ON FUNCTION public.trip_upload_open(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.memories_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.media_type <> 'photo' THEN
    RAISE EXCEPTION 'Only photo uploads are allowed';
  END IF;
  IF NOT public.is_admin() THEN
    IF NEW.trip_id IS NULL THEN
      RAISE EXCEPTION 'Select a trip before uploading photos';
    END IF;
    IF NOT public.trip_upload_open(NEW.trip_id) THEN
      RAISE EXCEPTION 'Photo upload is open only during the trip dates';
    END IF;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_memories_guard ON public.memories;
CREATE TRIGGER trg_memories_guard BEFORE INSERT ON public.memories
FOR EACH ROW EXECUTE FUNCTION public.memories_guard();

-- 6. notifications fan-out
CREATE OR REPLACE FUNCTION public.notify_members(_title text, _body text, _kind text, _exclude uuid DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, body, kind)
  SELECT ur.user_id, _title, _body, _kind
  FROM (SELECT DISTINCT user_id FROM public.user_roles) ur
  WHERE _exclude IS NULL OR ur.user_id <> _exclude;
END; $$;

CREATE OR REPLACE FUNCTION public.notify_one(_user uuid, _title text, _body text, _kind text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _user IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, body, kind) VALUES (_user, _title, _body, _kind);
  END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.notify_admins(_title text, _body text, _kind text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, body, kind)
  SELECT user_id, _title, _body, _kind FROM public.user_roles WHERE role = 'admin';
END; $$;

-- chat messages
CREATE OR REPLACE FUNCTION public.notify_chat()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _n text;
BEGIN
  SELECT COALESCE(full_name, 'Member') INTO _n FROM public.profiles WHERE id = NEW.user_id;
  PERFORM public.notify_members(COALESCE(_n,'Member') || ' sent a message',
    COALESCE(NULLIF(left(NEW.body, 90), ''), '📎 media'), 'chat', NEW.user_id);
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_notify_chat ON public.chat_messages;
CREATE TRIGGER trg_notify_chat AFTER INSERT ON public.chat_messages
FOR EACH ROW EXECUTE FUNCTION public.notify_chat();

-- payments
CREATE OR REPLACE FUNCTION public.notify_payment_new()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _n text;
BEGIN
  SELECT COALESCE(full_name, 'Member') INTO _n FROM public.profiles WHERE id = NEW.user_id;
  PERFORM public.notify_admins('Payment submitted',
    _n || ' submitted ₹' || NEW.amount::text || ' (UTR ' || NEW.utr || ')', 'payment');
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_notify_payment_new ON public.payments;
CREATE TRIGGER trg_notify_payment_new AFTER INSERT ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.notify_payment_new();

CREATE OR REPLACE FUNCTION public.notify_payment_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status <> OLD.status THEN
    PERFORM public.notify_one(NEW.user_id,
      CASE WHEN NEW.status = 'verified' THEN 'Payment verified ✅' ELSE 'Payment ' || NEW.status::text END,
      '₹' || NEW.amount::text || ' • UTR ' || NEW.utr, 'payment');
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_notify_payment_status ON public.payments;
CREATE TRIGGER trg_notify_payment_status AFTER UPDATE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.notify_payment_status();

-- live sessions
CREATE OR REPLACE FUNCTION public.notify_live()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.is_active THEN
    PERFORM public.notify_members('🔴 Live started', NEW.title, 'live', NEW.host_id);
  ELSIF TG_OP = 'UPDATE' AND NEW.is_active IS DISTINCT FROM OLD.is_active THEN
    PERFORM public.notify_members(
      CASE WHEN NEW.is_active THEN '🔴 Live started' ELSE '⏹ Live ended' END, NEW.title, 'live', NEW.host_id);
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_notify_live ON public.live_sessions;
CREATE TRIGGER trg_notify_live AFTER INSERT OR UPDATE ON public.live_sessions
FOR EACH ROW EXECUTE FUNCTION public.notify_live();

-- trips
CREATE OR REPLACE FUNCTION public.notify_trip()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.notify_members('🧭 New trip: ' || NEW.name, COALESCE(NEW.destination,''), 'trip', NULL);
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM public.notify_members('Trip update: ' || NEW.name, 'Status: ' || NEW.status::text, 'trip', NULL);
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_notify_trip ON public.trips;
CREATE TRIGGER trg_notify_trip AFTER INSERT OR UPDATE ON public.trips
FOR EACH ROW EXECUTE FUNCTION public.notify_trip();

-- new member joins
CREATE OR REPLACE FUNCTION public.notify_new_member()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.notify_members('👋 New member joined', COALESCE(NEW.full_name,'Member'), 'member', NEW.id);
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_notify_new_member ON public.profiles;
CREATE TRIGGER trg_notify_new_member AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.notify_new_member();

-- participation confirmation
CREATE OR REPLACE FUNCTION public.notify_participation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _n text;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
  SELECT COALESCE(full_name, 'Member') INTO _n FROM public.profiles WHERE id = NEW.user_id;
  PERFORM public.notify_admins('Trip confirmation', _n || ' → ' || NEW.status::text, 'trip');
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_notify_participation ON public.trip_participation;
CREATE TRIGGER trg_notify_participation AFTER INSERT OR UPDATE ON public.trip_participation
FOR EACH ROW EXECUTE FUNCTION public.notify_participation();

-- allow members to delete their own notifications
DROP POLICY IF EXISTS nt_own_delete ON public.notifications;
CREATE POLICY nt_own_delete ON public.notifications FOR DELETE TO authenticated USING (user_id = auth.uid());
