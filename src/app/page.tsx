'use client';

import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import HomeGallery, { type GallerySelection } from '@/components/HomeGallery';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { useZoom } from '@/hooks/useZoom';
import Header from '@/components/Header';
import MobileMenu from '@/components/MobileMenu';
import IntroLogo from '@/components/IntroLogo';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

// Landing Page 이미지 타입 정의
interface LandingPageImage {
  id: string;
  url: string;
  order: number;
  orientation?: 'horizontal' | 'vertical';
  projectSlug?: string; // 프로젝트 상세 페이지 링크 (선택적)
}

export default function Home() {
  const [landingImages, setLandingImages] = useState<
    Array<{ projectId: string; projectSlug?: string; verticalSrc: string; horizontalSrc: string }>
  >([]);
  const [headerLogoTrigger, setHeaderLogoTrigger] = useState<number | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const modeRef = useRef<string>('default');

  // useZoom 훅 사용 - 초기 모드는 default
  const { selected, mode, zoomStyle, isAnimating, selectImage, setMode, zoomOut } = useZoom({
    initialMode: 'default',
    centerPadding: 200,
    containerRef,
    animationDuration: 800,
    lockScroll: true,
    zoomOutOnResize: true,
    debug: false,
  });

  // 무한 스크롤 훅 사용
  const { setTriggerElement, renderSections } = useInfiniteScroll({
    initialSectionIds: [0, 1, 2],
    triggerIndex: 1,
    triggerOffset: 1000,
    disabled: mode !== 'default',
  });

  // mode가 변경될 때 ref 업데이트 및 히스토리 관리
  useEffect(() => {
    modeRef.current = mode;

    // center 또는 cover 모드로 진입할 때 히스토리에 상태 추가
    if (mode === 'center' || mode === 'cover') {
      window.history.pushState({ zoomed: true, mode }, '');
    }
  }, [mode]);

  // Landing Page 이미지 불러오기
  useEffect(() => {
    const fetchLandingImages = async () => {
      try {
        const { data: configData } = await supabase.from('config').select('content').eq('id', 'landing').single();

        if (configData?.content && typeof configData.content === 'object' && 'images' in configData.content) {
          const images = (configData.content as { images: LandingPageImage[] }).images || [];
          // order 기준으로 정렬
          const sortedImages = [...images].sort((a, b) => (a.order || 0) - (b.order || 0));

          // ProjectImage 형식으로 변환
          const projectImages = sortedImages.map((img) => ({
            projectId: img.projectSlug || img.id,
            projectSlug: img.projectSlug,
            verticalSrc: img.url,
            horizontalSrc: img.url,
          }));

          setLandingImages(projectImages);
        }
      } catch (error) {
        console.error('Landing page images load error:', error);
      }
    };

    fetchLandingImages();
  }, []);

  // 페이지 로드 시 스크롤 최상단 이동 및 복원 방지
  useEffect(() => {
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }

    // 초기 히스토리 상태 설정 (뒤로가기 감지용)
    window.history.replaceState({ zoomed: false }, '', window.location.pathname);

    const scrollToTop = () => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    };

    scrollToTop();

    requestAnimationFrame(() => {
      requestAnimationFrame(scrollToTop);
    });

    return () => {
      if ('scrollRestoration' in history) {
        history.scrollRestoration = 'auto';
      }
    };
  }, []);

  // 이미지 선택 핸들러 - default에서는 center로, center에서는 cover로
  const handleSelectImage = useCallback(
    (image: GallerySelection) => {
      console.log('[Home] handleSelectImage called', {
        imageProjectId: image.projectId,
        selectedProjectId: selected?.projectId,
        currentMode: mode,
      });

      // 같은 이미지를 클릭한 경우
      if (selected?.projectId === image.projectId) {
        // center 상태면 cover로 전환
        if (mode === 'center') {
          console.log('[Home] center → cover');
          setMode('cover');
        }
        // cover 상태면 아무 동작 안함
        return;
      }

      // 다른 이미지를 클릭한 경우: 새로운 이미지 선택하고 center 모드로
      console.log('[Home] 새로운 이미지 선택, center 모드로');
      selectImage(image, 'center');
    },
    [selected, mode, selectImage, setMode],
  );

  // 섹션 리스트 생성
  const list = useMemo(
    () =>
      renderSections((id, index, isTrigger) => (
        <div key={id} ref={isTrigger ? setTriggerElement : null} data-section-id={id} data-is-trigger={isTrigger}>
          <HomeGallery
            images={landingImages}
            onSelectImage={handleSelectImage}
            selectedProjectId={selected?.projectId ?? null}
          />
        </div>
      )),
    [renderSections, setTriggerElement, landingImages, handleSelectImage, selected?.projectId],
  );

  // ESC 키로 줌 아웃
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && (mode === 'center' || mode === 'cover')) {
        zoomOut();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [mode, zoomOut]);

  // 뒤로가기 버튼 처리 - center/cover 모드에서 줌 아웃
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      console.log('[Home] popstate 감지', {
        state: e.state,
        modeRef: modeRef.current,
      });

      if (modeRef.current === 'center' || modeRef.current === 'cover') {
        console.log('[Home] 뒤로가기로 줌 아웃 실행');
        zoomOut();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [zoomOut]);

  const handleHeaderAnimationStart = useCallback(() => {
    const trigger = Date.now();
    setHeaderLogoTrigger(trigger);
  }, []);

  return (
    <>
      <IntroLogo onHeaderAnimationStart={handleHeaderAnimationStart} />
      <Header headerLogoTrigger={headerLogoTrigger} isFixed={true} />
      <MobileMenu headerLogoTrigger={headerLogoTrigger} />

      <div
        className={cn(
          'h-screen overflow-y-scroll',
          mode === 'center' || mode === 'cover' || isAnimating ? 'overflow-hidden' : '',
        )}>
        <motion.main
          ref={containerRef}
          animate={{
            x: zoomStyle.x,
            y: zoomStyle.y,
            scale: zoomStyle.scale,
          }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          style={{
            transformOrigin: `${zoomStyle.originX}px ${zoomStyle.originY}px`,
            width: '100vw',
            height: '100vh',
            overflow: 'hidden !important',
            pointerEvents: isAnimating ? 'none' : 'auto',
            position: 'relative',
          }}>
          <div
            className={cn(
              'h-screen overflow-y-scroll',
              isAnimating ? 'pointer-events-none overflow-hidden' : 'pointer-events-auto',
              mode === 'center' || mode === 'cover' || isAnimating ? 'overflow-hidden' : '',
            )}>
            {list}
          </div>
        </motion.main>
      </div>
    </>
  );
}
