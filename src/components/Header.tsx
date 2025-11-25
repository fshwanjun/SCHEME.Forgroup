'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import LogoInline from './LogoInline';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/project', label: 'Project' },
  { href: '/studio', label: 'Studio' },
];

export default function Header({
  isFixed = true,
  onProjectClick,
}: {
  isFixed?: boolean;
  onProjectClick?: () => void;
}) {
  const pathname = usePathname();

  const isVisible = pathname === '/' || pathname === '/studio' || pathname.startsWith('/project');

  if (!isVisible) return null;

  const handleProjectClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (onProjectClick) {
      e.preventDefault();
      onProjectClick();
    }
  };

  return (
    <header
      className={cn(
        'w-full text-white mix-blend-difference',
        isFixed ? 'pointer-events-none fixed top-0 z-[250] px-5 pt-5' : 'relative',
      )}>
      <div className="relative mx-auto flex items-start justify-between">
        <Link href="/" className="pointer-events-auto select-none">
          <LogoInline
            src="/data.svg"
            width={200}
            height={85}
            // 홈으로 돌아왔을 때 애니메이션을 재시작하기 위해 key를 변경합니다.
            // 홈('/')에서는 'home-logo', 그 외 페이지에서는 'sub-logo'를 키로 사용합니다.
            key={pathname === '/' ? 'home-logo' : 'sub-logo'}
          />
        </Link>
        <nav className="flex gap-5">
          {navItems.map(({ href, label }) => {
            const active = pathname === href || (href !== '/' && pathname.startsWith(href));
            const isProjectLink = href === '/project';
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className="pointer-events-auto select-none"
                onClick={isProjectLink ? handleProjectClick : undefined}>
                <h4>{label}</h4>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
