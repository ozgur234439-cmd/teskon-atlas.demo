import Link from 'next/link';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

type IsKolu = {
  id: number;
  kod: string;
  ad: string;
  grup: string;
  aciklama: string | null;
  alt_kollar: { id: number; kod: string; ad: string }[];
  firma_sayisi: number;
};

async function getIsKollari(): Promise<IsKolu[]> {
  const anaGruplar = await query<{ id: number; kod: string; ad: string; grup: string; aciklama: string | null }>(`
    SELECT id, kod, ad, grup::text AS grup, aciklama FROM is_kolu WHERE aktif ORDER BY grup, ad
  `);

  const altKollar = await query<{ id: number; kod: string; ad: string; is_kolu_id: number }>(`
    SELECT id, kod, ad, is_kolu_id FROM alt_is_kolu WHERE aktif ORDER BY ad
  `);

  const firmaSayilari = await query<{ is_kolu_id: number; sayi: string }>(`
    SELECT pu.is_kolu_id, COUNT(DISTINCT pu.firma_id)::text AS sayi
    FROM piyasa_uzmanlik pu
    WHERE pu.firma_id IN (SELECT id FROM piyasa_firma WHERE aktif)
    GROUP BY pu.is_kolu_id
  `);

  const firmaMap = new Map(firmaSayilari.map((f) => [f.is_kolu_id, Number(f.sayi)]));

  return anaGruplar.map((g) => ({
    ...g,
    alt_kollar: altKollar.filter((a) => a.is_kolu_id === g.id),
    firma_sayisi: firmaMap.get(g.id) ?? 0,
  }));
}

const GRUP_RENK: Record<string, string> = {
  ALTYAPI: 'bg-blue-950/40 text-blue-300 border-blue-800',
  USTYAPI: 'bg-amber-950/40 text-amber-300 border-amber-800',
  ENDUSTRIYEL: 'bg-red-950/40 text-red-300 border-red-800',
};

const GRUP_ETIKET: Record<string, string> = {
  ALTYAPI: 'Altyapı',
  USTYAPI: 'Üstyapı',
  ENDUSTRIYEL: 'Endüstriyel',
};

export default async function IsKoluPage() {
  const isKollari = await getIsKollari();
  const gruplar = ['ALTYAPI', 'USTYAPI', 'ENDUSTRIYEL'];

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 p-10">
      <div className="max-w-5xl mx-auto">
        <header className="mb-8">
          <Link href="/pazar" className="text-sm text-neutral-500 hover:text-neutral-300 mb-2 inline-block">← Pazar</Link>
          <h1 className="text-3xl font-bold mb-1">İş Kolu Rehberi</h1>
          <p className="text-neutral-400 text-sm">
            Kanonik iş kolu sözlüğü (madde 157-158) · Firma değil, işin türünü tanımlar
          </p>
        </header>

        {gruplar.map((grup) => {
          const gruptakiKollar = isKollari.filter((i) => i.grup === grup);
          if (gruptakiKollar.length === 0) return null;
          const renk = GRUP_RENK[grup] ?? 'bg-neutral-800 text-neutral-300 border-neutral-700';

          return (
            <section key={grup} className="mb-10">
              <div className="flex items-center gap-3 mb-4">
                <span className={`text-xs px-3 py-1 rounded border font-semibold ${renk}`}>
                  {GRUP_ETIKET[grup] ?? grup}
                </span>
                <span className="text-xs text-neutral-500">{gruptakiKollar.length} iş kolu</span>
              </div>

              <div className="space-y-3">
                {gruptakiKollar.map((ik) => (
                  <div key={ik.id} className="rounded-lg border border-neutral-800 bg-neutral-900 overflow-hidden">
                    <div className="px-5 py-3 border-b border-neutral-800 bg-neutral-950/40 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <h2 className="font-semibold">{ik.ad}</h2>
                        <span className="text-xs text-neutral-600 font-mono">{ik.kod}</span>
                      </div>
                      {ik.firma_sayisi > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded bg-neutral-800 text-neutral-400">
                          {ik.firma_sayisi} firma
                        </span>
                      )}
                    </div>
                    {ik.alt_kollar.length > 0 ? (
                      <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-2">
                        {ik.alt_kollar.map((ak) => (
                          <div key={ak.id} className="px-3 py-2 rounded bg-neutral-950 border border-neutral-800 text-sm">
                            {ak.ad}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="px-5 py-3 text-xs text-neutral-600">Alt kategori tanımlı değil</div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          );
        })}

        <footer className="mt-10 pt-6 border-t border-neutral-800 text-xs text-neutral-600">
          Madde 158: Bu sözlük <code className="text-neutral-400">PIYASA_UZMANLIK</code> tarafından FK ile referanslanır.
          Düz metin uzmanlık tutulmaz (madde 120C).
        </footer>
      </div>
    </main>
  );
}