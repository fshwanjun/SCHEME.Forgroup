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
  // 모바일에서는 모바일 메뉴 버튼(z-[400])보다 위에 오도록 z-index 설정
  const zIndexClass = isDetailPage
    ? 'z-[400]' // HEADER_CONFIG.zIndex.detailPage
    : isProjectOrStudio
      ? 'z-[450]' // 모바일 메뉴 버튼(z-[400])보다 위에 오도록 조정
      : 'z-[350]'; // HEADER_CONFIG.zIndex.default

  // 모바일에서는 항상 fixed, 데스크톱에서만 isFixed prop에 따라 결정
  const effectiveIsFixed = mounted ? (isMobile ? true : isFixed) : isFixed;

  // studio 페이지 여부 확인
  const isStudioPage = pathname === '/studio';

  return (
    <header
      className={cn(
        'w-full px-8 pt-5 text-white mix-blend-difference',
        // studio 페이지는 기존 padding 유지, 나머지는 px-8
        isStudioPage ? 'px-4 md:px-8' : 'px-8',
        // 모든 페이지에서 mix-blend-difference 사용
        effectiveIsFixed ? `pointer-events-none fixed top-0 right-0 left-0 ${zIndexClass}` : `relative ${zIndexClass}`,
      )}
      style={{
        // relative일 때도 명시적으로 position 설정
        position: effectiveIsFixed ? 'fixed' : 'relative',
        // 모바일에서 브라우저 UI 변경에 영향받지 않도록 transform 제거
        // will-change를 사용하여 레이어 생성 (mix-blend-difference 호환)
        willChange: 'auto',
      }}
      suppressHydrationWarning>
      <div className="relative mx-auto flex items-start justify-between">
        {/* 참고: HEADER_CONFIG.logo = { mobileWidth: 160, desktopWidth: 300 } */}
        <Link href="/" className="pointer-events-auto h-full w-[120px] min-w-[120px] select-none md:w-[15vh]">
          <LogoInline
            playTrigger={pathname === '/' || isProjectOrStudio ? headerLogoTrigger : undefined}
            invert={true} // 모든 페이지에서 인버트 적용 (mix-blend-difference와 함께 사용)
            // key prop 제거: 재마운트 방지 (playTrigger로 애니메이션 제어)
          />
        </Link>
        {/* 데스크톱 네비게이션 - Hydration 불일치 방지를 위해 마운트 후에만 조건부 렌더링 */}
        {mounted && !isMobile && (
          <nav className="flex gap-8">
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
