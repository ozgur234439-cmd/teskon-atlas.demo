import Link from 'next/link';
import { TourTrigger } from '@/components/tour/TourTrigger';
import { query } from '@/lib/db';
import { Card, CardTitle, CardSubtitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

export const dynamic = 'force-dynamic';

type Aktivite = {
  id: number;
  islem_turu: string;
  tablo_adi: string;
  kayit_id: string | null;
  zaman: string;
  user_ad: string | null;
  sistem_aktoru: boolean | null;
};

type AksiyonKart = {
  id: number;
  baslik: string;
  aksiyon_turu: string;
  oncelik: number;
  planlanan_tarih: string | null;
  durum: string;
  kisi_id: number | null;
  kisi_ad: string | null;
  kurum_id: number | null;
  kurum_ad: string | null;
};

type SonKisi = {
  id: number;
  ad_soyad: string;
  created_at: string;
  atama_sayisi: string;
  makam_ad: string | null;
  kurum_ad: string | null;
  makam_sinifi: string | null;
};

type BekleyenKurum = {
  id: number;
  ad: string;
  bekleyen: string;
  ana_kategori: string;
  il_ad: string | null;
};

type Ozet = {
  kurum: number;
  birim: number;
  makam: number;
  kisi: number;
  iletisim: number;
  teyit: number;
  bekleyen_makam: number;
  acik_aksiyon: number;
  not_sayisi: number;
  son_7_gun_etkilesim: number;
  bugun_aksiyon: number;
  hafta_aksiyon: number;
};

type TrustDagilim = {
  yesil: number;
  acik_yesil: number;
  sari: number;
  turuncu: number;
  kirmizi: number;
  gri: number;
};

async function getOzet(): Promise<Ozet> {
  const [r] = await query<Ozet>(`
    SELECT
      (SELECT COUNT(*)::int FROM kurum WHERE aktif) AS kurum,
      (SELECT COUNT(*)::int FROM birim WHERE aktif) AS birim,
      (SELECT COUNT(*)::int FROM kurum_birim_makam WHERE aktif) AS makam,
      (SELECT COUNT(*)::int FROM kisi WHERE aktif) AS kisi,
      (SELECT COUNT(*)::int FROM iletisim WHERE aktif) AS iletisim,
      (SELECT COUNT(*)::int FROM teyit_olayi) AS teyit,
      (SELECT COUNT(*)::int FROM kurum_birim_makam WHERE aktif AND arastirma_durumu = 'ARASTIRILMADI') AS bekleyen_makam,
      (SELECT COUNT(*)::int FROM aksiyon WHERE aktif AND durum IN ('BEKLIYOR','INCELEMEDE')) AS acik_aksiyon,
      (SELECT COUNT(*)::int FROM not_kaydi WHERE aktif) AS not_sayisi,
      (SELECT COUNT(*)::int FROM etkilesim WHERE aktif AND tarih > NOW() - INTERVAL '7 days') AS son_7_gun_etkilesim,
      (SELECT COUNT(*)::int FROM aksiyon WHERE aktif AND durum IN ('BEKLIYOR','INCELEMEDE') AND planlanan_tarih = CURRENT_DATE) AS bugun_aksiyon,
      (SELECT COUNT(*)::int FROM aksiyon WHERE aktif AND durum IN ('BEKLIYOR','INCELEMEDE') AND planlanan_tarih BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days') AS hafta_aksiyon
  `);
  return r;
}

async function getAktiviteler(): Promise<Aktivite[]> {
  return query<Aktivite>(`
    SELECT a.id, a.islem_turu::text AS islem_turu, a.tablo_adi, a.kayit_id,
           a.zaman::text AS zaman, k.ad_soyad AS user_ad, k.sistem_aktoru
    FROM audit_log a
    LEFT JOIN kullanici k ON k.id = a.user_id
    WHERE a.zaman > NOW() - INTERVAL '7 days'
    ORDER BY a.zaman DESC
    LIMIT 15
  `);
}

async function getTrustDagilim(): Promise<TrustDagilim> {
  const rows = await query<{ rozet_grubu: string; sayi: string }>(`
    SELECT
      CASE
        WHEN teyit_sayisi > 0 AND son_trust >= 55 THEN 'yesil'
        WHEN son_trust >= 45 THEN 'acik_yesil'
        WHEN son_trust >= 30 THEN 'sari'
        WHEN son_trust >= 15 THEN 'turuncu'
        WHEN son_trust IS NOT NULL THEN 'kirmizi'
        ELSE 'gri'
      END AS rozet_grubu,
      COUNT(*)::text AS sayi
    FROM (
      SELECT a.id,
        (SELECT sonuc FROM trust_hesaplama th
          WHERE th.entity_turu = 'ATAMA' AND th.entity_id = a.id
          ORDER BY hesaplama_tarihi DESC LIMIT 1) AS son_trust,
        (SELECT COUNT(*) FROM teyit_olayi t
          WHERE t.atama_id = a.id AND t.teyit_sonucu = 'DOGRULANDI') AS teyit_sayisi
      FROM atama a
      WHERE a.aktif AND a.atama_durumu = 'AKTIF' AND a.atama_tipi = 'ASIL'
    ) sub
    GROUP BY rozet_grubu
  `);
  const r: TrustDagilim = { yesil: 0, acik_yesil: 0, sari: 0, turuncu: 0, kirmizi: 0, gri: 0 };
  rows.forEach((row) => {
    r[row.rozet_grubu as keyof TrustDagilim] = Number(row.sayi);
  });
  return r;
}

async function getBugunAksiyonlar(): Promise<AksiyonKart[]> {
  return query<AksiyonKart>(`
    SELECT a.id, a.baslik, a.aksiyon_turu::text AS aksiyon_turu, a.oncelik,
           a.planlanan_tarih::text AS planlanan_tarih, a.durum::text AS durum,
           k.id AS kisi_id, k.ad_soyad AS kisi_ad,
           kr.id AS kurum_id, kr.ad AS kurum_ad
    FROM aksiyon a
    LEFT JOIN kisi k ON k.id = a.kisi_id
    LEFT JOIN kurum kr ON kr.id = a.kurum_id
    WHERE a.aktif AND a.durum IN ('BEKLIYOR','INCELEMEDE')
      AND (a.planlanan_tarih IS NULL OR a.planlanan_tarih <= CURRENT_DATE + INTERVAL '7 days')
    ORDER BY
      CASE WHEN a.planlanan_tarih < CURRENT_DATE THEN 0 ELSE 1 END,
      a.planlanan_tarih NULLS LAST,
      a.oncelik
    LIMIT 8
  `);
}

async function getSonKisiler(): Promise<SonKisi[]> {
  return query<SonKisi>(`
    SELECT k.id, k.ad_soyad, k.created_at::text AS created_at,
      (SELECT COUNT(*)::text FROM atama a WHERE a.kisi_id = k.id AND a.aktif) AS atama_sayisi,
      km.ad AS makam_ad, km.makam_sinifi::text AS makam_sinifi, kr.ad AS kurum_ad
    FROM kisi k
    LEFT JOIN atama a ON a.kisi_id = k.id AND a.aktif AND a.atama_durumu = 'AKTIF' AND a.atama_tipi = 'ASIL'
    LEFT JOIN kurum_birim_makam kbm ON kbm.id = a.kurum_birim_makam_id
    LEFT JOIN kanonik_makam km ON km.id = kbm.kanonik_makam_id
    LEFT JOIN kurum kr ON kr.id = kbm.kurum_id
    WHERE k.aktif
    ORDER BY k.created_at DESC
    LIMIT 5
  `);
}

async function getBekleyenKurumlar(): Promise<BekleyenKurum[]> {
  return query<BekleyenKurum>(`
    SELECT ku.id, ku.ad, COUNT(kbm.id)::text AS bekleyen,
           ak.ad AS ana_kategori, il.ad AS il_ad
    FROM kurum ku
    JOIN ana_kategori ak ON ak.id = ku.ana_kategori_id
    LEFT JOIN il ON il.id = ku.il_id
    JOIN kurum_birim_makam kbm ON kbm.kurum_id = ku.id AND kbm.aktif AND kbm.arastirma_durumu = 'ARASTIRILMADI'
    WHERE ku.aktif
    GROUP BY ku.id, ku.ad, ak.ad, il.ad
    ORDER BY COUNT(kbm.id) DESC
    LIMIT 5
  `);
}

const AKSIYON_ETIKET: Record<string, string> = {
  ARA: 'Ara', TEKRAR_ARA: 'Tekrar Ara', ZIYARET: 'Ziyaret', EPOSTA: 'E-posta',
  WHATSAPP: 'WhatsApp', DOKUMAN: 'Doküman', IHALE_TAKIP: 'İhale Takip',
  TEYIT: 'Teyit', TOPLANTI: 'Toplantı', RANDEVU: 'Randevu', DIGER: 'Diğer',
};

const ISLEM_TONE: Record<string, 'success' | 'cyan' | 'danger' | 'warning' | 'ai' | 'neutral'> = {
  INSERT: 'success', UPDATE: 'cyan', DELETE: 'danger',
  EXPORT: 'warning', IMPORT: 'benchmark' as any, RLS_BYPASS: 'danger',
};

const SINIF_TONE: Record<string, 'danger' | 'orange' | 'warning' | 'neutral'> = {
  A: 'danger', B: 'orange', C: 'warning', D: 'neutral',
};

const ISLEM_ETIKET: Record<string, string> = {
  kurum: 'Kurum', birim: 'Birim', kurum_birim_makam: 'Makam',
  kisi: 'Kişi', atama: 'Atama', iletisim: 'İletişim',
  teyit_olayi: 'Teyit', trust_hesaplama: 'Trust',
  etkilesim: 'Etkileşim', aksiyon: 'Aksiyon', not_kaydi: 'Not',
  kaynak: 'Kaynak', export_log: 'Export', import_batch: 'Import',
  kullanici: 'Kullanıcı',
};

function formatTarih(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const bugun = new Date();
  bugun.setHours(0, 0, 0, 0);
  const hedef = new Date(d);
  hedef.setHours(0, 0, 0, 0);
  const fark = Math.floor((hedef.getTime() - bugun.getTime()) / (1000 * 60 * 60 * 24));
  if (fark < 0) return `${Math.abs(fark)} gün geçti`;
  if (fark === 0) return 'Bugün';
  if (fark === 1) return 'Yarın';
  if (fark < 7) return `${fark} gün sonra`;
  return d.toLocaleDateString('tr-TR');
}

function formatZaman(iso: string): string {
  const d = new Date(iso);
  const simdi = new Date();
  const fark = Math.floor((simdi.getTime() - d.getTime()) / 1000);
  if (fark < 60) return `${fark}sn önce`;
  if (fark < 3600) return `${Math.floor(fark / 60)}dk önce`;
  if (fark < 86400) return `${Math.floor(fark / 3600)}sa önce`;
  if (fark < 604800) return `${Math.floor(fark / 86400)}g önce`;
  return d.toLocaleDateString('tr-TR');
}

function Kpi({ label, value, sub, tone = 'neutral', href }: {
  label: string; value: number | string; sub?: string;
  tone?: 'neutral' | 'cyan' | 'warning' | 'ai';
  href?: string;
}) {
  const valueColor = {
    neutral: 'text-[var(--color-atlas-text)]',
    cyan: 'text-[var(--color-atlas-cyan)]',
    warning: 'text-[var(--color-atlas-warning)]',
    ai: 'text-[var(--color-atlas-ai)]',
  }[tone];

  const inner = (
    <Card hoverable={!!href}>
      <div className="text-[10.5px] uppercase tracking-wider font-medium text-[var(--color-atlas-text-muted)]">
        {label}
      </div>
      <div className={`mt-2 text-[28px] leading-none font-semibold tabular-nums ${valueColor}`}>
        {value}
      </div>
      {sub && (
        <div className="mt-2 text-[11.5px] text-[var(--color-atlas-text-muted)]">{sub}</div>
      )}
    </Card>
  );

  return href ? <Link href={href}>{inner}</Link> : inner;
}

export default async function HomePage() {
  const [ozet, aktiviteler, trust, aksiyonlar, sonKisiler, bekleyenKurumlar] = await Promise.all([
    getOzet(),
    getAktiviteler(),
    getTrustDagilim(),
    getBugunAksiyonlar(),
    getSonKisiler(),
    getBekleyenKurumlar(),
  ]);

  const trustToplam = Object.values(trust).reduce((a, b) => a + b, 0);

  return (
    <div className="p-6 max-w-7xl mx-auto">

      <header className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <h1 className="text-[26px] font-semibold text-[var(--color-atlas-text)]">
          TESKON Atlas
        </h1>
        <p className="mt-1 text-[13.5px] text-[var(--color-atlas-text-muted)]">
          Doğrulanmış Muhatap · Kurum Hafızası · Piyasa İstihbaratı
        </p>
        <TourTrigger />
      </header>

      {ozet.bugun_aksiyon > 0 && (
        <div className="mb-6 p-4 rounded-[var(--radius-atlas-md)] border border-[rgba(245,158,11,0.30)] bg-[rgba(245,158,11,0.08)] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Badge tone="warning" dot>Bugün</Badge>
            <div className="text-[13px] text-[var(--color-atlas-text-2)]">
              <strong className="text-[var(--color-atlas-warning)]">{ozet.bugun_aksiyon} aksiyon</strong> bugün planlandı
            </div>
          </div>
          <Link href="/aksiyonlar" className="text-[12px] px-3 py-1.5 rounded-[var(--radius-atlas-sm)] border border-[rgba(245,158,11,0.30)] text-[var(--color-atlas-warning)] hover:bg-[rgba(245,158,11,0.15)] transition-colors whitespace-nowrap">
            Görüntüle →
          </Link>
        </div>
      )}

      {/* 4 ANA KPI */}
      <section data-tour="kpi-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Kpi
          label="Muhatap"
          value={ozet.bekleyen_makam}
          sub="bekleyen makam"
          tone="warning"
          href="/operasyon"
        />
        <Kpi
          label="Kişiler"
          value={ozet.kisi}
          sub={`${ozet.iletisim} iletişim · ${ozet.teyit} teyit`}
          href="/kisiler"
        />
        <Kpi
          label="İşlemler"
          value={ozet.acik_aksiyon}
          sub={`${ozet.bugun_aksiyon} bugün · ${ozet.hafta_aksiyon} bu hafta`}
          tone="cyan"
          href="/aksiyonlar"
        />
        <Kpi
          label="Notlar"
          value={ozet.not_sayisi}
          sub={`${ozet.son_7_gun_etkilesim} etkileşim (7 gün)`}
          href="/notlar"
        />
      </section>

      {/* TRUST DAĞILIMI */}
      <section data-tour="trust-dist" className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[15px] font-semibold text-[var(--color-atlas-text)]">Güvenilirlik Dağılımı</h2>
          <Link href="/trust" className="text-[12px] text-[var(--color-atlas-text-muted)] hover:text-[var(--color-atlas-cyan)] transition-colors">Tümü →</Link>
        </div>
        <Card>
          {trustToplam === 0 ? (
            <div className="text-[13px] text-[var(--color-atlas-text-muted)] text-center py-2">
              Henüz trust hesaplanmış atama yok
            </div>
          ) : (
            <div className="flex gap-0.5 rounded-full overflow-hidden h-2.5 mb-4">
              {trust.yesil > 0 && <div className="bg-[var(--color-atlas-success)]" style={{ width: `${(trust.yesil / trustToplam) * 100}%` }} title={`Yeşil: ${trust.yesil}`} />}
              {trust.acik_yesil > 0 && <div className="bg-[var(--color-atlas-success-lt)]" style={{ width: `${(trust.acik_yesil / trustToplam) * 100}%` }} title={`Açık Yeşil: ${trust.acik_yesil}`} />}
              {trust.sari > 0 && <div className="bg-[var(--color-atlas-warning)]" style={{ width: `${(trust.sari / trustToplam) * 100}%` }} title={`Sarı: ${trust.sari}`} />}
              {trust.turuncu > 0 && <div className="bg-[var(--color-atlas-orange)]" style={{ width: `${(trust.turuncu / trustToplam) * 100}%` }} title={`Turuncu: ${trust.turuncu}`} />}
              {trust.kirmizi > 0 && <div className="bg-[var(--color-atlas-danger)]" style={{ width: `${(trust.kirmizi / trustToplam) * 100}%` }} title={`Kırmızı: ${trust.kirmizi}`} />}
              {trust.gri > 0 && <div className="bg-[var(--color-atlas-muted)]" style={{ width: `${(trust.gri / trustToplam) * 100}%` }} title={`Gri: ${trust.gri}`} />}
            </div>
          )}
          <div className="flex flex-wrap gap-4 text-[12px]">
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[var(--color-atlas-success)]" /><span className="text-[var(--color-atlas-text-2)]">Yeşil</span> <span className="text-[var(--color-atlas-text-muted)] tabular-nums">{trust.yesil}</span></div>
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[var(--color-atlas-success-lt)]" /><span className="text-[var(--color-atlas-text-2)]">Açık Yeşil</span> <span className="text-[var(--color-atlas-text-muted)] tabular-nums">{trust.acik_yesil}</span></div>
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[var(--color-atlas-warning)]" /><span className="text-[var(--color-atlas-text-2)]">Sarı</span> <span className="text-[var(--color-atlas-text-muted)] tabular-nums">{trust.sari}</span></div>
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[var(--color-atlas-orange)]" /><span className="text-[var(--color-atlas-text-2)]">Turuncu</span> <span className="text-[var(--color-atlas-text-muted)] tabular-nums">{trust.turuncu}</span></div>
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[var(--color-atlas-danger)]" /><span className="text-[var(--color-atlas-text-2)]">Kırmızı</span> <span className="text-[var(--color-atlas-text-muted)] tabular-nums">{trust.kirmizi}</span></div>
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[var(--color-atlas-muted)]" /><span className="text-[var(--color-atlas-text-2)]">Gri</span> <span className="text-[var(--color-atlas-text-muted)] tabular-nums">{trust.gri}</span></div>
          </div>
        </Card>
      </section>

      {/* 2 KOLON */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

        <div data-tour="recent-activity">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[15px] font-semibold text-[var(--color-atlas-text)]">Son İşlemler <span className="text-[var(--color-atlas-text-muted)] font-normal">(7 gün)</span></h2>
            <Link href="/audit" className="text-[12px] text-[var(--color-atlas-text-muted)] hover:text-[var(--color-atlas-cyan)] transition-colors">Audit →</Link>
          </div>
          {aktiviteler.length === 0 ? (
            <Card className="text-center py-8">
              <div className="text-[13px] text-[var(--color-atlas-text-muted)]">Son 7 günde aktivite yok</div>
            </Card>
          ) : (
            <div className="space-y-1">
              {aktiviteler.map((a) => (
                <div key={a.id} className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius-atlas-sm)] border border-[var(--color-atlas-border)] bg-[var(--color-atlas-surface)] text-[12px]">
                  <Badge tone={ISLEM_TONE[a.islem_turu] ?? 'neutral'}>{a.islem_turu}</Badge>
                  <span className="text-[var(--color-atlas-text-2)] truncate">
                    {ISLEM_ETIKET[a.tablo_adi] ?? a.tablo_adi}
                    {a.kayit_id && <span className="text-[var(--color-atlas-text-disabled)]"> #{a.kayit_id}</span>}
                  </span>
                  <span className="text-[var(--color-atlas-text-muted)] truncate ml-auto whitespace-nowrap">
                    {a.user_ad}
                    {a.sistem_aktoru && <span className="text-[var(--color-atlas-warning)] ml-1">[SYS]</span>}
                  </span>
                  <span className="text-[var(--color-atlas-text-disabled)] whitespace-nowrap">{formatZaman(a.zaman)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div data-tour="week-actions">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[15px] font-semibold text-[var(--color-atlas-text)]">Bu Hafta Yapılacaklar</h2>
            <Link href="/aksiyonlar" className="text-[12px] text-[var(--color-atlas-text-muted)] hover:text-[var(--color-atlas-cyan)] transition-colors">Tümü →</Link>
          </div>
          {aksiyonlar.length === 0 ? (
            <Card className="text-center py-8">
              <div className="text-[13px] text-[var(--color-atlas-text-muted)]">Bu hafta için aksiyon yok</div>
            </Card>
          ) : (
            <div className="space-y-2">
              {aksiyonlar.map((a) => {
                const gecti = a.planlanan_tarih && new Date(a.planlanan_tarih) < new Date();
                return (
                  <Card key={a.id} hoverable padded={false} className="p-3">
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-[13.5px] text-[var(--color-atlas-text)] mb-1.5 truncate">{a.baslik}</div>
                        <div className="flex items-center gap-2 text-[11.5px] text-[var(--color-atlas-text-muted)] flex-wrap">
                          <span className="px-1.5 py-0.5 rounded-[var(--radius-atlas-xs)] bg-[var(--color-atlas-surface-2)] text-[var(--color-atlas-text-2)]">
                            {AKSIYON_ETIKET[a.aksiyon_turu] ?? a.aksiyon_turu}
                          </span>
                          <span className={a.oncelik <= 2 ? 'text-[var(--color-atlas-danger)] font-semibold' : ''}>P{a.oncelik}</span>
                          {a.kisi_ad && a.kisi_id && <Link href={`/kisiler/${a.kisi_id}`} className="text-[var(--color-atlas-cyan)] hover:text-[var(--color-atlas-cyan-hover)] truncate">{a.kisi_ad}</Link>}
                          {!a.kisi_ad && a.kurum_ad && a.kurum_id && <Link href={`/kurumlar/${a.kurum_id}`} className="text-[var(--color-atlas-cyan)] hover:text-[var(--color-atlas-cyan-hover)] truncate">{a.kurum_ad}</Link>}
                        </div>
                      </div>
                      <span className={`text-[11.5px] whitespace-nowrap ${gecti ? 'text-[var(--color-atlas-danger)] font-semibold' : 'text-[var(--color-atlas-text-muted)]'}`}>
                        {formatTarih(a.planlanan_tarih)}
                      </span>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* EN ÇOK BEKLEYEN KURUMLAR */}
      <section data-tour="pending-institutions" className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[15px] font-semibold text-[var(--color-atlas-text)]">En Çok Bekleyen Kurumlar</h2>
          <Link href="/operasyon" className="text-[12px] text-[var(--color-atlas-text-muted)] hover:text-[var(--color-atlas-cyan)] transition-colors">Tümü →</Link>
        </div>
        {bekleyenKurumlar.length === 0 ? (
          <Card className="text-center py-8">
            <div className="text-[13px] text-[var(--color-atlas-text-muted)]">Bekleyen kurum yok</div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {bekleyenKurumlar.map((k) => (
              <Link key={k.id} href={`/kurumlar/${k.id}`}>
                <Card hoverable padded={false} className="p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-[13.5px] text-[var(--color-atlas-text)] mb-1.5 truncate">{k.ad}</div>
                    <div className="flex items-center gap-2 text-[11.5px] text-[var(--color-atlas-text-muted)]">
                      <span className="px-1.5 py-0.5 rounded-[var(--radius-atlas-xs)] bg-[var(--color-atlas-surface-2)] text-[var(--color-atlas-text-2)]">{k.ana_kategori}</span>
                      {k.il_ad && <span>{k.il_ad}</span>}
                    </div>
                  </div>
                  <Badge tone="warning" className="whitespace-nowrap">{k.bekleyen} bekliyor</Badge>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* SON EKLENEN KİŞİLER */}
      <section data-tour="recent-people" className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[15px] font-semibold text-[var(--color-atlas-text)]">Son Eklenen Kişiler</h2>
          <Link href="/kisiler" className="text-[12px] text-[var(--color-atlas-text-muted)] hover:text-[var(--color-atlas-cyan)] transition-colors">Tümü →</Link>
        </div>

        {sonKisiler.length === 0 ? (
          <Card className="text-center py-8">
            <div className="text-[13px] text-[var(--color-atlas-text-muted)] mb-3">Henüz kişi kaydı yok</div>
            <Link href="/ekle" className="inline-block px-4 py-2 rounded-[var(--radius-atlas-sm)] bg-[var(--color-atlas-cyan-dark)] hover:bg-[var(--color-atlas-cyan-hover)] text-white text-[13px] font-medium transition-colors">
              + İlk Kişiyi Ekle
            </Link>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {sonKisiler.map((k) => (
              <Link key={k.id} href={`/kisiler/${k.id}`}>
                <Card hoverable padded={false} className="p-4 h-full">
                  <div className="font-medium text-[13.5px] text-[var(--color-atlas-text)] mb-2 truncate">{k.ad_soyad}</div>
                  {k.makam_ad ? (
                    <div className="flex items-center gap-2 mb-2">
                      {k.makam_sinifi && <Badge tone={SINIF_TONE[k.makam_sinifi] ?? 'neutral'}>{k.makam_sinifi}</Badge>}
                      <span className="text-[11.5px] text-[var(--color-atlas-text-muted)] truncate">{k.makam_ad}</span>
                    </div>
                  ) : (
                    <div className="text-[11.5px] text-[var(--color-atlas-text-disabled)] mb-2">Atama yok</div>
                  )}
                  <div className="flex items-center justify-between text-[11.5px]">
                    {k.kurum_ad ? <span className="text-[var(--color-atlas-text-muted)] truncate">{k.kurum_ad}</span> : <span />}
                    <span className="text-[var(--color-atlas-text-disabled)] ml-2 whitespace-nowrap">{k.atama_sayisi} atama</span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ALT NAVİGASYON */}
      <section data-tour="bottom-nav" className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Link href="/kurumlar">
          <Card hoverable className="text-center">
            <div className="text-[10.5px] uppercase tracking-wider text-[var(--color-atlas-text-muted)] font-medium mb-2">Kurumlar</div>
            <div className="text-[24px] font-semibold text-[var(--color-atlas-text)] tabular-nums">{ozet.kurum}</div>
            <div className="text-[11.5px] text-[var(--color-atlas-text-muted)] mt-1">{ozet.birim} birim · {ozet.makam} makam</div>
          </Card>
        </Link>
        <Link href="/ekle">
          <Card hoverable className="text-center bg-[rgba(34,211,238,0.06)] border-[rgba(34,211,238,0.25)]">
            <div className="text-[10.5px] uppercase tracking-wider text-[var(--color-atlas-cyan)] font-medium mb-2">Hızlı Aksiyon</div>
            <div className="text-[15px] font-semibold text-[var(--color-atlas-cyan)]">+ Yeni Kişi Ekle</div>
            <div className="text-[11.5px] text-[var(--color-atlas-text-muted)] mt-1">Kaynak zorunlu (md. 30)</div>
          </Card>
        </Link>
        <Link href="/arama">
          <Card hoverable className="text-center">
            <div className="text-[10.5px] uppercase tracking-wider text-[var(--color-atlas-text-muted)] font-medium mb-2">Arama</div>
            <div className="text-[15px] font-semibold text-[var(--color-atlas-text)]">Faceted Search</div>
            <div className="text-[11.5px] text-[var(--color-atlas-text-muted)] mt-1">İl · Kategori · Sınıf</div>
          </Card>
        </Link>
        <Link href="/import">
          <Card hoverable className="text-center">
            <div className="text-[10.5px] uppercase tracking-wider text-[var(--color-atlas-text-muted)] font-medium mb-2">Import</div>
            <div className="text-[15px] font-semibold text-[var(--color-atlas-text)]">Toplu Yükleme</div>
            <div className="text-[11.5px] text-[var(--color-atlas-text-muted)] mt-1">CSV · Karantina</div>
          </Card>
        </Link>
      </section>

    </div>
  );
}
