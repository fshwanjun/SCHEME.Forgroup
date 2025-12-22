'use client';

import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import HomeGallery, { type GallerySelection } from '@/components/HomeGallery';
import { PROJECT_LAYOUT_CONFIG } from '@/config/projectLayout';
import Header from '@/components/Header';
import MobileMenu from '@/components/MobileMenu';
import ProjectDetailContent from '@/components/ProjectDetailContent';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { useZoom } from '@/hooks/useZoom';
import useWindowSize from '@/hooks/useWindowSize';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { PROJECT_DISTORT_CONFIG } from '@/config/distortConfig';

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

export default function ProjectPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [headerLogoTrigger, setHeaderLogoTrigger] = useState<number | undefined>(undefined);
  const modeRef = useRef<string>('default');
  const windowSize = useWindowSize();
  const [mounted, setMounted] = useState(false);
  const [introAnimating, setIntroAnimating] = useState(true); // 인트로 애니메이션 상태

  // 클라이언트 사이드에서만 모바일 여부 업데이트
  useEffect(() => {
    setMounted(true);
  }, []);

  // 인트로 애니메이션 완료 핸들러
  const handleIntroAnimationComplete = useCallback(() => {
    setIntroAnimating(false);
  }, []);

  const isMobile = mounted && windowSize.isSm;

  // useZoom 훅 사용 - 초기 모드는 default
  // cover 모드일 때는 리사이즈 시 페이지 이동을 위해 zoomOutOnResize를 false로 설정
  const { selected, mode, zoomStyle, isAnimating, selectImage, setMode, zoomOut } = useZoom({
    initialMode: 'default',
    centerPadding: 200,
    containerRef,
    animationDuration: 800,
    lockScroll: true,
    zoomOutOnResize: false, // cover 모드일 때는 직접 처리
    debug: false,
  });

  // 무한 스크롤 훅 사용
  const { setTriggerElement, renderSections } = useInfiniteScroll({
    initialSectionIds: [0, 1, 2],
    triggerOffset: isMobile ? 2000 : 1500,
    disabled: mode !== 'default',
    maxSections: 8,
    scrollContainerRef,
  });

  // 선택된 프로젝트 찾기
  const selectedProjectData = useMemo(() => {
    if (!selected) return null;

    // projectSlug가 있으면 우선적으로 사용, 없으면 projectId 사용
    const searchId = selected.projectSlug || selected.projectId;
    const project = projects.find(
      (p) =>
        p.slug === searchId ||
        p.id.toString() === searchId ||
        p.slug === selected.projectId ||
        p.id.toString() === selected.projectId,
    );
    return project || null;
  }, [selected, projects]);

  // 모드 변경 시 history 및 프로젝트 상태 관리
  const prevModeRef = useRef<string>('default');
  const historyPushedRef = useRef<boolean>(false);

  useEffect(() => {
    const prevMode = prevModeRef.current;

    // default → cover 전환 시 history entry 추가
    if (prevMode === 'default' && mode === 'cover') {
      // 히스토리에 2개의 상태를 push하여 뒤로가기 시 중간 상태로 이동하도록 함
      // URL은 프로젝트 slug를 사용하여 변경 (selectedProjectData에서 가져옴)
      const projectSlug = selectedProjectData?.slug || selected?.projectSlug;
      const newUrl = projectSlug ? `/projects/${projectSlug}` : '/projects';
      window.history.pushState({ modal: true, step: 1, originalPath: '/projects' }, '', '/projects');
      window.history.pushState({ modal: true, step: 2, originalPath: '/projects' }, '', newUrl);
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
      window.history.replaceState({ zoomed: false }, '', '/projects');
    }

    // modeRef와 prevModeRef 모두 업데이트
    modeRef.current = mode;
    prevModeRef.current = mode;
  }, [mode, selectedProjectData, selectedProject, selected]);

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

  // 페이지 로드 시 스크롤 최상단 이동 및 복원 방지, 헤더 로고 애니메이션 트리거
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

    setHeaderLogoTrigger(Date.now());

    return () => {
      if ('scrollRestoration' in history) {
        history.scrollRestoration = 'auto';
      }
    };
  }, []);

  // 프로젝트 레이아웃 설정 불러오기
  const [layoutItems, setLayoutItems] = useState<
    Array<{
      frameIndex: number;
      imageUrl: string | null;
      orientation: 'horizontal' | 'vertical' | null;
      projectId: string | null;
      order: number;
    }>
  >([]);

  useEffect(() => {
    const fetchLayout = async () => {
      try {
        const { data: configData } = await supabase.from('config').select('content').eq('id', 'projectLayout').single();

        if (configData?.content && typeof configData.content === 'object' && 'items' in configData.content) {
          const items =
            (
              configData.content as {
                items: Array<{
                  frameIndex: number;
                  imageUrl?: string | null;
                  orientation?: 'horizontal' | 'vertical' | null;
                  projectId: string | null;
                  order: number;
                }>;
              }
            ).items || [];
          const sortedItems = [...items]
            .sort((a, b) => (a.order || 0) - (b.order || 0))
            .map((item) => ({
              ...item,
              imageUrl: item.imageUrl || null,
              orientation: item.orientation || null,
            }));
          setLayoutItems(sortedItems);
        }
      } catch {
        // 에러 무시
      }
    };

    fetchLayout();
  }, []);

  // 프로젝트 이미지 배열 생성
  const projectImages = useMemo(() => {
    if (layoutItems.length === 0) return [];

    return layoutItems
      .map((item) => {
        if (item.imageUrl) {
          const isVertical = item.orientation === 'vertical';
          return {
            projectId: item.projectId || `img-${item.frameIndex}`,
            projectSlug: item.projectId || undefined, // projectId가 slug일 수 있음
            verticalSrc: isVertical ? item.imageUrl : item.imageUrl,
            horizontalSrc: !isVertical ? item.imageUrl : item.imageUrl,
            orientation: item.orientation || undefined, // orientation 속성 추가
            frameIndex: item.frameIndex, // frameIndex 저장
          };
        }
        return null;
      })
      .filter((img): img is NonNullable<typeof img> => img !== null);
  }, [layoutItems]);

  // 이미지 선택 핸들러 - 프로젝트 페이지에서는 바로 cover로 진입
  const handleSelectImage = useCallback(
    (image: GallerySelection) => {
      // 인트로 애니메이션 중이거나 줌 애니메이션 중이면 모든 클릭 무시
      if (introAnimating || isAnimating) {
        return;
      }

      // 같은 이미지를 클릭한 경우
      if (selected?.projectId === image.projectId) {
        // cover 상태면 아무 동작 안함
        return;
      }

      // 다른 이미지를 클릭한 경우
      // 현재 mode가 'default'일 때만 허용
      if (mode === 'default') {
        // 프로젝트 페이지에서는 모바일/데스크톱 모두 바로 cover 모드로 진입
        selectImage(image, 'cover');
      }
    },
    [selected, mode, selectImage, isAnimating, introAnimating],
  );

  // 섹션 리스트 생성
  const list = useMemo(
    () =>
      renderSections((id, index, isTrigger) => (
        <div key={id} ref={isTrigger ? setTriggerElement : null} data-section-id={id} data-is-trigger={isTrigger}>
          <HomeGallery
            images={projectImages}
            onSelectImage={handleSelectImage}
            selectedProjectId={selected?.projectId ?? null}
            selectedUniqueId={selected?.uniqueId ?? null}
            layoutConfig={PROJECT_LAYOUT_CONFIG}
            sectionId={id}
            onIntroAnimationComplete={id === 0 ? handleIntroAnimationComplete : undefined}
            distortionScale={PROJECT_DISTORT_CONFIG.distortionScale}
            radiusPx={PROJECT_DISTORT_CONFIG.radiusPx}
            blurStd={PROJECT_DISTORT_CONFIG.blurStd}
            easingFactor={PROJECT_DISTORT_CONFIG.easingFactor}
          />
        </div>
      )),
    [
      renderSections,
      setTriggerElement,
      handleSelectImage,
      selected?.projectId,
      selected?.uniqueId,
      projectImages,
      handleIntroAnimationComplete,
    ],
  );

  // ESC 키로 줌 아웃
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mode === 'cover') {
        zoomOut();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [mode, zoomOut]);

  // 뒤로가기 버튼 처리 - cover 모드에서 줌 아웃 (새로고침 방지)
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      const currentMode = modeRef.current;
      const state = e.state;

      // 모달이 열려있는 상태에서 뒤로가기
      if (currentMode === 'cover') {
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
          window.history.pushState({ modal: false }, '', '/projects');
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
        } else if (currentPath === '/projects') {
          // URL이 아직 변경되지 않았다면 변경 후 이동
          const newUrl = `/projects/${selectedProject.slug}`;
          window.location.href = newUrl;
        }
      } else if (mode !== 'cover' && selected) {
        // cover 모드가 아닐 때는 줌아웃 (기본 동작)
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

  // 줌 모드일 때 body 스크롤 잠금
  // 인트로 애니메이션 중이거나 줌 애니메이션 중이거나 cover 상태일 때 스크롤 잠금
  const isScrollLocked = introAnimating || mode === 'cover' || isAnimating;

  // 프로젝트 링크 클릭 핸들러 - cover 상태에서 default로 돌아가기
  const handleProjectClick = useCallback(() => {
    if (mode === 'cover') {
      zoomOut();
    }
  }, [mode, zoomOut]);

  return (
    <>
      <Header isFixed={true} headerLogoTrigger={headerLogoTrigger} onProjectClick={handleProjectClick} />
      <MobileMenu headerLogoTrigger={headerLogoTrigger} onProjectClick={handleProjectClick} />

      {/* 인트로 애니메이션 중 모든 인터랙션 차단용 오버레이 */}
      {introAnimating && <div className="fixed inset-0 z-[100]" />}

      <div
        ref={scrollContainerRef}
        className={cn(
          'h-[100svh] overflow-x-hidden overscroll-none',
          isScrollLocked ? 'overflow-y-hidden' : 'overflow-y-auto',
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
            className="h-full w-full overflow-y-auto"
            style={{
              backgroundColor: 'white',
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
