import Head from "next/head";
import { BRAND, SEO, SITE_URL } from "../lib/siteConfig";

export default function SeoHead({
  title,
  description,
  path = "/",
  image = SEO.ogImage,
  noindex = false,
}) {
  const fullTitle = title ? `${title} | ${BRAND.domain}` : SEO.defaultTitle;
  const metaDescription = description || SEO.defaultDescription;
  const canonical = new URL(path, SITE_URL).toString();
  const imageUrl = new URL(image, SITE_URL).toString();

  return (
    <Head>
      <title>{fullTitle}</title>
      <meta name="description" content={metaDescription} />
      <meta name="keywords" content={SEO.keywords} />
      <meta name="robots" content={noindex ? "noindex, nofollow" : "index, follow"} />
      <meta name="theme-color" content="#08080c" />
      <link rel="canonical" href={canonical} />
      <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      <link rel="apple-touch-icon" href="/logo-canlitvrehber.svg" />
      <link rel="manifest" href="/site.webmanifest" />

      <meta property="og:site_name" content={BRAND.domain} />
      <meta property="og:type" content="website" />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={metaDescription} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={imageUrl} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={metaDescription} />
      <meta name="twitter:image" content={imageUrl} />
    </Head>
  );
}
