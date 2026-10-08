import Link from 'next/link';
import { query } from '@/lib/db';
import { aktifKullaniciId } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

type FavoriSatir = {
  id: number;
  favori_turu: string;
  entity_id: number;
  created_at: string;
  baslik: string | null;
  alt_bilgi: string | null;
  link: string | null;
};

async function getFavoriler(userId: number): Promise<FavoriSatir[]> {
  return query<FavoriSatir>(`
    SELECT f.id, f.favori_turu::text AS favori_turu, f.entity_id::int AS entity_id,
           f.created_at::text AS created_at,
           CASE f.favori_turu::text
             WHEN 'KISI' THEN (SELECT ad_soyad FROM kisi WHERE id = f.entity_id)
             WHEN 'KURUM' THEN (SELECT ad FROM kurum WHERE id = f.entity_id)
             WHEN 'ARAMA' THEN 'Kayıtlı Arama'
             WHEN 'ROL_PAKETI' THEN (SELECT ad FROM rol_paketi WHERE id = f.entity_id)
             ELSE NULL
           END AS baslik,
           CASE f.favori_turu::text
             WHEN 'KISI' THEN (SELECT k.kvkk_hassasiyet::text FROM kisi k WHERE k.id = f.entity_id)
             WHEN 'KURUM' THEN (SELECT kt.ad FROM kurum ku JOIN kurum_turu kt ON kt.id = ku.kurum_turu_id WHERE ku.id = f.entity_id)
             ELSE NULL
           END AS alt_bilgi,
           CASE f.favori_turu::text
             WHEN 'KISI' THEN '/kisiler/' || f.entity_id
             WHEN 'KURUM' THEN '/kurumlar/' || f.entity_id
             WHEN 'ROL_PAKETI' THEN '/rol-paketleri'
             ELSE NULL
           END AS link
    FROM favori f
    WHERE f.user_id = $1
    ORDER BY f.created_at DESC
    LIMIT 200
  `, [userId]);
}

const TUR_ETIKET: Record<string, { label: string; renk: string }> = {
  KISI: { label: 'Kişi', renk: 'bg-blue-950/40 text-blue-300 border-blue-800' },
  KURUM: { label: 'Kurum', renk: 'bg-purple-950/40 text-purple-300 border-purple-800' },
  ARAMA: { label: 'Arama', renk: 'bg-cyan-950/40 text-cyan-300 border-cyan-800' },
  ROL_PAKETI: { label: 'Rol Paketi', renk: 'bg-amber-950/40 text-amber-300 border-amber-800' },
};

async function favoriSil(formData: FormData) {
  'use server';
  const userId = await aktifKullaniciId();
  if (!userId) return;
  const id = Number(formData.get('id'));
  if (!id) return;
  await query(`DELETE FROM favori WHERE id = $1 AND user_id = $2`, [id, userId]);
  revalidatePath('/favoriler');
}

export default async function FavorilerPage() {
  const userId = await aktifKullaniciId();
  if (!userId) {
    return (
      <main className="min-h-screen bg-neutral-950 text-neutral-100 p-10">
        <div className="max-w-4xl mx-auto text-center text-neutral-500">
          Giriş yapmanız gerekiyor.
        </div>
      </main>
    );
  }

  const favoriler = await getFavoriler(userId);

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 p-6 md:p-10">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold mb-1">Favoriler</h1>
          <p className="text-neutral-400 text-sm">
            {favoriler.length} kayıt · Kişi, kurum, arama ve rol paketleri (madde 50)
          </p>
        </header>

        {favoriler.length === 0 ? (
          <div className="p-10 rounded-lg border border-dashed border-neutral-800 bg-neutral-900/50 text-center text-sm text-neutral-500">
            Henüz favori yok. Kişi/kurum sayfalarındaki ⭐ butonuna basarak ekleyin.
          </div>
        ) : (
          <div className="space-y-2">
            {favoriler.map((f) => {
              const t = TUR_ETIKET[f.favori_turu] ?? TUR_ETIKET.KISI;
              return (
                <div
                  key={f.id}
                  className="p-4 rounded-lg border border-neutral-800 bg-neutral-900 flex items-center justify-between gap-4 hover:border-neutral-700 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className={`text-xs px-2 py-0.5 rounded border whitespace-nowrap ${t.renk}`}>
                      {t.label}
                    </span>
                    <div className="min-w-0">
                      {f.link ? (
                        <Link
                          href={f.link}
                          className="font-medium hover:text-blue-300 transition-colors"
                        >
                          {f.baslik ?? `#${f.entity_id}`}
                        </Link>
                      ) : (
                        <span className="font-medium">{f.baslik ?? `#${f.entity_id}`}</span>
                      )}
                      {f.alt_bilgi && (
                        <div className="text-xs text-neutral-500 mt-0.5">{f.alt_bilgi}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-neutral-500 shrink-0">
                    <span>{new Date(f.created_at).toLocaleDateString('tr-TR')}</span>
                    <form action={favoriSil}>
                      <input type="hidden" name="id" value={f.id} />
                      <button
                        type="submit"
                        className="text-xs px-2 py-1 rounded bg-neutral-800 hover:bg-red-900 transition-colors"
                      >
                        🗑
                      </button>
                    </form>
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