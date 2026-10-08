import Link from 'next/link';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

type Filtre = {
  il: string;
  kategori: string;
  sinif: string;
};

type KurumSonuc = {
  id: number;
  ad: string;
  ana_kategori: string;
  kurum_turu: string;
  il_ad: string | null;
  bekleyen: string;
};

type KisiSonuc = {
  kisi_id: number;
  ad_soyad: string;
  makam_ad: string;
  makam_sinifi: string;
  kurum_id: number;
  kurum_ad: string;
  birim_ad: string;
  il_ad: string | null;
  atama_durumu: string;
  son_trust: number | null;
  teyit_sayisi: string;
  son_teyit: string | null;
};

type BirimSonuc = {
  birim_id: number;
  birim_ad: string;
  kurum_id: number;
  kurum_ad: string;
  il_ad: string | null;
};

// Filtre seçenekleri (dropdown'lar için)
async function getFiltreSecenekleri() {
  const iller = await query<{ ad: string; sayi: string }>(`
    SELECT il.ad, COUNT(DISTINCT ku.id)::text AS sayi
    FROM il
    LEFT JOIN kurum ku ON ku.il_id = il.id AND ku.aktif
    WHERE il.aktif
    GROUP BY il.ad
    ORDER BY il.ad
  `);

  const kategoriler = await query<{ ad: string; sayi: string }>(`
    SELECT ak.ad, COUNT(DISTINCT ku.id)::text AS sayi
    FROM ana_kategori ak
    LEFT JOIN kurum ku ON ku.ana_kategori_id = ak.id AND ku.aktif
    WHERE ak.aktif
    GROUP BY ak.ad
    ORDER BY ak.ad
  `);

  return { iller, kategoriler };
}

async function araKurumlar(q: string, f: Filtre): Promise<KurumSonuc[]> {
  const params: any[] = [];
  let sql = `
    SELECT ku.id, ku.ad, ak.ad AS ana_kategori, kt.ad AS kurum_turu, il.ad AS il_ad,
      (SELECT COUNT(*)::text FROM kurum_birim_makam kbm
       WHERE kbm.kurum_id = ku.id AND kbm.aktif AND kbm.arastirma_durumu = 'ARASTIRILMADI') AS bekleyen
    FROM kurum ku
    JOIN ana_kategori ak ON ak.id = ku.ana_kategori_id
    JOIN kurum_turu kt ON kt.id = ku.kurum_turu_id
    LEFT JOIN il ON il.id = ku.il_id
    WHERE ku.aktif
  `;

  if (q) {
    params.push(q);
    sql += ` AND (
      normalize_tr(ku.ad) LIKE '%' || normalize_tr($${params.length}) || '%'
      OR normalize_tr(ak.ad) LIKE '%' || normalize_tr($${params.length}) || '%'
      OR normalize_tr(kt.ad) LIKE '%' || normalize_tr($${params.length}) || '%'
    )`;
  }
  if (f.il) {
    params.push(f.il);
    sql += ` AND il.ad = $${params.length}`;
  }
  if (f.kategori) {
    params.push(f.kategori);
    sql += ` AND ak.ad = $${params.length}`;
  }
  sql += ` ORDER BY ku.ad LIMIT 30`;
  return query<KurumSonuc>(sql, params);
}

async function araKisiler(q: string, f: Filtre): Promise<KisiSonuc[]> {
  const params: any[] = [];
  let sql = `
    SELECT k.id AS kisi_id, k.ad_soyad, km.ad AS makam_ad, km.makam_sinifi::text AS makam_sinifi,
      ku.id AS kurum_id, ku.ad AS kurum_ad, b.ad AS birim_ad, il.ad AS il_ad,
      a.atama_durumu::text AS atama_durumu,
      (SELECT sonuc FROM trust_hesaplama th
        WHERE th.entity_turu = 'ATAMA' AND th.entity_id = a.id
        ORDER BY hesaplama_tarihi DESC LIMIT 1) AS son_trust,
      (SELECT COUNT(*)::text FROM teyit_olayi t
        WHERE t.atama_id = a.id AND t.teyit_sonucu = 'DOGRULANDI') AS teyit_sayisi,
      (SELECT MAX(t.teyit_tarihi)::text FROM teyit_olayi t
        WHERE t.atama_id = a.id AND t.teyit_sonucu = 'DOGRULANDI') AS son_teyit
    FROM atama a
    JOIN kisi k ON k.id = a.kisi_id
    JOIN kurum_birim_makam kbm ON kbm.id = a.kurum_birim_makam_id
    JOIN kanonik_makam km ON km.id = kbm.kanonik_makam_id
    JOIN kurum ku ON ku.id = kbm.kurum_id
    JOIN birim b ON b.id = kbm.birim_id
    LEFT JOIN il ON il.id = ku.il_id
    WHERE a.aktif AND a.atama_durumu = 'AKTIF' AND a.atama_tipi = 'ASIL'
  `;

  if (q) {
    params.push(q);
    sql += ` AND (
      normalize_tr(k.ad_soyad) LIKE '%' || normalize_tr($${params.length}) || '%'
      OR normalize_tr(km.ad) LIKE '%' || normalize_tr($${params.length}) || '%'
      OR normalize_tr(b.ad) LIKE '%' || normalize_tr($${params.length}) || '%'
    )`;
  }
  if (f.il) {
    params.push(f.il);
    sql += ` AND il.ad = $${params.length}`;
  }
  if (f.sinif) {
    params.push(f.sinif);
    sql += ` AND km.makam_sinifi::text = $${params.length}`;
  }
  sql += ` ORDER BY km.makam_sinifi, k.ad_soyad LIMIT 50`;
  return query<KisiSonuc>(sql, params);
}

async function araBirimler(q: string, f: Filtre): Promise<BirimSonuc[]> {
  const params: any[] = [];
  let sql = `
    SELECT b.id AS birim_id, b.ad AS birim_ad,
      ku.id AS kurum_id, ku.ad AS kurum_ad, il.ad AS il_ad
    FROM birim b
    JOIN kurum ku ON ku.id = b.kurum_id
    LEFT JOIN il ON il.id = ku.il_id
    WHERE b.aktif
  `;
  if (q) {
    params.push(q);
    sql += ` AND normalize_tr(b.ad) LIKE '%' || normalize_tr($${params.length}) || '%'`;
  }
  if (f.il) {
    params.push(f.il);
    sql += ` AND il.ad = $${params.length}`;
  }
  sql += ` ORDER BY b.ad LIMIT 30`;
  return query<BirimSonuc>(sql, params);
}

const SINIF_RENK: Record<string, string> = {
  A: 'bg-red-950/50 text-red-300 border-red-800',
  B: 'bg-orange-950/50 text-orange-300 border-orange-800',
  C: 'bg-yellow-950/50 text-yellow-300 border-yellow-800',
  D: 'bg-neutral-800 text-neutral-300 border-neutral-700',
};

const DURUM_RENK: Record<string, string> = {
  AKTIF: 'bg-green-950/40 text-green-400 border-green-800',
  BELIRSIZ: 'bg-amber-950/40 text-amber-400 border-amber-800',
  AYRILDI: 'bg-neutral-800 text-neutral-500 border-neutral-700',
};

export default async function AramaPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; il?: string; kategori?: string; sinif?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? '').trim();
  const filtre: Filtre = {
    il: (sp.il ?? '').trim(),
    kategori: (sp.kategori ?? '').trim(),
    sinif: (sp.sinif ?? '').trim(),
  };

  const aktif = q.length >= 2 || filtre.il || filtre.kategori || filtre.sinif;

  const [filtreler, kurumlar, kisiler, birimler] = aktif
    ? await Promise.all([
        getFiltreSecenekleri(),
        araKurumlar(q, filtre),
        araKisiler(q, filtre),
        araBirimler(q, filtre),
      ])
    : [await getFiltreSecenekleri(), [], [], []];

  const toplam = kurumlar.length + kisiler.length + birimler.length;

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 p-6">
      <div className="max-w-6xl mx-auto">
        <header className="mb-6">
          <h1 className="text-3xl font-bold mb-1">Arama</h1>
          <p className="text-neutral-400 text-sm">
            Kişi · Kurum · Birim · Makam · Faceted search (madde 53-56)
          </p>
        </header>

        {/* Arama Formu */}
        <form method="GET" action="/arama" className="mb-6 space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Örn: imar müdürü, DSİ, bölge müdürü..."
              autoFocus
              className="flex-1 px-4 py-3 rounded-lg bg-neutral-900 border border-neutral-800 focus:border-blue-600 focus:outline-none"
            />
            <button type="submit" className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium">
              Ara
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <select name="il" defaultValue={filtre.il} className="px-3 py-2 rounded-md bg-neutral-900 border border-neutral-800 text-sm focus:border-blue-600 focus:outline-none">
              <option value="">Tüm İller</option>
              {filtreler.iller.map((i) => (
                <option key={i.ad} value={i.ad}>{i.ad} ({i.sayi})</option>
              ))}
            </select>

            <select name="kategori" defaultValue={filtre.kategori} className="px-3 py-2 rounded-md bg-neutral-900 border border-neutral-800 text-sm focus:border-blue-600 focus:outline-none">
              <option value="">Tüm Kategoriler</option>
              {filtreler.kategoriler.map((k) => (
                <option key={k.ad} value={k.ad}>{k.ad} ({k.sayi})</option>
              ))}
            </select>

            <select name="sinif" defaultValue={filtre.sinif} className="px-3 py-2 rounded-md bg-neutral-900 border border-neutral-800 text-sm focus:border-blue-600 focus:outline-none">
              <option value="">Tüm Makam Sınıfları</option>
              <option value="A">A — Stratejik</option>
              <option value="B">B — Üst Yönetim</option>
              <option value="C">C — Operasyonel</option>
              <option value="D">D — Destek</option>
            </select>
          </div>
        </form>

        {!aktif && (
          <div className="text-neutral-500 text-sm">
            Arama yapmak için en az 2 karakter yazın veya filtre seçin.
          </div>
        )}

        {aktif && toplam === 0 && (
          <div className="text-neutral-500 text-sm">
            Sonuç bulunamadı.
          </div>
        )}

        {aktif && toplam > 0 && (
          <div className="mb-4 text-sm text-neutral-400">
            <strong className="text-neutral-200">{toplam}</strong> sonuç
            {kisiler.length > 0 && <> · {kisiler.length} kişi</>}
            {kurumlar.length > 0 && <> · {kurumlar.length} kurum</>}
            {birimler.length > 0 && <> · {birimler.length} birim</>}
          </div>
        )}

        {/* KİŞİLER — En kritik, en üstte */}
        {kisiler.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xs uppercase text-neutral-500 font-semibold mb-3">
              Kişiler ({kisiler.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {kisiler.map((k) => {
                const sR = SINIF_RENK[k.makam_sinifi] ?? SINIF_RENK.D;
                const dR = DURUM_RENK[k.atama_durumu] ?? DURUM_RENK.AKTIF;
                const teyitSayisi = Number(k.teyit_sayisi);
                const rozet =
                  teyitSayisi > 0 && k.son_trust !== null && k.son_trust >= 55 ? 'YESIL' :
                  k.son_trust !== null && k.son_trust >= 45 ? 'ACIK YESIL' :
                  k.son_trust !== null && k.son_trust >= 30 ? 'SARI' :
                  k.son_trust !== null && k.son_trust >= 15 ? 'TURUNCU' :
                  k.son_trust !== null ? 'KIRMIZI' : 'GRI';
                const rozetRenk =
                  rozet === 'YESIL' ? 'bg-green-500 text-white' :
                  rozet === 'ACIK YESIL' ? 'bg-green-400 text-black' :
                  rozet === 'SARI' ? 'bg-yellow-500 text-black' :
                  rozet === 'TURUNCU' ? 'bg-orange-500 text-white' :
                  rozet === 'KIRMIZI' ? 'bg-red-600 text-white' :
                  'bg-neutral-700 text-neutral-300';
                return (
                  <Link
                    key={k.kisi_id}
                    href={`/kisiler/${k.kisi_id}`}
                    className="block p-4 rounded-lg border border-neutral-800 bg-neutral-900 hover:border-neutral-600 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded border ${sR}`}>{k.makam_sinifi}</span>
                        <span className="font-medium">{k.ad_soyad}</span>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded font-semibold ${rozetRenk}`}>
                        {rozet}{k.son_trust !== null && <> · {k.son_trust}</>}
                      </span>
                    </div>
                    <div className="text-xs text-neutral-400 mb-1">
                      {k.makam_ad} · {k.kurum_ad}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-neutral-600">
                      <span>{k.birim_ad}</span>
                      {k.il_ad && <><span>·</span><span>{k.il_ad}</span></>}
                      {teyitSayisi > 0 && <><span>·</span><span className="text-green-500">{teyitSayisi} teyit</span></>}
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* KURUMLAR */}
        {kurumlar.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xs uppercase text-neutral-500 font-semibold mb-3">
              Kurumlar ({kurumlar.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {kurumlar.map((k) => (
                <Link
                  key={k.id}
                  href={`/kurumlar/${k.id}`}
                  className="block p-4 rounded-lg border border-neutral-800 bg-neutral-900 hover:border-neutral-600 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="font-medium">{k.ad}</span>
                    {Number(k.bekleyen) > 0 && (
                      <span className="text-xs px-2 py-0.5 rounded bg-amber-950/50 text-amber-400 border border-amber-800 whitespace-nowrap">
                        {k.bekleyen} bekliyor
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-neutral-500">
                    {k.ana_kategori} · {k.kurum_turu}
                    {k.il_ad && <> · {k.il_ad}</>}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* BİRİMLER */}
        {birimler.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xs uppercase text-neutral-500 font-semibold mb-3">
              Birimler ({birimler.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {birimler.map((b) => (
                <Link
                  key={b.birim_id}
                  href={`/kurumlar/${b.kurum_id}`}
                  className="block p-4 rounded-lg border border-neutral-800 bg-neutral-900 hover:border-neutral-600 transition-colors"
                >
                  <div className="font-medium mb-1 text-sm">{b.birim_ad}</div>
                  <div className="text-xs text-neutral-500">
                    {b.kurum_ad}
                    {b.il_ad && <> · {b.il_ad}</>}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}