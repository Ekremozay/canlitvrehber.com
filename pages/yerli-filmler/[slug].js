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
    <div className="relative aspect-video overflow-hidden rounded-[32px] border border-white/10 bg-black">
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/72 px-6 text-center">
        <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-white/10 border-t-accent" />
        <div className="mt-4 text-base font-bold text-white">Film hazirlaniyor</div>
        <p className="mt-2 text-xs text-white/55">YouTube oynatici yukleniyor.</p>
      </div>
    </div>
  ),
});

function SectionTitle({ eyebrow, title, description, action }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && (
          <div className="text-[11px] font-bold uppercase tracking-[1.8px] text-[#f5d08a]">
            {eyebrow}
          </div>
        )}
        <h2 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">{title}</h2>
        {description && <p className="mt-2 max-w-2xl text-sm text-white/58">{description}</p>}
      </div>
      {action}
    </div>
  );
}

function MetaPill({ children, tone = "default" }) {
  const toneClass =
    tone === "accent"
      ? "border-[#f4b44a]/30 bg-[#f4b44a]/10 text-[#f6d18e]"
      : "border-white/12 bg-white/[0.05] text-white/74";

  return (
    <span className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${toneClass}`}>
      {children}
    </span>
  );
}

function DetailCard({ label, value, note }) {
  if (!value) return null;

  return (
    <div className="rounded-[24px] border border-white/10 bg-black/25 p-4">
      <div className="text-[11px] font-bold uppercase tracking-[1.4px] text-white/42">{label}</div>
      <div className="mt-2 text-base font-bold text-white">{value}</div>
      {note && <div className="mt-2 text-xs leading-5 text-white/48">{note}</div>}
    </div>
  );
}

function ActionButton({ href, children, tone = "default" }) {
  const className =
    tone === "primary"
      ? "border-transparent bg-white text-black hover:translate-y-[-1px]"
      : tone === "accent"
        ? "border-[#f4b44a]/30 bg-[#f4b44a]/10 text-[#f6d18e] hover:bg-[#f4b44a]/15"
        : "border-white/12 bg-white/[0.05] text-white hover:bg-white/[0.09]";

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center justify-center gap-2 rounded-full border px-5 py-3 text-sm font-bold no-underline transition ${className}`}
    >
      {children}
    </a>
  );
}

function ChipSection({ title, items, tone = "default" }) {
  if (!items?.length) return null;

  const toneClass =
    tone === "accent"
      ? "border-[#f4b44a]/28 bg-[#f4b44a]/10 text-[#f6d18e]"
      : "border-white/12 bg-white/[0.05] text-white/78";

  return (
    <section className="rounded-[30px] border border-white/10 bg-[#0d0f15] p-5 sm:p-6">
      <SectionTitle title={title} />
      <div className="mt-5 flex flex-wrap gap-2.5">
        {items.map((item) => (
          <span
            key={`${title}-${item}`}
            className={`rounded-full border px-3.5 py-2 text-xs font-semibold ${toneClass}`}
          >
            {item}
          </span>
        ))}
      </div>
    </section>
  );
}

function NotesPanel({ facts }) {
  if (!facts?.length) return null;

  return (
    <section className="rounded-[30px] border border-white/10 bg-[#0d0f15] p-5 sm:p-6">
      <SectionTitle
        eyebrow="Kisa Bilgiler"
        title="Film notlari"
        description="Sayfa icinde karar vermeyi hizlandiran ozet bilgiler burada toplandi."
      />
      <div className="mt-5 grid gap-3">
        {facts.map((fact) => (
          <div
            key={fact}
            className="rounded-[22px] border border-white/10 bg-black/20 px-4 py-3 text-sm leading-6 text-white/72"
          >
            {fact}
          </div>
        ))}
      </div>
    </section>
  );
}

function RelatedRail({ movies }) {
  if (!movies?.length) return null;

  return (
    <section className="mt-10 rounded-[34px] border border-white/10 bg-[#0d0f15] p-5 sm:p-6">
      <SectionTitle
        eyebrow="Siradaki Secim"
        title="Bunu izlediysen bunlar da ilgini cekebilir"
        description="Ayni listenin icinden izlemeye devam etmek icin hazir secimler."
      />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {movies.slice(0, 4).map((item) => (
          <MovieCard key={`related-${item.videoId}`} movie={item} />
        ))}
      </div>
    </section>
  );
}

function getSourceLabel(movie) {
  if (movie.source === "ai") {
    return "Video aciklamasi ve metadata icinden derlenen ozet bilgiler";
  }

  return "YouTube aciklamasi ve video bilgileri";
}

export default function YerliFilmDetailPage({ movie, relatedMovies }) {
  const viewCountLabel = formatMovieViewCount(movie.viewCount);
  const hasAlternative = Boolean(movie.alternativeVideo?.watchUrl);

  return (
    <>
      <SeoHead
        title={`${movie.movieTitle} | Yerli Filmler`}
        description={
          movie.summary || `${movie.movieTitle} film sayfasi, YouTube oynatici, ozet ve hizli erisim baglantilari.`
        }
        path={`/yerli-filmler/${movie.slug}`}
        image={movie.thumbnailUrl}
      />

      <div
        className="min-h-screen bg-[#06070b]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 12% 16%, rgba(194,74,22,0.22), transparent 22%), radial-gradient(circle at 88% 10%, rgba(228,174,64,0.17), transparent 20%), linear-gradient(180deg, #07080c 0%, #0a0a11 52%, #08080c 100%)",
        }}
      >
        <main className="mx-auto max-w-[1660px] px-4 pb-14 pt-5 sm:px-6 lg:px-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/yerli-filmler"
                className="rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white/76 no-underline transition hover:bg-white/[0.08] hover:text-white"
              >
                Yerli Filmlere Don
              </Link>
              <Link
                href="/"
                className="rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white/76 no-underline transition hover:bg-white/[0.08] hover:text-white"
              >
                Ana Sayfaya Git
              </Link>
            </div>

            <ActionButton href={movie.watchUrl} tone="primary">
              YouTube'da Ac
              <span aria-hidden="true">Open</span>
            </ActionButton>
          </div>

          <section className="relative overflow-hidden rounded-[38px] border border-white/10 bg-[#0d0e14] shadow-[0_35px_120px_rgba(0,0,0,0.45)]">
            <div
              className="absolute inset-0 bg-cover bg-center opacity-28"
              style={{ backgroundImage: `url(${movie.thumbnailUrl})` }}
            />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_left,rgba(244,180,74,0.24),transparent_24%),linear-gradient(90deg,rgba(6,7,11,0.96)_0%,rgba(6,7,11,0.88)_40%,rgba(6,7,11,0.58)_70%,rgba(6,7,11,0.92)_100%)]" />

            <div className="relative grid gap-8 px-5 py-7 sm:px-8 sm:py-9 xl:grid-cols-[300px_minmax(0,1fr)] xl:px-10 xl:py-10">
              <div className="mx-auto w-full max-w-[320px] xl:mx-0">
                <img
                  src={movie.thumbnailUrl}
                  alt={movie.movieTitle}
                  className="aspect-[3/4] w-full rounded-[30px] object-cover shadow-[0_28px_70px_rgba(0,0,0,0.45)]"
                />
              </div>

              <div className="animate-[fadeUp_0.55s_ease-out]">
                <div className="flex flex-wrap gap-2">
                  <MetaPill tone="accent">Yerli Film</MetaPill>
                  {movie.year && <MetaPill>{movie.year}</MetaPill>}
                  {movie.durationLabel && <MetaPill>{movie.durationLabel}</MetaPill>}
                  {viewCountLabel && <MetaPill>{viewCountLabel} izlenme</MetaPill>}
                  <MetaPill>{movie.embeddable ? "Sayfa icinde oynatilabilir" : "YouTube'da acilir"}</MetaPill>
                </div>

                <h1 className="mt-5 max-w-4xl text-4xl font-black tracking-[-0.03em] text-white sm:text-5xl xl:text-6xl">
                  {movie.movieTitle}
                </h1>

                {movie.tagline && (
                  <p className="mt-4 max-w-3xl text-lg font-semibold text-[#f7d38e]">{movie.tagline}</p>
                )}

                <p className="mt-4 max-w-4xl text-sm leading-7 text-white/66 sm:text-base">
                  {movie.summary || movie.description}
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <ActionButton href={movie.watchUrl} tone="primary">
                    YouTube'da Izle
                    <span aria-hidden="true">Play</span>
                  </ActionButton>
                  {hasAlternative && (
                    <ActionButton href={movie.alternativeVideo.watchUrl} tone="accent">
                      Alternatif Videoyu Ac
                      <span aria-hidden="true">Alt</span>
                    </ActionButton>
                  )}
                  <ActionButton href={movie.channelUrl || YERLI_FILMLER_PLAYLIST_URL}>
                    Kanala Git
                    <span aria-hidden="true">Go</span>
                  </ActionButton>
                </div>

                <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <DetailCard label="Yonetmen" value={movie.director} note="Sayfadaki temel yaratici bilgisi" />
                  <DetailCard label="Kaynak Kanal" value={movie.channelName} note="Filmin geldigi resmi YouTube kanali" />
                  <DetailCard label="Yayin Tarihi" value={movie.publishedLabel} note="YouTube tarafindaki yuklenme tarihi" />
                  <DetailCard label="Veri Kaynagi" value={movie.source === "ai" ? "Guclendirilmis film ozeti" : "Standart film ozeti"} note={getSourceLabel(movie)} />
                </div>
              </div>
            </div>
          </section>

          <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <section className="space-y-6">
              <section className="rounded-[34px] border border-white/10 bg-[#0d0f15] p-5 sm:p-6">
                <SectionTitle
                  eyebrow="Izleme Alani"
                  title="Filmi hemen baslat"
                  description="Video bu sayfada acilmazsa sistem seni uygun YouTube secenegine yonlendirir."
                />
                <div className="mt-5">
                  <YouTubeMoviePlayer
                    videoId={movie.videoId}
                    title={movie.movieTitle}
                    watchUrl={movie.watchUrl}
                    fallbackWatchUrl={movie.alternativeVideo?.watchUrl || ""}
                    fallbackLabel={movie.alternativeVideo ? "Alternatif videoyu ac" : "YouTube'da izle"}
                  />
                </div>
              </section>

              <AdSlot
                slot={AD_SLOTS.homeInfeed}
                label="Film sayfasi reklam alani"
                minHeight={110}
              />

              {movie.description && (
                <section className="rounded-[34px] border border-white/10 bg-[#0d0f15] p-5 sm:p-6">
                  <SectionTitle
                    eyebrow="Hikaye"
                    title="Film ozeti"
                    description="Izlemeden once filmin tonunu ve ana hikayesini hizlica hisset."
                  />
                  <p className="mt-5 whitespace-pre-line text-sm leading-7 text-white/72 sm:text-[15px]">
                    {movie.description}
                  </p>
                </section>
              )}

              <div className="grid gap-6 lg:grid-cols-2">
                <ChipSection title="Oyuncu kadrosu" items={movie.cast} tone="accent" />
                <ChipSection title="Turler" items={movie.genres} />
              </div>

              <NotesPanel facts={movie.facts} />
            </section>

            <aside className="space-y-4">
              <section className="rounded-[30px] border border-white/10 bg-[#0d0f15] p-5 sm:p-6">
                <SectionTitle
                  eyebrow="Hizli Erisim"
                  title="Izleme secenekleri"
                  description="Kullanici burada beklemeden dogru izleme noktasina gecmeli."
                />
                <div className="mt-5 grid gap-3">
                  <ActionButton href={movie.watchUrl} tone="primary">
                    YouTube'da Ac
                  </ActionButton>
                  {hasAlternative && (
                    <ActionButton href={movie.alternativeVideo.watchUrl} tone="accent">
                      Alternatif Tek Parca Video
                    </ActionButton>
                  )}
                  <ActionButton href={movie.channelUrl || YERLI_FILMLER_PLAYLIST_URL}>
                    Kanal Sayfasina Git
                  </ActionButton>
                  <ActionButton href={YERLI_FILMLER_PLAYLIST_URL}>
                    Oynatma Listesini Ac
                  </ActionButton>
                </div>
              </section>

              <AdSlot slot={AD_SLOTS.watchSidebarTop} label="Film detay yan reklam 1" minHeight={250} />

              <section className="rounded-[30px] border border-white/10 bg-[#0d0f15] p-5 sm:p-6">
                <SectionTitle
                  eyebrow="Film Profili"
                  title="Kisa bakis"
                  description="Sayfa acilir acilmaz kullanicinin aklindaki temel sorulara cevap verir."
                />
                <div className="mt-5 grid gap-3">
                  <DetailCard label="Film Adi" value={movie.movieTitle} />
                  <DetailCard label="Sure" value={movie.durationLabel} />
                  <DetailCard label="Yil" value={movie.year} />
                  <DetailCard label="Izleme Durumu" value={movie.embeddable ? "Sayfa icinde aciliyor" : "YouTube sayfasina gecis gerekebilir"} />
                </div>
              </section>

              {relatedMovies?.length > 0 && (
                <section className="rounded-[30px] border border-white/10 bg-[#0d0f15] p-5 sm:p-6">
                  <SectionTitle
                    eyebrow="Sonraki Film"
                    title="Benzer secimler"
                    description="Sayfadan cikmadan izlemeye devam etmek isteyenler icin."
                  />
                  <div className="mt-5 space-y-3">
                    {relatedMovies.slice(0, 4).map((item) => (
                      <Link
                        key={item.videoId}
                        href={`/yerli-filmler/${item.slug}`}
                        className="flex gap-3 rounded-[24px] border border-white/10 bg-black/20 p-3 no-underline transition hover:border-white/18 hover:bg-black/30"
                      >
                        <img
                          src={item.thumbnailUrl}
                          alt={item.movieTitle}
                          className="h-24 w-16 rounded-[16px] object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="line-clamp-2 text-sm font-bold leading-6 text-white">{item.movieTitle}</div>
                          <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-white/58">
                            {item.year && (
                              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1">{item.year}</span>
                            )}
                            {item.durationText && (
                              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1">{item.durationText}</span>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              <AdSlot slot={AD_SLOTS.watchSidebarBottom} label="Film detay yan reklam 2" minHeight={250} />
            </aside>
          </div>

          <RelatedRail movies={relatedMovies} />
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
