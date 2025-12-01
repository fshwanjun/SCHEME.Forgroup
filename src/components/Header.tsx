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
  // 참고: HEADER_CONFIG.zIndex = { detailPage: 400, projectOrStudio: 50, default: 350 }
  const isProjectOrStudio = pathname.startsWith('/project') || pathname === '/studio';
  // 상세 페이지는 z-index를 더 높게 설정하여 모달 위에 표시
  const isDetailPage = pathname.startsWith('/project/') && pathname !== '/project';
  const zIndexClass = isDetailPage
    ? 'z-[400]' // HEADER_CONFIG.zIndex.detailPage
    : isProjectOrStudio
      ? 'z-50' // HEADER_CONFIG.zIndex.projectOrStudio
      : 'z-[350]'; // HEADER_CONFIG.zIndex.default

  return (
    <header
      className={cn(
        'w-full text-white mix-blend-difference',
        isFixed ? `pointer-events-none fixed top-0 ${zIndexClass} px-4 pt-5 md:px-5` : `relative ${zIndexClass}`,
      )}
      style={{
        // mix-blend-difference가 transform된 요소와 올바르게 작동하도록
        // transform을 사용하여 새로운 stacking context를 만들되,
        // 헤더가 transform된 요소의 배경과 blend되도록 함
        transform: 'translateZ(0)',
      }}
      suppressHydrationWarning>
      <div className="relative mx-auto flex items-start justify-between">
        {/* 참고: HEADER_CONFIG.logo = { mobileWidth: 160, desktopWidth: 300 } */}
        <Link href="/" className="pointer-events-auto h-full w-[120px] min-w-[120px] select-none md:w-[15vh]">
          <LogoInline
            playTrigger={pathname === '/' || isProjectOrStudio ? headerLogoTrigger : undefined}
            invert={true} // 헤더에서는 항상 인버트 적용
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
