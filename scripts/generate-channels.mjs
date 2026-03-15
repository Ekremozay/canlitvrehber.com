import fs from "fs";
import path from "path";

const REQUESTED_LIST_PATH = path.join("data", "requested_channels.txt");
const CHANNELS_API_PATH = "tmp_channels.json";
const STREAMS_API_PATH = "tmp_streams.json";
const OUTPUT_PATH = path.join("lib", "channels.js");
const REPORT_PATH = "tmp_channel_generation_report.json";

const CATEGORY_MAP = {
  genel: "general",
  haber: "news",
  spor: "sports",
  belgesel: "documentary",
  cocuk: "kids",
  dini: "religious",
  yerel: "local",
  ticari: "commercial",
};

const CATEGORY_META = [
  { id: "all", name: "Tum Kanallar", icon: "TV" },
  { id: "general", name: "Genel", icon: "GEN" },
  { id: "news", name: "Haber", icon: "NEWS" },
  { id: "sports", name: "Spor", icon: "SP" },
  { id: "kids", name: "Cocuk", icon: "KID" },
  { id: "documentary", name: "Belgesel", icon: "DOC" },
  { id: "religious", name: "Dini", icon: "DIN" },
  { id: "local", name: "Yerel", icon: "LOC" },
  { id: "commercial", name: "Ticari", icon: "COM" },
];

const EPG_BY_CATEGORY = {
  general: ["Canli Yayin", "Program", "Tekrar"],
  news: ["Ana Haber", "Canli Baglanti", "Gundem"],
  sports: ["Canli Spor", "Mac Ozetleri", "Spor Gecesi"],
  documentary: ["Belgesel", "Kesif", "Arsiv"],
  kids: ["Cizgi Kusagi", "Cocuk Programi", "Eglence"],
  religious: ["Canli Yayin", "Sohbet", "Dini Program"],
  local: ["Yerel Gundem", "Bolge Haber", "Canli Yayin"],
  commercial: ["Canli Satis", "Urun Tanitimi", "Kampanya"],
};

const PALETTE = [
  "#E63946",
  "#1D3557",
  "#0096C7",
  "#2D6A4F",
  "#40916C",
  "#F77F00",
  "#7B2CBF",
  "#E36397",
  "#D62828",
  "#00B4D8",
  "#588157",
  "#BC6C25",
  "#3A86FF",
  "#FF006E",
  "#06D6A0",
  "#F4A261",
  "#E76F51",
  "#4361EE",
  "#7209B7",
  "#2A9D8F",
];

const TRUSTED_HOST_KEYWORDS = [
  "trt",
  "daioncdn",
  "dogus",
  "demiroren",
  "blutv",
  "haberglobal",
  "halktv",
  "sportstv",
  "tjk",
  "tv100",
  "kanal7",
  "ntv",
  "dw",
  "euronews",
  "aljazeera",
  "abcnews",
  "skynews",
  "nasa",
  "rudaw",
  "cbc",
  "ictimai",
  "azer",
  "aztv",
];

const BLOCKED_HOST_KEYWORDS = ["turknet.ercdn.net", "tvpass.org"];

const COUNTRY_PRIORITY = {
  TR: 120,
  CY: 95,
  AZ: 90,
  TM: 85,
  IQ: 80,
  KZ: 78,
  DE: 75,
  GB: 70,
  US: 68,
  QA: 66,
  RU: 60,
};

const REGIONAL_COUNTRIES = new Set(["TR", "CY", "AZ", "TM", "IQ", "KZ"]);
const INTERNATIONAL_HINTS = [
  "german",
  "english",
  "europe",
  "abd",
  "usa",
  "russia",
  "russian",
  "hamburg",
  "berlin",
  "sudbaden",
  "franken",
  "oberpfalz",
  "niederbayern",
  "kazakistan",
  "india",
  "nasa",
  "deutsche",
  "sky news",
  "abc news",
  "al jazeera",
  "euronews",
  "qvc",
  "dw ",
];

const BLOCKED_NAME_NORMALIZED = new Set([
  "israilabdiransavasi",
  "tomandjerry",
  "pijamaskeliler",
  "kralsakir",
]);

const DIRECT_CHANNEL_ID_OVERRIDES = {
  cnnturk: "CNNTurk.tr",
  trtsporyildiz: "TRTSporYildiz.tr",
  tv85: "TV85.tr",
  aspor: "ASpor.tr",
  htspor: "HTSpor.tr",
  tvnet: "TVNET.tr",
  tytturk: "TYTTurk.tr",
  eurostar: "EuroStar.tr",
  dwtveurope: "DWEurope.de",
  deutschewelleenglish: "DWEnglish.de",
  rtrussiatoday: "RT.ru",
};

const KNOWN_CHANNEL_LINKS = {
  showtv: {
    officialLive: ["https://www.showtv.com.tr/canli-yayin"],
    youtubeLive: "https://www.youtube.com/@showtv/live",
  },
  startv: {
    officialLive: ["https://www.startv.com.tr/canli-yayin"],
    youtubeLive: "https://www.youtube.com/@startv/live",
  },
  atv: {
    officialLive: ["https://www.atv.com.tr/canli-yayin"],
    youtubeLive: "https://www.youtube.com/@atv/live",
  },
  nowtv: {
    officialLive: ["https://www.nowtv.com.tr/canli-yayin"],
    youtubeLive: "https://www.youtube.com/@NOWTurkiye/live",
  },
  kanald: {
    officialLive: ["https://www.kanald.com.tr/canli-yayin"],
    youtubeLive: "https://www.youtube.com/@KanalD/live",
  },
  cnnturk: {
    officialLive: ["https://www.cnnturk.com/canli-yayin"],
    youtubeLive: "https://www.youtube.com/@cnnturk/live",
  },
  ntv: {
    officialLive: ["https://www.ntv.com.tr/canli-yayin/ntv"],
    youtubeLive: "https://www.youtube.com/@ntv/live",
  },
  ahaber: {
    officialLive: ["https://www.ahaber.com.tr/webtv/canli-yayin"],
    youtubeLive: "https://www.youtube.com/channel/UCKQhfw-lzz0uKnE1fY1PsAA/live",
  },
  haberturktv: {
    officialLive: ["https://www.haberturk.com/canliyayin"],
    youtubeLive: "https://www.youtube.com/@HaberturkTV/live",
  },
  halktv: {
    officialLive: ["https://halktv.com.tr/canli-yayin"],
    youtubeLive: "https://www.youtube.com/@Halktvkanali/live",
  },
  sozcutv: {
    officialLive: ["https://www.szctv.com.tr/canli-yayin"],
    youtubeLive: "https://www.youtube.com/@SozcuTelevizyonu/live",
  },
  haberglobal: {
    officialLive: ["https://haberglobal.com.tr/canli-yayin"],
    youtubeLive: "https://www.youtube.com/@HaberGlobal/live",
  },
  tv100: {
    officialLive: ["https://www.tv100.com/canli-yayin"],
    youtubeLive: "https://www.youtube.com/@tv100/live",
  },
  aspor: {
    officialLive: ["https://www.aspor.com.tr/webtv/canli-yayin"],
    youtubeLive: "https://www.youtube.com/@aspor/live",
  },
  beinsportshaber: {
    officialLive: ["https://beinsports.com.tr/canli-yayin"],
    youtubeLive: "https://www.youtube.com/@beinsportsturkiye/live",
  },
  dmax: {
    officialLive: ["https://www.dmax.com.tr/canli-yayin"],
    youtubeLive: "https://www.youtube.com/@DMAXTurkiye/live",
  },
  tlc: {
    officialLive: ["https://www.tlctv.com.tr/canli-yayin"],
    youtubeLive: "https://www.youtube.com/@tlcturkiye/live",
  },
  trt1: {
    officialLive: ["https://www.trtizle.com/canli/tv/trt-1"],
    youtubeLive: "https://www.youtube.com/@trt1/live",
  },
  trthaber: {
    officialLive: ["https://www.trthaber.com/canli-yayin-izle/trt-haber/"],
    youtubeLive: "https://www.youtube.com/@trthaber/live",
  },
  trtspor: {
    officialLive: ["https://www.trtspor.com.tr/canli-yayin-izle/trt-spor/"],
    youtubeLive: "https://www.youtube.com/@trtspor/live",
  },
  trtcocuk: {
    officialLive: ["https://www.trtizle.com/canli/tv/trt-cocuk"],
    youtubeLive: "https://www.youtube.com/@trtcocuk/live",
  },
};

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/ı/g, "i")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function tokenize(value) {
  return normalize(value)
    .replace(/tv/g, " tv ")
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function slugify(value) {
  return normalize(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function hashIndex(value, max) {
  let hash = 0;
  for (const char of value) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return hash % max;
}

function parseRequestedChannels(rawText) {
  const rows = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const parsed = [];

  for (const row of rows) {
    const match = row.match(/^\d+\.\s*(.*?)\s+(genel|haber|spor|belgesel|cocuk|dini|yerel|ticari)$/i);
    if (!match) continue;
    parsed.push({
      raw: row,
      name: match[1].trim(),
      categoryRaw: match[2].toLowerCase(),
    });
  }

  return parsed;
}

function buildChannelIndex(allChannels) {
  const map = new Map();

  for (const channel of allChannels) {
    const keys = [channel.name, ...(channel.alt_names || [])]
      .map((value) => normalize(value))
      .filter(Boolean);

    for (const key of keys) {
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(channel);
    }
  }

  return map;
}

function buildStreamsIndex(allStreams) {
  const map = new Map();
  for (const stream of allStreams) {
    if (!map.has(stream.channel)) map.set(stream.channel, []);
    map.get(stream.channel).push(stream);
  }
  return map;
}

function isPrivateHostname(hostname) {
  if (!hostname) return true;
  if (hostname === "localhost" || hostname.endsWith(".local")) return true;

  const ipv4 = hostname.match(/^(\d{1,3}\.){3}\d{1,3}$/);
  if (!ipv4) return false;

  const [a, b] = hostname.split(".").map((part) => Number(part));
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

function scoreStream(stream) {
  let score = 0;
  let url;

  try {
    url = new URL(stream.url);
  } catch {
    return -1;
  }

  if (!["http:", "https:"].includes(url.protocol)) return -1;
  if (isPrivateHostname(url.hostname)) return -1;
  if (!String(stream.url || "").toLowerCase().includes(".m3u8")) return -1;
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(url.hostname)) return -1;
  if (BLOCKED_HOST_KEYWORDS.some((keyword) => url.hostname.includes(keyword))) {
    return -1;
  }

  if (url.protocol === "https:") score += 40;
  if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(url.hostname)) score += 20;

  for (const keyword of TRUSTED_HOST_KEYWORDS) {
    if (url.hostname.includes(keyword)) {
      score += 30;
      break;
    }
  }

  const qualityMatch = String(stream.quality || "").match(/(\d{3,4})p/i);
  if (qualityMatch) {
    score += Number(qualityMatch[1]) / 8;
  } else {
    score += 20;
  }

  if ((stream.feed || "").toUpperCase() === "SD") score += 4;

  return score;
}

function getRankedStreams(channel, streamsByChannel) {
  const candidates = streamsByChannel.get(channel.id) || [];
  if (!candidates.length) return [];

  const scored = candidates
    .map((stream) => ({ stream, score: scoreStream(stream) }))
    .filter((entry) => entry.score >= 0)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.stream);

  const seen = new Set();
  const deduped = [];
  for (const stream of scored) {
    if (seen.has(stream.url)) continue;
    seen.add(stream.url);
    deduped.push(stream);
  }
  return deduped;
}

function pickBestStream(channel, streamsByChannel) {
  return getRankedStreams(channel, streamsByChannel)[0] || null;
}

function scoreChannelCandidate(channel, targetName) {
  const targetNorm = normalize(targetName);
  const channelNorm = normalize(channel.name);
  const targetTokens = new Set(tokenize(targetName));
  const channelTokens = new Set(tokenize(channel.name));

  let score = COUNTRY_PRIORITY[channel.country] || 20;

  if (channelNorm === targetNorm) score += 500;
  if (
    channelNorm !== targetNorm &&
    (channel.alt_names || []).some((alt) => normalize(alt) === targetNorm)
  ) {
    score += 90;
  }

  if (
    targetNorm.length >= 6 &&
    (channelNorm.includes(targetNorm) || targetNorm.includes(channelNorm))
  ) {
    score += 35;
  }

  let overlap = 0;
  for (const token of targetTokens) {
    if (channelTokens.has(token)) overlap += 1;
  }
  score += overlap * 14;

  return score;
}

function isLikelyInternational(name) {
  const lowered = String(name || "").toLowerCase();
  return INTERNATIONAL_HINTS.some((hint) => lowered.includes(hint));
}

function pickBestChannel(name, channelsIndex, allChannels, streamsByChannel) {
  const normalized = normalize(name);

  const forcedId = DIRECT_CHANNEL_ID_OVERRIDES[normalized];
  if (forcedId) {
    const forced = allChannels.find((channel) => channel.id === forcedId);
    if (forced) {
      return {
        channel: forced,
        streamChannel: pickBestStream(forced, streamsByChannel) ? forced : null,
      };
    }
  }

  const exactMatches = channelsIndex.get(normalized) || [];
  let pool = exactMatches;

  if (!isLikelyInternational(name)) {
    const regionalOnly = exactMatches.filter((channel) =>
      REGIONAL_COUNTRIES.has(channel.country)
    );
    if (regionalOnly.length > 0) {
      pool = regionalOnly;
    } else if (exactMatches.length > 0) {
      pool = [];
    }
  }

  const scored = pool
    .map((channel) => ({
      channel,
      score: scoreChannelCandidate(channel, name),
      hasStream: Boolean(pickBestStream(channel, streamsByChannel)),
    }))
    .sort((a, b) => b.score - a.score);

  return {
    channel: scored[0]?.channel || null,
    streamChannel: scored.find((entry) => entry.hasStream)?.channel || null,
  };
}

function categoryDescription(category) {
  const byCategory = {
    general: "Genel yayin kanali",
    news: "Haber kanali",
    sports: "Spor kanali",
    documentary: "Belgesel kanali",
    kids: "Cocuk kanali",
    religious: "Dini yayin kanali",
    local: "Yerel yayin kanali",
    commercial: "Ticari yayin kanali",
  };
  return byCategory[category] || "Canli yayin kanali";
}

function buildEPG(category) {
  const names = EPG_BY_CATEGORY[category] || EPG_BY_CATEGORY.general;
  return [
    { time: "20:00", show: names[0] },
    { time: "21:00", show: names[1] },
    { time: "22:30", show: names[2] },
  ];
}

function proxyUrl(stream) {
  const params = new URLSearchParams();
  params.set("url", stream.url);
  if (stream.referrer) params.set("ref", stream.referrer);
  if (stream.user_agent) params.set("ua", stream.user_agent);
  return `/api/proxy?${params.toString()}`;
}

function asHttpUrl(raw) {
  if (!raw) return null;
  try {
    const maybe = String(raw).trim();
    if (!maybe) return null;
    if (maybe.startsWith("http://") || maybe.startsWith("https://")) {
      return new URL(maybe).toString();
    }
    return new URL(`https://${maybe}`).toString();
  } catch {
    return null;
  }
}

function dedupeLinks(links) {
  const seen = new Set();
  const output = [];
  for (const link of links) {
    if (!link?.url) continue;
    if (seen.has(link.url)) continue;
    seen.add(link.url);
    output.push(link);
  }
  return output;
}

function buildExternalLinks(channelName, pickedChannel) {
  const key = normalize(channelName);
  const known = KNOWN_CHANNEL_LINKS[key];
  const links = [];

  const websiteUrl = asHttpUrl(pickedChannel?.website);
  if (websiteUrl) {
    links.push({ label: "Resmi Site", url: websiteUrl, type: "website" });
    try {
      const base = new URL(websiteUrl).origin;
      for (const suffix of ["/canli-yayin", "/canli", "/live"]) {
        links.push({
          label: `Resmi Canli (${suffix.replace("/", "")})`,
          url: `${base}${suffix}`,
          type: "official-live",
        });
      }
    } catch {
      // no-op
    }
  }

  if (known?.officialLive?.length) {
    for (const url of known.officialLive) {
      links.unshift({ label: "Resmi Canli", url, type: "official-live" });
    }
  }

  if (known?.youtubeLive) {
    links.push({
      label: "YouTube Canli",
      url: known.youtubeLive,
      type: "youtube-live",
    });
  }

  links.push({
    label: "YouTube'da Ara",
    url: `https://www.youtube.com/results?search_query=${encodeURIComponent(
      `${channelName} canli yayin`
    )}`,
    type: "youtube-search",
  });

  return dedupeLinks(links).slice(0, 8);
}

function generate() {
  const requestedRaw = fs.readFileSync(REQUESTED_LIST_PATH, "utf8");
  const apiChannels = JSON.parse(fs.readFileSync(CHANNELS_API_PATH, "utf8"));
  const apiStreams = JSON.parse(fs.readFileSync(STREAMS_API_PATH, "utf8"));

  const requested = parseRequestedChannels(requestedRaw);
  const channelIndex = buildChannelIndex(apiChannels);
  const streamsByChannel = buildStreamsIndex(apiStreams);

  const output = [];
  const skipped = [];
  const usedIds = new Set();

  for (const req of requested) {
    const normalizedName = normalize(req.name);
    const category = CATEGORY_MAP[req.categoryRaw] || "general";

    if (BLOCKED_NAME_NORMALIZED.has(normalizedName)) {
      skipped.push({ ...req, reason: "blocked_by_policy" });
      continue;
    }

    const picked = pickBestChannel(
      req.name,
      channelIndex,
      apiChannels,
      streamsByChannel
    );

    const pickedChannel = picked.channel;
    const streamSourceChannel = picked.streamChannel;
    const rankedStreams =
      streamSourceChannel && streamSourceChannel.id
        ? getRankedStreams(streamSourceChannel, streamsByChannel)
        : [];
    const stream = rankedStreams[0] || null;

    const baseId = slugify(req.name) || slugify(pickedChannel?.id || req.name);
    let uniqueId = baseId;
    let suffix = 2;
    while (usedIds.has(uniqueId)) {
      uniqueId = `${baseId}-${suffix}`;
      suffix += 1;
    }
    usedIds.add(uniqueId);

    const streamOptions = rankedStreams.slice(0, 5).map((item, index) => {
      const qualityLabel = item.quality
        ? item.quality.toUpperCase()
        : index === 0
          ? "AUTO"
          : "ALT";
      let host = "";
      try {
        host = new URL(item.url).hostname;
      } catch {
        host = "";
      }
      return {
        id: `${uniqueId}-src-${index + 1}`,
        label: index === 0 ? `Ana Kaynak (${qualityLabel})` : `Yedek ${index} (${qualityLabel})`,
        url: proxyUrl(item),
        quality: item.quality || "",
        sourceHost: host,
      };
    });

    const externalLinks = buildExternalLinks(req.name, pickedChannel);

    const entry = {
      id: uniqueId,
      name: req.name,
      category,
      color: PALETTE[hashIndex(uniqueId, PALETTE.length)],
      stream: stream ? proxyUrl(stream) : "",
      fallbackStreams: rankedStreams.slice(1, 4).map((s) => proxyUrl(s)),
      streamOptions,
      sourceChannelId: pickedChannel?.id || null,
      officialWebsite: asHttpUrl(pickedChannel?.website),
      country: pickedChannel?.country || null,
      network: pickedChannel?.network || null,
      sourceCategories: pickedChannel?.categories || [],
      externalLinks,
      description: categoryDescription(category),
      epg: buildEPG(category),
    };

    output.push(entry);

    if (!pickedChannel) {
      skipped.push({ ...req, reason: "no_channel_match_added_without_stream" });
    } else if (!stream) {
      skipped.push({ ...req, reason: "no_stream_added_without_stream" });
    }
  }

  const fileBody = `/**\n * Auto-generated channel list from data/requested_channels.txt\n * Source: iptv-org channel and stream APIs (filtered for safer playback).\n */\n\nexport const CHANNELS = ${JSON.stringify(output, null, 2)};\n\nexport const CATEGORIES = ${JSON.stringify(CATEGORY_META, null, 2)};\n`;

  fs.writeFileSync(OUTPUT_PATH, fileBody, "utf8");

  fs.writeFileSync(
    REPORT_PATH,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        requested: requested.length,
        added: output.length,
        warnings: skipped.length,
        skippedItems: skipped,
      },
      null,
      2
    ),
    "utf8"
  );

  console.log(`Requested: ${requested.length}`);
  console.log(`Added: ${output.length}`);
  console.log(`Warnings: ${skipped.length}`);
}

generate();
