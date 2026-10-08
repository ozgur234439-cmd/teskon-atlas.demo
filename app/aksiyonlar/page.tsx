import Link from 'next/link';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

type Aksiyon = {
  id: number;
  aksiyon_turu: string;
  baslik: string;
  aciklama: string | null;
  oncelik: number;
  planlanan_tarih: string | null;
  durum: string;
  atanan_ad: string | null;
  kisi_id: number | null;
  kisi_ad: string | null;
  kurum_id: number | null;
  kurum_ad: string | null;
};

async function getAksiyonlar(): Promise<Aksiyon[]> {
  return query<Aksiyon>(`
    SELECT a.id, a.aksiyon_turu::text AS aksiyon_turu, a.baslik, a.aciklama, a.oncelik,
           a.planlanan_tarih::text AS planlanan_tarih, a.durum::text AS durum,
           ku.ad_soyad AS atanan_ad,
           k.id AS kisi_id, k.ad_soyad AS kisi_ad,
           kr.id AS kurum_id, kr.ad AS kurum_ad
    FROM aksiyon a
    LEFT JOIN kullanici ku ON ku.id = a.atanan_user_id
    LEFT JOIN kisi k ON k.id = a.kisi_id
    LEFT JOIN kurum kr ON kr.id = a.kurum_id
    WHERE a.aktif = TRUE
    ORDER BY
      CASE a.durum WHEN 'BEKLIYOR' THEN 1 WHEN 'INCELEMEDE' THEN 2 WHEN 'ERTELENDI' THEN 3 ELSE 9 END,
      a.oncelik ASC,
      a.planlanan_tarih ASC NULLS LAST,
      a.id DESC
  `);
}

const TUR_ETIKET: Record<string, string> = {
  ARA: 'Ara', TEKRAR_ARA: 'Tekrar Ara', ZIYARET: 'Ziyaret', EPOSTA: 'E-posta',
  WHATSAPP: 'WhatsApp', DOKUMAN: 'Doküman', IHALE_TAKIP: 'İhale Takip',
  TEYIT: 'Teyit', TOPLANTI: 'Toplantı', RANDEVU: 'Randevu', DIGER: 'Diğer',
};

const DURUM_RENK: Record<string, string> = {
  BEKLIYOR: 'bg-blue-950/40 text-blue-300 border-blue-800',
  INCELEMEDE: 'bg-amber-950/40 text-amber-300 border-amber-800',
  TAMAMLANDI: 'bg-green-950/40 text-green-400 border-green-800',
  ERTELENDI: 'bg-neutral-800 text-neutral-400 border-neutral-700',
  IPTAL: 'bg-red-950/40 text-red-400 border-red-800',
};

const ONCELIK_RENK: Record<number, string> = {
  1: 'text-red-400',
  2: 'text-orange-400',
  3: 'text-yellow-400',
  4: 'text-blue-400',
  5: 'text-neutral-500',
};

export default async function AksiyonlarPage() {
  const aksiyonlar = await getAksiyonlar();
  const bekleyen = aksiyonlar.filter(a => a.durum === 'BEKLIYOR' || a.durum === 'INCELEMEDE').length;

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 p-10">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8 flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-1">Aksiyonlar</h1>
            <p className="text-neutral-400 text-sm">
              {aksiyonlar.length} aksiyon · <span className="text-blue-400">{bekleyen} açık</span>
            </p>
          </div>
        </header>

        {aksiyonlar.length === 0 ? (
          <div className="p-10 rounded-lg border border-dashed border-neutral-800 bg-neutral-900/50 text-center">
            <div className="text-lg font-medium mb-2 text-neutral-300">Henüz aksiyon yok</div>
            <div className="text-sm text-neutral-500 max-w-md mx-auto">
              Kişi detay sayfasından <strong className="text-neutral-400">+ Aksiyon Ekle</strong> ile görev oluşturabilirsin.
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {aksiyonlar.map((a) => {
              const durumR = DURUM_RENK[a.durum] ?? DURUM_RENK.BEKLIYOR;
              const oncelikR = ONCELIK_RENK[a.oncelik] ?? 'text-neutral-500';
              const gecti = a.planlanan_tarih && new Date(a.planlanan_tarih) < new Date() && (a.durum === 'BEKLIYOR' || a.durum === 'INCELEMEDE');
              return (
                <div key={a.id} className="p-4 rounded-lg border border-neutral-800 bg-neutral-900 hover:border-neutral-700 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded border ${durumR}`}>{a.durum}</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-neutral-800 text-neutral-400">
                          {TUR_ETIKET[a.aksiyon_turu] ?? a.aksiyon_turu}
                        </span>
                        <span className={`text-xs font-semibold ${oncelikR}`}>P{a.oncelik}</span>
                        {a.planlanan_tarih && (
                          <span className={`text-xs ${gecti ? 'text-red-400 font-semibold' : 'text-neutral-500'}`}>
                            {gecti && '⚠ '}{new Date(a.planlanan_tarih).toLocaleDateString('tr-TR')}
                          </span>
                        )}
                      </div>
                      <div className="font-medium mb-1">{a.baslik}</div>
                      {a.aciklama && <div className="text-sm text-neutral-400 mb-2 whitespace-pre-wrap">{a.aciklama}</div>}
                      <div className="flex gap-4 text-xs text-neutral-500 flex-wrap">
                        {a.kisi_id && a.kisi_ad && (
                          <Link href={`/kisiler/${a.kisi_id}`} className="text-blue-400 hover:text-blue-300">
                            {a.kisi_ad}
                          </Link>
                        )}
                        {a.kurum_id && a.kurum_ad && (
                          <Link href={`/kurumlar/${a.kurum_id}`} className="text-blue-400 hover:text-blue-300">
                            {a.kurum_ad}
                          </Link>
                        )}
                        {a.atanan_ad && <span>→ {a.atanan_ad}</span>}
                      </div>
                    </div>
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