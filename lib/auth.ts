// TESKON Atlas V1 — Basit session auth (madde 87)
// Node crypto HMAC ile imzalı cookie. Ekstra paket yok.

import { cookies } from 'next/headers';
import { createHmac, timingSafeEqual, randomBytes, scryptSync } from 'crypto';
import { query } from './db';

const SESSION_COOKIE = 'atlas_session';
const SESSION_SECRET = process.env.SESSION_SECRET || 'atlas-dev-secret-change-in-prod';
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 gün

// ---- Şifre hash'leme (scrypt) ----
export function hashPassword(sifre: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(sifre, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(sifre: string, hash: string): boolean {
  const parcalar = hash.split('$');
  if (parcalar.length !== 3 || parcalar[0] !== 'scrypt') return false;
  const [, salt, beklenenHash] = parcalar;
  const hesaplananHash = scryptSync(sifre, salt, 64).toString('hex');
  try {
    return timingSafeEqual(Buffer.from(hesaplananHash, 'hex'), Buffer.from(beklenenHash, 'hex'));
  } catch {
    return false;
  }
}

// ---- Session cookie (HMAC imzalı) ----
type SessionData = {
  user_id: number;
  email: string;
  exp: number;
};

function signSession(data: SessionData): string {
  const json = JSON.stringify(data);
  const b64 = Buffer.from(json).toString('base64url');
  const sig = createHmac('sha256', SESSION_SECRET).update(b64).digest('base64url');
  return `${b64}.${sig}`;
}

function verifySession(token: string): SessionData | null {
  const [b64, sig] = token.split('.');
  if (!b64 || !sig) return null;
  const beklenen = createHmac('sha256', SESSION_SECRET).update(b64).digest('base64url');
  try {
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(beklenen))) return null;
    const data = JSON.parse(Buffer.from(b64, 'base64url').toString()) as SessionData;
    if (data.exp < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

// ---- Oturum işlemleri ----
export async function girisYap(email: string, sifre: string): Promise<{ ok: boolean; hata?: string }> {
  const [user] = await query<{ id: number; email: string; ad_soyad: string; rol: string; sifre_hash: string | null }>(
    `SELECT id, email, ad_soyad, rol::text AS rol, sifre_hash
     FROM kullanici WHERE email = $1 AND aktif LIMIT 1`,
    [email.toLowerCase().trim()]
  );

  if (!user) return { ok: false, hata: 'Kullanıcı bulunamadı' };
  if (!user.sifre_hash) return { ok: false, hata: 'Şifre tanımlı değil' };
  if (!verifyPassword(sifre, user.sifre_hash)) return { ok: false, hata: 'Şifre hatalı' };

  const session: SessionData = {
    user_id: user.id,
    email: user.email,
    exp: Date.now() + SESSION_MAX_AGE * 1000,
  };

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, signSession(session), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  });

  // Son giriş tarihini güncelle
  await query(`UPDATE kullanici SET son_giris = NOW() WHERE id = $1`, [user.id]);

  return { ok: true };
}

export async function cikisYap(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export type AktifKullanici = {
  id: number;
  email: string;
  ad_soyad: string;
  rol: string;
  org_id: number;
  hassas_export_yetkisi: boolean;
};

export async function aktifKullanici(): Promise<AktifKullanici | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = verifySession(token);
  if (!session) return null;

  const [user] = await query<AktifKullanici>(
    `SELECT id, email, ad_soyad, rol::text AS rol, org_id, hassas_export_yetkisi
     FROM kullanici WHERE id = $1 AND aktif LIMIT 1`,
    [session.user_id]
  );

  return user ?? null;
}

export async function aktifKullaniciId(): Promise<number | null> {
  const k = await aktifKullanici();
  return k?.id ?? null;
}

// ---- Rol kontrolü (madde 87) ----
export type Rol = 'OWNER' | 'ADMIN' | 'EDITOR' | 'RESEARCHER' | 'VIEWER' | 'EXPORTER';

const ROL_ONCELIK: Record<Rol, number> = {
  OWNER: 6,
  ADMIN: 5,
  EDITOR: 4,
  RESEARCHER: 3,
  EXPORTER: 3,
  VIEWER: 1,
};

export async function requireRol(...izinliRoller: Rol[]): Promise<AktifKullanici | null> {
  const k = await aktifKullanici();
  if (!k) return null;
  if (!izinliRoller.includes(k.rol as Rol)) return null;
  return k;
}

export function rolYeterli(kullaniciRol: string, gerekliRol: Rol): boolean {
  return (ROL_ONCELIK[kullaniciRol as Rol] ?? 0) >= ROL_ONCELIK[gerekliRol];
}
