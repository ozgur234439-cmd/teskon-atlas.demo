// TESKON Atlas — Admin kullanıcısı oluşturma
// Kullanım: node scripts/admin_olustur.mjs <email> <sifre> <ad_soyad> [rol]

import { scryptSync, randomBytes } from 'crypto';
import pg from 'pg';

const { Client } = pg;

const [,, email, sifre, adSoyad, rol = 'OWNER'] = process.argv;

if (!email || !sifre || !adSoyad) {
  console.error('Kullanim: node scripts/admin_olustur.mjs <email> <sifre> <ad_soyad> [rol]');
  process.exit(1);
}

const salt = randomBytes(16).toString('hex');
const hash = scryptSync(sifre, salt, 64).toString('hex');
const sifreHash = `scrypt$${salt}$${hash}`;

const client = new Client({
  connectionString: 'postgresql://postgres:GucluBirSifre123!@localhost:5432/teskon_atlas',
});

await client.connect();

const orgRes = await client.query(`SELECT id FROM organizasyon WHERE kod = 'TESKON' LIMIT 1`);
const orgId = orgRes.rows[0]?.id;
if (!orgId) { console.error('Organizasyon bulunamadi'); process.exit(1); }

const mevcut = await client.query(`SELECT id FROM kullanici WHERE email = $1`, [email.toLowerCase()]);

if (mevcut.rows.length > 0) {
  await client.query(
    `UPDATE kullanici SET sifre_hash = $1, ad_soyad = $2, rol = $3::kullanici_rolu WHERE email = $4`,
    [sifreHash, adSoyad, rol, email.toLowerCase()]
  );
  console.log(`OK - Guncellendi: ${email} (${rol})`);
} else {
  await client.query(
    `INSERT INTO kullanici (org_id, email, ad_soyad, rol, sifre_hash, sistem_aktoru)
     VALUES ($1, $2, $3, $4::kullanici_rolu, $5, FALSE)`,
    [orgId, email.toLowerCase(), adSoyad, rol, sifreHash]
  );
  console.log(`OK - Olusturuldu: ${email} (${rol})`);
}

await client.end();