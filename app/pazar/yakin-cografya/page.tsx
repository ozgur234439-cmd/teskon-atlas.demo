import Link from 'next/link';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

async function getSehirler() {
  return query<{
    id: number; sehir: string; ulke: string; mesafe_km: number | null;
    yil: number | null; kaynak_referansi: string | null;
  }>(`
    SELECT y.id, y.sehir, y.ulke, y.mesafe_km, y.yil, k.kaynak_referansi
    FROM pazar_yakin_cografya y
    LEFT JOIN kaynak k ON k.id = y.kaynak_id
    ORDER BY y.mesafe_km NULLS LAST, y.sehir
  `);
}

export default async function YakinCografyaPage() {
  const sehirler = await getSehirler();
  const hedef = 20;

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 p-10">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <Link href="/pazar" className="text-sm text-neutral-500 hover:text-neutral-300 mb-2 inline-block">← Pazar</Link>
          <h1 className="text-3xl font-bold mb-1">Yakın Coğrafya</h1>
          <p className="text-neutral-400 text-sm">
            Türkiye&apos;ye yakın stratejik şehirler (madde 165) · V1 hedefi {hedef} şehir
          </p>
        </header>

        <section className="mb-8 p-5 rounded-lg border border-neutral-800 bg-neutral-900">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs uppercase text-neutral-500">Kapsam</div>
            <div className="text-xs text-neutral-500">
              <strong className="text-green-400">{sehirler.length}</strong> / {hedef}
            </div>
          </div>
          <div className="w-full bg-neutral-950 rounded-full h-2 overflow-hidden border border-neutral-800">
            <div className="h-full bg-green-600" style={{ width: `${Math.min(100, (sehirler.length / hedef) * 100)}%` }} />
          </div>
        </section>

        <section>
          <h2 className="text-xs uppercase text-neutral-500 font-semibold mb-3">
            Şehirler ({sehirler.length})
          </h2>
          {sehirler.length === 0 ? (
            <div className="p-10 rounded-lg border border-dashed border-neutral-800 bg-neutral-900/50 text-center text-sm text-neutral-500">
              Kaynaklı yakın coğrafya şehri yok
            </div>
          ) : (
            <div className="space-y-2">
              {sehirler.map((s) => (
                <div key={s.id} className="p-4 rounded-lg border border-neutral-800 bg-neutral-900 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{s.sehir}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-neutral-800 text-neutral-400">{s.ulke}</span>
                    </div>
                    {s.kaynak_referansi && (
                      <div className="text-xs text-neutral-600 mt-1">Kaynak: {s.kaynak_referansi}</div>
                    )}
                  </div>
                  <div className="text-right">
                    {s.mesafe_km != null && (
                      <div className="text-sm text-neutral-300">
                        <strong>{s.mesafe_km.toLocaleString('tr-TR')}</strong>{' '}
                        <span className="text-xs text-neutral-500">km</span>
                      </div>
                    )}
                    {s.yil && <div className="text-xs text-neutral-600">{s.yil}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <footer className="mt-10 pt-6 border-t border-neutral-800 text-xs text-neutral-600">
          <strong className="text-amber-500">Madde 165:</strong> Liste kaynaktan doldurulur; tahmini sıra verilmez.
          Kaynaklandırılmamış şehir otomatik eklenmez.
        </footer>
      </div>
    </main>
  );
}