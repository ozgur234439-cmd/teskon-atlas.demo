import { query } from '@/lib/db';
import { redirect } from 'next/navigation';
import { requireRol } from '@/lib/auth';

export const dynamic = 'force-dynamic';

type AuditSatir = {
  id: number;
  islem_turu: string;
  tablo_adi: string;
  kayit_id: string | null;
  zaman: string;
  user_id: number | null;
  user_ad: string | null;
  user_email: string | null;
  sistem_aktoru: boolean | null;
};

type SystemEventSatir = {
  id: number;
  event_turu: string;
  event_zamani: string;
  event_aktoru_id: number;
  event_aktoru_ad: string;
  ilgili_entity: string | null;
  ilgili_entity_id: number | null;
  event_detay: any;
};

async function getAudit(): Promise<AuditSatir[]> {
  return query<AuditSatir>(`
    SELECT a.id, a.islem_turu::text AS islem_turu, a.tablo_adi, a.kayit_id,
           a.zaman::text AS zaman,
           a.user_id, ku.ad_soyad AS user_ad, ku.email AS user_email,
           ku.sistem_aktoru
    FROM audit_log a
    LEFT JOIN kullanici ku ON ku.id = a.user_id
    ORDER BY a.zaman DESC
    LIMIT 100
  `);
}

async function getSystemEvents(): Promise<SystemEventSatir[]> {
  return query<SystemEventSatir>(`
    SELECT s.id, s.event_turu, s.event_zamani::text AS event_zamani,
           s.event_aktoru_id, ku.ad_soyad AS event_aktoru_ad,
           s.ilgili_entity, s.ilgili_entity_id, s.event_detay
    FROM system_event s
    LEFT JOIN kullanici ku ON ku.id = s.event_aktoru_id
    ORDER BY s.event_zamani DESC
    LIMIT 50
  `);
}

async function getTeyitOlaylari() {
  return query<{
    id: number;
    teyit_turu: string;
    teyit_sonucu: string;
    teyit_tarihi: string;
    teyit_eden_ad: string;
    kisi_ad: string;
    makam_ad: string;
    kurum_ad: string;
  }>(`
    SELECT t.id, t.teyit_turu::text AS teyit_turu, t.teyit_sonucu::text AS teyit_sonucu,
           t.teyit_tarihi::text AS teyit_tarihi,
           ku.ad_soyad AS teyit_eden_ad,
           k.ad_soyad AS kisi_ad,
           km.ad AS makam_ad, kr.ad AS kurum_ad
    FROM teyit_olayi t
    JOIN kullanici ku ON ku.id = t.teyit_eden_user_id
    JOIN atama a ON a.id = t.atama_id
    JOIN kisi k ON k.id = a.kisi_id
    JOIN kurum_birim_makam kbm ON kbm.id = a.kurum_birim_makam_id
    JOIN kanonik_makam km ON km.id = kbm.kanonik_makam_id
    JOIN kurum kr ON kr.id = kbm.kurum_id
    ORDER BY t.teyit_tarihi DESC
    LIMIT 30
  `);
}

const ISLEM_RENK: Record<string, string> = {
  INSERT: 'bg-green-950/40 text-green-400 border-green-800',
  UPDATE: 'bg-blue-950/40 text-blue-400 border-blue-800',
  DELETE: 'bg-red-950/40 text-red-400 border-red-800',
  EXPORT: 'bg-amber-950/40 text-amber-400 border-amber-800',
  IMPORT: 'bg-purple-950/40 text-purple-400 border-purple-800',
  RLS_BYPASS: 'bg-red-950/40 text-red-500 border-red-800',
};

export default async function AuditPage() {
  const admin = await requireRol('OWNER', 'ADMIN');
  if (!admin) redirect('/');

  const [audit, systemEvents, teyitler] = await Promise.all([
    getAudit(), getSystemEvents(), getTeyitOlaylari(),
  ]);

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 p-10">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold mb-1">Audit Log</h1>
          <p className="text-neutral-400 text-sm">
            {audit.length} audit · {systemEvents.length} system event · {teyitler.length} teyit · madde 91
          </p>
        </header>

        <section className="mb-10">
          <h2 className="text-xs uppercase text-neutral-500 font-semibold mb-3">
            Teyit Olayları (madde 32A — insan doğrulaması)
          </h2>
          {teyitler.length === 0 ? (
            <div className="p-6 rounded-lg border border-dashed border-neutral-800 bg-neutral-900/50 text-center text-sm text-neutral-500">
              Henüz teyit kaydı yok
            </div>
          ) : (
            <div className="space-y-1">
              {teyitler.map((t) => {
                const sonucR = t.teyit_sonucu === 'DOGRULANDI' ? 'text-green-400' :
                               t.teyit_sonucu === 'DOGRULANAMADI' ? 'text-red-400' : 'text-amber-400';
                return (
                  <div key={t.id} className="px-4 py-2.5 rounded-md border border-neutral-800 bg-neutral-900 flex items-center gap-3 text-xs">
                    <span className={`font-semibold ${sonucR}`}>{t.teyit_sonucu}</span>
                    <span className="text-neutral-500">{t.teyit_turu}</span>
                    <span className="text-neutral-300">{t.teyit_eden_ad}</span>
                    <span className="text-neutral-600">→</span>
                    <span className="text-neutral-300">{t.kisi_ad}</span>
                    <span className="text-neutral-600">·</span>
                    <span className="text-neutral-500">{t.makam_ad} @ {t.kurum_ad}</span>
                    <span className="text-neutral-600 ml-auto">{t.teyit_tarihi}</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="mb-10">
          <h2 className="text-xs uppercase text-neutral-500 font-semibold mb-3">
            System Event (madde 94A — teknik olay)
          </h2>
          {systemEvents.length === 0 ? (
            <div className="p-6 rounded-lg border border-dashed border-neutral-800 bg-neutral-900/50 text-center text-sm text-neutral-500">
              Henüz system event yok
            </div>
          ) : (
            <div className="space-y-1">
              {systemEvents.slice(0, 15).map((s) => (
                <div key={s.id} className="px-4 py-2.5 rounded-md border border-neutral-800 bg-neutral-900 flex items-center gap-3 text-xs">
                  <span className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-300">{s.event_turu}</span>
                  <span className="text-neutral-500">@{s.event_aktoru_ad}</span>
                  {s.ilgili_entity && (
                    <>
                      <span className="text-neutral-600">·</span>
                      <span className="text-neutral-400">{s.ilgili_entity}#{s.ilgili_entity_id}</span>
                    </>
                  )}
                  <span className="text-neutral-600 ml-auto">{new Date(s.event_zamani).toLocaleString('tr-TR')}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-xs uppercase text-neutral-500 font-semibold mb-3">
            Audit Log (madde 91 — değişiklik izi)
          </h2>
          {audit.length === 0 ? (
            <div className="p-6 rounded-lg border border-dashed border-neutral-800 bg-neutral-900/50 text-center text-sm text-neutral-500">
              Henüz audit kaydı yok
            </div>
          ) : (
            <div className="space-y-1">
              {audit.map((a) => {
                const r = ISLEM_RENK[a.islem_turu] ?? 'bg-neutral-800 text-neutral-400 border-neutral-700';
                return (
                  <div key={a.id} className="px-4 py-2.5 rounded-md border border-neutral-800 bg-neutral-900 flex items-center gap-3 text-xs">
                    <span className={`px-2 py-0.5 rounded border ${r}`}>{a.islem_turu}</span>
                    <span className="text-neutral-400 font-mono">{a.tablo_adi}</span>
                    {a.kayit_id && <span className="text-neutral-600">#{a.kayit_id}</span>}
                    <span className="text-neutral-300">{a.user_ad ?? 'bilinmiyor'}</span>
                    {a.sistem_aktoru && <span className="text-amber-400">[SİSTEM]</span>}
                    <span className="text-neutral-600 ml-auto">{new Date(a.zaman).toLocaleString('tr-TR')}</span>
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
