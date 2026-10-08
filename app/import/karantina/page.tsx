import Link from 'next/link';
import { query } from '@/lib/db';
import { cozulduIsaretle, cozulduGeriAl, karantinaSil } from './actions';

export const dynamic = 'force-dynamic';

type KarantinaSatir = {
  id: number;
  ham_veri: any;
  karantina_nedeni: string;
  aciklama: string | null;
  cozuldu: boolean;
  created_at: string;
  batch_id: number;
  batch_dosya: string | null;
};

const NEDEN_RENK: Record<string, string> = {
  KAYNAK_YOK: 'bg-red-950/40 text-red-300 border-red-800',
  TOPLAMA_TARIHI_YOK: 'bg-red-950/40 text-red-300 border-red-800',
  KURUM_ESLESMEDI: 'bg-orange-950/40 text-orange-300 border-orange-800',
  BIRIM_ESLESMEDI: 'bg-orange-950/40 text-orange-300 border-orange-800',
  MAKAM_ESLESMEDI: 'bg-orange-950/40 text-orange-300 border-orange-800',
  DUPLICATE_SUPHESI: 'bg-amber-950/40 text-amber-300 border-amber-800',
  KVKK_ISARETI_EKSIK: 'bg-amber-950/40 text-amber-300 border-amber-800',
  FORMAT_HATASI: 'bg-neutral-800 text-neutral-400 border-neutral-700',
};

type Filtre = { neden?: string; durum?: 'acik' | 'kapali' | 'tumu' };

async function getKarantina(f: Filtre): Promise<KarantinaSatir[]> {
  const kosullar: string[] = [];
  const params: any[] = [];

  if (f.neden) {
    params.push(f.neden);
    kosullar.push(`k.karantina_nedeni = $${params.length}`);
  }
  if (f.durum === 'acik') kosullar.push(`k.cozuldu = FALSE`);
  else if (f.durum === 'kapali') kosullar.push(`k.cozuldu = TRUE`);

  const where = kosullar.length ? 'WHERE ' + kosullar.join(' AND ') : '';

  return query<KarantinaSatir>(`
    SELECT k.id, k.ham_veri, k.karantina_nedeni::text AS karantina_nedeni,
           k.aciklama, k.cozuldu, k.created_at::text AS created_at,
           k.import_batch_id AS batch_id, b.dosya_adi AS batch_dosya
    FROM import_karantina k
    LEFT JOIN import_batch b ON b.id = k.import_batch_id
    ${where}
    ORDER BY k.cozuldu ASC, k.created_at DESC
    LIMIT 300
  `, params);
}

async function getIstatistik() {
  const rows = await query<{ karantina_nedeni: string; toplam: number; cozulmemis: number }>(`
    SELECT karantina_nedeni::text AS karantina_nedeni,
           COUNT(*)::int AS toplam,
           COUNT(*) FILTER (WHERE NOT cozuldu)::int AS cozulmemis
    FROM import_karantina
    GROUP BY karantina_nedeni
    ORDER BY cozulmemis DESC, toplam DESC
  `);
  return rows;
}

function buildQuery(f: Filtre): string {
  const p = new URLSearchParams();
  if (f.neden) p.set('neden', f.neden);
  if (f.durum && f.durum !== 'acik') p.set('durum', f.durum);
  const qs = p.toString();
  return qs ? `?${qs}` : '';
}

export default async function KarantinaPage({
  searchParams,
}: {
  searchParams: Promise<{ neden?: string; durum?: string }>;
}) {
  const sp = await searchParams;
  const filtre: Filtre = {
    neden: sp.neden,
    durum: (sp.durum as Filtre['durum']) ?? 'acik',
  };

  const [karantina, istatistik] = await Promise.all([
    getKarantina(filtre),
    getIstatistik(),
  ]);

  const toplam = istatistik.reduce((s, i) => s + i.toplam, 0);
  const cozulmemis = istatistik.reduce((s, i) => s + i.cozulmemis, 0);

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 p-6 md:p-10">
      <div className="max-w-5xl mx-auto">
        <header className="mb-8">
          <Link
            href="/import"
            className="text-sm text-neutral-500 hover:text-neutral-300 mb-2 inline-block"
          >
            ← Import
          </Link>
          <h1 className="text-3xl font-bold mb-1">Karantina</h1>
          <p className="text-neutral-400 text-sm">
            {toplam} kayıt · <span className="text-amber-400">{cozulmemis} çözülmemiş</span>
            {cozulmemis < toplam && (
              <span className="text-green-400 ml-2">· {toplam - cozulmemis} çözüldü</span>
            )}
          </p>
        </header>

        {/* Neden istatistikleri */}
        {istatistik.length > 0 && (
          <section className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-2">
            <Link
              href="/import/karantina"
              className={`p-3 rounded-lg border transition-colors ${
                !filtre.neden
                  ? 'border-blue-700 bg-blue-950/20'
                  : 'border-neutral-800 bg-neutral-900 hover:border-neutral-600'
              }`}
            >
              <div className="text-xs text-neutral-500 mb-1">Tümü</div>
              <div className="text-lg font-bold">{toplam}</div>
            </Link>
            {istatistik.map((i) => {
              const aktif = filtre.neden === i.karantina_nedeni;
              return (
                <Link
                  key={i.karantina_nedeni}
                  href={`/import/karantina?neden=${i.karantina_nedeni}`}
                  className={`p-3 rounded-lg border transition-colors ${
                    aktif
                      ? 'border-blue-700 bg-blue-950/20'
                      : 'border-neutral-800 bg-neutral-900 hover:border-neutral-600'
                  }`}
                >
                  <div className="text-xs text-neutral-500 mb-1 truncate">
                    {i.karantina_nedeni}
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-lg font-bold text-amber-400">{i.cozulmemis}</span>
                    <span className="text-xs text-neutral-600">/ {i.toplam}</span>
                  </div>
                </Link>
              );
            })}
          </section>
        )}

        {/* Durum filtresi */}
        <section className="mb-6 flex items-center gap-2 text-xs">
          <span className="text-neutral-500">Durum:</span>
          {(['acik', 'kapali', 'tumu'] as const).map((d) => {
            const aktif = (filtre.durum ?? 'acik') === d;
            const p = new URLSearchParams();
            if (filtre.neden) p.set('neden', filtre.neden);
            if (d !== 'acik') p.set('durum', d);
            const qs = p.toString();
            const label = d === 'acik' ? 'Çözülmemiş' : d === 'kapali' ? 'Çözülmüş' : 'Tümü';
            return (
              <Link
                key={d}
                href={`/import/karantina${qs ? '?' + qs : ''}`}
                className={`px-2.5 py-1 rounded-md border transition-colors ${
                  aktif
                    ? 'border-blue-700 bg-blue-950/30 text-blue-300'
                    : 'border-neutral-800 text-neutral-400 hover:border-neutral-600'
                }`}
              >
                {label}
              </Link>
            );
          })}
        </section>

        {/* Kayıt listesi */}
        {karantina.length === 0 ? (
          <div className="p-10 rounded-lg border border-dashed border-neutral-800 bg-neutral-900/50 text-center">
            <div className="text-lg font-medium mb-2 text-neutral-300">Kayıt yok</div>
            <div className="text-sm text-neutral-500">
              {filtre.neden || filtre.durum !== 'acik'
                ? 'Bu filtreye uyan kayıt bulunamadı.'
                : 'Import hataları burada birikecek (madde 63).'}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {karantina.map((k) => {
              const r = NEDEN_RENK[k.karantina_nedeni] ?? NEDEN_RENK.FORMAT_HATASI;
              const veri = k.ham_veri;
              return (
                <div
                  key={k.id}
                  className={`p-4 rounded-lg border bg-neutral-900 ${
                    k.cozuldu
                      ? 'border-neutral-800 opacity-70'
                      : 'border-red-900/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded border ${r}`}>
                        {k.karantina_nedeni}
                      </span>
                      {k.cozuldu ? (
                        <span className="text-xs px-2 py-0.5 rounded bg-green-950/40 text-green-400 border border-green-800">
                          ✓ Çözüldü
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded bg-amber-950/40 text-amber-400 border border-amber-800">
                          ⏳ Çözülmedi
                        </span>
                      )}
                      <span className="text-xs text-neutral-600">
                        {k.batch_dosya ?? `Batch #${k.batch_id}`} ·{' '}
                        {new Date(k.created_at).toLocaleString('tr-TR')}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {k.cozuldu ? (
                        <form
                          action={async () => {
                            'use server';
                            await cozulduGeriAl(k.id);
                          }}
                        >
                          <button
                            type="submit"
                            className="text-xs px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 transition-colors"
                          >
                            ↩ Geri Al
                          </button>
                        </form>
                      ) : (
                        <form
                          action={async () => {
                            'use server';
                            await cozulduIsaretle(k.id);
                          }}
                        >
                          <button
                            type="submit"
                            className="text-xs px-2 py-1 rounded bg-green-800 hover:bg-green-700 transition-colors"
                          >
                            ✓ Çözüldü işaretle
                          </button>
                        </form>
                      )}
                      <form
                        action={async () => {
                          'use server';
                          await karantinaSil(k.id);
                        }}
                      >
                        <button
                          type="submit"
                          className="text-xs px-2 py-1 rounded bg-neutral-800 hover:bg-red-900 transition-colors"
                        >
                          🗑 Sil
                        </button>
                      </form>
                    </div>
                  </div>
                  {k.aciklama && (
                    <div className="text-xs text-neutral-500 mb-2">{k.aciklama}</div>
                  )}
                  <div className="text-xs font-mono bg-neutral-950 p-3 rounded border border-neutral-800 overflow-x-auto">
                    {typeof veri === 'string' ? veri : JSON.stringify(veri, null, 2)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}