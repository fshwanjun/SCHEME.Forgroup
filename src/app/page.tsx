'use client';

import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import HomeGallery, { type GallerySelection } from '@/components/HomeGallery';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { useZoom } from '@/hooks/useZoom';
import useWindowSize from '@/hooks/useWindowSize';
import Header from '@/components/Header';
import MobileMenu from '@/components/MobileMenu';
import IntroLogo from '@/components/IntroLogo';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { HOME_DISTORT_CONFIG } from '@/config/distortConfig';

const ProjectDetailContent = dynamic(() => import('@/components/ProjectDetailContent'), {
  ssr: false,
});

// Landing Page 이미지 타입 정의
interface LandingPageImage {
  id: string;
  url: string;
  order: number;
  orientation?: 'horizontal' | 'vertical';
  projectSlug?: string; // 프로젝트 상세 페이지 링크 (선택적)
}

interface ProjectContent {
  thumbnail43?: string;
  thumbnail34?: string;
  project?: string;
  year?: number;
  client?: string;
  services?: string;
  product?: string;
  keyword?: string[];
  challenge?: string;
  detailImages?: Array<{
    id: string;
    url: string;
    orientation?: 'horizontal' | 'vertical';
    position?: 'left' | 'center' | 'right' | 'full-cover' | 'full-padding';
  }>;
}

interface Project {
  id: number;
  slug: string;
  title: string;
  description: string;
  contents?: ProjectContent;
}

export default function Home() {
  const [landingImages, setLandingImages] = useState<
    Array<{
      projectId: string;
      projectSlug?: string;
      verticalSrc: string;
      horizontalSrc: string;
      orientation?: 'horizontal' | 'vertical';
    }>
  >([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [headerLogoTrigger, setHeaderLogoTrigger] = useState<number | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const modeRef = useRef<string>('default');
  const windowSize = useWindowSize();
  const isMobile = windowSize.isSm;

  // useZoom 훅 사용 - 초기 모드는 default
  // cover 모드일 때는 리사이즈 시 페이지 이동을 위해 zoomOutOnResize를 false로 설정
  // 모바일에서는 centerPadding을 더 작게 설정하여 더 많이 확대
  const { selected, mode, zoomStyle, isAnimating, selectImage, setMode, zoomOut } = useZoom({
    initialMode: 'default',
    centerPadding: isMobile ? 40 : 200, // 모바일: 40px, 데스크톱: 200px
    containerRef,
    animationDuration: 800,
    lockScroll: true,
    zoomOutOnResize: false, // cover 모드일 때는 직접 처리
    debug: false,
  });

  // 무한 스크롤 훅 사용
  const { setTriggerElement, renderSections } = useInfiniteScroll({
    initialSectionIds: [0, 1, 2],
    triggerOffset: 1500,
    disabled: mode !== 'default',
    maxSections: 8,
    scrollContainerRef,
  });

  // 프로젝트 목록 가져오기
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const { data, error } = await supabase
          .from('project')
          .select('id, slug, title, description, contents')
          .eq('status', 'published')
          .order('display_order', { ascending: true });

        if (error) {
          // 에러 무시
        } else {
          setProjects(data || []);
        }
      } catch {
        // 에러 무시
      }
    };

    fetchProjects();
  }, []);

  // 선택된 프로젝트 찾기
  const selectedProjectData = useMemo(() => {
    if (!selected) return null;

    // projectId가 slug인지 확인하고 프로젝트 찾기
    const project = projects.find((p) => p.slug === selected.projectId || p.id.toString() === selected.projectId);
    return project || null;
  }, [selected, projects]);

  // 모드 변경 시 history 및 프로젝트 상태 관리
  const prevModeRef = useRef<string>('default');
  const historyPushedRef = useRef<boolean>(false);

  useEffect(() => {
    const prevMode = prevModeRef.current;

    // default → center 또는 default → cover 전환 시 history entry 추가
    if (prevMode === 'default' && (mode === 'center' || mode === 'cover')) {
      // 히스토리에 2개의 상태를 push하여 뒤로가기 시 중간 상태로 이동하도록 함
      // URL은 프로젝트 slug를 사용하여 변경
      const projectSlug = selected?.projectSlug || selected?.projectId;
      const newUrl = projectSlug ? `/projects/${projectSlug}` : '/';
      window.history.pushState({ modal: true, step: 1, originalPath: '/' }, '', '/');
      window.history.pushState({ modal: true, step: 2, originalPath: '/' }, '', newUrl);
      historyPushedRef.current = true;
    }

    // cover 모드로 진입할 때 프로젝트 설정
    if (mode === 'cover' && selectedProjectData) {
      setSelectedProject(selectedProjectData);
      setImagesLoaded(false);
    } else if (mode === 'default' && selectedProject) {
      // default 모드로 돌아갈 때 프로젝트 초기화
      setSelectedProject(null);
      setImagesLoaded(false);
      historyPushedRef.current = false;
      // URL을 원래대로 복원
      window.history.replaceState({ zoomed: false }, '', '/');
    }

    // modeRef와 prevModeRef 모두 업데이트
    modeRef.current = mode;
    prevModeRef.current = mode;
  }, [mode, selectedProjectData, selectedProject, selected]);

  // Landing Page 이미지 불러오기
  useEffect(() => {
    const fetchLandingImages = async () => {
      try {
        const { data: configData } = await supabase.from('config').select('content').eq('id', 'landing').single();

        if (configData?.content && typeof configData.content === 'object' && 'images' in configData.content) {
          const images = (configData.content as { images: LandingPageImage[] }).images || [];
          // order 기준으로 정렬
          const sortedImages = [...images].sort((a, b) => (a.order || 0) - (b.order || 0));

          // ProjectImage 형식으로 변환 (orientation 포함)
          const projectImages = sortedImages.map((img) => ({
            projectId: img.projectSlug || img.id,
            projectSlug: img.projectSlug,
            verticalSrc: img.url,
            horizontalSrc: img.url,
            orientation: img.orientation, // orientation 필드 포함
          }));

          setLandingImages(projectImages);
        }
      } catch (error) {
        // 에러 무시
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
      // 애니메이션 중이면 모든 클릭 무시 (중복 클릭 방지)
      if (isAnimating) {
        return;
      }

      // 같은 이미지를 클릭한 경우
      if (selected?.projectId === image.projectId) {
        // center 상태이고 애니메이션이 완료된 경우에만 cover로 전환
        // mode가 'default'에서 'center'로 전환 중일 때는 cover로 전환하지 않음
        if (mode === 'center' && !isAnimating) {
          // 프로젝트가 연결되어 있는 경우에만 cover로 전환
          if (selectedProjectData) {
            setMode('cover');
          } else {
            // 프로젝트가 연결되어 있지 않으면 줌 아웃
            zoomOut();
          }
        }
        // cover 상태면 아무 동작 안함
        return;
      }

      // 다른 이미지를 클릭한 경우: 새로운 이미지 선택하고 center 모드로
      // 단, 현재 mode가 'default'일 때만 허용 (center나 cover에서 다른 이미지 클릭 방지)
      if (mode === 'default') {
        selectImage(image, 'center');
      }
    },
    [selected, mode, selectImage, setMode, isAnimating, selectedProjectData, zoomOut],
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
            selectedUniqueId={selected?.uniqueId ?? null}
            sectionId={id}
            distortionScale={HOME_DISTORT_CONFIG.distortionScale}
            radiusPx={HOME_DISTORT_CONFIG.radiusPx}
            blurStd={HOME_DISTORT_CONFIG.blurStd}
            easingFactor={HOME_DISTORT_CONFIG.easingFactor}
          />
        </div>
      )),
    [renderSections, setTriggerElement, landingImages, handleSelectImage, selected?.projectId, selected?.uniqueId],
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

  // 뒤로가기 버튼 처리 - cover/center 모드에서 줌 아웃 (새로고침 방지)
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      const currentMode = modeRef.current;
      const state = e.state;

      // 모달이 열려있는 상태에서 뒤로가기
      if (currentMode === 'cover' || currentMode === 'center') {
        // 이벤트 전파 완전 중단
        e.preventDefault();
        e.stopImmediatePropagation();

        // step: 1 상태로 돌아왔다면 (첫 번째 뒤로가기)
        if (state?.modal && state?.step === 1) {
          // 다시 앞으로 가서 step: 2 상태 유지하면서 줌아웃
          window.history.forward();

          // 약간의 딜레이 후 줌아웃 실행
          setTimeout(() => {
            zoomOut();
          }, 10);
        } else {
          // 그 외의 경우 (step이 없는 경우 등)
          // 히스토리 복원 후 줌아웃
          window.history.pushState({ modal: false }, '', '/');
          zoomOut();
        }

        return false;
      }
    };

    // capture: true로 가장 먼저 실행
    window.addEventListener('popstate', handlePopState, { capture: true });

    return () => {
      window.removeEventListener('popstate', handlePopState, { capture: true });
    };
  }, [zoomOut]);

  // 리사이즈 처리 - 상세 모달이 나온 상태에서 화면 사이즈 변경 시 해당 페이지로 이동
  // 모바일에서는 리사이즈 이벤트 비활성화
  useEffect(() => {
    // 모바일에서는 리사이즈 이벤트 처리하지 않음
    if (isMobile) return;

    let resizeTimer: NodeJS.Timeout;

    const handleResize = () => {
      // cover 모드이고 선택된 프로젝트가 있을 때만 처리
      if (mode === 'cover' && selectedProject) {
        const currentPath = window.location.pathname;

        // 현재 URL이 프로젝트 상세 페이지인지 확인
        if (currentPath.startsWith('/projects/') && currentPath !== '/projects') {
          // 해당 페이지로 새로고침하여 이동
          window.location.href = currentPath;
        } else if (currentPath === '/') {
          // URL이 아직 변경되지 않았다면 변경 후 이동
          const newUrl = `/projects/${selectedProject.slug}`;
          window.location.href = newUrl;
        }
      } else if (mode !== 'cover' && selected) {
        // cover 모드가 아닐 때 (center 모드 등)는 줌아웃하고 URL 초기화
        // URL을 홈으로 복원 (새로고침 없이)
        window.history.replaceState({ zoomed: false }, '', '/');
        zoomOut();
      }
    };

    // 디바운스를 위한 타이머
    const debouncedResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(handleResize, 150);
    };

    window.addEventListener('resize', debouncedResize, { passive: true });
    return () => {
      window.removeEventListener('resize', debouncedResize);
      clearTimeout(resizeTimer);
    };
  }, [mode, selectedProject, selected, zoomOut, isMobile]);

  // center 모드일 때 외부 영역 클릭/터치로 줌 아웃
  const handleClickOutside = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      // center 모드가 아니거나 애니메이션 중이면 무시
      if (mode !== 'center' || isAnimating || !selected) return;

      const target = e.target as HTMLElement;

      // 클릭된 요소가 선택된 이미지 요소인지 확인
      // uniqueId가 있으면 우선 사용, 없으면 projectId 사용
      const elementId = selected.uniqueId || selected.projectId;
      const selectedImageElement = document.getElementById(`project-${elementId}`);
      if (!selectedImageElement) {
        // 이미지 요소를 찾을 수 없으면 줌 아웃
        zoomOut();
        return;
      }

      // ImageCard에서 stopPropagation을 사용하므로, 이 핸들러가 호출되면 외부 클릭으로 간주
      // 하지만 transform으로 인해 이동한 이미지의 실제 화면상 위치도 확인
      // 타겟이 이미지 요소나 그 자식 요소인지 확인
      if (selectedImageElement.contains(target) || selectedImageElement === target) {
        return; // 선택된 이미지를 클릭한 경우 무시
      }

      // 타겟의 부모 요소들을 확인하여 이미지 요소인지 확인
      let currentElement: HTMLElement | null = target;
      while (currentElement && currentElement !== document.body) {
        if (currentElement === selectedImageElement || currentElement.id === `project-${elementId}`) {
          return; // 이미지 요소 내부를 클릭한 경우 무시
        }
        currentElement = currentElement.parentElement;
      }

      // 클릭 위치가 선택된 이미지의 실제 화면상 위치와 겹치는지 확인
      const rect = selectedImageElement.getBoundingClientRect();
      let clickX = 0;
      let clickY = 0;

      if ('clientX' in e) {
        // 마우스 이벤트
        clickX = e.clientX;
        clickY = e.clientY;
      } else {
        // 터치 이벤트 (onTouchEnd에서는 changedTouches 사용)
        const touch = e.changedTouches?.[0];
        if (touch) {
          clickX = touch.clientX;
          clickY = touch.clientY;
        } else {
          // 터치 정보가 없으면 무시
          return;
        }
      }

      // 클릭 위치가 이미지 영역 내부인지 확인
      if (clickX >= rect.left && clickX <= rect.right && clickY >= rect.top && clickY <= rect.bottom) {
        return; // 이미지 영역 내부를 클릭한 경우 무시
      }

      // 외부 영역을 클릭한 경우 줌 아웃
      zoomOut();
    },
    [mode, isAnimating, selected, zoomOut],
  );

  const handleHeaderAnimationStart = useCallback(() => {
    const trigger = Date.now();
    setHeaderLogoTrigger(trigger);
  }, []);

  // 홈 버튼 클릭 핸들러 - 상세 페이지에서 홈으로 이동 시 새로고침
  const handleHomeClick = useCallback(() => {
    if (mode === 'center' || mode === 'cover') {
      // 상세 모달이 열려있을 때 홈 클릭 시 새로고침하여 홈으로 이동
      window.location.href = '/';
    }
    // default 모드일 때는 기본 Link 동작 (새로고침 없음)
  }, [mode]);

  // 줌 애니메이션 중이거나 center/cover 상태일 때 스크롤 잠금
  const isScrollLocked = mode === 'center' || mode === 'cover' || isAnimating;

  return (
    <>
      <IntroLogo onHeaderAnimationStart={handleHeaderAnimationStart} />
      <Header
        headerLogoTrigger={headerLogoTrigger}
        isFixed={true}
        onHomeClick={mode !== 'default' ? handleHomeClick : undefined}
      />
      <MobileMenu />

      <div
        ref={scrollContainerRef}
        className={cn(
          'h-[100svh] overflow-x-hidden overscroll-none',
          isScrollLocked ? 'overflow-y-hidden' : 'overflow-y-auto',
        )}
        onClick={handleClickOutside}
        onTouchEnd={handleClickOutside}>
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
            pointerEvents: isAnimating ? 'none' : 'auto',
            position: 'relative',
          }}>
          <div
            className={cn(
              isAnimating ? 'pointer-events-none' : 'pointer-events-auto',
              mode === 'cover' ? 'pointer-events-none' : 'pointer-events-auto',
            )}>
            {list}
          </div>
        </motion.main>
      </div>

      {/* 상세 페이지 모달 (cover 모드에서만 표시) */}
      {selectedProject && selectedProject.contents && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: mode === 'cover' && !isAnimating ? 1 : 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className={cn(
            'fixed inset-0 z-[200]',
            mode === 'cover' && !isAnimating ? 'pointer-events-auto' : 'pointer-events-none',
          )}
          style={{
            overscrollBehavior: 'none',
            overscrollBehaviorY: 'none',
          }}>
          {/* 스크롤 컨테이너 */}
          <div
            className="relative h-full w-full overflow-y-auto bg-white"
            style={{
              WebkitOverflowScrolling: 'touch',
              ...(selected?.src && !imagesLoaded
                ? {
                    backgroundImage: `url(${selected.src})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                  }
                : {}),
              transition: 'background-image 0.3s ease-out',
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget && mode === 'cover') {
                zoomOut();
              }
            }}>
            <main className="relative min-h-full w-full">
              <ProjectDetailContent
                key={selected?.projectId || 'default'}
                contents={selectedProject.contents}
                title={selectedProject.title}
                heroImageSrc={selected?.src}
                onHeroImageLoad={() => setImagesLoaded(true)}
              />
            </main>
          </div>
        </motion.div>
      )}
    </>
  );
}
