import Link from 'next/link';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

async function getModeller() {
  return query<{ id: number; kod: string; ad: string; aciklama: string | null }>(`
    SELECT id, kod, ad, aciklama FROM piyasa_sozlesme_modeli WHERE aktif ORDER BY ad
  `);
}

async function getFirmaSayilari() {
  const [r] = await query<{ toplam_firma: string }>(`
    SELECT COUNT(*)::text AS toplam_firma FROM piyasa_firma WHERE aktif
  `);
  return r;
}

export default async function SozlesmeModelleriPage() {
  const [modeller, firma] = await Promise.all([getModeller(), getFirmaSayilari()]);

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 p-10">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <Link href="/pazar" className="text-sm text-neutral-500 hover:text-neutral-300 mb-2 inline-block">← Pazar</Link>
          <h1 className="text-3xl font-bold mb-1">Sözleşme Modelleri</h1>
          <p className="text-neutral-400 text-sm">
            Tek sözleşme modeli sözlüğü (madde 143, 159) · {firma.toplam_firma} aktif firma bu modellerle ilişkilendirilir
          </p>
        </header>

        {modeller.length === 0 ? (
          <div className="p-10 rounded-lg border border-dashed border-neutral-800 bg-neutral-900/50 text-center text-sm text-neutral-500">
            Sözleşme modeli tanımlı değil
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {modeller.map((m) => (
              <div key={m.id} className="p-5 rounded-lg border border-neutral-800 bg-neutral-900">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium">{m.ad}</h3>
                  <span className="text-xs px-2 py-0.5 rounded bg-purple-950/40 text-purple-300 border border-purple-800 font-mono">
                    {m.kod}
                  </span>
                </div>
                {m.aciklama && <p className="text-xs text-neutral-500">{m.aciklama}</p>}
              </div>
            ))}
          </div>
        )}

        <footer className="mt-10 pt-6 border-t border-neutral-800 text-xs text-neutral-600">
          Madde 159: Yeni <code className="text-neutral-400">CalismaModeli</code> tablosu açılmaz.
          Bu sözlük pazar modülü tarafından referanslanır.
        </footer>
      </div>
    </main>
  );
}