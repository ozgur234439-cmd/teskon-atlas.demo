import Link from 'next/link';
import { query } from '@/lib/db';
import { hesaplaRozet, ROZET_STIL } from '@/lib/trust';

export const dynamic = 'force-dynamic';

type Tab = 'karantina' | 'duplicate' | 'teyit-bekleyen' | 'yeniden-teyit' | 'kvkk';

type Karantina = {
  id: number;
  karantina_nedeni: string;
  aciklama: string | null;
  ham_veri: any;
  created_at: string;
};

type TeyitBekleyen = {
  atama_id: number;
  kisi_id: number;
  kisi_ad: string;
  makam_ad: string;
  makam_sinifi: string;
  kurum_ad: string;
  birim_ad: string;
  il_ad: string | null;
  atama_tipi: string;
  kaynak_sayisi: number;
  gun_once: number;
};

async function getKarantina(neden?: string): Promise<Karantina[]> {
  const params: any[] = [];
  let where = `WHERE k.cozuldu = FALSE`;
  if (neden) {
    params.push(neden);
    where += ` AND k.karantina_nedeni = $${params.length}`;
  }
  return query<Karantina>(`
    SELECT k.id, k.karantina_nedeni::text AS karantina_nedeni,
           k.aciklama, k.ham_veri, k.created_at::text AS created_at
    FROM import_karantina k
    ${where}
    ORDER BY k.created_at DESC
    LIMIT 100
  `, params);
}

async function getTeyitBekleyen(): Promise<TeyitBekleyen[]> {
  return query<TeyitBekleyen>(`
    SELECT a.id AS atama_id, k.id AS kisi_id, k.ad_soyad AS kisi_ad,
           km.ad AS makam_ad, km.makam_sinifi::text AS makam_sinifi,
           ku.ad AS kurum_ad, b.ad AS birim_ad, il.ad AS il_ad,
           a.atama_tipi::text AS atama_tipi,
           COALESCE((SELECT COUNT(*) FROM teyit_olayi t WHERE t.atama_id = a.id), 0)::int AS kaynak_sayisi,
           0 AS gun_once
    FROM atama a
    JOIN kisi k ON k.id = a.kisi_id
    JOIN kurum_birim_makam kbm ON kbm.id = a.kurum_birim_makam_id
    JOIN kanonik_makam km ON km.id = kbm.kanonik_makam_id
    JOIN kurum ku ON ku.id = kbm.kurum_id
    JOIN birim b ON b.id = kbm.birim_id
    LEFT JOIN il ON il.id = ku.il_id
    WHERE a.aktif = TRUE
      AND a.atama_durumu = 'AKTIF'
      AND a.atama_tipi = 'ASIL'
      AND NOT EXISTS (SELECT 1 FROM teyit_olayi t WHERE t.atama_id = a.id)
    ORDER BY
      CASE km.makam_sinifi WHEN 'A' THEN 1 WHEN 'B' THEN 2 WHEN 'C' THEN 3 ELSE 4 END,
      ku.ad, km.ad
  `);
}

async function getYenidenTeyit(): Promise<TeyitBekleyen[]> {
  return query<TeyitBekleyen>(`
    WITH son_teyit AS (
      SELECT t.atama_id, MAX(t.teyit_tarihi) AS tarih
      FROM teyit_olayi t
      GROUP BY t.atama_id
    )
    SELECT a.id AS atama_id, k.id AS kisi_id, k.ad_soyad AS kisi_ad,
           km.ad AS makam_ad, km.makam_sinifi::text AS makam_sinifi,
           ku.ad AS kurum_ad, b.ad AS birim_ad, il.ad AS il_ad,
           a.atama_tipi::text AS atama_tipi,
           (SELECT COUNT(*) FROM teyit_olayi t WHERE t.atama_id = a.id)::int AS kaynak_sayisi,
           EXTRACT(DAY FROM (NOW() - st.tarih))::int AS gun_once
    FROM atama a
    JOIN kisi k ON k.id = a.kisi_id
    JOIN kurum_birim_makam kbm ON kbm.id = a.kurum_birim_makam_id
    JOIN kanonik_makam km ON km.id = kbm.kanonik_makam_id
    JOIN kurum ku ON ku.id = kbm.kurum_id
    JOIN birim b ON b.id = kbm.birim_id
    LEFT JOIN il ON il.id = ku.il_id
    JOIN son_teyit st ON st.atama_id = a.id
    WHERE a.aktif = TRUE
      AND a.atama_durumu = 'AKTIF'
      AND a.atama_tipi = 'ASIL'
      AND st.tarih < NOW() - INTERVAL '90 days'
    ORDER BY st.tarih ASC
    LIMIT 100
  `);
}

async function getKvkkEksik(): Promise<TeyitBekleyen[]> {
  return query<TeyitBekleyen>(`
    SELECT a.id AS atama_id, k.id AS kisi_id, k.ad_soyad AS kisi_ad,
           km.ad AS makam_ad, km.makam_sinifi::text AS makam_sinifi,
           ku.ad AS kurum_ad, b.ad AS birim_ad, il.ad AS il_ad,
           a.atama_tipi::text AS atama_tipi,
           (SELECT COUNT(*) FROM iletisim i WHERE i.kisi_id = k.id AND i.aktif)::int AS kaynak_sayisi,
           0 AS gun_once
    FROM atama a
    JOIN kisi k ON k.id = a.kisi_id
    JOIN kurum_birim_makam kbm ON kbm.id = a.kurum_birim_makam_id
    JOIN kanonik_makam km ON km.id = kbm.kanonik_makam_id
    JOIN kurum ku ON ku.id = kbm.kurum_id
    JOIN birim b ON b.id = kbm.birim_id
    LEFT JOIN il ON il.id = ku.il_id
    WHERE a.aktif = TRUE
      AND a.atama_durumu = 'AKTIF'
      AND NOT EXISTS (
        SELECT 1 FROM iletisim i
        WHERE i.kisi_id = k.id AND i.aktif AND i.kvkk_hassasiyet IS NOT NULL
      )
    ORDER BY ku.ad, km.ad
    LIMIT 100
  `);
}

async function getKarantinaIstatistik() {
  const [r] = await query<{
    toplam: number;
    cozulmemis: number;
    duplicate: number;
  }>(`
    SELECT
      COUNT(*)::int AS toplam,
      COUNT(*) FILTER (WHERE NOT cozuldu)::int AS cozulmemis,
      COUNT(*) FILTER (WHERE NOT cozuldu AND karantina_nedeni = 'DUPLICATE_SUPHESI')::int AS duplicate
    FROM import_karantina
  `);
  return r;
}

const SINIF_RENK: Record<string, string> = {
  A: 'bg-red-950/50 text-red-300 border-red-800',
  B: 'bg-orange-950/50 text-orange-300 border-orange-800',
  C: 'bg-yellow-950/50 text-yellow-300 border-yellow-800',
  D: 'bg-neutral-800 text-neutral-300 border-neutral-700',
};

const NEDEN_RENK: Record<string, string> = {
  DUPLICATE_SUPHESI: 'bg-amber-950/40 text-amber-300 border-amber-800',
  KURUM_ESLESMEDI: 'bg-orange-950/40 text-orange-300 border-orange-800',
  MAKAM_ESLESMEDI: 'bg-orange-950/40 text-orange-300 border-orange-800',
  BIRIM_ESLESMEDI: 'bg-orange-950/40 text-orange-300 border-orange-800',
  FORMAT_HATASI: 'bg-neutral-800 text-neutral-400 border-neutral-700',
  KAYNAK_YOK: 'bg-red-950/40 text-red-300 border-red-800',
  TOPLAMA_TARIHI_YOK: 'bg-red-950/40 text-red-300 border-red-800',
  KVKK_ISARETI_EKSIK: 'bg-amber-950/40 text-amber-300 border-amber-800',
};

export default async function OperasyonPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const sp = await searchParams;
  const aktifTab: Tab = (sp.tab as Tab) || 'karantina';

  const [karantinaIstatistik] = await Promise.all([getKarantinaIstatistik()]);

  let icerik;

  if (aktifTab === 'karantina') {
    const liste = await getKarantina();
    icerik = (
      <div className="space-y-2">
        {liste.length === 0 ? (
          <div className="p-8 rounded-lg border border-dashed border-neutral-800 bg-neutral-900/50 text-center text-sm text-neutral-500">
            Karantinada çözülmemiş kayıt yok
          </div>
        ) : (
          liste.map((k) => {
            const r = NEDEN_RENK[k.karantina_nedeni] ?? NEDEN_RENK.FORMAT_HATASI;
            return (
              <div key={k.id} className="p-4 rounded-lg border border-neutral-800 bg-neutral-900">
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <span className={`text-xs px-2 py-0.5 rounded border ${r}`}>{k.karantina_nedeni}</span>
                  <span className="text-xs text-neutral-500">
                    {new Date(k.created_at).toLocaleString('tr-TR')}
                  </span>
                  <Link
                    href="/import/karantina"
                    className="ml-auto text-xs text-blue-400 hover:text-blue-300"
                  >
                    Detay →
                  </Link>
                </div>
                {k.aciklama && <div className="text-xs text-neutral-500 mb-2">{k.aciklama}</div>}
                <div className="text-xs font-mono bg-neutral-950 p-2 rounded border border-neutral-800 overflow-x-auto">
                  {typeof k.ham_veri === 'string' ? k.ham_veri : JSON.stringify(k.ham_veri)}
                </div>
              </div>
            );
          })
        )}
      </div>
    );
  } else if (aktifTab === 'duplicate') {
    const liste = await getKarantina('DUPLICATE_SUPHESI');
    icerik = (
      <div className="space-y-2">
        {liste.length === 0 ? (
          <div className="p-8 rounded-lg border border-dashed border-neutral-800 bg-neutral-900/50 text-center text-sm text-neutral-500">
            Duplicate şüphesi yok
          </div>
        ) : (
          liste.map((k) => (
            <div key={k.id} className="p-4 rounded-lg border border-amber-900/40 bg-neutral-900">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs px-2 py-0.5 rounded bg-amber-950/40 text-amber-300 border border-amber-800">
                  DUPLICATE_SUPHESI
                </span>
                <span className="text-xs text-neutral-500">
                  {new Date(k.created_at).toLocaleString('tr-TR')}
                </span>
              </div>
              {k.aciklama && <div className="text-xs text-neutral-400 mb-2">{k.aciklama}</div>}
              <div className="text-xs font-mono bg-neutral-950 p-2 rounded border border-neutral-800">
                {JSON.stringify(k.ham_veri)}
              </div>
            </div>
          ))
        )}
      </div>
    );
  } else if (aktifTab === 'teyit-bekleyen' || aktifTab === 'yeniden-teyit' || aktifTab === 'kvkk') {
    let liste: TeyitBekleyen[];
    let bosMesaj: string;

    if (aktifTab === 'teyit-bekleyen') {
      liste = await getTeyitBekleyen();
      bosMesaj = 'Teyit bekleyen aktif atama yok';
    } else if (aktifTab === 'yeniden-teyit') {
      liste = await getYenidenTeyit();
      bosMesaj = 'Yeniden teyit gerektiren atama yok';
    } else {
      liste = await getKvkkEksik();
      bosMesaj = 'KVKK işareti eksik kişi yok';
    }

    icerik = (
      <div className="space-y-2">
        {liste.length === 0 ? (
          <div className="p-8 rounded-lg border border-dashed border-neutral-800 bg-neutral-900/50 text-center text-sm text-neutral-500">
            {bosMesaj}
          </div>
        ) : (
          liste.map((t) => {
            const sR = SINIF_RENK[t.makam_sinifi] ?? SINIF_RENK.D;
            const rozet = hesaplaRozet(null, t.kaynak_sayisi);
            const rz = ROZET_STIL[rozet];
            return (
              <div key={t.atama_id} className="p-4 rounded-lg border border-neutral-800 bg-neutral-900 hover:border-neutral-700 transition-colors">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded border ${sR}`}>{t.makam_sinifi}</span>
                    <Link href={`/kisiler/${t.kisi_id}`} className="font-medium text-blue-300 hover:text-blue-200">
                      {t.kisi_ad}
                    </Link>
                    <span className="text-neutral-600">→</span>
                    <span className="text-neutral-100">{t.makam_ad}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${rz.bg}`}>{rz.label}</span>
                    {aktifTab === 'yeniden-teyit' && (
                      <span className="text-xs text-amber-400">{t.gun_once} gün önce teyit</span>
                    )}
                  </div>
                  <Link
                    href={`/teyit/${t.atama_id}`}
                    className="text-xs px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 font-medium whitespace-nowrap transition-colors"
                  >
                    {aktifTab === 'yeniden-teyit' ? 'Yeniden Teyit' : 'Teyit Et'}
                  </Link>
                </div>
                <div className="text-xs text-neutral-500">
                  {t.kurum_ad} · {t.birim_ad}
                  {t.il_ad && ` · ${t.il_ad}`}
                  {' · '}
                  <span>{t.atama_tipi}</span>
                  {' · '}
                  <span>{t.kaynak_sayisi} teyit</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    );
  }

  const tablar: Array<{ kod: Tab; ad: string; sayi?: number }> = [
    { kod: 'karantina', ad: 'Import Karantina', sayi: karantinaIstatistik.cozulmemis - karantinaIstatistik.duplicate },
    { kod: 'duplicate', ad: 'Duplicate Şüphesi', sayi: karantinaIstatistik.duplicate },
    { kod: 'teyit-bekleyen', ad: 'Teyit Bekleyen' },
    { kod: 'yeniden-teyit', ad: 'Yeniden Teyit' },
    { kod: 'kvkk', ad: 'KVKK Eksik' },
  ];

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 p-6 md:p-10">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-1">Operasyon Merkezi</h1>
            <p className="text-neutral-400 text-sm">
              Madde 59-61 · İnsan müdahalesi gereken tüm işler
            </p>
          </div>
          <div className="flex gap-2 text-xs">
            <div className="px-3 py-2 rounded-lg border border-neutral-800 bg-neutral-900 text-center">
              <div className="text-neutral-500 mb-0.5">Karantina</div>
              <div className="text-lg font-bold text-amber-400">{karantinaIstatistik.cozulmemis}</div>
            </div>
            <div className="px-3 py-2 rounded-lg border border-neutral-800 bg-neutral-900 text-center">
              <div className="text-neutral-500 mb-0.5">Toplam Kayıt</div>
              <div className="text-lg font-bold">{karantinaIstatistik.toplam}</div>
            </div>
          </div>
        </header>

        <nav className="mb-6 border-b border-neutral-800 flex gap-1 overflow-x-auto">
          {tablar.map((t) => {
            const aktif = aktifTab === t.kod;
            const href = t.kod === 'karantina' ? '/operasyon' : `/operasyon?tab=${t.kod}`;
            return (
              <Link
                key={t.kod}
                href={href}
                className={`px-4 py-2.5 text-sm whitespace-nowrap border-b-2 transition-colors ${
                  aktif
                    ? 'border-blue-500 text-blue-300'
                    : 'border-transparent text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {t.ad}
                {typeof t.sayi === 'number' && t.sayi > 0 && (
                  <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400">
                    {t.sayi}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {icerik}
      </div>
    </main>
  );
}