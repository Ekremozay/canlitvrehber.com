import { useMemo, useState } from "react";
import Head from "next/head";
import Header from "../components/Header";
import CategoryMenu from "../components/CategoryMenu";
import ChannelCard from "../components/ChannelCard";
import ChannelListItem from "../components/ChannelListItem";
import AdSlot from "../components/AdSlot";
import SeoHead from "../components/SeoHead";
import { CHANNELS, CATEGORIES } from "../lib/channels";
import { AD_SLOTS } from "../lib/adSlots";
import { BRAND, SITE_URL } from "../lib/siteConfig";
import { SAFE_MODE_ENABLED, canUseInternalStream } from "../lib/safeMode";
import { isChannelPlayable } from "../lib/channelPlayback";
import canliTvReferenceRows from "../data/canlitv-reference.json";

const VIEW_MODES = [
  { id: "cards", label: "Kart" },
  { id: "list", label: "Liste" },
  { id: "both", label: "Tumu" },
];

function hasPlayableStream(channel) {
  return isChannelPlayable(channel);
}

export default function Home({ favorites, toggleFavorite }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [showPlayableOnly, setShowPlayableOnly] = useState(true);
  const [viewMode, setViewMode] = useState("list");
  const [letterFilter, setLetterFilter] = useState("all");
  const searchTerm = search.trim().toLowerCase();

  const totalPlayable = useMemo(() => {
    return CHANNELS.filter((item) => hasPlayableStream(item)).length;
  }, []);
  const totalInternal = useMemo(() => {
    return CHANNELS.filter((item) => canUseInternalStream(item)).length;
  }, []);
  const totalExternal = CHANNELS.length - totalPlayable;
  const referenceSummary = useMemo(() => {
    const totals = { total: 0, redirect: 0, open: 0, youtube: 0 };
    canliTvReferenceRows.forEach((item) => {
      totals.total += 1;
      if (item.mode === "telif_redirect") totals.redirect += 1;
      if (String(item.mode || "").startsWith("embedded")) totals.open += 1;
      if (item.mode === "embedded_youtube") totals.youtube += 1;
    });
    return totals;
  }, []);

  const letterOptions = useMemo(() => {
    const firstLetters = CHANNELS.map((item) => item.name.charAt(0).toUpperCase()).filter(Boolean);
    return Array.from(new Set(firstLetters)).sort((a, b) => a.localeCompare(b, "tr"));
  }, []);

  const filtered = useMemo(() => {
    return CHANNELS.filter((channel) => {
      const inCategory = category === "all" || channel.category === category;
      const inSearch =
        channel.name.toLowerCase().includes(searchTerm) ||
        (channel.description || "").toLowerCase().includes(searchTerm);
      const byPlayableFilter = !showPlayableOnly || hasPlayableStream(channel);
      const byLetter =
        letterFilter === "all" || channel.name.toUpperCase().startsWith(letterFilter);

      return inCategory && inSearch && byPlayableFilter && byLetter;
    });
  }, [category, searchTerm, showPlayableOnly, letterFilter]);

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
    "Canli TV kanallarini tek ekranda izle. Haber, spor, cocuk, belgesel ve yerel kanallara hizli ulas; dahili player ve resmi canli yayin linkleriyle kesintisiz deneyim.";

  return (
    <>
      <SeoHead title="Canli TV Rehberi - Haber, Spor, Cocuk, Belgesel" description={seoDescription} />
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
            <AdSlot
              slot={AD_SLOTS.homeLeaderboard}
              label="Ust Banner Reklam"
              minHeight={120}
              className="mb-4"
            />

            <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_310px] gap-6">
              <section>
                <div className="rounded-2xl border border-white/10 bg-surface/50 p-4 sm:p-5 mb-5">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div>
                      <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">Kanal Rehberi</h1>
                      <p className="text-sm text-white/50 mt-1">
                        Toplam {CHANNELS.length} kanal, site icinde oynatilabilen {totalPlayable} kanal.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {SAFE_MODE_ENABLED && (
                        <span className="px-2.5 py-1 rounded-full border border-amber-400/40 bg-amber-300/10 text-amber-200 text-[11px] font-semibold">
                          Hukuki Guvenli Mod Acik
                        </span>
                      )}
                      <span className="px-2.5 py-1 rounded-full border border-white/15 bg-white/5 text-white/70 text-[11px] font-semibold">
                        Ref: {referenceSummary.redirect} resmi / {referenceSummary.open} acik
                      </span>
                      <button
                        onClick={() => setShowPlayableOnly((prev) => !prev)}
                        className={`px-3.5 py-2 rounded-lg text-xs font-semibold border transition ${
                          showPlayableOnly
                            ? "bg-accent/15 text-accent border-accent/40"
                            : "bg-white/5 text-white/70 border-white/15 hover:bg-white/10"
                        }`}
                      >
                        {showPlayableOnly ? "Tum Kanallari Goster" : "Sadece Oynatilabilenler"}
                      </button>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-[1fr_auto] gap-3">
                    <div className="flex items-center gap-2 bg-bg/70 border border-white/10 rounded-xl px-3 py-2 focus-within:border-accent transition">
                      <span className="text-[10px] font-semibold tracking-[1px] text-white/45">BUL</span>
                      <input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Kanal adina gore ara..."
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
                      Harf: Tumu
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
                  <span className="text-sm text-white/40 font-medium">Sonuc: {filtered.length} kanal</span>
                  <span className="px-2 py-1 rounded-full text-[11px] border border-accent/30 bg-accent/10 text-accent font-semibold">
                    Oynatilabilir: {totalPlayable}
                  </span>
                  <span className="px-2 py-1 rounded-full text-[11px] border border-emerald-400/30 bg-emerald-400/10 text-emerald-100 font-semibold">
                    Dahili: {totalInternal}
                  </span>
                  <span className="px-2 py-1 rounded-full text-[11px] border border-white/20 text-white/60 font-semibold">
                    Harici: {totalExternal}
                  </span>
                  <button
                    onClick={() => {
                      setSearch("");
                      setCategory("all");
                      setLetterFilter("all");
                      setShowPlayableOnly(true);
                      setViewMode("list");
                    }}
                    className="ml-auto px-3 py-1.5 rounded-lg text-[11px] font-semibold border border-white/20 text-white/65 hover:text-white hover:bg-white/10 transition"
                  >
                    Filtreleri Sifirla
                  </button>
                </div>

                {filtered.length === 0 ? (
                  <div className="flex flex-col items-center py-20 text-center rounded-2xl border border-white/10 bg-surface/40">
                    <div className="text-5xl mb-4">-</div>
                    <h3 className="text-lg font-bold mb-2">Kanal bulunamadi</h3>
                    <p className="text-sm text-white/40 max-w-md px-4">
                      Arama ifadesini veya kategori secimini degistirip tekrar dene.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {showCards && (
                      <section>
                        {viewMode === "both" && (
                          <div className="mb-3">
                            <h2 className="text-sm font-bold uppercase tracking-[1px] text-white/60">
                              Kart Gorunumu
                            </h2>
                          </div>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                          {cardItemsWithAds.map((item) =>
                            item.type === "ad" ? (
                              <div key={item.id} className="sm:col-span-2 lg:col-span-3 xl:col-span-4">
                                <AdSlot
                                  slot={AD_SLOTS.homeInfeed}
                                  label="Icerik Ici Reklam"
                                  minHeight={130}
                                  format={AD_SLOTS.homeInfeedLayoutKey ? "fluid" : "auto"}
                                  layoutKey={AD_SLOTS.homeInfeedLayoutKey}
                                />
                              </div>
                            ) : (
                              <ChannelCard
                                key={item.id}
                                channel={item.channel}
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
                              Liste Gorunumu
                            </h2>
                          </div>
                        )}
                        <div className="space-y-2">
                          {filtered.map((channel) => (
                            <ChannelListItem
                              key={`list-${channel.id}`}
                              channel={channel}
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
                    label="Sag Alan Reklam 1"
                    minHeight={280}
                  />
                  <AdSlot
                    slot={AD_SLOTS.homeSidebarBottom}
                    label="Sag Alan Reklam 2"
                    minHeight={280}
                  />
                </div>
              </aside>
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
