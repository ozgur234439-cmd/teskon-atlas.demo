// TESKON Atlas V1 — Audit log helper (madde 91)
import { query } from './db';

export type AuditIslem = 'INSERT' | 'UPDATE' | 'DELETE' | 'EXPORT' | 'IMPORT' | 'RLS_BYPASS';

export async function auditYaz(params: {
  userId: number;
  islem: AuditIslem;
  tablo: string;
  kayitId: number | string | null;
  eskiDeger?: any;
  yeniDeger?: any;
}) {
  try {
    await query(
      `INSERT INTO audit_log (user_id, islem_turu, tablo_adi, kayit_id, eski_deger, yeni_deger)
       VALUES ($1, $2::audit_islem_turu, $3, $4, $5::jsonb, $6::jsonb)`,
      [
        params.userId,
        params.islem,
        params.tablo,
        params.kayitId != null ? String(params.kayitId) : null,
        params.eskiDeger ? JSON.stringify(params.eskiDeger) : null,
        params.yeniDeger ? JSON.stringify(params.yeniDeger) : null,
      ]
    );
  } catch (e) {
    console.error('Audit yazilamadi:', e);
  }
}

export async function systemEventYaz(params: {
  userId: number;
  eventTuru: string;
  ilgiliEntity?: string;
  ilgiliEntityId?: number;
  detay?: any;
}) {
  try {
    await query(
      `INSERT INTO system_event (event_turu, event_aktoru_id, ilgili_entity, ilgili_entity_id, event_detay)
       VALUES ($1, $2, $3, $4, $5::jsonb)`,
      [
        params.eventTuru,
        params.userId,
        params.ilgiliEntity ?? null,
        params.ilgiliEntityId ?? null,
        params.detay ? JSON.stringify(params.detay) : null,
      ]
    );
  } catch (e) {
    console.error('System event yazilamadi:', e);
  }
}