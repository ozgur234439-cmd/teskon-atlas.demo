import Link from 'next/link';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

type SablonSatir = {
  id: number;
  sablon_adi: string;
  tipik_birim: string;
  makam_sinifi: string | null;
  aciklama: string | null;
  kategori: string | null;
  tur: string | null;
  makam_ad: string | null;
  kaynak_ref: string | null;
};

async function getSablonlar(): Promise<SablonSatir[]> {
  return query<SablonSatir>(`
    SELECT ks.id, ks.sablon_adi, ks.tipik_birim,
           ks.makam_sinifi::text AS makam_sinifi,
           ks.aciklama,
           ak.ad AS kategori,
           kt.ad AS tur,
           km.ad AS makam_ad,
           k.kaynak_referansi AS kaynak_ref
    FROM kurum_sablonu ks
    LEFT JOIN ana_kategori ak ON ak.id = ks.ana_kategori_id
    LEFT JOIN kurum_turu kt ON kt.id = ks.kurum_turu_id
    LEFT JOIN kanonik_makam km ON km.id = ks.tipik_makam_id
    LEFT JOIN kaynak k ON k.id = ks.kaynak_id
    WHERE ks.aktif
    ORDER BY ks.sablon_adi, ks.tipik_birim
  `);
}

const SINIF_RENK: Record<string, string> = {
  A: 'bg-red-950/50 text-red-300 border-red-800',
  B: 'bg-orange-950/50 text-orange-300 border-orange-800',
  C: 'bg-yellow-950/50 text-yellow-300 border-yellow-800',
  D: 'bg-neutral-800 text-neutral-300 border-neutral-700',
};

export default async function KurumSablonlariPage() {
  const sablonlar = await getSablonlar();

  // Sablon adina gore grupla
  const gruplar = new Map<string, SablonSatir[]>();
  sablonlar.forEach((s) => {
    if (!gruplar.has(s.sablon_adi)) gruplar.set(s.sablon_adi, []);
    gruplar.get(s.sablon_adi)!.push(s);
  });

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 p-6 md:p-10">
      <div className="max-w-5xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold mb-1">Kurum Şablonları</h1>
          <p className="text-neutral-400 text-sm">
            {sablonlar.length} şablon · {gruplar.size} kurum tipi · Read-only (madde 20)
          </p>
        </header>

        <section className="mb-8 p-4 rounded-lg border border-amber-900/40 bg-amber-950/10 text-xs text-amber-300">
          <strong>Uyarı (madde 20):</strong> Bu şablonlar <strong>araştırma rehberidir</strong>.
          Gerçek kurumda varlığını garanti etmez. Bir kurumu araştırırken hangi birim
          ve makamları aramanız gerektiğini gösterir. Atlas'a kayıt yaparken kaynak zorunludur.
        </section>

        {sablonlar.length === 0 ? (
          <div className="p-10 rounded-lg border border-dashed border-neutral-800 bg-neutral-900/50 text-center text-sm text-neutral-500">
            Şablon kaydı yok. Migration 020 çalıştırılmamış olabilir.
          </div>
        ) : (
          <div className="space-y-8">
            {Array.from(gruplar.entries()).map(([ad, satirlar]) => (
              <section key={ad}>
                <h2 className="text-lg font-semibold mb-3">
                  {ad}
                  <span className="text-xs text-neutral-500 font-normal ml-3">
                    {satirlar.length} birim
                  </span>
                </h2>
                <div className="rounded-lg border border-neutral-800 bg-neutral-900 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-neutral-950/50 text-neutral-500 text-xs uppercase">
                      <tr>
                        <th className="text-left px-4 py-2 w-16">Sınıf</th>
                        <th className="text-left px-4 py-2">Tipik Birim</th>
                        <th className="text-left px-4 py-2 w-1/3">Açıklama</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800">
                      {satirlar.map((s) => {
                        const sr = s.makam_sinifi
                          ? SINIF_RENK[s.makam_sinifi] ?? SINIF_RENK.D
                          : SINIF_RENK.D;
                        return (
                          <tr key={s.id} className="hover:bg-neutral-800/30 transition-colors">
                            <td className="px-4 py-3">
                              {s.makam_sinifi ? (
                                <span className={`text-xs px-2 py-0.5 rounded border ${sr}`}>
                                  {s.makam_sinifi}
                                </span>
                              ) : (
                                <span className="text-xs text-neutral-600">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-neutral-100">{s.tipik_birim}</div>
                              {s.makam_ad && (
                                <div className="text-xs text-neutral-500 mt-0.5">
                                  Örnek makam: {s.makam_ad}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-xs text-neutral-400">
                              {s.aciklama ?? '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            ))}
          </div>
        )}

        <footer className="mt-10 pt-6 border-t border-neutral-800 text-xs text-neutral-600">
          <strong className="text-neutral-400">Kural:</strong> Şablon rehberdir, kaynak değildir.
          Gerçek kurum makamları yalnızca kaynaklı araştırma ile Atlas'a girer.
        </footer>
      </div>
    </main>
  );
}