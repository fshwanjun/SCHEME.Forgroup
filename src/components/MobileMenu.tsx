'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import useWindowSize from '@/hooks/useWindowSize';
import { supabase } from '@/lib/supabase';
import LogoInline from './LogoInline';

const navItems = [
  { href: '/project', label: 'Project' },
  { href: '/studio', label: 'Studio' },
];

export default function MobileMenu({
  onProjectClick,
  headerLogoTrigger,
}: {
  onProjectClick?: () => void;
  headerLogoTrigger?: number;
}) {
  const pathname = usePathname();
  const windowSize = useWindowSize();
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [social, setSocial] = useState<string>('@forforfor'); // 기본값

  // 클라이언트 사이드에서만 모바일 여부 업데이트 (hydration 불일치 방지)
  useEffect(() => {
    setMounted(true);
    setIsMobile(windowSize.isSm);
  }, [windowSize.isSm]);

  // studio 페이지처럼 social 데이터 가져오기
  useEffect(() => {
    const fetchSocial = async () => {
      const { data: configData, error } = await supabase.from('config').select('content').eq('id', 'about').single();

      if (error) {
        return;
      }

      if (configData?.content) {
        try {
          const content = configData.content;
          const parsed = typeof content === 'string' ? JSON.parse(content) : content;
          if (parsed.social) {
            // @가 없으면 추가
            const socialValue = parsed.social.startsWith('@') ? parsed.social : `@${parsed.social}`;
            setSocial(socialValue);
          }
        } catch {
          // 파싱 실패 시 무시
        }
      }
    };

    fetchSocial();
  }, []);

  const isVisible = pathname === '/' || pathname === '/studio' || pathname.startsWith('/project');

  // Hydration 불일치 방지: 마운트 전에는 렌더링하지 않음
  if (!mounted || !isVisible || !isMobile) return null;

  const handleProjectClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (onProjectClick) {
      e.preventDefault();
      onProjectClick();
    }
    setIsMenuOpen(false);
  };

  const handleNavClick = () => {
    setIsMenuOpen(false);
  };

  return (
    <>
      {/* 햄버거 메뉴 버튼 - 헤더 우측 네비게이션 위치와 동일하게 정렬 */}
      {/* 참고: MOBILE_MENU_CONFIG.zIndex.button = 400 */}
      <button
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className="pointer-events-auto fixed top-6 right-4 z-[400] flex h-8 w-8 items-center justify-center select-none"
        style={{ mixBlendMode: 'normal' }}
        aria-label={isMenuOpen ? '메뉴 닫기' : '메뉴 열기'}>
        <div className="relative flex h-3 w-6 items-center justify-center">
          <span
            className={cn(
              'absolute block h-[2px] w-6 bg-black transition-all duration-300',
              isMenuOpen ? 'top-0 rotate-45' : '-top-1 rotate-0',
            )}></span>
          <span
            className={cn(
              'absolute block h-[2px] w-6 bg-black transition-all duration-300',
              isMenuOpen ? 'top-0 -rotate-45' : 'top-1 rotate-0',
            )}></span>
        </div>
      </button>

      {/* 모바일 메뉴 - 화면 전체를 덮는 흰색 메뉴 (헤더 아래) */}
      {/* 참고: MOBILE_MENU_CONFIG.zIndex.menu = 300, logo = { height: 80, width: 200 } */}
      {isMenuOpen && (
        <nav className="pointer-events-auto fixed inset-0 z-[300] bg-white text-black">
          <div className="flex h-full flex-col p-6 pt-30">
            {navItems.map(({ href, label }) => {
              const active = pathname === href || (href !== '/' && pathname.startsWith(href));
              const isProjectLink = href === '/project';
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'w-fit p-1 text-lg font-medium transition-colors',
                    active ? 'text-black' : 'text-black',
                  )}
                  onClick={isProjectLink ? handleProjectClick : handleNavClick}>
                  {label}
                </Link>
              );
            })}
          </div>
          <a
            href={`https://instagram.com/${social.replace('@', '')}`}
            className="absolute right-4 bottom-4 text-right"
            target="_blank"
            rel="noopener noreferrer">
            {social}
          </a>
        </nav>
      )}
    </>
  );
}
