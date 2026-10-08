import Link from 'next/link';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

type NotSatir = {
  id: number; icerik: string; created_at: string; yazan_ad: string;
  kisi_id: number | null; kisi_ad: string | null;
  kurum_id: number | null; kurum_ad: string | null;
};

async function getNotlar(): Promise<NotSatir[]> {
  return query<NotSatir>(`
    SELECT n.id, n.icerik, n.created_at::text AS created_at, ku.ad_soyad AS yazan_ad,
           k.id AS kisi_id, k.ad_soyad AS kisi_ad,
           kr.id AS kurum_id, kr.ad AS kurum_ad
    FROM not_kaydi n
    JOIN kullanici ku ON ku.id = n.yazan_user_id
    LEFT JOIN kisi k ON k.id = n.kisi_id
    LEFT JOIN kurum kr ON kr.id = n.kurum_id
    WHERE n.aktif = TRUE
    ORDER BY n.created_at DESC
    LIMIT 200
  `);
}

export default async function NotlarPage() {
  const notlar = await getNotlar();
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 p-10">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold mb-1">Notlar</h1>
          <p className="text-neutral-400 text-sm">{notlar.length} not · en yeni üstte</p>
        </header>

        {notlar.length === 0 ? (
          <div className="p-10 rounded-lg border border-dashed border-neutral-800 bg-neutral-900/50 text-center">
            <div className="text-lg font-medium mb-2 text-neutral-300">Henüz not yok</div>
            <div className="text-sm text-neutral-500">
              Kişi detay sayfasından <strong className="text-neutral-400">+ Not Ekle</strong> ile başla.
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {notlar.map((n) => (
              <div key={n.id} className="p-4 rounded-lg border border-neutral-800 bg-neutral-900">
                <div className="text-sm text-neutral-300 mb-2 whitespace-pre-wrap">{n.icerik}</div>
                <div className="flex gap-3 text-xs text-neutral-600 flex-wrap">
                  <span>{n.yazan_ad}</span>
                  <span>·</span>
                  <span>{new Date(n.created_at).toLocaleString('tr-TR')}</span>
                  {n.kisi_id && n.kisi_ad && (<><span>·</span><Link href={`/kisiler/${n.kisi_id}`} className="text-blue-400 hover:text-blue-300">{n.kisi_ad}</Link></>)}
                  {n.kurum_id && n.kurum_ad && (<><span>·</span><Link href={`/kurumlar/${n.kurum_id}`} className="text-blue-400 hover:text-blue-300">{n.kurum_ad}</Link></>)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}