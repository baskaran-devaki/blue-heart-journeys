CREATE TABLE public.ai_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'புதிய உரையாடல்',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_threads TO authenticated;
GRANT ALL ON public.ai_threads TO service_role;
ALTER TABLE public.ai_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY ai_threads_owner_select ON public.ai_threads FOR SELECT TO authenticated
  USING (public.is_member() AND user_id = auth.uid());
CREATE POLICY ai_threads_owner_insert ON public.ai_threads FOR INSERT TO authenticated
  WITH CHECK (public.is_member() AND user_id = auth.uid());
CREATE POLICY ai_threads_owner_update ON public.ai_threads FOR UPDATE TO authenticated
  USING (public.is_member() AND user_id = auth.uid())
  WITH CHECK (public.is_member() AND user_id = auth.uid());
CREATE POLICY ai_threads_owner_delete ON public.ai_threads FOR DELETE TO authenticated
  USING (public.is_member() AND user_id = auth.uid());
CREATE TRIGGER ai_threads_updated_at BEFORE UPDATE ON public.ai_threads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.ai_messages (
  id text PRIMARY KEY,
  thread_id uuid NOT NULL REFERENCES public.ai_threads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL DEFAULT '',
  parts jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.ai_messages TO authenticated;
GRANT ALL ON public.ai_messages TO service_role;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY ai_messages_owner_select ON public.ai_messages FOR SELECT TO authenticated
  USING (public.is_member() AND user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.ai_threads t WHERE t.id = thread_id AND t.user_id = auth.uid()
  ));
CREATE POLICY ai_messages_owner_insert ON public.ai_messages FOR INSERT TO authenticated
  WITH CHECK (public.is_member() AND user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.ai_threads t WHERE t.id = thread_id AND t.user_id = auth.uid()
  ));
CREATE POLICY ai_messages_owner_delete ON public.ai_messages FOR DELETE TO authenticated
  USING (public.is_member() AND user_id = auth.uid());
CREATE INDEX ai_messages_thread_created_idx ON public.ai_messages (thread_id, created_at);

CREATE TABLE public.friend_statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status_type text NOT NULL CHECK (status_type IN ('ai', 'video')),
  content text NOT NULL DEFAULT '',
  ai_message_id text REFERENCES public.ai_messages(id) ON DELETE SET NULL,
  original_url text,
  platform text CHECK (platform IS NULL OR platform IN ('youtube', 'instagram', 'facebook')),
  preview_title text,
  thumbnail_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  CONSTRAINT friend_status_type_fields CHECK (
    (status_type = 'ai' AND ai_message_id IS NOT NULL AND content <> '' AND original_url IS NULL)
    OR
    (status_type = 'video' AND ai_message_id IS NULL AND original_url IS NOT NULL AND platform IS NOT NULL)
  ),
  CONSTRAINT friend_status_exact_expiry CHECK (expires_at = created_at + interval '24 hours')
);
GRANT SELECT, INSERT, DELETE ON public.friend_statuses TO authenticated;
GRANT ALL ON public.friend_statuses TO service_role;
ALTER TABLE public.friend_statuses ENABLE ROW LEVEL SECURITY;
CREATE POLICY friend_statuses_active_select ON public.friend_statuses FOR SELECT TO authenticated
  USING (public.is_member() AND expires_at > now());
CREATE POLICY friend_statuses_owner_insert ON public.friend_statuses FOR INSERT TO authenticated
  WITH CHECK (
    public.is_member()
    AND user_id = auth.uid()
    AND expires_at = created_at + interval '24 hours'
    AND (
      (status_type = 'video' AND original_url IS NOT NULL)
      OR
      (status_type = 'ai' AND EXISTS (
        SELECT 1 FROM public.ai_messages m
        WHERE m.id = ai_message_id
          AND m.user_id = auth.uid()
          AND m.role = 'assistant'
          AND m.content = friend_statuses.content
      ))
    )
  );
CREATE POLICY friend_statuses_owner_admin_delete ON public.friend_statuses FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());
CREATE INDEX friend_statuses_active_created_idx ON public.friend_statuses (expires_at, created_at DESC);

CREATE TABLE public.friend_status_likes (
  status_id uuid NOT NULL REFERENCES public.friend_statuses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (status_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.friend_status_likes TO authenticated;
GRANT ALL ON public.friend_status_likes TO service_role;
ALTER TABLE public.friend_status_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY friend_status_likes_active_select ON public.friend_status_likes FOR SELECT TO authenticated
  USING (public.is_member() AND EXISTS (
    SELECT 1 FROM public.friend_statuses s WHERE s.id = status_id AND s.expires_at > now()
  ));
CREATE POLICY friend_status_likes_self_insert ON public.friend_status_likes FOR INSERT TO authenticated
  WITH CHECK (public.is_member() AND user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.friend_statuses s WHERE s.id = status_id AND s.expires_at > now()
  ));
CREATE POLICY friend_status_likes_self_delete ON public.friend_status_likes FOR DELETE TO authenticated
  USING (user_id = auth.uid());
CREATE INDEX friend_status_likes_status_idx ON public.friend_status_likes (status_id);