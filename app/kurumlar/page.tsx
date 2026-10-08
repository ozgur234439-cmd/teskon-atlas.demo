import Link from 'next/link';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

type KurumSatir = {
  id: number;
  kurum_adi: string;
  ana_kategori: string;
  kurum_turu: string;
  il_adi: string | null;
  birim_sayisi: string;
  makam_sayisi: string;
  bekleyen: string;
};

async function getKurumlar(): Promise<KurumSatir[]> {
  return query<KurumSatir>(`
    SELECT
      ku.id,
      ku.ad AS kurum_adi,
      ak.ad AS ana_kategori,
      kt.ad AS kurum_turu,
      il.ad AS il_adi,
      (SELECT COUNT(*)::text FROM birim b WHERE b.kurum_id = ku.id AND b.aktif) AS birim_sayisi,
      (SELECT COUNT(*)::text FROM kurum_birim_makam kbm WHERE kbm.kurum_id = ku.id AND kbm.aktif) AS makam_sayisi,
      (SELECT COUNT(*)::text FROM kurum_birim_makam kbm
        WHERE kbm.kurum_id = ku.id AND kbm.aktif
          AND kbm.arastirma_durumu = 'ARASTIRILMADI') AS bekleyen
    FROM kurum ku
    JOIN ana_kategori ak ON ak.id = ku.ana_kategori_id
    JOIN kurum_turu kt ON kt.id = ku.kurum_turu_id
    LEFT JOIN il ON il.id = ku.il_id
    WHERE ku.aktif = TRUE
    ORDER BY ku.ad
  `);
}

export default async function KurumlarPage() {
  const kurumlar = await getKurumlar();

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 p-10">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-1">Kurumlar</h1>
            <p className="text-neutral-400 text-sm">{kurumlar.length} aktif kurum</p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/kurumlar/ekle"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors"
            >
              + Yeni Kurum Ekle
            </Link>
            <Link
              href="/"
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-sm transition-colors"
            >
              ← Ana Sayfa
            </Link>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {kurumlar.map((k) => (
            <Link
              key={k.id}
              href={`/kurumlar/${k.id}`}
              className="block p-5 rounded-lg border border-neutral-800 bg-neutral-900 hover:border-neutral-600 hover:bg-neutral-900/80 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <h2 className="text-lg font-semibold">{k.kurum_adi}</h2>
                {Number(k.bekleyen) > 0 && (
                  <span className="text-xs px-2 py-1 rounded bg-amber-950/50 text-amber-400 border border-amber-800 whitespace-nowrap">
                    {k.bekleyen} bekliyor
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-neutral-400 mb-3">
                <span className="px-2 py-0.5 rounded bg-neutral-800">{k.ana_kategori}</span>
                <span className="px-2 py-0.5 rounded bg-neutral-800">{k.kurum_turu}</span>
                {k.il_adi && <span className="px-2 py-0.5 rounded bg-neutral-800">{k.il_adi}</span>}
              </div>
              <div className="flex gap-4 text-sm text-neutral-500">
                <span>{k.birim_sayisi} birim</span>
                <span>{k.makam_sayisi} makam</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}