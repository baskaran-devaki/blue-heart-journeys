GRANT EXECUTE ON FUNCTION public.is_member() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.current_email() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.current_phone() TO authenticated;
GRANT EXECUTE ON FUNCTION public.trip_upload_open(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bootstrap_me(text) TO authenticated;