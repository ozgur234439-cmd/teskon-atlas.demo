'use server';
import { query } from '@/lib/db';
import { aktifKullanici } from '@/lib/auth';
import { auditYaz } from '@/lib/audit';
import { hesaplaTrustDetay, hesaplaRozet, TRUST_KURAL_VERSIYON } from '@/lib/trust';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function teyitKaydet(formData: FormData) {
  const kullanici = await aktifKullanici();
  if (!kullanici) redirect('/giris');

  const atamaId = Number(formData.get('atama_id'));
  const teyitTuru = String(formData.get('teyit_turu') ?? '').trim();
  const teyitSonucu = String(formData.get('teyit_sonucu') ?? '').trim();
  const notlar = String(formData.get('notlar') ?? '').trim() || null;
  const kaynakTuru = String(formData.get('kaynak_turu') ?? '').trim();
  const kaynakReferansi = String(formData.get('kaynak_referansi') ?? '').trim();
  const kaynakUrl = String(formData.get('kaynak_url') ?? '').trim() || null;

  if (!atamaId || !teyitTuru || !teyitSonucu || !kaynakTuru || !kaynakReferansi) return;

  const [atama] = await query<{
    id: number;
    kisi_id: number;
    makam_sinifi: string;
    atama_durumu: string;
  }>(`
    SELECT a.id, a.kisi_id, km.makam_sinifi::text AS makam_sinifi,
           a.atama_durumu::text AS atama_durumu
    FROM atama a
    JOIN kurum_birim_makam kbm ON kbm.id = a.kurum_birim_makam_id
    JOIN kanonik_makam km ON km.id = kbm.kanonik_makam_id
    WHERE a.id = $1
  `, [atamaId]);

  if (!atama) return;

  const oncekiTeyitler = await query<{ teyit_sonucu: string }>(`
    SELECT t.teyit_sonucu::text AS teyit_sonucu
    FROM teyit_olayi t
    WHERE t.atama_id = $1
    ORDER BY t.teyit_tarihi DESC, t.id DESC
    LIMIT 2
  `, [atamaId]);

  const [kaynak] = await query<{ id: number }>(`
    INSERT INTO kaynak (kaynak_turu, kaynak_referansi, kaynak_url, toplama_tarihi, aciklama)
    VALUES ($1::kaynak_turu, $2, $3, CURRENT_DATE, 'UI /teyit formu')
    RETURNING id
  `, [kaynakTuru, kaynakReferansi, kaynakUrl]);

  const [teyit] = await query<{ id: number }>(`
    INSERT INTO teyit_olayi (atama_id, teyit_eden_user_id, teyit_turu, teyit_sonucu,
                              teyit_tarihi, kaynak_id, notlar)
    VALUES ($1, $2, $3::teyit_turu, $4::teyit_sonucu, CURRENT_DATE, $5, $6)
    RETURNING id
  `, [atamaId, kullanici.id, teyitTuru, teyitSonucu, kaynak.id, notlar]);

  // Trust hesapla — DÜZELTİLMİŞ: yeni teyit listenin başında
  const trustDetay = hesaplaTrustDetay({
    kaynak_turu: kaynakTuru,
    teyit_sonucu: teyitSonucu,
    teyit_tarihi: new Date(),
    atama_durumu: atama.atama_durumu,
    makam_sinifi: atama.makam_sinifi,
    onceki_teyitler: [{ teyit_sonucu: teyitSonucu }, ...oncekiTeyitler],
  });

  const [kural] = await query<{ id: number }>(`
    SELECT id FROM trust_kurali_versiyonu WHERE versiyon = $1 LIMIT 1
  `, [TRUST_KURAL_VERSIYON]);

  if (kural) {
    await query(`
      INSERT INTO trust_hesaplama (entity_turu, entity_id, kural_versiyonu_id,
                                    girdiler, sonuc, hesaplayan_user_id)
      VALUES ('ATAMA', $1, $2, $3::jsonb, $4, $5)
    `, [atamaId, kural.id, JSON.stringify({
      kaynak_turu: kaynakTuru,
      teyit_sonucu: teyitSonucu,
      teyit_tarihi: new Date().toISOString(),
      makam_sinifi: atama.makam_sinifi,
      kaynak_gucu: trustDetay.kaynak_gucu,
      guncellik: trustDetay.guncellik,
      atama_katsayi: trustDetay.atama_katsayi,
      teyit_cezasi: trustDetay.teyit_cezasi,
      celiski_carpani: trustDetay.celiski_carpani,
      aciklama: trustDetay.aciklama,
    }), trustDetay.trust, kullanici.id]);
  }

  const [sayim] = await query<{ sayi: string }>(`
    SELECT COUNT(*)::text AS sayi FROM teyit_olayi
    WHERE atama_id = $1 AND teyit_sonucu = 'DOGRULANDI'
  `, [atamaId]);

  const rozet = hesaplaRozet(trustDetay.trust, Number(sayim.sayi));

  await query(`
    INSERT INTO system_event (event_turu, event_aktoru_id, ilgili_entity, ilgili_entity_id, event_detay)
    VALUES ('TEYIT_EKLENDI', $1, 'ATAMA', $2, $3::jsonb)
  `, [kullanici.id, atamaId, JSON.stringify({
    sonuc: teyitSonucu,
    tur: teyitTuru,
    trust: trustDetay.trust,
    rozet,
    celiski: trustDetay.celiski_carpani < 1,
  })]);

  await auditYaz({
    userId: kullanici.id,
    islem: 'INSERT',
    tablo: 'teyit_olayi',
    kayitId: teyit.id,
    yeniDeger: {
      atama_id: atamaId,
      sonuc: teyitSonucu,
      tur: teyitTuru,
      kaynak: kaynakTuru,
      trust: trustDetay.trust,
      rozet,
    },
  });

  revalidatePath('/kisiler');
  revalidatePath(`/kisiler/${atama.kisi_id}`);
  revalidatePath(`/teyit/${atamaId}`);
  revalidatePath('/trust');
  revalidatePath('/audit');
  revalidatePath('/');

  redirect(
    `/kisiler/${atama.kisi_id}?teyit=1&trust=${trustDetay.trust}&rozet=${rozet}` +
    (trustDetay.celiski_carpani < 1 ? '&celiski=1' : '')
  );
}