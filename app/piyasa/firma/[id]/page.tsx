import Link from 'next/link';
import { query } from '@/lib/db';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

type Firma = {
  id: number;
  firma_adi: string;
  ulke: string;
  tr_mi: boolean;
  enr_kayitli_mi: boolean;
  ilk_katilim_yili: number | null;
  kisa_aciklama: string | null;
  firma_durum: string;
  aktif: boolean;
  created_at: string;
};

type EnrKayit = {
  enr_yili: number;
  gelir_yili: number;
  liste_turu: string;
  sira: number | null;
  tr_sira: number | null;
  gelir_milyar_usd: string | null;
  kaynak_referansi: string | null;
};

type Uzmanlik = {
  id: number;
  is_kolu_ad: string;
  alt_is_kolu_ad: string | null;
  guc_seviyesi: number | null;
  uzmanlik_durumu: string;
};

type Sinif = {
  sinif: string;
  gerekce: string | null;
  aktif: boolean;
};

async function getFirma(id: string): Promise<Firma | null> {
  const [f] = await query<Firma>(
    `SELECT id, firma_adi, ulke, tr_mi, enr_kayitli_mi, ilk_katilim_yili,
            kisa_aciklama, firma_durum::text AS firma_durum, aktif, created_at::text AS created_at
     FROM piyasa_firma WHERE id = $1`,
    [id]
  );
  return f ?? null;
}

async function getEnrKayitlar(firma_id: number): Promise<EnrKayit[]> {
  return query<EnrKayit>(
    `SELECT pes.enr_yili, pes.gelir_yili, pes.liste_turu::text AS liste_turu,
            pes.sira, pes.tr_sira, pes.gelir_milyar_usd::text AS gelir_milyar_usd,
            k.kaynak_referansi
     FROM piyasa_enr_siralama pes
     LEFT JOIN kaynak k ON k.id = pes.kaynak_id
     WHERE pes.firma_id = $1
     ORDER BY pes.enr_yili DESC, pes.liste_turu`,
    [firma_id]
  );
}

async function getUzmanliklar(firma_id: number): Promise<Uzmanlik[]> {
  return query<Uzmanlik>(
    `SELECT pu.id, ik.ad AS is_kolu_ad, aik.ad AS alt_is_kolu_ad,
            pu.guc_seviyesi, pu.uzmanlik_durumu::text AS uzmanlik_durumu
     FROM piyasa_uzmanlik pu
     JOIN is_kolu ik ON ik.id = pu.is_kolu_id
     LEFT JOIN alt_is_kolu aik ON aik.id = pu.alt_is_kolu_id
     WHERE pu.firma_id = $1
     ORDER BY ik.ad`,
    [firma_id]
  );
}

async function getSiniflar(firma_id: number): Promise<Sinif[]> {
  return query<Sinif>(
    `SELECT sinif::text AS sinif, gerekce, aktif
     FROM piyasa_siniflama
     WHERE firma_id = $1
     ORDER BY sinif`,
    [firma_id]
  );
}

const SINIF_RENK: Record<string, string> = {
  BENCHMARK: 'bg-neutral-800 text-neutral-300 border-neutral-700',
  RAKIP: 'bg-red-950/40 text-red-300 border-red-800',
  ANA_YUKLENICI: 'bg-blue-950/40 text-blue-300 border-blue-800',
  JV_PARTNER: 'bg-green-950/40 text-green-300 border-green-800',
  MUSTERI: 'bg-purple-950/40 text-purple-300 border-purple-800',
};

export default async function FirmaDetayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const firma = await getFirma(id);
  if (!firma) notFound();

  const [enrKayitlar, uzmanliklar, siniflar] = await Promise.all([
    getEnrKayitlar(firma.id),
    getUzmanliklar(firma.id),
    getSiniflar(firma.id),
  ]);

  const siraliMi = enrKayitlar.some(e => e.sira != null || e.tr_sira != null);

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 p-10">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <Link href="/piyasa" className="text-sm text-neutral-500 hover:text-neutral-300 mb-2 inline-block">
            ← Piyasa
          </Link>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">{firma.firma_adi}</h1>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-400">{firma.ulke}</span>
                {firma.enr_kayitli_mi && (
                  <span className="px-2 py-0.5 rounded bg-amber-950/40 text-amber-300 border border-amber-800">ENR</span>
                )}
                {firma.tr_mi && (
                  <span className="px-2 py-0.5 rounded bg-red-950/40 text-red-300 border border-red-800">Türk Firması</span>
                )}
                <span className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-400">{firma.firma_durum}</span>
              </div>
              {firma.kisa_aciklama && (
                <p className="text-neutral-400 mt-3 text-sm max-w-2xl">{firma.kisa_aciklama}</p>
              )}
            </div>
          </div>
        </header>

        <section className="mb-8">
          <h2 className="text-xs uppercase text-neutral-500 font-semibold mb-3">
            ENR Kayıtları ({enrKayitlar.length})
          </h2>

          {!siraliMi && enrKayitlar.length > 0 && (
            <div className="mb-3 p-3 rounded-lg border border-amber-900/40 bg-amber-950/10 text-xs text-amber-300">
              <strong>Madde 138:</strong> Bu firmanın listede olduğu doğrulandı, sıra bilgisi henüz doğrulanmadı.
              Doğrulanmış kaynak eklendiğinde burada görünecek.
            </div>
          )}

          {enrKayitlar.length === 0 ? (
            <div className="text-sm text-neutral-600 p-4 rounded-lg border border-neutral-800 bg-neutral-900">
              Bu firma için ENR kaydı yok.
            </div>
          ) : (
            <div className="space-y-2">
              {enrKayitlar.map((e, i) => (
                <div key={i} className="p-4 rounded-lg border border-neutral-800 bg-neutral-900">
                  <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold">ENR {e.enr_yili}</span>
                      <span className="text-xs text-neutral-500">
                        (gelir yılı {e.gelir_yili})
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded bg-neutral-800 text-neutral-400">
                        {e.liste_turu}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      {e.tr_sira != null ? (
                        <span className="text-xs px-2 py-0.5 rounded bg-amber-950/40 text-amber-300 border border-amber-800">
                          TR #{e.tr_sira}
                        </span>
                      ) : (
                        <span className="text-xs text-neutral-600">TR sıra: doğrulanmadı</span>
                      )}
                      {e.sira != null ? (
                        <span className="text-xs px-2 py-0.5 rounded bg-neutral-800 text-neutral-300">
                          Dünya #{e.sira}
                        </span>
                      ) : (
                        <span className="text-xs text-neutral-600">Dünya sıra: doğrulanmadı</span>
                      )}
                    </div>
                  </div>
                  {e.gelir_milyar_usd && (
                    <div className="text-xs text-neutral-500 mb-1">
                      Gelir: ${e.gelir_milyar_usd} milyar
                    </div>
                  )}
                  {e.kaynak_referansi && (
                    <div className="text-xs text-neutral-600">
                      Kaynak: {e.kaynak_referansi}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mb-8">
          <h2 className="text-xs uppercase text-neutral-500 font-semibold mb-3">
            Uzmanlık ({uzmanliklar.length})
          </h2>
          {uzmanliklar.length === 0 ? (
            <div className="text-sm text-neutral-600 p-4 rounded-lg border border-neutral-800 bg-neutral-900">
              Uzmanlık bilgisi kaynaktan eklenmemiş (madde 140 — uydurma yok).
            </div>
          ) : (
            <div className="space-y-2">
              {uzmanliklar.map((u) => (
                <div key={u.id} className="p-3 rounded-lg border border-neutral-800 bg-neutral-900 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm">{u.is_kolu_ad}</span>
                    {u.alt_is_kolu_ad && <span className="text-xs text-neutral-500">· {u.alt_is_kolu_ad}</span>}
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-400">
                      {u.uzmanlik_durumu}
                    </span>
                    {u.guc_seviyesi && (
                      <span className="text-neutral-500">Güç: {u.guc_seviyesi}/5</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-xs uppercase text-neutral-500 font-semibold mb-3">
            Sınıflama ({siniflar.length})
          </h2>
          {siniflar.length === 0 ? (
            <div className="text-sm text-neutral-600 p-4 rounded-lg border border-neutral-800 bg-neutral-900">
              Bu firma için sınıflama yok. ENR&apos;de olmak otomatik RAKİP değildir (madde 144).
            </div>
          ) : (
            <div className="space-y-2">
              {siniflar.map((s, i) => {
                const renk = SINIF_RENK[s.sinif] ?? SINIF_RENK.BENCHMARK;
                return (
                  <div key={i} className="p-3 rounded-lg border border-neutral-800 bg-neutral-900 flex items-center justify-between">
                    <span className={`text-xs px-2 py-0.5 rounded border ${renk}`}>{s.sinif}</span>
                    {s.gerekce && <span className="text-xs text-neutral-500 italic">&quot;{s.gerekce}&quot;</span>}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
