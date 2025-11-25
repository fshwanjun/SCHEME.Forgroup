'use client';

import { useEffect, useMemo, useState, useRef, type CSSProperties } from 'react';
import { motion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import HoverDistortImage from '@/components/HoverDistortImage';
import HomeContainer from '@/components/HomeContainer';
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

const COVER_FRAMES: Array<{
  marginTop: string;
  marginLeft?: string;
  marginRight?: string;
  width: string;
  orientation: 'vertical' | 'horizontal';
  zIndex?: number;
}> = [
  // Row 1: Top
  { marginTop: '0vh', marginLeft: '2%', width: '35vw', orientation: 'vertical', zIndex: 1 },
  { marginTop: '0vh', marginLeft: '55%', width: '40vw', orientation: 'horizontal', zIndex: 2 },

  // Row 2: Upper Middle (이전 행의 이미지 높이 + 여유 공간 고려)
  { marginTop: '50vh', marginLeft: '5%', width: '32vw', orientation: 'vertical', zIndex: 3 },
  { marginTop: '50vh', marginLeft: '52%', width: '38vw', orientation: 'horizontal', zIndex: 2 },

  // Row 3: Middle
  { marginTop: '100vh', marginLeft: '3%', width: '34vw', orientation: 'vertical', zIndex: 3 },
  { marginTop: '100vh', marginLeft: '50%', width: '42vw', orientation: 'horizontal', zIndex: 2 },

  // Row 4: Lower Middle
  { marginTop: '150vh', marginLeft: '6%', width: '30vw', orientation: 'vertical', zIndex: 3 },
  { marginTop: '150vh', marginLeft: '52%', width: '38vw', orientation: 'horizontal', zIndex: 2 },

  // Row 5: Bottom
  { marginTop: '200vh', marginLeft: '4%', width: '32vw', orientation: 'vertical', zIndex: 3 },
  { marginTop: '200vh', marginLeft: '50%', width: '40vw', orientation: 'horizontal', zIndex: 2 },

  // Row 6: Bottom
  { marginTop: '250vh', marginLeft: '8%', width: '35vw', orientation: 'horizontal', zIndex: 2 },
  { marginTop: '250vh', marginLeft: '52%', width: '38vw', orientation: 'horizontal', zIndex: 2 },
];

interface SelectedImage {
  projectId: string;
  slug: string;
  rect: DOMRect;
  imageSrc: string;
}

export default function ProjectPage() {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  // section ID 배열: 초기값 [0, 1, 2] (3개 section) - 홈 페이지와 동일한 방식
  const [sectionIds, setSectionIds] = useState<number[]>([0, 1, 2]);
  const [triggerElement, setTriggerElement] = useState<HTMLElement | null>(null);
  const triggeredRef = useRef(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<SelectedImage | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [zoomStyle, setZoomStyle] = useState({ x: 0, y: 0, scale: 1, originX: 0, originY: 0 });
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const isInitialZoomRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollPositionRef = useRef<number>(0);

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
          console.error('Error fetching projects:', error);
        } else {
          setProjects(data || []);
        }
      } catch (error) {
        console.error('Error fetching projects:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  // 윈도우 크기 추적
  useEffect(() => {
    const updateWindowSize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };

    updateWindowSize();
    window.addEventListener('resize', updateWindowSize);
    return () => window.removeEventListener('resize', updateWindowSize);
  }, []);

  // 이미지 로드 완료 후 애니메이션 시작
  useEffect(() => {
    if (!loading && projects.length > 0 && windowSize.width > 0 && windowSize.height > 0) {
      // 이미지들이 먼저 초기 상태(중앙)로 렌더링되도록 약간의 지연 후 확장
      const t = setTimeout(() => {
        setExpanded(true);
      }, 100);
      return () => clearTimeout(t);
    }
  }, [loading, projects.length, windowSize.width, windowSize.height]);

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
          const { data: slugData, error: slugError } = await supabase
            .from('project')
            .select('id, slug, title, description, contents')
            .eq('slug', selected.slug)
            .single();

          if (!slugError && slugData) {
            setSelectedProject(slugData as Project);
          }
        }
      } catch {
        // Error handling
      }
    };

    fetchProjectDetail();
  }, [selected]);

  // sectionIds가 변경되면 트리거 리셋 (홈 페이지와 동일)
  useEffect(() => {
    triggeredRef.current = false;
  }, [sectionIds]);

  // 트리거 지점에 도달했는지 감지 (IntersectionObserver) - 두 번째 섹션을 감시 (홈 페이지와 동일)
  useIntersection(
    triggerElement,
    (entry: IntersectionObserverEntry) => {
      if (selected) return;

      // 두 번째 섹션의 바닥이 화면 중간쯤 왔을 때 미리 로딩
      if (entry.isIntersecting) {
        const rect = entry.boundingClientRect;
        // 두 번째 섹션의 바닥이 뷰포트 높이 + 2500px (충분한 여유분) 보다 위에 있을 때
        // 더 일찍 트리거하여 스크롤이 끊기지 않도록 함
        const isTriggerPoint = rect.bottom <= window.innerHeight + 2500;

        if (isTriggerPoint && !triggeredRef.current) {
          triggeredRef.current = true;

          setSectionIds((prev) => {
            const lastId = prev[prev.length - 1];
            const newId = lastId + 1;
            const newIds = [...prev.slice(1), newId]; // 첫 번째 제거, 마지막에 새 섹션 추가
            return newIds;
          });
        }
      }
    },
    { rootMargin: '0px 0px 2000px 0px', threshold: [0, 0.1, 0.5, 1] },
  );

  // 스크롤 이벤트로도 감지 (백업) - 두 번째 섹션 기준 (홈 페이지와 동일)
  useEffect(() => {
    if (selected) return;

    const handleScroll = () => {
      if (!triggerElement || triggeredRef.current) return;

      const rect = triggerElement.getBoundingClientRect();
      const windowHeight = window.innerHeight;

      // 두 번째 섹션의 바닥이 화면 하단 근처에 도달했는지 확인
      // 더 일찍 트리거하여 스크롤이 끊기지 않도록 함
      const isTriggerPoint = rect.bottom <= windowHeight + 2500;

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
  }, [selected, triggerElement]);

  // 프로젝트 이미지 배열 생성
  const projectImages = useMemo(() => {
    if (projects.length === 0) return [];
    return projects
      .filter((p) => p.contents?.thumbnail43 || p.contents?.thumbnail34)
      .map((project) => ({
        projectId: project.id.toString(),
        slug: project.slug,
        verticalSrc: project.contents?.thumbnail34 || project.contents?.thumbnail43 || '',
        horizontalSrc: project.contents?.thumbnail43 || project.contents?.thumbnail34 || '',
      }));
  }, [projects]);

  // 각 섹션의 카드들을 생성 (홈 페이지와 동일한 방식)
  const sections = useMemo(() => {
    if (projectImages.length === 0 || loading) return [];

    return sectionIds.map((sectionId, sectionIndex) => {
      // 3개 중 2번째 요소(index 1)를 트리거로 사용 (미리 로딩)
      const isTrigger = sectionIndex === 1;

      const cards = COVER_FRAMES.map((frame, index) => {
        // sectionId를 사용하여 각 섹션이 다른 이미지를 표시하도록 함
        const globalIndex = sectionId * COVER_FRAMES.length + index;
        const image = projectImages[globalIndex % projectImages.length];

        if (!image || (!image.verticalSrc && !image.horizontalSrc)) {
          return null;
        }

        // 목표 위치 계산 (픽셀 단위)
        const parseVh = (vh: string) => {
          const value = parseFloat(vh.replace('vh', ''));
          return (value / 100) * windowSize.height;
        };

        const parseVw = (vw: string) => {
          const value = parseFloat(vw.replace('vw', ''));
          return (value / 100) * windowSize.width;
        };

        const parsePercent = (percent: string) => {
          const value = parseFloat(percent.replace('%', ''));
          return (value / 100) * windowSize.width;
        };

        // 목표 위치 계산
        const imageWidth = parseVw(frame.width);
        const aspectRatio = frame.orientation === 'vertical' ? 3 / 4 : 4 / 3;
        const imageHeight = imageWidth / aspectRatio;
        const imageHeightVh = (imageHeight / windowSize.height) * 100;

        // 기본 marginTop + 이전 이미지들의 높이를 고려한 추가 간격
        const baseMarginTop = parseVh(frame.marginTop);
        // 각 이미지의 높이 + 여유 공간(이미지 높이의 50%)을 추가
        const spacingOffset = imageHeightVh * 0.5;
        const targetMarginTop = baseMarginTop + spacingOffset;

        const targetMarginLeft = frame.marginLeft
          ? parsePercent(frame.marginLeft)
          : frame.marginRight
            ? windowSize.width - parsePercent(frame.marginRight) - imageWidth
            : (windowSize.width - imageWidth) / 2;

        // 뷰포트 중앙 위치 (모든 이미지가 동일한 중앙에서 시작)
        const centerX = windowSize.width / 2;
        const centerY = windowSize.height / 2;
        // 이미지의 중심이 뷰포트 중앙에 오도록 계산
        const initialMarginLeft = centerX - imageWidth / 2;
        const initialMarginTop = centerY - imageHeight / 2;

        const baseStyle: CSSProperties = {
          width: frame.width,
          zIndex: frame.zIndex,
          position: 'absolute',
          transition:
            'top 900ms cubic-bezier(0.19, 1, 0.22, 1), left 900ms cubic-bezier(0.19, 1, 0.22, 1), transform 950ms cubic-bezier(0.19,1,0.22,1), opacity 700ms ease',
          transitionDelay: `${index * 10}ms`,
        };

        if (expanded) {
          // 확장된 상태: 각 이미지의 목표 위치
          baseStyle.top = `${targetMarginTop}px`;
          baseStyle.left = `${targetMarginLeft}px`;
          baseStyle.transform = 'translate(0, 0) scale(1)';
          baseStyle.opacity = 1;
        } else {
          // 초기 상태: 모든 이미지가 뷰포트 중앙에 모여 있음
          // 각 이미지의 중심이 뷰포트 중앙(50vw, 50vh)에 오도록 설정
          baseStyle.top = `${initialMarginTop}px`;
          baseStyle.left = `${initialMarginLeft}px`;
          baseStyle.transform = 'translate(0, 0) scale(0.9)';
          baseStyle.opacity = 1;
        }

        const src = frame.orientation === 'vertical' ? image.verticalSrc : image.horizontalSrc;

        const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
          e.preventDefault();
          e.stopPropagation();

          const rect = e.currentTarget.getBoundingClientRect();
          const rectData: DOMRect = {
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            bottom: rect.bottom,
            right: rect.right,
            x: rect.x,
            y: rect.y,
            toJSON: rect.toJSON,
          } as DOMRect;

          // 이미지 선택 (클릭한 이미지의 src 저장)
          isInitialZoomRef.current = true;
          setSelected({
            projectId: image.projectId,
            slug: image.slug,
            rect: rectData,
            imageSrc: src,
          });
        };

        const isSelected = selected?.projectId === image.projectId;
        const isOtherSelected = selected != null && !isSelected;

        return (
          <div
            id={`project-${image.projectId}`}
            key={`frame-${index}-${frame.marginTop}-${frame.marginLeft ?? frame.marginRight ?? index}`}
            style={baseStyle}
            onClick={handleImageClick}
            className={`cursor-pointer ${isSelected ? 'z-50' : ''} ${isOtherSelected ? 'pointer-events-none' : ''}`}>
            <HoverDistortImage
              src={src}
              alt={`Project ${image.slug || globalIndex + 1}`}
              className="h-full w-full overflow-hidden"
              aspectRatio={frame.orientation === 'vertical' ? '3 / 4' : '4 / 3'}
              distortionScale={200}
              radiusPx={400}
              distortionEnabled={!isSelected && !isOtherSelected}
            />
          </div>
        );
      });

      // null 제거
      const validCards = cards.filter((card) => card !== null);

      return (
        <div
          key={sectionId}
          ref={isTrigger ? setTriggerElement : null}
          data-section-id={sectionId}
          data-is-trigger={isTrigger}
          className="relative w-full"
          style={{
            minHeight: '300vh',
            position: 'relative',
            // 마지막 섹션이 아닌 경우 하단에 여유 공간 추가하여 스크롤이 끊기지 않도록 함
            paddingBottom: sectionIndex < sectionIds.length - 1 ? '100vh' : '0',
          }}>
          <div className="relative w-full" style={{ minHeight: '300vh', position: 'relative' }}>
            {validCards}
          </div>
        </div>
      );
    });
  }, [expanded, sectionIds, projectImages, loading, selected, windowSize.width, windowSize.height]);

  const containerStyle = useMemo<CSSProperties>(() => {
    return expanded
      ? {
          transition:
            'min-height 900ms cubic-bezier(0.19, 1, 0.22, 1), padding-bottom 900ms cubic-bezier(0.19, 1, 0.22, 1)',
        }
      : {
          minHeight: '90vh',
          transition:
            'min-height 900ms cubic-bezier(0.19, 1, 0.22, 1), padding-bottom 900ms cubic-bezier(0.19, 1, 0.22, 1)',
        };
  }, [expanded]);

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
        if (selected.slug) {
          window.history.pushState({}, '', `/project/${selected.slug}`);
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
      <Header isFixed={true} onProjectClick={handleProjectHeaderClick} />
      <MobileMenu onProjectClick={handleProjectHeaderClick} />
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
          <div className="relative flex w-full flex-col" style={containerStyle}>
            {sections}
          </div>
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
              heroImageSrc={selected?.imageSrc}
            />
          </main>
        </div>
      )}
    </>
  );
}
