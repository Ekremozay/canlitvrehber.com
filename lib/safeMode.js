import { isReferenceExternalOnly, isReferencePlayable } from "./canlitvReference";

function parseCsvList(value) {
  return new Set(
    String(value || "")
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean)
  );
}

export const SAFE_MODE_ENABLED =
  String(process.env.NEXT_PUBLIC_SAFE_MODE ?? "true").toLowerCase() === "true";
export const SAFE_MODE_LEVEL = String(
  process.env.NEXT_PUBLIC_SAFE_MODE_LEVEL || "strict"
).toLowerCase();

const DEFAULT_BALANCED_CHANNEL_IDS = "trt1,trthaber,trtspor,trtbelgesel,trtcocuk";

export const SAFE_DIRECT_CHANNEL_IDS = parseCsvList(
  process.env.NEXT_PUBLIC_SAFE_DIRECT_CHANNEL_IDS || DEFAULT_BALANCED_CHANNEL_IDS
);

export const SAFE_DIRECT_HOSTS = parseCsvList(
  process.env.NEXT_PUBLIC_SAFE_DIRECT_HOSTS
);

export const SAFE_FORCE_EXTERNAL_CHANNEL_IDS = parseCsvList(
  process.env.NEXT_PUBLIC_SAFE_FORCE_EXTERNAL_CHANNEL_IDS
);

export function getChannelStreamOptions(channel) {
  if (!channel) return [];

  if (Array.isArray(channel.streamOptions) && channel.streamOptions.length > 0) {
    return channel.streamOptions.filter((item) => Boolean(item?.url));
  }

  const generated = [];

  if (channel.stream) {
    generated.push({
      id: `${channel.id}-src-main`,
      label: "Ana Kaynak",
      url: channel.stream,
    });
  }

  (channel.fallbackStreams || []).forEach((url, index) => {
    if (!url) return;
    generated.push({
      id: `${channel.id}-src-fallback-${index + 1}`,
      label: `Yedek ${index + 1}`,
      url,
    });
  });

  return generated;
}

export function channelHasInternalStream(channel) {
  return getChannelStreamOptions(channel).length > 0;
}

function resolveRealUrl(inputUrl) {
  if (!inputUrl) return "";

  if (inputUrl.startsWith("/api/proxy?")) {
    try {
      const wrappedUrl = new URL(`http://localhost${inputUrl}`);
      return wrappedUrl.searchParams.get("url") || "";
    } catch {
      return "";
    }
  }

  return inputUrl;
}

function getUrlHost(inputUrl) {
  const raw = resolveRealUrl(inputUrl);
  if (!raw) return "";

  try {
    return new URL(raw).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function isAllowlistedByHost(channel) {
  if (SAFE_DIRECT_HOSTS.size === 0) return false;

  const options = getChannelStreamOptions(channel);
  return options.some((option) => SAFE_DIRECT_HOSTS.has(getUrlHost(option.url)));
}

function isAllowlistedById(channel) {
  return SAFE_DIRECT_CHANNEL_IDS.has(String(channel?.id || "").toLowerCase());
}

function isForceExternalById(channel) {
  return SAFE_FORCE_EXTERNAL_CHANNEL_IDS.has(String(channel?.id || "").toLowerCase());
}

export function canUseInternalStream(channel) {
  if (!channelHasInternalStream(channel)) return false;
  if (!SAFE_MODE_ENABLED) return true;
  if (isForceExternalById(channel)) return false;
  if (isReferenceExternalOnly(channel)) return false;

  const allowlisted = isAllowlistedById(channel) || isAllowlistedByHost(channel);

  // strict: sadece manuel izinli kanallar
  if (SAFE_MODE_LEVEL === "strict") {
    return allowlisted;
  }

  // reference: canlitv referansi aciksa oynat, yoksa allowlist
  if (SAFE_MODE_LEVEL === "reference") {
    if (isReferencePlayable(channel)) return true;
    return allowlisted;
  }

  // balanced fallback
  if (isReferencePlayable(channel)) return true;
  return allowlisted;
}

export function isBlockedBySafeMode(channel) {
  return SAFE_MODE_ENABLED && channelHasInternalStream(channel) && !canUseInternalStream(channel);
}
