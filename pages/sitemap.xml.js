import { CHANNELS } from "../lib/channels";
import { getYerliFilmlerPlaylist } from "../lib/localMovies";
import { SITE_URL } from "../lib/siteConfig";

function escapeXml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function getServerSideProps({ res }) {
  let movieUrls = [];

  try {
    const playlist = await getYerliFilmlerPlaylist();
    movieUrls = [
      { loc: `${SITE_URL}/yerli-filmler`, priority: "0.9" },
      ...playlist.movies.map((movie) => ({
        loc: `${SITE_URL}/yerli-filmler/${encodeURIComponent(movie.slug)}`,
        priority: "0.7",
      })),
    ];
  } catch {
    movieUrls = [{ loc: `${SITE_URL}/yerli-filmler`, priority: "0.9" }];
  }

  const urls = [
    { loc: `${SITE_URL}/`, priority: "1.0" },
    { loc: `${SITE_URL}/favorites`, priority: "0.7" },
    ...movieUrls,
    ...CHANNELS.map((channel) => ({
      loc: `${SITE_URL}/watch/${encodeURIComponent(channel.id)}`,
      priority: "0.8",
    })),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map(
      (item) => `  <url>\n    <loc>${escapeXml(item.loc)}</loc>\n    <changefreq>daily</changefreq>\n    <priority>${item.priority}</priority>\n  </url>`
    )
    .join("\n")}\n</urlset>`;

  res.setHeader("Content-Type", "application/xml");
  res.write(xml);
  res.end();

  return { props: {} };
}

export default function SitemapXml() {
  return null;
}
