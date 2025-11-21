'use client';

import HomeContainer from '@/components/HomeContainer';
import HomeGallery, { type GallerySelection } from '@/components/HomeGallery';
import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useIntersection } from '@/hooks/useIntersectionObserver';
import Header from '@/components/Header';

export default function Home() {
  // section ID 배열: 초기값 [0, 1, 2] (3개 section)
  const [sectionIds, setSectionIds] = useState<number[]>([0, 1, 2]);
  const [selected, setSelected] = useState<GallerySelection | null>(null);
  const [zoomStyle, setZoomStyle] = useState({ x: 0, y: 0, scale: 1, originX: 0, originY: 0 });

  const [triggerElement, setTriggerElement] = useState<HTMLElement | null>(null);
  const triggeredRef = useRef(false);
  const isInitialZoomRef = useRef(false); // 최초 줌 계산 여부 추적

  // 페이지 로드 시 스크롤 최상단 이동 및 복원 방지
  useEffect(() => {
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);

    return () => {
      if ('scrollRestoration' in history) {
        history.scrollRestoration = 'auto';
      }
    };
  }, []);

  // 이미지가 선택된 상태에서 외부 클릭 시 줌 아웃 처리
  useEffect(() => {
    if (!selected) return;

    const handleClickOutside = (e: MouseEvent) => {
      // 선택된 프로젝트의 DOM 요소를 찾음
      const selectedElement = document.getElementById(`project-${selected.projectId}`);

      // 클릭된 요소가 선택된 이미지 내부가 아니라면 줌 아웃
      if (selectedElement && !selectedElement.contains(e.target as Node)) {
        isInitialZoomRef.current = false;
        setSelected(null);
      }
    };

    // 캡처링 단계가 아니라 버블링 단계에서 처리하되,
    // 이미지 클릭 이벤트가 먼저 처리되고(stopPropagation 없이),
    // 그 다음 window 클릭이 처리되도록 함.
    // 단, 이미지 클릭 시 setSelected가 호출되는데, 상태 변경은 비동기이므로
    // 여기서 바로 닫히지 않도록 주의해야 함.
    // 이미지 클릭 핸들러에서 e.stopPropagation()을 하면 여기 도달하지 않음.
    // 하지만 ImageCard는 stopPropagation을 하지 않음.

    // 안전하게 setTimeout을 주거나, capture 단계 사용 등을 고려.
    // 여기서는 간단히 window 클릭을 감지.
    const timer = setTimeout(() => {
      window.addEventListener('click', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('click', handleClickOutside);
    };
  }, [selected]);

  const handleSelectImage = useCallback((image: GallerySelection) => {
    // console.log('handleSelectImage:', image);
    isInitialZoomRef.current = true; // 이미지 선택 시 초기 줌 플래그 설정

    // 이미 선택된 이미지를 다시 클릭하면 아무 동작도 하지 않음 (줌 아웃 방지)
    setSelected((current) => {
      if (current?.projectId === image.projectId) {
        return current;
      }
      return image;
    });
  }, []);

  useEffect(() => {
    const calculateZoom = () => {
      if (!selected) {
        setZoomStyle((prev) => ({ ...prev, x: 0, y: 0, scale: 1 }));
        document.body.style.overflow = '';
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
          // ... (기존 변수들) ...
          const currentScale = zoomStyle.scale;
          const currentX = zoomStyle.x;
          const currentY = zoomStyle.y;
          const currentOriginX = zoomStyle.originX;
          const currentOriginY = zoomStyle.originY;
          const currentScrollX = window.scrollX;
          const currentScrollY = window.scrollY;

          // 역산 로직: 변환된 좌표에서 원본 페이지 좌표 유추
          // 만약 이미 확대된 상태(scale > 1.01)라면 역산을 수행
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

      // 계산 후 초기 플래그 해제 (이후 리사이즈 시에는 역산 로직 사용)
      isInitialZoomRef.current = false;

      if (!rect) return;

      if (!rect) return;

      const scrollX = window.scrollX;
      const scrollY = window.scrollY;

      // 상하 여백 100px씩 => 합쳐서 200px
      const verticalPadding = 200;
      const availableHeight = window.innerHeight - verticalPadding;

      // 상하 여백 100px을 기준으로 스케일 계산
      // "클릭한 요소의 상하가 각각 100px의 여백을 가지는 방식"
      const scale = availableHeight / rect.height;

      // Gap도 확대 비율에 맞춰서 작아져야 함
      const scaledGap = 20 / scale;
      document.documentElement.style.setProperty('--gallery-gap', `${scaledGap}px`);

      // 현재 이미지의 중심 좌표 (스크롤 포함되지 않은 viewport 기준)
      const imageCenterX = rect.left + rect.width / 2;
      const imageCenterY = rect.top + rect.height / 2;

      // 화면의 중심 좌표
      const screenCenterX = window.innerWidth / 2;
      const screenCenterY = window.innerHeight / 2;

      // Transform Origin (absolute in document)
      const originX = imageCenterX + scrollX;
      const originY = imageCenterY + scrollY;

      // 이동해야 할 거리
      const tx = screenCenterX - imageCenterX;
      const ty = screenCenterY - imageCenterY;

      setZoomStyle({ x: tx, y: ty, scale, originX, originY });
      document.body.style.overflow = 'hidden';
    };

    calculateZoom();

    window.addEventListener('resize', calculateZoom);
    return () => {
      window.removeEventListener('resize', calculateZoom);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  // sectionIds가 변경되면 트리거 리셋
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

        // 현재 트리거 요소의 ID 확인 (디버깅용)
        const triggerId = triggerElement?.getAttribute('data-section-id');

        console.log(`Intersection check (Trigger ID: ${triggerId}):`, {
          bottom: rect.bottom,
          windowHeight: window.innerHeight,
          isTriggerPoint,
          triggered: triggeredRef.current,
        });

        if (isTriggerPoint && !triggeredRef.current) {
          triggeredRef.current = true;
          console.log(`🚀 Triggered on ID ${triggerId}! Adding new section...`);

          setSectionIds((prev) => {
            const lastId = prev[prev.length - 1];
            const newId = lastId + 1;
            const newIds = [...prev.slice(1), newId];

            console.log(`Update: [${prev.join(', ')}] -> [${newIds.join(', ')}]`);
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
  }, [selected, sectionIds, triggerElement]);

  const list = useMemo(
    () =>
      sectionIds.map((id, index) => {
        // 3개 중 2번째 요소(index 1)를 트리거로 사용 (미리 로딩)
        const isTrigger = index === 1; // 항상 중간 요소(index 1)가 트리거

        return (
          <div key={id} ref={isTrigger ? setTriggerElement : null} data-section-id={id} data-is-trigger={isTrigger}>
            <HomeGallery onSelectImage={handleSelectImage} selectedProjectId={selected?.projectId ?? null} />
          </div>
        );
      }),
    [sectionIds, handleSelectImage, selected?.projectId],
  );

  return (
    <>
      <Header />
      <motion.div
        animate={{
          x: zoomStyle.x,
          y: zoomStyle.y,
          scale: zoomStyle.scale,
        }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        style={{
          transformOrigin: `${zoomStyle.originX}px ${zoomStyle.originY}px`,
          width: '100%',
        }}>
        <HomeContainer isFixed={false}>
          <div className="relative flex w-full flex-col">{list}</div>
        </HomeContainer>
      </motion.div>
    </>
  );
}
