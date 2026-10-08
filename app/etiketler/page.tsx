import { query } from '@/lib/db';
import { etiketEkle, etiketSil } from './actions';

export const dynamic = 'force-dynamic';

type EtiketSatir = {
  id: number;
  kod: string;
  ad: string;
  renk: string | null;
  aciklama: string | null;
  kisi_sayisi: number;
  kurum_sayisi: number;
  atama_sayisi: number;
};

async function getEtiketler(): Promise<EtiketSatir[]> {
  return query<EtiketSatir>(`
    SELECT e.id, e.kod, e.ad, e.renk, e.aciklama,
      (SELECT COUNT(*) FROM kisi_etiket ke WHERE ke.etiket_id = e.id)::int AS kisi_sayisi,
      (SELECT COUNT(*) FROM kurum_etiket kre WHERE kre.etiket_id = e.id)::int AS kurum_sayisi,
      (SELECT COUNT(*) FROM atama_etiket ae WHERE ae.etiket_id = e.id)::int AS atama_sayisi
    FROM etiket e
    WHERE e.aktif = TRUE
    ORDER BY e.ad
  `);
}

export default async function EtiketlerPage() {
  const etiketler = await getEtiketler();

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 p-6 md:p-10">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold mb-1">Etiketler</h1>
          <p className="text-neutral-400 text-sm">
            {etiketler.length} etiket · Kişi, kurum ve atamalara etiket atayabilirsiniz (madde 51)
          </p>
        </header>

        <details className="rounded-lg border border-neutral-800 bg-neutral-900 mb-6">
          <summary className="px-5 py-3 cursor-pointer hover:bg-neutral-800/50 transition-colors font-medium text-sm">
            + Yeni Etiket
          </summary>
          <form action={etiketEkle} className="p-5 border-t border-neutral-800 space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs uppercase text-neutral-500 font-semibold mb-2">Kod *</label>
                <input
                  type="text"
                  name="kod"
                  required
                  placeholder="ONCELIKLI"
                  className="w-full px-3 py-2 rounded-md bg-neutral-950 border border-neutral-800 focus:border-blue-600 focus:outline-none text-sm font-mono uppercase"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs uppercase text-neutral-500 font-semibold mb-2">Ad *</label>
                <input
                  type="text"
                  name="ad"
                  required
                  placeholder="Öncelikli"
                  className="w-full px-3 py-2 rounded-md bg-neutral-950 border border-neutral-800 focus:border-blue-600 focus:outline-none text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase text-neutral-500 font-semibold mb-2">Renk</label>
                <input
                  type="color"
                  name="renk"
                  defaultValue="#3b82f6"
                  className="w-full h-10 rounded-md bg-neutral-950 border border-neutral-800 focus:border-blue-600 focus:outline-none cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-xs uppercase text-neutral-500 font-semibold mb-2">Açıklama</label>
                <input
                  type="text"
                  name="aciklama"
                  className="w-full px-3 py-2 rounded-md bg-neutral-950 border border-neutral-800 focus:border-blue-600 focus:outline-none text-sm"
                />
              </div>
            </div>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-md font-medium transition-colors"
            >
              Kaydet
            </button>
          </form>
        </details>

        {etiketler.length === 0 ? (
          <div className="p-10 rounded-lg border border-dashed border-neutral-800 bg-neutral-900/50 text-center text-sm text-neutral-500">
            Henüz etiket yok. Yukarıdan ilk etiketi ekleyin.
          </div>
        ) : (
          <div className="space-y-2">
            {etiketler.map((e) => (
              <div
                key={e.id}
                className="p-4 rounded-lg border border-neutral-800 bg-neutral-900 flex items-center justify-between gap-4 hover:border-neutral-700 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span
                    className="w-4 h-4 rounded-full shrink-0 border border-neutral-700"
                    style={{ backgroundColor: e.renk ?? '#6b7280' }}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{e.ad}</span>
                      <span className="text-xs font-mono text-neutral-500">{e.kod}</span>
                    </div>
                    {e.aciklama && (
                      <div className="text-xs text-neutral-500 mt-0.5 truncate">{e.aciklama}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-neutral-500 shrink-0">
                  {e.kisi_sayisi > 0 && <span>👤 {e.kisi_sayisi}</span>}
                  {e.kurum_sayisi > 0 && <span>🏢 {e.kurum_sayisi}</span>}
                  {e.atama_sayisi > 0 && <span>🎯 {e.atama_sayisi}</span>}
                  <form
                    action={async () => {
                      'use server';
                      await etiketSil(e.id);
                    }}
                  >
                    <button
                      type="submit"
                      className="text-xs px-2 py-1 rounded bg-neutral-800 hover:bg-red-900 transition-colors"
                    >
                      🗑
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}