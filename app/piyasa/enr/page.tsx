import Link from 'next/link';
import { query } from '@/lib/db';
import { Card, CardTitle, CardSubtitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

export const dynamic = 'force-dynamic';

type EnrSatir = {
  firma_id: number;
  firma_adi: string;
  ulke: string;
  kisa_aciklama: string | null;
  enr_yili: number;
  gelir_yili: number;
  liste_turu: string;
  sira: number | null;
  tr_sira: number | null;
  gelir_milyar_usd: number | null;
};

type Versiyon = {
  enr_yili: number;
  gelir_yili: number;
  liste_turu: string;
  tr_firma_sayisi: number | null;
  global_firma_sayisi: number | null;
  toplam_gelir_milyar_usd: number | null;
  durum: string;
};

async function getVersiyonlar(): Promise<Versiyon[]> {
  return query<Versiyon>(`
    SELECT enr_yili, gelir_yili, liste_turu::text AS liste_turu,
           tr_firma_sayisi, global_firma_sayisi,
           toplam_gelir_milyar_usd::float AS toplam_gelir_milyar_usd,
           durum::text AS durum
    FROM piyasa_enr_versiyon
    ORDER BY enr_yili DESC, liste_turu
  `);
}

async function getEnrSatirlar(): Promise<EnrSatir[]> {
  return query<EnrSatir>(`
    SELECT pf.id AS firma_id, pf.firma_adi, pf.ulke, pf.kisa_aciklama,
           pes.enr_yili, pes.gelir_yili, pes.liste_turu::text AS liste_turu,
           pes.sira, pes.tr_sira, pes.gelir_milyar_usd::float AS gelir_milyar_usd
    FROM piyasa_enr_siralama pes
    JOIN piyasa_firma pf ON pf.id = pes.firma_id
    WHERE pf.aktif
    ORDER BY pes.enr_yili DESC, pes.liste_turu, COALESCE(pes.tr_sira, pes.sira) NULLS LAST
  `);
}

function Kpi({ label, value, sub, tone = 'neutral' }: {
  label: string; value: number | string; sub?: string;
  tone?: 'neutral' | 'cyan' | 'success' | 'warning';
}) {
  const valueColor = {
    neutral: 'text-[var(--color-atlas-text)]',
    cyan: 'text-[var(--color-atlas-cyan)]',
    success: 'text-[var(--color-atlas-success-lt)]',
    warning: 'text-[var(--color-atlas-warning)]',
  }[tone];
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

export default async function EnrPage() {
  const [versiyonlar, satirlar] = await Promise.all([getVersiyonlar(), getEnrSatirlar()]);

  const gruplar = new Map<string, EnrSatir[]>();
  satirlar.forEach((s) => {
    const anahtar = `${s.enr_yili}-${s.gelir_yili}-${s.liste_turu}`;
    if (!gruplar.has(anahtar)) gruplar.set(anahtar, []);
    gruplar.get(anahtar)!.push(s);
  });

  const ulkeSet = new Set(satirlar.map((s) => s.ulke));
  const sonVersiyon = versiyonlar[0];

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
        <h1 className="text-[26px] font-semibold text-[var(--color-atlas-text)]">ENR Listeleri</h1>
        <p className="mt-1 text-[13.5px] text-[var(--color-atlas-text-muted)]">
          Türkiye ve uluslararası ENR kesit&apos;ları · Salt okunur
        </p>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Kpi label="Toplam Kayıt" value={satirlar.length} sub={`${gruplar.size} kesit`} />
        <Kpi label="Ülke Sayısı" value={ulkeSet.size} sub="firma menşei" />
        <Kpi label="Kesit" value={versiyonlar.length} sub="ENR yılı × liste türü" tone="cyan" />
        <Kpi
          label="Son Versiyon"
          value={sonVersiyon ? `ENR ${sonVersiyon.enr_yili}` : '—'}
          sub={sonVersiyon?.durum ?? ''}
          tone="success"
        />
      </section>

      <div className="mb-6 p-4 rounded-[var(--radius-atlas-md)] border border-[rgba(245,158,11,0.30)] bg-[rgba(245,158,11,0.08)]">
        <div className="flex items-start gap-3">
          <Badge tone="warning" dot>Madde 138</Badge>
          <div className="text-[12.5px] text-[var(--color-atlas-text-2)] leading-relaxed">
            Sıralar yalnızca doğrulanmış kaynaktan gelir. ENR&apos;de yer almak otomatik RAKİP değil, varsayılan{' '}
            <strong className="text-[var(--color-atlas-benchmark)]">BENCHMARK</strong>&apos;tır (madde 135).
          </div>
        </div>
      </div>

      {versiyonlar.length > 0 && (
        <section className="mb-8">
          <h2 className="text-[11px] uppercase tracking-wider font-medium text-[var(--color-atlas-text-muted)] mb-3">
            Kesit Sürümleri
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {versiyonlar.map((v) => {
              const tone: 'success' | 'cyan' | 'muted' =
                v.durum === 'YAYINDA' ? 'success' :
                v.durum === 'HAZIR' ? 'cyan' : 'muted';
              return (
                <Card key={`${v.enr_yili}-${v.gelir_yili}-${v.liste_turu}`}>
                  <div className="flex items-start justify-between mb-2">
                    <CardTitle>ENR {v.enr_yili} · {v.liste_turu}</CardTitle>
                    <Badge tone={tone} dot>{v.durum}</Badge>
                  </div>
                  <CardSubtitle>
                    Gelir yılı {v.gelir_yili}
                    {v.tr_firma_sayisi != null && ` · TR ${v.tr_firma_sayisi} firma`}
                    {v.global_firma_sayisi != null && ` · Global ${v.global_firma_sayisi}`}
                  </CardSubtitle>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {gruplar.size === 0 ? (
        <Card className="text-center py-10">
          <div className="text-[13px] text-[var(--color-atlas-text-muted)]">
            Doğrulanmış ENR sıralaması henüz yok.
          </div>
        </Card>
      ) : (
        Array.from(gruplar.entries()).map(([anahtar, liste]) => {
          const ilk = liste[0];
          return (
            <section key={anahtar} className="mb-8">
              <div className="flex items-baseline gap-3 mb-3">
                <h2 className="text-[15px] font-semibold text-[var(--color-atlas-text)]">
                  ENR {ilk.enr_yili} · {ilk.liste_turu}
                </h2>
                <span className="text-[12px] text-[var(--color-atlas-text-muted)]">
                  Gelir yılı {ilk.gelir_yili}
                </span>
                <span className="ml-auto text-[12px] text-[var(--color-atlas-text-muted)]">
                  {liste.length} kayıt
                </span>
              </div>
              <div className="rounded-[var(--radius-atlas-lg)] border border-[var(--color-atlas-border)] bg-[var(--color-atlas-surface)] overflow-hidden">
                <table className="w-full text-[13px]">
                  <thead className="bg-[var(--color-atlas-bg)] text-[var(--color-atlas-text-muted)] text-[10.5px] uppercase tracking-wider">
                    <tr className="border-b border-[var(--color-atlas-border)]">
                      <th className="text-left px-4 py-2.5 w-20 font-medium">Sıra</th>
                      <th className="text-left px-4 py-2.5 font-medium">Firma</th>
                      <th className="text-left px-4 py-2.5 w-24 font-medium">Ülke</th>
                      <th className="text-right px-4 py-2.5 w-28 font-medium">Gelir (m$)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {liste.map((s) => (
                      <tr
                        key={`${s.firma_id}-${anahtar}`}
                        className="border-b border-[var(--color-atlas-border)] last:border-0 hover:bg-[var(--color-atlas-surface-3)] transition-colors"
                      >
                        <td className="px-4 py-2.5 font-mono text-[var(--color-atlas-text-muted)] tabular-nums">
                          {s.tr_sira != null ? `TR#${s.tr_sira}` : s.sira != null ? `#${s.sira}` : '—'}
                        </td>
                        <td className="px-4 py-2.5">
                          <Link
                            href={`/piyasa/firma/${s.firma_id}`}
                            className="text-[var(--color-atlas-text)] hover:text-[var(--color-atlas-cyan)] transition-colors"
                          >
                            {s.firma_adi}
                          </Link>
                          {s.kisa_aciklama && (
                            <div className="text-[11.5px] text-[var(--color-atlas-text-muted)] mt-0.5">
                              {s.kisa_aciklama}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-[var(--color-atlas-text-muted)] text-[12px]">
                          {s.ulke}
                        </td>
                        <td className="px-4 py-2.5 text-right text-[var(--color-atlas-text-2)] font-mono tabular-nums">
                          {s.gelir_milyar_usd != null ? (s.gelir_milyar_usd * 1000).toFixed(0) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
