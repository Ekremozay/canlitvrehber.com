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
const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

const PLAYLIST_CACHE_TTL_MS = 60 * 60 * 1000;
const VIDEO_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const AI_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const SEARCH_CACHE_TTL_MS = 12 * 60 * 60 * 1000;

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
const searchCache = new Map();

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
  const movieTitle = String(fallback.movieTitle || fallback.title || "").trim();
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

function getYouTubeApiKey() {
  return String(process.env.YOUTUBE_API_KEY || "").trim();
}

function isYouTubeApiConfigured() {
  return Boolean(getYouTubeApiKey());
}

function getYouTubeRequestOrigin() {
  return String(process.env.NEXT_PUBLIC_SITE_URL || "").trim();
}

async function fetchYouTubeApi(path, params = {}) {
  const apiKey = getYouTubeApiKey();
  if (!apiKey) {
    throw new Error("youtube_api_not_configured");
  }

  const searchParams = new URLSearchParams();
  Object.entries({
    ...params,
    key: apiKey,
  }).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    searchParams.set(key, String(value));
  });

  const response = await fetch(`${YOUTUBE_API_BASE}/${path}?${searchParams.toString()}`, {
    headers: {
      ...REQUEST_HEADERS,
      ...(getYouTubeRequestOrigin()
        ? {
            referer: getYouTubeRequestOrigin(),
            origin: getYouTubeRequestOrigin(),
          }
        : {}),
    },
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    throw new Error(`youtube_api_${path}_${response.status}`);
  }

  const payload = await response.json();
  if (payload?.error) {
    throw new Error(`youtube_api_${path}_error`);
  }

  return payload;
}

function chunkArray(values, size) {
  const output = [];
  for (let index = 0; index < values.length; index += size) {
    output.push(values.slice(index, index + size));
  }
  return output;
}

function parseIso8601Duration(value) {
  const match = String(value || "").match(
    /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i
  );

  if (!match) return 0;

  const days = Number(match[1] || 0);
  const hours = Number(match[2] || 0);
  const minutes = Number(match[3] || 0);
  const seconds = Number(match[4] || 0);

  return days * 86400 + hours * 3600 + minutes * 60 + seconds;
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

function walkVideoRenderers(node, output = []) {
  if (!node || typeof node !== "object") return output;

  if (Array.isArray(node)) {
    node.forEach((item) => walkVideoRenderers(item, output));
    return output;
  }

  if (node.videoRenderer) {
    output.push(node.videoRenderer);
  }

  Object.values(node).forEach((value) => walkVideoRenderers(value, output));
  return output;
}

function normalizeSearchText(value) {
  return slugify(value).replace(/-/g, " ");
}

function parseDurationTextToSeconds(value) {
  const clean = String(value || "").trim();
  if (!clean) return 0;

  const parts = clean
    .split(":")
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item));

  if (parts.length === 0) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0];
}

function scoreAlternativeMovie(candidate, movieTitle) {
  const normalizedMovieTitle = normalizeSearchText(movieTitle);
  const normalizedCandidateTitle = normalizeSearchText(candidate.title);
  const titleTokens = normalizedMovieTitle.split(" ").filter(Boolean);

  let score = 0;

  if (candidate.durationSeconds >= 5400) score += 6;
  else if (candidate.durationSeconds >= 4800) score += 5;
  else if (candidate.durationSeconds >= 3600) score += 4;
  else if (candidate.durationSeconds >= 3000) score += 2;

  if (/tek parca|tek parça|full film|yerli film/i.test(candidate.title)) score += 4;
  if (normalizedCandidateTitle.includes(normalizedMovieTitle)) score += 6;

  const matchedTokens = titleTokens.filter((token) => normalizedCandidateTitle.includes(token)).length;
  score += matchedTokens;

  return score;
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

function buildMovieListItemFromApi(item, video = null, fallbackIndex = 0) {
  const snippet = item?.snippet || {};
  const videoId =
    item?.contentDetails?.videoId ||
    snippet?.resourceId?.videoId ||
    video?.id ||
    "";
  const title = String(snippet?.title || video?.snippet?.title || "").trim();
  const movieTitle = normalizeMovieTitle(title);
  const durationSeconds = parseIso8601Duration(video?.contentDetails?.duration);
  const thumbnailUrl =
    pickBestThumbnail(Object.values(snippet?.thumbnails || {})) ||
    pickBestThumbnail(Object.values(video?.snippet?.thumbnails || {})) ||
    `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

  const movie = {
    videoId,
    title,
    movieTitle,
    playlistIndex: Number(snippet?.position ?? fallbackIndex ?? 0),
    durationText: formatDurationFromSeconds(durationSeconds),
    thumbnailUrl,
    watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
    embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&rel=0&modestbranding=1`,
    year: parseYear(title) || parseYear(snippet?.publishedAt),
  };

  return {
    ...movie,
    slug: createMovieSlug(movie),
  };
}

async function fetchPlaylistVideosById(videoIds) {
  const ids = uniqueStrings(videoIds).filter(Boolean);
  if (ids.length === 0) return new Map();

  const entries = await Promise.all(
    chunkArray(ids, 50).map(async (chunk) => {
      const payload = await fetchYouTubeApi("videos", {
        part: "snippet,contentDetails,status",
        id: chunk.join(","),
        maxResults: chunk.length,
      });

      return Array.isArray(payload?.items) ? payload.items : [];
    })
  );

  return new Map(entries.flat().map((item) => [item.id, item]));
}

async function getYerliFilmlerPlaylistFromApi() {
  let nextPageToken = "";
  const items = [];

  do {
    const payload = await fetchYouTubeApi("playlistItems", {
      part: "snippet,contentDetails,status",
      playlistId: YERLI_FILMLER_PLAYLIST_ID,
      maxResults: 50,
      pageToken: nextPageToken,
    });

    items.push(...(Array.isArray(payload?.items) ? payload.items : []));
    nextPageToken = String(payload?.nextPageToken || "");
  } while (nextPageToken);

  const videoMap = await fetchPlaylistVideosById(
    items.map((item) => item?.contentDetails?.videoId || item?.snippet?.resourceId?.videoId)
  );

  const seen = new Set();
  const movies = items
    .map((item, index) => {
      const videoId = item?.contentDetails?.videoId || item?.snippet?.resourceId?.videoId || "";
      return buildMovieListItemFromApi(item, videoMap.get(videoId), index);
    })
    .filter((item) => {
      if (/^(private video|deleted video|ozel video|silinmis video)$/i.test(item.title)) {
        return false;
      }
      if (!item.videoId || seen.has(item.videoId)) return false;
      seen.add(item.videoId);
      return true;
    })
    .sort((left, right) => left.playlistIndex - right.playlistIndex);

  return {
    title: "Yerli Filmler",
    playlistId: YERLI_FILMLER_PLAYLIST_ID,
    playlistUrl: YERLI_FILMLER_PLAYLIST_URL,
    movies,
    updatedAt: new Date().toISOString(),
  };
}

function buildMovieDetailFromApi(item) {
  const snippet = item?.snippet || {};
  const durationSeconds = parseIso8601Duration(item?.contentDetails?.duration);
  const rawTitle = String(snippet?.title || "").trim();
  const videoId = String(item?.id || "").trim();

  return {
    videoId,
    rawTitle,
    title: rawTitle,
    movieTitle: normalizeMovieTitle(rawTitle),
    description: String(snippet?.description || "").trim(),
    keywords: Array.isArray(snippet?.tags) ? snippet.tags : [],
    channelName: String(snippet?.channelTitle || "").trim(),
    channelId: String(snippet?.channelId || "").trim(),
    channelUrl: snippet?.channelId ? `https://www.youtube.com/channel/${snippet.channelId}` : "",
    publishedAt: String(snippet?.publishedAt || "").trim(),
    publishedLabel: formatPublishDate(snippet?.publishedAt),
    durationSeconds,
    durationLabel: formatDurationFromSeconds(durationSeconds),
    viewCount: Number(item?.statistics?.viewCount || 0),
    category: String(snippet?.categoryId || "").trim(),
    thumbnailUrl:
      pickBestThumbnail(Object.values(snippet?.thumbnails || {})) ||
      `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
    watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
    embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&rel=0&modestbranding=1`,
    embeddable: item?.status?.embeddable !== false,
  };
}

async function getYerliFilmDetailFromApi(videoId) {
  const payload = await fetchYouTubeApi("videos", {
    part: "snippet,contentDetails,status,statistics",
    id: videoId,
    maxResults: 1,
  });

  const item = Array.isArray(payload?.items) ? payload.items[0] : null;
  if (!item) {
    throw new Error("youtube_api_video_not_found");
  }

  return buildMovieDetailFromApi(item);
}

async function searchAlternativeMovieFromApi(movieTitle, excludeVideoId) {
  const queries = uniqueStrings([`${movieTitle} tek parca film`, `${movieTitle} full film`]);
  let bestMatch = null;

  for (const query of queries) {
    const searchPayload = await fetchYouTubeApi("search", {
      part: "snippet",
      q: query,
      type: "video",
      maxResults: 8,
      order: "relevance",
      regionCode: "TR",
      relevanceLanguage: "tr",
      videoDuration: "long",
      safeSearch: "none",
    });

    const ids = uniqueStrings(
      (Array.isArray(searchPayload?.items) ? searchPayload.items : [])
        .map((item) => item?.id?.videoId)
        .filter(Boolean)
    ).filter((id) => id !== excludeVideoId);

    if (ids.length === 0) continue;

    const videoPayload = await fetchYouTubeApi("videos", {
      part: "snippet,contentDetails,status",
      id: ids.join(","),
      maxResults: ids.length,
    });

    const candidates = (Array.isArray(videoPayload?.items) ? videoPayload.items : [])
      .map((item) => {
        const videoId = String(item?.id || "");
        const title = String(item?.snippet?.title || "").trim();
        const durationSeconds = parseIso8601Duration(item?.contentDetails?.duration);

        if (!videoId || !title || videoId === excludeVideoId) return null;
        if (durationSeconds < 3000) return null;

        return {
          videoId,
          title,
          durationText: formatDurationFromSeconds(durationSeconds),
          durationSeconds,
          thumbnailUrl:
            pickBestThumbnail(Object.values(item?.snippet?.thumbnails || {})) ||
            `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
          watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
        };
      })
      .filter(Boolean)
      .map((candidate) => ({
        ...candidate,
        score: scoreAlternativeMovie(candidate, movieTitle),
      }))
      .sort((left, right) => right.score - left.score);

    if (candidates[0] && (!bestMatch || candidates[0].score > bestMatch.score)) {
      bestMatch = candidates[0];
    }
  }

  if (!bestMatch) return null;

  return {
    videoId: bestMatch.videoId,
    title: bestMatch.title,
    durationText: bestMatch.durationText,
    thumbnailUrl: bestMatch.thumbnailUrl,
    watchUrl: bestMatch.watchUrl,
  };
}

async function searchAlternativeMovie(movieTitle, excludeVideoId) {
  const searchKey = `${movieTitle}::${excludeVideoId}`;
  const cached = searchCache.get(searchKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  let result = null;

  if (isYouTubeApiConfigured()) {
    try {
      result = await searchAlternativeMovieFromApi(movieTitle, excludeVideoId);
    } catch {
      result = null;
    }
  }

  if (!result) {
    const queries = uniqueStrings([
      `${movieTitle} tek parca film`,
      `${movieTitle} full film`,
      `${movieTitle} yerli film`,
    ]);

    let bestMatch = null;

    for (const query of queries) {
      const html = await fetchHtml(
        `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`
      );

      const initialDataText = extractJsonObject(html, "var ytInitialData = ");
      const initialData = safeJsonParse(initialDataText, {});
      const renderers = walkVideoRenderers(initialData);

      const candidates = renderers
        .map((renderer) => {
          const videoId = String(renderer.videoId || "");
          const title = textFromRuns(renderer.title);
          const durationText = textFromRuns(renderer.lengthText);
          const durationSeconds = parseDurationTextToSeconds(durationText);

          if (!videoId || !title || videoId === excludeVideoId) return null;
          if (durationSeconds < 3000) return null;

          return {
            videoId,
            title,
            durationText,
            durationSeconds,
            thumbnailUrl: pickBestThumbnail(renderer.thumbnail?.thumbnails),
            watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
          };
        })
        .filter(Boolean)
        .map((candidate) => ({
          ...candidate,
          score: scoreAlternativeMovie(candidate, movieTitle),
        }))
        .sort((left, right) => right.score - left.score);

      if (candidates[0] && (!bestMatch || candidates[0].score > bestMatch.score)) {
        bestMatch = candidates[0];
      }
    }

    result = bestMatch
      ? {
          videoId: bestMatch.videoId,
          title: bestMatch.title,
          durationText: bestMatch.durationText,
          thumbnailUrl: bestMatch.thumbnailUrl,
          watchUrl: bestMatch.watchUrl,
        }
      : null;
  }

  searchCache.set(searchKey, {
    expiresAt: Date.now() + SEARCH_CACHE_TTL_MS,
    data: result,
  });

  return result;
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

async function getYerliFilmlerPlaylistFromHtml() {
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

  return {
    title: initialData?.metadata?.playlistMetadataRenderer?.title || "Yerli Filmler",
    playlistId: YERLI_FILMLER_PLAYLIST_ID,
    playlistUrl: YERLI_FILMLER_PLAYLIST_URL,
    movies,
    updatedAt: new Date().toISOString(),
  };
}

export async function getYerliFilmlerPlaylist() {
  if (playlistCache.data && playlistCache.expiresAt > Date.now()) {
    return playlistCache.data;
  }

  let payload = null;

  if (isYouTubeApiConfigured()) {
    try {
      payload = await getYerliFilmlerPlaylistFromApi();
    } catch {
      payload = null;
    }
  }

  if (!payload) {
    payload = await getYerliFilmlerPlaylistFromHtml();
  }

  playlistCache = {
    expiresAt: Date.now() + PLAYLIST_CACHE_TTL_MS,
    data: payload,
  };

  return payload;
}

async function getYerliFilmDetailFromHtml(videoId) {
  const html = await fetchHtml(`https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`);
  const playerText = extractJsonObject(html, "var ytInitialPlayerResponse = ");
  const playerResponse = safeJsonParse(playerText, {});
  const videoDetails = playerResponse?.videoDetails || {};
  const microformat = playerResponse?.microformat?.playerMicroformatRenderer || {};

  const rawTitle = String(videoDetails.title || "").trim();
  return {
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
    embeddable: true,
  };
}

export async function getYerliFilmDetail(videoId) {
  const cached = videoCache.get(videoId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  let detail = null;

  if (isYouTubeApiConfigured()) {
    try {
      detail = await getYerliFilmDetailFromApi(videoId);
    } catch {
      detail = null;
    }
  }

  if (!detail) {
    detail = await getYerliFilmDetailFromHtml(videoId);
  }

  const enriched = await enrichMovieDetail(detail);
  const alternativeVideo = await searchAlternativeMovie(detail.movieTitle, videoId).catch(() => null);
  const merged = {
    ...detail,
    ...enriched,
    summary: enriched.summary || excerptText(detail.description, 420),
    year: enriched.year || parseYear(detail.rawTitle) || parseYear(detail.description),
    alternativeVideo,
    slug: createMovieSlug({
      videoId,
      movieTitle: detail.movieTitle,
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
