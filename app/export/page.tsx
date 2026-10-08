import Link from 'next/link';
import { aktifKullanici, rolYeterli } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { query } from '@/lib/db';
import ExportButton from '@/components/ExportButton';

export const dynamic = 'force-dynamic';

type ExportKaydi = {
  id: number;
  gerekce: string;
  export_turu: string;
  kayit_sayisi: number | null;
  created_at: string;
  user_ad: string;
};

async function getSonExportlar(): Promise<ExportKaydi[]> {
  return query<ExportKaydi>(`
    SELECT e.id, e.gerekce, e.export_turu, e.kayit_sayisi,
           e.created_at::text AS created_at, ku.ad_soyad AS user_ad
    FROM export_log e
    JOIN kullanici ku ON ku.id = e.user_id
    ORDER BY e.created_at DESC
    LIMIT 20
  `);
}

const EXPORT_TURLERI = [
  { kod: 'KURUM_LISTESI', ad: 'Kurum Listesi', aciklama: 'Kurum adı, kategori, il, iletişim' },
  { kod: 'KISI_LISTESI', ad: 'Kişi Listesi', aciklama: 'Kişi adı, makam, kurum, iletişim (hassas)' },
  { kod: 'MAKAM_DURUMU', ad: 'Makam Durum Raporu', aciklama: 'Kurum-birim-makam araştırma durumu' },
  { kod: 'TRUST_RAPORU', ad: 'Trust Raporu', aciklama: 'Atama trust skorları + teyit sayıları' },
];

export default async function ExportPage() {
  const kullanici = await aktifKullanici();
  if (!kullanici) redirect('/giris');

  const yetkili = rolYeterli(kullanici.rol, 'EXPORTER') || kullanici.hassas_export_yetkisi;
  if (!yetkili) {
    return (
      <main className="min-h-screen bg-neutral-950 text-neutral-100 p-10">
        <div className="max-w-2xl mx-auto">
          <div className="p-8 rounded-lg border border-red-900/40 bg-red-950/20">
            <h1 className="text-xl font-bold mb-2 text-red-300">Yetkisiz Erişim</h1>
            <p className="text-sm text-neutral-400">
              Export işlemi için <strong className="text-red-300">EXPORTER</strong> rolü veya{' '}
              <strong className="text-red-300">hassas_export_yetkisi = TRUE</strong> gereklidir (madde 88).
            </p>
            <Link href="/" className="text-xs text-blue-400 hover:text-blue-300 mt-4 inline-block">
              ← Ana Sayfa
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const exportlar = await getSonExportlar();

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 p-10">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold mb-1">Export</h1>
          <p className="text-neutral-400 text-sm">
            Hassas export · Gerekçe zorunlu · Tüm export&apos;lar log&apos;lanır (madde 88)
          </p>
        </header>

        <section className="mb-10">
          <h2 className="text-xs uppercase text-neutral-500 font-semibold mb-3">
            Export Türü Seç
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {EXPORT_TURLERI.map((e) => (
              <div
                key={e.kod}
                className="p-5 rounded-lg border border-neutral-800 bg-neutral-900 hover:border-blue-600 transition-colors group flex flex-col"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium group-hover:text-blue-300 transition-colors">{e.ad}</h3>
                  <span className="text-xs text-neutral-600 font-mono">{e.kod}</span>
                </div>
                <p className="text-xs text-neutral-500 mb-4 flex-1">{e.aciklama}</p>
                <ExportButton
                  tur={e.kod}
                  label={`📤 ${e.ad} indir`}
                  className="self-start text-xs px-3 py-1.5 rounded-md bg-blue-700 hover:bg-blue-600 text-white transition-colors"
                />
              </div>
            ))}
          </div>

          <div className="mt-4 p-4 rounded-lg border border-amber-900/40 bg-amber-950/10 text-xs text-amber-300">
            <strong>Not:</strong> İndirme başlarken gerekçe sorulacak (min 10 karakter). Gerekçe
            olmadan export başlatılmaz, deneme{' '}
            <code className="text-amber-200">audit_log</code>&apos;a düşer.
          </div>
        </section>

        <section>
          <h2 className="text-xs uppercase text-neutral-500 font-semibold mb-3">
            Son Exportlar ({exportlar.length})
          </h2>
          {exportlar.length === 0 ? (
            <div className="p-6 rounded-lg border border-dashed border-neutral-800 bg-neutral-900/50 text-center text-sm text-neutral-500">
              Henüz export kaydı yok
            </div>
          ) : (
            <div className="space-y-1">
              {exportlar.map((e) => (
                <div key={e.id} className="px-4 py-2.5 rounded-md border border-neutral-800 bg-neutral-900 flex items-center gap-3 text-xs">
                  <span className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 font-mono">
                    {e.export_turu}
                  </span>
                  <span className="text-neutral-400">{e.kayit_sayisi ?? '?'} kayıt</span>
                  <span className="text-neutral-600">·</span>
                  <span className="text-neutral-300">{e.user_ad}</span>
                  <span className="text-neutral-500 truncate italic">&quot;{e.gerekce}&quot;</span>
                  <span className="text-neutral-600 ml-auto whitespace-nowrap">
                    {new Date(e.created_at).toLocaleString('tr-TR')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}