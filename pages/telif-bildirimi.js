import SeoHead from "../components/SeoHead";
import { LEGAL_NOTICE_EMAIL } from "../lib/siteConfig";

export default function TelifBildirimiPage() {
  return (
    <>
      <SeoHead
        title="Telif Bildirimi"
        description="Telif hakkı bildirimi ve hızlı kaldırma süreci. Hak sahipleri bu sayfa üzerinden bizimle iletişime geçebilir."
        path="/telif-bildirimi"
      />

      <main className="min-h-screen bg-bg text-white px-4 sm:px-6 py-8">
        <section className="max-w-3xl mx-auto rounded-2xl border border-white/10 bg-surface/60 p-5 sm:p-7">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-3">Telif Bildirimi</h1>
          <p className="text-sm text-white/70 mb-5">
            Hak sahiplerinden gelen geçerli taleplerde ilgili içerik en kısa sürede incelemeye alınır
            ve gerekli durumda kaldırılır ya da dış bağlantı moduna alınır.
          </p>

          <div className="space-y-4 text-sm text-white/80 leading-relaxed">
            {LEGAL_NOTICE_EMAIL ? (
              <p>
                Bildirim icin e-posta:{" "}
                <a className="text-accent" href={`mailto:${LEGAL_NOTICE_EMAIL}`}>
                  {LEGAL_NOTICE_EMAIL}
                </a>
              </p>
            ) : (
              <p className="text-amber-200/85">
                Telif bildirim e-postası henüz tanımlı değil. Lütfen panelden{" "}
                <code className="px-1 py-0.5 rounded bg-black/30 border border-white/10">
                  NEXT_PUBLIC_LEGAL_NOTICE_EMAIL
                </code>{" "}
                değerini gir.
              </p>
            )}
            <p>Bildirimde şu bilgileri paylaşın:</p>
            <ul className="list-disc ml-5 space-y-1 text-white/75">
              <li>Hak sahibi adı ve iletişim bilgisi</li>
              <li>Talep edilen sayfanın URL adresi</li>
              <li>Hak sahipliğini gösteren kısa açıklama</li>
              <li>Gerekliyse resmi belge veya referans bağlantısı</li>
            </ul>
            <p>Geçerli taleplerde hedefimiz 24 saat içinde geçici aksiyon almaktır.</p>
          </div>
        </section>
      </main>
    </>
  );
}
