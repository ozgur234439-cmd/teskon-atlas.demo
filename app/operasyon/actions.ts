'use server';
import { query } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function topluKarantinaCoz(ids: number[]) {
  if (!ids.length) return { ok: false, sayi: 0 };
  await query(
    `UPDATE import_karantina SET cozuldu = TRUE WHERE id = ANY($1::int[])`,
    [ids]
  );
  revalidatePath('/operasyon');
  revalidatePath('/import/karantina');
  return { ok: true, sayi: ids.length };
}

export async function topluKarantinaSil(ids: number[]) {
  if (!ids.length) return { ok: false, sayi: 0 };
  await query(
    `DELETE FROM import_karantina WHERE id = ANY($1::int[])`,
    [ids]
  );
  revalidatePath('/operasyon');
  revalidatePath('/import/karantina');
  return { ok: true, sayi: ids.length };
}