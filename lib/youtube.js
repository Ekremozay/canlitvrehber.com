const YOUTUBE_CACHE_KEY = "__streamTvYoutubeLiveCache";
const YOUTUBE_TTL_MS = 60 * 60 * 1000;
const YOUTUBE_TIMEOUT_MS = 12000;

function getYoutubeCacheStore() {
  if (!globalThis[YOUTUBE_CACHE_KEY]) {
    globalThis[YOUTUBE_CACHE_KEY] = {
      entries: new Map(),
      inflight: new Map(),
    };
  }

  return globalThis[YOUTUBE_CACHE_KEY];
}

function isYouTubeHostname(hostname) {
  const host = String(hostname || "").toLowerCase();
  return (
    host === "youtube.com" ||
    host === "www.youtube.com" ||
    host === "m.youtube.com" ||
    host === "youtu.be" ||
    host === "www.youtu.be"
  );
}

export function isYouTubeUrl(rawUrl) {
  try {
    return isYouTubeHostname(new URL(rawUrl).hostname);
  } catch {
    return false;
  }
}

export function extractYouTubeVideoId(rawUrl) {
  if (!rawUrl) return "";

  try {
    const url = new URL(rawUrl);

    if (url.hostname.includes("youtu.be")) {
      const shortId = url.pathname.replace(/^\/+/, "").split("/")[0];
      return /^[A-Za-z0-9_-]{11}$/.test(shortId) ? shortId : "";
    }

    const watchId = url.searchParams.get("v") || "";
    if (/^[A-Za-z0-9_-]{11}$/.test(watchId)) {
      return watchId;
    }

    const pathParts = url.pathname.split("/").filter(Boolean);
    const supportedPathRoots = ["embed", "shorts", "live"];
    const embedIndex = pathParts.findIndex((part) => supportedPathRoots.includes(part));
    if (embedIndex >= 0) {
      const embeddedId = pathParts[embedIndex + 1] || "";
      return /^[A-Za-z0-9_-]{11}$/.test(embeddedId) ? embeddedId : "";
    }
  } catch {
    return "";
  }

  return "";
}

export function buildYouTubeEmbedUrl(videoId) {
  if (!/^[A-Za-z0-9_-]{11}$/.test(String(videoId || ""))) return "";
  const params = new URLSearchParams({
    autoplay: "1",
    controls: "1",
    rel: "0",
    playsinline: "1",
  });
  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
}

export function buildYouTubeLiveUrl(videoId) {
  if (!/^[A-Za-z0-9_-]{11}$/.test(String(videoId || ""))) return "";
  return `https://www.youtube.com/live/${videoId}`;
}

function decodeHtmlValue(value) {
  return String(value || "")
    .replace(/\\u0026/g, "&")
    .replace(/\\\//g, "/")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function extractTitleFromHtml(html) {
  const ogTitle = html.match(/<meta property="og:title" content="([^"]+)"/i)?.[1];
  if (ogTitle) return decodeHtmlValue(ogTitle);

  const titleTag = html.match(/<title>([^<]+)<\/title>/i)?.[1];
  if (titleTag) return decodeHtmlValue(titleTag.replace(/\s*-\s*YouTube\s*$/i, ""));

  return "";
}

function extractLiveVideoIdFromHtml(html) {
  const patterns = [
    /"videoId":"([A-Za-z0-9_-]{11})".{0,500}"isLive":true/s,
    /"isLive":true.{0,500}"videoId":"([A-Za-z0-9_-]{11})"/s,
    /"videoDetails":\{"videoId":"([A-Za-z0-9_-]{11})".{0,500}"isLiveContent":true/s,
    /"videoId":"([A-Za-z0-9_-]{11})".{0,500}"isLiveContent":true/s,
    /"canonicalBaseUrl":"\/watch\?v=([A-Za-z0-9_-]{11})"/,
    /"hlsManifestUrl":"[^"]+".{0,300}"videoId":"([A-Za-z0-9_-]{11})"/s,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return match[1];
  }

  return "";
}

function looksLikeLiveHtml(html) {
  return (
    /"isLive":true/.test(html) ||
    /"isLiveContent":true/.test(html) ||
    /liveStreamabilityRenderer/.test(html) ||
    /"hlsManifestUrl":/.test(html)
  );
}

async function fetchYoutubeLiveStatus(rawUrl) {
  if (!isYouTubeUrl(rawUrl)) {
    return {
      available: false,
      reason: "invalid_youtube_url",
      sourceUrl: rawUrl,
      checkedAt: new Date().toISOString(),
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), YOUTUBE_TIMEOUT_MS);

  try {
    const response = await fetch(rawUrl, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": "Mozilla/5.0 (StreamTV YouTube Resolver)",
        "accept-language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    const resolvedUrl = response.url || rawUrl;
    const html = await response.text();
    const liveVideoId = extractLiveVideoIdFromHtml(html) || extractYouTubeVideoId(resolvedUrl);
    const liveDetected = Boolean(liveVideoId) && looksLikeLiveHtml(html);
    const title = extractTitleFromHtml(html);

    if (!response.ok || !liveDetected) {
      return {
        available: false,
        reason: response.ok ? "live_not_found" : `upstream_${response.status}`,
        sourceUrl: rawUrl,
        resolvedUrl,
        title,
        checkedAt: new Date().toISOString(),
      };
    }

    return {
      available: true,
      sourceUrl: rawUrl,
      resolvedUrl,
      videoId: liveVideoId,
      embedUrl: buildYouTubeEmbedUrl(liveVideoId),
      liveUrl: buildYouTubeLiveUrl(liveVideoId),
      watchUrl: `https://www.youtube.com/watch?v=${liveVideoId}`,
      title,
      checkedAt: new Date().toISOString(),
    };
  } catch (error) {
    const isTimeout =
      error?.name === "AbortError" || String(error?.cause?.code || "").includes("TIMEOUT");

    return {
      available: false,
      reason: isTimeout ? "timeout" : "network_error",
      sourceUrl: rawUrl,
      checkedAt: new Date().toISOString(),
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function getYoutubeLiveStatus(rawUrl, options = {}) {
  const { force = false } = options;
  const key = String(rawUrl || "").trim();
  const store = getYoutubeCacheStore();

  if (!key) {
    return {
      available: false,
      reason: "missing_url",
      sourceUrl: "",
      checkedAt: new Date().toISOString(),
    };
  }

  const cached = store.entries.get(key);
  if (!force && cached && Date.now() - cached.savedAt < YOUTUBE_TTL_MS) {
    return cached.value;
  }

  if (!store.inflight.has(key)) {
    const pending = fetchYoutubeLiveStatus(key)
      .then((value) => {
        store.entries.set(key, {
          savedAt: Date.now(),
          value,
        });
        return value;
      })
      .finally(() => {
        store.inflight.delete(key);
      });

    store.inflight.set(key, pending);
  }

  return store.inflight.get(key);
}
