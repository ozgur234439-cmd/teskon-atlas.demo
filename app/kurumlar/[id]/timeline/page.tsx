import Link from 'next/link';
import { query } from '@/lib/db';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

type TimelineOlay = {
  tip: string;
  alt_tip: string | null;
  baslik: string;
  aciklama: string | null;
  zaman: string;
  kullanici: string | null;
  entity_id: number | null;
  entity_link: string | null;
};

async function getKurum(id: string) {
  const [k] = await query<{ id: number; ad: string }>(
    `SELECT id, ad FROM kurum WHERE id = $1 AND aktif = TRUE`,
    [id]
  );
  return k ?? null;
}

async function getTimeline(kurum_id: number): Promise<TimelineOlay[]> {
  const olaylar: TimelineOlay[] = [];

  const kurumKayit = await query<{ id: number; ad: string; created_at: string }>(
    `SELECT id, ad, created_at::text FROM kurum WHERE id = $1`,
    [kurum_id]
  );
  if (kurumKayit.length > 0) {
    olaylar.push({
      tip: 'KURUM',
      alt_tip: 'OLUSTURULDU',
      baslik: "Kurum Atlas'a eklendi",
      aciklama: kurumKayit[0].ad,
      zaman: kurumKayit[0].created_at,
      kullanici: null,
      entity_id: kurumKayit[0].id,
      entity_link: `/kurumlar/${kurumKayit[0].id}`,
    });
  }

  const birimler = await query<{
    id: number; ad: string; created_at: string; kaynak_ref: string | null;
  }>(`
    SELECT b.id, b.ad, b.created_at::text AS created_at, k.kaynak_referansi AS kaynak_ref
    FROM birim b
    LEFT JOIN kaynak k ON k.id = b.kaynak_id
    WHERE b.kurum_id = $1
    ORDER BY b.created_at DESC
  `, [kurum_id]);

  birimler.forEach((b) => {
    olaylar.push({
      tip: 'BIRIM',
      alt_tip: null,
      baslik: 'Birim eklendi',
      aciklama: `${b.ad}${b.kaynak_ref ? ` · Kaynak: ${b.kaynak_ref}` : ''}`,
      zaman: b.created_at,
      kullanici: null,
      entity_id: b.id,
      entity_link: null,
    });
  });

  const makamlar = await query<{
    id: number; makam_ad: string; makam_sinifi: string;
    birim_ad: string; makam_durumu: string; created_at: string;
  }>(`
    SELECT kbm.id, km.ad AS makam_ad, km.makam_sinifi::text AS makam_sinifi,
           b.ad AS birim_ad, kbm.makam_durumu::text AS makam_durumu,
           kbm.created_at::text AS created_at
    FROM kurum_birim_makam kbm
    JOIN kanonik_makam km ON km.id = kbm.kanonik_makam_id
    JOIN birim b ON b.id = kbm.birim_id
    WHERE kbm.kurum_id = $1
    ORDER BY kbm.created_at DESC
  `, [kurum_id]);

  makamlar.forEach((m) => {
    olaylar.push({
      tip: 'MAKAM',
      alt_tip: m.makam_sinifi,
      baslik: `${m.makam_ad} makamı tanımlandı`,
      aciklama: `${m.birim_ad} · Durum: ${m.makam_durumu}`,
      zaman: m.created_at,
      kullanici: null,
      entity_id: m.id,
      entity_link: null,
    });
  });

  const atamalar = await query<{
    id: number; kisi_id: number; kisi_ad: string; makam_ad: string;
    birim_ad: string; atama_durumu: string; atama_tipi: string; created_at: string;
  }>(`
    SELECT a.id, k.id AS kisi_id, k.ad_soyad AS kisi_ad,
           km.ad AS makam_ad, b.ad AS birim_ad,
           a.atama_durumu::text AS atama_durumu, a.atama_tipi::text AS atama_tipi,
           a.created_at::text AS created_at
    FROM atama a
    JOIN kisi k ON k.id = a.kisi_id
    JOIN kurum_birim_makam kbm ON kbm.id = a.kurum_birim_makam_id
    JOIN kanonik_makam km ON km.id = kbm.kanonik_makam_id
    JOIN birim b ON b.id = kbm.birim_id
    WHERE kbm.kurum_id = $1
    ORDER BY a.created_at DESC
  `, [kurum_id]);

  atamalar.forEach((a) => {
    olaylar.push({
      tip: 'ATAMA',
      alt_tip: a.atama_durumu,
      baslik: `${a.kisi_ad} → ${a.makam_ad}`,
      aciklama: `${a.birim_ad} · ${a.atama_tipi} · ${a.atama_durumu}`,
      zaman: a.created_at,
      kullanici: null,
      entity_id: a.kisi_id,
      entity_link: `/kisiler/${a.kisi_id}`,
    });
  });

  const teyitler = await query<{
    id: number; atama_id: number; kisi_ad: string; makam_ad: string;
    teyit_turu: string; teyit_sonucu: string; teyit_tarihi: string;
    notlar: string | null; teyit_eden: string;
  }>(`
    SELECT t.id, t.atama_id, k.ad_soyad AS kisi_ad, km.ad AS makam_ad,
           t.teyit_turu::text AS teyit_turu,
           t.teyit_sonucu::text AS teyit_sonucu,
           t.teyit_tarihi::text AS teyit_tarihi,
           t.notlar, ku.ad_soyad AS teyit_eden
    FROM teyit_olayi t
    JOIN atama a ON a.id = t.atama_id
    JOIN kisi k ON k.id = a.kisi_id
    JOIN kurum_birim_makam kbm ON kbm.id = a.kurum_birim_makam_id
    JOIN kanonik_makam km ON km.id = kbm.kanonik_makam_id
    JOIN kullanici ku ON ku.id = t.teyit_eden_user_id
    WHERE kbm.kurum_id = $1
    ORDER BY t.teyit_tarihi DESC, t.id DESC
    LIMIT 30
  `, [kurum_id]);

  teyitler.forEach((t) => {
    olaylar.push({
      tip: 'TEYIT',
      alt_tip: t.teyit_sonucu,
      baslik: `Teyit: ${t.kisi_ad} — ${t.makam_ad}`,
      aciklama: t.notlar ?? `${t.teyit_turu} · ${t.teyit_sonucu}`,
      zaman: t.teyit_tarihi,
      kullanici: t.teyit_eden,
      entity_id: t.id,
      entity_link: `/teyit/${t.atama_id}`,
    });
  });

  olaylar.sort((a, b) => new Date(b.zaman).getTime() - new Date(a.zaman).getTime());

  return olaylar;
}

const TIP_STIL: Record<string, { bg: string; icon: string; renk: string }> = {
  KURUM:  { bg: 'border-blue-700 bg-blue-950/20',       icon: '🏢', renk: 'text-blue-400' },
  BIRIM:  { bg: 'border-cyan-700 bg-cyan-950/20',       icon: '📁', renk: 'text-cyan-400' },
  MAKAM:  { bg: 'border-purple-700 bg-purple-950/20',   icon: '🎯', renk: 'text-purple-400' },
  ATAMA:  { bg: 'border-amber-700 bg-amber-950/20',     icon: '👤', renk: 'text-amber-400' },
  TEYIT:  { bg: 'border-green-700 bg-green-950/20',     icon: '✓', renk: 'text-green-400' },
};

function formatZaman(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('tr-TR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default async function KurumTimelinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const kurum = await getKurum(id);
  if (!kurum) notFound();

  const olaylar = await getTimeline(kurum.id);

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 p-6 md:p-10">
      <div className="max-w-3xl mx-auto">
        <header className="mb-8">
          <Link href={`/kurumlar/${kurum.id}`} className="text-sm text-neutral-500 hover:text-neutral-300 mb-2 inline-block">
            ← {kurum.ad}
          </Link>
          <h1 className="text-3xl font-bold mb-1">Kurum Kronolojisi</h1>
          <p className="text-neutral-400 text-sm">
            {kurum.ad} · {olaylar.length} olay
          </p>
        </header>

        {olaylar.length === 0 ? (
          <div className="p-10 rounded-lg border border-dashed border-neutral-800 bg-neutral-900/50 text-center text-sm text-neutral-500">
            Bu kurum için henüz geçmiş kaydı yok
          </div>
        ) : (
          <div className="relative">
            <div className="absolute left-6 top-2 bottom-2 w-px bg-neutral-800" />
            <div className="space-y-4">
              {olaylar.map((o, i) => {
                const stil = TIP_STIL[o.tip] ?? TIP_STIL.MAKAM;
                return (
                  <div key={`${o.tip}-${o.entity_id ?? i}-${o.zaman}`} className="relative flex gap-4">
                    <div className={`shrink-0 w-12 h-12 rounded-full border-2 ${stil.bg} flex items-center justify-center text-lg z-10`}>
                      <span>{stil.icon}</span>
                    </div>
                    <div className={`flex-1 p-4 rounded-lg border bg-neutral-900 ${stil.bg} hover:border-neutral-600 transition-colors`}>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs font-semibold uppercase ${stil.renk}`}>{o.tip}</span>
                          {o.alt_tip && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400">
                              {o.alt_tip}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-neutral-500 whitespace-nowrap">
                          {formatZaman(o.zaman)}
                        </span>
                      </div>
                      <div className="font-medium text-sm mb-1">{o.baslik}</div>
                      {o.aciklama && (
                        <div className="text-xs text-neutral-400 whitespace-pre-wrap">{o.aciklama}</div>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs text-neutral-600">
                        {o.kullanici && <span>👤 {o.kullanici}</span>}
                        {o.entity_link && (
                          <Link href={o.entity_link} className="text-blue-400 hover:text-blue-300">
                            Detay →
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}