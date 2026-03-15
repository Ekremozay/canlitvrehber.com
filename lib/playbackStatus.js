import { CHANNELS } from "./channels";
import { getOfficialLiveLink, getYoutubeLiveLink } from "./channelPlayback";
import { canUseInternalStream } from "./safeMode";
import { getYoutubeLiveStatus } from "./youtube";

const PLAYBACK_STORE_KEY = "__streamTvPlaybackStatusStore";
const PLAYBACK_TTL_MS = 60 * 60 * 1000;
const PLAYBACK_CONCURRENCY = 6;

function getStore() {
  if (!globalThis[PLAYBACK_STORE_KEY]) {
    globalThis[PLAYBACK_STORE_KEY] = {
      snapshot: null,
      lastRunAt: 0,
      running: null,
    };
  }

  return globalThis[PLAYBACK_STORE_KEY];
}

function toPositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value || ""), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

export function getBasePlaybackStatus(channel) {
  const internalPlayable = canUseInternalStream(channel);
  const youtubeLink = getYoutubeLiveLink(channel);
  const officialLink = getOfficialLiveLink(channel);

  return {
    channelId: channel?.id || "",
    playable: internalPlayable,
    playbackType: internalPlayable ? "internal" : "external",
    verified: internalPlayable,
    internalPlayable,
    youtubeCandidate: Boolean(youtubeLink?.url),
    youtubeUrl: youtubeLink?.url || "",
    officialUrl: officialLink?.url || "",
  };
}

async function resolveChannelPlaybackStatus(channel) {
  const base = getBasePlaybackStatus(channel);
  if (!channel) return base;
  if (base.internalPlayable) {
    return {
      ...base,
      checkedAt: new Date().toISOString(),
    };
  }
  if (!base.youtubeCandidate || !base.youtubeUrl) {
    return {
      ...base,
      verified: true,
      youtubeReason: "missing_youtube_source",
      checkedAt: new Date().toISOString(),
    };
  }

  const youtubeStatus = await getYoutubeLiveStatus(base.youtubeUrl);
  if (youtubeStatus.available) {
    return {
      channelId: channel.id,
      playable: true,
      playbackType: "youtube",
      verified: true,
      youtubeCandidate: true,
      youtubeUrl: base.youtubeUrl,
      embedUrl: youtubeStatus.embedUrl || "",
      liveUrl: youtubeStatus.liveUrl || "",
      watchUrl: youtubeStatus.watchUrl || base.youtubeUrl,
      youtubeTitle: youtubeStatus.title || "",
      checkedAt: youtubeStatus.checkedAt || new Date().toISOString(),
    };
  }

  return {
    channelId: channel.id,
    playable: false,
    playbackType: "external",
    verified: true,
    youtubeCandidate: true,
    youtubeUrl: base.youtubeUrl,
    watchUrl: youtubeStatus.watchUrl || base.youtubeUrl,
    youtubeReason: youtubeStatus.reason || "",
    checkedAt: youtubeStatus.checkedAt || new Date().toISOString(),
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

async function buildPlaybackSnapshot(channelIds) {
  const idSet =
    Array.isArray(channelIds) && channelIds.length > 0
      ? new Set(channelIds.map((item) => String(item || "").trim()).filter(Boolean))
      : null;

  const selectedChannels = idSet
    ? CHANNELS.filter((channel) => idSet.has(channel.id))
    : CHANNELS;

  const concurrency = toPositiveInt(process.env.PLAYBACK_STATUS_CONCURRENCY, PLAYBACK_CONCURRENCY);
  const results = await mapWithConcurrency(selectedChannels, concurrency, resolveChannelPlaybackStatus);
  const map = Object.fromEntries(results.map((item) => [item.channelId, item]));

  return {
    checkedAt: new Date().toISOString(),
    statuses: map,
  };
}

export async function getPlaybackSnapshot(options = {}) {
  const { force = false, channelIds = null } = options;
  const store = getStore();
  const ttlMs = toPositiveInt(process.env.PLAYBACK_STATUS_TTL_MS, PLAYBACK_TTL_MS);
  const limitedScope = Array.isArray(channelIds) && channelIds.length > 0;
  const isFresh = Date.now() - store.lastRunAt < ttlMs;

  if (!force && !limitedScope && store.snapshot && isFresh) {
    return store.snapshot;
  }

  if (limitedScope) {
    return buildPlaybackSnapshot(channelIds);
  }

  if (!store.running) {
    store.running = buildPlaybackSnapshot(null)
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
