import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

type RolPaketiSatir = {
  id: number;
  kod: string;
  ad: string;
  aciklama: string | null;
  makam_sayisi: number;
};

async function getRolPaketleri(): Promise<RolPaketiSatir[]> {
  return query<RolPaketiSatir>(`
    SELECT rp.id, rp.kod, rp.ad, rp.aciklama,
      (SELECT COUNT(*) FROM rol_paketi_makam rpm WHERE rpm.rol_paketi_id = rp.id)::int AS makam_sayisi
    FROM rol_paketi rp
    WHERE rp.aktif = TRUE
    ORDER BY rp.ad
  `);
}

const VARSAYILAN_PAKETLER = [
  { kod: 'SU_KANALIZASYON', ad: 'Su & Kanalizasyon', ikon: '💧' },
  { kod: 'YOL_KOPRU', ad: 'Yol & Köprü', ikon: '🛣️' },
  { kod: 'BINA_RUHSAT', ad: 'Bina & Ruhsat', ikon: '🏗️' },
  { kod: 'SANAYI_OSB', ad: 'Sanayi & OSB', ikon: '🏭' },
  { kod: 'ENERJI', ad: 'Enerji', ikon: '⚡' },
  { kod: 'ALTYAPI', ad: 'Altyapı', ikon: '🚧' },
  { kod: 'KAMU_YATIRIMI', ad: 'Kamu Yatırımı', ikon: '🏛️' },
  { kod: 'ENDUSTRIYEL_TESIS', ad: 'Endüstriyel Tesis', ikon: '⚙️' },
  { kod: 'MUTEAHHIT_EPC', ad: 'Müteahhit & EPC', ikon: '👷' },
  { kod: 'YATIRIMCI', ad: 'Yatırımcı', ikon: '💼' },
];

export default async function RolPaketleriPage() {
  const paketler = await getRolPaketleri();
  const mevcutKodlar = new Set(paketler.map((p) => p.kod));
  const eksikler = VARSAYILAN_PAKETLER.filter((p) => !mevcutKodlar.has(p.kod));

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 p-6 md:p-10">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold mb-1">Rol Paketleri</h1>
          <p className="text-neutral-400 text-sm">
            {paketler.length} paket · Muhatap paketleri (madde 52)
          </p>
        </header>

        {paketler.length === 0 ? (
          <div className="space-y-4">
            <div className="p-6 rounded-lg border border-dashed border-neutral-800 bg-neutral-900/50">
              <div className="text-sm text-neutral-500 mb-4">
                Veritabanında paket yok. Aşağıdakiler varsayılan paketler — eklemek için seed
                çalıştırmanız gerekir.
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {eksikler.map((p) => (
                  <div
                    key={p.kod}
                    className="p-3 rounded-md border border-neutral-800 bg-neutral-950 flex items-center gap-2 text-sm opacity-60"
                  >
                    <span>{p.ikon}</span>
                    <span>{p.ad}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {paketler.map((p) => (
              <div
                key={p.id}
                className="p-5 rounded-lg border border-neutral-800 bg-neutral-900 hover:border-neutral-700 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium">{p.ad}</h3>
                  <span className="text-xs text-neutral-600 font-mono">{p.kod}</span>
                </div>
                {p.aciklama && (
                  <p className="text-xs text-neutral-500 mb-3">{p.aciklama}</p>
                )}
                <div className="text-xs text-neutral-400">
                  {p.makam_sayisi > 0 ? (
                    <span>{p.makam_sayisi} makam bağlı</span>
                  ) : (
                    <span className="text-neutral-600">Henüz makam bağlanmamış</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}