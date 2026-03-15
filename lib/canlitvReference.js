import referenceRows from "../data/canlitv-reference.json";

const MOJIBAKE_REPLACEMENTS = [
  ["\u00C3\u00BC", "u"],
  ["\u00C3\u009C", "u"],
  ["\u00C3\u00B6", "o"],
  ["\u00C3\u0096", "o"],
  ["\u00C4\u00B1", "i"],
  ["\u00C4\u00B0", "i"],
  ["\u00C3\u00A7", "c"],
  ["\u00C3\u0087", "c"],
  ["\u00C4\u009F", "g"],
  ["\u00C4\u009E", "g"],
  ["\u00C5\u009F", "s"],
  ["\u00C5\u009E", "s"],
  ["\u00C3\u0192\u00C2\u00BC", "u"],
  ["\u00C3\u0192\u00E2\u20AC\u009C", "o"],
  ["\u00C3\u201E\u00C2\u00B1", "i"],
];

const MANUAL_ID_TO_SLUG = {
  nowtv: "now-tv-canli-yayin",
  agrotv: "agro-tv",
  beinsportshaber: "bein-sports-haber",
  cbcsport: "cbc-sport-izle",
  trt1: "trt1-izle",
  trthaber: "trt-haber",
  trtspor: "trt-spor-canli-izle",
  tv8: "tv8-canli-izle",
  kanald: "kanal-d-canli-yayin",
  showtv: "show-tv-izle-1",
  startv: "star-tv-canli",
  cnnturk: "cnn-turk-izle-1",
};

function normalizeText(value) {
  if (!value) return "";

  let out = String(value);

  MOJIBAKE_REPLACEMENTS.forEach(([bad, good]) => {
    out = out.split(bad).join(good);
  });

  out = out
    .toLowerCase()
    .replace(/[ıİ]/g, "i")
    .replace(/[şŞ]/g, "s")
    .replace(/[ğĞ]/g, "g")
    .replace(/[üÜ]/g, "u")
    .replace(/[öÖ]/g, "o")
    .replace(/[çÇ]/g, "c")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");

  return out;
}

const byName = new Map();
const bySlug = new Map();

referenceRows.forEach((item) => {
  if (item?.slug) {
    bySlug.set(String(item.slug).toLowerCase(), item);
  }

  if (item?.name) {
    const normalized = normalizeText(item.name);
    if (normalized && !byName.has(normalized)) {
      byName.set(normalized, item);
    }
  }
});

export function getCanliTvReference(channel) {
  if (!channel) return null;

  const byChannelName = byName.get(normalizeText(channel.name));
  if (byChannelName) return byChannelName;

  const slug = MANUAL_ID_TO_SLUG[channel.id];
  if (slug && bySlug.has(slug)) {
    return bySlug.get(slug);
  }

  return null;
}

export function getCanliTvModeLabel(mode) {
  const labels = {
    telif_redirect: "Resmi Yonlendirme",
    embedded_youtube: "YouTube Acik",
    embedded_iframe_url: "Iframe Acik",
    embedded_player_src: "Dahili Acik",
    iframe_src_inline: "Iframe Acik",
    unknown: "Bilinmiyor",
    fetch_error: "Ulasilamadi",
  };

  return labels[mode] || "Bilinmiyor";
}

export function isReferenceExternalOnly(channel) {
  return getCanliTvReference(channel)?.mode === "telif_redirect";
}

export function isReferencePlayable(channel) {
  const mode = getCanliTvReference(channel)?.mode;
  if (!mode) return false;
  return !["telif_redirect", "unknown", "fetch_error"].includes(mode);
}
