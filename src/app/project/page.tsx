'use client';

import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import HomeContainer from '@/components/HomeContainer';
import HomeGallery, { type GallerySelection } from '@/components/HomeGallery';
import { PROJECT_LAYOUT_CONFIG } from '@/config/projectLayout';
import Header from '@/components/Header';
import MobileMenu from '@/components/MobileMenu';
import ProjectDetailContent from '@/components/ProjectDetailContent';
import { useIntersection } from '@/hooks/useIntersectionObserver';
import { supabase } from '@/lib/supabase';

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
  const pathname = usePathname();
  // section ID 배열: 초기값 [0, 1, 2] (3개 section) - 홈 페이지와 동일한 방식
  const [sectionIds, setSectionIds] = useState<number[]>([0, 1, 2]);
  const [triggerElement, setTriggerElement] = useState<HTMLElement | null>(null);
  const triggeredRef = useRef(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selected, setSelected] = useState<GallerySelection | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [zoomStyle, setZoomStyle] = useState({ x: 0, y: 0, scale: 1, originX: 0, originY: 0 });
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const isInitialZoomRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollPositionRef = useRef<number>(0);
  const [headerLogoTrigger, setHeaderLogoTrigger] = useState<number | undefined>(undefined);

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
      } catch (error) {
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
    window.scrollTo(0, 0);

    // 헤더 로고 애니메이션 트리거
    setHeaderLogoTrigger(Date.now());

    return () => {
      if ('scrollRestoration' in history) {
        history.scrollRestoration = 'auto';
      }
    };
  }, []);

  // 선택된 이미지에 해당하는 프로젝트 상세 정보 가져오기
  useEffect(() => {
    if (!selected) {
      setSelectedProject(null);
      return;
    }

    // projectId를 사용해서 정확한 프로젝트 찾기
    const fetchProjectDetail = async () => {
      try {
        const { data, error } = await supabase
          .from('project')
          .select('id, slug, title, description, contents')
          .eq('id', parseInt(selected.projectId))
          .single();

        if (!error && data) {
          setSelectedProject(data as Project);
        } else {
          // projectId로 찾지 못하면 slug로 시도
          const project = projects.find((p) => p.id.toString() === selected.projectId);
          if (project) {
            setSelectedProject(project);
          }
        }
      } catch {
        // Error handling
      }
    };

    fetchProjectDetail();
  }, [selected, projects]);

  // sectionIds가 변경되면 트리거 리셋 (홈 페이지와 동일)
  useEffect(() => {
    triggeredRef.current = false;
  }, [sectionIds]);

  // 트리거 지점에 도달했는지 감지 (IntersectionObserver) - 두 번째 섹션을 감시
  useIntersection(
    triggerElement,
    (entry: IntersectionObserverEntry) => {
      if (selected) return;

      // 두 번째 섹션의 바닥이 화면 중간쯤 왔을 때 미리 로딩
      if (entry.isIntersecting) {
        const rect = entry.boundingClientRect;
        // 두 번째 섹션의 바닥이 뷰포트 높이 + 1000px (여유분) 보다 위에 있을 때
        const isTriggerPoint = rect.bottom <= window.innerHeight + 1000;

        if (isTriggerPoint && !triggeredRef.current) {
          triggeredRef.current = true;

          setSectionIds((prev) => {
            const lastId = prev[prev.length - 1];
            const newId = lastId + 1;
            const newIds = [...prev.slice(1), newId];
            return newIds;
          });
        }
      }
    },
    { rootMargin: '0px 0px 500px 0px', threshold: [0, 0.1, 0.5, 1] },
  );

  // 스크롤 이벤트로도 감지 (백업) - 두 번째 섹션 기준
  useEffect(() => {
    if (selected) return;

    const handleScroll = () => {
      if (!triggerElement || triggeredRef.current) return;

      const rect = triggerElement.getBoundingClientRect();
      const windowHeight = window.innerHeight;

      // 두 번째 섹션의 바닥이 화면 하단 근처에 도달했는지 확인
      const isTriggerPoint = rect.bottom <= windowHeight + 1000;

      if (isTriggerPoint) {
        triggeredRef.current = true;

        setSectionIds((prev) => {
          const lastId = prev[prev.length - 1];
          const newId = lastId + 1;
          const newIds = [...prev.slice(1), newId];
          return newIds;
        });
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [selected, sectionIds, triggerElement]);

  // 프로젝트 레이아웃 설정 불러오기
  const [layoutItems, setLayoutItems] = useState<
    Array<{
      frameIndex: number;
      imageUrl: string | null;
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
                items: Array<{ frameIndex: number; imageUrl?: string | null; projectId: string | null; order: number }>;
              }
            ).items || [];
          // order 기준으로 정렬
          const sortedItems = [...items]
            .sort((a, b) => (a.order || 0) - (b.order || 0))
            .map((item) => ({
              ...item,
              imageUrl: item.imageUrl || null,
            }));
          setLayoutItems(sortedItems);
        }
      } catch (error) {
        // 에러 무시
      }
    };

    fetchLayout();
  }, []);

  // 프로젝트 이미지 배열 생성 (레이아웃 설정 기반)
  const projectImages = useMemo(() => {
    if (layoutItems.length === 0) return [];

    // 레이아웃 아이템을 순서대로 처리하여 프로젝트 이미지 생성
    return layoutItems
      .map((item) => {
        // 이미지 URL이 있으면 그것을 사용
        if (item.imageUrl) {
          return {
            projectId: item.projectId || `img-${item.frameIndex}`,
            verticalSrc: item.imageUrl,
            horizontalSrc: item.imageUrl,
          };
        }

        // 프로젝트 ID가 있으면 프로젝트 썸네일 사용
        if (item.projectId) {
          const project = projects.find((p) => p.id.toString() === item.projectId);
          if (project && (project.contents?.thumbnail43 || project.contents?.thumbnail34)) {
            return {
              projectId: project.id.toString(),
              verticalSrc: project.contents?.thumbnail34 || project.contents?.thumbnail43 || '',
              horizontalSrc: project.contents?.thumbnail43 || project.contents?.thumbnail34 || '',
            };
          }
        }

        return null;
      })
      .filter((img): img is { projectId: string; verticalSrc: string; horizontalSrc: string } => img !== null);
  }, [projects, layoutItems]);

  // 이미지 선택 핸들러
  const handleSelectImage = useCallback((image: GallerySelection) => {
    isInitialZoomRef.current = true;

    // 이미 선택된 이미지를 다시 클릭하면 줌 아웃
    setSelected((current) => {
      if (current?.projectId === image.projectId) {
        isInitialZoomRef.current = false;
        return null;
      }
      return image;
    });
  }, []);

  // 섹션 리스트 생성
  const list = useMemo(
    () =>
      sectionIds.map((id, index) => {
        // 3개 중 2번째 요소(index 1)를 트리거로 사용 (미리 로딩)
        const isTrigger = index === 1;

        return (
          <div key={id} ref={isTrigger ? setTriggerElement : null} data-section-id={id} data-is-trigger={isTrigger}>
            <HomeGallery
              images={projectImages}
              onSelectImage={handleSelectImage}
              selectedProjectId={selected?.projectId ?? null}
              layoutConfig={PROJECT_LAYOUT_CONFIG}
            />
          </div>
        );
      }),
    [sectionIds, handleSelectImage, selected?.projectId, projectImages],
  );

  // 확대 계산 (홈 페이지와 동일한 로직)
  useEffect(() => {
    const calculateZoom = () => {
      if (!selected) {
        setZoomStyle((prev) => ({ ...prev, x: 0, y: 0, scale: 1 }));
        setShowDetailModal(false);
        setIsAnimating(false);
        // URL만 복원 (페이지 이동 없음)
        if (pathname.startsWith('/project/') && pathname !== '/project') {
          window.history.pushState({}, '', '/project');
        }
        // 스크롤 및 상호작용 복원
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.pointerEvents = '';
        document.body.style.userSelect = '';
        if (scrollPositionRef.current !== undefined) {
          window.scrollTo(0, scrollPositionRef.current);
        }
        document.documentElement.style.setProperty('--gallery-gap', '20px');
        return;
      }

      let rect = selected.rect;

      // 최초 줌(클릭 직후)이 아니고, 리사이즈 등으로 인해 다시 계산해야 할 때만 역산 로직 수행
      if (!isInitialZoomRef.current) {
        const element = document.getElementById(`project-${selected.projectId}`);
        if (element) {
          // 현재(변환된) rect 가져오기
          const currentRect = element.getBoundingClientRect();
          const currentScale = zoomStyle.scale;
          const currentX = zoomStyle.x;
          const currentY = zoomStyle.y;
          const currentOriginX = zoomStyle.originX;
          const currentOriginY = zoomStyle.originY;
          const currentScrollX = window.scrollX;
          const currentScrollY = window.scrollY;

          // 역산 로직: 변환된 좌표에서 원본 페이지 좌표 유추
          if (currentScale > 1.01) {
            const cxView = currentRect.left + currentRect.width / 2;
            const cyView = currentRect.top + currentRect.height / 2;

            const cxPage = currentOriginX + (cxView - currentX + currentScrollX - currentOriginX) / currentScale;
            const cyPage = currentOriginY + (cyView - currentY + currentScrollY - currentOriginY) / currentScale;

            const wPage = currentRect.width / currentScale;
            const hPage = currentRect.height / currentScale;

            rect = {
              left: cxPage - wPage / 2 - currentScrollX,
              top: cyPage - hPage / 2 - currentScrollY,
              width: wPage,
              height: hPage,
              bottom: cyPage + hPage / 2 - currentScrollY,
              right: cxPage + wPage / 2 - currentScrollX,
            } as DOMRect;
          }
        }
      }

      // 계산 후 초기 플래그 해제
      isInitialZoomRef.current = false;

      if (!rect) return;

      // window를 cover로 꽉 채우도록 스케일 계산
      // width와 height 중 더 큰 scale을 사용하여 화면을 완전히 덮도록 함
      const scaleX = window.innerWidth / rect.width;
      const scaleY = window.innerHeight / rect.height;
      const scale = Math.max(scaleX, scaleY);

      // Transform Origin 설정
      let originX = 0;
      let originY = 0;

      if (containerRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        // 뷰포트 좌상단(0,0)은 motion.div의 좌상단으로부터 (-left, -top) 만큼 떨어져 있음
        originX = -containerRect.left;
        originY = -containerRect.top;
      } else {
        // fallback (초기 로드 등)
        originX = window.scrollX;
        originY = window.scrollY;
      }

      // 이미지의 중심 좌표 (뷰포트 기준)
      const imageCenterX = rect.left + rect.width / 2;
      const imageCenterY = rect.top + rect.height / 2;

      // 화면의 중심 좌표 (뷰포트 기준)
      const screenCenterX = window.innerWidth / 2;
      const screenCenterY = window.innerHeight / 2;

      // 목표: 이미지의 중심을 화면의 중심으로 이동
      // Translate = ScreenCenter - ImageCenter * Scale
      const tx = screenCenterX - imageCenterX * scale;
      const ty = screenCenterY - imageCenterY * scale;

      setZoomStyle({ x: tx, y: ty, scale, originX, originY });

      // 확대 애니메이션 시작 - 모든 상호작용 차단
      setIsAnimating(true);
      scrollPositionRef.current = window.scrollY;
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollPositionRef.current}px`;
      document.body.style.width = '100%';
      document.body.style.pointerEvents = 'none';
      document.body.style.userSelect = 'none';

      // 확대 애니메이션 완료 후 모달 표시 및 스크롤 허용
      setTimeout(() => {
        setShowDetailModal(true);
        setIsAnimating(false);
        // URL만 업데이트 (페이지 이동 없음)
        const project = projects.find((p) => p.id.toString() === selected.projectId);
        if (project?.slug) {
          window.history.pushState({}, '', `/project/${project.slug}`);
        }
        // 애니메이션 완료 후 스크롤 허용
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.pointerEvents = '';
        document.body.style.userSelect = '';
        if (scrollPositionRef.current !== undefined) {
          window.scrollTo(0, scrollPositionRef.current);
        }
      }, 800); // 확대 애니메이션 duration과 동일
    };

    calculateZoom();

    // 윈도우 리사이즈 시 줌 아웃
    const handleResize = () => {
      setSelected(null);
      isInitialZoomRef.current = false;
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  // ESC 키로 모달 닫기
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showDetailModal) {
        setSelected(null);
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [showDetailModal]);

  const handleProjectHeaderClick = () => {
    if (showDetailModal || selected) {
      // 모달이 열려있으면 새로고침
      window.location.href = '/project';
    }
  };

  return (
    <>
      <Header isFixed={true} onProjectClick={handleProjectHeaderClick} headerLogoTrigger={headerLogoTrigger} />
      <MobileMenu onProjectClick={handleProjectHeaderClick} headerLogoTrigger={headerLogoTrigger} />
      <motion.div
        ref={containerRef}
        animate={{
          x: zoomStyle.x,
          y: zoomStyle.y,
          scale: zoomStyle.scale,
        }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        style={{
          transformOrigin: `${zoomStyle.originX}px ${zoomStyle.originY}px`,
          width: '100%',
          pointerEvents: isAnimating ? 'none' : 'auto',
        }}>
        <HomeContainer isFixed={false}>
          <div className="relative flex w-full flex-col">{list}</div>
        </HomeContainer>
      </motion.div>

      {/* 확대 애니메이션 중 오버레이 (모든 상호작용 차단) */}
      {isAnimating && (
        <div
          className="fixed inset-0 z-[300] bg-transparent"
          style={{
            pointerEvents: 'all',
            userSelect: 'none',
            touchAction: 'none',
          }}
          onMouseDown={(e) => e.preventDefault()}
          onMouseMove={(e) => e.preventDefault()}
          onClick={(e) => e.preventDefault()}
        />
      )}

      {/* 상세 페이지 모달 (확대 애니메이션 완료 후 표시) */}
      {selectedProject && selectedProject.contents && (
        <div
          className={`fixed inset-0 z-[200] overflow-y-auto bg-white ${
            showDetailModal ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
          onClick={(e) => {
            if (e.target === e.currentTarget && showDetailModal) {
              setSelected(null);
            }
          }}>
          <main className="w-ful relative h-full">
            <ProjectDetailContent
              contents={selectedProject.contents}
              title={selectedProject.title}
              heroImageSrc={selected?.src}
            />
          </main>
        </div>
      )}
    </>
  );
}
