'use client';

import { useEffect, useMemo, useState, useRef, useCallback, type CSSProperties } from 'react';
import HoverDistortImage from '@/components/HoverDistortImage';
import HomeContainer from '@/components/HomeContainer';
import Header from '@/components/Header';
import { useIntersection } from '@/hooks/useIntersectionObserver';
import { supabase } from '@/lib/supabase';

interface ProjectContent {
  thumbnail43?: string;
  thumbnail34?: string;
}

interface Project {
  id: number;
  slug: string;
  title: string;
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

  // Row 2: Upper Middle
  { marginTop: '25vh', marginLeft: '5%', width: '32vw', orientation: 'vertical', zIndex: 3 },
  { marginTop: '25vh', marginLeft: '52%', width: '38vw', orientation: 'horizontal', zIndex: 2 },

  // Row 3: Middle
  { marginTop: '48vh', marginLeft: '3%', width: '34vw', orientation: 'vertical', zIndex: 3 },
  { marginTop: '50vh', marginLeft: '50%', width: '42vw', orientation: 'horizontal', zIndex: 2 },

  // Row 4: Lower Middle
  { marginTop: '70vh', marginLeft: '6%', width: '30vw', orientation: 'vertical', zIndex: 3 },
  { marginTop: '72vh', marginLeft: '52%', width: '38vw', orientation: 'horizontal', zIndex: 2 },

  // Row 5: Bottom
  { marginTop: '92vh', marginLeft: '4%', width: '32vw', orientation: 'vertical', zIndex: 3 },
  { marginTop: '95vh', marginLeft: '50%', width: '40vw', orientation: 'horizontal', zIndex: 2 },

  // Row 6: Bottom
  { marginTop: '118vh', marginLeft: '8%', width: '35vw', orientation: 'horizontal', zIndex: 2 },
  { marginTop: '118vh', marginLeft: '52%', width: '38vw', orientation: 'horizontal', zIndex: 2 },
];

export default function ProjectPage() {
  const [expanded, setExpanded] = useState(false);
  // section ID 배열: 초기값 [0, 1, 2] (3개 section) - 홈 페이지와 동일한 방식
  const [sectionIds, setSectionIds] = useState<number[]>([0, 1, 2]);
  const [triggerElement, setTriggerElement] = useState<HTMLElement | null>(null);
  const triggeredRef = useRef(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // 프로젝트 목록 가져오기
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const { data, error } = await supabase
          .from('project')
          .select('id, slug, title, contents')
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

  useEffect(() => {
    const t = setTimeout(() => setExpanded(true), 80);
    return () => clearTimeout(t);
  }, []);

  // sectionIds가 변경되면 트리거 리셋 (홈 페이지와 동일)
  useEffect(() => {
    triggeredRef.current = false;
  }, [sectionIds]);

  // 트리거 지점에 도달했는지 감지 (IntersectionObserver) - 두 번째 섹션을 감시 (홈 페이지와 동일)
  useIntersection(
    triggerElement,
    (entry: IntersectionObserverEntry) => {
      // 두 번째 섹션의 바닥이 화면 중간쯤 왔을 때 미리 로딩
      if (entry.isIntersecting) {
        const rect = entry.boundingClientRect;
        // 두 번째 섹션의 바닥이 뷰포트 높이 + 1000px (여유분) 보다 위에 있을 때
        const isTriggerPoint = rect.bottom <= window.innerHeight + 1000;

        if (isTriggerPoint && !triggeredRef.current) {
          triggeredRef.current = true;
          console.log('🚀 Triggered! Adding new section...');

          setSectionIds((prev) => {
            const lastId = prev[prev.length - 1];
            const newId = lastId + 1;
            const newIds = [...prev.slice(1), newId]; // 첫 번째 제거, 마지막에 새 섹션 추가

            console.log(`Update: [${prev.join(', ')}] -> [${newIds.join(', ')}]`);
            return newIds;
          });
        }
      }
    },
    { rootMargin: '0px 0px 500px 0px', threshold: [0, 0.1, 0.5, 1] },
  );

  // 스크롤 이벤트로도 감지 (백업) - 두 번째 섹션 기준 (홈 페이지와 동일)
  useEffect(() => {
    const handleScroll = () => {
      if (!triggerElement || triggeredRef.current) return;

      const rect = triggerElement.getBoundingClientRect();
      const windowHeight = window.innerHeight;

      // 두 번째 섹션의 바닥이 화면 하단 근처에 도달했는지 확인
      const isTriggerPoint = rect.bottom <= windowHeight + 1000;

      if (isTriggerPoint) {
        triggeredRef.current = true;
        console.log('📜 Scroll Trigger! Adding new section...');

        setSectionIds((prev) => {
          const lastId = prev[prev.length - 1];
          const newId = lastId + 1;
          const newIds = [...prev.slice(1), newId];
          console.log(`Scroll Update: [${prev.join(', ')}] -> [${newIds.join(', ')}]`);
          return newIds;
        });
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [triggerElement]);

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

        const baseStyle: CSSProperties = {
          width: frame.width,
          zIndex: frame.zIndex,
          position: 'relative',
          transition:
            'margin-top 900ms cubic-bezier(0.19, 1, 0.22, 1), margin-left 900ms cubic-bezier(0.19, 1, 0.22, 1), margin-right 900ms cubic-bezier(0.19, 1, 0.22, 1), transform 950ms cubic-bezier(0.19,1,0.22,1), opacity 700ms ease',
          transitionDelay: `${index * 10}ms`,
        };

        if (expanded) {
          // 확장된 상태: 각 이미지의 목표 위치
          baseStyle.marginTop = frame.marginTop;
          baseStyle.marginLeft = frame.marginLeft ?? 'auto';
          baseStyle.marginRight = frame.marginRight ?? 'auto';
          baseStyle.transform = 'translate(0, 0) scale(1)';
          baseStyle.opacity = 1;
        } else {
          // 초기 상태: 모든 이미지가 화면 중앙에 모여 있음
          baseStyle.marginTop = '50vh';
          baseStyle.marginLeft = '50%';
          baseStyle.marginRight = 'auto';
          baseStyle.transform = 'translate(-50%, -50%) scale(0.9)';
          baseStyle.opacity = 0;
        }

        const src = frame.orientation === 'vertical' ? image.verticalSrc : image.horizontalSrc;

        return (
          <div
            key={`frame-${index}-${frame.marginTop}-${frame.marginLeft ?? frame.marginRight ?? index}`}
            style={baseStyle}>
            <HoverDistortImage
              src={src}
              alt={`Project ${image.slug || globalIndex + 1}`}
              className="h-full w-full overflow-hidden"
              aspectRatio={frame.orientation === 'vertical' ? '3 / 4' : '4 / 3'}
              distortionScale={200}
              radiusPx={400}
              distortionEnabled={true}
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
            minHeight: '160vh', // 마지막 이미지(118vh) + 여유 공간을 위해 충분한 높이
            marginBottom: sectionIndex < sectionIds.length - 1 ? '60vh' : '0', // 섹션 간 충분한 간격
            paddingBottom: sectionIndex === sectionIds.length - 1 ? '100vh' : '0',
            position: 'relative',
          }}>
          <div className="relative w-full" style={{ minHeight: '160vh' }}>
            {validCards}
          </div>
        </div>
      );
    });
  }, [expanded, sectionIds, projectImages, loading, triggerElement]);

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

  return (
    <>
      <Header isFixed={true} />
      <HomeContainer>
        <div className="relative flex w-full flex-col" style={containerStyle}>
          {sections}
        </div>
      </HomeContainer>
    </>
  );
}
