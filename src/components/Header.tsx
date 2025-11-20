'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import LogoInline from './LogoInline';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/project', label: 'Project' },
  { href: '/studio', label: 'Studio' },
];

export default function Header({ isBlendMode = false, isFixed = false }: { isBlendMode?: boolean; isFixed?: boolean }) {
  const pathname = usePathname();

  const blendClass =
    'mix-blend-exclusion supports-[mix-blend-mode:mix-blend-exclusion]:mix-blend-exclusion supports-[mix-blend-mode:exclusion]:text-black';

  return (
    <header className={cn(isFixed ? 'fixed top-0 z-100 w-full px-5 pt-5' : 'relative w-full')}>
      <div className="relative mx-auto flex items-start justify-between">
        <Link href="/">
          <LogoInline src="/data.svg" width={200} height={85} />
        </Link>
        <nav className="flex gap-5">
          {navItems.map(({ href, label }) => {
            const active = pathname === href || (href !== '/' && pathname.startsWith(href));
            return (
              <Link key={href} href={href} aria-current={active ? 'page' : undefined}>
                <h4>{label}</h4>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
