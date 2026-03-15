import {
  createLemonfoxChatCompletion,
  isLemonfoxConfigured,
  parseJsonContent,
} from "./lemonfox";

export const YERLI_FILMLER_PLAYLIST_ID = "PL-Sj_Na_7HR4_u0A_5SVuB25mAl6hm1SW";
export const YERLI_FILMLER_PLAYLIST_URL = `https://www.youtube.com/playlist?list=${YERLI_FILMLER_PLAYLIST_ID}`;

const REQUEST_HEADERS = {
  "user-agent": "Mozilla/5.0 (compatible; StreamTV YerliFilmler/1.0)",
  "accept-language": "tr-TR,tr;q=0.9,en;q=0.8",
};

const PLAYLIST_CACHE_TTL_MS = 60 * 60 * 1000;
const VIDEO_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const AI_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const NOISY_CAST_TERMS = [
  "full izle",
  "full film",
  "tek parça",
  "yerli film",
  "türk filmi",
  "film adresi",
  "izle",
  "sinema",
];

const GENRE_PATTERNS = [
  { label: "Dram", pattern: /(dram|duygusal)/i },
  { label: "Komedi", pattern: /(komedi|eğlence)/i },
  { label: "Gerilim", pattern: /(gerilim|thriller)/i },
  { label: "Aksiyon", pattern: /(aksiyon|action)/i },
  { label: "Polisiye", pattern: /(polis|dedektif|suç|polisiye)/i },
  { label: "Aile", pattern: /(aile|çocuk)/i },
  { label: "Romantik", pattern: /(romantik|aşk)/i },
  { label: "Macera", pattern: /(macera|serüven)/i },
  { label: "Tarih", pattern: /(tarih|dönem)/i },
];

let playlistCache = {
  expiresAt: 0,
  data: null,
};

const videoCache = new Map();
const aiCache = new Map();

function safeJsonParse(value, fallback = null) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function extractJsonObject(text, marker) {
  const markerIndex = text.indexOf(marker);
  if (markerIndex < 0) return null;

  const startIndex = text.indexOf("{", markerIndex);
  if (startIndex < 0) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = startIndex; index < text.length; index += 1) {
    const char = text[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;

    if (depth === 0) {
      return text.slice(startIndex, index + 1);
    }
  }

  return null;
}

function textFromRuns(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value.simpleText) return value.simpleText;
  if (Array.isArray(value.runs)) {
    return value.runs.map((item) => item?.text || "").join("");
  }
  return "";
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[ğĞ]/g, "g")
    .replace(/[üÜ]/g, "u")
    .replace(/[şŞ]/g, "s")
    .replace(/[ıİ]/g, "i")
    .replace(/[öÖ]/g, "o")
    .replace(/[çÇ]/g, "c")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function uniqueStrings(values) {
  return Array.from(
    new Set(
      values
        .map((item) => String(item || "").trim())
        .filter(Boolean)
    )
  );
}

function pickBestThumbnail(thumbnails = []) {
  if (!Array.isArray(thumbnails) || thumbnails.length === 0) return "";
  const sorted = [...thumbnails].sort((left, right) => (right.width || 0) - (left.width || 0));
  return sorted[0]?.url || "";
}

function toSentenceCase(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function normalizeMovieTitle(rawTitle) {
  let title = String(rawTitle || "").trim();
  if (!title) return "";

  title = title
    .replace(/\s+\|\s+.*$/u, "")
    .replace(/\s+-\s+(tek parça.*|yerli film.*|full film.*)$/iu, "")
    .replace(/\s+\((yerli film|tek parça film).*?\)$/giu, "")
    .replace(/\s+\((yönetmen|yonetmen).*?\)$/giu, "")
    .replace(/\s+I\s+\d{4}\s+Full Film$/iu, "")
    .replace(/\s+Full Film$/iu, "")
    .replace(/\s+Tek Parça Film$/iu, "")
    .trim();

  return title || String(rawTitle || "").trim();
}

function excerptText(value, maxLength = 180) {
  const clean = String(value || "").replace(/\s+/g, " ").trim();
  if (!clean) return "";
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, maxLength).trim()}...`;
}

function parseYear(value) {
  const match = String(value || "").match(/\b(19|20)\d{2}\b/);
  return match ? match[0] : "";
}

function parseDirector(value) {
  const match = String(value || "").match(/y[oö]netmen\s*:?\s*([^\n|,)]+)/iu);
  return match ? match[1].trim() : "";
}

function parseCastFromKeywords(keywords = []) {
  return uniqueStrings(
    keywords.filter((item) => {
      const keyword = String(item || "").trim();
      if (!keyword) return false;
      const lower = keyword.toLowerCase();
      if (NOISY_CAST_TERMS.some((term) => lower.includes(term))) return false;
      if (!keyword.includes(" ")) return false;
      return /^[A-ZÇĞİÖŞÜ]/u.test(keyword);
    })
  ).slice(0, 8);
}

function parseGenres(value) {
  const source = String(value || "");
  return uniqueStrings(
    GENRE_PATTERNS.filter((item) => item.pattern.test(source)).map((item) => item.label)
  );
}

function formatDurationFromSeconds(seconds) {
  const total = Number(seconds || 0);
  if (!Number.isFinite(total) || total <= 0) return "";

  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);

  if (hours > 0) {
    return `${hours} sa ${minutes.toString().padStart(2, "0")} dk`;
  }

  return `${minutes} dk`;
}

function formatPublishDate(value) {
  if (!value) return "";

  try {
    return new Intl.DateTimeFormat("tr-TR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date(value));
  } catch {
    return "";
  }
}

function sanitizeAiMovieData(payload, fallback) {
  const movieTitle = String(payload?.movieTitle || fallback.movieTitle || fallback.title || "").trim();
  const summary = String(payload?.summary || fallback.summary || "").trim().slice(0, 900);
  const tagline = String(payload?.tagline || "").trim().slice(0, 140);
  const director = String(payload?.director || fallback.director || "").trim().slice(0, 80);
  const year = String(payload?.year || fallback.year || "").trim().slice(0, 4);
  const cast = uniqueStrings(Array.isArray(payload?.cast) ? payload.cast : fallback.cast || []).slice(0, 10);
  const genres = uniqueStrings(Array.isArray(payload?.genres) ? payload.genres : fallback.genres || []).slice(0, 6);
  const facts = uniqueStrings(Array.isArray(payload?.facts) ? payload.facts : []).slice(0, 4);

  return {
    movieTitle,
    summary,
    tagline,
    director,
    year,
    cast,
    genres,
    facts,
  };
}

async function fetchHtml(url) {
  const response = await fetch(url, {
    headers: REQUEST_HEADERS,
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    throw new Error(`fetch_failed_${response.status}`);
  }

  return response.text();
}

function walkPlaylistRenderers(node, output = []) {
  if (!node || typeof node !== "object") return output;

  if (Array.isArray(node)) {
    node.forEach((item) => walkPlaylistRenderers(item, output));
    return output;
  }

  if (node.playlistVideoRenderer) {
    output.push(node.playlistVideoRenderer);
  }

  Object.values(node).forEach((value) => walkPlaylistRenderers(value, output));
  return output;
}

function createMovieSlug(movie) {
  const base = slugify(movie.movieTitle || movie.title || movie.videoId);
  return `${base}-${movie.videoId}`;
}

function buildMovieListItem(renderer) {
  const title = textFromRuns(renderer.title);
  const movieTitle = normalizeMovieTitle(title);
  const durationText = renderer.lengthText?.simpleText || textFromRuns(renderer.lengthText);
  const thumbnailUrl =
    pickBestThumbnail(renderer.thumbnail?.thumbnails) ||
    pickBestThumbnail(renderer.thumbnailRenderer?.playlistVideoThumbnailRenderer?.thumbnail?.thumbnails);

  const movie = {
    videoId: renderer.videoId,
    title,
    movieTitle,
    playlistIndex: Number(textFromRuns(renderer.index) || 0),
    durationText,
    thumbnailUrl,
    watchUrl: `https://www.youtube.com/watch?v=${renderer.videoId}`,
    embedUrl: `https://www.youtube.com/embed/${renderer.videoId}?autoplay=1&mute=1&rel=0&modestbranding=1`,
    year: parseYear(title),
  };

  return {
    ...movie,
    slug: createMovieSlug(movie),
  };
}

function buildFallbackMovieSummary(detail) {
  const description = String(detail.description || "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !/^https?:\/\//i.test(line) && !/^#/.test(line));

  const withoutTitle = description.filter((line) => line !== detail.title);
  const summary = excerptText(withoutTitle.join(" "), 420);

  return {
    movieTitle: detail.movieTitle || detail.title,
    summary,
    tagline: excerptText(withoutTitle[0] || "", 110),
    director: parseDirector(detail.rawTitle) || parseDirector(detail.description),
    year: parseYear(detail.rawTitle) || parseYear(detail.description),
    cast: parseCastFromKeywords(detail.keywords),
    genres: parseGenres(`${detail.rawTitle} ${detail.description} ${detail.keywords.join(" ")}`),
    facts: uniqueStrings(
      [
        detail.durationLabel ? `Süre: ${detail.durationLabel}` : "",
        detail.channelName ? `Yayınlayan kanal: ${detail.channelName}` : "",
        detail.publishedLabel ? `YouTube yükleme tarihi: ${detail.publishedLabel}` : "",
      ].filter(Boolean)
    ),
  };
}

async function enrichMovieDetail(detail) {
  const cached = aiCache.get(detail.videoId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const fallback = buildFallbackMovieSummary(detail);
  let enriched = {
    ...fallback,
    source: "fallback",
  };

  if (isLemonfoxConfigured()) {
    try {
      const completion = await createLemonfoxChatCompletion({
        messages: [
          {
            role: "system",
            content:
              "Sen Türkçe çalışan bir sinema editörüsün. Yalnızca verilen YouTube başlığı, açıklaması ve anahtar kelimelerine dayan. Tahmin yapma, emin olmadığın alanı boş bırak. Sadece geçerli JSON dön. Format: {\"movieTitle\":\"\",\"summary\":\"\",\"cast\":[],\"director\":\"\",\"year\":\"\",\"genres\":[],\"tagline\":\"\",\"facts\":[]}. summary en fazla 3 cümle olsun.",
          },
          {
            role: "user",
            content: JSON.stringify({
              title: detail.rawTitle,
              description: detail.description,
              keywords: detail.keywords,
              duration: detail.durationLabel,
              publishedAt: detail.publishedAt,
              channelName: detail.channelName,
            }),
          },
        ],
      });

      enriched = {
        ...sanitizeAiMovieData(parseJsonContent(completion.content), fallback),
        source: "ai",
      };
    } catch {
      enriched = {
        ...fallback,
        source: "fallback",
      };
    }
  }

  aiCache.set(detail.videoId, {
    expiresAt: Date.now() + AI_CACHE_TTL_MS,
    data: enriched,
  });

  return enriched;
}

export async function getYerliFilmlerPlaylist() {
  if (playlistCache.data && playlistCache.expiresAt > Date.now()) {
    return playlistCache.data;
  }

  const html = await fetchHtml(YERLI_FILMLER_PLAYLIST_URL);
  const initialDataText = extractJsonObject(html, "var ytInitialData = ");
  const initialData = safeJsonParse(initialDataText, {});
  const renderers = walkPlaylistRenderers(initialData);

  const seen = new Set();
  const movies = renderers
    .map(buildMovieListItem)
    .filter((item) => {
      if (!item.videoId || seen.has(item.videoId)) return false;
      seen.add(item.videoId);
      return true;
    })
    .sort((left, right) => left.playlistIndex - right.playlistIndex);

  const payload = {
    title:
      initialData?.metadata?.playlistMetadataRenderer?.title ||
      "Yerli Filmler",
    playlistId: YERLI_FILMLER_PLAYLIST_ID,
    playlistUrl: YERLI_FILMLER_PLAYLIST_URL,
    movies,
    updatedAt: new Date().toISOString(),
  };

  playlistCache = {
    expiresAt: Date.now() + PLAYLIST_CACHE_TTL_MS,
    data: payload,
  };

  return payload;
}

export async function getYerliFilmDetail(videoId) {
  const cached = videoCache.get(videoId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const html = await fetchHtml(`https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`);
  const playerText = extractJsonObject(html, "var ytInitialPlayerResponse = ");
  const playerResponse = safeJsonParse(playerText, {});
  const videoDetails = playerResponse?.videoDetails || {};
  const microformat = playerResponse?.microformat?.playerMicroformatRenderer || {};

  const rawTitle = String(videoDetails.title || "").trim();
  const detail = {
    videoId,
    rawTitle,
    title: rawTitle,
    movieTitle: normalizeMovieTitle(rawTitle),
    description: String(videoDetails.shortDescription || "").trim(),
    keywords: Array.isArray(videoDetails.keywords) ? videoDetails.keywords : [],
    channelName: String(videoDetails.author || "").trim(),
    channelId: String(videoDetails.channelId || "").trim(),
    channelUrl: String(microformat.ownerProfileUrl || "").trim(),
    publishedAt: String(microformat.uploadDate || "").trim(),
    publishedLabel: formatPublishDate(microformat.uploadDate),
    durationSeconds: Number(videoDetails.lengthSeconds || 0),
    durationLabel: formatDurationFromSeconds(videoDetails.lengthSeconds),
    viewCount: Number(videoDetails.viewCount || 0),
    category: String(microformat.category || "").trim(),
    thumbnailUrl:
      pickBestThumbnail(videoDetails.thumbnail?.thumbnails) ||
      `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
    watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
    embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&rel=0&modestbranding=1`,
  };

  const enriched = await enrichMovieDetail(detail);
  const merged = {
    ...detail,
    ...enriched,
    summary: enriched.summary || excerptText(detail.description, 420),
    year: enriched.year || parseYear(rawTitle) || parseYear(detail.description),
    slug: createMovieSlug({
      videoId,
      movieTitle: enriched.movieTitle || detail.movieTitle,
      title: detail.title,
    }),
  };

  videoCache.set(videoId, {
    expiresAt: Date.now() + VIDEO_CACHE_TTL_MS,
    data: merged,
  });

  return merged;
}

export function getVideoIdFromMovieSlug(slug) {
  const match = String(slug || "").match(/-([A-Za-z0-9_-]{11})$/);
  return match ? match[1] : "";
}

export async function getYerliFilmBySlug(slug) {
  const videoId = getVideoIdFromMovieSlug(slug);
  if (!videoId) return null;

  const playlist = await getYerliFilmlerPlaylist();
  const listItem = playlist.movies.find((item) => item.videoId === videoId);
  if (!listItem) return null;

  const detail = await getYerliFilmDetail(videoId);
  return {
    ...listItem,
    ...detail,
    playlistTitle: playlist.title,
  };
}

export async function getRelatedYerliFilmler(videoId, limit = 6) {
  const playlist = await getYerliFilmlerPlaylist();
  return playlist.movies.filter((item) => item.videoId !== videoId).slice(0, limit);
}

export function formatMovieCountLabel(count) {
  return `${count} film`;
}

export function formatMovieViewCount(value) {
  const count = Number(value || 0);
  if (!Number.isFinite(count) || count <= 0) return "";

  return new Intl.NumberFormat("tr-TR", {
    notation: count > 9999 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(count);
}
