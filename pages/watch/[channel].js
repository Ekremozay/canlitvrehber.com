import { useEffect, useMemo } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import dynamic from "next/dynamic";
import { CHANNELS } from "../../lib/channels";
import AdSlot from "../../components/AdSlot";
import SeoHead from "../../components/SeoHead";
import { AD_SLOTS } from "../../lib/adSlots";
import { getBasePlaybackStatus } from "../../lib/playbackStatus";
import { usePlaybackAvailability } from "../../lib/usePlaybackAvailability";
import { getCanliTvModeLabel, getCanliTvReference } from "../../lib/canlitvReference";
import { getOfficialLiveLink, getYoutubeLiveLink } from "../../lib/channelPlayback";

const VideoPlayer = dynamic(() => import("../../components/VideoPlayer"), {
  ssr: false,
  loading: () => (
    <div className="flex aspect-video w-full items-center justify-center rounded-2xl border border-white/10 bg-black">
      <div className="h-10 w-10 rounded-full border-[3px] border-white/10 border-t-accent animate-spin" />
    </div>
  ),
});

function ExternalButton({ link }) {
  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center justify-center rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 no-underline transition hover:bg-white/10"
    >
      {link.label}
    </a>
  );
}

function prettyCategory(category) {
  const labels = {
    general: "Genel",
    news: "Haber",
    sports: "Spor",
    kids: "Çocuk",
    documentary: "Belgesel",
    religious: "Dini",
    local: "Yerel",
    commercial: "Ticari",
  };

  return labels[category] || category;
}

export default function WatchPage({
  favorites,
  recentlyWatched = [],
  toggleFavorite,
  recordWatch,
}) {
  const router = useRouter();
  const { channel: channelId } = router.query;

  const channel = CHANNELS.find((item) => item.id === channelId);
  const isFav = channel ? favorites.includes(channel.id) : false;
  const recommendedChannels = useMemo(() => {
    if (!channel) return [];

    const recentIds = new Set(recentlyWatched.map((item) => item.id));
    const favoriteIds = new Set(favorites);

    return CHANNELS.filter((item) => item.id !== channel.id)
      .sort((left, right) => {
        const leftSameCategory = left.category === channel.category ? 1 : 0;
        const rightSameCategory = right.category === channel.category ? 1 : 0;
        if (rightSameCategory !== leftSameCategory) {
          return rightSameCategory - leftSameCategory;
        }

        const leftRecent = recentIds.has(left.id) ? 1 : 0;
        const rightRecent = recentIds.has(right.id) ? 1 : 0;
        if (rightRecent !== leftRecent) {
          return rightRecent - leftRecent;
        }

        const leftFavorite = favoriteIds.has(left.id) ? 1 : 0;
        const rightFavorite = favoriteIds.has(right.id) ? 1 : 0;
        if (rightFavorite !== leftFavorite) {
          return rightFavorite - leftFavorite;
        }

        return left.name.localeCompare(right.name, "tr");
      })
      .slice(0, 8);
  }, [channel, favorites, recentlyWatched]);
  const relatedChannels = channel ? [channel, ...recommendedChannels] : [];
  const playbackStatuses = usePlaybackAvailability(relatedChannels);

  const getPlaybackStatus = (item) => {
    if (!item) return null;
    return playbackStatuses[item.id] || getBasePlaybackStatus(item);
  };

  const currentPlaybackStatus = getPlaybackStatus(channel);
  const canPlayInSite = currentPlaybackStatus?.playable || false;
  const playbackType = currentPlaybackStatus?.playbackType || "external";
  const canliTvReference = getCanliTvReference(channel);
  const youtubeLiveLink = getYoutubeLiveLink(channel);
  const officialLiveLink = getOfficialLiveLink(channel);
  const visibleExternalLinks = [youtubeLiveLink, officialLiveLink].filter(
    (item, index, list) => item?.url && list.findIndex((entry) => entry?.url === item.url) === index
  );
  const continueWatchingChannels = useMemo(() => {
    return recentlyWatched
      .map((entry) => CHANNELS.find((item) => item.id === entry.id))
      .filter((item) => item && item.id !== channel?.id)
      .slice(0, 4);
  }, [channel?.id, recentlyWatched]);
  const nextChannel = recommendedChannels[0] || null;
  const otherChannels = recommendedChannels;

  useEffect(() => {
    if (!channel?.id || typeof recordWatch !== "function") return;
    recordWatch(channel.id);
  }, [channel?.id, recordWatch]);

  if (!channelId) return null;

  if (!channel) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg px-6">
        <div className="max-w-md text-center">
          <div className="mb-4 text-5xl">?</div>
          <h1 className="mb-2 text-xl font-bold">Kanal bulunamadı</h1>
          <p className="mb-6 text-sm text-white/50">
            Kanal bağlantısı geçersiz olabilir ya da bu kanal listede yer almıyor olabilir.
          </p>
          <Link
            href="/"
            className="rounded-xl bg-accent px-6 py-2.5 text-sm font-bold text-black no-underline transition hover:brightness-110"
          >
            Ana Sayfaya Dön
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <SeoHead
        title={`${channel.name} Canlı İzle`}
        description={`${channel.name} canlı yayınına tek dokunuşla ulaş. Önce yayın açılır, gerekirse YouTube ve resmi site seçenekleri burada sunulur.`}
        path={`/watch/${channel.id}`}
      />

      <div className="min-h-screen bg-bg">
        <div className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <Link
                href="/"
                className="rounded-lg border border-white/15 px-3 py-2 text-sm text-white/75 no-underline transition hover:bg-white/10 hover:text-white"
              >
                Geri Dön
              </Link>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-danger/30 bg-danger/15 px-2.5 py-0.5 text-[10px] font-bold tracking-widest font-mono text-danger">
                <span className="h-1.5 w-1.5 rounded-full bg-danger animate-pulse" />
                CANLI
              </span>
              <h1 className="truncate text-base font-extrabold sm:text-lg">{channel.name}</h1>
            </div>

            <button
              onClick={() => toggleFavorite(channel.id)}
              className="rounded-lg border border-white/15 px-3 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
            >
              {isFav ? "Favorilerden Çıkar" : "Favoriye Ekle"}
            </button>
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_360px]">
            <div className="space-y-4">
              <VideoPlayer channel={channel} playbackStatus={currentPlaybackStatus} />

              {(nextChannel || continueWatchingChannels.length > 0) && (
                <div className="rounded-2xl border border-white/10 bg-surface/50 p-4 sm:p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="max-w-2xl">
                      <div className="text-[11px] font-bold tracking-[1px] text-accent/80">SIRADAKİ</div>
                      <h2 className="mt-2 text-xl font-extrabold tracking-tight text-white">
                        Bunu da izleyebilirsin
                      </h2>
                      <p className="mt-2 text-sm text-white/55">
                        Aynı kategori ve izleme alışkanlığına göre seçilen kanallar burada.
                      </p>
                    </div>

                    {nextChannel && (
                      <Link
                        href={`/watch/${nextChannel.id}`}
                        className="inline-flex min-h-12 items-center justify-center rounded-xl bg-accent px-5 py-3 text-sm font-bold text-black no-underline transition hover:brightness-110"
                      >
                        Sıradaki Kanal: {nextChannel.name}
                      </Link>
                    )}
                  </div>

                  {continueWatchingChannels.length > 0 && (
                    <div className="mt-4">
                      <div className="mb-2 text-[11px] font-bold tracking-[1px] text-white/45">
                        AZ ÖNCE İZLEDİKLERİN
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {continueWatchingChannels.map((item) => (
                          <Link
                            key={`recent-${item.id}`}
                            href={`/watch/${item.id}`}
                            className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 no-underline transition hover:bg-white/10"
                          >
                            {item.name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {otherChannels.length > 0 && (
                    <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                      {otherChannels.slice(0, 6).map((item) => {
                        const itemPlaybackStatus = getPlaybackStatus(item);
                        const itemPlayable = itemPlaybackStatus?.playable || false;

                        return (
                          <Link
                            key={`next-grid-${item.id}`}
                            href={`/watch/${item.id}`}
                            className="rounded-xl border border-white/10 bg-bg/60 px-3 py-3 text-white no-underline transition hover:border-white/20 hover:bg-bg"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span className="truncate text-sm font-semibold">{item.name}</span>
                              <span
                                className={`text-[10px] font-mono ${
                                  itemPlayable ? "text-accent" : "text-white/35"
                                }`}
                              >
                                {itemPlayable
                                  ? itemPlaybackStatus?.playbackType === "youtube"
                                    ? "YT"
                                    : "CANLI"
                                  : "YOK"}
                              </span>
                            </div>
                            <div className="mt-2 text-[11px] text-white/45">
                              {item.category === channel.category ? "Aynı kategori" : "Öne çıkan seçim"}
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {!canPlayInSite && (
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
                  <div className="mb-2 text-sm font-bold text-amber-200">
                    Bu kanal şu anda site içinde açılamıyor
                  </div>
                  <p className="mb-3 text-xs text-amber-100/80">
                    Önce yayın denenir, ardından YouTube, son olarak resmi site açılır.
                  </p>
                  {canliTvReference?.mode && (
                    <p className="mb-3 text-[11px] text-amber-100/75">
                      Kaynak durumu: {getCanliTvModeLabel(canliTvReference.mode)}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {visibleExternalLinks.length > 0 ? (
                      visibleExternalLinks.map((link) => (
                        <ExternalButton key={`${channel.id}-${link.url}`} link={link} />
                      ))
                    ) : (
                      <span className="text-xs text-amber-100/70">Doğrulanmış bir YouTube ya da resmi site bağlantısı bulunamadı.</span>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <div className="rounded-xl border border-white/10 bg-surface/60 p-3">
                  <div className="text-[11px] uppercase tracking-wide text-white/40">Kategori</div>
                  <div className="mt-1 text-sm font-semibold">{prettyCategory(channel.category)}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-surface/60 p-3">
                  <div className="text-[11px] uppercase tracking-wide text-white/40">Ülke</div>
                  <div className="mt-1 text-sm font-semibold">{channel.country || "Bilinmiyor"}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-surface/60 p-3">
                  <div className="text-[11px] uppercase tracking-wide text-white/40">Yayıncı / Ağ</div>
                  <div className="mt-1 truncate text-sm font-semibold">{channel.network || "Bilinmiyor"}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-surface/60 p-3">
                  <div className="text-[11px] uppercase tracking-wide text-white/40">Oynatma Türü</div>
                  <div className="mt-1 text-sm font-semibold">
                    {playbackType === "internal"
                      ? "Yayın"
                      : playbackType === "youtube"
                        ? "YouTube"
                        : "Harici"}
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-surface/60 p-3">
                  <div className="text-[11px] uppercase tracking-wide text-white/40">Kaynak Referansı</div>
                  <div className="mt-1 text-sm font-semibold">
                    {canliTvReference ? getCanliTvModeLabel(canliTvReference.mode) : "Bulunamadı"}
                  </div>
                </div>
              </div>
            </div>

            <aside className="space-y-4">
              <AdSlot
                slot={AD_SLOTS.watchSidebarTop}
                label="İzleme Sayfası Reklam 1"
                minHeight={250}
              />

              <div className="rounded-2xl border border-white/10 bg-surface/50 p-4">
                <h2 className="mb-3 text-sm font-bold text-white/70">Kanal Bilgisi</h2>
                <p className="text-sm text-white/80">{channel.description}</p>

                {channel.sourceCategories?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {channel.sourceCategories.slice(0, 6).map((category) => (
                      <span
                        key={`${channel.id}-cat-${category}`}
                        className="rounded-full border border-white/15 bg-white/5 px-2 py-1 text-[11px] text-white/70"
                      >
                        {category}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-4 space-y-2">
                  {channel.officialWebsite && (
                    <a
                      href={channel.officialWebsite}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block break-all text-xs text-accent hover:underline"
                    >
                      Resmi Site: {channel.officialWebsite}
                    </a>
                  )}
                  {channel.sourceChannelId && (
                    <div className="text-xs text-white/40">Veri Kaynağı ID: {channel.sourceChannelId}</div>
                  )}
                </div>
              </div>

              {visibleExternalLinks.length > 0 && (
                <div className="rounded-2xl border border-white/10 bg-surface/50 p-4">
                  <h3 className="mb-3 text-sm font-bold text-white/70">Ek Kaynaklar</h3>
                  <div className="grid grid-cols-1 gap-2">
                    {visibleExternalLinks.map((link) => (
                      <ExternalButton key={`${channel.id}-ext-${link.url}`} link={link} />
                    ))}
                  </div>
                </div>
              )}

              {channel.epg?.length > 0 && (
                <div className="rounded-2xl border border-white/10 bg-surface/50 p-4">
                  <h3 className="mb-3 text-sm font-bold text-white/70">Yayın Akışı</h3>
                  <div className="space-y-2">
                    {channel.epg.map((item, index) => (
                      <div
                        key={`${channel.id}-epg-${item.time}-${index}`}
                        className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${
                          index === 0 ? "border-accent/40 bg-accent/10" : "border-white/10 bg-white/[0.02]"
                        }`}
                      >
                        <span className="min-w-[52px] font-mono text-xs text-accent">{item.time}</span>
                        <span className="text-sm text-white/80">{item.show}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-2xl border border-white/10 bg-surface/50 p-4">
                <h3 className="mb-3 text-sm font-bold text-white/70">Benzer Kanallar</h3>
                <div className="space-y-2">
                  {otherChannels.map((item) => {
                    const itemPlaybackStatus = getPlaybackStatus(item);
                    const itemHasStream = itemPlaybackStatus?.playable || false;

                    return (
                      <Link
                        key={item.id}
                        href={`/watch/${item.id}`}
                        className="flex w-full items-center gap-2.5 rounded-xl border border-white/[0.08] px-3 py-2.5 text-sm font-medium text-white no-underline transition hover:border-white/20 hover:bg-surface"
                      >
                        <div className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: item.color }} />
                        <span className="flex-1 truncate">{item.name}</span>
                        <span className={`text-[10px] font-mono ${itemHasStream ? "text-accent" : "text-white/40"}`}>
                          {itemHasStream
                            ? itemPlaybackStatus?.playbackType === "internal"
                              ? "IN"
                              : itemPlaybackStatus?.playbackType === "youtube"
                                ? "YT"
                                : "CANLI"
                            : "YOK"}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>

              <AdSlot
                slot={AD_SLOTS.watchSidebarBottom}
                label="İzleme Sayfası Reklam 2"
                minHeight={250}
              />

              <div className="rounded-2xl border border-emerald-400/35 bg-emerald-400/10 p-3.5 text-xs text-emerald-100/85">
                Oynatma sırası: önce yayın, sonra YouTube, en son resmi site.
              </div>
            </aside>
          </div>
        </div>
      </div>
    </>
  );
}
