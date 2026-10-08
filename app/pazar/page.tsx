import Link from 'next/link';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

async function getOzet() {
  const [r] = await query<{
    is_kolu: number; alt_is_kolu: number; sozlesme: number;
    gosterge: number; global_sehir: number; yakin_sehir: number;
    il_gosterge: number; sehir_gosterge: number;
  }>(`
    SELECT
      (SELECT COUNT(*)::int FROM is_kolu WHERE aktif) AS is_kolu,
      (SELECT COUNT(*)::int FROM alt_is_kolu WHERE aktif) AS alt_is_kolu,
      (SELECT COUNT(*)::int FROM piyasa_sozlesme_modeli WHERE aktif) AS sozlesme,
      (SELECT COUNT(*)::int FROM pazar_gosterge_tanimi WHERE aktif) AS gosterge,
      (SELECT COUNT(*)::int FROM pazar_global_sehir WHERE durum = 'HAZIR') AS global_sehir,
      (SELECT COUNT(*)::int FROM pazar_yakin_cografya) AS yakin_sehir,
      (SELECT COUNT(*)::int FROM pazar_il_gosterge) AS il_gosterge,
      (SELECT COUNT(*)::int FROM pazar_sehir_gosterge) AS sehir_gosterge
  `);
  return r;
}

export default async function PazarPage() {
  const ozet = await getOzet();

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 p-10">
      <div className="max-w-6xl mx-auto">

        <header className="mb-10">
          <div className="text-xs uppercase text-neutral-500 font-semibold mb-2">
            PAZAR & COĞRAFYA İSTİHBARATI · madde 155-174
          </div>
          <h1 className="text-4xl font-bold mb-2">Pazar</h1>
          <p className="text-neutral-400 text-sm">
            Nerede, hangi iş önemli? · Kaynaklı ham referans · Skor yok (V1)
          </p>
        </header>

        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <div className="p-5 rounded-lg border border-neutral-800 bg-neutral-900">
            <div className="text-xs uppercase text-neutral-500 mb-1">İş Kolu</div>
            <div className="text-3xl font-bold">{ozet.is_kolu}</div>
            <div className="text-xs text-neutral-500 mt-1">{ozet.alt_is_kolu} alt kategori</div>
          </div>
          <div className="p-5 rounded-lg border border-neutral-800 bg-neutral-900">
            <div className="text-xs uppercase text-neutral-500 mb-1">Sözleşme Modeli</div>
            <div className="text-3xl font-bold">{ozet.sozlesme}</div>
            <div className="text-xs text-neutral-500 mt-1">EPC, PPP/YİD, vb.</div>
          </div>
          <div className="p-5 rounded-lg border border-blue-800/50 bg-blue-950/20">
            <div className="text-xs uppercase text-blue-400 mb-1">Global Şehir</div>
            <div className="text-3xl font-bold text-blue-300">{ozet.global_sehir}</div>
            <div className="text-xs text-neutral-500 mt-1">Kaynaklı</div>
          </div>
          <div className="p-5 rounded-lg border border-green-800/50 bg-green-950/20">
            <div className="text-xs uppercase text-green-400 mb-1">Yakın Coğrafya</div>
            <div className="text-3xl font-bold text-green-300">{ozet.yakin_sehir}</div>
            <div className="text-xs text-neutral-500 mt-1">Kaynaklı</div>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-xs uppercase text-neutral-500 font-semibold mb-3">
            Pazar Modülleri
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Link href="/pazar/is-kolu" className="block p-5 rounded-lg border border-neutral-800 bg-neutral-900 hover:border-blue-700 transition-colors group">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-medium group-hover:text-blue-300 transition-colors">İş Kolu Rehberi</h3>
                <span className="text-xs text-neutral-600">→</span>
              </div>
              <p className="text-xs text-neutral-500">
                Altyapı, üstyapı, endüstriyel iş kolları ve alt kategoriler
              </p>
            </Link>

            <Link href="/pazar/sozlesme-modelleri" className="block p-5 rounded-lg border border-neutral-800 bg-neutral-900 hover:border-purple-700 transition-colors group">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-medium group-hover:text-purple-300 transition-colors">Sözleşme Modelleri</h3>
                <span className="text-xs text-neutral-600">→</span>
              </div>
              <p className="text-xs text-neutral-500">
                Genel müteahhitlik, EPC, PPP/YİD, anahtar teslim
              </p>
            </Link>

            <Link href="/pazar/global-sehirler" className="block p-5 rounded-lg border border-neutral-800 bg-neutral-900 hover:border-blue-700 transition-colors group">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-medium group-hover:text-blue-300 transition-colors">Global Şehirler</h3>
                <span className="text-xs text-neutral-600">→</span>
              </div>
              <p className="text-xs text-neutral-500">
                Kaynaklı referans şehirler + koordinat bilgisi
              </p>
            </Link>

            <Link href="/pazar/yakin-cografya" className="block p-5 rounded-lg border border-neutral-800 bg-neutral-900 hover:border-green-700 transition-colors group">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-medium group-hover:text-green-300 transition-colors">Yakın Coğrafya</h3>
                <span className="text-xs text-neutral-600">→</span>
              </div>
              <p className="text-xs text-neutral-500">
                Türkiye&apos;ye yakın stratejik şehirler
              </p>
            </Link>

            <Link href="/pazar/gostergeler" className="block p-5 rounded-lg border border-neutral-800 bg-neutral-900 hover:border-amber-700 transition-colors group">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-medium group-hover:text-amber-300 transition-colors">Gösterge Sözlüğü</h3>
                <span className="text-xs text-neutral-600">→</span>
              </div>
              <p className="text-xs text-neutral-500">
                Nüfus, GSYİH, OSB sayısı gibi tanımlar
              </p>
            </Link>

            <div className="block p-5 rounded-lg border border-dashed border-neutral-800 bg-neutral-900/40 opacity-60">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-medium text-neutral-500">İl Göstergeleri</h3>
                <span className="text-xs text-neutral-700">V3</span>
              </div>
              <p className="text-xs text-neutral-600">
                Ham veri + kaynak + yıl · V1&apos;de ham veri boş
              </p>
            </div>
          </div>
        </section>

        <footer className="mt-10 pt-6 border-t border-neutral-800 text-xs text-neutral-600">
          <strong className="text-amber-500">V1 sınırı (madde 174):</strong>{' '}
          Skor yok · Sıralama yok · &quot;Nereye gidelim?&quot; yok · Sadece kaynaklı ham referans
        </footer>

      </div>
    </main>
  );
}