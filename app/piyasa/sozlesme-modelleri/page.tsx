import Link from 'next/link';
import { query } from '@/lib/db';
import { Card, CardTitle, CardSubtitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

export const dynamic = 'force-dynamic';

type SozlesmeModeli = {
  id: number;
  kod: string;
  ad: string;
  aciklama: string | null;
};

async function getModeller(): Promise<SozlesmeModeli[]> {
  return query<SozlesmeModeli>(`
    SELECT id, kod, ad, aciklama FROM piyasa_sozlesme_modeli WHERE aktif ORDER BY ad
  `);
}

function Kpi({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <Card>
      <div className="text-[10.5px] uppercase tracking-wider font-medium text-[var(--color-atlas-text-muted)]">
        {label}
      </div>
      <div className="mt-2 text-[28px] leading-none font-semibold tabular-nums text-[var(--color-atlas-cyan)]">
        {value}
      </div>
      {sub && (
        <div className="mt-2 text-[11.5px] text-[var(--color-atlas-text-muted)]">{sub}</div>
      )}
    </Card>
  );
}

export default async function SozlesmeModelleriPage() {
  const modeller = await getModeller();

  return (
    <div className="p-6 max-w-5xl mx-auto">
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
        <h1 className="text-[26px] font-semibold text-[var(--color-atlas-text)]">Sözleşme Modelleri</h1>
        <p className="mt-1 text-[13.5px] text-[var(--color-atlas-text-muted)]">
          {modeller.length} kanonik model · Tek sözlük · Salt okunur (madde 143)
        </p>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Kpi label="Toplam Model" value={modeller.length} sub="kanonik sözlük" />
        <Kpi label="Aktif Sözlük" value={modeller.length} sub="tümü aktif" />
        <Kpi label="Kural" value="Madde 143" sub="tek sözlük" />
      </section>

      <div className="mb-6 p-4 rounded-[var(--radius-atlas-md)] border border-[rgba(34,211,238,0.25)] bg-[rgba(34,211,238,0.06)]">
        <div className="flex items-start gap-3">
          <Badge tone="cyan" dot>Madde 143</Badge>
          <div className="text-[12.5px] text-[var(--color-atlas-text-2)] leading-relaxed">
            Yeni bir çalışma modeli tablosu oluşturulmaz. Bu sözlük tüm modüller tarafından referans alınır.
          </div>
        </div>
      </div>

      {modeller.length === 0 ? (
        <Card className="text-center py-10">
          <div className="text-[13px] text-[var(--color-atlas-text-muted)]">
            Sözleşme modeli sözlüğü boş.
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {modeller.map((m) => (
            <Card key={m.id} hoverable>
              <div className="flex items-start justify-between gap-3 mb-2">
                <CardTitle>{m.ad}</CardTitle>
                <span className="text-[11px] font-mono text-[var(--color-atlas-cyan)] px-2 py-0.5 rounded-[var(--radius-atlas-xs)] bg-[rgba(34,211,238,0.10)] border border-[rgba(34,211,238,0.25)] whitespace-nowrap">
                  {m.kod}
                </span>
              </div>
              {m.aciklama ? (
                <CardSubtitle>{m.aciklama}</CardSubtitle>
              ) : (
                <CardSubtitle className="italic">Açıklama yok</CardSubtitle>
              )}
            </Card>
          ))}
        </div>
      )}

      <footer className="mt-8 pt-4 border-t border-[var(--color-atlas-border)] text-[11.5px] text-[var(--color-atlas-text-muted)] leading-relaxed">
        <strong className="text-[var(--color-atlas-benchmark)]">V3 hazırlık (madde 151):</strong>{' '}
        Fırsat, ihale ve proje eşleştirmesinde bu sözlük referans alınacak.
      </footer>
    </div>
  );
}
