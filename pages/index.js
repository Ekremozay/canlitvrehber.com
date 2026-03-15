import Link from "next/link";
import { useMemo, useState } from "react";
import Head from "next/head";
import Header from "../components/Header";
import CategoryMenu from "../components/CategoryMenu";
import ChannelCard from "../components/ChannelCard";
import ChannelListItem from "../components/ChannelListItem";
import AiGuidePanel from "../components/AiGuidePanel";
import AdSlot from "../components/AdSlot";
import SeoHead from "../components/SeoHead";
import { CHANNELS, CATEGORIES } from "../lib/channels";
import { AD_SLOTS } from "../lib/adSlots";
import { BRAND, SITE_URL } from "../lib/siteConfig";
import { getBasePlaybackStatus } from "../lib/playbackStatus";
import { canUseInternalStream } from "../lib/safeMode";
import { usePlaybackAvailability } from "../lib/usePlaybackAvailability";
import canliTvReferenceRows from "../data/canlitv-reference.json";

const VIEW_MODES = [
  { id: "cards", label: "Kart" },
  { id: "list", label: "Liste" },
  { id: "both", label: "Tümü" },
];

const PLAYBACK_FILTERS = [
  { id: "playable", label: "Oynatılabilen" },
  { id: "internal", label: "Yayın" },
  { id: "youtube", label: "YouTube" },
  { id: "all", label: "Tümü" },
];

function createStableIndex(seed, max) {
  if (!max) return 0;

  let hash = 0;
  for (const char of String(seed || "")) {
    hash = (hash * 33 + char.charCodeAt(0)) >>> 0;
  }

  return hash % max;
}

function uniqueChannels(channels) {
  const seen = new Set();
  return channels.filter((channel) => {
    if (!channel?.id || seen.has(channel.id)) return false;
    seen.add(channel.id);
    return true;
  });
}

export default function Home({ favorites, recentlyWatched = [], toggleFavorite }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [playbackFilter, setPlaybackFilter] = useState("playable");
  const [viewMode, setViewMode] = useState("list");
  const [letterFilter, setLetterFilter] = useState("all");
  const searchTerm = search.trim().toLowerCase();
  const playbackStatuses = usePlaybackAvailability(CHANNELS);

  const getPlaybackStatus = (channel) => {
    return playbackStatuses[channel.id] || getBasePlaybackStatus(channel);
  };

  const totalPlayable = useMemo(() => {
    return CHANNELS.filter((item) => getPlaybackStatus(item).playable).length;
  }, [playbackStatuses]);
  const totalInternal = useMemo(() => {
    return CHANNELS.filter((item) => canUseInternalStream(item)).length;
  }, []);
  const totalYoutubeFallback = useMemo(() => {
    return CHANNELS.filter((item) => getPlaybackStatus(item).playbackType === "youtube").length;
  }, [playbackStatuses]);
  const totalExternal = CHANNELS.length - totalPlayable;
  const referenceSummary = useMemo(() => {
    const totals = { total: 0, youtube: 0 };
    canliTvReferenceRows.forEach((item) => {
      totals.total += 1;
      if (item.mode === "embedded_youtube") totals.youtube += 1;
    });
    return totals;
  }, []);

  const letterOptions = useMemo(() => {
    const firstLetters = CHANNELS.map((item) => item.name.charAt(0).toUpperCase()).filter(Boolean);
    return Array.from(new Set(firstLetters)).sort((a, b) => a.localeCompare(b, "tr"));
  }, []);

  const recentChannels = useMemo(() => {
    return recentlyWatched
      .map((entry) => {
        const channel = CHANNELS.find((item) => item.id === entry.id);
        if (!channel) return null;
        return {
          ...channel,
          watchedAt: entry.watchedAt,
        };
      })
      .filter(Boolean);
  }, [recentlyWatched]);

  const continueWatchingChannels = useMemo(() => {
    return uniqueChannels(recentChannels).slice(0, 4);
  }, [recentChannels]);

  const favoriteChannels = useMemo(() => {
    return CHANNELS.filter((channel) => favorites.includes(channel.id));
  }, [favorites]);

  const personalizedChannels = useMemo(() => {
    const seen = new Set([
      ...continueWatchingChannels.map((item) => item.id),
      ...favoriteChannels.map((item) => item.id),
    ]);

    const preferredCategories = Array.from(
      new Set(
        [...continueWatchingChannels, ...favoriteChannels]
          .map((item) => item.category)
          .filter(Boolean)
      )
    );

    const pool = CHANNELS.filter((channel) => {
      if (seen.has(channel.id)) return false;
      if (preferredCategories.length === 0) return true;
      return preferredCategories.includes(channel.category);
    })
      .sort((left, right) => {
        const leftPlayable = getPlaybackStatus(left).playable ? 1 : 0;
        const rightPlayable = getPlaybackStatus(right).playable ? 1 : 0;
        return rightPlayable - leftPlayable;
      });

    return uniqueChannels(pool).slice(0, 4);
  }, [continueWatchingChannels, favoriteChannels, playbackStatuses]);

  const surpriseChannel = useMemo(() => {
    const candidates = CHANNELS.filter((channel) => getPlaybackStatus(channel).playable);
    if (candidates.length === 0) return null;

    const seed = [
      new Date().toISOString().slice(0, 10),
      continueWatchingChannels[0]?.id || "",
      favoriteChannels[0]?.id || "",
      totalPlayable,
    ].join(":");

    return candidates[createStableIndex(seed, candidates.length)] || candidates[0];
  }, [continueWatchingChannels, favoriteChannels, playbackStatuses, totalPlayable]);

  const filtered = useMemo(() => {
    return CHANNELS.filter((channel) => {
      const playbackStatus = getPlaybackStatus(channel);
      const inCategory = category === "all" || channel.category === category;
      const inSearch =
        channel.name.toLowerCase().includes(searchTerm) ||
        (channel.description || "").toLowerCase().includes(searchTerm);
      const byLetter =
        letterFilter === "all" || channel.name.toUpperCase().startsWith(letterFilter);
      const byPlaybackFilter =
        playbackFilter === "all" ||
        (playbackFilter === "playable" && playbackStatus.playable) ||
        (playbackFilter === "internal" && playbackStatus.playbackType === "internal") ||
        (playbackFilter === "youtube" && playbackStatus.playbackType === "youtube");

      return inCategory && inSearch && byPlaybackFilter && byLetter;
    });
  }, [category, searchTerm, playbackFilter, letterFilter, playbackStatuses]);

  const cardItemsWithAds = useMemo(() => {
    const output = [];

    filtered.forEach((channel, index) => {
      if (index > 0 && index % 8 === 0) {
        output.push({ type: "ad", id: `infeed-${index}` });
      }
      output.push({ type: "channel", id: channel.id, channel });
    });

    return output;
  }, [filtered]);

  const showCards = viewMode === "cards" || viewMode === "both";
  const showList = viewMode === "list" || viewMode === "both";

  const seoDescription =
    "Canlı TV kanallarını tek ekranda izle. Haber, spor, çocuk, belgesel ve yerel kanallara hızlıca ulaş; önce yayın, açılmazsa YouTube, sonrasında resmi site ile izlemeye devam et.";

  return (
    <>
      <SeoHead title="Canlı TV Rehberi - Haber, Spor, Çocuk, Belgesel" description={seoDescription} />
      <Head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: BRAND.name,
              url: SITE_URL,
              potentialAction: {
                "@type": "SearchAction",
                target: `${SITE_URL}/?search={search_term_string}`,
                "query-input": "required name=search_term_string",
              },
            }),
          }}
        />
      </Head>

      <div className="min-h-screen bg-bg flex flex-col">
        <Header search={search} onSearch={setSearch} favCount={favorites.length} />

        <div className="flex flex-1 overflow-hidden">
          <aside className="w-64 flex-shrink-0 border-r border-white/[0.06] bg-surface/50 p-4 overflow-y-auto hidden lg:block">
            <CategoryMenu active={category} onChange={setCategory} />
          </aside>

          <main className="flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_310px] gap-6">
              <section>
                <AiGuidePanel playableCount={totalPlayable} />

                <div className="mb-5 grid gap-4 lg:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-surface/50 p-4">
                    <div className="text-[11px] font-bold tracking-[1px] text-accent/80">İZLEME DEVAMI</div>
                    <div className="mt-2 text-lg font-extrabold text-white">
                      {continueWatchingChannels[0]?.name || "İlk izlemene burada devam edebilirsin"}
                    </div>
                    <p className="mt-2 text-sm text-white/50">
                      Son izlediğin yayınlara tek dokunuşla yeniden ulaş.
                    </p>
                    {continueWatchingChannels[0] ? (
                      <Link
                        href={`/watch/${continueWatchingChannels[0].id}`}
                        className="mt-4 inline-flex rounded-xl bg-accent px-4 py-2 text-sm font-bold text-black no-underline transition hover:brightness-110"
                      >
                        Yayına Dön
                      </Link>
                    ) : (
                      <div className="mt-4 text-xs text-white/35">İzledikçe burada görünür.</div>
                    )}
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-surface/50 p-4">
                    <div className="text-[11px] font-bold tracking-[1px] text-emerald-200/80">FAVORİ LİSTEN</div>
                    <div className="mt-2 text-lg font-extrabold text-white">
                      {favoriteChannels.length > 0
                        ? `${favoriteChannels.length} favori kanal hazır`
                        : "Favori listeni oluştur"}
                    </div>
                    <p className="mt-2 text-sm text-white/50">
                      Sık izlediğin kanalları kaydedip tek yerden açabilirsin.
                    </p>
                    <Link
                      href={favoriteChannels.length > 0 ? "/favorites" : surpriseChannel ? `/watch/${surpriseChannel.id}` : "/favorites"}
                      className="mt-4 inline-flex rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white no-underline transition hover:bg-white/15"
                    >
                      {favoriteChannels.length > 0 ? "Favorilerine Git" : "Kanal Seç"}
                    </Link>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-surface/50 p-4">
                    <div className="text-[11px] font-bold tracking-[1px] text-sky-200/80">GÜNÜN SEÇİMİ</div>
                    <div className="mt-2 text-lg font-extrabold text-white">
                      {surpriseChannel?.name || "Yeni öneriler hazır olduğunda burada görünür"}
                    </div>
                    <p className="mt-2 text-sm text-white/50">
                      Yeni bir şey izlemek istersen tek dokunuşla aç.
                    </p>
                    {surpriseChannel && (
                      <Link
                        href={`/watch/${surpriseChannel.id}`}
                        className="mt-4 inline-flex rounded-xl border border-sky-300/25 bg-sky-300/10 px-4 py-2 text-sm font-semibold text-sky-100 no-underline transition hover:bg-sky-300/20"
                      >
                        Keşfet
                      </Link>
                    )}
                  </div>
                </div>

                {continueWatchingChannels.length > 0 && (
                  <section className="mb-5">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <h2 className="text-sm font-bold uppercase tracking-[1px] text-white/70">
                          İzlemeye Devam Et
                        </h2>
                        <p className="mt-1 text-sm text-white/45">
                          Son izlediğin kanallar burada hazır.
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                      {continueWatchingChannels.map((channel) => (
                        <ChannelCard
                          key={`continue-${channel.id}`}
                          channel={channel}
                          playable={getPlaybackStatus(channel).playable}
                          playbackType={getPlaybackStatus(channel).playbackType}
                          isFav={favorites.includes(channel.id)}
                          onToggleFav={toggleFavorite}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {personalizedChannels.length > 0 && (
                  <section className="mb-5">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <h2 className="text-sm font-bold uppercase tracking-[1px] text-white/70">
                          Sana Özel Öneriler
                        </h2>
                        <p className="mt-1 text-sm text-white/45">
                          Favorilerin ve son izlediklerin doğrultusunda seçildi.
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                      {personalizedChannels.map((channel) => (
                        <ChannelCard
                          key={`personal-${channel.id}`}
                          channel={channel}
                          playable={getPlaybackStatus(channel).playable}
                          playbackType={getPlaybackStatus(channel).playbackType}
                          isFav={favorites.includes(channel.id)}
                          onToggleFav={toggleFavorite}
                        />
                      ))}
                    </div>
                  </section>
                )}

                <div className="rounded-2xl border border-white/10 bg-surface/50 p-4 sm:p-5 mb-5">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div>
                      <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">Canlı Yayın Vitrini</h1>
                      <p className="text-sm text-white/50 mt-1">
                        Toplam {CHANNELS.length} kanal, site içinde açılabilen {totalPlayable} kanal.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-1 rounded-full border border-emerald-400/40 bg-emerald-400/10 text-emerald-100 text-[11px] font-semibold">
                        İzleme sırası: Yayın &gt; YouTube &gt; Resmi Site
                      </span>
                      <span className="px-2.5 py-1 rounded-full border border-white/15 bg-white/5 text-white/70 text-[11px] font-semibold">
                        Doğrulanmış YouTube bağlantısı: {referenceSummary.youtube}
                      </span>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-[1fr_auto] gap-3">
                    <div className="flex items-center gap-2 bg-bg/70 border border-white/10 rounded-xl px-3 py-2 focus-within:border-accent transition">
                      <span className="text-[10px] font-semibold tracking-[1px] text-white/45">ARA</span>
                      <input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Kanal, kategori veya içerik ara..."
                        className="bg-transparent border-none outline-none text-white text-sm w-full placeholder:text-white/30"
                      />
                    </div>

                    <div className="inline-flex bg-bg/80 border border-white/10 rounded-xl p-1 text-xs">
                      {VIEW_MODES.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => setViewMode(item.id)}
                          className={`px-3 py-2 rounded-lg font-semibold transition ${
                            viewMode === item.id
                              ? "bg-accent text-black"
                              : "text-white/60 hover:text-white"
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {PLAYBACK_FILTERS.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setPlaybackFilter(item.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                          playbackFilter === item.id
                            ? "bg-accent/15 text-accent border-accent/40"
                            : "bg-white/5 text-white/70 border-white/15 hover:bg-white/10"
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 mb-4 overflow-x-auto lg:hidden pb-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setCategory(cat.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                        category === cat.id
                          ? "bg-accent/10 text-accent border border-accent/30"
                          : "bg-white/[0.03] text-white/40 border border-white/[0.06]"
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>

                <div className="mb-4">
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    <button
                      onClick={() => setLetterFilter("all")}
                      className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold whitespace-nowrap transition ${
                        letterFilter === "all"
                          ? "bg-accent/10 text-accent border-accent/30"
                          : "bg-white/5 text-white/65 border-white/15 hover:bg-white/10"
                      }`}
                    >
                      Harf: Tümü
                    </button>
                    {letterOptions.map((letter) => (
                      <button
                        key={letter}
                        onClick={() => setLetterFilter(letter)}
                        className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold min-w-9 transition ${
                          letterFilter === letter
                            ? "bg-accent/10 text-accent border-accent/30"
                            : "bg-white/5 text-white/65 border-white/15 hover:bg-white/10"
                        }`}
                      >
                        {letter}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 mb-5">
                  <span className="text-sm text-white/40 font-medium">Sonuç: {filtered.length} kanal</span>
                  <span className="px-2 py-1 rounded-full text-[11px] border border-accent/30 bg-accent/10 text-accent font-semibold">
                    Oynatılabilen: {totalPlayable}
                  </span>
                  <span className="px-2 py-1 rounded-full text-[11px] border border-emerald-400/30 bg-emerald-400/10 text-emerald-100 font-semibold">
                    Yayın: {totalInternal}
                  </span>
                  <span className="px-2 py-1 rounded-full text-[11px] border border-sky-400/30 bg-sky-400/10 text-sky-100 font-semibold">
                    YouTube: {totalYoutubeFallback}
                  </span>
                  <span className="px-2 py-1 rounded-full text-[11px] border border-white/20 text-white/60 font-semibold">
                    Harici: {totalExternal}
                  </span>
                  <button
                    onClick={() => {
                      setSearch("");
                      setCategory("all");
                      setLetterFilter("all");
                      setPlaybackFilter("playable");
                      setViewMode("list");
                    }}
                    className="ml-auto px-3 py-1.5 rounded-lg text-[11px] font-semibold border border-white/20 text-white/65 hover:text-white hover:bg-white/10 transition"
                  >
                    Filtreleri Temizle
                  </button>
                </div>

                {filtered.length === 0 ? (
                  <div className="flex flex-col items-center py-20 text-center rounded-2xl border border-white/10 bg-surface/40">
                    <div className="text-5xl mb-4">-</div>
                    <h3 className="text-lg font-bold mb-2">Aradığın kritere uygun kanal bulunamadı</h3>
                    <p className="text-sm text-white/40 max-w-md px-4">
                      Arama ifadesini ya da kategori seçimini değiştirip yeniden dene.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {showCards && (
                      <section>
                        {viewMode === "both" && (
                          <div className="mb-3">
                            <h2 className="text-sm font-bold uppercase tracking-[1px] text-white/60">
                              Kart Görünümü
                            </h2>
                          </div>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                          {cardItemsWithAds.map((item) =>
                            item.type === "ad" ? (
                              <div key={item.id} className="sm:col-span-2 lg:col-span-3 xl:col-span-4">
                                <AdSlot
                                  slot={AD_SLOTS.homeInfeed}
                                  label="İçerik içi tanıtım alanı"
                                  minHeight={130}
                                  format={AD_SLOTS.homeInfeedLayoutKey ? "fluid" : "auto"}
                                  layoutKey={AD_SLOTS.homeInfeedLayoutKey}
                                />
                              </div>
                            ) : (
                              <ChannelCard
                                key={item.id}
                                channel={item.channel}
                                playable={getPlaybackStatus(item.channel).playable}
                                playbackType={getPlaybackStatus(item.channel).playbackType}
                                isFav={favorites.includes(item.channel.id)}
                                onToggleFav={toggleFavorite}
                              />
                            )
                          )}
                        </div>
                      </section>
                    )}

                    {showList && (
                      <section>
                        {viewMode === "both" && (
                          <div className="mb-3">
                            <h2 className="text-sm font-bold uppercase tracking-[1px] text-white/60">
                              Liste Görünümü
                            </h2>
                          </div>
                        )}
                        <div className="space-y-2">
                          {filtered.map((channel) => (
                            <ChannelListItem
                              key={`list-${channel.id}`}
                              channel={channel}
                              playable={getPlaybackStatus(channel).playable}
                              playbackType={getPlaybackStatus(channel).playbackType}
                              isFav={favorites.includes(channel.id)}
                              onToggleFav={toggleFavorite}
                            />
                          ))}
                        </div>
                      </section>
                    )}
                  </div>
                )}
              </section>

              <aside className="hidden xl:block">
                <div className="sticky top-20 space-y-4">
                  <AdSlot
                    slot={AD_SLOTS.homeSidebarTop}
                    label="Sağ alan tanıtım alanı 1"
                    minHeight={280}
                  />
                  <AdSlot
                    slot={AD_SLOTS.homeSidebarBottom}
                    label="Sağ alan tanıtım alanı 2"
                    minHeight={280}
                  />
                </div>
              </aside>
            </div>

            <AdSlot
              slot={AD_SLOTS.homeLeaderboard}
              label="Üst tanıtım alanı"
              minHeight={120}
              className="mt-6"
            />
          </main>
        </div>
      </div>
    </>
  );
}


