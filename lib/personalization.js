export const FAVORITES_STORAGE_KEY = "streamtv:favorites";
export const RECENTLY_WATCHED_STORAGE_KEY = "streamtv:recently-watched";
export const MAX_RECENTLY_WATCHED = 12;

export function normalizeFavoriteIds(value) {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(
      value
        .map((item) => String(item || "").trim())
        .filter(Boolean)
    )
  );
}

export function normalizeRecentlyWatched(value) {
  if (!Array.isArray(value)) return [];

  const entries = value
    .map((item) => {
      if (!item || typeof item !== "object") return null;

      const id = String(item.id || "").trim();
      const watchedAt = String(item.watchedAt || "").trim();
      if (!id || !watchedAt) return null;

      return { id, watchedAt };
    })
    .filter(Boolean)
    .sort((a, b) => new Date(b.watchedAt).getTime() - new Date(a.watchedAt).getTime());

  const seen = new Set();
  const output = [];

  for (const entry of entries) {
    if (seen.has(entry.id)) continue;
    seen.add(entry.id);
    output.push(entry);
    if (output.length >= MAX_RECENTLY_WATCHED) break;
  }

  return output;
}

export function readStoredJson(key, fallback) {
  if (typeof window === "undefined") return fallback;

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function writeStoredJson(key, value) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota/private mode failures.
  }
}

export function upsertRecentlyWatched(entries, channelId) {
  const id = String(channelId || "").trim();
  if (!id) return normalizeRecentlyWatched(entries);

  const nextEntries = [
    { id, watchedAt: new Date().toISOString() },
    ...normalizeRecentlyWatched(entries).filter((item) => item.id !== id),
  ];

  return normalizeRecentlyWatched(nextEntries);
}
