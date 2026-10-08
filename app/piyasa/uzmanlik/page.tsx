import Link from 'next/link';
import { query } from '@/lib/db';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

export const dynamic = 'force-dynamic';

type IsKolu = { id: number; kod: string; ad: string; grup: string };
type AltIsKolu = { id: number; is_kolu_id: number; ad: string };
type FirmaUzmanlik = {
  firma_id: number;
  firma_adi: string;
  ulke: string;
  is_kolu_id: number;
  alt_is_kolu_id: number | null;
  guc_seviyesi: string | null;
  uzmanlik_durumu: string;
};

async function getIsKollari(): Promise<IsKolu[]> {
  return query<IsKolu>(`
    SELECT id, kod, ad, grup::text AS grup
    FROM is_kolu WHERE aktif
    ORDER BY grup, ad
  `);
}

async function getAltIsKollari(): Promise<AltIsKolu[]> {
  return query<AltIsKolu>(`
    SELECT id, is_kolu_id, ad FROM alt_is_kolu WHERE aktif ORDER BY ad
  `);
}

async function getFirmaUzmanlik(): Promise<FirmaUzmanlik[]> {
  return query<FirmaUzmanlik>(`
    SELECT pf.id AS firma_id, pf.firma_adi, pf.ulke,
           pu.is_kolu_id, pu.alt_is_kolu_id,
           pu.guc_seviyesi::text AS guc_seviyesi,
           pu.uzmanlik_durumu::text AS uzmanlik_durumu
    FROM piyasa_uzmanlik pu
    JOIN piyasa_firma pf ON pf.id = pu.firma_id
    WHERE pf.aktif
  `);
}

const GRUP_TONE: Record<string, 'cyan' | 'benchmark' | 'warning'> = {
  ALTYAPI: 'cyan',
  USTYAPI: 'benchmark',
  ENDUSTRIYEL: 'warning',
};

const GUC_TONE: Record<string, 'success' | 'warning' | 'muted'> = {
  YUKSEK: 'success',
  ORTA: 'warning',
  DUSUK: 'muted',
};

function Kpi({ label, value, sub, tone = 'neutral' }: {
  label: string; value: number | string; sub?: string;
  tone?: 'neutral' | 'cyan';
}) {
  const valueColor =
    tone === 'cyan' ? 'text-[var(--color-atlas-cyan)]' : 'text-[var(--color-atlas-text)]';
  return (
    <Card>
      <div className="text-[10.5px] uppercase tracking-wider font-medium text-[var(--color-atlas-text-muted)]">
        {label}
      </div>
      <div className={`mt-2 text-[28px] leading-none font-semibold tabular-nums ${valueColor}`}>
        {value}
      </div>
      {sub && (
        <div className="mt-2 text-[11.5px] text-[var(--color-atlas-text-muted)]">{sub}</div>
      )}
    </Card>
  );
}

export default async function UzmanlikPage() {
  const [isKollari, altIsKollari, firmaUzmanlik] = await Promise.all([
    getIsKollari(), getAltIsKollari(), getFirmaUzmanlik(),
  ]);

  const firmalarByKolu = new Map<number, FirmaUzmanlik[]>();
  firmaUzmanlik.forEach((f) => {
    if (!firmalarByKolu.has(f.is_kolu_id)) firmalarByKolu.set(f.is_kolu_id, []);
    firmalarByKolu.get(f.is_kolu_id)!.push(f);
  });

  const altByKolu = new Map<number, AltIsKolu[]>();
  altIsKollari.forEach((a) => {
    if (!altByKolu.has(a.is_kolu_id)) altByKolu.set(a.is_kolu_id, []);
    altByKolu.get(a.is_kolu_id)!.push(a);
  });

  const gruplar = new Map<string, IsKolu[]>();
  isKollari.forEach((ik) => {
    const g = ik.grup ?? 'DIGER';
    if (!gruplar.has(g)) gruplar.set(g, []);
    gruplar.get(g)!.push(ik);
  });

  const firmaSet = new Set(firmaUzmanlik.map((f) => f.firma_id));

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <header className="mb-6">
        <Link
          href="/piyasa"
          className="text-[12px] text-[var(--color-atlas-text-muted)] hover:text-[var(--color-atlas-cyan)] mb-2 inline-block transition-colors"
        >
          ← Piyasa
        </Link>
        <div className="text-[10.5px] uppercase tracking-wider font-medium text-[var(--color-atlas-text-muted)] mb-2">
          Piyasa Oyuncuları · Madde 135–154
        </div>
        <h1 className="text-[26px] font-semibold text-[var(--color-atlas-text)]">İş Kolu Rehberi</h1>
        <p className="mt-1 text-[13.5px] text-[var(--color-atlas-text-muted)]">
          {isKollari.length} iş kolu · {altIsKollari.length} alt kategori · Salt okunur
        </p>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Kpi label="İş Kolu" value={isKollari.length} sub="kategorik" />
        <Kpi label="Alt Kategori" value={altIsKollari.length} sub="spesifik uzmanlık" />
        <Kpi
          label="Kayıtlı Firma"
          value={firmaSet.size}
          sub={`${firmaUzmanlik.length} uzmanlık kaydı`}
          tone="cyan"
        />
        <Kpi label="Ana Grup" value={gruplar.size} sub="Altyapı · Üstyapı · Endüstriyel" />
      </section>

      {isKollari.length === 0 ? (
        <Card className="text-center py-10">
          <div className="text-[13px] text-[var(--color-atlas-text-muted)]">İş kolu sözlüğü boş.</div>
        </Card>
      ) : (
        <div className="space-y-8">
          {Array.from(gruplar.entries()).map(([grup, kollar]) => {
            const tone = GRUP_TONE[grup] ?? 'cyan';
            return (
              <section key={grup}>
                <div className="flex items-center gap-3 mb-3">
                  <Badge tone={tone} dot>{grup}</Badge>
                  <span className="text-[12px] text-[var(--color-atlas-text-muted)]">
                    {kollar.length} iş kolu
                  </span>
                </div>
                <div className="space-y-3">
                  {kollar.map((ik) => {
                    const altlar = altByKolu.get(ik.id) ?? [];
                    const firmalar = firmalarByKolu.get(ik.id) ?? [];
                    return (
                      <Card key={ik.id} padded={false}>
                        <div className="px-5 py-3 border-b border-[var(--color-atlas-border)] flex items-center justify-between">
                          <div className="flex items-baseline gap-2">
                            <span className="font-semibold text-[14px] text-[var(--color-atlas-text)]">
                              {ik.ad}
                            </span>
                            <span className="text-[11px] text-[var(--color-atlas-text-muted)] font-mono">
                              {ik.kod}
                            </span>
                          </div>
                          <span className="text-[11.5px] text-[var(--color-atlas-text-muted)]">
                            {firmalar.length} firma
                          </span>
                        </div>

                        {altlar.length > 0 && (
                          <div className="px-5 py-3 border-b border-[var(--color-atlas-border)] flex flex-wrap gap-1.5">
                            {altlar.map((a) => (
                              <span
                                key={a.id}
                                className="text-[11px] px-2 py-0.5 rounded-[var(--radius-atlas-xs)] bg-[var(--color-atlas-surface-2)] text-[var(--color-atlas-text-2)] border border-[var(--color-atlas-border)]"
                              >
                                {a.ad}
                              </span>
                            ))}
                          </div>
                        )}

                        {firmalar.length > 0 ? (
                          <div>
                            {firmalar.map((f) => {
                              const guc = f.guc_seviyesi ?? 'DUSUK';
                              const gucTone = GUC_TONE[guc] ?? 'muted';
                              const durumEtiket =
                                f.uzmanlik_durumu === 'KAYNAKTA_BELIRTILDI' ? 'Kaynaklı' :
                                f.uzmanlik_durumu === 'KAYNAKTAN_ESLESTIRILDI' ? 'Eşleştirildi' :
                                'Uzman İncelemesi';
                              return (
                                <div
                                  key={`${f.firma_id}-${ik.id}`}
                                  className="px-5 py-2.5 flex items-center justify-between gap-3 border-b border-[var(--color-atlas-border)] last:border-0 hover:bg-[var(--color-atlas-surface-3)] transition-colors"
                                >
                                  <div className="flex items-center gap-3 flex-wrap">
                                    <Link
                                      href={`/piyasa/firma/${f.firma_id}`}
                                      className="text-[13px] text-[var(--color-atlas-text)] hover:text-[var(--color-atlas-cyan)] transition-colors"
                                    >
                                      {f.firma_adi}
                                    </Link>
                                    <span className="text-[11px] text-[var(--color-atlas-text-disabled)]">
                                      {f.ulke}
                                    </span>
                                    <Badge tone={gucTone}>{guc}</Badge>
                                    <span className="text-[11px] text-[var(--color-atlas-text-muted)]">
                                      {durumEtiket}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="px-5 py-3 text-[12px] text-[var(--color-atlas-text-disabled)]">
                            Bu iş kolunda kayıtlı firma uzmanlığı yok
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <footer className="mt-8 pt-4 border-t border-[var(--color-atlas-border)] text-[11.5px] text-[var(--color-atlas-text-muted)] leading-relaxed">
        <strong className="text-[var(--color-atlas-warning)]">Kural (madde 140):</strong>{' '}
        Uzmanlık kaynaksız eklenmez. Güç seviyesi uydurulmaz; yalnızca kaynakta belirtilen veya insan incelemesi onaylı veri gösterilir.
      </footer>
    </div>
  );
}
