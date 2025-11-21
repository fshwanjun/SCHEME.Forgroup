'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import LogoInline from './LogoInline';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/project', label: 'Project' },
  { href: '/studio', label: 'Studio' },
];

export default function Header({ isFixed = true }: { isFixed?: boolean }) {
  const pathname = usePathname();

  const isVisible = pathname === '/' || pathname === '/studio' || pathname.startsWith('/project');

  if (!isVisible) return null;

  return (
    <header className={cn('w-full', isFixed ? 'pointer-events-none fixed top-0 z-999 px-5 pt-5' : 'relative')}>
      <div className="relative mx-auto flex items-start justify-between">
        <Link href="/ " className="pointer-events-auto select-none">
          <LogoInline src="/data.svg" width={200} height={85} />
        </Link>
        <nav className="flex gap-5">
          {navItems.map(({ href, label }) => {
            const active = pathname === href || (href !== '/' && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className="pointer-events-auto select-none">
                <h4>{label}</h4>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
