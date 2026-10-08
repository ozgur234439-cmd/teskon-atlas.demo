import Link from 'next/link';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

async function getSehirler() {
  return query<{
    id: number; sehir_adi: string; ulke: string; ulke_kodu: string | null;
    enlem: string | null; boylam: string | null; durum: string;
    kaynak_referansi: string | null;
    gosterge_sayisi: string;
  }>(`
    SELECT s.id, s.sehir_adi, s.ulke, s.ulke_kodu, s.enlem::text, s.boylam::text,
           s.durum::text AS durum, k.kaynak_referansi,
           (SELECT COUNT(*)::text FROM pazar_sehir_gosterge sg WHERE sg.global_sehir_id = s.id) AS gosterge_sayisi
    FROM pazar_global_sehir s
    LEFT JOIN kaynak k ON k.id = s.kaynak_id
    ORDER BY s.ulke, s.sehir_adi
  `);
}

async function getOzet() {
  const [r] = await query<{ toplam: number; hazir: number; arsiv: number; hedef: string }>(`
    SELECT
      (SELECT COUNT(*)::int FROM pazar_global_sehir) AS toplam,
      (SELECT COUNT(*)::int FROM pazar_global_sehir WHERE durum = 'HAZIR') AS hazir,
      (SELECT COUNT(*)::int FROM pazar_global_sehir WHERE durum = 'ARSIV') AS arsiv,
      '50' AS hedef
  `);
  return r;
}

export default async function GlobalSehirlerPage() {
  const [sehirler, ozet] = await Promise.all([getSehirler(), getOzet()]);

  const hedef = Number(ozet.hedef);
  const yuzde = Math.round((ozet.toplam / hedef) * 100);

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 p-10">
      <div className="max-w-5xl mx-auto">
        <header className="mb-8">
          <Link href="/pazar" className="text-sm text-neutral-500 hover:text-neutral-300 mb-2 inline-block">← Pazar</Link>
          <h1 className="text-3xl font-bold mb-1">Global Şehirler</h1>
          <p className="text-neutral-400 text-sm">
            Kaynaklı referans şehirler (madde 163) · V1 hedefi {hedef} şehir
          </p>
        </header>

        <section className="mb-8 p-5 rounded-lg border border-neutral-800 bg-neutral-900">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs uppercase text-neutral-500">Kapsam</div>
            <div className="text-xs text-neutral-500">
              <strong className="text-blue-400">{ozet.toplam}</strong> / {hedef}
            </div>
          </div>
          <div className="w-full bg-neutral-950 rounded-full h-2 overflow-hidden border border-neutral-800">
            <div className="h-full bg-blue-600" style={{ width: `${yuzde}%` }} />
          </div>
          <div className="flex gap-4 mt-3 text-xs text-neutral-500">
            <span><strong className="text-neutral-300">{ozet.hazir}</strong> hazır</span>
            <span><strong className="text-neutral-300">{ozet.toplam - ozet.hazir}</strong> diğer</span>
            {ozet.arsiv > 0 && <span><strong className="text-neutral-400">{ozet.arsiv}</strong> arşiv</span>}
          </div>
        </section>

        <section>
          <h2 className="text-xs uppercase text-neutral-500 font-semibold mb-3">
            Şehirler ({sehirler.length})
          </h2>
          {sehirler.length === 0 ? (
            <div className="p-10 rounded-lg border border-dashed border-neutral-800 bg-neutral-900/50 text-center text-sm text-neutral-500">
              Kaynaklı global şehir yok
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {sehirler.map((s) => (
                <div key={s.id} className="p-5 rounded-lg border border-neutral-800 bg-neutral-900">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-medium">{s.sehir_adi}</h3>
                      <div className="text-xs text-neutral-500 mt-1">
                        {s.ulke}{s.ulke_kodu && <> · {s.ulke_kodu}</>}
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded border ${s.durum === 'HAZIR' ? 'bg-blue-950/40 text-blue-300 border-blue-800' : 'bg-neutral-800 text-neutral-400 border-neutral-700'}`}>
                      {s.durum}
                    </span>
                  </div>
                  {s.enlem && s.boylam && (
                    <div className="text-xs text-neutral-600 font-mono">
                      {Number(s.enlem).toFixed(4)}, {Number(s.boylam).toFixed(4)}
                    </div>
                  )}
                  {Number(s.gosterge_sayisi) > 0 && (
                    <div className="text-xs text-neutral-500 mt-2">
                      {s.gosterge_sayisi} gösterge kaydı
                    </div>
                  )}
                  {s.kaynak_referansi && (
                    <div className="text-xs text-neutral-700 mt-2 truncate">
                      Kaynak: {s.kaynak_referansi}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <footer className="mt-10 pt-6 border-t border-neutral-800 text-xs text-neutral-600">
          <strong className="text-amber-500">Madde 163:</strong> 50 sayısı yalnızca <em>hedef kapsam</em>dır.
          Kaynaklanmamış şehir uydurulmaz.
        </footer>
      </div>
    </main>
  );
}