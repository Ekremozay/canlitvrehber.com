import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { BRAND } from "../lib/siteConfig";

function navItemClass(isActive) {
  return `px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition no-underline ${
    isActive ? "bg-white/10 text-white" : "text-white/70 hover:text-white"
  }`;
}

export default function Header({
  search,
  onSearch,
  favCount = 0,
  searchPlaceholder = "Kanal, kategori veya yayın ara...",
}) {
  const [time, setTime] = useState("");
  const router = useRouter();

  useEffect(() => {
    const tick = () => {
      setTime(
        new Date().toLocaleTimeString("tr-TR", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="sticky top-0 z-50 flex flex-col gap-3 border-b border-white/5 bg-bg/90 px-4 py-3 backdrop-blur-xl sm:px-6 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-3 no-underline">
          <img
            src="/logo-canlitvrehber.svg"
            alt={`${BRAND.domain} logo`}
            className="h-10 w-10 rounded-xl border border-white/10"
            loading="eager"
          />
          <div>
            <div className="text-base font-extrabold leading-none tracking-tight text-white">
              Canlı <span className="text-accent">TV</span> Rehberi
            </div>
            <div className="font-mono text-[10px] font-semibold tracking-[1.2px] text-accent">
              {BRAND.domain}
            </div>
          </div>
        </Link>

        <div className="rounded-lg border border-white/10 bg-surface px-3 py-1.5 font-mono text-xs font-medium text-white/60 sm:text-sm lg:hidden">
          {time}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <nav className="flex gap-1 rounded-xl border border-white/10 bg-surface p-1">
          <Link href="/" className={navItemClass(router.pathname === "/")}>
            Canlı Kanallar
          </Link>
          <Link
            href="/yerli-filmler"
            className={navItemClass(router.pathname.startsWith("/yerli-filmler"))}
          >
            Film Vitrini
          </Link>
          <Link
            href="/favorites"
            className={`${navItemClass(router.pathname === "/favorites")} inline-flex items-center gap-1.5`}
          >
            Favorilerim
            {favCount > 0 && (
              <span className="rounded-full bg-danger px-1.5 text-[10px] font-bold text-white">
                {favCount}
              </span>
            )}
          </Link>
          <Link
            href="/telif-bildirimi"
            className={navItemClass(router.pathname === "/telif-bildirimi")}
          >
            Telif Bildirimi
          </Link>
        </nav>

        <div className="hidden min-w-[280px] items-center gap-2 rounded-xl border border-white/10 bg-surface px-3 py-2 transition focus-within:border-accent sm:flex">
          <span className="text-xs opacity-50">ARA</span>
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full border-none bg-transparent font-sans text-sm text-white outline-none placeholder:text-white/30"
          />
        </div>

        <div className="hidden rounded-lg border border-white/10 bg-surface px-3 py-1.5 font-mono text-sm font-medium text-white/60 lg:block">
          {time}
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-surface px-3 py-2 transition focus-within:border-accent sm:hidden">
        <span className="text-xs opacity-50">ARA</span>
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full border-none bg-transparent font-sans text-sm text-white outline-none placeholder:text-white/30"
        />
      </div>
    </header>
  );
}
