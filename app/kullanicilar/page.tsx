import Link from 'next/link';
import { query } from '@/lib/db';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireRol, hashPassword } from '@/lib/auth';
import { auditYaz, systemEventYaz } from '@/lib/audit';

export const dynamic = 'force-dynamic';

type Kullanici = {
  id: number;
  email: string;
  ad_soyad: string;
  rol: string;
  sistem_aktoru: boolean;
  sifre_var: boolean;
  aktif: boolean;
  son_giris: string | null;
  created_at: string;
};

async function getKullanicilar(): Promise<Kullanici[]> {
  return query<Kullanici>(`
    SELECT id, email, ad_soyad, rol::text AS rol, sistem_aktoru,
           (sifre_hash IS NOT NULL) AS sifre_var, aktif,
           son_giris::text AS son_giris, created_at::text AS created_at
    FROM kullanici
    ORDER BY CASE rol WHEN 'OWNER' THEN 1 WHEN 'ADMIN' THEN 2 WHEN 'EDITOR' THEN 3 WHEN 'RESEARCHER' THEN 4 WHEN 'EXPORTER' THEN 5 ELSE 6 END, ad_soyad
  `);
}

async function kullaniciEkle(formData: FormData) {
  'use server';
  const admin = await requireRol('OWNER', 'ADMIN');
  if (!admin) redirect('/');

  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const adSoyad = String(formData.get('ad_soyad') ?? '').trim();
  const sifre = String(formData.get('sifre') ?? '');
  const rol = String(formData.get('rol') ?? 'VIEWER');

  if (!email || !adSoyad || sifre.length < 8) return;

  const sifreHash = hashPassword(sifre);

  try {
    const [yeni] = await query<{ id: number }>(
      `INSERT INTO kullanici (org_id, email, ad_soyad, rol, sifre_hash, sistem_aktoru)
       SELECT id, $1, $2, $3::kullanici_rolu, $4, FALSE
       FROM organizasyon WHERE kod = 'TESKON'
       RETURNING id`,
      [email, adSoyad, rol, sifreHash]
    );
    await auditYaz({ userId: admin.id, islem: 'INSERT', tablo: 'kullanici', kayitId: yeni.id, yeniDeger: { email, ad_soyad: adSoyad, rol } });
    await systemEventYaz({ userId: admin.id, eventTuru: 'KULLANICI_OLUSTURULDU', ilgiliEntity: 'KULLANICI', ilgiliEntityId: yeni.id, detay: { email, rol } });
  } catch (e) {
    console.error('Kullanici eklenemedi:', e);
  }
  revalidatePath('/kullanicilar');
}

async function rolDegistir(formData: FormData) {
  'use server';
  const admin = await requireRol('OWNER', 'ADMIN');
  if (!admin) redirect('/');

  const kullaniciId = Number(formData.get('kullanici_id'));
  const yeniRol = String(formData.get('rol') ?? '').trim();
  if (!kullaniciId || !yeniRol) return;

  if (kullaniciId === admin.id) return;

  const [eski] = await query<{ rol: string; email: string }>(
    `SELECT rol::text AS rol, email FROM kullanici WHERE id = $1`,
    [kullaniciId]
  );

  await query(
    `UPDATE kullanici SET rol = $1::kullanici_rolu WHERE id = $2 AND sistem_aktoru = FALSE`,
    [yeniRol, kullaniciId]
  );
  await auditYaz({ userId: admin.id, islem: 'UPDATE', tablo: 'kullanici', kayitId: kullaniciId, eskiDeger: { rol: eski?.rol }, yeniDeger: { rol: yeniRol } });
  await systemEventYaz({ userId: admin.id, eventTuru: 'ROL_DEGISTIRILDI', ilgiliEntity: 'KULLANICI', ilgiliEntityId: kullaniciId, detay: { email: eski?.email, eski: eski?.rol, yeni: yeniRol } });
  revalidatePath('/kullanicilar');
}

async function sifreSifirla(formData: FormData) {
  'use server';
  const admin = await requireRol('OWNER', 'ADMIN');
  if (!admin) redirect('/');

  const kullaniciId = Number(formData.get('kullanici_id'));
  const yeniSifre = String(formData.get('yeni_sifre') ?? '');
  if (!kullaniciId || yeniSifre.length < 8) return;

  await query(
    `UPDATE kullanici SET sifre_hash = $1 WHERE id = $2 AND sistem_aktoru = FALSE`,
    [hashPassword(yeniSifre), kullaniciId]
  );
  await auditYaz({ userId: admin.id, islem: 'UPDATE', tablo: 'kullanici', kayitId: kullaniciId, yeniDeger: { sifre_sifirlandi: true } });
  await systemEventYaz({ userId: admin.id, eventTuru: 'SIFRE_SIFIRLANDI', ilgiliEntity: 'KULLANICI', ilgiliEntityId: kullaniciId });
  revalidatePath('/kullanicilar');
}

const ROL_RENK: Record<string, string> = {
  OWNER: 'bg-purple-950/40 text-purple-300 border-purple-800',
  ADMIN: 'bg-red-950/40 text-red-300 border-red-800',
  EDITOR: 'bg-blue-950/40 text-blue-300 border-blue-800',
  RESEARCHER: 'bg-green-950/40 text-green-300 border-green-800',
  EXPORTER: 'bg-amber-950/40 text-amber-300 border-amber-800',
  VIEWER: 'bg-neutral-800 text-neutral-400 border-neutral-700',
};

export default async function KullanicilarPage() {
  const admin = await requireRol('OWNER', 'ADMIN');
  if (!admin) redirect('/');

  const kullanicilar = await getKullanicilar();

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 p-10">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold mb-1">Kullanıcılar</h1>
          <p className="text-neutral-400 text-sm">
            {kullanicilar.length} kullanıcı · Rol yönetimi (madde 87)
          </p>
        </header>

        <details className="rounded-lg border border-neutral-800 bg-neutral-900 mb-6">
          <summary className="px-5 py-3 cursor-pointer hover:bg-neutral-800/50 transition-colors font-medium text-sm">
            + Yeni Kullanıcı Ekle
          </summary>
          <form action={kullaniciEkle} className="p-5 border-t border-neutral-800 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase text-neutral-500 font-semibold mb-2">Email *</label>
                <input type="email" name="email" required className="w-full px-3 py-2 rounded-md bg-neutral-950 border border-neutral-800 focus:border-blue-600 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs uppercase text-neutral-500 font-semibold mb-2">Ad Soyad *</label>
                <input type="text" name="ad_soyad" required className="w-full px-3 py-2 rounded-md bg-neutral-950 border border-neutral-800 focus:border-blue-600 focus:outline-none" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase text-neutral-500 font-semibold mb-2">Şifre * (min 8)</label>
                <input type="password" name="sifre" required minLength={8} className="w-full px-3 py-2 rounded-md bg-neutral-950 border border-neutral-800 focus:border-blue-600 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs uppercase text-neutral-500 font-semibold mb-2">Rol *</label>
                <select name="rol" required defaultValue="VIEWER" className="w-full px-3 py-2 rounded-md bg-neutral-950 border border-neutral-800 focus:border-blue-600 focus:outline-none">
                  <option value="OWNER">OWNER — Tam yetki</option>
                  <option value="ADMIN">ADMIN — Kullanıcı yönetimi</option>
                  <option value="EDITOR">EDITOR — CRUD</option>
                  <option value="RESEARCHER">RESEARCHER — Veri girişi</option>
                  <option value="EXPORTER">EXPORTER — Export</option>
                  <option value="VIEWER">VIEWER — Sadece okuma</option>
                </select>
              </div>
            </div>
            <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-md font-medium transition-colors">
              Kullanıcı Ekle
            </button>
          </form>
        </details>

        <div className="space-y-2">
          {kullanicilar.map((k) => {
            const r = ROL_RENK[k.rol] ?? ROL_RENK.VIEWER;
            const kendiMi = k.id === admin.id;
            return (
              <div key={k.id} className="p-4 rounded-lg border border-neutral-800 bg-neutral-900">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <span className="font-medium">{k.ad_soyad}</span>
                      <span className={`text-xs px-2 py-0.5 rounded border ${r}`}>{k.rol}</span>
                      {k.sistem_aktoru && (
                        <span className="text-xs px-2 py-0.5 rounded bg-neutral-800 text-neutral-500 border border-neutral-700">
                          SİSTEM AKTÖRÜ
                        </span>
                      )}
                      {kendiMi && (
                        <span className="text-xs px-2 py-0.5 rounded bg-blue-950/40 text-blue-300 border border-blue-800">
                          SEN
                        </span>
                      )}
                      {!k.sifre_var && !k.sistem_aktoru && (
                        <span className="text-xs px-2 py-0.5 rounded bg-amber-950/40 text-amber-400 border border-amber-800">
                          Şifresiz
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-neutral-500">
                      {k.email}
                      {k.son_giris && <> · Son giriş: {new Date(k.son_giris).toLocaleString('tr-TR')}</>}
                    </div>
                  </div>

                  {!k.sistem_aktoru && !kendiMi && (
                    <div className="flex flex-col gap-2 shrink-0">
                      <form action={rolDegistir} className="flex gap-2">
                        <input type="hidden" name="kullanici_id" value={k.id} />
                        <select name="rol" defaultValue={k.rol} className="px-2 py-1 rounded bg-neutral-950 border border-neutral-800 text-xs">
                          <option value="OWNER">OWNER</option>
                          <option value="ADMIN">ADMIN</option>
                          <option value="EDITOR">EDITOR</option>
                          <option value="RESEARCHER">RESEARCHER</option>
                          <option value="EXPORTER">EXPORTER</option>
                          <option value="VIEWER">VIEWER</option>
                        </select>
                        <button type="submit" className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 rounded text-xs">Rol</button>
                      </form>

                      <details className="relative">
                        <summary className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 rounded text-xs cursor-pointer list-none text-center">
                          Şifre
                        </summary>
                        <form action={sifreSifirla} className="absolute right-0 top-full mt-1 p-3 rounded-md bg-neutral-900 border border-neutral-700 shadow-lg z-20 w-64 space-y-2">
                          <input type="hidden" name="kullanici_id" value={k.id} />
                          <input
                            type="password"
                            name="yeni_sifre"
                            placeholder="Yeni şifre (min 8)"
                            required
                            minLength={8}
                            className="w-full px-2 py-1 rounded bg-neutral-950 border border-neutral-800 text-xs focus:border-blue-600 focus:outline-none"
                          />
                          <button type="submit" className="w-full px-2 py-1 bg-blue-600 hover:bg-blue-500 rounded text-xs">
                            Sıfırla
                          </button>
                        </form>
                      </details>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}