import Link from "next/link";

export default function MovieCard({ movie }) {
  return (
    <Link
      href={`/yerli-filmler/${movie.slug}`}
      className="group overflow-hidden rounded-[26px] border border-white/10 bg-surface/70 no-underline transition duration-300 hover:-translate-y-1 hover:border-white/20 hover:shadow-[0_18px_50px_rgba(0,0,0,0.35)]"
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-black">
        <img
          src={movie.thumbnailUrl}
          alt={movie.movieTitle}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          loading="lazy"
        />

        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
          <span className="rounded-full border border-white/20 bg-black/55 px-2.5 py-1 text-[10px] font-bold tracking-[1px] text-white/80">
            #{movie.playlistIndex}
          </span>
          {movie.durationText && (
            <span className="rounded-full border border-white/20 bg-black/55 px-2.5 py-1 text-[10px] font-bold tracking-[1px] text-white/80">
              {movie.durationText}
            </span>
          )}
        </div>

        <div
          className="absolute inset-x-0 bottom-0 p-4"
          style={{
            background:
              "linear-gradient(180deg, rgba(8,8,12,0) 0%, rgba(8,8,12,0.76) 40%, rgba(8,8,12,0.96) 100%)",
          }}
        >
          {movie.year && (
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-[1.6px] text-amber-200/85">
              {movie.year}
            </div>
          )}
          <h3 className="text-lg font-black tracking-tight text-white">{movie.movieTitle}</h3>
          <p className="mt-2 text-sm leading-relaxed text-white/58">
            {movie.title === movie.movieTitle ? "YouTube oynatıcı ile hemen aç." : movie.title}
          </p>

          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-amber-300/25 bg-amber-300/10 px-4 py-2 text-xs font-bold text-amber-100 transition group-hover:bg-amber-300/15">
            Filme Git
            <span aria-hidden="true">→</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
