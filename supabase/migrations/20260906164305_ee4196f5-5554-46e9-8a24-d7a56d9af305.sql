CREATE TABLE public.favourite_videos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  url text NOT NULL,
  video_id text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX favourite_videos_video_id_key ON public.favourite_videos (video_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.favourite_videos TO authenticated;
GRANT ALL ON public.favourite_videos TO service_role;

ALTER TABLE public.favourite_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view favourite videos" ON public.favourite_videos
  FOR SELECT TO authenticated USING (public.is_member());

CREATE POLICY "Members can add their own favourite videos" ON public.favourite_videos
  FOR INSERT TO authenticated WITH CHECK (public.is_member() AND user_id = auth.uid());

CREATE POLICY "Owner or admin can update favourite videos" ON public.favourite_videos
  FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Owner or admin can delete favourite videos" ON public.favourite_videos
  FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.is_admin());

CREATE TRIGGER favourite_videos_updated_at BEFORE UPDATE ON public.favourite_videos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();