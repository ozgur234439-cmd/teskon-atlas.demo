// TESKON Atlas V1 — Trust + Rozet (madde 38-47)
// KRİTİK: YEŞİL rozet insan teyidi olmadan verilemez (madde 47)

export const TRUST_KURAL_VERSIYON = 'v1.0';

const KAYNAK_AGIRLIK: Record<string, number> = {
  INSAN_TEYIDI: 60,
  DIREKT_ILETISIM: 58,
  RESMI_KURUM_SITESI: 55,
  RESMI_BELGE: 55,
  SANTRAL_TEYIDI: 50,
  SAHA_GORUSMESI: 45,
  IKINCIL_KAYNAK: 30,
  AI_ADAYI: 10,
  DIGER: 20,
};

const ATAMA_DURUM_KATSAYI: Record<string, number> = {
  AKTIF: 1.0,
  BELIRSIZ: 0.7,
  AYRILDI: 0.5,
};

// Madde 43: makam sınıfına göre yaşlanma yarı ömrü (gün)
const YASLANMA_YARI_OMUR: Record<string, number> = {
  A: 365,
  B: 180,
  C: 90,
  D: 60,
};

export function kaynakAgirligi(kaynak_turu: string): number {
  return KAYNAK_AGIRLIK[kaynak_turu] ?? 20;
}

export function guncellikFaktoru(
  teyit_tarihi: string | Date,
  makam_sinifi: string = 'B'
): number {
  const tarih = new Date(teyit_tarihi);
  const gun = Math.floor((Date.now() - tarih.getTime()) / (1000 * 60 * 60 * 24));
  const yariOmur = YASLANMA_YARI_OMUR[makam_sinifi] ?? 180;
  return 1 / (1 + Math.log10(1 + gun / yariOmur));
}

// Madde 41A: son 2 teyit farklı sonuç verdiyse çelişki → trust düşürücü
export function celiskiCarpani(sonTeyitler: Array<{ teyit_sonucu: string }>): number {
  if (sonTeyitler.length < 2) return 1;
  const son = sonTeyitler[0].teyit_sonucu;
  const onceki = sonTeyitler[1].teyit_sonucu;
  if (son !== onceki) return 0.7;
  return 1;
}

export type TrustGirdi = {
  kaynak_turu: string;
  teyit_sonucu: string;
  teyit_tarihi: string | Date;
  atama_durumu: string;
  makam_sinifi?: string;
  onceki_teyitler?: Array<{ teyit_sonucu: string }>;
};

export type TrustDetay = {
  trust: number;
  kaynak_gucu: number;
  guncellik: number;
  atama_katsayi: number;
  teyit_cezasi: number;
  celiski_carpani: number;
  aciklama: string;
};

export function hesaplaTrustDetay(girdi: TrustGirdi): TrustDetay {
  const kaynakGucu = kaynakAgirligi(girdi.kaynak_turu);
  const guncellik = guncellikFaktoru(girdi.teyit_tarihi, girdi.makam_sinifi ?? 'B');
  const atamaKatsayi = ATAMA_DURUM_KATSAYI[girdi.atama_durumu] ?? 0.5;
  const celiski = celiskiCarpani(girdi.onceki_teyitler ?? []);

  let teyitCezasi = 1;
  if (girdi.teyit_sonucu === 'DOGRULANAMADI') teyitCezasi = 0.3;
  if (girdi.teyit_sonucu === 'DEGISMIS') teyitCezasi = 0.6;

  const ham = kaynakGucu * guncellik * atamaKatsayi * teyitCezasi * celiski;
  const trust = Math.max(0, Math.min(100, Math.round(ham)));

  let aciklama = `${kaynakGucu} × ${guncellik.toFixed(2)} × ${atamaKatsayi.toFixed(2)}`;
  if (teyitCezasi !== 1) aciklama += ` × ${teyitCezasi.toFixed(2)}`;
  if (celiski !== 1) aciklama += ` × ${celiski.toFixed(2)} (çelişki)`;
  aciklama += ` = ${trust}`;

  return {
    trust,
    kaynak_gucu: kaynakGucu,
    guncellik,
    atama_katsayi: atamaKatsayi,
    teyit_cezasi: teyitCezasi,
    celiski_carpani: celiski,
    aciklama,
  };
}

export function hesaplaTrust(girdi: TrustGirdi): number {
  return hesaplaTrustDetay(girdi).trust;
}

export type Rozet = 'YESIL' | 'ACIK_YESIL' | 'SARI' | 'TURUNCU' | 'KIRMIZI' | 'GRI';

// KRİTİK (madde 47): YEŞİL için teyitSayisi > 0 olmalı
export function hesaplaRozet(trust: number | null, teyitSayisi: number = 0): Rozet {
  if (trust === null) return 'GRI';

  if (teyitSayisi === 0) {
    if (trust >= 45) return 'ACIK_YESIL';
    if (trust >= 30) return 'SARI';
    if (trust >= 15) return 'TURUNCU';
    return 'KIRMIZI';
  }

  if (trust >= 55) return 'YESIL';
  if (trust >= 45) return 'ACIK_YESIL';
  if (trust >= 30) return 'SARI';
  if (trust >= 15) return 'TURUNCU';
  return 'KIRMIZI';
}

export const ROZET_STIL: Record<Rozet, { bg: string; label: string }> = {
  YESIL: { bg: 'bg-green-500 text-white', label: 'YEŞİL' },
  ACIK_YESIL: { bg: 'bg-green-400 text-black', label: 'AÇIK YEŞİL' },
  SARI: { bg: 'bg-yellow-500 text-black', label: 'SARI' },
  TURUNCU: { bg: 'bg-orange-500 text-white', label: 'TURUNCU' },
  KIRMIZI: { bg: 'bg-red-600 text-white', label: 'KIRMIZI' },
  GRI: { bg: 'bg-neutral-700 text-neutral-300', label: 'GRİ' },
};