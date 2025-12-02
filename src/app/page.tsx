'use client';

import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import HomeGallery, { type GallerySelection } from '@/components/HomeGallery';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { useZoom } from '@/hooks/useZoom';
import useWindowSize from '@/hooks/useWindowSize';
import Header from '@/components/Header';
import MobileMenu from '@/components/MobileMenu';
import IntroLogo from '@/components/IntroLogo';
import ProjectDetailContent from '@/components/ProjectDetailContent';
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
    Array<{ projectId: string; projectSlug?: string; verticalSrc: string; horizontalSrc: string }>
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

  // cover 모드로 진입할 때 프로젝트 설정 및 URL 변경
  useEffect(() => {
    if (mode === 'cover' && selectedProjectData) {
      setSelectedProject(selectedProjectData);
      setImagesLoaded(false);

      // URL을 프로젝트 상세 페이지로 변경
      const newUrl = `/project/${selectedProjectData.slug}`;
      if (window.location.pathname !== newUrl) {
        window.history.pushState({ modal: true, returnUrl: '/' }, '', newUrl);
      }
    } else if (mode === 'default' && selectedProject) {
      // default 모드로 돌아갈 때 프로젝트 초기화
      setSelectedProject(null);
      setImagesLoaded(false);
    }
  }, [mode, selectedProjectData, selectedProject]);

  // mode가 변경될 때 ref 업데이트
  useEffect(() => {
    modeRef.current = mode;
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
          setMode('cover');
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
    [selected, mode, selectImage, setMode, isAnimating],
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
      
      // 모달이 열려있는 상태에서 뒤로가기
      if (currentMode === 'cover' || currentMode === 'center') {
        // 🔑 핵심: Next.js가 URL 변경을 감지하기 전에 즉시 URL 복원
        // 이렇게 하면 Next.js 라우터가 페이지 전환을 시도하지 않음
        window.history.replaceState({ modal: false }, '', '/');
        
        // 줌 아웃 실행
        zoomOut();
      }
    };

    // capture phase에서 먼저 처리하여 Next.js보다 우선 실행
    window.addEventListener('popstate', handlePopState, { capture: true });
    return () => window.removeEventListener('popstate', handlePopState, { capture: true });
  }, [zoomOut]);

  // 리사이즈 처리 - 상세 모달이 나온 상태에서 화면 사이즈 변경 시 해당 페이지로 이동
  useEffect(() => {
    let resizeTimer: NodeJS.Timeout;

    const handleResize = () => {
      // cover 모드이고 선택된 프로젝트가 있을 때만 처리
      if (mode === 'cover' && selectedProject) {
        const currentPath = window.location.pathname;

        // 현재 URL이 프로젝트 상세 페이지인지 확인
        if (currentPath.startsWith('/project/') && currentPath !== '/project') {
          // 해당 페이지로 새로고침하여 이동
          window.location.href = currentPath;
        } else if (currentPath === '/') {
          // URL이 아직 변경되지 않았다면 변경 후 이동
          const newUrl = `/project/${selectedProject.slug}`;
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
  }, [mode, selectedProject, selected, zoomOut]);

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

  // 줌 모드일 때 body 스크롤 잠금
  useEffect(() => {
    if (mode === 'center' || mode === 'cover' || isAnimating) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mode, isAnimating]);

  return (
    <>
      <IntroLogo onHeaderAnimationStart={handleHeaderAnimationStart} />
      <Header headerLogoTrigger={headerLogoTrigger} isFixed={true} />
      <MobileMenu headerLogoTrigger={headerLogoTrigger} />

      <div
        className="h-[100svh] overflow-y-auto overflow-x-hidden overscroll-none"
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
            'fixed inset-0 z-[200] overflow-y-auto',
            mode === 'cover' && !isAnimating ? 'pointer-events-auto' : 'pointer-events-none',
          )}
          style={{
            backgroundColor: 'white',
            overscrollBehavior: 'none',
            overscrollBehaviorY: 'none',
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
          <main className="relative h-full w-full">
            <ProjectDetailContent
              key={selected?.projectId || 'default'}
              contents={selectedProject.contents}
              title={selectedProject.title}
              heroImageSrc={selected?.src}
              onHeroImageLoad={() => setImagesLoaded(true)}
            />
          </main>
        </motion.div>
      )}
    </>
  );
}
