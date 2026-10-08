import Link from 'next/link';
import { query } from '@/lib/db';
import { notFound } from 'next/navigation';
import { hesaplaRozet, ROZET_STIL } from '@/lib/trust';
import { revalidatePath } from 'next/cache';
import { aktifKullaniciId } from '@/lib/auth';

export const dynamic = 'force-dynamic';

type Kisi = { id: number; ad_soyad: string; kvkk_hassasiyet: string; aciklama: string | null };

type Atama = {
  atama_id: number; atama_durumu: string; atama_tipi: string;
  baslangic_tarihi: string | null; bitis_tarihi: string | null;
  makam_ad: string; makam_sinifi: string; birim_ad: string;
  kurum_id: number; kurum_ad: string; il_ad: string | null;
  son_trust: number | null; teyit_sayisi: string;
};

type Iletisim = { id: number; iletisim_kanali: string; deger: string; rol: string; kvkk_hassasiyet: string };

type Etkilesim = {
  id: number; etkilesim_turu: string; konu: string | null; icerik: string | null;
  tarih: string; yapan_ad: string; kaynak_referansi: string | null;
};

type Aksiyon = {
  id: number; aksiyon_turu: string; baslik: string; aciklama: string | null;
  oncelik: number; planlanan_tarih: string | null; durum: string; atanan_ad: string | null;
};

type NotKaydi = { id: number; icerik: string; yazan_ad: string; created_at: string };

async function getKisi(id: string): Promise<Kisi | null> {
  const [k] = await query<Kisi>(
    `SELECT id, ad_soyad, kvkk_hassasiyet::text AS kvkk_hassasiyet, aciklama
     FROM kisi WHERE id = $1 AND aktif = TRUE`, [id]);
  return k ?? null;
}

async function getAtamalar(kisi_id: number): Promise<Atama[]> {
  return query<Atama>(
    `SELECT a.id AS atama_id, a.atama_durumu::text AS atama_durumu, a.atama_tipi::text AS atama_tipi,
            a.baslangic_tarihi::text AS baslangic_tarihi, a.bitis_tarihi::text AS bitis_tarihi,
            km.ad AS makam_ad, km.makam_sinifi::text AS makam_sinifi, b.ad AS birim_ad,
            ku.id AS kurum_id, ku.ad AS kurum_ad, il.ad AS il_ad,
            (SELECT sonuc FROM trust_hesaplama th WHERE th.entity_turu = 'ATAMA' AND th.entity_id = a.id
              ORDER BY hesaplama_tarihi DESC LIMIT 1) AS son_trust,
            (SELECT COUNT(*)::text FROM teyit_olayi t WHERE t.atama_id = a.id AND t.teyit_sonucu = 'DOGRULANDI') AS teyit_sayisi
     FROM atama a
     JOIN kurum_birim_makam kbm ON kbm.id = a.kurum_birim_makam_id
     JOIN kanonik_makam km ON km.id = kbm.kanonik_makam_id
     JOIN kurum ku ON ku.id = kbm.kurum_id
     JOIN birim b ON b.id = kbm.birim_id
     LEFT JOIN il ON il.id = ku.il_id
     WHERE a.kisi_id = $1 AND a.aktif = TRUE
     ORDER BY a.atama_durumu, a.baslangic_tarihi DESC`, [kisi_id]);
}

async function getIletisimler(kisi_id: number): Promise<Iletisim[]> {
  return query<Iletisim>(
    `SELECT id, iletisim_kanali, deger, rol::text AS rol, kvkk_hassasiyet::text AS kvkk_hassasiyet
     FROM iletisim WHERE kisi_id = $1 AND aktif = TRUE
     ORDER BY CASE rol WHEN 'ASIL' THEN 1 WHEN 'YEDEK' THEN 2 ELSE 3 END, iletisim_kanali`, [kisi_id]);
}

async function getEtkilesimler(kisi_id: number): Promise<Etkilesim[]> {
  return query<Etkilesim>(
    `SELECT e.id, e.etkilesim_turu::text AS etkilesim_turu, e.konu, e.icerik,
            e.tarih::text AS tarih, ku.ad_soyad AS yapan_ad, k.kaynak_referansi
     FROM etkilesim e
     JOIN kullanici ku ON ku.id = e.yapan_user_id
     LEFT JOIN kaynak k ON k.id = e.kaynak_id
     WHERE e.kisi_id = $1 AND e.aktif = TRUE
     ORDER BY e.tarih DESC`, [kisi_id]);
}

async function getAksiyonlar(kisi_id: number): Promise<Aksiyon[]> {
  return query<Aksiyon>(
    `SELECT a.id, a.aksiyon_turu::text AS aksiyon_turu, a.baslik, a.aciklama, a.oncelik,
            a.planlanan_tarih::text AS planlanan_tarih, a.durum::text AS durum, ku.ad_soyad AS atanan_ad
     FROM aksiyon a
     LEFT JOIN kullanici ku ON ku.id = a.atanan_user_id
     WHERE a.kisi_id = $1 AND a.aktif = TRUE
     ORDER BY CASE a.durum WHEN 'BEKLIYOR' THEN 1 WHEN 'INCELEMEDE' THEN 2 WHEN 'ERTELENDI' THEN 3 ELSE 9 END,
              a.oncelik, a.planlanan_tarih NULLS LAST`, [kisi_id]);
}

async function getNotlar(kisi_id: number): Promise<NotKaydi[]> {
  return query<NotKaydi>(
    `SELECT n.id, n.icerik, ku.ad_soyad AS yazan_ad, n.created_at::text AS created_at
     FROM not_kaydi n
     JOIN kullanici ku ON ku.id = n.yazan_user_id
     WHERE n.kisi_id = $1 AND n.aktif = TRUE
     ORDER BY n.created_at DESC`, [kisi_id]);
}

async function iletisimEkle(formData: FormData) {
  'use server';
  const userId = await aktifKullaniciId();
  if (!userId) return;
  const kisiId = Number(formData.get('kisi_id'));
  const kanal = String(formData.get('iletisim_kanali') ?? '').trim();
  const deger = String(formData.get('deger') ?? '').trim();
  const rol = String(formData.get('rol') ?? 'ASIL').trim();
  const kvkk = String(formData.get('kvkk_hassasiyet') ?? 'KURUMSAL').trim();
  const kaynakTuru = String(formData.get('kaynak_turu') ?? '').trim();
  const kaynakRef = String(formData.get('kaynak_referansi') ?? '').trim();
  const kaynakUrl = String(formData.get('kaynak_url') ?? '').trim() || null;
  if (!kisiId || !kanal || !deger || !kaynakTuru || !kaynakRef) return;

  const [kaynak] = await query<{ id: number }>(
    `INSERT INTO kaynak (kaynak_turu, kaynak_referansi, kaynak_url, toplama_tarihi, aciklama)
     VALUES ($1::kaynak_turu, $2, $3, CURRENT_DATE, 'UI iletisim formu') RETURNING id`,
    [kaynakTuru, kaynakRef, kaynakUrl]);

  await query(
    `INSERT INTO iletisim (kisi_id, iletisim_kanali, deger, rol, kvkk_hassasiyet, kaynak_id)
     VALUES ($1, $2, $3, $4::iletisim_rolu, $5::kvkk_hassasiyet, $6)`,
    [kisiId, kanal, deger, rol, kvkk, kaynak.id]);
  revalidatePath(`/kisiler/${kisiId}`);
}

async function etkilesimEkle(formData: FormData) {
  'use server';
  const userId = await aktifKullaniciId();
  if (!userId) return;
  const kisiId = Number(formData.get('kisi_id'));
  const tur = String(formData.get('etkilesim_turu') ?? '').trim();
  const konu = String(formData.get('konu') ?? '').trim() || null;
  const icerik = String(formData.get('icerik') ?? '').trim() || null;
  const kaynakTuru = String(formData.get('kaynak_turu') ?? '').trim();
  const kaynakRef = String(formData.get('kaynak_referansi') ?? '').trim();
  if (!kisiId || !tur || !kaynakTuru || !kaynakRef) return;

  const [kaynak] = await query<{ id: number }>(
    `INSERT INTO kaynak (kaynak_turu, kaynak_referansi, toplama_tarihi, aciklama)
     VALUES ($1::kaynak_turu, $2, CURRENT_DATE, 'UI etkilesim formu') RETURNING id`,
    [kaynakTuru, kaynakRef]);

  await query(
    `INSERT INTO etkilesim (kisi_id, etkilesim_turu, konu, icerik, tarih, yapan_user_id, kaynak_id)
     VALUES ($1, $2::etkilesim_turu, $3, $4, NOW(), $5, $6)`,
    [kisiId, tur, konu, icerik, userId, kaynak.id]);
  revalidatePath(`/kisiler/${kisiId}`);
}

async function aksiyonEkle(formData: FormData) {
  'use server';
  const userId = await aktifKullaniciId();
  if (!userId) return;
  const kisiId = Number(formData.get('kisi_id'));
  const tur = String(formData.get('aksiyon_turu') ?? '').trim();
  const baslik = String(formData.get('baslik') ?? '').trim();
  const aciklama = String(formData.get('aciklama') ?? '').trim() || null;
  const oncelik = Number(formData.get('oncelik')) || 3;
  const tarihRaw = String(formData.get('planlanan_tarih') ?? '').trim();
  const planlananTarih = tarihRaw || null;
  const kaynakTuru = String(formData.get('kaynak_turu') ?? '').trim();
  const kaynakRef = String(formData.get('kaynak_referansi') ?? '').trim();
  if (!kisiId || !tur || !baslik || !kaynakTuru || !kaynakRef) return;

  const [kaynak] = await query<{ id: number }>(
    `INSERT INTO kaynak (kaynak_turu, kaynak_referansi, toplama_tarihi, aciklama)
     VALUES ($1::kaynak_turu, $2, CURRENT_DATE, 'UI aksiyon formu') RETURNING id`,
    [kaynakTuru, kaynakRef]);

  await query(
    `INSERT INTO aksiyon (kisi_id, aksiyon_turu, baslik, aciklama, oncelik,
                          planlanan_tarih, durum, atanan_user_id, olusturan_user_id, kaynak_id)
     VALUES ($1, $2::aksiyon_turu, $3, $4, $5, $6, 'BEKLIYOR', $7, $7, $8)`,
    [kisiId, tur, baslik, aciklama, oncelik, planlananTarih, userId, kaynak.id]);
  revalidatePath(`/kisiler/${kisiId}`);
  revalidatePath('/aksiyonlar');
}

async function notEkle(formData: FormData) {
  'use server';
  const userId = await aktifKullaniciId();
  if (!userId) return;
  const kisiId = Number(formData.get('kisi_id'));
  const icerik = String(formData.get('icerik') ?? '').trim();
  const kaynakTuru = String(formData.get('kaynak_turu') ?? '').trim();
  const kaynakRef = String(formData.get('kaynak_referansi') ?? '').trim();
  if (!kisiId || !icerik || !kaynakTuru || !kaynakRef) return;

  const [kaynak] = await query<{ id: number }>(
    `INSERT INTO kaynak (kaynak_turu, kaynak_referansi, toplama_tarihi, aciklama)
     VALUES ($1::kaynak_turu, $2, CURRENT_DATE, 'UI not formu') RETURNING id`,
    [kaynakTuru, kaynakRef]);

  await query(
    `INSERT INTO not_kaydi (kisi_id, icerik, yazan_user_id, kaynak_id)
     VALUES ($1, $2, $3, $4)`,
    [kisiId, icerik, userId, kaynak.id]);
  revalidatePath(`/kisiler/${kisiId}`);
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

const AKSIYON_DURUM_RENK: Record<string, string> = {
  BEKLIYOR: 'bg-blue-950/40 text-blue-300 border-blue-800',
  INCELEMEDE: 'bg-amber-950/40 text-amber-300 border-amber-800',
  TAMAMLANDI: 'bg-green-950/40 text-green-400 border-green-800',
  ERTELENDI: 'bg-neutral-800 text-neutral-400 border-neutral-700',
  IPTAL: 'bg-red-950/40 text-red-400 border-red-800',
};

const KANAL_ETIKET: Record<string, string> = {
  TELEFON: 'Telefon', CEP_TELEFONU: 'Cep Telefonu', WHATSAPP: 'WhatsApp',
  EPOSTA: 'E-posta', FAKS: 'Faks', WEB: 'Web', DIGER: 'Diğer',
};

const ETKILESIM_ETIKET: Record<string, string> = {
  TELEFON: 'Telefon', WHATSAPP: 'WhatsApp', EPOSTA: 'E-posta',
  ZIYARET: 'Ziyaret', TOPLANTI: 'Toplantı', NOT: 'Not', DIGER: 'Diğer',
};

const AKSIYON_ETIKET: Record<string, string> = {
  ARA: 'Ara', TEKRAR_ARA: 'Tekrar Ara', ZIYARET: 'Ziyaret', EPOSTA: 'E-posta',
  WHATSAPP: 'WhatsApp', DOKUMAN: 'Doküman', IHALE_TAKIP: 'İhale Takip',
  TEYIT: 'Teyit', TOPLANTI: 'Toplantı', RANDEVU: 'Randevu', DIGER: 'Diğer',
};

export default async function KisiDetayPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ teyit?: string; trust?: string; rozet?: string; celiski?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const kisi = await getKisi(id);
  if (!kisi) notFound();

  const [atamalar, iletisimler, etkilesimler, aksiyonlar, notlar] = await Promise.all([
    getAtamalar(kisi.id), getIletisimler(kisi.id), getEtkilesimler(kisi.id),
    getAksiyonlar(kisi.id), getNotlar(kisi.id)]);

  const acikAksiyon = aksiyonlar.filter(a => a.durum === 'BEKLIYOR' || a.durum === 'INCELEMEDE').length;

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 p-10">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <Link href="/kisiler" className="text-sm text-neutral-500 hover:text-neutral-300 mb-2 inline-block">← Kişiler</Link>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">{kisi.ad_soyad}</h1>
              <div className="flex gap-2 text-xs mb-2">
                <span className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-400">KVKK: {kisi.kvkk_hassasiyet}</span>
              </div>
              <Link
                href={`/kisiler/${kisi.id}/timeline`}
                className="inline-block text-xs px-3 py-1.5 rounded-md bg-neutral-800 hover:bg-neutral-700 transition-colors"
              >
                📜 Kronolojik Geçmiş →
              </Link>
            </div>
            <div className="flex gap-4 text-right">
              <div>
                <div className="text-xs text-neutral-500 mb-1">Aksiyon</div>
                <div className={`text-2xl font-bold ${acikAksiyon > 0 ? 'text-blue-400' : 'text-neutral-500'}`}>{acikAksiyon}</div>
              </div>
              <div>
                <div className="text-xs text-neutral-500 mb-1">Etkileşim</div>
                <div className="text-2xl font-bold text-neutral-300">{etkilesimler.length}</div>
              </div>
              <div>
                <div className="text-xs text-neutral-500 mb-1">Not</div>
                <div className="text-2xl font-bold text-neutral-300">{notlar.length}</div>
              </div>
            </div>
          </div>
          {kisi.aciklama && <p className="text-neutral-400 mt-3 text-sm">{kisi.aciklama}</p>}
        </header>

        {sp.teyit === '1' && (
          <div className={`mb-6 p-4 rounded-lg border text-sm ${
            sp.celiski === '1'
              ? 'border-amber-800 bg-amber-950/20 text-amber-200'
              : 'border-green-800 bg-green-950/20 text-green-200'
          }`}>
            {sp.celiski === '1' ? (
              <>
                ⚠ Teyit kaydedildi, <strong>ancak çelişki tespit edildi</strong>. Yeni trust:{' '}
                <strong>{sp.trust}</strong> · Rozet: <strong>{sp.rozet}</strong>
              </>
            ) : (
              <>
                ✓ Teyit kaydedildi. Yeni trust: <strong>{sp.trust}</strong> · Rozet:{' '}
                <strong>{sp.rozet}</strong>
              </>
            )}
          </div>
        )}

        <section className="mb-8">
          <h2 className="text-xs uppercase text-neutral-500 font-semibold mb-3">Aksiyonlar ({aksiyonlar.length})</h2>
          {aksiyonlar.length > 0 && (
            <div className="space-y-2 mb-4">
              {aksiyonlar.map((a) => {
                const dR = AKSIYON_DURUM_RENK[a.durum] ?? AKSIYON_DURUM_RENK.BEKLIYOR;
                const gecti = a.planlanan_tarih && new Date(a.planlanan_tarih) < new Date() && (a.durum === 'BEKLIYOR' || a.durum === 'INCELEMEDE');
                return (
                  <div key={a.id} className="p-4 rounded-lg border border-neutral-800 bg-neutral-900">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded border ${dR}`}>{a.durum}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-neutral-800 text-neutral-400">{AKSIYON_ETIKET[a.aksiyon_turu] ?? a.aksiyon_turu}</span>
                      <span className="text-xs text-neutral-500">P{a.oncelik}</span>
                      {a.planlanan_tarih && (
                        <span className={`text-xs ${gecti ? 'text-red-400 font-semibold' : 'text-neutral-500'}`}>
                          {gecti && '⚠ '}{new Date(a.planlanan_tarih).toLocaleDateString('tr-TR')}
                        </span>
                      )}
                    </div>
                    <div className="font-medium mb-1">{a.baslik}</div>
                    {a.aciklama && <div className="text-sm text-neutral-400 whitespace-pre-wrap">{a.aciklama}</div>}
                  </div>
                );
              })}
            </div>
          )}

          <details className="rounded-lg border border-neutral-800 bg-neutral-900">
            <summary className="px-5 py-3 cursor-pointer hover:bg-neutral-800/50 transition-colors font-medium text-sm">+ Aksiyon Ekle</summary>
            <form action={aksiyonEkle} className="p-5 border-t border-neutral-800 space-y-4">
              <input type="hidden" name="kisi_id" value={kisi.id} />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase text-neutral-500 font-semibold mb-2">Tür *</label>
                  <select name="aksiyon_turu" required defaultValue="ARA" className="w-full px-3 py-2 rounded-md bg-neutral-950 border border-neutral-800 focus:border-blue-600 focus:outline-none">
                    {Object.entries(AKSIYON_ETIKET).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs uppercase text-neutral-500 font-semibold mb-2">Öncelik *</label>
                  <select name="oncelik" required defaultValue="3" className="w-full px-3 py-2 rounded-md bg-neutral-950 border border-neutral-800 focus:border-blue-600 focus:outline-none">
                    <option value="1">1 — Kritik</option>
                    <option value="2">2 — Yüksek</option>
                    <option value="3">3 — Normal</option>
                    <option value="4">4 — Düşük</option>
                    <option value="5">5 — Bilgi</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs uppercase text-neutral-500 font-semibold mb-2">Başlık *</label>
                <input type="text" name="baslik" required className="w-full px-3 py-2 rounded-md bg-neutral-950 border border-neutral-800 focus:border-blue-600 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs uppercase text-neutral-500 font-semibold mb-2">Açıklama</label>
                <textarea name="aciklama" rows={3} className="w-full px-3 py-2 rounded-md bg-neutral-950 border border-neutral-800 focus:border-blue-600 focus:outline-none resize-none" />
              </div>
              <div>
                <label className="block text-xs uppercase text-neutral-500 font-semibold mb-2">Planlanan Tarih</label>
                <input type="date" name="planlanan_tarih" className="w-full px-3 py-2 rounded-md bg-neutral-950 border border-neutral-800 focus:border-blue-600 focus:outline-none" />
              </div>
              <hr className="border-neutral-800" />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase text-neutral-500 font-semibold mb-2">Kaynak Türü *</label>
                  <select name="kaynak_turu" required defaultValue="DIREKT_ILETISIM" className="w-full px-3 py-2 rounded-md bg-neutral-950 border border-neutral-800 focus:border-blue-600 focus:outline-none">
                    <option value="DIREKT_ILETISIM">Direkt İletişim</option>
                    <option value="SANTRAL_TEYIDI">Santral Teyidi</option>
                    <option value="SAHA_GORUSMESI">Saha Görüşmesi</option>
                    <option value="IKINCIL_KAYNAK">İkincil Kaynak</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs uppercase text-neutral-500 font-semibold mb-2">Kaynak Referansı *</label>
                  <input type="text" name="kaynak_referansi" required className="w-full px-3 py-2 rounded-md bg-neutral-950 border border-neutral-800 focus:border-blue-600 focus:outline-none" />
                </div>
              </div>
              <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-md font-medium transition-colors">Aksiyon Kaydet</button>
            </form>
          </details>
        </section>

        <section className="mb-8">
          <h2 className="text-xs uppercase text-neutral-500 font-semibold mb-3">Atamalar ({atamalar.length})</h2>
          {atamalar.length === 0 ? (
            <div className="text-sm text-neutral-600 p-4 rounded-lg border border-neutral-800 bg-neutral-900">Bu kişiye atanmış makam yok.</div>
          ) : (
            <div className="space-y-2">
              {atamalar.map((a) => {
                const sR = SINIF_RENK[a.makam_sinifi] ?? SINIF_RENK.D;
                const dR = DURUM_RENK[a.atama_durumu] ?? DURUM_RENK.BELIRSIZ;
                const teyitSayisi = Number(a.teyit_sayisi);
                const rozet = hesaplaRozet(a.son_trust, teyitSayisi);
                const rz = ROZET_STIL[rozet];
                return (
                  <div key={a.atama_id} className="p-4 rounded-lg border border-neutral-800 bg-neutral-900">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded border ${sR}`}>{a.makam_sinifi}</span>
                        <span className="font-medium">{a.makam_ad}</span>
                        <span className="text-xs text-neutral-600">· {a.atama_tipi}</span>
                        <span className={`text-xs px-2 py-0.5 rounded border ${dR}`}>{a.atama_durumu}</span>
                        <span className={`text-xs px-2 py-1 rounded font-semibold ${rz.bg}`}>
                          {rz.label}{a.son_trust !== null && <> · {a.son_trust}</>}{teyitSayisi > 0 && <> · {teyitSayisi}✓</>}
                        </span>
                      </div>
                      <Link href={`/teyit/${a.atama_id}`} className="text-xs px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 font-medium transition-colors whitespace-nowrap">
                        {teyitSayisi > 0 ? 'Tekrar Teyit' : 'Teyit Et'}
                      </Link>
                    </div>
                    <div className="text-xs text-neutral-500 mb-2">
                      {a.kurum_ad} · {a.birim_ad}{a.il_ad && <> · {a.il_ad}</>}
                    </div>
                    <Link href={`/kurumlar/${a.kurum_id}`} className="text-xs text-blue-400 hover:text-blue-300">Kurum sayfasına git →</Link>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="mb-8">
          <h2 className="text-xs uppercase text-neutral-500 font-semibold mb-3">İletişim ({iletisimler.length})</h2>
          {iletisimler.length > 0 && (
            <div className="space-y-2 mb-4">
              {iletisimler.map((i) => (
                <div key={i.id} className="p-3 rounded-lg border border-neutral-800 bg-neutral-900 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-0.5 rounded ${i.rol === 'ASIL' ? 'bg-green-950/40 text-green-400' : 'bg-neutral-800 text-neutral-400'}`}>{i.rol}</span>
                    <span className="text-xs text-neutral-500">{KANAL_ETIKET[i.iletisim_kanali] ?? i.iletisim_kanali}</span>
                    <span className="font-mono text-sm">{i.deger}</span>
                  </div>
                  <span className="text-xs text-neutral-600">{i.kvkk_hassasiyet}</span>
                </div>
              ))}
            </div>
          )}
          <details className="rounded-lg border border-neutral-800 bg-neutral-900">
            <summary className="px-5 py-3 cursor-pointer hover:bg-neutral-800/50 transition-colors font-medium text-sm">+ İletişim Ekle</summary>
            <form action={iletisimEkle} className="p-5 border-t border-neutral-800 space-y-4">
              <input type="hidden" name="kisi_id" value={kisi.id} />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase text-neutral-500 font-semibold mb-2">Kanal *</label>
                  <select name="iletisim_kanali" required defaultValue="TELEFON" className="w-full px-3 py-2 rounded-md bg-neutral-950 border border-neutral-800 focus:border-blue-600 focus:outline-none">
                    {Object.entries(KANAL_ETIKET).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs uppercase text-neutral-500 font-semibold mb-2">Rol *</label>
                  <select name="rol" required defaultValue="ASIL" className="w-full px-3 py-2 rounded-md bg-neutral-950 border border-neutral-800 focus:border-blue-600 focus:outline-none">
                    <option value="ASIL">Asil</option>
                    <option value="YEDEK">Yedek</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs uppercase text-neutral-500 font-semibold mb-2">Değer *</label>
                <input type="text" name="deger" required placeholder="+90 312 000 00 00 veya ad@kurum.gov.tr" className="w-full px-3 py-2 rounded-md bg-neutral-950 border border-neutral-800 focus:border-blue-600 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs uppercase text-neutral-500 font-semibold mb-2">KVKK *</label>
                <select name="kvkk_hassasiyet" required defaultValue="KURUMSAL" className="w-full px-3 py-2 rounded-md bg-neutral-950 border border-neutral-800 focus:border-blue-600 focus:outline-none">
                  <option value="KURUMSAL">Kurumsal</option>
                  <option value="KISISEL_ACIK_KAYNAK">Kişisel (Açık Kaynak)</option>
                  <option value="KISISEL_OZEL">Kişisel (Özel)</option>
                </select>
              </div>
              <hr className="border-neutral-800" />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase text-neutral-500 font-semibold mb-2">Kaynak Türü *</label>
                  <select name="kaynak_turu" required defaultValue="SANTRAL_TEYIDI" className="w-full px-3 py-2 rounded-md bg-neutral-950 border border-neutral-800 focus:border-blue-600 focus:outline-none">
                    <option value="SANTRAL_TEYIDI">Santral Teyidi</option>
                    <option value="RESMI_KURUM_SITESI">Resmi Kurum Sitesi</option>
                    <option value="DIREKT_ILETISIM">Direkt İletişim</option>
                    <option value="RESMI_BELGE">Resmi Belge</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs uppercase text-neutral-500 font-semibold mb-2">Kaynak Referansı *</label>
                  <input type="text" name="kaynak_referansi" required className="w-full px-3 py-2 rounded-md bg-neutral-950 border border-neutral-800 focus:border-blue-600 focus:outline-none" />
                </div>
              </div>
              <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-md font-medium transition-colors">İletişim Kaydet</button>
            </form>
          </details>
        </section>

        <section className="mb-8">
          <h2 className="text-xs uppercase text-neutral-500 font-semibold mb-3">Etkileşim Geçmişi ({etkilesimler.length})</h2>
          {etkilesimler.length > 0 && (
            <div className="space-y-2 mb-4">
              {etkilesimler.map((e) => (
                <div key={e.id} className="p-4 rounded-lg border border-neutral-800 bg-neutral-900">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xs px-2 py-0.5 rounded bg-neutral-800 text-neutral-300">{ETKILESIM_ETIKET[e.etkilesim_turu] ?? e.etkilesim_turu}</span>
                    {e.konu && <span className="font-medium text-sm">{e.konu}</span>}
                    <span className="text-xs text-neutral-600 ml-auto">{new Date(e.tarih).toLocaleString('tr-TR')}</span>
                  </div>
                  {e.icerik && <div className="text-sm text-neutral-300 mb-2 whitespace-pre-wrap">{e.icerik}</div>}
                  <div className="text-xs text-neutral-600">
                    👤 {e.yapan_ad}{e.kaynak_referansi && <> · Kaynak: {e.kaynak_referansi}</>}
                  </div>
                </div>
              ))}
            </div>
          )}
          <details className="rounded-lg border border-neutral-800 bg-neutral-900">
            <summary className="px-5 py-3 cursor-pointer hover:bg-neutral-800/50 transition-colors font-medium text-sm">+ Etkileşim Ekle</summary>
            <form action={etkilesimEkle} className="p-5 border-t border-neutral-800 space-y-4">
              <input type="hidden" name="kisi_id" value={kisi.id} />
              <div>
                <label className="block text-xs uppercase text-neutral-500 font-semibold mb-2">Tür *</label>
                <select name="etkilesim_turu" required defaultValue="TELEFON" className="w-full px-3 py-2 rounded-md bg-neutral-950 border border-neutral-800 focus:border-blue-600 focus:outline-none">
                  {Object.entries(ETKILESIM_ETIKET).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-xs uppercase text-neutral-500 font-semibold mb-2">Konu</label>
                <input type="text" name="konu" className="w-full px-3 py-2 rounded-md bg-neutral-950 border border-neutral-800 focus:border-blue-600 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs uppercase text-neutral-500 font-semibold mb-2">İçerik</label>
                <textarea name="icerik" rows={3} className="w-full px-3 py-2 rounded-md bg-neutral-950 border border-neutral-800 focus:border-blue-600 focus:outline-none resize-none" />
              </div>
              <hr className="border-neutral-800" />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase text-neutral-500 font-semibold mb-2">Kaynak Türü *</label>
                  <select name="kaynak_turu" required defaultValue="DIREKT_ILETISIM" className="w-full px-3 py-2 rounded-md bg-neutral-950 border border-neutral-800 focus:border-blue-600 focus:outline-none">
                    <option value="DIREKT_ILETISIM">Direkt İletişim</option>
                    <option value="SANTRAL_TEYIDI">Santral Teyidi</option>
                    <option value="SAHA_GORUSMESI">Saha Görüşmesi</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs uppercase text-neutral-500 font-semibold mb-2">Kaynak Referansı *</label>
                  <input type="text" name="kaynak_referansi" required className="w-full px-3 py-2 rounded-md bg-neutral-950 border border-neutral-800 focus:border-blue-600 focus:outline-none" />
                </div>
              </div>
              <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-md font-medium transition-colors">Etkileşim Kaydet</button>
            </form>
          </details>
        </section>

        <section className="mb-8">
          <h2 className="text-xs uppercase text-neutral-500 font-semibold mb-3">Notlar ({notlar.length})</h2>
          {notlar.length > 0 && (
            <div className="space-y-2 mb-4">
              {notlar.map((n) => (
                <div key={n.id} className="p-4 rounded-lg border border-neutral-800 bg-neutral-900">
                  <div className="text-sm text-neutral-300 mb-2 whitespace-pre-wrap">{n.icerik}</div>
                  <div className="text-xs text-neutral-600">
                    👤 {n.yazan_ad} · {new Date(n.created_at).toLocaleString('tr-TR')}
                  </div>
                </div>
              ))}
            </div>
          )}
          <details className="rounded-lg border border-neutral-800 bg-neutral-900">
            <summary className="px-5 py-3 cursor-pointer hover:bg-neutral-800/50 transition-colors font-medium text-sm">+ Not Ekle</summary>
            <form action={notEkle} className="p-5 border-t border-neutral-800 space-y-4">
              <input type="hidden" name="kisi_id" value={kisi.id} />
              <div>
                <label className="block text-xs uppercase text-neutral-500 font-semibold mb-2">Not *</label>
                <textarea name="icerik" rows={4} required className="w-full px-3 py-2 rounded-md bg-neutral-950 border border-neutral-800 focus:border-blue-600 focus:outline-none resize-none" />
              </div>
              <hr className="border-neutral-800" />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase text-neutral-500 font-semibold mb-2">Kaynak Türü *</label>
                  <select name="kaynak_turu" required defaultValue="DIREKT_ILETISIM" className="w-full px-3 py-2 rounded-md bg-neutral-950 border border-neutral-800 focus:border-blue-600 focus:outline-none">
                    <option value="DIREKT_ILETISIM">Direkt İletişim</option>
                    <option value="SAHA_GORUSMESI">Saha Görüşmesi</option>
                    <option value="IKINCIL_KAYNAK">İkincil Kaynak</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs uppercase text-neutral-500 font-semibold mb-2">Kaynak Referansı *</label>
                  <input type="text" name="kaynak_referansi" required className="w-full px-3 py-2 rounded-md bg-neutral-950 border border-neutral-800 focus:border-blue-600 focus:outline-none" />
                </div>
              </div>
              <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-md font-medium transition-colors">Not Kaydet</button>
            </form>
          </details>
        </section>
      </div>
    </main>
  );
}