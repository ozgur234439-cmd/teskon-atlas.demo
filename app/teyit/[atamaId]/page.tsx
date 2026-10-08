import Link from 'next/link';
import { query } from '@/lib/db';
import { notFound } from 'next/navigation';
import { teyitKaydet } from './actions';

export const dynamic = 'force-dynamic';

type AtamaDetay = {
  atama_id: number;
  atama_durumu: string;
  atama_tipi: string;
  kisi_id: number;
  kisi_ad: string;
  makam_ad: string;
  makam_sinifi: string;
  birim_ad: string;
  kurum_ad: string;
  kurum_id: number;
  il_ad: string | null;
};

type TeyitOlayi = {
  id: number;
  teyit_turu: string;
  teyit_sonucu: string;
  teyit_tarihi: string;
  notlar: string | null;
  kaynak_referansi: string | null;
  kaynak_turu: string | null;
  teyit_eden_ad: string | null;
};

async function getAtama(atama_id: string): Promise<AtamaDetay | null> {
  const [atama] = await query<AtamaDetay>(
    `SELECT a.id AS atama_id, a.atama_durumu::text AS atama_durumu, a.atama_tipi::text AS atama_tipi,
            k.id AS kisi_id, k.ad_soyad AS kisi_ad,
            km.ad AS makam_ad, km.makam_sinifi::text AS makam_sinifi, b.ad AS birim_ad,
            ku.id AS kurum_id, ku.ad AS kurum_ad, il.ad AS il_ad
     FROM atama a
     JOIN kisi k ON k.id = a.kisi_id
     JOIN kurum_birim_makam kbm ON kbm.id = a.kurum_birim_makam_id
     JOIN kanonik_makam km ON km.id = kbm.kanonik_makam_id
     JOIN kurum ku ON ku.id = kbm.kurum_id
     JOIN birim b ON b.id = kbm.birim_id
     LEFT JOIN il ON il.id = ku.il_id
     WHERE a.id = $1 AND a.aktif = TRUE`,
    [atama_id]);
  return atama ?? null;
}

async function getTeyitler(atama_id: number): Promise<TeyitOlayi[]> {
  return query<TeyitOlayi>(
    `SELECT t.id, t.teyit_turu::text AS teyit_turu, t.teyit_sonucu::text AS teyit_sonucu,
            t.teyit_tarihi::text AS teyit_tarihi, t.notlar,
            k.kaynak_referansi, k.kaynak_turu::text AS kaynak_turu,
            ku.ad_soyad AS teyit_eden_ad
     FROM teyit_olayi t
     LEFT JOIN kaynak k ON k.id = t.kaynak_id
     LEFT JOIN kullanici ku ON ku.id = t.teyit_eden_user_id
     WHERE t.atama_id = $1
     ORDER BY t.teyit_tarihi DESC, t.id DESC`,
    [atama_id]);
}

const SINIF_RENK: Record<string, string> = {
  A: 'bg-red-950/50 text-red-300 border-red-800',
  B: 'bg-orange-950/50 text-orange-300 border-orange-800',
  C: 'bg-yellow-950/50 text-yellow-300 border-yellow-800',
  D: 'bg-neutral-800 text-neutral-300 border-neutral-700',
};

export default async function TeyitPage({ params }: { params: Promise<{ atamaId: string }> }) {
  const { atamaId } = await params;
  const atama = await getAtama(atamaId);
  if (!atama) notFound();

  const teyitler = await getTeyitler(atama.atama_id);

  // Çelişki uyarısı: son 2 teyit farklı sonuç verdiyse
  const celiskiVar =
    teyitler.length >= 2 && teyitler[0].teyit_sonucu !== teyitler[1].teyit_sonucu;

  const sR = SINIF_RENK[atama.makam_sinifi] ?? SINIF_RENK.D;

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 p-6 md:p-10">
      <div className="max-w-3xl mx-auto">
        <header className="mb-8">
          <Link
            href={`/kisiler/${atama.kisi_id}`}
            className="text-sm text-neutral-500 hover:text-neutral-300 mb-2 inline-block"
          >
            ← {atama.kisi_ad}
          </Link>
          <h1 className="text-3xl font-bold mb-2">Teyit</h1>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded border ${sR}`}>
              {atama.makam_sinifi}
            </span>
            <span className="text-sm text-neutral-300">
              <strong className="text-neutral-100">{atama.makam_ad}</strong> — {atama.kurum_ad} · {atama.birim_ad}
            </span>
          </div>
          <div className="text-xs text-neutral-500">
            Kişi: {atama.kisi_ad} · Atama: {atama.atama_tipi} {atama.atama_durumu}
          </div>
        </header>

        {celiskiVar && (
          <div className="mb-6 p-4 rounded-lg border border-amber-800 bg-amber-950/20 text-sm text-amber-200">
            <strong>⚠ Çelişki tespit edildi:</strong> Son iki teyit farklı sonuç verdi (
            <code className="text-amber-100">{teyitler[1].teyit_sonucu}</code> →{' '}
            <code className="text-amber-100">{teyitler[0].teyit_sonucu}</code>). Yeni teyit
            trust'ı <strong>%30 ceza</strong> ile hesaplanacak (madde 41A).
          </div>
        )}

        <section className="mb-8">
          <h2 className="text-xs uppercase text-neutral-500 font-semibold mb-3">
            Yeni Teyit (madde 32-36)
          </h2>
          <form
            action={teyitKaydet}
            className="space-y-5 rounded-lg border border-neutral-800 bg-neutral-900 p-6"
          >
            <input type="hidden" name="atama_id" value={atama.atama_id} />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase text-neutral-500 font-semibold mb-2">
                  Teyit Türü *
                </label>
                <select
                  name="teyit_turu"
                  required
                  defaultValue="TELEFON"
                  className="w-full px-3 py-2 rounded-md bg-neutral-950 border border-neutral-800 focus:border-blue-600 focus:outline-none"
                >
                  <option value="TELEFON">Telefon</option>
                  <option value="SANTRAL">Santral</option>
                  <option value="EPOSTA">E-posta</option>
                  <option value="ZIYARET">Ziyaret</option>
                  <option value="DOKUMAN">Doküman</option>
                </select>
              </div>
              <div>
                <label className="block text-xs uppercase text-neutral-500 font-semibold mb-2">
                  Teyit Sonucu *
                </label>
                <select
                  name="teyit_sonucu"
                  required
                  defaultValue="DOGRULANDI"
                  className="w-full px-3 py-2 rounded-md bg-neutral-950 border border-neutral-800 focus:border-blue-600 focus:outline-none"
                >
                  <option value="DOGRULANDI">Doğrulandı</option>
                  <option value="DOGRULANAMADI">Doğrulanamadı</option>
                  <option value="DEGISMIS">Değişmiş</option>
                </select>
              </div>
            </div>

            <hr className="border-neutral-800" />

            <div>
              <label className="block text-xs uppercase text-neutral-500 font-semibold mb-2">
                Kaynak Türü *
              </label>
              <select
                name="kaynak_turu"
                required
                defaultValue="SANTRAL_TEYIDI"
                className="w-full px-3 py-2 rounded-md bg-neutral-950 border border-neutral-800 focus:border-blue-600 focus:outline-none"
              >
                <option value="SANTRAL_TEYIDI">Santral Teyidi</option>
                <option value="DIREKT_ILETISIM">Direkt İletişim</option>
                <option value="RESMI_KURUM_SITESI">Resmi Kurum Sitesi</option>
                <option value="RESMI_BELGE">Resmi Belge</option>
                <option value="INSAN_TEYIDI">İnsan Teyidi</option>
                <option value="SAHA_GORUSMESI">Saha Görüşmesi</option>
                <option value="IKINCIL_KAYNAK">İkincil Kaynak</option>
              </select>
            </div>

            <div>
              <label className="block text-xs uppercase text-neutral-500 font-semibold mb-2">
                Kaynak Referansı *
              </label>
              <input
                type="text"
                name="kaynak_referansi"
                required
                placeholder="Örn: 06.10.2026 14:30 santral görüşmesi"
                className="w-full px-3 py-2 rounded-md bg-neutral-950 border border-neutral-800 focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs uppercase text-neutral-500 font-semibold mb-2">
                Kaynak URL (opsiyonel)
              </label>
              <input
                type="url"
                name="kaynak_url"
                placeholder="https://..."
                className="w-full px-3 py-2 rounded-md bg-neutral-950 border border-neutral-800 focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs uppercase text-neutral-500 font-semibold mb-2">
                Notlar
              </label>
              <textarea
                name="notlar"
                rows={3}
                placeholder="Görüşmenin özeti..."
                className="w-full px-3 py-2 rounded-md bg-neutral-950 border border-neutral-800 focus:border-blue-600 focus:outline-none resize-none"
              />
            </div>

            <div className="p-3 rounded-md bg-neutral-950 border border-neutral-800 text-xs text-neutral-500">
              <strong className="text-neutral-400">Trust hesabı:</strong> Kaynak gücü ×
              güncellik × atama katsayısı × teyit cezası × çelişki. Kaydettiğinde otomatik
              hesaplanır, kişi sayfasında göreceksin (madde 41A).
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-md font-medium transition-colors"
              >
                Teyit Kaydet
              </button>
              <Link
                href={`/kisiler/${atama.kisi_id}`}
                className="px-6 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-md font-medium transition-colors"
              >
                İptal
              </Link>
            </div>
          </form>
        </section>

        <section>
          <h2 className="text-xs uppercase text-neutral-500 font-semibold mb-3">
            Teyit Geçmişi ({teyitler.length})
          </h2>
          {teyitler.length === 0 ? (
            <div className="text-sm text-neutral-600 p-4 rounded-lg border border-neutral-800 bg-neutral-900">
              Bu atama için henüz teyit kaydı yok.
            </div>
          ) : (
            <div className="space-y-2">
              {teyitler.map((t) => {
                const sonucRenk =
                  t.teyit_sonucu === 'DOGRULANDI'
                    ? 'bg-green-950/40 text-green-400 border-green-800'
                    : t.teyit_sonucu === 'DOGRULANAMADI'
                    ? 'bg-red-950/40 text-red-400 border-red-800'
                    : 'bg-amber-950/40 text-amber-400 border-amber-800';
                return (
                  <div
                    key={t.id}
                    className="p-4 rounded-lg border border-neutral-800 bg-neutral-900"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded border ${sonucRenk}`}>
                          {t.teyit_sonucu}
                        </span>
                        <span className="text-xs text-neutral-500">{t.teyit_turu}</span>
                        <span className="text-xs text-neutral-500">{t.teyit_tarihi}</span>
                      </div>
                      {t.teyit_eden_ad && (
                        <span className="text-xs text-neutral-500">👤 {t.teyit_eden_ad}</span>
                      )}
                    </div>
                    {t.kaynak_referansi && (
                      <div className="text-xs text-neutral-500">
                        Kaynak: {t.kaynak_turu} — {t.kaynak_referansi}
                      </div>
                    )}
                    {t.notlar && (
                      <div className="text-sm text-neutral-400 mt-2">{t.notlar}</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}