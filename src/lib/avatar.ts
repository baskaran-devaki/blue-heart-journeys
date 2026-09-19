import { supabase } from "@/integrations/supabase/client";

const AVATAR_BUCKET = "memories";
const AVATAR_URL_TTL_SECONDS = 60 * 60;

export function avatarStoragePath(value: string | null | undefined): string | null {
  if (!value) return null;
  if (!/^https?:\/\//i.test(value)) return value.replace(/^\/+/, "");

  try {
    const url = new URL(value);
    const marker = `/storage/v1/object/sign/${AVATAR_BUCKET}/`;
    const index = url.pathname.indexOf(marker);
    return index >= 0 ? decodeURIComponent(url.pathname.slice(index + marker.length)) : null;
  } catch {
    return null;
  }
}

export async function shortLivedAvatarUrl(value: string | null | undefined): Promise<string | null> {
  if (!value) return null;
  const path = avatarStoragePath(value);
  if (!path) return /^https?:\/\//i.test(value) ? value : null;

  const { data, error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .createSignedUrl(path, AVATAR_URL_TTL_SECONDS);
  return error ? null : data.signedUrl;
}

export async function resolveAvatarRows<T extends { avatar_url: string | null }>(rows: T[]): Promise<T[]> {
  return Promise.all(
    rows.map(async (row) => ({ ...row, avatar_url: await shortLivedAvatarUrl(row.avatar_url) })),
  );
}