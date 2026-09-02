
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure::text AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', r.sig);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', r.sig);
  END LOOP;
END $$;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bootstrap_me(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_trip_wallet(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.archive_trip_financials(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.trip_upload_open(uuid) TO authenticated;
