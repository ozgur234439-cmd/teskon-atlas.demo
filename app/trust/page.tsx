import Link from 'next/link';
import { query } from '@/lib/db';
import { hesaplaRozet, ROZET_STIL } from '@/lib/trust';

export const dynamic = 'force-dynamic';

type TrustSatir = {
  entity_id: number;
  son_trust: number | null;
  teyit_sayisi: string;
  atama_durumu: string;
  atama_tipi: string;
  makam_ad: string;
  makam_sinifi: string;
  kisi_id: number | null;
  kisi_ad: string | null;
  kurum_id: number;
  kurum_ad: string;
  il_ad: string | null;
};

async function getTrustVerileri(): Promise<TrustSatir[]> {
  return query<TrustSatir>(`
    SELECT a.id AS entity_id,
           (SELECT sonuc FROM trust_hesaplama th
             WHERE th.entity_turu = 'ATAMA' AND th.entity_id = a.id
             ORDER BY hesaplama_tarihi DESC LIMIT 1) AS son_trust,
           (SELECT COUNT(*)::text FROM teyit_olayi t
             WHERE t.atama_id = a.id AND t.teyit_sonucu = 'DOGRULANDI') AS teyit_sayisi,
           a.atama_durumu::text AS atama_durumu, a.atama_tipi::text AS atama_tipi,
           km.ad AS makam_ad, km.makam_sinifi::text AS makam_sinifi,
           k.id AS kisi_id, k.ad_soyad AS kisi_ad,
           kr.id AS kurum_id, kr.ad AS kurum_ad, il.ad AS il_ad
    FROM atama a
    JOIN kurum_birim_makam kbm ON kbm.id = a.kurum_birim_makam_id
    JOIN kanonik_makam km ON km.id = kbm.kanonik_makam_id
    JOIN kurum kr ON kr.id = kbm.kurum_id
    JOIN kisi k ON k.id = a.kisi_id
    LEFT JOIN il ON il.id = kr.il_id
    WHERE a.aktif AND a.atama_durumu = 'AKTIF' AND a.atama_tipi = 'ASIL'
    ORDER BY km.makam_sinifi, k.ad_soyad
  `);
}

export default async function TrustPage() {
  const veriler = await getTrustVerileri();

  const sayilar: Record<string, number> = { YESIL: 0, ACIK_YESIL: 0, SARI: 0, TURUNCU: 0, KIRMIZI: 0, GRI: 0 };
  veriler.forEach(v => {
    const r = hesaplaRozet(v.son_trust, Number(v.teyit_sayisi));
    sayilar[r] = (sayilar[r] ?? 0) + 1;
  });

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 p-10">
      <div className="max-w-5xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold mb-1">Trust Göstergesi</h1>
          <p className="text-neutral-400 text-sm">
            {veriler.length} aktif asil atama · Belge madde 38-47
          </p>
        </header>

        <section className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-8">
          {(Object.entries(sayilar) as [string, number][]).map(([rozet, sayi]) => {
            const rz = ROZET_STIL[rozet as keyof typeof ROZET_STIL];
            return (
              <div key={rozet} className="p-4 rounded-lg border border-neutral-800 bg-neutral-900 text-center">
                <div className={`text-xs font-semibold mb-2 px-2 py-1 rounded ${rz.bg} inline-block`}>{rz.label}</div>
                <div className="text-2xl font-bold">{sayi}</div>
              </div>
            );
          })}
        </section>

        <section>
          <h2 className="text-xs uppercase text-neutral-500 font-semibold mb-3">Atama Detayı</h2>
          {veriler.length === 0 ? (
            <div className="p-10 rounded-lg border border-dashed border-neutral-800 bg-neutral-900/50 text-center text-sm text-neutral-500">
              Henüz kişi/atama yok
            </div>
          ) : (
            <div className="space-y-2">
              {veriler.map((v) => {
                const teyitSayisi = Number(v.teyit_sayisi);
                const rozet = hesaplaRozet(v.son_trust, teyitSayisi);
                const rz = ROZET_STIL[rozet];
                return (
                  <Link key={v.entity_id} href={`/kisiler/${v.kisi_id}`} className="flex items-center justify-between p-4 rounded-lg border border-neutral-800 bg-neutral-900 hover:border-neutral-700 transition-colors">
                    <div className="flex items-center gap-3 flex-wrap min-w-0">
                      <span className={`text-xs px-2 py-0.5 rounded font-semibold ${rz.bg}`} title={`Trust ${v.son_trust ?? '—'} · ${teyitSayisi} teyit`}>
                        {rz.label}
                      </span>
                      <span className="font-medium truncate">{v.kisi_ad}</span>
                      <span className="text-xs text-neutral-500 truncate">{v.makam_ad} · {v.kurum_ad}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-neutral-500 whitespace-nowrap">
                      <span>Trust: {v.son_trust ?? '—'}</span>
                      <span>Teyit: {teyitSayisi}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}