import Link from 'next/link';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

type KisiSatir = {
  id: number;
  ad_soyad: string;
  atama_sayisi: string;
  aktif_atama: string;
  son_teyit: string | null;
};

async function getKisiler(): Promise<KisiSatir[]> {
  return query<KisiSatir>(`
    SELECT
      k.id,
      k.ad_soyad,
      (SELECT COUNT(*)::text FROM atama a WHERE a.kisi_id = k.id AND a.aktif) AS atama_sayisi,
      (SELECT COUNT(*)::text FROM atama a WHERE a.kisi_id = k.id AND a.aktif AND a.atama_durumu = 'AKTIF') AS aktif_atama,
      (SELECT MAX(t.teyit_tarihi)::text FROM teyit_olayi t
        JOIN atama a ON a.id = t.atama_id
        WHERE a.kisi_id = k.id AND t.teyit_sonucu = 'DOGRULANDI') AS son_teyit
    FROM kisi k
    WHERE k.aktif = TRUE
    ORDER BY k.ad_soyad
  `);
}

export default async function KisilerPage() {
  const kisiler = await getKisiler();

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 p-10">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-1">Kişiler</h1>
            <p className="text-neutral-400 text-sm">{kisiler.length} kişi kayıtlı</p>
          </div>
        </header>

        {kisiler.length === 0 ? (
          <div className="p-10 rounded-lg border border-dashed border-neutral-800 bg-neutral-900/50 text-center">
            <div className="text-lg font-medium mb-2 text-neutral-300">Henüz kişi kaydı yok</div>
            <div className="text-sm text-neutral-500 max-w-md mx-auto">
              Belge madde 4: <em>&quot;Kaynağı olmayan kişi, telefon, e-posta üretilmez.&quot;</em>
              <br /><br />
              Kişiler, <strong className="text-neutral-400">gerçek araştırma</strong> sonucu
              (santral teyidi, kurum sitesi, resmi belge) Atlas&apos;a eklenir.
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {kisiler.map((k) => (
              <Link
                key={k.id}
                href={`/kisiler/${k.id}`}
                className="block p-5 rounded-lg border border-neutral-800 bg-neutral-900 hover:border-neutral-600 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <h2 className="text-lg font-semibold">{k.ad_soyad}</h2>
                  {Number(k.aktif_atama) > 0 && (
                    <span className="text-xs px-2 py-1 rounded bg-green-950/40 text-green-400 border border-green-800">
                      Aktif
                    </span>
                  )}
                </div>
                <div className="flex gap-4 text-sm text-neutral-500">
                  <span>{k.atama_sayisi} atama</span>
                  {k.son_teyit && <span>Son teyit: {k.son_teyit}</span>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}