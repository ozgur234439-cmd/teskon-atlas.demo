export interface TourStep {
  id: string;
  route?: string;
  target?: string;
  title: string;
  description: string;
  placement?: "top" | "bottom" | "left" | "right" | "center";
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    route: "/",
    placement: "center",
    title: "ATLAS'a Hoş Geldiniz",
    description: "ATLAS; kurumları, kişileri, makamları, kaynakları, güvenilirlik durumlarını ve piyasa bilgilerini tek bir sistemde bir araya getirir. 8 adımda tüm arayüzü tanıyalım.",
  },
  {
    id: "search",
    route: "/",
    target: "global-search",
    placement: "bottom",
    title: "Hızlı Arama",
    description: "Kurum, kişi, makam ve şehir araması. Ctrl + K kısayolu ile hızlı erişim.",
  },
  {
    id: "kurumlar",
    route: "/",
    target: "menu-kurumlar",
    placement: "right",
    title: "Kurumlar",
    description: "Kurumlara, birimlere ve ilgili makamlara buradan ulaşabilirsiniz. Türkiye genelinde kurumsal hafıza.",
  },
  {
    id: "geo",
    route: "/",
    target: "menu-pazar",
    placement: "right",
    title: "Coğrafya",
    description: "Türkiye'nin 81 ili, 973 ilçesi ve 31.921 mahallesi. İl → İlçe → Mahalle hiyerarşisi.",
  },
  {
    id: "trust",
    route: "/",
    target: "menu-guvenilirlik",
    placement: "right",
    title: "Güvenilirlik",
    description: "Bilgilerin kaynak, teyit ve doğrulama durumları. 0-100 arası güven puanı.",
  },
  {
    id: "piyasa",
    route: "/",
    target: "menu-piyasa",
    placement: "right",
    title: "Piyasa",
    description: "Rakipler, kıyas firmaları, ENR sıralamaları ve uzmanlık alanları.",
  },
  {
    id: "teskon",
    route: "/",
    target: "menu-teskon",
    placement: "right",
    title: "TESKON",
    description: "TESKON odaklı istihbarat. Doğru şehirde, doğru kurumda, doğru birime ve doğru makama ulaşma.",
  },
  {
    id: "finish",
    route: "/",
    placement: "center",
    title: "ATLAS'ı Keşfetmeyi Tamamladınız",
    description: "Artık ATLAS'ın temel yapısını biliyorsunuz. Sol menüden istediğiniz bölüme gidebilirsiniz.",
  },
];
