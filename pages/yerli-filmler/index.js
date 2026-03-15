import Link from "next/link";
import { useMemo, useState } from "react";
import Header from "../../components/Header";
import MovieCard from "../../components/MovieCard";
import SeoHead from "../../components/SeoHead";
import AdSlot from "../../components/AdSlot";
import { AD_SLOTS } from "../../lib/adSlots";
import {
  formatMovieCountLabel,
  getYerliFilmlerPlaylist,
  YERLI_FILMLER_PLAYLIST_URL,
} from "../../lib/localMovies";

function formatUpdatedAt(value) {
  try {
    return new Intl.DateTimeFormat("tr-TR", {
      day: "2-digit",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "";
  }
}

export default function YerliFilmlerPage({
  playlistTitle,
  playlistUrl,
  movies,
  updatedAt,
}) {
  const [search, setSearch] = useState("");
  const searchTerm = search.trim().toLowerCase();

  const filteredMovies = useMemo(() => {
    if (!searchTerm) return movies;

    return movies.filter((movie) => {
      return (
        movie.movieTitle.toLowerCase().includes(searchTerm) ||
        movie.title.toLowerCase().includes(searchTerm)
      );
    });
  }, [movies, searchTerm]);

  const featuredMovie = filteredMovies[0] || movies[0] || null;
  const updatedLabel = formatUpdatedAt(updatedAt);

  return (
    <>
      <SeoHead
        title="Yerli Filmler"
        description="YouTube oynatma listesinden derlenen yerli filmleri tek sayfada keşfet, film detaylarını incele ve YouTube oynatıcı ile hemen izle."
        path="/yerli-filmler"
      />

      <div className="min-h-screen bg-bg">
        <Header
          search={search}
          onSearch={setSearch}
          favCount={0}
          searchPlaceholder="Film ara..."
        />

        <main className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6">
          <section
            className="overflow-hidden rounded-[30px] border border-white/10 px-5 py-6 sm:px-7 sm:py-7"
            style={{
              background:
                "radial-gradient(circle at top left, rgba(251,191,36,0.18), transparent 30%), radial-gradient(circle at top right, rgba(239,68,68,0.18), transparent 28%), linear-gradient(135deg, rgba(18,18,24,0.98), rgba(12,12,18,0.92))",
            }}
          >
            <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <div>
                <div className="inline-flex rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[1.6px] text-amber-100">
                  Yeni Bölüm
                </div>
                <h1 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl">
                  Yerli Filmler
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/70 sm:text-base">
                  {playlistTitle} oynatma listesindeki filmleri tek ekranda topladık. Her film için ayrı
                  sayfa, YouTube oynatıcı, özet ve temel film bilgileri burada.
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/75">
                    {formatMovieCountLabel(movies.length)}
                  </span>
                  {updatedLabel && (
                    <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/75">
                      Son güncelleme: {updatedLabel}
                    </span>
                  )}
                  <a
                    href={playlistUrl || YERLI_FILMLER_PLAYLIST_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1.5 text-xs font-semibold text-amber-100 no-underline transition hover:bg-amber-300/15"
                  >
                    YouTube Listesini Aç
                  </a>
                </div>
              </div>

              {featuredMovie && (
                <div className="rounded-[26px] border border-white/10 bg-black/20 p-4 sm:p-5">
                  <div className="text-[11px] font-bold uppercase tracking-[1.6px] text-white/45">
                    Öne Çıkan Film
                  </div>
                  <div className="mt-3 flex gap-4">
                    <img
                      src={featuredMovie.thumbnailUrl}
                      alt={featuredMovie.movieTitle}
                      className="h-32 w-24 rounded-2xl object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <h2 className="text-xl font-black tracking-tight text-white">
                        {featuredMovie.movieTitle}
                      </h2>
                      <p className="mt-2 text-sm text-white/60">{featuredMovie.title}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {featuredMovie.year && (
                          <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] text-white/70">
                            {featuredMovie.year}
                          </span>
                        )}
                        {featuredMovie.durationText && (
                          <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] text-white/70">
                            {featuredMovie.durationText}
                          </span>
                        )}
                      </div>
                      <Link
                        href={`/yerli-filmler/${featuredMovie.slug}`}
                        className="mt-4 inline-flex rounded-xl bg-accent px-4 py-2 text-sm font-bold text-black no-underline transition hover:brightness-110"
                      >
                        Film Sayfasına Git
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          <AdSlot
            slot={AD_SLOTS.homeLeaderboard}
            label="Yerli Filmler Üst Reklam"
            minHeight={110}
            className="mt-5"
          />

          <section className="mt-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black tracking-tight text-white">Film Arşivi</h2>
                <p className="mt-1 text-sm text-white/50">
                  {filteredMovies.length} film gösteriliyor.
                </p>
              </div>

              <div className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/70">
                Oynatıcı: YouTube
              </div>
            </div>

            {filteredMovies.length === 0 ? (
              <div className="rounded-[26px] border border-white/10 bg-surface/60 px-6 py-16 text-center">
                <h3 className="text-xl font-black text-white">Film bulunamadı</h3>
                <p className="mt-2 text-sm text-white/50">
                  Arama ifadesini değiştirip yeniden deneyebilirsin.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                {filteredMovies.map((movie) => (
                  <MovieCard key={movie.videoId} movie={movie} />
                ))}
              </div>
            )}
          </section>
        </main>
      </div>
    </>
  );
}

export async function getServerSideProps({ res }) {
  try {
    const playlist = await getYerliFilmlerPlaylist();

    res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");

    return {
      props: {
        playlistTitle: playlist.title,
        playlistUrl: playlist.playlistUrl,
        movies: playlist.movies,
        updatedAt: playlist.updatedAt,
      },
    };
  } catch {
    return {
      props: {
        playlistTitle: "Yerli Filmler",
        playlistUrl: YERLI_FILMLER_PLAYLIST_URL,
        movies: [],
        updatedAt: "",
      },
    };
  }
}
