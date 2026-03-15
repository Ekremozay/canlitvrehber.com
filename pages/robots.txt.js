import { SITE_URL } from "../lib/siteConfig";

export async function getServerSideProps({ res }) {
  const content = `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\nHost: ${new URL(SITE_URL).host}\n`;

  res.setHeader("Content-Type", "text/plain");
  res.write(content);
  res.end();

  return { props: {} };
}

export default function RobotsTxt() {
  return null;
}
