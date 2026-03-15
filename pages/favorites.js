import { useState } from "react";
import Header from "../components/Header";
import ChannelCard from "../components/ChannelCard";
import AdSlot from "../components/AdSlot";
import SeoHead from "../components/SeoHead";
import { CHANNELS } from "../lib/channels";
import { AD_SLOTS } from "../lib/adSlots";
import { getBasePlaybackStatus } from "../lib/playbackStatus";
import { usePlaybackAvailability } from "../lib/usePlaybackAvailability";

export default function Favorites({ favorites, toggleFavorite }) {
  const [search, setSearch] = useState("");
  const playbackStatuses = usePlaybackAvailability(CHANNELS);

  const getPlaybackStatus = (channel) => {
    return playbackStatuses[channel.id] || getBasePlaybackStatus(channel);
  };

  const favChannels = CHANNELS.filter(
    (channel) =>
      favorites.includes(channel.id) &&
      channel.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <SeoHead
        title="Favorilerim"
        description="Beğendiğin kanalları tek listede topla, hızlıca aç ve izlemeye kaldığın yerden devam et."
        path="/favorites"
      />

      <div className="min-h-screen bg-bg flex flex-col">
        <Header search={search} onSearch={setSearch} favCount={favorites.length} />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <AdSlot
            slot={AD_SLOTS.favoritesLeaderboard}
            label="Favoriler tanıtım alanı"
            minHeight={110}
            className="mb-4"
          />

          <div className="mb-6 flex items-baseline gap-3">
            <h1 className="text-2xl font-extrabold tracking-tight">Favorilerim</h1>
            <span className="text-sm font-medium text-white/30">{favChannels.length} kanal</span>
          </div>

          {favChannels.length === 0 ? (
            <div className="flex flex-col items-center rounded-2xl border border-white/10 bg-surface/40 py-20 text-center">
              <div className="mb-4 text-5xl">-</div>
              <h3 className="mb-2 text-lg font-bold">Henüz kaydettiğin kanal yok</h3>
              <p className="max-w-md px-4 text-sm text-white/40">
                Kanal kartlarındaki kaydet düğmesine dokunarak kendi izleme listenizi oluşturabilirsiniz.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {favChannels.map((channel) => (
                <ChannelCard
                  key={channel.id}
                  channel={channel}
                  playable={getPlaybackStatus(channel).playable}
                  playbackType={getPlaybackStatus(channel).playbackType}
                  isFav={true}
                  onToggleFav={toggleFavorite}
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </>
  );
}
