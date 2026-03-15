import { CHANNELS } from "./channels.js";

const STORE_KEY = "__streamTvLinkHealthStore";

const DEFAULT_TTL_MS = 15 * 60 * 1000;
const DEFAULT_TIMEOUT_MS = 7000;
const DEFAULT_CONCURRENCY = 8;
const DEFAULT_MAX_SOURCES = 3;

function toPositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value || ""), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function asSingle(value) {
  if (Array.isArray(value)) return value[0];
  return value;
}

function getStore() {
  if (!globalThis[STORE_KEY]) {
    globalThis[STORE_KEY] = {
      running: null,
      lastRunAt: 0,
      snapshot: null,
    };
  }
  return globalThis[STORE_KEY];
}

function getInternalStreamOptions(channel) {
  if (!channel) return [];

  if (Array.isArray(channel.streamOptions) && channel.streamOptions.length > 0) {
    return channel.streamOptions
      .filter((item) => Boolean(item?.url))
      .map((item, idx) => ({
        id: item.id || `${channel.id}-src-${idx + 1}`,
        label: item.label || `Kaynak ${idx + 1}`,
        url: item.url,
      }));
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

function shouldUseDirectHealthUrl(rawUrl) {
  const target = unwrapStreamUrl(rawUrl);
  if (!target?.url) return false;

  try {
    const hostname = new URL(target.url).hostname.toLowerCase();
    return hostname.endsWith(".medya.trt.com.tr");
  } catch {
    return false;
  }
}

function unwrapStreamUrl(rawUrl) {
  if (!rawUrl) return null;

  if (rawUrl.startsWith("/api/proxy?")) {
    try {
      const wrapped = new URL(`http://localhost${rawUrl}`);
      const target = asSingle(wrapped.searchParams.get("url"));
      if (!target) return null;
      return {
        url: target,
        ref: asSingle(wrapped.searchParams.get("ref")) || "",
        ua: asSingle(wrapped.searchParams.get("ua")) || "",
      };
    } catch {
      return null;
    }
  }

  try {
    const absolute = new URL(rawUrl);
    return {
      url: absolute.toString(),
      ref: "",
      ua: "",
    };
  } catch {
    return null;
  }
}

function isPlaylistUrl(url) {
  return String(url || "").toLowerCase().includes(".m3u8");
}

async function checkTarget(target, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const headers = new Headers();

  headers.set("accept", "application/vnd.apple.mpegurl,*/*;q=0.8");
  headers.set("user-agent", target.ua || "Mozilla/5.0 (StreamTV LinkHealth)");
  if (target.ref) headers.set("referer", target.ref);

  try {
    const response = await fetch(target.url, {
      method: "GET",
      headers,
      redirect: "follow",
      signal: controller.signal,
    });

    const contentType = (response.headers.get("content-type") || "").toLowerCase();
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        contentType,
        reason: "upstream_not_ok",
      };
    }

    if (!isPlaylistUrl(target.url)) {
      return {
        ok: true,
        status: response.status,
        contentType,
      };
    }

    const bodyText = await response.text();
    const firstChunk = bodyText.slice(0, 512);
    const looksLikePlaylist = firstChunk.includes("#EXTM3U");
    const looksLikeHtmlError =
      contentType.includes("text/html") || firstChunk.toLowerCase().includes("<html");

    if (!looksLikePlaylist && looksLikeHtmlError) {
      return {
        ok: false,
        status: response.status,
        contentType,
        reason: "html_error_body",
      };
    }

    return {
      ok: true,
      status: response.status,
      contentType,
    };
  } catch (error) {
    const timedOut =
      error?.name === "AbortError" || String(error?.cause?.code || "").includes("TIMEOUT");
    return {
      ok: false,
      status: timedOut ? "timeout" : "network_error",
      error: error?.message || String(error),
      reason: timedOut ? "timeout" : "network_error",
    };
  } finally {
    clearTimeout(timer);
  }
}

async function checkChannel(channel) {
  const timeoutMs = toPositiveInt(process.env.LINK_CHECK_TIMEOUT_MS, DEFAULT_TIMEOUT_MS);
  const maxSources = toPositiveInt(
    process.env.LINK_CHECK_MAX_SOURCES_PER_CHANNEL,
    DEFAULT_MAX_SOURCES
  );

  const streamOptions = getInternalStreamOptions(channel).slice(0, maxSources);
  const attempts = [];

  for (const option of streamOptions) {
    const target = shouldUseDirectHealthUrl(option.url)
      ? unwrapStreamUrl(unwrapStreamUrl(option.url)?.url || "")
      : unwrapStreamUrl(option.url);
    if (!target?.url) {
      attempts.push({
        optionId: option.id,
        label: option.label,
        targetUrl: "",
        ok: false,
        status: "invalid_url",
        reason: "invalid_url",
      });
      continue;
    }

    const result = await checkTarget(target, timeoutMs);
    attempts.push({
      optionId: option.id,
      label: option.label,
      targetUrl: target.url,
      ok: result.ok,
      status: result.status,
      contentType: result.contentType || "",
      reason: result.reason || "",
      checkedAt: new Date().toISOString(),
    });

    if (result.ok) {
      return {
        channelId: channel.id,
        channelName: channel.name,
        ok: true,
        checkedOptions: attempts.length,
        workingOptionId: option.id,
        attempts,
      };
    }
  }

  return {
    channelId: channel.id,
    channelName: channel.name,
    ok: false,
    checkedOptions: attempts.length,
    workingOptionId: "",
    attempts,
  };
}

async function mapWithConcurrency(items, concurrency, worker) {
  const output = new Array(items.length);
  let cursor = 0;

  async function runWorker() {
    while (true) {
      const idx = cursor;
      cursor += 1;
      if (idx >= items.length) return;
      output[idx] = await worker(items[idx], idx);
    }
  }

  const jobs = Array.from({ length: Math.max(1, concurrency) }, () => runWorker());
  await Promise.all(jobs);
  return output;
}

function summarize(results, startedAt, completedAt) {
  const checkedCount = results.length;
  const okCount = results.filter((item) => item.ok).length;
  const failCount = checkedCount - okCount;
  const successRate = checkedCount ? Number(((okCount / checkedCount) * 100).toFixed(1)) : 0;

  return {
    startedAt,
    completedAt,
    durationMs: new Date(completedAt).getTime() - new Date(startedAt).getTime(),
    checkedCount,
    okCount,
    failCount,
    successRate,
    channels: results,
  };
}

async function runFullHealthCheck(maxChannels) {
  const startedAt = new Date().toISOString();
  const concurrency = toPositiveInt(process.env.LINK_CHECK_CONCURRENCY, DEFAULT_CONCURRENCY);

  const candidates = CHANNELS.filter((channel) => getInternalStreamOptions(channel).length > 0);
  const limit = toPositiveInt(maxChannels, candidates.length);
  const selected = candidates.slice(0, Math.min(limit, candidates.length));

  const results = await mapWithConcurrency(selected, concurrency, async (channel) => {
    return checkChannel(channel);
  });

  const completedAt = new Date().toISOString();
  return summarize(results, startedAt, completedAt);
}

export function getCachedLinkHealthSnapshot() {
  return getStore().snapshot;
}

export async function getLinkHealthSnapshot(options = {}) {
  const { force = false, maxChannels } = options;
  const store = getStore();
  const ttlMs = toPositiveInt(process.env.LINK_CHECK_TTL_MS, DEFAULT_TTL_MS);
  const isFresh = Date.now() - store.lastRunAt < ttlMs;

  if (!force && store.snapshot && isFresh) {
    return store.snapshot;
  }

  if (!store.running) {
    store.running = runFullHealthCheck(maxChannels)
      .then((snapshot) => {
        store.snapshot = snapshot;
        store.lastRunAt = Date.now();
        return snapshot;
      })
      .finally(() => {
        store.running = null;
      });
  }

  return store.running;
}

export async function checkSingleChannelHealth(channelId) {
  const targetId = String(channelId || "").trim();
  if (!targetId) return null;

  const channel = CHANNELS.find((item) => item.id === targetId);
  if (!channel) return null;

  return checkChannel(channel);
}

export function triggerBackgroundLinkHealthCheck() {
  const store = getStore();
  const ttlMs = toPositiveInt(process.env.LINK_CHECK_TTL_MS, DEFAULT_TTL_MS);
  const isFresh = Date.now() - store.lastRunAt < ttlMs;

  if (store.running || isFresh) return;

  store.running = runFullHealthCheck()
    .then((snapshot) => {
      store.snapshot = snapshot;
      store.lastRunAt = Date.now();
      return snapshot;
    })
    .catch((error) => {
      console.error("[link-health] background check failed", error);
      return null;
    })
    .finally(() => {
      store.running = null;
    });
}
