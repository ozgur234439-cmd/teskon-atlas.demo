import Link from 'next/link';
import { query } from '@/lib/db';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { aktifKullaniciId } from '@/lib/auth';

export const dynamic = 'force-dynamic';

async function getKategoriler() { return query<{ id: number; kod: string; ad: string }>(`SELECT id, kod, ad FROM ana_kategori WHERE aktif ORDER BY sira`); }
async function getIller() { return query<{ id: number; ad: string }>(`SELECT id, ad FROM il ORDER BY ad`); }
async function getKurumTurleri() { return query<{ id: number; ad: string; ana_kategori_id: number }>(`SELECT id, ad, ana_kategori_id FROM kurum_turu WHERE aktif ORDER BY ad`); }
async function getIlceler() { return query<{ id: number; ad: string; il_id: number }>(`SELECT id, ad, il_id FROM ilce ORDER BY ad`); }

async function kurumEkle(formData: FormData) {
  'use server';
  const userId = await aktifKullaniciId();
  if (!userId) redirect('/giris');

  const anaKategoriId = Number(formData.get('ana_kategori_id'));
  const kurumTuruId = Number(formData.get('kurum_turu_id'));
  const ilIdRaw = String(formData.get('il_id') ?? '').trim();
  const ilId = ilIdRaw ? Number(ilIdRaw) : null;
  const ilceIdRaw = String(formData.get('ilce_id') ?? '').trim();
  const ilceId = ilceIdRaw ? Number(ilceIdRaw) : null;
  const ad = String(formData.get('ad') ?? '').trim();
  const kisaAd = String(formData.get('kisa_ad') ?? '').trim() || null;
  const web = String(formData.get('web') ?? '').trim() || null;
  const telefon = String(formData.get('telefon') ?? '').trim() || null;
  const kvkk = String(formData.get('kvkk_hassasiyet') ?? 'KURUMSAL').trim();
  const kaynakTuru = String(formData.get('kaynak_turu') ?? '').trim();
  const kaynakRef = String(formData.get('kaynak_referansi') ?? '').trim();
  const kaynakUrl = String(formData.get('kaynak_url') ?? '').trim() || null;

  if (!anaKategoriId || !kurumTuruId || !ad || !kaynakTuru || !kaynakRef) return;

  const [kaynak] = await query<{ id: number }>(
    `INSERT INTO kaynak (kaynak_turu, kaynak_referansi, kaynak_url, toplama_tarihi, aciklama)
     VALUES ($1::kaynak_turu, $2, $3, CURRENT_DATE, 'UI kurum ekleme formu') RETURNING id`,
    [kaynakTuru, kaynakRef, kaynakUrl]);

  await query(
    `INSERT INTO kurum (ana_kategori_id, kurum_turu_id, il_id, ilce_id, ad, normalize_ad, kisa_ad, web, telefon, kvkk_hassasiyet, kaynak_id)
     VALUES ($1, $2, $3, $4, $5, normalize_tr($5), $6, $7, $8, $9::kvkk_hassasiyet, $10)`,
    [anaKategoriId, kurumTuruId, ilId, ilceId, ad, kisaAd, web, telefon, kvkk, kaynak.id]);

  revalidatePath('/kurumlar');
  redirect('/kurumlar');
}

export default async function KurumEklePage() {
  const [kategoriler, kurumTurleri, iller, ilceler] = await Promise.all([
    getKategoriler(), getKurumTurleri(), getIller(), getIlceler(),
  ]);

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 p-10">
      <div className="max-w-3xl mx-auto">
        <header className="mb-8">
          <Link href="/kurumlar" className="text-sm text-neutral-500 hover:text-neutral-300 mb-2 inline-block">← Kurumlar</Link>
          <h1 className="text-3xl font-bold mb-1">Yeni Kurum Ekle</h1>
          <p className="text-neutral-400 text-sm">Kaynak zorunlu (madde 30)</p>
        </header>

        <form action={kurumEkle} className="space-y-5 rounded-lg border border-neutral-800 bg-neutral-900 p-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase text-neutral-500 font-semibold mb-2">Ana Kategori *</label>
              <select name="ana_kategori_id" required defaultValue="" className="w-full px-3 py-2 rounded-md bg-neutral-950 border border-neutral-800 focus:border-blue-600 focus:outline-none">
                <option value="" disabled>— Seçiniz —</option>
                {kategoriler.map((k) => (<option key={k.id} value={k.id}>{k.ad}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-xs uppercase text-neutral-500 font-semibold mb-2">Kurum Türü *</label>
              <select name="kurum_turu_id" required defaultValue="" className="w-full px-3 py-2 rounded-md bg-neutral-950 border border-neutral-800 focus:border-blue-600 focus:outline-none">
                <option value="" disabled>— Seçiniz —</option>
                {kurumTurleri.map((t) => (<option key={t.id} value={t.id}>{t.ad}</option>))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase text-neutral-500 font-semibold mb-2">İl</label>
              <select name="il_id" defaultValue="" className="w-full px-3 py-2 rounded-md bg-neutral-950 border border-neutral-800 focus:border-blue-600 focus:outline-none">
                <option value="">— Seçiniz —</option>
                {iller.map((i) => (<option key={i.id} value={i.id}>{i.ad}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-xs uppercase text-neutral-500 font-semibold mb-2">İlçe</label>
              <select name="ilce_id" defaultValue="" className="w-full px-3 py-2 rounded-md bg-neutral-950 border border-neutral-800 focus:border-blue-600 focus:outline-none">
                <option value="">— Seçiniz —</option>
                {ilceler.map((i) => (<option key={i.id} value={i.id}>{i.ad}</option>))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs uppercase text-neutral-500 font-semibold mb-2">Kurum Adı *</label>
            <input type="text" name="ad" required className="w-full px-3 py-2 rounded-md bg-neutral-950 border border-neutral-800 focus:border-blue-600 focus:outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase text-neutral-500 font-semibold mb-2">Kısa Ad</label>
              <input type="text" name="kisa_ad" className="w-full px-3 py-2 rounded-md bg-neutral-950 border border-neutral-800 focus:border-blue-600 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs uppercase text-neutral-500 font-semibold mb-2">Telefon</label>
              <input type="text" name="telefon" className="w-full px-3 py-2 rounded-md bg-neutral-950 border border-neutral-800 focus:border-blue-600 focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs uppercase text-neutral-500 font-semibold mb-2">Web</label>
            <input type="url" name="web" className="w-full px-3 py-2 rounded-md bg-neutral-950 border border-neutral-800 focus:border-blue-600 focus:outline-none" />
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
          <div>
            <label className="block text-xs uppercase text-neutral-500 font-semibold mb-2">Kaynak Türü *</label>
            <select name="kaynak_turu" required defaultValue="RESMI_KURUM_SITESI" className="w-full px-3 py-2 rounded-md bg-neutral-950 border border-neutral-800 focus:border-blue-600 focus:outline-none">
              <option value="RESMI_KURUM_SITESI">Resmi Kurum Sitesi</option>
              <option value="SANTRAL_TEYIDI">Santral Teyidi</option>
              <option value="DIREKT_ILETISIM">Direkt İletişim</option>
              <option value="RESMI_BELGE">Resmi Belge</option>
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
            <Link href="/kurumlar" className="px-6 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-md font-medium transition-colors">İptal</Link>
          </div>
        </form>
      </div>
    </main>
  );
}