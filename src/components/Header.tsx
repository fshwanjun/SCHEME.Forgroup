'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import LogoInline from './LogoInline';

const navItems = [
  { href: '/project', label: 'Project' },
  { href: '/studio', label: 'Studio' },
];

export default function Header() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);
  const isProjectSlug = segments[0] === 'project' && segments.length >= 2;
  const [isPastHero, setIsPastHero] = useState(false);

  useEffect(() => {
    if (!isProjectSlug) {
      setIsPastHero(false);
      return;
    }

    const handleScroll = () => {
      const threshold = window.innerHeight || 0;
      setIsPastHero(window.scrollY + 88 >= threshold);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [isProjectSlug]);

  const colorClass = isProjectSlug && !isPastHero ? 'text-white' : 'text-black';
  const [logoPlayNonce, setLogoPlayNonce] = useState(0);

  useEffect(() => {
    const handler = () => setLogoPlayNonce((n) => n + 1);
    window.addEventListener('header-logo-play', handler as EventListener);
    return () => window.removeEventListener('header-logo-play', handler as EventListener);
  }, []);

  return (
    <header className="fixed w-full top-0 z-100 h-(--header-height) isolate">
      <div className="mx-auto px-(--x-padding) pt-6 flex items-start justify-between">
        <Link
          href="/"
          className={`font-semibold text-[64px] leading-[64px] transition-colors duration-300 ${colorClass}`}>
          <LogoInline className="transition-colors duration-300" width={200} height={65} playTrigger={logoPlayNonce} />
        </Link>
        <nav className="flex items-center gap-6 ">
          {navItems.map(({ href, label }) => {
            const active = pathname === href || (href !== '/' && pathname.startsWith(href));
            return (
              <Link key={href} href={href} aria-current={active ? 'page' : undefined}>
                <h4 className={`text-[20px] font-bold transition-colors duration-300 ${colorClass}`}>{label}</h4>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
