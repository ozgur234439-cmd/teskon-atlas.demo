'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';

interface Props { adminMi?: boolean; exportcuMu?: boolean; }

export function Sidebar({ adminMi = false, exportcuMu = false }: Props) {
  const pathname = usePathname();

  const groups = [
    {
      label: 'ANA',
      items: [
        { href: '/',           label: 'Ana Sayfa',    icon: '◇', tour: 'menu-ana-sayfa' },
        { href: '/arama',      label: 'Arama',        icon: '⌕', tour: 'menu-arama' },
        { href: '/kurumlar',   label: 'Kurumlar',     icon: '▢', tour: 'menu-kurumlar' },
        { href: '/kisiler',    label: 'Kişiler',      icon: '◉', tour: 'menu-kisiler' },
        { href: '/pazar',      label: 'Pazar',        icon: '◈', tour: 'menu-pazar' },
      ],
    },
    {
      label: 'İŞLEMLER',
      items: [
        { href: '/aksiyonlar', label: 'İşlemler',     icon: '⚡', tour: 'menu-islemler' },
        { href: '/notlar',     label: 'Notlar',       icon: '▭', tour: 'menu-notlar' },
        { href: '/favoriler',  label: 'Favoriler',    icon: '★', tour: 'menu-favoriler' },
        { href: '/etiketler',  label: 'Etiketler',    icon: '◆', tour: 'menu-etiketler' },
        { href: '/trust',      label: 'Güvenilirlik', icon: '◎', tour: 'menu-guvenilirlik' },
        { href: '/operasyon',  label: 'Operasyon',    icon: '▣', tour: 'menu-operasyon' },
      ],
    },
    {
      label: 'İSTİHBARAT',
      items: [
        { href: '/teskon', label: 'TESKON',            icon: '▤', tour: 'menu-teskon' },
        { href: '/piyasa', label: 'Piyasa',            icon: '◆', tour: 'menu-piyasa' },
        { href: '/import', label: 'Veri Alma',         icon: '↓', tour: 'menu-veri-alma' },
        ...(exportcuMu ? [{ href: '/export', label: 'Veri Dışa Aktarma', icon: '↑', tour: 'menu-veri-disa' }] : []),
      ],
    },
    {
      label: 'SİSTEM',
      items: [
        { href: '/rol-paketleri', label: 'Rol Paketleri', icon: '§', tour: 'menu-rol-paketleri' },
        ...(adminMi ? [
          { href: '/kullanicilar', label: 'Kullanıcılar',     icon: '◉', tour: 'menu-kullanicilar' },
          { href: '/audit',        label: 'Denetim Geçmişi',  icon: '◎', tour: 'menu-denetim' },
        ] : []),
      ],
    },
  ];

  return (
    <aside
      data-tour="sidebar"
      className="w-60 shrink-0 h-screen sticky top-0 overflow-y-auto
                 bg-[var(--color-atlas-bg)] border-r border-[var(--color-atlas-border)]"
    >
      <div className="px-5 py-5 border-b border-[var(--color-atlas-border)]">
        <Link href="/" data-tour="logo" className="flex items-center gap-2 group">
          <span className="text-[var(--color-atlas-cyan)] text-lg">◈</span>
          <span className="text-[15px] font-semibold tracking-wide text-[var(--color-atlas-text)]">
            ATLAS
          </span>
        </Link>
      </div>

      <nav className="px-2 py-4 space-y-6">
        {groups.map((g) => (
          <div key={g.label}>
            <div className="px-3 mb-2 text-[10.5px] font-medium tracking-wider
                            text-[var(--color-atlas-text-disabled)]">
              {g.label}
            </div>
            <ul className="space-y-0.5">
              {g.items.map((it) => {
                const active =
                  it.href === '/'
                    ? pathname === '/'
                    : pathname === it.href || pathname.startsWith(it.href + '/');
                return (
                  <li key={it.href}>
                    <Link
                      href={it.href}
                      data-tour={it.tour}
                      className={cn(
                        'relative flex items-center gap-3 px-3 py-2 rounded-[var(--radius-atlas-sm)]',
                        'text-[13.5px] transition-colors duration-150',
                        active
                          ? 'bg-[var(--color-atlas-cyan-soft)] text-[var(--color-atlas-cyan)]'
                          : 'text-[var(--color-atlas-text-2)] hover:bg-[var(--color-atlas-surface-2)] hover:text-[var(--color-atlas-text)]'
                      )}
                    >
                      {active && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2
                                         h-5 w-0.5 rounded-r bg-[var(--color-atlas-cyan)]" />
                      )}
                      <span className="w-4 text-center text-[12px] opacity-70">{it.icon}</span>
                      <span>{it.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
