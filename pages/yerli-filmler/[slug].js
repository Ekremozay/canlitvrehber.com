import Link from "next/link";
import dynamic from "next/dynamic";
import AdSlot from "../../components/AdSlot";
import MovieCard from "../../components/MovieCard";
import SeoHead from "../../components/SeoHead";
import { AD_SLOTS } from "../../lib/adSlots";
import {
  formatMovieViewCount,
  getRelatedYerliFilmler,
  getYerliFilmBySlug,
  YERLI_FILMLER_PLAYLIST_URL,
} from "../../lib/localMovies";

const YouTubeMoviePlayer = dynamic(() => import("../../components/YouTubeMoviePlayer"), {
  ssr: false,
  loading: () => (
    <div className="relative aspect-video overflow-hidden rounded-[28px] border border-white/10 bg-black">
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/72 px-6 text-center">
        <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-white/10 border-t-accent" />
        <div className="mt-4 text-base font-bold text-white">Film hazırlanıyor</div>
        <p className="mt-2 text-xs text-white/55">YouTube oynatıcı yükleniyor.</p>
      </div>
    </div>
  ),
});

function InfoItem({ label, value }) {
  if (!value) return null;

  return (
    <div className="rounded-2xl border border-white/10 bg-surface/60 p-4">
      <div className="text-[11px] uppercase tracking-[1.4px] text-white/40">{label}</div>
      <div className="mt-2 text-sm font-semibold text-white">{value}</div>
    </div>
  );
}

function ChipList({ title, items, tone = "default" }) {
  if (!items || items.length === 0) return null;

  const toneClass =
    tone === "amber"
      ? "border-amber-300/25 bg-amber-300/10 text-amber-100"
      : "border-white/15 bg-white/5 text-white/75";

  return (
    <section className="rounded-[26px] border border-white/10 bg-surface/60 p-5">
      <h2 className="text-lg font-black tracking-tight text-white">{title}</h2>
      <div className="mt-4 flex flex-wrap gap-2">
        {items.map((item) => (
          <span
            key={`${title}-${item}`}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${toneClass}`}
          >
            {item}
          </span>
        ))}
      </div>
    </section>
  );
}

export default function YerliFilmDetailPage({ movie, relatedMovies }) {
  const viewCountLabel = formatMovieViewCount(movie.viewCount);

  return (
    <>
      <SeoHead
        title={`${movie.movieTitle} | Yerli Filmler`}
        description={movie.summary || `${movie.movieTitle} film sayfası, YouTube oynatıcı ve film bilgileri.`}
        path={`/yerli-filmler/${movie.slug}`}
        image={movie.thumbnailUrl}
      />

      <div className="min-h-screen bg-bg">
        <main className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/yerli-filmler"
                className="rounded-lg border border-white/15 px-3 py-2 text-sm text-white/75 no-underline transition hover:bg-white/10 hover:text-white"
              >
                Yerli Filmlere Dön
              </Link>
              <Link
                href="/"
                className="rounded-lg border border-white/15 px-3 py-2 text-sm text-white/75 no-underline transition hover:bg-white/10 hover:text-white"
              >
                Kanallara Git
              </Link>
            </div>

            <a
              href={movie.watchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-accent px-4 py-2 text-sm font-bold text-black no-underline transition hover:brightness-110"
            >
              YouTube'da Aç
            </a>
          </div>

          <section
            className="overflow-hidden rounded-[32px] border border-white/10 p-5 sm:p-7"
            style={{
              background:
                "radial-gradient(circle at top left, rgba(245,158,11,0.18), transparent 24%), radial-gradient(circle at top right, rgba(249,115,22,0.18), transparent 24%), linear-gradient(180deg, rgba(18,18,24,0.98), rgba(10,10,14,0.94))",
            }}
          >
            <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
              <div>
                <img
                  src={movie.thumbnailUrl}
                  alt={movie.movieTitle}
                  className="aspect-[3/4] w-full rounded-[26px] object-cover shadow-[0_20px_60px_rgba(0,0,0,0.38)]"
                />
              </div>

              <div>
                <div className="flex flex-wrap gap-2">
                  {movie.year && (
                    <span className="rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1 text-xs font-semibold text-amber-100">
                      {movie.year}
                    </span>
                  )}
                  {movie.durationLabel && (
                    <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-white/75">
                      {movie.durationLabel}
                    </span>
                  )}
                  {viewCountLabel && (
                    <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-white/75">
                      {viewCountLabel} görüntülenme
                    </span>
                  )}
                </div>

                <h1 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl">
                  {movie.movieTitle}
                </h1>

                {movie.tagline && (
                  <p className="mt-3 max-w-3xl text-lg font-semibold text-amber-100/90">
                    {movie.tagline}
                  </p>
                )}

                <p className="mt-4 max-w-4xl text-sm leading-relaxed text-white/72 sm:text-base">
                  {movie.summary || movie.description}
                </p>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <InfoItem label="Yönetmen" value={movie.director} />
                  <InfoItem label="YouTube Kanalı" value={movie.channelName} />
                  <InfoItem label="Yayın Tarihi" value={movie.publishedLabel} />
                  <InfoItem label="Kaynak" value={movie.source === "ai" ? "Video açıklamasından derlenen film bilgileri" : "YouTube açıklaması"} />
                </div>
              </div>
            </div>
          </section>

          <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
            <section className="space-y-6">
              <YouTubeMoviePlayer
                videoId={movie.videoId}
                title={movie.movieTitle}
                watchUrl={movie.watchUrl}
              />

              <AdSlot
                slot={AD_SLOTS.homeInfeed}
                label="Film Sayfası Reklam Alanı"
                minHeight={110}
              />

              {movie.description && (
                <section className="rounded-[28px] border border-white/10 bg-surface/60 p-5 sm:p-6">
                  <h2 className="text-xl font-black tracking-tight text-white">Film Özeti</h2>
                  <p className="mt-4 whitespace-pre-line text-sm leading-7 text-white/72">
                    {movie.description}
                  </p>
                </section>
              )}

              <ChipList title="Oyuncular" items={movie.cast} tone="amber" />
              <ChipList title="Türler" items={movie.genres} />

              {movie.facts?.length > 0 && (
                <section className="rounded-[26px] border border-white/10 bg-surface/60 p-5">
                  <h2 className="text-lg font-black tracking-tight text-white">Film Notları</h2>
                  <ul className="mt-4 space-y-2 text-sm text-white/72">
                    {movie.facts.map((fact) => (
                      <li key={fact} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                        {fact}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </section>

            <aside className="space-y-4">
              <AdSlot
                slot={AD_SLOTS.watchSidebarTop}
                label="Film Detay Yan Reklam 1"
                minHeight={250}
              />

              <section className="rounded-[26px] border border-white/10 bg-surface/60 p-5">
                <h2 className="text-lg font-black tracking-tight text-white">Hızlı Erişim</h2>
                <div className="mt-4 grid gap-2">
                  <a
                    href={movie.watchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white no-underline transition hover:bg-white/10"
                  >
                    YouTube'da Aç
                  </a>
                  <a
                    href={movie.channelUrl || YERLI_FILMLER_PLAYLIST_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white no-underline transition hover:bg-white/10"
                  >
                    Kanalı Gör
                  </a>
                  <a
                    href={YERLI_FILMLER_PLAYLIST_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-xl border border-amber-300/25 bg-amber-300/10 px-4 py-3 text-sm font-semibold text-amber-100 no-underline transition hover:bg-amber-300/15"
                  >
                    Oynatma Listesine Git
                  </a>
                </div>
              </section>

              {relatedMovies?.length > 0 && (
                <section className="rounded-[26px] border border-white/10 bg-surface/60 p-5">
                  <h2 className="text-lg font-black tracking-tight text-white">Benzer Filmler</h2>
                  <div className="mt-4 space-y-3">
                    {relatedMovies.map((item) => (
                      <Link
                        key={item.videoId}
                        href={`/yerli-filmler/${item.slug}`}
                        className="flex gap-3 rounded-2xl border border-white/10 bg-black/20 p-3 no-underline transition hover:border-white/20 hover:bg-black/30"
                      >
                        <img
                          src={item.thumbnailUrl}
                          alt={item.movieTitle}
                          className="h-20 w-14 rounded-xl object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="line-clamp-2 text-sm font-bold text-white">{item.movieTitle}</div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {item.year && (
                              <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[11px] text-white/65">
                                {item.year}
                              </span>
                            )}
                            {item.durationText && (
                              <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[11px] text-white/65">
                                {item.durationText}
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              <AdSlot
                slot={AD_SLOTS.watchSidebarBottom}
                label="Film Detay Yan Reklam 2"
                minHeight={250}
              />
            </aside>
          </div>

          {relatedMovies?.length > 0 && (
            <section className="mt-8">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-black tracking-tight text-white">Sıradaki Filmler</h2>
                  <p className="mt-1 text-sm text-white/50">
                    Aynı listeden başka filmleri de buradan açabilirsin.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {relatedMovies.slice(0, 4).map((item) => (
                  <MovieCard key={`grid-${item.videoId}`} movie={item} />
                ))}
              </div>
            </section>
          )}
        </main>
      </div>
    </>
  );
}

export async function getServerSideProps({ params, res }) {
  try {
    const movie = await getYerliFilmBySlug(params?.slug || "");

    if (!movie) {
      return { notFound: true };
    }

    if (params?.slug !== movie.slug) {
      return {
        redirect: {
          destination: `/yerli-filmler/${movie.slug}`,
          permanent: false,
        },
      };
    }

    const relatedMovies = await getRelatedYerliFilmler(movie.videoId, 8);

    res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");

    return {
      props: {
        movie,
        relatedMovies,
      },
    };
  } catch {
    return { notFound: true };
  }
}
