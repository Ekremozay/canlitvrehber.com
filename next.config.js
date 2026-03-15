/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // TRT gibi CORS kısıtlamalı stream'ler için rewrites proxy
  async rewrites() {
    return [
      // TRT 1
      {
        source: "/api/stream/trt1/:path*",
        destination: "https://tv-trt1.medya.trt.com.tr/:path*",
      },
      // TRT Haber
      {
        source: "/api/stream/trthaber/:path*",
        destination: "https://tv-trthaber.medya.trt.com.tr/:path*",
      },
      // TRT World
      {
        source: "/api/stream/trtworld/:path*",
        destination: "https://tv-trtworld.medya.trt.com.tr/:path*",
      },
      // TRT Spor
      {
        source: "/api/stream/trtspor/:path*",
        destination: "https://tv-trtspor1.medya.trt.com.tr/:path*",
      },
      // TRT Spor 2
      {
        source: "/api/stream/trtspor2/:path*",
        destination: "https://tv-trtspor2.medya.trt.com.tr/:path*",
      },
      // TRT Çocuk
      {
        source: "/api/stream/trtcocuk/:path*",
        destination: "https://tv-trtcocuk.medya.trt.com.tr/:path*",
      },
      // TRT Belgesel
      {
        source: "/api/stream/trtbelgesel/:path*",
        destination: "https://tv-trtbelgesel.medya.trt.com.tr/:path*",
      },
      // TRT Müzik
      {
        source: "/api/stream/trtmuzik/:path*",
        destination: "https://tv-trtmuzik.medya.trt.com.tr/:path*",
      },
      // TRT Türk
      {
        source: "/api/stream/trtturk/:path*",
        destination: "https://tv-trtturk.medya.trt.com.tr/:path*",
      },
      // TRT Avaz
      {
        source: "/api/stream/trtavaz/:path*",
        destination: "https://tv-trtavaz.medya.trt.com.tr/:path*",
      },
      // TRT Kurdî
      {
        source: "/api/stream/trtkurdi/:path*",
        destination: "https://tv-trtkurdi.medya.trt.com.tr/:path*",
      },
      // TRT Arabi
      {
        source: "/api/stream/trtarabi/:path*",
        destination: "https://tv-trtarabi.medya.trt.com.tr/:path*",
      },
    ];
  },
};

module.exports = nextConfig;
