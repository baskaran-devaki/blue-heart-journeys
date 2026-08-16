REVOKE EXECUTE ON FUNCTION public.current_phone() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_member() FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.bootstrap_me(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.on_payment_verified() FROM anon, authenticated;

CREATE POLICY "bhg media read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id IN ('memories','chat-media','trip-images') AND public.is_member());

CREATE POLICY "bhg media upload" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id IN ('memories','chat-media','trip-images')
  AND public.is_member()
  AND (public.is_admin() OR (storage.foldername(name))[1] = auth.uid()::text)
);

CREATE POLICY "bhg media delete" ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id IN ('memories','chat-media','trip-images')
  AND (public.is_admin() OR (storage.foldername(name))[1] = auth.uid()::text)
);