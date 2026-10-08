import Link from 'next/link';
import { query } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { aktifKullaniciId } from '@/lib/auth';

export const dynamic = 'force-dynamic';

async function getBekleyenMakamlar() {
  return query<{ id: number; kurum_ad: string; birim_ad: string; makam_ad: string; makam_sinifi: string }>(`
    SELECT kbm.id, ku.ad AS kurum_ad, b.ad AS birim_ad, km.ad AS makam_ad, km.makam_sinifi::text AS makam_sinifi
    FROM kurum_birim_makam kbm
    JOIN kurum ku ON ku.id = kbm.kurum_id
    JOIN birim b ON b.id = kbm.birim_id
    JOIN kanonik_makam km ON km.id = kbm.kanonik_makam_id
    WHERE kbm.aktif AND kbm.makam_durumu = 'VAR' AND kbm.arastirma_durumu = 'ARASTIRILMADI'
    ORDER BY km.makam_sinifi, ku.ad, km.ad`);
}

async function kisiEkle(formData: FormData) {
  'use server';
  const userId = await aktifKullaniciId();
  if (!userId) redirect('/giris');

  const kbmId = String(formData.get('kbm_id') ?? '').trim();
  const adSoyad = String(formData.get('ad_soyad') ?? '').trim();
  const kaynakTuru = String(formData.get('kaynak_turu') ?? '').trim();
  const kaynakReferansi = String(formData.get('kaynak_referansi') ?? '').trim();
  const kaynakUrl = String(formData.get('kaynak_url') ?? '').trim() || null;
  const atamaTipi = String(formData.get('atama_tipi') ?? 'ASIL').trim();

  if (!kbmId || !adSoyad || !kaynakTuru || !kaynakReferansi) return;

  const [kaynak] = await query<{ id: number }>(
    `INSERT INTO kaynak (kaynak_turu, kaynak_referansi, kaynak_url, toplama_tarihi, aciklama)
     VALUES ($1::kaynak_turu, $2, $3, CURRENT_DATE, 'UI /ekle formu ile eklendi') RETURNING id`,
    [kaynakTuru, kaynakReferansi, kaynakUrl]);

  const [kisi] = await query<{ id: number }>(
    `INSERT INTO kisi (ad_soyad, normalize_ad, kvkk_hassasiyet)
     VALUES ($1, normalize_tr($1), 'KISISEL_ACIK_KAYNAK') RETURNING id`,
    [adSoyad]);

  await query(
    `INSERT INTO atama (kurum_birim_makam_id, kisi_id, atama_durumu, atama_tipi, baslangic_tarihi, kaynak_id, aciklama)
     VALUES ($1, $2, 'AKTIF', $3::atama_tipi, CURRENT_DATE, $4, 'UI formu ile eklendi')`,
    [Number(kbmId), kisi.id, atamaTipi, kaynak.id]);

  await query(
    `UPDATE kurum_birim_makam SET arastirma_durumu = 'KISI_BULUNDU' WHERE id = $1`,
    [Number(kbmId)]);

  revalidatePath('/ekle');
  revalidatePath('/kisiler');
  revalidatePath('/kurumlar');
  revalidatePath('/operasyon');
  revalidatePath('/');
}

export default async function EklePage() {
  const makamlar = await getBekleyenMakamlar();

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 p-10">
      <div className="max-w-3xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold mb-1">Kişi Ekle</h1>
          <p className="text-neutral-400 text-sm">Kaynak zorunlu (madde 4 + madde 30)</p>
        </header>

        {makamlar.length === 0 ? (
          <div className="p-6 rounded-lg border border-dashed border-neutral-800 bg-neutral-900/50 text-neutral-500 text-sm">
            Eklenecek bekleyen makam yok.
          </div>
        ) : (
          <form action={kisiEkle} className="space-y-5 rounded-lg border border-neutral-800 bg-neutral-900 p-6">
            <div>
              <label className="block text-xs uppercase text-neutral-500 font-semibold mb-2">Makam * ({makamlar.length} bekleyen)</label>
              <select name="kbm_id" required className="w-full px-3 py-2 rounded-md bg-neutral-950 border border-neutral-800 focus:border-blue-600 focus:outline-none">
                <option value="">— Seçiniz —</option>
                {makamlar.map((m) => (<option key={m.id} value={m.id}>[{m.makam_sinifi}] {m.makam_ad} — {m.kurum_ad} · {m.birim_ad}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-xs uppercase text-neutral-500 font-semibold mb-2">Ad Soyad *</label>
              <input type="text" name="ad_soyad" required className="w-full px-3 py-2 rounded-md bg-neutral-950 border border-neutral-800 focus:border-blue-600 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs uppercase text-neutral-500 font-semibold mb-2">Atama Tipi</label>
              <select name="atama_tipi" defaultValue="ASIL" className="w-full px-3 py-2 rounded-md bg-neutral-950 border border-neutral-800 focus:border-blue-600 focus:outline-none">
                <option value="ASIL">Asil</option>
                <option value="VEKIL">Vekil</option>
                <option value="GECICI">Geçici</option>
                <option value="IKINCIL">İkincil</option>
              </select>
            </div>
            <hr className="border-neutral-800" />
            <div>
              <label className="block text-xs uppercase text-neutral-500 font-semibold mb-2">Kaynak Türü *</label>
              <select name="kaynak_turu" required defaultValue="RESMI_KURUM_SITESI" className="w-full px-3 py-2 rounded-md bg-neutral-950 border border-neutral-800 focus:border-blue-600 focus:outline-none">
                <option value="RESMI_KURUM_SITESI">Resmi Kurum Sitesi</option>
                <option value="SANTRAL_TEYIDI">Santral Teyidi</option>
                <option value="DIREKT_ILETISIM">Direkt İletişim</option>
                <option value="RESMI_BELGE">Resmi Belge</option>
                <option value="INSAN_TEYIDI">İnsan Teyidi</option>
                <option value="DIGER">Diğer</option>
              </select>
            </div>
            <div>
              <label className="block text-xs uppercase text-neutral-500 font-semibold mb-2">Kaynak Referansı *</label>
              <input type="text" name="kaynak_referansi" required className="w-full px-3 py-2 rounded-md bg-neutral-950 border border-neutral-800 focus:border-blue-600 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs uppercase text-neutral-500 font-semibold mb-2">Kaynak URL</label>
              <input type="url" name="kaynak_url" className="w-full px-3 py-2 rounded-md bg-neutral-950 border border-neutral-800 focus:border-blue-600 focus:outline-none" />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-md font-medium transition-colors">Kaydet</button>
              <Link href="/kisiler" className="px-6 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-md font-medium transition-colors">İptal</Link>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}