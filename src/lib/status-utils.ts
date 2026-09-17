export type VideoPlatform = "youtube" | "instagram" | "facebook";

export function parseSharedVideoUrl(rawUrl: string) {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  let platform: VideoPlatform | null = null;
  let thumbnailUrl: string | null = null;

  if (host === "youtu.be" || host.endsWith("youtube.com")) {
    platform = "youtube";
    const parts = url.pathname.split("/").filter(Boolean);
    const videoId = host === "youtu.be" ? parts[0] : url.searchParams.get("v") ?? (parts[0] === "shorts" ? parts[1] : null);
    if (videoId && /^[A-Za-z0-9_-]{6,}$/.test(videoId)) {
      thumbnailUrl = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    }
  } else if (host.endsWith("instagram.com")) {
    platform = "instagram";
  } else if (host.endsWith("facebook.com") || host === "fb.watch") {
    platform = "facebook";
  }

  if (!platform) return null;
  return { platform, originalUrl: url.toString(), thumbnailUrl };
}