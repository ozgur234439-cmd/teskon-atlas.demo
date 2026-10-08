import Link from 'next/link';
import { query } from '@/lib/db';
import { notFound } from 'next/navigation';
import { hesaplaRozet, ROZET_STIL } from '@/lib/trust';
import { revalidatePath } from 'next/cache';
import { aktifKullaniciId } from '@/lib/auth';
import ExportButton from '@/components/ExportButton';

export const dynamic = 'force-dynamic';

type KurumSatir = { id: number; kurum_ad: string; ana_kategori: string; kurum_turu: string; il_ad: string | null; ilce_ad: string | null };
type BirimSatir = { birim_id: number; birim_ad: string; makam_sayisi: string };
type MakamSatir = {
  kbm_id: number; birim_id: number; makam_ad: string; makam_sinifi: string; kapsam_kodu: string;
  makam_durumu: string; arastirma_durumu: string;
  kisi_id: number | null; kisi_ad: string | null; atama_id: number | null;
  atama_tipi: string | null; son_trust: number | null; teyit_sayisi: string; son_teyit: string | null;
};
type KanonikMakam = { id: number; kod: string; ad: string; makam_sinifi: string };
type Kapsam = { id: number; kapsam_kodu: string; ad: string };

async function getKurum(id: string): Promise<KurumSatir | null> {
  const [k] = await query<KurumSatir>(
    `SELECT ku.id, ku.ad AS kurum_ad, ak.ad AS ana_kategori, kt.ad AS kurum_turu, il.ad AS il_ad, ilce.ad AS ilce_ad
     FROM kurum ku
     JOIN ana_kategori ak ON ak.id = ku.ana_kategori_id
     JOIN kurum_turu kt ON kt.id = ku.kurum_turu_id
     LEFT JOIN il ON il.id = ku.il_id
     LEFT JOIN ilce ON ilce.id = ku.ilce_id
     WHERE ku.id = $1`, [id]);
  return k ?? null;
}

async function getBirimler(kurum_id: number): Promise<BirimSatir[]> {
  return query<BirimSatir>(
    `SELECT b.id AS birim_id, b.ad AS birim_ad,
       (SELECT COUNT(*)::text FROM kurum_birim_makam kbm WHERE kbm.birim_id = b.id AND kbm.aktif) AS makam_sayisi
     FROM birim b WHERE b.kurum_id = $1 AND b.aktif = TRUE ORDER BY b.ad`, [kurum_id]);
}

async function getMakamlar(kurum_id: number): Promise<MakamSatir[]> {
  return query<MakamSatir>(
    `SELECT kbm.id AS kbm_id, kbm.birim_id, km.ad AS makam_ad, km.makam_sinifi::text AS makam_sinifi,
            ks.kapsam_kodu, kbm.makam_durumu::text AS makam_durumu, kbm.arastirma_durumu::text AS arastirma_durumu,
            ki.id AS kisi_id, ki.ad_soyad AS kisi_ad, a.id AS atama_id, a.atama_tipi::text AS atama_tipi,
            (SELECT sonuc FROM trust_hesaplama th WHERE th.entity_turu = 'ATAMA' AND th.entity_id = a.id
              ORDER BY hesaplama_tarihi DESC LIMIT 1) AS son_trust,
            (SELECT COUNT(*)::text FROM teyit_olayi t WHERE t.atama_id = a.id AND t.teyit_sonucu = 'DOGRULANDI') AS teyit_sayisi,
            (SELECT MAX(t.teyit_tarihi)::text FROM teyit_olayi t WHERE t.atama_id = a.id AND t.teyit_sonucu = 'DOGRULANDI') AS son_teyit
     FROM kurum_birim_makam kbm
     JOIN kanonik_makam km ON km.id = kbm.kanonik_makam_id
     JOIN kapsam ks ON ks.id = kbm.kapsam_id
     LEFT JOIN atama a ON a.kurum_birim_makam_id = kbm.id AND a.aktif = TRUE AND a.atama_durumu = 'AKTIF' AND a.atama_tipi = 'ASIL'
     LEFT JOIN kisi ki ON ki.id = a.kisi_id
     WHERE kbm.kurum_id = $1 AND kbm.aktif = TRUE
     ORDER BY km.makam_sinifi, km.ad`, [kurum_id]);
}

async function getKanonikMakamlar(): Promise<KanonikMakam[]> {
  return query<KanonikMakam>(`SELECT id, kod, ad, makam_sinifi::text AS makam_sinifi FROM kanonik_makam WHERE aktif ORDER BY makam_sinifi, ad`);
}

async function getKapsamlar(): Promise<Kapsam[]> {
  return query<Kapsam>(`SELECT id, kapsam_kodu, ad FROM kapsam WHERE aktif ORDER BY kapsam_turu, ad`);
}

async function birimEkle(formData: FormData) {
  'use server';
  const userId = await aktifKullaniciId();
  if (!userId) return;
  const kurumId = Number(formData.get('kurum_id'));
  const ad = String(formData.get('ad') ?? '').trim();
  const aciklama = String(formData.get('aciklama') ?? '').trim() || null;
  const kaynakTuru = String(formData.get('kaynak_turu') ?? '').trim();
  const kaynakRef = String(formData.get('kaynak_referansi') ?? '').trim();
  const kaynakUrl = String(formData.get('kaynak_url') ?? '').trim() || null;
  if (!kurumId || !ad || !kaynakTuru || !kaynakRef) return;

  const [kaynak] = await query<{ id: number }>(
    `INSERT INTO kaynak (kaynak_turu, kaynak_referansi, kaynak_url, toplama_tarihi, aciklama)
     VALUES ($1::kaynak_turu, $2, $3, CURRENT_DATE, 'UI birim formu') RETURNING id`,
    [kaynakTuru, kaynakRef, kaynakUrl]);

  await query(`INSERT INTO birim (kurum_id, ad, normalize_ad, aciklama, kaynak_id)
               VALUES ($1, $2, normalize_tr($2), $3, $4)`, [kurumId, ad, aciklama, kaynak.id]);
  revalidatePath(`/kurumlar/${kurumId}`);
}

async function kbmEkle(formData: FormData) {
  'use server';
  const userId = await aktifKullaniciId();
  if (!userId) return;
  const kurumId = Number(formData.get('kurum_id'));
  const birimId = Number(formData.get('birim_id'));
  const makamId = Number(formData.get('kanonik_makam_id'));
  const kapsamId = Number(formData.get('kapsam_id'));
  const makamDurumu = String(formData.get('makam_durumu') ?? 'VAR').trim();
  const kaynakTuru = String(formData.get('kaynak_turu') ?? '').trim();
  const kaynakRef = String(formData.get('kaynak_referansi') ?? '').trim();
  const kaynakUrl = String(formData.get('kaynak_url') ?? '').trim() || null;
  if (!kurumId || !birimId || !makamId || !kapsamId || !kaynakTuru || !kaynakRef) return;

  const [kaynak] = await query<{ id: number }>(
    `INSERT INTO kaynak (kaynak_turu, kaynak_referansi, kaynak_url, toplama_tarihi, aciklama)
     VALUES ($1::kaynak_turu, $2, $3, CURRENT_DATE, 'UI kbm formu') RETURNING id`,
    [kaynakTuru, kaynakRef, kaynakUrl]);

  try {
    await query(
      `INSERT INTO kurum_birim_makam (kurum_id, birim_id, kanonik_makam_id, kapsam_id, makam_durumu, arastirma_durumu, kaynak_id)
       VALUES ($1, $2, $3, $4, $5::makam_durumu, 'ARASTIRILMADI', $6)`,
      [kurumId, birimId, makamId, kapsamId, makamDurumu, kaynak.id]);
  } catch (e) { console.error('KBM eklenemedi:', e); }

  revalidatePath(`/kurumlar/${kurumId}`);
  revalidatePath('/operasyon');
  revalidatePath('/');
}

const SINIF_ETIKET: Record<string, string> = {
  A: 'bg-red-950/50 text-red-300 border-red-800',
  B: 'bg-orange-950/50 text-orange-300 border-orange-800',
  C: 'bg-yellow-950/50 text-yellow-300 border-yellow-800',
  D: 'bg-neutral-800 text-neutral-300 border-neutral-700',
};

export default async function KurumDetayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const kurum = await getKurum(id);
  if (!kurum) notFound();

  const [birimler, makamlar, kanonikMakamlar, kapsamlar] = await Promise.all([
    getBirimler(kurum.id), getMakamlar(kurum.id), getKanonikMakamlar(), getKapsamlar(),
  ]);

  const toplamMakam = makamlar.length;
  const bekleyen = makamlar.filter(m => m.arastirma_durumu === 'ARASTIRILMADI').length;
  const bulunan = makamlar.filter(m => m.kisi_ad).length;
  const yesilSayisi = makamlar.filter(m => m.kisi_ad && Number(m.teyit_sayisi) > 0).length;

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 p-10">
      <div className="max-w-5xl mx-auto">
        <header className="mb-8">
          <div className="flex items-start justify-between mb-4 gap-4 flex-wrap">
            <div>
              <Link href="/kurumlar" className="text-sm text-neutral-500 hover:text-neutral-300 mb-2 inline-block">← Kurumlar</Link>
              <h1 className="text-3xl font-bold mb-2">{kurum.kurum_ad}</h1>
              <div className="flex flex-wrap gap-2 text-xs mb-3">
                <span className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-400">{kurum.ana_kategori}</span>
                <span className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-400">{kurum.kurum_turu}</span>
                {kurum.il_ad && <span className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-400">{kurum.il_ad}</span>}
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/kurumlar/${kurum.id}/timeline`}
                  className="inline-block text-xs px-3 py-1.5 rounded-md bg-neutral-800 hover:bg-neutral-700 transition-colors"
                >
                  📜 Kronolojik Geçmiş →
                </Link>
                <ExportButton
                  tur="KURUM_LISTESI"
                  label="📤 Kurum Listesi"
                  className="text-xs px-3 py-1.5 rounded-md bg-amber-900/40 hover:bg-amber-800/60 text-amber-200 border border-amber-800/50 transition-colors"
                />
              </div>
            </div>
            <div className="flex gap-4 text-right">
              <div>
                <div className="text-xs text-neutral-500 mb-1">Makam</div>
                <div className="text-2xl font-bold">{toplamMakam}</div>
              </div>
              <div>
                <div className="text-xs text-neutral-500 mb-1">Kişi Bulundu</div>
                <div className="text-2xl font-bold text-green-400">{bulunan}</div>
              </div>
              <div>
                <div className="text-xs text-neutral-500 mb-1">Teyitli</div>
                <div className="text-2xl font-bold text-green-500">{yesilSayisi}</div>
              </div>
              <div>
                <div className="text-xs text-neutral-500 mb-1">Bekleyen</div>
                <div className="text-2xl font-bold text-amber-400">{bekleyen}</div>
              </div>
            </div>
          </div>
        </header>

        <details className="rounded-lg border border-neutral-800 bg-neutral-900 mb-6">
          <summary className="px-5 py-3 cursor-pointer hover:bg-neutral-800/50 transition-colors font-medium text-sm">+ Birim Ekle</summary>
          <form action={birimEkle} className="p-5 border-t border-neutral-800 space-y-4">
            <input type="hidden" name="kurum_id" value={kurum.id} />
            <div>
              <label className="block text-xs uppercase text-neutral-500 font-semibold mb-2">Birim Adı *</label>
              <input type="text" name="ad" required className="w-full px-3 py-2 rounded-md bg-neutral-950 border border-neutral-800 focus:border-blue-600 focus:outline-none" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase text-neutral-500 font-semibold mb-2">Kaynak Türü *</label>
                <select name="kaynak_turu" required defaultValue="RESMI_KURUM_SITESI" className="w-full px-3 py-2 rounded-md bg-neutral-950 border border-neutral-800 focus:border-blue-600 focus:outline-none">
                  <option value="RESMI_KURUM_SITESI">Resmi Kurum Sitesi</option>
                  <option value="SANTRAL_TEYIDI">Santral Teyidi</option>
                  <option value="RESMI_BELGE">Resmi Belge</option>
                </select>
              </div>
              <div>
                <label className="block text-xs uppercase text-neutral-500 font-semibold mb-2">Kaynak Referansı *</label>
                <input type="text" name="kaynak_referansi" required className="w-full px-3 py-2 rounded-md bg-neutral-950 border border-neutral-800 focus:border-blue-600 focus:outline-none" />
              </div>
            </div>
            <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-md font-medium transition-colors">Kaydet</button>
          </form>
        </details>

        <div className="space-y-6">
          {birimler.map((b) => {
            const birimMakamlar = makamlar.filter(m => m.birim_id === b.birim_id);
            return (
              <div key={b.birim_id} className="rounded-lg border border-neutral-800 bg-neutral-900 overflow-hidden">
                <div className="px-5 py-3 border-b border-neutral-800 bg-neutral-950/50 flex items-center justify-between">
                  <h2 className="font-semibold text-sm">{b.birim_ad}</h2>
                  <span className="text-xs text-neutral-500">{b.makam_sayisi} makam</span>
                </div>
                <div className="divide-y divide-neutral-800">
                  {birimMakamlar.length === 0 ? (
                    <div className="px-5 py-3 text-sm text-neutral-600">Bu birimde makam kaydı yok</div>
                  ) : birimMakamlar.map((m) => {
                    const sR = SINIF_ETIKET[m.makam_sinifi] ?? SINIF_ETIKET.D;
                    const kisiVar = m.kisi_ad !== null;
                    const teyitSayisi = Number(m.teyit_sayisi);
                    const rozet = hesaplaRozet(m.son_trust, teyitSayisi);
                    const rz = ROZET_STIL[rozet];
                    const tooltip = m.son_trust !== null ? `Trust: ${m.son_trust} · Teyit: ${teyitSayisi}` : 'Trust hesaplanmadı';
                    return (
                      <div key={m.kbm_id} className="px-5 py-3 hover:bg-neutral-800/30 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className={`text-xs px-2 py-0.5 rounded border ${sR}`}>{m.makam_sinifi}</span>
                            <span className="text-neutral-100">{m.makam_ad}</span>
                            <span className="text-xs text-neutral-600">· {m.kapsam_kodu}</span>
                            {kisiVar ? (
                              <>
                                <span className="text-neutral-600 mx-1">→</span>
                                <Link href={`/kisiler/${m.kisi_id}`} className="text-blue-300 hover:text-blue-200 font-medium">{m.kisi_ad}</Link>
                                <span className={`text-xs px-2 py-0.5 rounded font-semibold ${rz.bg}`} title={tooltip}>
                                  {rz.label}{m.son_trust !== null && <> · {m.son_trust}</>}{teyitSayisi > 0 && <> · {teyitSayisi}✓</>}
                                </span>
                              </>
                            ) : (
                              <span className="text-xs px-2 py-0.5 rounded bg-amber-950/40 text-amber-400 border border-amber-800">Bekliyor</span>
                            )}
                          </div>
                          {kisiVar && m.atama_id && (
                            <Link href={`/teyit/${m.atama_id}`} className="text-xs px-3 py-1 rounded-md bg-neutral-800 hover:bg-neutral-700 transition-colors whitespace-nowrap">
                              {teyitSayisi > 0 ? 'Tekrar Teyit' : 'Teyit Et'}
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <details className="border-t border-neutral-800">
                  <summary className="px-5 py-2.5 cursor-pointer hover:bg-neutral-800/50 transition-colors text-xs text-neutral-400 hover:text-neutral-200">+ Makam Ekle</summary>
                  <form action={kbmEkle} className="px-5 py-4 space-y-3 bg-neutral-950/40">
                    <input type="hidden" name="kurum_id" value={kurum.id} />
                    <input type="hidden" name="birim_id" value={b.birim_id} />
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs uppercase text-neutral-500 font-semibold mb-2">Kanonik Makam *</label>
                        <select name="kanonik_makam_id" required defaultValue="" className="w-full px-3 py-2 rounded-md bg-neutral-950 border border-neutral-800 focus:border-blue-600 focus:outline-none text-sm">
                          <option value="" disabled>— Seçiniz —</option>
                          {kanonikMakamlar.map((km) => (<option key={km.id} value={km.id}>[{km.makam_sinifi}] {km.ad}</option>))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs uppercase text-neutral-500 font-semibold mb-2">Kapsam *</label>
                        <select name="kapsam_id" required defaultValue="" className="w-full px-3 py-2 rounded-md bg-neutral-950 border border-neutral-800 focus:border-blue-600 focus:outline-none text-sm">
                          <option value="" disabled>— Seçiniz —</option>
                          {kapsamlar.map((k) => (<option key={k.id} value={k.id}>{k.kapsam_kodu}</option>))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs uppercase text-neutral-500 font-semibold mb-2">Makam Durumu *</label>
                      <select name="makam_durumu" required defaultValue="VAR" className="w-full px-3 py-2 rounded-md bg-neutral-950 border border-neutral-800 focus:border-blue-600 focus:outline-none text-sm">
                        <option value="VAR">VAR</option>
                        <option value="YOK">YOK</option>
                        <option value="BILINMIYOR">BILINMIYOR</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs uppercase text-neutral-500 font-semibold mb-2">Kaynak Türü *</label>
                        <select name="kaynak_turu" required defaultValue="RESMI_KURUM_SITESI" className="w-full px-3 py-2 rounded-md bg-neutral-950 border border-neutral-800 focus:border-blue-600 focus:outline-none text-sm">
                          <option value="RESMI_KURUM_SITESI">Resmi Kurum Sitesi</option>
                          <option value="SANTRAL_TEYIDI">Santral Teyidi</option>
                          <option value="RESMI_BELGE">Resmi Belge</option>
                          <option value="IKINCIL_KAYNAK">İkincil Kaynak</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs uppercase text-neutral-500 font-semibold mb-2">Kaynak Referansı *</label>
                        <input type="text" name="kaynak_referansi" required className="w-full px-3 py-2 rounded-md bg-neutral-950 border border-neutral-800 focus:border-blue-600 focus:outline-none text-sm" />
                      </div>
                    </div>
                    <button type="submit" className="px-5 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-md text-sm font-medium transition-colors">Makam Kaydet</button>
                  </form>
                </details>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}