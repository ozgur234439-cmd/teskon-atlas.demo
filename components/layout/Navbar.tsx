'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Input } from '@/components/ui/Input';

const ROL_ETIKET: Record<string, string> = {
  OWNER: 'SİSTEM YÖNETİCİSİ',
  ADMIN: 'YÖNETİCİ',
  EXPORTER: 'VERİ DIŞA AKTARICI',
  ANALYST: 'ANALİST',
  USER: 'KULLANICI',
};

const TITLES: Record<string, string> = {
  '/': 'Ana Sayfa',
  '/piyasa': 'Piyasa / Genel Bakış',
  '/kurumlar': 'Kurumlar',
  '/kisiler': 'Kişiler',
  '/teskon': 'TESKON',
  '/trust': 'Güvenilirlik',
  '/audit': 'Denetim Geçmişi',
  '/arama': 'Arama',
};

interface Props {
  adSoyad: string;
  rol: string;
  cikisAction: () => Promise<void>;
}

export function Navbar({ adSoyad, rol, cikisAction }: Props) {
  const pathname = usePathname();
  const title =
    TITLES[pathname] ??
    (pathname.startsWith('/piyasa/firma') ? 'Piyasa / Firma' :
     pathname.startsWith('/piyasa/enr') ? 'Piyasa / ENR' :
     pathname.startsWith('/piyasa/uzmanlik') ? 'Piyasa / İş Kolları' :
     pathname.startsWith('/piyasa/sozlesme') ? 'Piyasa / Sözleşme Modelleri' :
     'ATLAS');

  return (
    <header
      data-tour="navbar"
      className="sticky top-0 z-30 h-14 flex items-center gap-4 px-6
                 bg-[var(--color-atlas-bg)]/95 backdrop-blur
                 border-b border-[var(--color-atlas-border)]"
    >
      <div
        data-tour="breadcrumb"
        className="text-[14px] text-[var(--color-atlas-text-2)] whitespace-nowrap"
      >
        {title}
      </div>

      <div className="flex-1 max-w-xl mx-auto" data-tour="global-search">
        <Link href="/arama">
          <Input
            readOnly
            leading={<span>⌕</span>}
            placeholder="Kurum, kişi, makam, şehir ara..."
            trailing={
              <kbd className="text-[10px] px-1.5 py-0.5 rounded border
                              border-[var(--color-atlas-border-2)]
                              text-[var(--color-atlas-text-muted)]">
                ⌘K
              </kbd>
            }
            className="cursor-pointer"
          />
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <Link
          href="/ekle"
          data-tour="quick-add"
          className="h-8 px-3 inline-flex items-center rounded-[var(--radius-atlas-sm)]
                     bg-[var(--color-atlas-cyan-dark)] text-white text-[12.5px] font-medium
                     hover:bg-[var(--color-atlas-cyan-hover)] transition-colors"
        >
          + Kişi Ekle
        </Link>

        <div
          data-tour="user-menu"
          className="flex items-center gap-3 pl-3 border-l border-[var(--color-atlas-border)]"
        >
          <div className="text-right">
            <div className="text-[12px] text-[var(--color-atlas-text-2)] whitespace-nowrap">
              {adSoyad}
            </div>
            <div className="text-[10.5px] text-[var(--color-atlas-text-muted)] uppercase tracking-wide">
              {ROL_ETIKET[rol] ?? rol}
            </div>
          </div>
          <form action={cikisAction}>
            <button
              type="submit"
              className="text-[11.5px] px-2.5 py-1.5 rounded-[var(--radius-atlas-sm)]
                         text-[var(--color-atlas-text-2)] hover:bg-[var(--color-atlas-surface-2)]
                         hover:text-[var(--color-atlas-danger)] transition-colors"
            >
              Çıkış
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
