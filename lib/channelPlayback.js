import { getCanliTvReference } from "./canlitvReference";
import { extractYouTubeVideoId } from "./youtube";

const YOUTUBE_LIVE_OVERRIDES = {
  haberturktv: "https://www.youtube.com/@HaberturkTV/live",
  halktv: "https://www.youtube.com/@Halktvkanali/live",
  sozcutv: "https://www.youtube.com/@SozcuTelevizyonu/live",
  tv100: "https://www.youtube.com/@tv100/live",
};

export function getYoutubeLiveLink(channel) {
  const overrideUrl = YOUTUBE_LIVE_OVERRIDES[String(channel?.id || "").toLowerCase()];
  if (overrideUrl) {
    return {
      url: overrideUrl,
      label: "YouTube Canli",
      type: "youtube-live",
    };
  }

  const directLink = channel?.externalLinks?.find((item) => item.type === "youtube-live") || null;
  if (directLink?.url) return directLink;

  const canliTvReference = getCanliTvReference(channel);
  if (canliTvReference?.mode !== "embedded_youtube" || !canliTvReference.target) {
    return null;
  }

  const decodedTarget = decodeURIComponent(String(canliTvReference.target));
  const videoId = extractYouTubeVideoId(decodedTarget);
  if (!videoId) return null;

  return {
    url: `https://www.youtube.com/watch?v=${videoId}`,
    label: "YouTube Canli",
    type: "youtube-live",
  };
}

export function hasYoutubeCandidate(channel) {
  return Boolean(getYoutubeLiveLink(channel)?.url);
}

export function getOfficialLiveLink(channel) {
  const fromChannel =
    channel?.externalLinks?.find((item) => item.type === "official-live") ||
    channel?.externalLinks?.find((item) => item.type === "website") ||
    null;

  if (fromChannel) return fromChannel;

  const canliTvReference = getCanliTvReference(channel);
  if (canliTvReference?.mode === "telif_redirect" && canliTvReference.target) {
    return {
      url: canliTvReference.target,
      label: "Resmi Canli",
      type: "official-live",
    };
  }

  return null;
}

export function isChannelPlayable(_channel) {
  return false;
}

export function getChannelPlaybackType(_channel) {
  return "external";
}
