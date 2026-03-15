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

const FILTERS = [
  {
    id: "all",
    label: "Tüm Filmler",
    description: "Bütün arşivi tek bakışta gör.",
  },
  {
    id: "long",
    label: "Uzun Metraj",
    description: "Akşam boyu eşlik edecek filmler.",
  },
  {
    id: "classics",
    label: "Klasik Seçki",
    description: "Zamana iz bırakan yapımları keşfet.",
  },
  {
    id: "fresh",
    label: "Yeni Eklenenler",
    description: "Listeye son eklenen filmleri hemen keşfet.",
  },
];

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

function getRuntimeMinutes(durationText) {
  const text = String(durationText || "").trim();
  if (!text) return 0;

  const hourMatch = text.match(/(\d+)\s*sa/i);
  const minuteMatch = text.match(/(\d+)\s*dk/i);

  if (hourMatch || minuteMatch) {
    return Number(hourMatch?.[1] || 0) * 60 + Number(minuteMatch?.[1] || 0);
  }

  const parts = text
    .split(":")
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item));

  if (parts.length === 3) return parts[0] * 60 + parts[1];
  if (parts.length === 2) return parts[0] + Math.round(parts[1] / 60);
  return 0;
}

function getMovieYear(movie) {
  const year = Number(movie?.year || 0);
  return Number.isFinite(year) && year > 1900 ? year : 0;
}

function getFilteredMovies(movies, searchTerm, activeFilter) {
  const normalized = String(searchTerm || "").trim().toLowerCase();

  const searched = !normalized
    ? movies
    : movies.filter((movie) => {
        return (
          String(movie.movieTitle || "").toLowerCase().includes(normalized) ||
          String(movie.title || "").toLowerCase().includes(normalized)
        );
      });

  if (activeFilter === "long") {
    return searched.filter((movie) => getRuntimeMinutes(movie.durationText) >= 95);
  }

  if (activeFilter === "classics") {
    return searched.filter((movie) => {
      const year = getMovieYear(movie);
      return year > 0 && year <= 2018;
    });
  }

  if (activeFilter === "fresh") {
    return [...searched].sort((left, right) => right.playlistIndex - left.playlistIndex);
  }

  return searched;
}

function getStatCards(movies) {
  const longFeatures = movies.filter((movie) => getRuntimeMinutes(movie.durationText) >= 95).length;
  const classics = movies.filter((movie) => {
    const year = getMovieYear(movie);
    return year > 0 && year <= 2018;
  }).length;
  const shortList = movies.slice(0, 12).length;

  return [
    {
      label: "Toplam Arşiv",
      value: formatMovieCountLabel(movies.length),
      note: "Tek parça açılan yerli film arşivi",
    },
    {
      label: "Uzun Metraj",
      value: `${longFeatures} seçim`,
      note: "90 dakika ve üzeri uzun metraj filmler",
    },
    {
      label: "Öne Çıkanlar",
      value: `${shortList} film`,
      note: "Vitrinde öne çıkan hızlı seçimler",
    },
    {
      label: "Klasik Ton",
      value: `${classics} film`,
      note: "Zamana iz bırakan nostaljik seçimler",
    },
  ];
}

function SectionHeader({ eyebrow, title, description, action }) {
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

function FilterPill({ filter, active, onClick }) {
  return (
    <button
      type="button"
      onClick={() => onClick(filter.id)}
      className={[
        "min-w-[180px] rounded-[24px] border px-4 py-4 text-left transition duration-300",
        active
          ? "border-[#f4b44a]/50 bg-[#f4b44a]/14 text-white shadow-[0_20px_40px_rgba(244,180,74,0.12)]"
          : "border-white/10 bg-white/[0.03] text-white/72 hover:border-white/20 hover:bg-white/[0.06]",
      ].join(" ")}
    >
      <div className="text-sm font-bold">{filter.label}</div>
      <div className="mt-1 text-xs text-white/52">{filter.description}</div>
    </button>
  );
}

function SpotlightTile({ movie, emphasis = "default" }) {
  if (!movie) return null;

  const accentClass =
    emphasis === "primary"
      ? "from-[#f4b44a]/35 via-black/20 to-black/90"
      : "from-white/10 via-black/15 to-black/88";

  return (
    <Link
      href={`/yerli-filmler/${movie.slug}`}
      className="group relative overflow-hidden rounded-[30px] border border-white/10 bg-[#101018] no-underline transition duration-500 hover:-translate-y-1 hover:border-white/20 hover:shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
    >
      <div className="absolute inset-0 bg-cover bg-center opacity-35 transition duration-500 group-hover:scale-105"
        style={{ backgroundImage: `url(${movie.thumbnailUrl})` }}
      />
      <div className={`absolute inset-0 bg-gradient-to-t ${accentClass}`} />
      <div className="relative flex min-h-[260px] items-end p-5 sm:min-h-[320px] sm:p-6">
        <div className="max-w-[80%]">
          <div className="inline-flex rounded-full border border-white/15 bg-black/30 px-3 py-1 text-[10px] font-bold uppercase tracking-[1.4px] text-white/78">
            {movie.durationText || "Tek parca"}
          </div>
          <h3 className="mt-4 text-2xl font-black tracking-tight text-white sm:text-3xl">
            {movie.movieTitle}
          </h3>
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-white/62">
            {movie.title === movie.movieTitle
              ? "YouTube oynatıcısı ile hemen aç, film sayfasında özet ve detaylara göz at."
              : movie.title}
          </p>
          <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-black uppercase tracking-[1.3px] text-black transition group-hover:translate-x-1">
            Hemen Aç
            <span aria-hidden="true">/</span>
            Film Sayfası
          </div>
        </div>
      </div>
    </Link>
  );
}

function RankedMovieCard({ movie, rank }) {
  return (
    <Link
      href={`/yerli-filmler/${movie.slug}`}
      className="group relative overflow-hidden rounded-[28px] border border-white/10 bg-[#101018] p-3 no-underline transition duration-300 hover:-translate-y-1 hover:border-white/20"
    >
      <div className="absolute left-3 top-1 text-[88px] font-black leading-none text-white/[0.08] sm:text-[110px]">
        {String(rank).padStart(2, "0")}
      </div>
      <div className="relative flex items-end gap-4 pt-14">
        <img
          src={movie.thumbnailUrl}
          alt={movie.movieTitle}
          className="h-40 w-28 rounded-[22px] object-cover shadow-[0_24px_50px_rgba(0,0,0,0.45)] transition duration-500 group-hover:scale-[1.03]"
          loading="lazy"
        />
        <div className="min-w-0 flex-1 pb-2">
          <div className="inline-flex rounded-full border border-[#f4b44a]/30 bg-[#f4b44a]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[1.4px] text-[#f6d18e]">
            Top 10
          </div>
          <h3 className="mt-3 line-clamp-2 text-lg font-black tracking-tight text-white">
            {movie.movieTitle}
          </h3>
          <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-white/55">
            {movie.year && (
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1">{movie.year}</span>
            )}
            {movie.durationText && (
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1">{movie.durationText}</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

function ShelfGrid({ title, description, movies }) {
  if (!movies.length) return null;

  return (
    <section className="mt-10">
      <SectionHeader title={title} description={description} />
      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {movies.map((movie) => (
          <MovieCard key={`${title}-${movie.videoId}`} movie={movie} />
        ))}
      </div>
    </section>
  );
}

export default function YerliFilmlerPage({ playlistTitle, playlistUrl, movies, updatedAt }) {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  const filteredMovies = useMemo(() => {
    return getFilteredMovies(movies, search, activeFilter);
  }, [movies, search, activeFilter]);

  const featuredMovie = filteredMovies[0] || movies[0] || null;
  const heroGridMovies = filteredMovies.slice(1, 4);
  const topTenMovies = filteredMovies.slice(0, 10);
  const tonightMovies = filteredMovies.filter((movie) => getRuntimeMinutes(movie.durationText) >= 95).slice(0, 4);
  const freshMovies = [...filteredMovies].sort((a, b) => b.playlistIndex - a.playlistIndex).slice(0, 4);
  const spotlightMovies = filteredMovies.slice(0, 8);
  const statCards = getStatCards(movies);
  const updatedLabel = formatUpdatedAt(updatedAt);

  return (
    <>
      <SeoHead
        title="Yerli Filmler"
        description="Yerli filmleri daha güçlü bir vitrinde keşfet. Büyük kapaklar, öne çıkan seçimler ve YouTube oynatıcısı ile tek ekranda izle."
        path="/yerli-filmler"
      />

      <div
        className="min-h-screen bg-[#06070b]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 15% 15%, rgba(194, 74, 22, 0.22), transparent 26%), radial-gradient(circle at 85% 10%, rgba(228, 174, 64, 0.18), transparent 22%), linear-gradient(180deg, #07080c 0%, #0a0a11 48%, #08080c 100%)",
        }}
      >
        <Header
          search={search}
          onSearch={setSearch}
          favCount={0}
          searchPlaceholder="Film adı, oyuncu ya da anahtar kelime ara..."
        />

        <main className="mx-auto max-w-[1660px] px-4 pb-14 pt-5 sm:px-6 lg:px-8">
          <section className="relative overflow-hidden rounded-[36px] border border-white/10 bg-[#0d0e14] shadow-[0_35px_120px_rgba(0,0,0,0.45)]">
            {featuredMovie && (
              <>
                <div
                  className="absolute inset-0 bg-cover bg-center opacity-30"
                  style={{ backgroundImage: `url(${featuredMovie.thumbnailUrl})` }}
                />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_left,rgba(244,180,74,0.26),transparent_28%),linear-gradient(90deg,rgba(6,7,11,0.96)_0%,rgba(6,7,11,0.88)_42%,rgba(6,7,11,0.46)_72%,rgba(6,7,11,0.92)_100%)]" />
              </>
            )}

            <div className="relative grid gap-8 px-5 py-7 sm:px-8 sm:py-9 xl:grid-cols-[1.15fr_0.85fr] xl:px-10 xl:py-10">
              <div className="max-w-3xl animate-[fadeUp_0.55s_ease-out]">
                <div className="inline-flex items-center gap-2 rounded-full border border-[#f4b44a]/35 bg-[#f4b44a]/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[1.8px] text-[#f7d38e]">
                  Sinema Vitrini
                  <span className="h-1.5 w-1.5 rounded-full bg-[#f4b44a]" />
                  Özenle hazırlanmış yerli film deneyimi
                </div>

                <h1 className="mt-5 max-w-3xl text-4xl font-black tracking-[-0.03em] text-white sm:text-5xl xl:text-6xl">
                  Yerli filmleri daha güçlü bir vitrinde keşfet.
                </h1>

                <p className="mt-4 max-w-2xl text-sm leading-7 text-white/66 sm:text-base">
                  {playlistTitle || "Yerli Filmler"} listesindeki yapımları büyük kapaklar,
                  hızlı seçimler ve düzenli film sayfalarıyla bir araya getirdik. Aradığın
                  filme daha hızlı ulaşman ve izlemen için sade bir deneyim hazırladık.
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  {featuredMovie && (
                    <Link
                      href={`/yerli-filmler/${featuredMovie.slug}`}
                      className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-black text-black no-underline transition hover:translate-y-[-1px]"
                    >
                      Hemen İzle
                      <span aria-hidden="true">&gt;</span>
                    </Link>
                  )}
                  <a
                    href={playlistUrl || YERLI_FILMLER_PLAYLIST_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-5 py-3 text-sm font-bold text-white no-underline transition hover:bg-white/[0.1]"
                  >
                    YouTube Listesini Aç
                    <span aria-hidden="true">&gt;</span>
                  </a>
                </div>

                <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {statCards.map((card) => (
                    <div
                      key={card.label}
                      className="rounded-[24px] border border-white/10 bg-black/25 p-4 backdrop-blur-sm"
                    >
                      <div className="text-[11px] font-bold uppercase tracking-[1.5px] text-white/42">{card.label}</div>
                      <div className="mt-3 text-2xl font-black tracking-tight text-white">{card.value}</div>
                      <div className="mt-2 text-xs leading-5 text-white/48">{card.note}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 animate-[fadeUp_0.7s_ease-out] sm:grid-cols-2 xl:grid-cols-1">
                {featuredMovie && <SpotlightTile movie={featuredMovie} emphasis="primary" />}
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
                  {heroGridMovies.map((movie) => (
                    <SpotlightTile key={`hero-${movie.videoId}`} movie={movie} />
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="mt-8 rounded-[32px] border border-white/10 bg-white/[0.03] px-5 py-5 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[1.8px] text-white/42">İzleme Modu</div>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-white">Sana uygun seçkiler</h2>
                <p className="mt-2 max-w-2xl text-sm text-white/56">
                  Bir seçim modu belirle; arşiv sana uygun tona göre anında daralsın. Arama
                  yaptığında vitrin hemen güncellenir.
                </p>
              </div>
              <div className="rounded-full border border-white/10 bg-black/25 px-4 py-2 text-xs font-bold uppercase tracking-[1.4px] text-white/58">
                {updatedLabel ? `Son güncelleme ${updatedLabel}` : "Kaynak: YouTube listesi"}
              </div>
            </div>

            <div className="mt-5 flex gap-3 overflow-x-auto pb-1">
              {FILTERS.map((filter) => (
                <FilterPill
                  key={filter.id}
                  filter={filter}
                  active={activeFilter === filter.id}
                  onClick={setActiveFilter}
                />
              ))}
            </div>
          </section>

          <section className="mt-10 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-[32px] border border-white/10 bg-[#0d0f15] p-5 sm:p-6">
              <SectionHeader
                eyebrow="Bu Akşam"
                title="Bir oturuşta izlenecek seçkiler"
                description="Uzun metraj filmleri öne çıkarıyoruz. Tek dokunuşla film sayfasına geç, YouTube oynatıcısında aç."
              />
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {(tonightMovies.length ? tonightMovies : spotlightMovies.slice(0, 4)).map((movie) => (
                  <MovieCard key={`tonight-${movie.videoId}`} movie={movie} />
                ))}
              </div>
            </div>

            <div className="rounded-[32px] border border-white/10 bg-[#0d0f15] p-5 sm:p-6">
              <SectionHeader
                eyebrow="Yeni Eklenenler"
                title="Vitrine yeni gelen filmler"
                description="Listeye son eklenen yapımları hızlı yakalamak isteyenler için."
              />
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {(freshMovies.length ? freshMovies : spotlightMovies.slice(4, 8)).map((movie) => (
                  <MovieCard key={`fresh-${movie.videoId}`} movie={movie} />
                ))}
              </div>
            </div>
          </section>

          <section className="mt-10 rounded-[34px] border border-white/10 bg-[#0d0f15] px-5 py-6 sm:px-6 sm:py-7">
            <SectionHeader
              eyebrow="Öne Çıkanlar"
              title="İlk 10 Yerli Film"
              description="Karar vermeyi hızlandıran, dikkat çeken ve güçlü bir ilk seçim listesi."
            />
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              {topTenMovies.map((movie, index) => (
                <RankedMovieCard key={`top-${movie.videoId}`} movie={movie} rank={index + 1} />
              ))}
            </div>
          </section>

          <AdSlot
            slot={AD_SLOTS.homeLeaderboard}
            label="Yerli Filmler tanıtım alanı"
            minHeight={110}
            className="mt-8"
          />

          <ShelfGrid
            title="Editörün Seçtikleri"
            description="Öne çıkan kapaklar ve ilk bakışta dikkat çeken filmler burada toplandı."
            movies={spotlightMovies.slice(0, 4)}
          />

          <section className="mt-10 rounded-[34px] border border-white/10 bg-[#0d0f15] p-5 sm:p-6">
            <SectionHeader
              eyebrow="Tüm Arşiv"
              title="Film arşivi"
              description={
                filteredMovies.length === 0
                  ? "Aramana göre sonuç bulunamadı."
                  : `${filteredMovies.length} film şu anda bu ekranda listeleniyor.`
              }
              action={
                <div className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-bold uppercase tracking-[1.3px] text-white/58">
                  Oynatıcı: YouTube
                </div>
              }
            />

            {filteredMovies.length === 0 ? (
              <div className="mt-6 rounded-[28px] border border-dashed border-white/15 bg-black/20 px-6 py-16 text-center">
                <div className="text-2xl font-black text-white">Film bulunamadı</div>
                <p className="mt-3 text-sm text-white/52">
                  Arama kelimesini değiştir ya da farklı bir seçim modu dene.
                </p>
              </div>
            ) : (
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
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
