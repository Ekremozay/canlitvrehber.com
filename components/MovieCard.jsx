import Link from "next/link";

function getMovieDescription(movie) {
  const rawTitle = String(movie?.title || "").trim();
  const cleanTitle = String(movie?.movieTitle || "").trim();

  if (!rawTitle || rawTitle === cleanTitle) {
    return "Film sayfasına geç, YouTube oynatıcısı ile hemen aç ve özet detaylarını incele.";
  }

  return rawTitle;
}

export default function MovieCard({ movie }) {
  return (
    <Link
      href={`/yerli-filmler/${movie.slug}`}
      className="group relative overflow-hidden rounded-[28px] border border-white/10 bg-[#101018] no-underline transition duration-500 hover:-translate-y-1.5 hover:border-white/20 hover:shadow-[0_26px_70px_rgba(0,0,0,0.45)]"
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-black">
        <img
          src={movie.thumbnailUrl}
          alt={movie.movieTitle}
          className="h-full w-full object-cover transition duration-700 group-hover:scale-105 group-hover:brightness-110"
          loading="lazy"
        />

        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,4,7,0.08)_0%,rgba(3,4,7,0.16)_32%,rgba(3,4,7,0.82)_72%,rgba(3,4,7,0.98)_100%)]" />

        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-4">
          <span className="rounded-full border border-white/20 bg-black/45 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[1.1px] text-white/85 backdrop-blur-sm">
            #{movie.playlistIndex}
          </span>
          {movie.durationText && (
            <span className="rounded-full border border-white/20 bg-black/45 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[1.1px] text-white/85 backdrop-blur-sm">
              {movie.durationText}
            </span>
          )}
        </div>

        <div className="absolute inset-x-0 bottom-0 p-5">
          <div className="inline-flex rounded-full border border-[#f4b44a]/30 bg-[#f4b44a]/12 px-3 py-1 text-[10px] font-bold uppercase tracking-[1.5px] text-[#f8d58f]">
            Yerli Film
          </div>

          <h3 className="mt-4 line-clamp-2 text-[1.35rem] font-black leading-tight tracking-tight text-white">
            {movie.movieTitle}
          </h3>

          <p className="mt-3 line-clamp-3 text-sm leading-6 text-white/60">{getMovieDescription(movie)}</p>

          <div className="mt-5 flex items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {movie.year && (
                <span className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[11px] font-semibold text-white/72">
                  {movie.year}
                </span>
              )}
              <span className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[11px] font-semibold text-white/72">
                YouTube
              </span>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-2 text-[11px] font-black uppercase tracking-[1.2px] text-black transition group-hover:translate-x-1">
              Filmi Aç
              <span aria-hidden="true">+</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
