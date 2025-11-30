'use client';

import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import HomeContainer from '@/components/HomeContainer';
import HomeGallery, { type GallerySelection } from '@/components/HomeGallery';
import { PROJECT_LAYOUT_CONFIG } from '@/config/projectLayout';
import Header from '@/components/Header';
import MobileMenu from '@/components/MobileMenu';
import ProjectDetailContent from '@/components/ProjectDetailContent';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { useZoom } from '@/hooks/useZoom';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

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
  // const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  // const [showDetailModal, setShowDetailModal] = useState(false);
  // const [imagesLoaded, setImagesLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [headerLogoTrigger, setHeaderLogoTrigger] = useState<number | undefined>(undefined);
  const modeRef = useRef<string>('default');

  // useZoom 훅 사용 - 초기 모드는 default
  const { selected, mode, zoomStyle, isAnimating, selectImage, zoomOut } = useZoom({
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

    // cover 모드로 진입할 때 히스토리에 상태 추가
    if (mode === 'cover') {
      window.history.pushState({ zoomed: true }, '');
    }
  }, [mode]);

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
            verticalSrc: isVertical ? item.imageUrl : item.imageUrl,
            horizontalSrc: !isVertical ? item.imageUrl : item.imageUrl,
          };
        }
        return null;
      })
      .filter((img): img is { projectId: string; verticalSrc: string; horizontalSrc: string } => img !== null);
  }, [layoutItems]);

  // 이미지 선택 핸들러 - center를 건너뛰고 바로 cover로
  const handleSelectImage = useCallback(
    (image: GallerySelection) => {
      console.log('[ProjectPage] handleSelectImage called', {
        imageProjectId: image.projectId,
        selectedProjectId: selected?.projectId,
        currentMode: mode,
      });

      // 같은 이미지를 클릭한 경우: 이미 cover 상태이므로 아무 동작 안함
      if (selected?.projectId === image.projectId) {
        return;
      }

      // 다른 이미지를 클릭한 경우: 새로운 이미지 선택하고 바로 cover 모드로
      console.log('[ProjectPage] 새로운 이미지 선택, 바로 cover 모드로');
      selectImage(image, 'cover');
    },
    [selected, mode, selectImage],
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
            layoutConfig={PROJECT_LAYOUT_CONFIG}
          />
        </div>
      )),
    [renderSections, setTriggerElement, handleSelectImage, selected?.projectId, projectImages],
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

  // 뒤로가기 버튼 처리 - cover 모드에서 줌 아웃
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      console.log('[ProjectPage] popstate 감지', {
        state: e.state,
        modeRef: modeRef.current,
      });

      if (modeRef.current === 'cover') {
        console.log('[ProjectPage] 뒤로가기로 줌 아웃 실행');
        zoomOut();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [zoomOut]);

  return (
    <>
      <Header isFixed={true} headerLogoTrigger={headerLogoTrigger} />
      <MobileMenu headerLogoTrigger={headerLogoTrigger} />

      <div
        className={cn(
          'h-screen overflow-y-scroll',
          mode === 'cover' || isAnimating ? 'pointer-events-none overflow-hidden' : 'pointer-events-auto',
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
              'overflow-y-scroll',
              isAnimating ? 'pointer-events-none overflow-hidden' : 'pointer-events-auto',
              mode === 'cover' ? 'pointer-events-none' : 'pointer-events-auto',
            )}>
            {list}
          </div>
        </motion.main>
      </div>

      {/* 상세 페이지 모달 (cover 모드에서만 표시) - 임시 주석처리 */}
      {/* {selectedProject && selectedProject.contents && (
        <div
          className={`fixed inset-0 z-[200] overflow-y-auto transition-opacity duration-300 ${
            showDetailModal && mode === 'cover' ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
          style={{
            backgroundColor: 'white',
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
            if (e.target === e.currentTarget && showDetailModal) {
              zoomOut();
            }
          }}>
          <main className="w-ful relative h-full">
            <ProjectDetailContent
              key={selected?.projectId || 'default'}
              contents={selectedProject.contents}
              title={selectedProject.title}
              heroImageSrc={selected?.src}
              onHeroImageLoad={() => setImagesLoaded(true)}
            />
          </main>
        </div>
      )} */}
    </>
  );
}
