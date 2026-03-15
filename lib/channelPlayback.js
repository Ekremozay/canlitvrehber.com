import { getCanliTvReference } from "./canlitvReference";
import { canUseInternalStream } from "./safeMode";
import { extractYouTubeVideoId } from "./youtube";

export function getYoutubeLiveLink(channel) {
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

export function hasYoutubePlayback(channel) {
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

export function isChannelPlayable(channel) {
  return canUseInternalStream(channel) || hasYoutubePlayback(channel);
}

export function getChannelPlaybackType(channel) {
  if (canUseInternalStream(channel)) return "internal";
  if (hasYoutubePlayback(channel)) return "youtube";
  return "external";
}
