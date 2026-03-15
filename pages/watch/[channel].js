import { useRouter } from "next/router";
import Link from "next/link";
import dynamic from "next/dynamic";
import { CHANNELS } from "../../lib/channels";
import AdSlot from "../../components/AdSlot";
import SeoHead from "../../components/SeoHead";
import { AD_SLOTS } from "../../lib/adSlots";
import {
  SAFE_MODE_ENABLED,
  canUseInternalStream,
  isBlockedBySafeMode,
} from "../../lib/safeMode";
import { getCanliTvModeLabel, getCanliTvReference } from "../../lib/canlitvReference";

const VideoPlayer = dynamic(() => import("../../components/VideoPlayer"), {
  ssr: false,
  loading: () => (
    <div className="w-full aspect-video bg-black flex items-center justify-center rounded-2xl border border-white/10">
      <div className="w-10 h-10 border-[3px] border-white/10 border-t-accent rounded-full animate-spin" />
    </div>
  ),
});

function ExternalButton({ link }) {
  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center justify-center px-3 py-2 rounded-lg border border-white/15 bg-white/5 text-xs font-semibold text-white/80 hover:bg-white/10 transition no-underline"
    >
      {link.label}
    </a>
  );
}

export default function WatchPage({ favorites, toggleFavorite }) {
  const router = useRouter();
  const { channel: channelId } = router.query;

  const channel = CHANNELS.find((item) => item.id === channelId);
  const isFav = channel ? favorites.includes(channel.id) : false;

  const hasInternalStream = canUseInternalStream(channel);
  const blockedByPolicy = isBlockedBySafeMode(channel);
  const canliTvReference = getCanliTvReference(channel);

  const otherChannels = CHANNELS.filter((item) => item.id !== channelId).slice(0, 8);

  if (!channelId) return null;

  if (!channel) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <div className="text-5xl mb-4">?</div>
          <h1 className="text-xl font-bold mb-2">Kanal bulunamadi</h1>
          <p className="text-sm text-white/50 mb-6">
            Kanal ID gecersiz olabilir veya liste disinda kalmis olabilir.
          </p>
          <Link
            href="/"
            className="px-6 py-2.5 rounded-xl bg-accent text-black font-bold text-sm no-underline hover:brightness-110 transition"
          >
            Ana Sayfaya Don
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <SeoHead
        title={`${channel.name} Canli Izle`}
        description={`${channel.name} canli yayinina tek tikla ulas. Dahili player, yedek kaynaklar ve resmi canli yayin baglantilari burada.`}
        path={`/watch/${channel.id}`}
      />

      <div className="min-h-screen bg-bg">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <Link
                href="/"
                className="px-3 py-2 rounded-lg border border-white/15 text-white/75 hover:text-white hover:bg-white/10 transition no-underline text-sm"
              >
                Geri
              </Link>
              <span className="inline-flex items-center gap-1.5 bg-danger/15 border border-danger/30 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-danger tracking-widest font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-danger animate-pulse" />
                CANLI
              </span>
              <h1 className="text-base sm:text-lg font-extrabold truncate">{channel.name}</h1>
            </div>

            <button
              onClick={() => toggleFavorite(channel.id)}
              className="px-3 py-2 rounded-lg border border-white/15 text-sm font-semibold text-white/80 hover:text-white hover:bg-white/10 transition"
            >
              {isFav ? "Favoriden Cikar" : "Favoriye Ekle"}
            </button>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-5">
            <div className="space-y-4">
              <VideoPlayer channel={channel} />

              <AdSlot
                slot={AD_SLOTS.homeInfeed}
                label="Video Alti Reklam"
                minHeight={110}
              />

              {!hasInternalStream && channel.externalLinks?.length > 0 && (
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
                  <div className="text-sm font-bold text-amber-200 mb-2">
                    {blockedByPolicy
                      ? "Bu kanalda dahili yayin Guvenli Mod nedeniyle kapali"
                      : "Bu kanal icin dahili player kaynagi yok"}
                  </div>
                  <p className="text-xs text-amber-100/80 mb-3">
                    {blockedByPolicy
                      ? "Resmi site veya YouTube canli seceneklerini kullanabilirsin. Istersen bu kanali izinli listeye ekleyebilirsin."
                      : "Resmi site veya YouTube canli seceneklerini kullanabilirsin."}
                  </p>
                  {canliTvReference?.mode && (
                    <p className="text-[11px] text-amber-100/75 mb-3">
                      Referans Durumu (canlitv.diy): {getCanliTvModeLabel(canliTvReference.mode)}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {channel.externalLinks.map((link) => (
                      <ExternalButton key={`${channel.id}-${link.url}`} link={link} />
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <div className="rounded-xl border border-white/10 bg-surface/60 p-3">
                  <div className="text-[11px] uppercase tracking-wide text-white/40">Kategori</div>
                  <div className="text-sm font-semibold mt-1">{channel.category}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-surface/60 p-3">
                  <div className="text-[11px] uppercase tracking-wide text-white/40">Ulke</div>
                  <div className="text-sm font-semibold mt-1">{channel.country || "Bilinmiyor"}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-surface/60 p-3">
                  <div className="text-[11px] uppercase tracking-wide text-white/40">Ag / Grup</div>
                  <div className="text-sm font-semibold mt-1 truncate">{channel.network || "Bilinmiyor"}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-surface/60 p-3">
                  <div className="text-[11px] uppercase tracking-wide text-white/40">Dahili Kaynak</div>
                  <div className="text-sm font-semibold mt-1">
                    {hasInternalStream ? "Var" : blockedByPolicy ? "Guvenli Mod Kapali" : "Yok"}
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-surface/60 p-3">
                  <div className="text-[11px] uppercase tracking-wide text-white/40">Canlitv Referans</div>
                  <div className="text-sm font-semibold mt-1">
                    {canliTvReference ? getCanliTvModeLabel(canliTvReference.mode) : "Bulunamadi"}
                  </div>
                </div>
              </div>
            </div>

            <aside className="space-y-4">
              <AdSlot
                slot={AD_SLOTS.watchSidebarTop}
                label="Izleme Sayfasi Reklam 1"
                minHeight={250}
              />

              <div className="rounded-2xl border border-white/10 bg-surface/50 p-4">
                <h2 className="text-sm font-bold text-white/70 mb-3">Kanal Bilgisi</h2>
                <p className="text-sm text-white/80">{channel.description}</p>

                {channel.sourceCategories?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {channel.sourceCategories.slice(0, 6).map((cat) => (
                      <span
                        key={`${channel.id}-cat-${cat}`}
                        className="px-2 py-1 rounded-full border border-white/15 bg-white/5 text-[11px] text-white/70"
                      >
                        {cat}
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
                      className="block text-xs text-accent hover:underline break-all"
                    >
                      Resmi Site: {channel.officialWebsite}
                    </a>
                  )}
                  {channel.sourceChannelId && (
                    <div className="text-xs text-white/40">Veri Kaynagi ID: {channel.sourceChannelId}</div>
                  )}
                </div>
              </div>

              {channel.externalLinks?.length > 0 && (
                <div className="rounded-2xl border border-white/10 bg-surface/50 p-4">
                  <h3 className="text-sm font-bold text-white/70 mb-3">Harici Canli Kaynaklar</h3>
                  <div className="grid grid-cols-1 gap-2">
                    {channel.externalLinks.map((link) => (
                      <ExternalButton key={`${channel.id}-ext-${link.url}`} link={link} />
                    ))}
                  </div>
                </div>
              )}

              {channel.epg?.length > 0 && (
                <div className="rounded-2xl border border-white/10 bg-surface/50 p-4">
                  <h3 className="text-sm font-bold text-white/70 mb-3">Yayin Akisi</h3>
                  <div className="space-y-2">
                    {channel.epg.map((item, idx) => (
                      <div
                        key={`${channel.id}-epg-${item.time}-${idx}`}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2 border ${
                          idx === 0
                            ? "border-accent/40 bg-accent/10"
                            : "border-white/10 bg-white/[0.02]"
                        }`}
                      >
                        <span className="font-mono text-xs text-accent min-w-[52px]">{item.time}</span>
                        <span className="text-sm text-white/80">{item.show}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-2xl border border-white/10 bg-surface/50 p-4">
                <h3 className="text-sm font-bold text-white/70 mb-3">Diger Kanallar</h3>
                <div className="space-y-2">
                  {otherChannels.map((item) => {
                    const itemHasStream = canUseInternalStream(item);

                    return (
                      <Link
                        key={item.id}
                        href={`/watch/${item.id}`}
                        className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl border border-white/[0.08] hover:bg-surface hover:border-white/20 transition text-sm font-medium text-white no-underline"
                      >
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: item.color }} />
                        <span className="flex-1 truncate">{item.name}</span>
                        <span className={`text-[10px] font-mono ${itemHasStream ? "text-accent" : "text-white/40"}`}>
                          {itemHasStream ? "CANLI" : "HARICI"}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>

              <AdSlot
                slot={AD_SLOTS.watchSidebarBottom}
                label="Izleme Sayfasi Reklam 2"
                minHeight={250}
              />

              {SAFE_MODE_ENABLED && (
                <div className="rounded-2xl border border-amber-500/35 bg-amber-500/10 p-3.5 text-xs text-amber-100/85">
                  Hukuki Guvenli Mod acik. Sadece izinli dahili kanallar direkt oynatilir.
                </div>
              )}
            </aside>
          </div>
        </div>
      </div>
    </>
  );
}
