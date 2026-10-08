import Link from 'next/link';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

async function getGostergeler() {
  return query<{
    id: number; kod: string; ad: string; birim: string | null; aciklama: string | null;
    il_kayit: string; sehir_kayit: string;
  }>(`
    SELECT g.id, g.kod, g.ad, g.birim, g.aciklama,
           (SELECT COUNT(*)::text FROM pazar_il_gosterge ig WHERE ig.gosterge_id = g.id) AS il_kayit,
           (SELECT COUNT(*)::text FROM pazar_sehir_gosterge sg WHERE sg.gosterge_id = g.id) AS sehir_kayit
    FROM pazar_gosterge_tanimi g
    WHERE g.aktif
    ORDER BY g.ad
  `);
}

export default async function GostergelerPage() {
  const gostergeler = await getGostergeler();

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 p-10">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <Link href="/pazar" className="text-sm text-neutral-500 hover:text-neutral-300 mb-2 inline-block">← Pazar</Link>
          <h1 className="text-3xl font-bold mb-1">Gösterge Sözlüğü</h1>
          <p className="text-neutral-400 text-sm">
            Hangi gösterge nedir? (madde 160) · Ham veri V3&apos;te
          </p>
        </header>

        {gostergeler.length === 0 ? (
          <div className="p-10 rounded-lg border border-dashed border-neutral-800 bg-neutral-900/50 text-center text-sm text-neutral-500">
            Gösterge tanımı yok
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {gostergeler.map((g) => (
              <div key={g.id} className="p-5 rounded-lg border border-neutral-800 bg-neutral-900">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium">{g.ad}</h3>
                  <span className="text-xs px-2 py-0.5 rounded bg-amber-950/40 text-amber-300 border border-amber-800 font-mono">
                    {g.kod}
                  </span>
                </div>
                {g.birim && <div className="text-xs text-neutral-500 mb-1">Birim: {g.birim}</div>}
                {g.aciklama && <p className="text-xs text-neutral-500">{g.aciklama}</p>}
                <div className="text-xs text-neutral-700 mt-3 pt-2 border-t border-neutral-800">
                  {Number(g.il_kayit) + Number(g.sehir_kayit)} ham veri kaydı
                </div>
              </div>
            ))}
          </div>
        )}

        <footer className="mt-10 pt-6 border-t border-neutral-800 text-xs text-neutral-600">
          <strong className="text-amber-500">V1:</strong> Sadece tanım. Ham veri V3&apos;te; skor V3&apos;te (madde 172).
        </footer>
      </div>
    </main>
  );
}