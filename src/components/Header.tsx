'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import LogoInline from './LogoInline';
import { cn } from '@/lib/utils';
import useWindowSize from '@/hooks/useWindowSize';

const navItems = [
  { href: '/project', label: 'Project' },
  { href: '/studio', label: 'Studio' },
];

export default function Header({
  isFixed = true,
  onProjectClick,
  headerLogoTrigger,
}: {
  isFixed?: boolean;
  onProjectClick?: () => void;
  headerLogoTrigger?: number;
}) {
  const pathname = usePathname();
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);
  const windowSize = useWindowSize();

  // headerLogoTrigger 변경 추적
  useEffect(() => {
    if (headerLogoTrigger !== undefined) {
      console.log('[Header] headerLogoTrigger 변경:', headerLogoTrigger, 'pathname:', pathname);
    }
  }, [headerLogoTrigger, pathname]);

  // 클라이언트 사이드에서만 모바일 여부 업데이트 (hydration 불일치 방지)
  useEffect(() => {
    setMounted(true);
    setIsMobile(windowSize.isSm);
  }, [windowSize.isSm]);

  const isVisible = pathname === '/' || pathname === '/studio' || pathname.startsWith('/project');

  if (!isVisible) return null;

  const handleProjectClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (onProjectClick) {
      e.preventDefault();
      onProjectClick();
    }
  };

  // 프로젝트와 studio 페이지에서 z-index 조정
  const isProjectOrStudio = pathname.startsWith('/project') || pathname === '/studio';
  const zIndexClass = isProjectOrStudio ? 'z-50' : 'z-[350]';

  return (
    <header
      className={cn(
        'w-full text-white mix-blend-difference',
        isFixed
          ? `pointer-events-none fixed top-0 ${zIndexClass} px-4 pt-5 md:px-5`
          : `relative ${zIndexClass} px-4 md:px-5`,
      )}
      suppressHydrationWarning>
      <div className="relative mx-auto flex items-start justify-between">
        <Link href="/" className="pointer-events-auto h-full w-[160px] select-none md:w-[300px]">
          <LogoInline
            playTrigger={pathname === '/' || isProjectOrStudio ? headerLogoTrigger : undefined}
            // key prop 제거: 재마운트 방지 (playTrigger로 애니메이션 제어)
          />
        </Link>
        {/* 데스크톱 네비게이션 - Hydration 불일치 방지를 위해 마운트 후에만 조건부 렌더링 */}
        {mounted && !isMobile && (
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
        )}
      </div>
    </header>
  );
}
