UPDATE public.profiles
SET avatar_url = regexp_replace(
  split_part(avatar_url, '?', 1),
  '^.*/storage/v1/object/sign/memories/',
  ''
)
WHERE avatar_url LIKE '%/storage/v1/object/sign/memories/%';

UPDATE public.member_invites
SET avatar_url = regexp_replace(
  split_part(avatar_url, '?', 1),
  '^.*/storage/v1/object/sign/memories/',
  ''
)
WHERE avatar_url LIKE '%/storage/v1/object/sign/memories/%';