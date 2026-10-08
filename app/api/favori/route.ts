import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { aktifKullaniciId } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const userId = await aktifKullaniciId();
  if (!userId) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body || !body.tur || !body.entity_id) {
    return NextResponse.json({ error: 'Eksik parametre' }, { status: 400 });
  }

  const { tur, entity_id } = body;

  const [mevcut] = await query<{ id: number }>(
    `SELECT id FROM favori WHERE user_id = $1 AND favori_turu = $2::favori_turu AND entity_id = $3`,
    [userId, tur, entity_id]
  );

  if (mevcut) {
    await query(`DELETE FROM favori WHERE id = $1`, [mevcut.id]);
    return NextResponse.json({ favori: false });
  }

  try {
    await query(
      `INSERT INTO favori (user_id, favori_turu, entity_id) VALUES ($1, $2::favori_turu, $3)`,
      [userId, tur, entity_id]
    );
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Hata' }, { status: 500 });
  }
  return NextResponse.json({ favori: true });
}