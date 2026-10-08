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
  extra: any;
};

async function getKisi(id: string) {
  const [k] = await query<{ id: number; ad_soyad: string }>(
    `SELECT id, ad_soyad FROM kisi WHERE id = $1 AND aktif = TRUE`,
    [id]
  );
  return k ?? null;
}

async function getTimeline(kisi_id: number): Promise<TimelineOlay[]> {
  const olaylar: TimelineOlay[] = [];

  // 1. Kişi oluşturulması
  const kisiKayit = await query<{ id: number; ad_soyad: string; created_at: string }>(
    `SELECT id, ad_soyad, created_at::text FROM kisi WHERE id = $1`,
    [kisi_id]
  );
  if (kisiKayit.length > 0) {
    olaylar.push({
      tip: 'KISI',
      alt_tip: 'OLUSTURULDU',
      baslik: 'Kişi Atlas\'a eklendi',
      aciklama: kisiKayit[0].ad_soyad,
      zaman: kisiKayit[0].created_at,
      kullanici: null,
      entity_id: kisiKayit[0].id,
      entity_link: `/kisiler/${kisiKayit[0].id}`,
      extra: null,
    });
  }

  // 2. Atamalar
  const atamalar = await query<{
    id: number;
    atama_durumu: string;
    atama_tipi: string;
    baslangic_tarihi: string | null;
    bitis_tarihi: string | null;
    created_at: string;
    makam_ad: string;
    makam_sinifi: string;
    kurum_ad: string;
    kurum_id: number;
    birim_ad: string;
    il_ad: string | null;
  }>(`
    SELECT a.id, a.atama_durumu::text AS atama_durumu, a.atama_tipi::text AS atama_tipi,
           a.baslangic_tarihi::text AS baslangic_tarihi, a.bitis_tarihi::text AS bitis_tarihi,
           a.created_at::text AS created_at,
           km.ad AS makam_ad, km.makam_sinifi::text AS makam_sinifi,
           ku.ad AS kurum_ad, ku.id AS kurum_id,
           b.ad AS birim_ad, il.ad AS il_ad
    FROM atama a
    JOIN kurum_birim_makam kbm ON kbm.id = a.kurum_birim_makam_id
    JOIN kanonik_makam km ON km.id = kbm.kanonik_makam_id
    JOIN kurum ku ON ku.id = kbm.kurum_id
    JOIN birim b ON b.id = kbm.birim_id
    LEFT JOIN il ON il.id = ku.il_id
    WHERE a.kisi_id = $1
    ORDER BY a.created_at DESC
  `, [kisi_id]);

  atamalar.forEach((a) => {
    olaylar.push({
      tip: 'ATAMA',
      alt_tip: a.atama_durumu,
      baslik: `${a.makam_ad} makamına atandı`,
      aciklama: `${a.kurum_ad} · ${a.birim_ad}${a.il_ad ? ' · ' + a.il_ad : ''} (${a.atama_tipi})`,
      zaman: a.created_at,
      kullanici: null,
      entity_id: a.id,
      entity_link: `/teyit/${a.id}`,
      extra: { makam_sinifi: a.makam_sinifi, durum: a.atama_durumu },
    });
  });

  // 3. İletişim eklenmesi
  const iletisimler = await query<{
    id: number;
    iletisim_kanali: string;
    deger: string;
    rol: string;
    created_at: string;
  }>(`
    SELECT id, iletisim_kanali, deger, rol::text AS rol, created_at::text
    FROM iletisim WHERE kisi_id = $1 ORDER BY created_at DESC
  `, [kisi_id]);

  iletisimler.forEach((i) => {
    olaylar.push({
      tip: 'ILETISIM',
      alt_tip: i.rol,
      baslik: `${i.iletisim_kanali} iletişim eklendi`,
      aciklama: i.deger,
      zaman: i.created_at,
      kullanici: null,
      entity_id: i.id,
      entity_link: null,
      extra: { rol: i.rol },
    });
  });

  // 4. Teyit olayları
  const teyitler = await query<{
    id: number;
    teyit_turu: string;
    teyit_sonucu: string;
    teyit_tarihi: string;
    notlar: string | null;
    teyit_eden: string;
    makam_ad: string;
    kurum_ad: string;
  }>(`
    SELECT t.id, t.teyit_turu::text AS teyit_turu, t.teyit_sonucu::text AS teyit_sonucu,
           t.teyit_tarihi::text AS teyit_tarihi, t.notlar,
           ku.ad_soyad AS teyit_eden,
           km.ad AS makam_ad, kr.ad AS kurum_ad
    FROM teyit_olayi t
    JOIN kullanici ku ON ku.id = t.teyit_eden_user_id
    JOIN atama a ON a.id = t.atama_id
    JOIN kurum_birim_makam kbm ON kbm.id = a.kurum_birim_makam_id
    JOIN kanonik_makam km ON km.id = kbm.kanonik_makam_id
    JOIN kurum kr ON kr.id = kbm.kurum_id
    WHERE a.kisi_id = $1
    ORDER BY t.teyit_tarihi DESC, t.id DESC
  `, [kisi_id]);

  teyitler.forEach((t) => {
    olaylar.push({
      tip: 'TEYIT',
      alt_tip: t.teyit_sonucu,
      baslik: `Teyit edildi: ${t.teyit_sonucu}`,
      aciklama: t.notlar ?? `${t.makam_ad} · ${t.kurum_ad}`,
      zaman: t.teyit_tarihi,
      kullanici: t.teyit_eden,
      entity_id: t.id,
      entity_link: null,
      extra: { tur: t.teyit_turu, sonuc: t.teyit_sonucu },
    });
  });

  // 5. Etkileşimler
  const etkilesimler = await query<{
    id: number;
    etkilesim_turu: string;
    konu: string | null;
    icerik: string | null;
    tarih: string;
    yapan: string;
  }>(`
    SELECT e.id, e.etkilesim_turu::text AS etkilesim_turu, e.konu, e.icerik,
           e.tarih::text AS tarih, ku.ad_soyad AS yapan
    FROM etkilesim e
    JOIN kullanici ku ON ku.id = e.yapan_user_id
    WHERE e.kisi_id = $1
    ORDER BY e.tarih DESC
  `, [kisi_id]);

  etkilesimler.forEach((e) => {
    olaylar.push({
      tip: 'ETKILESIM',
      alt_tip: e.etkilesim_turu,
      baslik: e.konu ?? 'Etkileşim',
      aciklama: e.icerik,
      zaman: e.tarih,
      kullanici: e.yapan,
      entity_id: e.id,
      entity_link: null,
      extra: { tur: e.etkilesim_turu },
    });
  });

  // 6. Notlar
  const notlar = await query<{
    id: number;
    icerik: string;
    created_at: string;
    yazan: string;
  }>(`
    SELECT n.id, n.icerik, n.created_at::text AS created_at, ku.ad_soyad AS yazan
    FROM not_kaydi n
    JOIN kullanici ku ON ku.id = n.yazan_user_id
    WHERE n.kisi_id = $1
    ORDER BY n.created_at DESC
  `, [kisi_id]);

  notlar.forEach((n) => {
    olaylar.push({
      tip: 'NOT',
      alt_tip: null,
      baslik: 'Not eklendi',
      aciklama: n.icerik,
      zaman: n.created_at,
      kullanici: n.yazan,
      entity_id: n.id,
      entity_link: null,
      extra: null,
    });
  });

  // 7. Aksiyonlar
  const aksiyonlar = await query<{
    id: number;
    baslik: string;
    aksiyon_turu: string;
    durum: string;
    created_at: string;
  }>(`
    SELECT id, baslik, aksiyon_turu::text AS aksiyon_turu, durum::text AS durum,
           created_at::text AS created_at
    FROM aksiyon WHERE kisi_id = $1 ORDER BY created_at DESC
  `, [kisi_id]);

  aksiyonlar.forEach((a) => {
    olaylar.push({
      tip: 'AKSIYON',
      alt_tip: a.durum,
      baslik: `Aksiyon: ${a.baslik}`,
      aciklama: `Tür: ${a.aksiyon_turu}`,
      zaman: a.created_at,
      kullanici: null,
      entity_id: a.id,
      entity_link: '/aksiyonlar',
      extra: { durum: a.durum },
    });
  });

  // 8. Trust hesaplamaları
  const trustlar = await query<{
    id: number;
    sonuc: number;
    hesaplama_tarihi: string;
    girdiler: any;
    versiyon: string;
  }>(`
    SELECT th.id, th.sonuc, th.hesaplama_tarihi::text AS hesaplama_tarihi,
           th.girdiler, tkv.versiyon
    FROM trust_hesaplama th
    JOIN trust_kurali_versiyonu tkv ON tkv.id = th.kural_versiyonu_id
    WHERE th.entity_turu = 'ATAMA'
      AND th.entity_id IN (SELECT id FROM atama WHERE kisi_id = $1)
    ORDER BY th.hesaplama_tarihi DESC
    LIMIT 20
  `, [kisi_id]);

  trustlar.forEach((t) => {
    olaylar.push({
      tip: 'TRUST',
      alt_tip: t.versiyon,
      baslik: `Trust hesaplandı: ${t.sonuc}`,
      aciklama: `Kural versiyonu: ${t.versiyon}`,
      zaman: t.hesaplama_tarihi,
      kullanici: null,
      entity_id: t.id,
      entity_link: '/trust',
      extra: { sonuc: t.sonuc },
    });
  });

  // Kronolojik sıralama (en yeni üstte)
  olaylar.sort((a, b) => new Date(b.zaman).getTime() - new Date(a.zaman).getTime());

  return olaylar;
}

const TIP_STIL: Record<string, { bg: string; icon: string; renk: string }> = {
  KISI:     { bg: 'border-blue-700 bg-blue-950/20',     icon: '👤', renk: 'text-blue-400' },
  ATAMA:    { bg: 'border-purple-700 bg-purple-950/20', icon: '🎯', renk: 'text-purple-400' },
  ILETISIM: { bg: 'border-cyan-700 bg-cyan-950/20',     icon: '📞', renk: 'text-cyan-400' },
  TEYIT:    { bg: 'border-green-700 bg-green-950/20',   icon: '✓', renk: 'text-green-400' },
  ETKILESIM:{ bg: 'border-amber-700 bg-amber-950/20',   icon: '💬', renk: 'text-amber-400' },
  NOT:      { bg: 'border-neutral-700 bg-neutral-800/40', icon: '📝', renk: 'text-neutral-300' },
  AKSIYON:  { bg: 'border-orange-700 bg-orange-950/20', icon: '⚡', renk: 'text-orange-400' },
  TRUST:    { bg: 'border-emerald-700 bg-emerald-950/20', icon: '🛡', renk: 'text-emerald-400' },
};

function formatZaman(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('tr-TR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default async function TimelinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const kisi = await getKisi(id);
  if (!kisi) notFound();

  const olaylar = await getTimeline(kisi.id);

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 p-6 md:p-10">
      <div className="max-w-3xl mx-auto">
        <header className="mb-8">
          <Link href={`/kisiler/${kisi.id}`} className="text-sm text-neutral-500 hover:text-neutral-300 mb-2 inline-block">
            ← {kisi.ad_soyad}
          </Link>
          <h1 className="text-3xl font-bold mb-1">Kronolojik Geçmiş</h1>
          <p className="text-neutral-400 text-sm">
            {kisi.ad_soyad} · {olaylar.length} olay
          </p>
        </header>

        {olaylar.length === 0 ? (
          <div className="p-10 rounded-lg border border-dashed border-neutral-800 bg-neutral-900/50 text-center text-sm text-neutral-500">
            Bu kişi için henüz geçmiş kaydı yok
          </div>
        ) : (
          <div className="relative">
            {/* Dikey çizgi */}
            <div className="absolute left-6 top-2 bottom-2 w-px bg-neutral-800" />

            <div className="space-y-4">
              {olaylar.map((o, i) => {
                const stil = TIP_STIL[o.tip] ?? TIP_STIL.NOT;
                return (
                  <div key={`${o.tip}-${o.entity_id ?? i}-${o.zaman}`} className="relative flex gap-4">
                    {/* İkon dairesi */}
                    <div className={`shrink-0 w-12 h-12 rounded-full border-2 ${stil.bg} flex items-center justify-center text-lg z-10`}>
                      <span>{stil.icon}</span>
                    </div>

                    {/* Olay kartı */}
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
                        {o.kullanici && (
                          <span>👤 {o.kullanici}</span>
                        )}
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