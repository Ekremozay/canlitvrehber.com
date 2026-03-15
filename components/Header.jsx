import Link from "next/link";
import { useState, useEffect } from "react";
import { BRAND } from "../lib/siteConfig";

export default function Header({ search, onSearch, favCount = 0 }) {
  const [time, setTime] = useState("");

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
    <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 px-4 sm:px-6 py-3 border-b border-white/5 bg-bg/90 backdrop-blur-xl sticky top-0 z-50">
      <div className="flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-3 no-underline">
          <img
            src="/logo-canlitvrehber.svg"
            alt={`${BRAND.domain} logo`}
            className="w-10 h-10 rounded-xl border border-white/10"
            loading="eager"
          />
          <div>
            <div className="text-base font-extrabold tracking-tight leading-none text-white">
              Canli<span className="text-accent">TV</span> Rehber
            </div>
            <div className="text-[10px] text-accent font-mono font-semibold tracking-[1.2px]">
              {BRAND.domain}
            </div>
          </div>
        </Link>

        <div className="font-mono text-xs sm:text-sm text-white/60 font-medium px-3 py-1.5 bg-surface rounded-lg border border-white/10 lg:hidden">
          {time}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <nav className="flex gap-1 bg-surface rounded-xl p-1 border border-white/10">
          <Link
            href="/"
            className="px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold text-white/70 hover:text-white transition no-underline"
          >
            Kanallar
          </Link>
          <Link
            href="/favorites"
            className="px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold text-white/70 hover:text-white transition no-underline inline-flex items-center gap-1.5"
          >
            Favoriler
            {favCount > 0 && (
              <span className="bg-danger text-white text-[10px] font-bold px-1.5 rounded-full">
                {favCount}
              </span>
            )}
          </Link>
          <Link
            href="/telif-bildirimi"
            className="px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold text-white/70 hover:text-white transition no-underline"
          >
            Telif
          </Link>
        </nav>

        <div className="hidden sm:flex items-center gap-2 bg-surface border border-white/10 rounded-xl px-3 py-2 min-w-[260px] focus-within:border-accent transition">
          <span className="text-xs opacity-50">ARA</span>
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Kanal ara..."
            className="bg-transparent border-none outline-none text-white text-sm font-sans w-full placeholder:text-white/30"
          />
        </div>

        <div className="hidden lg:block font-mono text-sm text-white/60 font-medium px-3 py-1.5 bg-surface rounded-lg border border-white/10">
          {time}
        </div>
      </div>

      <div className="sm:hidden flex items-center gap-2 bg-surface border border-white/10 rounded-xl px-3 py-2 focus-within:border-accent transition">
        <span className="text-xs opacity-50">ARA</span>
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Kanal ara..."
          className="bg-transparent border-none outline-none text-white text-sm font-sans w-full placeholder:text-white/30"
        />
      </div>
    </header>
  );
}
