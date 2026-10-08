'use server';
import { query } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function cozulduIsaretle(id: number) {
  await query(`UPDATE import_karantina SET cozuldu = TRUE WHERE id = $1`, [id]);
  revalidatePath('/import/karantina');
  revalidatePath('/import');
}

export async function cozulduGeriAl(id: number) {
  await query(`UPDATE import_karantina SET cozuldu = FALSE WHERE id = $1`, [id]);
  revalidatePath('/import/karantina');
  revalidatePath('/import');
}

export async function karantinaSil(id: number) {
  await query(`DELETE FROM import_karantina WHERE id = $1`, [id]);
  revalidatePath('/import/karantina');
  revalidatePath('/import');
}

export async function batchTemizle(batchId: number) {
  await query(
    `DELETE FROM import_karantina WHERE import_batch_id = $1 AND cozuldu = TRUE`,
    [batchId]
  );
  revalidatePath('/import/karantina');
  revalidatePath('/import');
}