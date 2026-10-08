import Link from 'next/link';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

type FirmaKart = {
  id: number;
  firma_adi: string;
  ulke: string;
  kisa_aciklama: string | null;
  sira: number | null;
  tr_sira: number | null;
};

type Ozet = {
  toplam_firma: number;
  tr_firma: number;
  enr_firma: number;
  is_kolu_sayisi: number;
  sozlesme_modeli_sayisi: number;
  siniflandirma_sayisi: number;
};

async function getOzet(): Promise<Ozet> {
  const [r] = await query<Ozet>(`
    SELECT
      (SELECT COUNT(*)::int FROM piyasa_firma WHERE aktif) AS toplam_firma,
      (SELECT COUNT(*)::int FROM piyasa_firma WHERE aktif AND tr_mi) AS tr_firma,
      (SELECT COUNT(*)::int FROM piyasa_firma WHERE aktif AND enr_kayitli_mi) AS enr_firma,
      (SELECT COUNT(*)::int FROM is_kolu WHERE aktif) AS is_kolu_sayisi,
      (SELECT COUNT(*)::int FROM piyasa_sozlesme_modeli WHERE aktif) AS sozlesme_modeli_sayisi,
      (SELECT COUNT(*)::int FROM piyasa_siniflama WHERE aktif) AS siniflandirma_sayisi
  `);
  return r;
}

async function getEnrFirmalar(): Promise<FirmaKart[]> {
  return query<FirmaKart>(`
    SELECT pf.id, pf.firma_adi, pf.ulke, pf.kisa_aciklama,
           pes.sira, pes.tr_sira
    FROM piyasa_firma pf
    LEFT JOIN piyasa_enr_siralama pes ON pes.firma_id = pf.id
      AND pes.enr_yili = 2025 AND pes.gelir_yili = 2024 AND pes.liste_turu = 'ULUSLARARASI'
    WHERE pf.aktif AND pf.tr_mi AND pf.enr_kayitli_mi
    ORDER BY COALESCE(pes.tr_sira, 999999), pf.firma_adi
  `);
}

export default async function PiyasaPage() {
  const [ozet, firmalar] = await Promise.all([getOzet(), getEnrFirmalar()]);
  const siraliVar = firmalar.some(f => f.tr_sira != null);

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 p-10">
      <div className="max-w-6xl mx-auto">

        <header className="mb-10">
          <div className="text-xs uppercase text-neutral-500 font-semibold mb-2">
            PIYASA_OYUNCULARI · madde 135-154
          </div>
          <h1 className="text-4xl font-bold mb-2">Piyasa</h1>
          <p className="text-neutral-400 text-sm">
            Karşımızda kim var? · Firmalar, ENR sıralamaları, iş kolları, sözleşme modelleri
          </p>
        </header>

        <section className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10">
          <div className="p-5 rounded-lg border border-neutral-800 bg-neutral-900">
            <div className="text-xs uppercase text-neutral-500 mb-1">Toplam Firma</div>
            <div className="text-3xl font-bold">{ozet.toplam_firma}</div>
            <div className="text-xs text-neutral-500 mt-1">{ozet.tr_firma} Türk · {ozet.enr_firma} ENR</div>
          </div>
          <div className="p-5 rounded-lg border border-amber-800/50 bg-amber-950/20">
            <div className="text-xs uppercase text-amber-500 mb-1">ENR Firma</div>
            <div className="text-3xl font-bold text-amber-400">{ozet.enr_firma}</div>
            <div className="text-xs text-neutral-500 mt-1">Uluslararası listede</div>
          </div>
          <div className="p-5 rounded-lg border border-neutral-800 bg-neutral-900">
            <div className="text-xs uppercase text-neutral-500 mb-1">İş Kolu</div>
            <div className="text-3xl font-bold">{ozet.is_kolu_sayisi}</div>
            <div className="text-xs text-neutral-500 mt-1">{ozet.sozlesme_modeli_sayisi} sözleşme modeli</div>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-xs uppercase text-neutral-500 font-semibold mb-3">
            Modüller
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Link href="/piyasa/enr" className="block p-5 rounded-lg border border-neutral-800 bg-neutral-900 hover:border-amber-700 transition-colors group">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-medium group-hover:text-amber-300 transition-colors">ENR Listeleri</h3>
                <span className="text-xs text-neutral-600">→</span>
              </div>
              <p className="text-xs text-neutral-500">
                Türkiye ve uluslararası ENR snapshot&apos;ları
              </p>
            </Link>

            <Link href="/piyasa/uzmanlik" className="block p-5 rounded-lg border border-neutral-800 bg-neutral-900 hover:border-blue-700 transition-colors group">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-medium group-hover:text-blue-300 transition-colors">İş Kolu Rehberi</h3>
                <span className="text-xs text-neutral-600">→</span>
              </div>
              <p className="text-xs text-neutral-500">
                Altyapı, üstyapı, endüstriyel iş kolları
              </p>
            </Link>

            <Link href="/piyasa/sozlesme-modelleri" className="block p-5 rounded-lg border border-neutral-800 bg-neutral-900 hover:border-purple-700 transition-colors group">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-medium group-hover:text-purple-300 transition-colors">Sözleşme Modelleri</h3>
                <span className="text-xs text-neutral-600">→</span>
              </div>
              <p className="text-xs text-neutral-500">
                EPC, PPP/YİD, anahtar teslim, vb.
              </p>
            </Link>
          </div>
        </section>

        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Türkiye ENR Firmaları (2025)</h2>
            <Link href="/piyasa/enr" className="text-xs text-neutral-500 hover:text-neutral-300">Tümü →</Link>
          </div>

          {!siraliVar && (
            <div className="mb-4 p-4 rounded-lg border border-amber-900/40 bg-amber-950/10 text-xs text-amber-300">
              <strong>Not (madde 138):</strong> ENR sıralamaları doğrulanmadığı için gösterilmiyor.
              Doğrulanmış kaynak eklendiğinde sıralar burada görünecek.
              <span className="text-amber-400/70 ml-1">Firmaların listede olduğu bilgisi doğrulanmıştır, sıra bilgisi değil.</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {firmalar.map((f) => (
              <Link
                key={f.id}
                href={`/piyasa/firma/${f.id}`}
                className="block p-5 rounded-lg border border-neutral-800 bg-neutral-900 hover:border-neutral-600 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold">{f.firma_adi}</h3>
                  <div className="flex items-center gap-2">
                    {f.tr_sira != null && (
                      <span className="text-xs px-2 py-0.5 rounded bg-amber-950/40 text-amber-300 border border-amber-800">
                        TR #{f.tr_sira}
                      </span>
                    )}
                    <span className="text-xs px-2 py-0.5 rounded bg-neutral-800 text-neutral-400">
                      ENR
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 text-xs text-neutral-500">
                  <span>{f.ulke}</span>
                  {f.kisa_aciklama && <span className="text-neutral-600">· {f.kisa_aciklama}</span>}
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}