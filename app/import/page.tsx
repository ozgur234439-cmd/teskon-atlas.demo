import Link from 'next/link';
import { query } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { aktifKullaniciId } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const KAYNAK_TURLERI = [
  'RESMI_KURUM_SITESI',
  'SANTRAL_TEYIDI',
  'DIREKT_ILETISIM',
  'RESMI_BELGE',
  'INSAN_TEYIDI',
  'SAHA_GORUSMESI',
  'IKINCIL_KAYNAK',
  'AI_ADAYI',
  'DIGER',
] as const;

type ImportSonuc = {
  basarili: number;
  karantina: number;
  hatalar: { satir: string; neden: string; aciklama: string }[];
};

async function importEt(formData: FormData): Promise<ImportSonuc> {
  'use server';

  const icerik = String(formData.get('icerik') ?? '').trim();
  if (!icerik) return { basarili: 0, karantina: 0, hatalar: [] };

  const userId = await aktifKullaniciId();
  if (!userId) return { basarili: 0, karantina: 0, hatalar: [] };

  const [org] = await query<{ id: number }>(`SELECT id FROM organizasyon WHERE kod = 'TESKON' LIMIT 1`);
  if (!org) return { basarili: 0, karantina: 0, hatalar: [] };

  const satirlar = icerik.split('\n').map(s => s.trim()).filter(s => s && !s.startsWith('#'));
  const [batch] = await query<{ id: number }>(
    `INSERT INTO import_batch (org_id, yukleyen_user_id, dosya_adi, dosya_turu, satir_sayisi, durum)
     VALUES ($1, $2, 'pano-yapistir', 'CSV_PIPE', $3, 'INCELEMEDE')
     RETURNING id`,
    [org.id, userId, satirlar.length]);

  let basarili = 0;
  let karantinaSayisi = 0;
  const hatalar: ImportSonuc['hatalar'] = [];

  for (const satir of satirlar) {
    const parcalar = satir.split('|').map(p => p.trim());
    if (parcalar.length !== 5) {
      karantinaSayisi++;
      hatalar.push({ satir, neden: 'FORMAT_HATASI', aciklama: 'Beklenen 5 alan, ' + parcalar.length + ' bulundu' });
      await query(
        `INSERT INTO import_karantina (import_batch_id, ham_veri, karantina_nedeni, aciklama)
         VALUES ($1, $2::jsonb, 'FORMAT_HATASI', $3)`,
        [batch.id, JSON.stringify({ satir }), 'Beklenen 5 alan']);
      continue;
    }

    const [adSoyad, kurumAd, makamAd, kaynakTuru, kaynakRef] = parcalar;

    if (!adSoyad || !kurumAd || !makamAd || !kaynakTuru || !kaynakRef) {
      karantinaSayisi++;
      hatalar.push({ satir, neden: 'FORMAT_HATASI', aciklama: 'Boş alan var' });
      await query(
        `INSERT INTO import_karantina (import_batch_id, ham_veri, karantina_nedeni, aciklama)
         VALUES ($1, $2::jsonb, 'FORMAT_HATASI', 'Bos alan')`,
        [batch.id, JSON.stringify(parcalar)]);
      continue;
    }

    if (!KAYNAK_TURLERI.includes(kaynakTuru as any)) {
      karantinaSayisi++;
      hatalar.push({ satir, neden: 'FORMAT_HATASI', aciklama: `Gecersiz kaynak turu: ${kaynakTuru}` });
      await query(
        `INSERT INTO import_karantina (import_batch_id, ham_veri, karantina_nedeni, aciklama)
         VALUES ($1, $2::jsonb, 'FORMAT_HATASI', $3)`,
        [batch.id, JSON.stringify(parcalar), `Gecersiz kaynak turu: ${kaynakTuru}`]);
      continue;
    }

    const kurumlar = await query<{ id: number }>(
      `SELECT id FROM kurum WHERE normalize_ad = normalize_tr($1) AND aktif LIMIT 1`, [kurumAd]);
    if (kurumlar.length === 0) {
      karantinaSayisi++;
      hatalar.push({ satir, neden: 'KURUM_ESLESMEDI', aciklama: `Kurum bulunamadi: ${kurumAd}` });
      await query(
        `INSERT INTO import_karantina (import_batch_id, ham_veri, karantina_nedeni, aciklama)
         VALUES ($1, $2::jsonb, 'KURUM_ESLESMEDI', $3)`,
        [batch.id, JSON.stringify(parcalar), `Kurum bulunamadi: ${kurumAd}`]);
      continue;
    }
    const kurumId = kurumlar[0].id;

    const kbmler = await query<{ id: number }>(
      `SELECT kbm.id FROM kurum_birim_makam kbm
       JOIN kanonik_makam km ON km.id = kbm.kanonik_makam_id
       WHERE kbm.kurum_id = $1 AND normalize_tr(km.ad) = normalize_tr($2) AND kbm.aktif
       LIMIT 1`,
      [kurumId, makamAd]);
    if (kbmler.length === 0) {
      karantinaSayisi++;
      hatalar.push({ satir, neden: 'MAKAM_ESLESMEDI', aciklama: `Makam bulunamadi: ${makamAd}` });
      await query(
        `INSERT INTO import_karantina (import_batch_id, ham_veri, karantina_nedeni, aciklama)
         VALUES ($1, $2::jsonb, 'MAKAM_ESLESMEDI', $3)`,
        [batch.id, JSON.stringify(parcalar), `Makam bulunamadi: ${makamAd}`]);
      continue;
    }
    const kbmId = kbmler[0].id;

    try {
      const [kaynak] = await query<{ id: number }>(
        `INSERT INTO kaynak (kaynak_turu, kaynak_referansi, toplama_tarihi, aciklama)
         VALUES ($1::kaynak_turu, $2, CURRENT_DATE, 'Toplu import')
         RETURNING id`,
        [kaynakTuru, kaynakRef]);

      let kisiId: number;
      const mevcutKisi = await query<{ id: number }>(
        `SELECT id FROM kisi WHERE normalize_ad = normalize_tr($1) LIMIT 1`, [adSoyad]);
      if (mevcutKisi.length > 0) {
        kisiId = mevcutKisi[0].id;
      } else {
        const [kisi] = await query<{ id: number }>(
          `INSERT INTO kisi (ad_soyad, normalize_ad, kvkk_hassasiyet)
           VALUES ($1, normalize_tr($1), 'KISISEL_ACIK_KAYNAK')
           RETURNING id`,
          [adSoyad]);
        kisiId = kisi.id;
      }

      await query(
        `INSERT INTO atama (kurum_birim_makam_id, kisi_id, atama_durumu, atama_tipi,
                            baslangic_tarihi, kaynak_id, aciklama)
         VALUES ($1, $2, 'AKTIF', 'ASIL', CURRENT_DATE, $3, 'Toplu import')`,
        [kbmId, kisiId, kaynak.id]);

      await query(
        `UPDATE kurum_birim_makam SET arastirma_durumu = 'KISI_BULUNDU' WHERE id = $1`,
        [kbmId]);

      basarili++;
    } catch (e: any) {
      karantinaSayisi++;
      const neden = String(e?.code) === '23505' ? 'DUPLICATE_SUPHESI' : 'FORMAT_HATASI';
      hatalar.push({ satir, neden, aciklama: e?.message?.substring(0, 200) ?? 'Bilinmeyen hata' });
      await query(
        `INSERT INTO import_karantina (import_batch_id, ham_veri, karantina_nedeni, aciklama)
         VALUES ($1, $2::jsonb, $3, $4)`,
        [batch.id, JSON.stringify(parcalar), neden, e?.message?.substring(0, 200) ?? 'Bilinmeyen hata']);
    }
  }

  await query(
    `UPDATE import_batch SET basarili_sayisi = $1, karantina_sayisi = $2, durum = 'TAMAMLANDI'
     WHERE id = $3`,
    [basarili, karantinaSayisi, batch.id]);

  revalidatePath('/import');
  revalidatePath('/kisiler');
  revalidatePath('/kurumlar');
  revalidatePath('/operasyon');
  revalidatePath('/');

  return { basarili, karantina: karantinaSayisi, hatalar: hatalar.slice(0, 20) };
}

async function getSonBatchler() {
  return query<{
    id: number; dosya_adi: string; satir_sayisi: number;
    basarili_sayisi: number; karantina_sayisi: number;
    durum: string; created_at: string; yukleyen_ad: string;
  }>(`
    SELECT b.id, b.dosya_adi, b.satir_sayisi, b.basarili_sayisi, b.karantina_sayisi,
           b.durum::text AS durum, b.created_at::text AS created_at, ku.ad_soyad AS yukleyen_ad
    FROM import_batch b
    JOIN kullanici ku ON ku.id = b.yukleyen_user_id
    ORDER BY b.created_at DESC
    LIMIT 10
  `);
}

async function getKarantinaOzet() {
  const [r] = await query<{ toplam: number; cozulmemis: number }>(`
    SELECT COUNT(*)::int AS toplam,
           COUNT(*) FILTER (WHERE NOT cozuldu)::int AS cozulmemis
    FROM import_karantina
  `);
  return r;
}

async function importSubmit(formData: FormData) {
  'use server';
  const sonuc = await importEt(formData);
  const userId = await aktifKullaniciId();
  if (userId) {
    await query(
      `INSERT INTO system_event (event_turu, event_aktoru_id, event_detay)
       VALUES ('IMPORT_TAMAM', $1, $2::jsonb)`,
      [userId, JSON.stringify(sonuc)]);
  }
  revalidatePath('/import');
}

export default async function ImportPage() {
  const [batchler, karantinaOzet] = await Promise.all([getSonBatchler(), getKarantinaOzet()]);

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 p-10">
      <div className="max-w-5xl mx-auto">
        <header className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-1">Toplu Import</h1>
            <p className="text-neutral-400 text-sm">
              CSV/pipe formatında kişi listesi yapıştır — madde 62-64
            </p>
          </div>
          {karantinaOzet.cozulmemis > 0 && (
            <div className="text-right">
              <div className="text-xs text-neutral-500 mb-1">Karantina</div>
              <div className="text-2xl font-bold text-red-400">{karantinaOzet.cozulmemis}</div>
            </div>
          )}
        </header>

        <section className="mb-8 rounded-lg border border-neutral-800 bg-neutral-900 p-6">
          <h2 className="text-sm font-semibold mb-4">Format</h2>
          <div className="text-xs text-neutral-400 mb-4 space-y-1 font-mono bg-neutral-950 p-3 rounded border border-neutral-800 overflow-x-auto">
            <div className="text-neutral-500"># Ad Soyad | Kurum Adı | Makam Adı | Kaynak Türü | Kaynak Referansı</div>
            <div>Ahmet Yilmaz | Ankara Buyuksehir Belediyesi | İmar Müdürü | RESMI_KURUM_SITESI | 06.10.2026 site</div>
            <div>Ayse Kaya | DSI 5. Bolge Mudurlugu | Bölge Müdürü | SANTRAL_TEYIDI | 06.10.2026 santral</div>
          </div>
          <div className="text-xs text-neutral-500">
            <strong className="text-neutral-400">Kaynak türleri:</strong>{' '}
            {KAYNAK_TURLERI.join(' · ')}
          </div>
        </section>

        <form action={importSubmit} className="space-y-4">
          <div>
            <label className="block text-xs uppercase text-neutral-500 font-semibold mb-2">
              Kişi Listesi (her satır bir kişi)
            </label>
            <textarea
              name="icerik"
              required
              rows={10}
              placeholder="Ad Soyad | Kurum Adı | Makam Adı | Kaynak Türü | Kaynak Referansı&#10;..."
              className="w-full px-3 py-2 rounded-md bg-neutral-950 border border-neutral-800 focus:border-blue-600 focus:outline-none font-mono text-sm resize-y"
            />
          </div>
          <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-md font-medium transition-colors">
            Import Et
          </button>
        </form>

        {batchler.length > 0 && (
          <section className="mt-10">
            <h2 className="text-xs uppercase text-neutral-500 font-semibold mb-3">
              Son Import Geçmişi ({batchler.length})
            </h2>
            <div className="space-y-2">
              {batchler.map((b) => (
                <div key={b.id} className="p-4 rounded-lg border border-neutral-800 bg-neutral-900 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium mb-1">
                      {b.dosya_adi}
                      <span className="text-xs text-neutral-500 ml-2">{b.satir_sayisi} satır</span>
                    </div>
                    <div className="text-xs text-neutral-500">
                      {b.yukleyen_ad} · {new Date(b.created_at).toLocaleString('tr-TR')}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    {Number(b.basarili_sayisi) > 0 && (
                      <span className="px-2 py-1 rounded bg-green-950/40 text-green-400 border border-green-800">
                        ✓ {b.basarili_sayisi} başarılı
                      </span>
                    )}
                    {Number(b.karantina_sayisi) > 0 && (
                      <span className="px-2 py-1 rounded bg-red-950/40 text-red-400 border border-red-800">
                        ⚠ {b.karantina_sayisi} karantina
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {karantinaOzet.cozulmemis > 0 && (
          <section className="mt-10">
            <h2 className="text-xs uppercase text-neutral-500 font-semibold mb-3">
              Karantina Kayıtları ({karantinaOzet.cozulmemis})
            </h2>
            <Link
              href="/import/karantina"
              className="inline-block px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-md text-sm font-medium transition-colors"
            >
              Karantina Sayfasına Git →
            </Link>
          </section>
        )}
      </div>
    </main>
  );
}