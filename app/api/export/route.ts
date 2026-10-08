// TESKON Atlas V1 — Export API (madde 88)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { aktifKullanici, rolYeterli } from '@/lib/auth';
import { auditYaz, systemEventYaz } from '@/lib/audit';

export const dynamic = 'force-dynamic';

function csvSatir(degerler: (string | number | null | undefined)[]): string {
  return degerler
    .map((d) => {
      const s = d == null ? '' : String(d);
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    })
    .join(',');
}

async function getKurumListesi() {
  const rows = await query<{
    id: number; ad: string; ana_kategori: string; kurum_turu: string;
    il_ad: string | null; ilce_ad: string | null;
    birim_sayisi: string; makam_sayisi: string; bekleyen: string;
  }>(`
    SELECT ku.id, ku.ad,
      ak.ad AS ana_kategori, kt.ad AS kurum_turu,
      il.ad AS il_ad, ilce.ad AS ilce_ad,
      (SELECT COUNT(*)::text FROM birim b WHERE b.kurum_id = ku.id AND b.aktif) AS birim_sayisi,
      (SELECT COUNT(*)::text FROM kurum_birim_makam kbm WHERE kbm.kurum_id = ku.id AND kbm.aktif) AS makam_sayisi,
      (SELECT COUNT(*)::text FROM kurum_birim_makam kbm WHERE kbm.kurum_id = ku.id AND kbm.aktif AND kbm.arastirma_durumu = 'ARASTIRILMADI') AS bekleyen
    FROM kurum ku
    JOIN ana_kategori ak ON ak.id = ku.ana_kategori_id
    JOIN kurum_turu kt ON kt.id = ku.kurum_turu_id
    LEFT JOIN il ON il.id = ku.il_id
    LEFT JOIN ilce ON ilce.id = ku.ilce_id
    WHERE ku.aktif
    ORDER BY ku.ad
  `);

  const header = csvSatir(['Kurum Adı', 'Ana Kategori', 'Kurum Türü', 'İl', 'İlçe', 'Birim Sayısı', 'Makam Sayısı', 'Bekleyen']);
  const lines = rows.map((r) =>
    csvSatir([r.ad, r.ana_kategori, r.kurum_turu, r.il_ad, r.ilce_ad, r.birim_sayisi, r.makam_sayisi, r.bekleyen])
  );
  return { csv: [header, ...lines].join('\n'), sayi: rows.length };
}

async function getKisiListesi() {
  const rows = await query<{
    id: number; ad_soyad: string;
    makam_ad: string | null; kurum_ad: string | null;
    atama_durumu: string | null; atama_tipi: string | null;
    iletisim_deger: string | null; iletisim_kanal: string | null;
    kvkk: string;
    teyit_sayisi: string; son_trust: number | null;
  }>(`
    SELECT k.id, k.ad_soyad, k.kvkk_hassasiyet::text AS kvkk,
      km.ad AS makam_ad, kr.ad AS kurum_ad,
      a.atama_durumu::text AS atama_durumu, a.atama_tipi::text AS atama_tipi,
      (SELECT deger FROM iletisim i WHERE i.kisi_id = k.id AND i.aktif AND i.rol = 'ASIL' LIMIT 1) AS iletisim_deger,
      (SELECT iletisim_kanali FROM iletisim i WHERE i.kisi_id = k.id AND i.aktif AND i.rol = 'ASIL' LIMIT 1) AS iletisim_kanal,
      (SELECT COUNT(*)::text FROM teyit_olayi t JOIN atama a2 ON a2.id = t.atama_id WHERE a2.kisi_id = k.id AND t.teyit_sonucu = 'DOGRULANDI') AS teyit_sayisi,
      (SELECT sonuc FROM trust_hesaplama th WHERE th.entity_turu = 'ATAMA' AND th.entity_id = a.id ORDER BY hesaplama_tarihi DESC LIMIT 1) AS son_trust
    FROM kisi k
    LEFT JOIN atama a ON a.kisi_id = k.id AND a.aktif AND a.atama_durumu = 'AKTIF' AND a.atama_tipi = 'ASIL'
    LEFT JOIN kurum_birim_makam kbm ON kbm.id = a.kurum_birim_makam_id
    LEFT JOIN kanonik_makam km ON km.id = kbm.kanonik_makam_id
    LEFT JOIN kurum kr ON kr.id = kbm.kurum_id
    WHERE k.aktif
    ORDER BY k.ad_soyad
  `);

  const header = csvSatir(['Ad Soyad', 'Makam', 'Kurum', 'Atama Durumu', 'Atama Tipi', 'İletişim Kanalı', 'İletişim', 'KVKK', 'Teyit Sayısı', 'Trust']);
  const lines = rows.map((r) =>
    csvSatir([r.ad_soyad, r.makam_ad, r.kurum_ad, r.atama_durumu, r.atama_tipi, r.iletisim_kanal, r.iletisim_deger, r.kvkk, r.teyit_sayisi, r.son_trust])
  );
  return { csv: [header, ...lines].join('\n'), sayi: rows.length };
}

async function getMakamDurumu() {
  const rows = await query<{
    kurum_ad: string; birim_ad: string; makam_ad: string;
    makam_sinifi: string; kapsam_kodu: string;
    makam_durumu: string; arastirma_durumu: string;
    kisi_ad: string | null;
  }>(`
    SELECT kr.ad AS kurum_ad, b.ad AS birim_ad, km.ad AS makam_ad,
      km.makam_sinifi::text AS makam_sinifi, ks.kapsam_kodu,
      kbm.makam_durumu::text AS makam_durumu, kbm.arastirma_durumu::text AS arastirma_durumu,
      k.ad_soyad AS kisi_ad
    FROM kurum_birim_makam kbm
    JOIN kurum kr ON kr.id = kbm.kurum_id
    JOIN birim b ON b.id = kbm.birim_id
    JOIN kanonik_makam km ON km.id = kbm.kanonik_makam_id
    JOIN kapsam ks ON ks.id = kbm.kapsam_id
    LEFT JOIN atama a ON a.kurum_birim_makam_id = kbm.id AND a.aktif AND a.atama_durumu = 'AKTIF' AND a.atama_tipi = 'ASIL'
    LEFT JOIN kisi k ON k.id = a.kisi_id
    WHERE kbm.aktif
    ORDER BY kr.ad, b.ad, km.makam_sinifi, km.ad
  `);

  const header = csvSatir(['Kurum', 'Birim', 'Makam', 'Sınıf', 'Kapsam', 'Makam Durumu', 'Araştırma Durumu', 'Kişi']);
  const lines = rows.map((r) =>
    csvSatir([r.kurum_ad, r.birim_ad, r.makam_ad, r.makam_sinifi, r.kapsam_kodu, r.makam_durumu, r.arastirma_durumu, r.kisi_ad])
  );
  return { csv: [header, ...lines].join('\n'), sayi: rows.length };
}

async function getTrustRaporu() {
  const rows = await query<{
    kisi_ad: string; makam_ad: string; kurum_ad: string;
    atama_durumu: string; atama_tipi: string;
    son_trust: number | null; teyit_sayisi: string; son_teyit: string | null;
  }>(`
    SELECT k.ad_soyad AS kisi_ad, km.ad AS makam_ad, kr.ad AS kurum_ad,
      a.atama_durumu::text AS atama_durumu, a.atama_tipi::text AS atama_tipi,
      (SELECT sonuc FROM trust_hesaplama th WHERE th.entity_turu = 'ATAMA' AND th.entity_id = a.id ORDER BY hesaplama_tarihi DESC LIMIT 1) AS son_trust,
      (SELECT COUNT(*)::text FROM teyit_olayi t WHERE t.atama_id = a.id AND t.teyit_sonucu = 'DOGRULANDI') AS teyit_sayisi,
      (SELECT MAX(teyit_tarihi)::text FROM teyit_olayi t WHERE t.atama_id = a.id AND t.teyit_sonucu = 'DOGRULANDI') AS son_teyit
    FROM atama a
    JOIN kisi k ON k.id = a.kisi_id
    JOIN kurum_birim_makam kbm ON kbm.id = a.kurum_birim_makam_id
    JOIN kanonik_makam km ON km.id = kbm.kanonik_makam_id
    JOIN kurum kr ON kr.id = kbm.kurum_id
    WHERE a.aktif AND a.atama_durumu = 'AKTIF' AND a.atama_tipi = 'ASIL'
    ORDER BY son_trust DESC NULLS LAST
  `);

  const header = csvSatir(['Kişi', 'Makam', 'Kurum', 'Atama Durumu', 'Atama Tipi', 'Trust', 'Teyit Sayısı', 'Son Teyit']);
  const lines = rows.map((r) =>
    csvSatir([r.kisi_ad, r.makam_ad, r.kurum_ad, r.atama_durumu, r.atama_tipi, r.son_trust, r.teyit_sayisi, r.son_teyit])
  );
  return { csv: [header, ...lines].join('\n'), sayi: rows.length };
}

export async function GET(request: NextRequest) {
  const kullanici = await aktifKullanici();
  if (!kullanici) {
    return new NextResponse('Yetkisiz', { status: 401 });
  }

  const yetkili = rolYeterli(kullanici.rol, 'EXPORTER') || kullanici.hassas_export_yetkisi;
  if (!yetkili) {
    await auditYaz({
      userId: kullanici.id,
      islem: 'EXPORT',
      tablo: 'export_log',
      kayitId: null,
      yeniDeger: { reddedildi: true, sebep: 'yetki_yok' },
    });
    return new NextResponse('Bu işlem için yetkiniz yok', { status: 403 });
  }

  const url = new URL(request.url);
  const tur = url.searchParams.get('tur');
  const gerekce = url.searchParams.get('gerekce') ?? '';

  if (!gerekce || gerekce.trim().length < 5) {
    return new NextResponse('Gerekçe zorunludur (min 5 karakter)', { status: 400 });
  }

  let sonuc: { csv: string; sayi: number };
  if (tur === 'KURUM_LISTESI') sonuc = await getKurumListesi();
  else if (tur === 'KISI_LISTESI') sonuc = await getKisiListesi();
  else if (tur === 'MAKAM_DURUMU') sonuc = await getMakamDurumu();
  else if (tur === 'TRUST_RAPORU') sonuc = await getTrustRaporu();
  else return new NextResponse('Geçersiz export türü', { status: 400 });

  // Export log
  await query(
    `INSERT INTO export_log (org_id, user_id, gerekce, export_turu, kayit_sayisi)
     VALUES ($1, $2, $3, $4, $5)`,
    [kullanici.org_id, kullanici.id, gerekce.trim(), tur, sonuc.sayi]
  );

  // Audit log
  await auditYaz({
    userId: kullanici.id,
    islem: 'EXPORT',
    tablo: 'export_log',
    kayitId: null,
    yeniDeger: { tur, kayit_sayisi: sonuc.sayi, gerekce: gerekce.trim() },
  });

  // System event
  await systemEventYaz({
    userId: kullanici.id,
    eventTuru: 'EXPORT_YAPILDI',
    detay: { tur, sayi: sonuc.sayi },
  });

  // UTF-8 BOM ekle (Excel Türkçe karakter uyumu için)
  const bom = '\uFEFF';
  const dosyaAdi = `${tur}_${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(bom + sonuc.csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${dosyaAdi}"`,
    },
  });
}