# 📺 StreamTV — Canlı TV Streaming Platform

Next.js + TailwindCSS + HLS.js ile geliştirilmiş modern canlı TV izleme platformu.

## 🚀 Hızlı Başlangıç

```bash
# 1. Proje klasörüne gir
cd live-tv-project

# 2. Bağımlılıkları yükle
npm install

# 3. Development sunucusunu başlat
npm run dev
```

Tarayıcıda **http://localhost:3000** adresini aç.

## 📁 Proje Yapısı

```
live-tv-project/
├── components/
│   ├── Header.jsx          # Üst menü (logo, arama, navigasyon)
│   ├── CategoryMenu.jsx    # Yan menü kategori filtresi
│   ├── ChannelCard.jsx     # Kanal kartı (grid'deki her kanal)
│   └── VideoPlayer.jsx     # HLS.js video oynatıcı
├── lib/
│   ├── channels.js         # Kanal verileri ve kategoriler
│   └── useHlsPlayer.js     # HLS.js React hook'u
├── pages/
│   ├── _app.js             # App wrapper (favori state)
│   ├── index.js            # Ana sayfa (kanal listesi)
│   ├── favorites.js        # Favoriler sayfası
│   └── watch/
│       └── [channel].js    # İzleme sayfası (dinamik route)
├── styles/
│   └── globals.css         # Global stiller + Tailwind
├── next.config.js          # CORS proxy rewrites
├── tailwind.config.js      # Tailwind konfigürasyonu
└── package.json
```

## 🔧 CORS Proxy Nasıl Çalışır

TRT gibi kanallar tarayıcıdan doğrudan erişime izin vermez (CORS kısıtlaması).
`next.config.js` dosyasındaki **rewrites** kuralları bu sorunu çözer:

```
Tarayıcı → localhost:3000/api/stream/trt1/master.m3u8
    ↓ (Next.js proxy)
TRT sunucusu → tv-trt1.medya.trt.com.tr/master.m3u8
```

Böylece tarayıcı aynı origin'den veri alır ve CORS hatası oluşmaz.

## ➕ Yeni Kanal Eklemek

### 1. `lib/channels.js` dosyasına kanal ekle:
```js
{
  id: "kanald",
  name: "Kanal D",
  category: "general",
  color: "#264653",
  stream: "/api/stream/kanald/master.m3u8",
  description: "Türkiye'nin en çok izlenen kanalı",
  epg: [
    { time: "20:00", show: "Ana Haber" },
    { time: "21:00", show: "Dizi" },
  ],
}
```

### 2. `next.config.js` dosyasına rewrite kuralı ekle:
```js
{
  source: "/api/stream/kanald/:path*",
  destination: "https://kanald-stream-url.com/:path*",
}
```

### 3. Sunucuyu yeniden başlat (`npm run dev`)

## 🛠 Geliştirme Komutları

| Komut           | Açıklama                          |
|-----------------|-----------------------------------|
| `npm run dev`   | Development sunucusu (port 3000)  |
| `npm run build` | Production build                  |
| `npm run start` | Production sunucusu               |

## 📱 Özellikler

- ✅ HLS.js canlı yayın oynatıcı
- ✅ Otomatik kalite ayarı (ABR)
- ✅ Manuel kalite seçimi
- ✅ Kategori filtreleme
- ✅ Kanal arama
- ✅ Favori kanallar
- ✅ EPG (yayın akışı) gösterimi
- ✅ Tam ekran desteği
- ✅ Responsive tasarım (mobil uyumlu)
- ✅ CORS proxy (Next.js rewrites)
- ✅ Otomatik hata kurtarma
- ✅ Dark mode UI

## 🔗 Teknolojiler

- **Next.js 14** — React framework
- **TailwindCSS** — Utility-first CSS
- **HLS.js** — HTTP Live Streaming player
- **React Hooks** — State management

## Hukuki Guvenli Mod

Guvenli mod varsayilan olarak aciktir.
Tum ortam ayarlarini dogrudan `.env.local` icinde yonet.

1. `.env.local` dosyasini duzenle.
2. (Istersen) `NEXT_PUBLIC_SAFE_MODE=true` olarak birak.
3. Mod sec:
   `NEXT_PUBLIC_SAFE_MODE_LEVEL=reference` (canlitv referansi ile uyumlu)
   veya
   `NEXT_PUBLIC_SAFE_MODE_LEVEL=strict` (en guvenli)
4. Direkt izlenecek kanallari yaz:
   `NEXT_PUBLIC_SAFE_DIRECT_CHANNEL_IDS=trthaber,trtspor,trtbelgesel,trtcocuk`
5. Gerekirse host bazli izin ver:
   `NEXT_PUBLIC_SAFE_DIRECT_HOSTS=tv-trt1.medya.trt.com.tr,tv-trthaber.medya.trt.com.tr,tv-trtspor.medya.trt.com.tr,tv-trtbelgesel.medya.trt.com.tr,tv-trtcocuk.medya.trt.com.tr`
6. Gerekirse belirli kanallari daima dis linke zorla:
   `NEXT_PUBLIC_SAFE_FORCE_EXTERNAL_CHANNEL_IDS=trt1,nowtv,spacetoonkidstv,cbcsport,agrotv`
7. Sunucuyu yeniden baslat.

Not: Guvenli mod acikken izinli olmayan kanallarda player yerine resmi canli / YouTube linkleri gosterilir.

## Canlitv.diy Referans Durumu

`data/canlitv-reference.json` dosyasi canlitv.diy/tr kaynakli kanal durumlarini tutar.
Bu veri UI'da "Ref" badge olarak gorunur.

- `telif_redirect`: Kanal resmi siteye yonlendiriliyor.
- `embedded_*`: Kanal sayfada gomulu oynatici ile aciliyor.
- `unknown`: Tespit edilemedi.

Guvenli mod acikken `telif_redirect` referansli kanallarda dahili player otomatik kapanir.

Referans dosyasini guncellemek icin:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\update-canlitv-reference.ps1
```

## Otomatik Link Kontrolu

Proje artik dahili stream linklerini otomatik izler.

- `pages/api/proxy.js` trafik aldiginda stale ise arka planda link kontrolu tetikler.
- Sonuclar memory cache'te tutulur (`LINK_CHECK_TTL_MS`, varsayilan 15 dakika).
- Toplu rapor: `GET /api/health/links`
- Zorla yeniden kontrol: `GET /api/health/links?force=1`
- Tek kanal kontrolu: `GET /api/health/links?channel=trt1`
- Cron tetikleme: `GET/POST /api/health/cron` (`x-cron-secret` header veya `?token=`).

CLI ile manuel kontrol:

```bash
npm run check:links
npm run check:links:strict
```

Ornek cron cagrisi:

```bash
curl -H "x-cron-secret: $LINK_CHECK_CRON_SECRET" https://your-domain.com/api/health/cron
```
