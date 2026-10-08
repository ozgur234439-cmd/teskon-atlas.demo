import Link from 'next/link';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

async function getKunye() {
  const [k] = await query<{
    firma_unvani: string; kurucu: string | null; kurulus_yili: number | null;
    kurulus_yeri: string | null; vergi_dairesi: string | null; vergi_numarasi: string | null;
    web: string | null; eposta: string | null; telefon: string | null;
    istanbul_adres: string | null; ankara_adres: string | null;
    aciklama: string | null; kaynak_referansi: string | null;
  }>(`
    SELECT t.firma_unvani, t.kurucu, t.kurulus_yili, t.kurulus_yeri,
           t.vergi_dairesi, t.vergi_numarasi, t.web, t.eposta, t.telefon,
           t.istanbul_adres, t.ankara_adres, t.aciklama,
           k.kaynak_referansi
    FROM teskon_firma_kunyesi t
    LEFT JOIN kaynak k ON k.id = t.kaynak_id
    WHERE t.aktif LIMIT 1
  `);
  return k ?? null;
}

async function getOrganizasyon() {
  return query<{ id: number; ad: string; seviye: number; ust_birim_id: number | null }>(`
    SELECT id, ad, seviye, ust_birim_id
    FROM teskon_organizasyon WHERE aktif ORDER BY seviye, ad
  `);
}

async function getPersonel() {
  return query<{ pozisyon: string; kategori: string; personel_sayisi: number }>(`
    SELECT pozisyon, kategori, personel_sayisi
    FROM teskon_personel_yapisi WHERE aktif ORDER BY kategori, pozisyon
  `);
}

async function getMakine() {
  return query<{ makine_tipi: string; kategori: string; adet: number }>(`
    SELECT makine_tipi, kategori, adet
    FROM teskon_makine_parki WHERE aktif ORDER BY kategori, makine_tipi
  `);
}

async function getSektorler() {
  return query<{ id: number; sektor: string; aciklama: string | null }>(`
    SELECT id, sektor, aciklama FROM teskon_sektor_yetkinligi WHERE aktif ORDER BY sektor
  `);
}

async function getIsBitirme() {
  return query<{
    id: number; is_grubu_kodu: string; aciklama: string;
    yurtici: boolean; yurtdisi: boolean; buyukluk: string | null;
    para_birimi: string | null; yil: number | null;
  }>(`
    SELECT id, is_grubu_kodu, aciklama, yurtici, yurtdisi, buyukluk::text, para_birimi, yil
    FROM teskon_is_bitirme WHERE aktif ORDER BY yil DESC NULLS LAST, is_grubu_kodu
  `);
}

async function getSertifikalar() {
  return query<{
    id: number; sertifika_adi: string; belge_no: string | null;
    gecerlilik_baslangic: string | null; gecerlilik_bitis: string | null;
    kapsam: string | null; veren_kurulus: string | null;
  }>(`
    SELECT id, sertifika_adi, belge_no,
           gecerlilik_baslangic::text, gecerlilik_bitis::text, kapsam, veren_kurulus
    FROM teskon_sertifika WHERE aktif ORDER BY sertifika_adi
  `);
}

async function getUlkeler() {
  return query<{ id: number; ulke: string; aciklama: string | null }>(`
    SELECT id, ulke, aciklama FROM teskon_ulke_deneyimi WHERE aktif ORDER BY ulke
  `);
}

async function getOzet() {
  return query<{ gosterge: string; deger: string; aciklama: string | null }>(`
    SELECT gosterge, deger, aciklama FROM teskon_ozet WHERE aktif ORDER BY gosterge
  `);
}

function Bos({ mesaj }: { mesaj: string }) {
  return (
    <div className="text-sm text-neutral-600 p-4 rounded-lg border border-dashed border-neutral-800 bg-neutral-900/40">
      {mesaj}
    </div>
  );
}

export default async function TeskonPage() {
  const [kunye, org, personel, makine, sektorler, isBitirme, sertifikalar, ulkeler, ozet] = await Promise.all([
    getKunye(), getOrganizasyon(), getPersonel(), getMakine(),
    getSektorler(), getIsBitirme(), getSertifikalar(), getUlkeler(), getOzet(),
  ]);

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 p-10">
      <div className="max-w-5xl mx-auto">

        <header className="mb-10">
          <div className="text-xs uppercase text-neutral-500 font-semibold mb-2">
            TESKON_KURUMSAL_PROFIL · madde 121-134
          </div>
          <h1 className="text-4xl font-bold mb-2">TESKON</h1>
          <p className="text-neutral-400 text-sm">
            Biz kimiz? Ne yapabiliyoruz? · Read-only referans modülü
          </p>
        </header>

        {/* Firma Künyesi */}
        {kunye ? (
          <section className="mb-10 p-6 rounded-lg border border-neutral-800 bg-neutral-900">
            <h2 className="text-xs uppercase text-neutral-500 font-semibold mb-4">Firma Künyesi</h2>
            <div className="text-xl font-bold mb-4">{kunye.firma_unvani}</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              {kunye.kurucu && <div className="flex justify-between border-b border-neutral-800 pb-2"><span className="text-neutral-500">Kurucu</span><span>{kunye.kurucu}</span></div>}
              {kunye.kurulus_yili && <div className="flex justify-between border-b border-neutral-800 pb-2"><span className="text-neutral-500">Kuruluş Yılı</span><span>{kunye.kurulus_yili}</span></div>}
              {kunye.kurulus_yeri && <div className="flex justify-between border-b border-neutral-800 pb-2"><span className="text-neutral-500">Kuruluş Yeri</span><span>{kunye.kurulus_yeri}</span></div>}
              {kunye.vergi_dairesi && <div className="flex justify-between border-b border-neutral-800 pb-2"><span className="text-neutral-500">Vergi Dairesi</span><span>{kunye.vergi_dairesi}</span></div>}
              {kunye.web && <div className="flex justify-between border-b border-neutral-800 pb-2"><span className="text-neutral-500">Web</span><a href={kunye.web} target="_blank" className="text-blue-400 hover:text-blue-300">{kunye.web}</a></div>}
              {kunye.eposta && <div className="flex justify-between border-b border-neutral-800 pb-2"><span className="text-neutral-500">E-posta</span><span>{kunye.eposta}</span></div>}
              {kunye.telefon && <div className="flex justify-between border-b border-neutral-800 pb-2"><span className="text-neutral-500">Telefon</span><span>{kunye.telefon}</span></div>}
            </div>
            {kunye.aciklama && (
              <p className="text-xs text-neutral-500 mt-4 pt-4 border-t border-neutral-800">
                {kunye.aciklama}
              </p>
            )}
            {kunye.kaynak_referansi && (
              <div className="text-xs text-neutral-600 mt-2">Kaynak: {kunye.kaynak_referansi}</div>
            )}
          </section>
        ) : (
          <Bos mesaj="Firma künyesi henüz eklenmedi." />
        )}

        {/* Özet Göstergeler */}
        {ozet.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xs uppercase text-neutral-500 font-semibold mb-3">Özet</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {ozet.map((o) => (
                <div key={o.gosterge} className="p-5 rounded-lg border border-neutral-800 bg-neutral-900">
                  <div className="text-xs uppercase text-neutral-500 mb-1">{o.gosterge}</div>
                  <div className="text-3xl font-bold">{o.deger}</div>
                  {o.aciklama && <div className="text-xs text-neutral-600 mt-1">{o.aciklama}</div>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Organizasyon */}
        <section className="mb-10">
          <h2 className="text-xs uppercase text-neutral-500 font-semibold mb-3">
            Organizasyon ({org.length})
          </h2>
          {org.length === 0 ? <Bos mesaj="Organizasyon kaydı yok." /> : (
            <div className="space-y-2">
              {org.map((o) => (
                <div key={o.id} className="p-3 rounded-lg border border-neutral-800 bg-neutral-900 flex items-center gap-3">
                  <span className="text-xs px-2 py-0.5 rounded bg-neutral-800 text-neutral-500">Seviye {o.seviye}</span>
                  <span>{o.ad}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Sektör Yetkinliği */}
        <section className="mb-10">
          <h2 className="text-xs uppercase text-neutral-500 font-semibold mb-3">
            Sektör Yetkinliği ({sektorler.length})
          </h2>
          {sektorler.length === 0 ? <Bos mesaj="Sektör kaydı yok." /> : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {sektorler.map((s) => (
                <div key={s.id} className="p-3 rounded-lg border border-neutral-800 bg-neutral-900 text-sm">
                  {s.sektor}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Personel Yapısı */}
        <section className="mb-10">
          <h2 className="text-xs uppercase text-neutral-500 font-semibold mb-3">
            Personel Yapısı ({personel.length})
          </h2>
          {personel.length === 0 ? <Bos mesaj="Personel kaydı yok." /> : (
            <div className="space-y-2">
              {personel.map((p, i) => (
                <div key={i} className="p-3 rounded-lg border border-neutral-800 bg-neutral-900 flex items-center justify-between">
                  <span>{p.pozisyon}</span>
                  <span className="text-xs text-neutral-500">{p.kategori} · <strong className="text-neutral-300">{p.personel_sayisi}</strong></span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Makine Parkı */}
        <section className="mb-10">
          <h2 className="text-xs uppercase text-neutral-500 font-semibold mb-3">
            Makine Parkı ({makine.length})
          </h2>
          {makine.length === 0 ? <Bos mesaj="Makine parkı verisi kaynaktan eklenmemiş." /> : (
            <div className="space-y-2">
              {makine.map((m, i) => (
                <div key={i} className="p-3 rounded-lg border border-neutral-800 bg-neutral-900 flex items-center justify-between">
                  <span>{m.makine_tipi}</span>
                  <span className="text-xs text-neutral-500">{m.kategori} · <strong className="text-neutral-300">{m.adet}</strong></span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* İş Bitirme */}
        <section className="mb-10">
          <h2 className="text-xs uppercase text-neutral-500 font-semibold mb-3">
            İş Bitirme ({isBitirme.length})
          </h2>
          {isBitirme.length === 0 ? <Bos mesaj="İş bitirme kaydı kaynaktan eklenmemiş (madde 126)." /> : (
            <div className="space-y-2">
              {isBitirme.map((i) => (
                <div key={i.id} className="p-3 rounded-lg border border-neutral-800 bg-neutral-900">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-xs px-2 py-0.5 rounded bg-neutral-800 text-neutral-400 font-mono">{i.is_grubu_kodu}</span>
                    {i.yurtdisi && <span className="text-xs text-blue-400">Yurtdışı</span>}
                    {i.yurtici && <span className="text-xs text-neutral-500">Yurtiçi</span>}
                    {i.yil && <span className="text-xs text-neutral-600">{i.yil}</span>}
                  </div>
                  <div className="text-sm">{i.aciklama}</div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Sertifikalar */}
        <section className="mb-10">
          <h2 className="text-xs uppercase text-neutral-500 font-semibold mb-3">
            Sertifikalar ({sertifikalar.length})
          </h2>
          {sertifikalar.length === 0 ? <Bos mesaj="Sertifika kaydı kaynaktan eklenmemiş (madde 127)." /> : (
            <div className="space-y-2">
              {sertifikalar.map((s) => (
                <div key={s.id} className="p-3 rounded-lg border border-neutral-800 bg-neutral-900">
                  <div className="font-medium mb-1">{s.sertifika_adi}</div>
                  {s.belge_no && <div className="text-xs text-neutral-500">Belge: {s.belge_no}</div>}
                  {s.gecerlilik_bitis && <div className="text-xs text-neutral-500">Geçerlilik: {s.gecerlilik_bitis}</div>}
                  {s.kapsam && <div className="text-xs text-neutral-500">Kapsam: {s.kapsam}</div>}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Ülke Deneyimi */}
        <section className="mb-10">
          <h2 className="text-xs uppercase text-neutral-500 font-semibold mb-3">
            Ülke Deneyimi ({ulkeler.length})
          </h2>
          {ulkeler.length === 0 ? (
            <div className="text-sm text-neutral-600 p-4 rounded-lg border border-dashed border-neutral-800 bg-neutral-900/40">
              <strong className="text-neutral-400">Not (madde 128):</strong> Kaynakta 22 ülke özeti bulunmakta,
              açık liste henüz doğrulanmadı. Eksik kayıt uydurulmaz; validation kuyruğuna bırakılır.
            </div>
          ) : (
            <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
              {ulkeler.map((u) => (
                <div key={u.id} className="p-3 rounded-lg border border-neutral-800 bg-neutral-900 text-sm text-center">
                  {u.ulke}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Read-only notu */}
        <footer className="mt-10 pt-6 border-t border-neutral-800 text-xs text-neutral-600">
          Bu modül <strong className="text-neutral-500">READ-ONLY</strong> referanstır (madde 131).
          Değişiklikler yalnızca seed/migration ile yapılır.
        </footer>

      </div>
    </main>
  );
}