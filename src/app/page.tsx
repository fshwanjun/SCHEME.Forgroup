'use client';

import HomeContainer from '@/components/HomeContainer';
import HomeGallery, { type GallerySelection } from '@/components/HomeGallery';
import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useIntersection } from '@/hooks/useIntersectionObserver';
import Header from '@/components/Header';
import MobileMenu from '@/components/MobileMenu';
import IntroLogo from '@/components/IntroLogo';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

// Landing Page 이미지 타입 정의
interface LandingPageImage {
  id: string;
  url: string;
  order: number;
  orientation?: 'horizontal' | 'vertical';
  projectSlug?: string; // 프로젝트 상세 페이지 링크 (선택적)
}

export default function Home() {
  // section ID 배열: 초기값 [0, 1, 2] (3개 section)
  const [sectionIds, setSectionIds] = useState<number[]>([0, 1, 2]);
  const [selected, setSelected] = useState<GallerySelection | null>(null);
  const [zoomStyle, setZoomStyle] = useState({ x: 0, y: 0, scale: 1, originX: 0, originY: 0 });
  const [landingImages, setLandingImages] = useState<
    Array<{ projectId: string; projectSlug?: string; verticalSrc: string; horizontalSrc: string }>
  >([]);
  const [headerLogoTrigger, setHeaderLogoTrigger] = useState<number | undefined>(undefined);

  const [triggerElement, setTriggerElement] = useState<HTMLElement | null>(null);
  const triggeredRef = useRef(false);
  const isInitialZoomRef = useRef(false); // 최초 줌 계산 여부 추적
  const containerRef = useRef<HTMLDivElement>(null); // motion.div 참조 추가
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false); // 네비게이션 중 플래그

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
          // 모든 이미지는 동일한 URL을 사용하되, 프레임의 orientation에 맞게 표시됨
          // projectSlug가 있으면 해당 프로젝트로 연결, 없으면 이미지 ID 사용
          const projectImages = sortedImages.map((img) => ({
            projectId: img.projectSlug || img.id, // 프로젝트 slug가 있으면 사용, 없으면 이미지 ID
            projectSlug: img.projectSlug, // 프로젝트 slug 저장
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
    window.scrollTo(0, 0);

    return () => {
      if ('scrollRestoration' in history) {
        history.scrollRestoration = 'auto';
      }
    };
  }, []);

  // 외부 클릭 시 줌 아웃 처리
  useEffect(() => {
    if (!selected) return;

    const handleClickOutside = (e: MouseEvent) => {
      // 네비게이션 중이면 무시
      if (isNavigating) return;

      // 클릭한 요소가 확대된 이미지 영역인지 확인
      const clickedElement = e.target as HTMLElement;
      const imageElement = document.getElementById(`project-${selected.projectId}`);

      if (!imageElement) return;

      // 확대된 이미지의 현재 위치와 크기 가져오기
      const imageRect = imageElement.getBoundingClientRect();

      // 클릭 좌표가 확대된 이미지 영역 밖인지 확인
      const clickX = e.clientX;
      const clickY = e.clientY;

      const isOutsideImage =
        clickX < imageRect.left ||
        clickX > imageRect.right ||
        clickY < imageRect.top ||
        clickY > imageRect.bottom;

      // 확대된 이미지 영역 밖을 클릭했으면 줌 아웃
      if (isOutsideImage) {
        // 클릭한 요소가 버튼이나 링크 등 상호작용 요소가 아닌 경우에만 줌 아웃
        const isInteractiveElement =
          clickedElement.closest('button') ||
          clickedElement.closest('a') ||
          clickedElement.closest('[role="button"]') ||
          clickedElement.closest('input') ||
          clickedElement.closest('select') ||
          clickedElement.closest('textarea');

        if (!isInteractiveElement) {
          isInitialZoomRef.current = false;
          setSelected(null);
        }
      }
    };

    // 약간의 지연을 두어 이미지 클릭 이벤트가 먼저 처리되도록 함
    const timeoutId = setTimeout(() => {
      window.addEventListener('click', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('click', handleClickOutside);
    };
  }, [selected, isNavigating]);

  const handleSelectImage = useCallback(
    async (image: GallerySelection) => {
      console.log('[Home] handleSelectImage called', {
        imageProjectId: image.projectId,
        selectedProjectId: selected?.projectId,
        isAlreadySelected: selected?.projectId === image.projectId,
        timestamp: Date.now(),
      });
      
      // 이미 선택된 이미지를 다시 클릭하면 프로젝트 상세 페이지로 이동
      if (selected?.projectId === image.projectId) {
        console.log('[Home] 이미지 재클릭 - 프로젝트 페이지로 이동');
        if (isNavigating) return; // 이미 네비게이션 중이면 무시
        
        // 프로젝트 slug가 있는 경우에만 상세 페이지로 이동
        const slug = image.projectSlug;

        // 프로젝트 링크가 없으면 아무 동작도 하지 않음 (줌아웃 제거)
        if (!slug) {
          console.log('[Home] 프로젝트 링크 없음 - 아무 동작 안함');
          return;
        }

        setIsNavigating(true);

        // 줌 상태를 유지하면서 부드럽게 확대하는 애니메이션
        // 현재 줌 스타일을 더 확대 (함수형 업데이트로 최신 상태 사용)
        setZoomStyle((prev) => {
          console.log('[Home] 줌 스타일 업데이트 (추가 확대)', {
            prevScale: prev.scale,
            newScale: prev.scale * 1.5,
          });
          return {
            ...prev,
            scale: prev.scale * 1.5, // 추가 확대
          };
        });

        // 클릭한 이미지 src를 쿼리 파라미터로 전달
        const imageSrc = encodeURIComponent(image.src);
        const targetUrl = `/project/${slug}?hero=${imageSrc}`;

        // 애니메이션 완료 후 페이지 이동 (duration: 0.8초)
        setTimeout(() => {
          router.push(targetUrl);
        }, 800); // 애니메이션 duration과 맞춤
        return;
      }

      // 새로운 이미지 선택
      console.log('[Home] 새로운 이미지 선택', {
        projectId: image.projectId,
        timestamp: Date.now(),
      });
      isInitialZoomRef.current = true; // 이미지 선택 시 초기 줌 플래그 설정
      setSelected(image);
    },
    [router, isNavigating, selected],
  );

  useEffect(() => {
    console.log('[Home] calculateZoom useEffect triggered', {
      selected: selected?.projectId,
      timestamp: Date.now(),
    });
    
    const calculateZoom = () => {
      if (!selected) {
        console.log('[Home] calculateZoom - selected 없음, 줌 리셋');
        setZoomStyle((prev) => ({ ...prev, x: 0, y: 0, scale: 1 }));
        document.body.style.overflow = '';
        document.documentElement.style.setProperty('--gallery-gap', '20px');
        return;
      }
      
      console.log('[Home] calculateZoom - 줌 계산 시작', {
        projectId: selected.projectId,
        rect: selected.rect,
      });

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

      // 상하 여백 100px씩 => 합쳐서 200px
      const verticalPadding = 200;
      const availableHeight = window.innerHeight - verticalPadding;

      // 상하 여백 100px을 기준으로 스케일 계산
      // "클릭한 요소의 상하가 각각 100px의 여백을 가지는 방식"
      const scale = availableHeight / rect.height;

      // Gap도 확대 비율에 맞춰서 작아져야 함
      const scaledGap = 20 / scale;
      document.documentElement.style.setProperty('--gallery-gap', `${scaledGap}px`);

      // Transform Origin 설정
      // motion.div가 스크롤이나 섹션 제거로 인해 위치가 바뀌었을 수 있으므로,
      // 실제 motion.div의 현재 위치를 기준으로 뷰포트 좌상단(0,0)이 motion.div 내부의 어디인지 계산합니다.
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
      // 변환 식: Target = Origin + (Point - Origin) * Scale + Translate
      // ScreenCenter = 0 + (ImageCenter - 0) * Scale + Translate  (Origin이 뷰포트 좌상단(0,0) 기준일 때 상대좌표)
      // Translate = ScreenCenter - ImageCenter * Scale

      const tx = screenCenterX - imageCenterX * scale;
      const ty = screenCenterY - imageCenterY * scale;

      const newZoomStyle = { x: tx, y: ty, scale, originX, originY };
      console.log('[Home] calculateZoom - 줌 스타일 설정', {
        newZoomStyle,
        timestamp: Date.now(),
      });
      setZoomStyle(newZoomStyle);
      document.body.style.overflow = 'hidden';
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

  // selectedProjectId를 메모이제이션하여 불필요한 리렌더링 방지
  const selectedProjectId = useMemo(() => selected?.projectId ?? null, [selected?.projectId]);

  const list = useMemo(
    () =>
      sectionIds.map((id, index) => {
        // 3개 중 2번째 요소(index 1)를 트리거로 사용 (미리 로딩)
        const isTrigger = index === 1; // 항상 중간 요소(index 1)가 트리거

        return (
          <div key={id} ref={isTrigger ? setTriggerElement : null} data-section-id={id} data-is-trigger={isTrigger}>
            <HomeGallery
              images={landingImages}
              onSelectImage={handleSelectImage}
              selectedProjectId={selectedProjectId}
            />
          </div>
        );
      }),
    [sectionIds, handleSelectImage, selectedProjectId, landingImages],
  );

  const handleHeaderAnimationStart = useCallback(() => {
    const trigger = Date.now();
    setHeaderLogoTrigger(trigger);
  }, []);

  return (
    <>
      <IntroLogo onHeaderAnimationStart={handleHeaderAnimationStart} />
      <Header headerLogoTrigger={headerLogoTrigger} />
      <MobileMenu headerLogoTrigger={headerLogoTrigger} />
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
        }}>
        <HomeContainer isFixed={false}>
          <div className="relative flex w-full flex-col">{list}</div>
        </HomeContainer>
      </motion.div>
    </>
  );
}
