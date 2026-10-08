'use server';
import { query } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function etiketEkle(formData: FormData) {
  const kod = String(formData.get('kod') ?? '').trim().toUpperCase().replace(/\s+/g, '_');
  const ad = String(formData.get('ad') ?? '').trim();
  const renk = String(formData.get('renk') ?? '#6b7280').trim();
  const aciklama = String(formData.get('aciklama') ?? '').trim() || null;
  if (!kod || !ad) return;

  try {
    await query(
      `INSERT INTO etiket (kod, ad, renk, aciklama) VALUES ($1, $2, $3, $4)`,
      [kod, ad, renk, aciklama]
    );
  } catch (e) { console.error('Etiket eklenemedi:', e); }
  revalidatePath('/etiketler');
}

export async function etiketSil(id: number) {
  await query(`UPDATE etiket SET aktif = FALSE WHERE id = $1`, [id]);
  revalidatePath('/etiketler');
}