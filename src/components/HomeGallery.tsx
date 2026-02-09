'use client'; // 이 컴포넌트가 클라이언트 측에서 렌더링되어야 함을 나타냅니다. (React 18 이상)

import { useEffect, useMemo, useState, memo, useCallback, useRef } from 'react';
import gsap from 'gsap';
import ImageCard from '@/components/ImageCard'; // 이미지 카드 렌더링을 위한 컴포넌트입니다.
import useWindowSize from '@/hooks/useWindowSize';

// 프로젝트 이미지의 타입 정의
type ProjectImage = {
  projectId: string; // 프로젝트/이미지 ID
  projectSlug?: string; // 프로젝트 상세 페이지 링크 (선택적)
  verticalSrc: string; // 세로 방향 이미지 소스 경로 (aspect-[3/4] 프레임용)
  horizontalSrc: string; // 가로 방향 이미지 소스 경로 (aspect-[4/3] 프레임용)
  orientation?: 'horizontal' | 'vertical'; // 이미지의 orientation (admin에서 설정한 값)
  frameIndex?: number; // 프로젝트 레이아웃에서 사용하는 프레임 인덱스
  clickDisabled?: boolean; // 클릭 비활성화 여부
};

export type GallerySelection = {
  projectId: string;
  projectSlug?: string; // 프로젝트 상세 페이지 링크 (선택적)
  src: string;
  orientation: 'vertical' | 'horizontal';
  aspectRatio: string;
  rect?: DOMRect;
  uniqueId?: string; // 무한 스크롤에서 동일 이미지 구분을 위한 고유 ID
};

import { HOME_LAYOUT_CONFIG } from '@/config/homeLayout';
import { PROJECT_LAYOUT_CONFIG } from '@/config/projectLayout';

// 갤러리에 표시될 실제 프로젝트 이미지 데이터 목록입니다.
// Landing Page Manager에서 관리하는 이미지 데이터를 사용합니다.

// 시드 기반 의사 난수 생성기(Pseudo-Random Number Generator, PRNG)를 생성하는 함수입니다.
// 동일한 'seed'를 사용하면 항상 같은 난수 시퀀스를 생성합니다.
function createSeededRandom(seed: number) {
  let state = seed;
  return () => {
    // 선형 합동 생성기(LCG) 알고리즘을 사용하여 다음 난수 상태를 계산합니다.
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296; // 0과 1 사이의 부동 소수점 난수를 반환합니다.
  };
}

// 시드 기반의 난수를 사용하여 배열을 셔플(Fisher-Yates 알고리즘)하는 함수입니다.
// 동일한 입력 배열과 시드에 대해 항상 같은 순서로 섞인 배열을 반환합니다.
function shuffleWithSeed<T>(input: T[], seed: number): T[] {
  const arr = [...input];
  const rand = createSeededRandom(seed);
  for (let i = arr.length - 1; i > 0; i--) {
    // 시드 기반 난수를 사용하여 섞습니다.
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// 🌟 추가: FRAME_CLASSES를 분석하여 행(row)별로 프레임을 그룹화하고 전체 행 수를 계산하는 함수
function getRowGroups(frameClasses: readonly string[]): { rowFrames: number[][]; totalRows: number } {
  const rowMap: Map<number, number[]> = new Map();
  let maxRow = 0;

  frameClasses.forEach((frameClass, index) => {
    // 'row-start-N' 패턴을 추출합니다.
    const match = frameClass.match(/row-start-(\d+)/);
    if (match) {
      const rowNumber = parseInt(match[1], 10);
      maxRow = Math.max(maxRow, rowNumber);

      if (!rowMap.has(rowNumber)) {
        rowMap.set(rowNumber, []);
      }
      // 해당 행에 속하는 FRAME_CLASSES의 인덱스를 저장합니다.
      rowMap.get(rowNumber)?.push(index);
    }
  });

  // 1부터 maxRow까지 순서대로 인덱스 배열을 만듭니다. (행 번호: 1, 2, 3, ...)
  const rowFrames: number[][] = [];
  for (let i = 1; i <= maxRow; i++) {
    rowFrames.push(rowMap.get(i) || []); // 해당 행에 프레임이 없으면 빈 배열 추가
  }

  // 이 배열은 [ [0, 1], [2, 3], [4], ... ] 와 같이 인덱스를 그룹화합니다.
  return { rowFrames, totalRows: maxRow };
}

type LayoutConfig = {
  readonly desktop: {
    readonly frameClasses: readonly string[];
    readonly gridCols: number;
    readonly gap: number;
    readonly horizontalPadding: number;
  };
  readonly mobile: {
    readonly frameClasses: readonly string[];
    readonly gridCols: number;
    readonly gap: number;
    readonly horizontalPadding: number;
  };
};

type HomeGalleryProps = {
  images?: ProjectImage[]; // Landing Page Manager에서 가져온 이미지 목록
  onSelectImage?: (image: GallerySelection) => void;
  selectedProjectId?: string | null;
  selectedUniqueId?: string | null; // 선택된 이미지의 고유 ID (무한 스크롤용)
  layoutConfig?: LayoutConfig; // 레이아웃 설정 (기본값: HOME_LAYOUT_CONFIG)
  sectionId?: number; // 무한 스크롤에서 섹션 구분을 위한 ID
  onIntroAnimationComplete?: () => void; // 인트로 애니메이션 완료 콜백
  // Distortion 효과 설정 (ImageCard에 전달)
  distortionScale?: number;
  radiusPx?: number;
  blurStd?: number;
  easingFactor?: number;
};

function HomeGallery({
  images = [],
  onSelectImage,
  selectedProjectId,
  selectedUniqueId,
  layoutConfig = HOME_LAYOUT_CONFIG,
  sectionId = 0,
  onIntroAnimationComplete,
  distortionScale,
  radiusPx,
  blurStd,
  easingFactor,
}: HomeGalleryProps) {
  // console.log('[HomeGallery] render', {
  //   imagesCount: images.length,
  //   selectedProjectId,
  //   timestamp: Date.now(),
  // });

  // 화면 크기 감지
  const windowSize = useWindowSize();
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  // 클라이언트 사이드에서만 모바일 여부 업데이트 (hydration 불일치 방지)
  useEffect(() => {
    setMounted(true);
    setIsMobile(windowSize.isSm);
  }, [windowSize.isSm]);

  // 모바일 여부에 따라 사용할 프레임 클래스 선택 (마운트 전에는 데스크톱 기본값)
  const currentFrameClasses = useMemo(
    () => (mounted && isMobile ? layoutConfig.mobile.frameClasses : layoutConfig.desktop.frameClasses),
    [mounted, isMobile, layoutConfig],
  );

  // 모바일 여부에 따라 gap 설정 (마운트 전에는 데스크톱 기본값)
  const gap = useMemo(
    () => (mounted && isMobile ? layoutConfig.mobile.gap : layoutConfig.desktop.gap),
    [mounted, isMobile, layoutConfig],
  );

  // 모바일 여부에 따라 좌우 여백 설정 (마운트 전에는 데스크톱 기본값)
  const horizontalPadding = useMemo(
    () => (mounted && isMobile ? layoutConfig.mobile.horizontalPadding : layoutConfig.desktop.horizontalPadding),
    [mounted, isMobile, layoutConfig],
  );

  // 그리드 컬럼 수 설정
  const gridCols = useMemo(
    () => (mounted && isMobile ? layoutConfig.mobile.gridCols : layoutConfig.desktop.gridCols),
    [mounted, isMobile, layoutConfig],
  );

  // 🌟 수정: 건너뛸 행의 개수를 저장하는 상태입니다.
  const [skipRows, setSkipRows] = useState(0);

  // 🌟 추가: 행 그룹 정보 계산 (현재 사용 중인 프레임 클래스 기준)
  // 모든 hooks는 항상 같은 순서로 호출되어야 함
  const { rowFrames, totalRows } = useMemo(() => getRowGroups(currentFrameClasses), [currentFrameClasses]);

  // images를 메모이제이션하여 dependency 문제 해결
  const PROJECT_IMAGES: ProjectImage[] = useMemo(() => images || [], [images]);
  const projectCount = PROJECT_IMAGES.length;
  const totalFrames = currentFrameClasses.length;

  // 프로젝트 레이아웃인지 확인 (안정적인 참조를 위해 useMemo 사용)
  const isProjectLayout = useMemo(() => layoutConfig === PROJECT_LAYOUT_CONFIG, [layoutConfig]);

  // 이미지 로드 상태 추적 (프로젝트 레이아웃에서만)
  const [imagesReady, setImagesReady] = useState(false);
  // GSAP 애니메이션 완료 상태
  const gsapAnimationRef = useRef<gsap.core.Timeline | null>(null);

  // 첫 번째 섹션인지 확인 (애니메이션은 첫 섹션에서만)
  const isFirstSection = sectionId === 0;

  // 각 카드의 ref를 저장
  const cardRefs = useRef<Map<number, HTMLDivElement | null>>(new Map());
  const sectionRef = useRef<HTMLElement | null>(null);

  // 카드 ref 설정 콜백
  const setCardRef = useCallback((index: number, el: HTMLDivElement | null) => {
    cardRefs.current.set(index, el);
  }, []);

  // 프로젝트 레이아웃의 첫 번째 섹션에서 GSAP 애니메이션 실행
  useEffect(() => {
    if (!isProjectLayout || !mounted || !isFirstSection) {
      // 프로젝트 레이아웃이 아니거나 첫 번째 섹션이 아니면 즉시 표시
      if (!isProjectLayout || !isFirstSection) {
        setImagesReady(true);
      }
      return;
    }

    // 카드 요소들이 준비될 때까지 대기
    const initAnimation = () => {
      const cards = Array.from(cardRefs.current.entries())
        .filter(([, el]) => el !== null)
        .map(([index, el]) => ({ index, el: el as HTMLDivElement }));

      if (cards.length === 0) return;

      // 스크롤 컨테이너를 최상단으로 이동
      const scrollContainer = sectionRef.current?.closest('[class*="overflow-y"]') as HTMLElement | null;
      if (scrollContainer) {
        scrollContainer.scrollTop = 0;
      }

      const windowCenterX = window.innerWidth / 2;
      const windowCenterY = window.innerHeight / 2;

      // 각 카드의 초기 위치 계산 및 설정
      const cardData = cards.map(({ index, el }) => {
        const rect = el.getBoundingClientRect();
        const cardCenterX = rect.left + rect.width / 2;
        const cardCenterY = rect.top + rect.height / 2;

        // 윈도우 중앙에서 카드까지의 거리
        const distance = Math.sqrt(Math.pow(windowCenterX - cardCenterX, 2) + Math.pow(windowCenterY - cardCenterY, 2));

        return { index, el, rect, distance, cardCenterX, cardCenterY };
      });

      // 최대 거리 찾기 (정규화용)
      const maxDistance = Math.max(...cardData.map((c) => c.distance), 1);

      // 각 카드의 데이터 확장 (이동량, 중간 scale 계산)
      const extendedCardData = cardData.map(({ el, distance, cardCenterX, cardCenterY, rect, ...rest }) => {
        const dirX = windowCenterX - cardCenterX;
        const dirY = windowCenterY - cardCenterY;

        // 거리에 비례하여 이동량 증가 (더 부드럽게)
        const distanceMultiplier = 1 + (distance / maxDistance) * 0.6;

        let translateX = dirX * distanceMultiplier;
        let translateY = dirY * distanceMultiplier;

        // 화면 밖으로 나가지 않도록 시작 위치 제한
        // 카드의 시작 위치 = 현재 위치 + translate
        const startLeft = rect.left + translateX;
        const startTop = rect.top + translateY;
        const startRight = startLeft + rect.width;
        const startBottom = startTop + rect.height;

        // 화면 경계에서의 여백
        const margin = 20;

        // 화면 위쪽으로 나가는 경우 제한
        if (startTop < margin) {
          translateY = margin - rect.top;
        }
        // 화면 왼쪽으로 나가는 경우 제한
        if (startLeft < margin) {
          translateX = margin - rect.left;
        }
        // 화면 오른쪽으로 나가는 경우 제한
        if (startRight > window.innerWidth - margin) {
          translateX = window.innerWidth - margin - rect.width - rect.left;
        }
        // 화면 아래쪽으로 나가는 경우 제한
        if (startBottom > window.innerHeight - margin) {
          translateY = window.innerHeight - margin - rect.height - rect.top;
        }

        // 중간 scale (1단계 완료 시): 멀리 있는 카드는 더 작게 (0.5 ~ 0.75)
        const midScale = 0.5 + (1 - distance / maxDistance) * 0.25;

        // 개별 카드의 흩어지는 duration (거리가 먼 카드는 조금 더 오래)
        const scatterDuration = 1.8 + (distance / maxDistance) * 0.6;

        return {
          el,
          distance,
          cardCenterX,
          cardCenterY,
          rect,
          translateX,
          translateY,
          midScale,
          scatterDuration,
          ...rest,
        };
      });

      // 초기 상태 설정: 모든 카드가 윈도우 중앙에서 scale: 0으로 시작
      extendedCardData.forEach(({ el, translateX, translateY }) => {
        gsap.set(el, {
          x: translateX,
          y: translateY,
          scale: 0,
          opacity: 0,
          visibility: 'visible',
        });
      });

      // GSAP 타임라인 생성
      const tl = gsap.timeline();
      gsapAnimationRef.current = tl;

      // 1단계: 중앙에서 카드들이 하나씩 부드럽게 나타남 (scale: 0 → midScale, opacity: 0 → 1)
      extendedCardData.forEach(({ el, midScale }, i) => {
        tl.to(
          el,
          {
            scale: midScale,
            opacity: 1,
            duration: 1.0, // 더 천천히 나타남
            ease: 'expo.out', // 더 부드러운 감속
          },
          0.2 + i * 0.06, // 0.06초 간격으로 더 자연스럽게 순차 등장
        );
      });

      // 2단계: 카드들이 원래 자리로 흩어지며 커짐 (더 자연스러운 타이밍)
      const scatterStartTime = 0.2 + extendedCardData.length * 0.06 + 0.3; // 1단계 중 일부 겹침

      // 각 카드가 개별적으로 자연스럽게 흩어지도록 애니메이션
      extendedCardData.forEach(({ el, scatterDuration, distance }) => {
        // 거리에 따른 stagger delay (가까운 카드가 먼저)
        const normalizedDistance = distance / maxDistance;
        const staggerDelay = normalizedDistance * 0.3;

        tl.to(
          el,
          {
            x: 0,
            y: 0,
            scale: 1,
            duration: scatterDuration,
            ease: 'expo.out', // 매우 부드러운 감속 곡선
          },
          scatterStartTime + staggerDelay,
        );
      });

      // 애니메이션 완료 후 상태 업데이트
      tl.call(() => {
        setImagesReady(true);
        // 인트로 애니메이션 완료 콜백 호출
        onIntroAnimationComplete?.();
      });
    };

    // DOM이 완전히 렌더링된 후 애니메이션 초기화
    const timer = setTimeout(initAnimation, 100);

    return () => {
      clearTimeout(timer);
      // 컴포넌트 언마운트 시 애니메이션 정리
      if (gsapAnimationRef.current) {
        gsapAnimationRef.current.kill();
        gsapAnimationRef.current = null;
      }
    };
  }, [isProjectLayout, mounted, projectCount, currentFrameClasses, isFirstSection, onIntroAnimationComplete]);

  // 첫 번째 섹션이 아닌 경우 즉시 표시
  useEffect(() => {
    if (isProjectLayout && mounted && projectCount > 0 && !isFirstSection) {
      setImagesReady(true);
    }
  }, [isProjectLayout, mounted, projectCount, isFirstSection]);

  // 🌟 수정: 컴포넌트가 처음 마운트될 때 건너뛸 '행'의 개수를 계산합니다.
  // 프로젝트와 홈 모두 랜덤 행 건너뛰기 적용
  useEffect(() => {
    // 최소 표시할 이미지 개수
    const MIN_VISIBLE_IMAGES = 5;

    // 각 행까지 건너뛸 경우의 프레임 수 계산
    const getSkippedFrameCount = (skipRowCount: number): number => {
      let count = 0;
      for (let i = 0; i < skipRowCount; i++) {
        count += rowFrames[i]?.length || 0;
      }
      return count;
    };

    // 최대 건너뛸 행 개수: 전체 행의 절반 정도까지만 건너뛰도록 제한합니다.
    let maxSkipRows = Math.max(0, Math.floor(totalRows / 2));

    // 남은 프레임이 최소 MIN_VISIBLE_IMAGES개 이상이 되도록 maxSkipRows 조정
    while (maxSkipRows > 0) {
      const skippedFrames = getSkippedFrameCount(maxSkipRows);
      const remainingFrames = totalFrames - skippedFrames;
      if (remainingFrames >= MIN_VISIBLE_IMAGES) {
        break;
      }
      maxSkipRows--;
    }

    // 0부터 maxSkipRows 사이의 난수를 생성합니다.
    const randomSkip = maxSkipRows > 0 ? Math.floor(Math.random() * (maxSkipRows + 1)) : 0;

    setSkipRows(randomSkip);
  }, [totalRows, totalFrames, rowFrames]); // totalRows, totalFrames, rowFrames가 변경되면 다시 계산합니다

  // 🌟 수정: 건너뛸 프레임의 인덱스 목록을 계산합니다.
  const framesToSkip = useMemo(() => {
    const skipIndices: Set<number> = new Set();
    // skipRows만큼의 행에 포함된 모든 프레임 인덱스를 Set에 추가합니다.
    for (let i = 0; i < skipRows; i++) {
      rowFrames[i]?.forEach((frameIndex) => {
        skipIndices.add(frameIndex);
      });
    }
    return skipIndices;
  }, [skipRows, rowFrames]);

  // 프로젝트 할당 로직
  const projectAssignments = useMemo(() => {
    if (projectCount === 0 || totalFrames === 0) return [];

    // 프로젝트 레이아웃이고 frameIndex가 있는 이미지가 있는 경우
    const hasFrameIndex = PROJECT_IMAGES.some((img) => img.frameIndex !== undefined);

    if (isProjectLayout && hasFrameIndex) {
      // frameIndex 기반 직접 매핑
      const assignments: (ProjectImage | null)[] = new Array(totalFrames).fill(null);

      PROJECT_IMAGES.forEach((img) => {
        if (img.frameIndex !== undefined && img.frameIndex >= 0) {
          // frameIndex는 0부터 시작하거나 1부터 시작할 수 있으므로 확인
          // frameIndex가 배열 인덱스 범위를 벗어나면 조정
          let frameIdx = img.frameIndex;
          if (frameIdx >= totalFrames) {
            frameIdx = frameIdx - 1; // 1-based인 경우 0-based로 변환
          }
          if (frameIdx >= 0 && frameIdx < totalFrames) {
            assignments[frameIdx] = img;
          }
        }
      });

      return assignments;
    }

    // 기본 순차 할당 로직 (홈 페이지용)
    // 홈 페이지에서는 orientation에 맞는 이미지만 해당 프레임에 할당
    const assignments: (ProjectImage | null)[] = new Array(totalFrames).fill(null);

    // 이미지를 orientation별로 분리
    // orientation이 설정된 이미지는 해당 프레임에만 할당
    // orientation이 없는 이미지는 양쪽 모두에 할당 (폴백)
    const verticalImages: ProjectImage[] = [];
    const horizontalImages: ProjectImage[] = [];

    PROJECT_IMAGES.forEach((img) => {
      if (img && img.verticalSrc && img.horizontalSrc) {
        if (img.orientation === 'vertical') {
          // orientation이 'vertical'인 경우 vertical 프레임에만 할당
          verticalImages.push(img);
        } else if (img.orientation === 'horizontal') {
          // orientation이 'horizontal'인 경우 horizontal 프레임에만 할당
          horizontalImages.push(img);
        } else {
          // orientation이 없는 이미지는 양쪽 모두에 할당 (폴백)
          // 이 경우 이미지는 cover로 표시됨
          verticalImages.push(img);
          horizontalImages.push(img);
        }
      }
    });

    // 각 프레임에 맞는 orientation의 이미지 할당
    let verticalIndex = 0;
    let horizontalIndex = 0;
    const verticalShuffleCache: ProjectImage[][] = [];
    const horizontalShuffleCache: ProjectImage[][] = [];

    for (let index = 0; index < totalFrames; index++) {
      // 건너뛸 프레임은 null로 할당하고 건너뛰기
      if (framesToSkip.has(index)) {
        assignments[index] = null;
        continue;
      }

      const frameClass = currentFrameClasses[index];
      const frameOrientation = frameClass.includes('aspect-[3/4]') ? 'vertical' : 'horizontal';

      if (frameOrientation === 'vertical') {
        // 세로형 프레임에는 세로형 이미지만 할당
        if (verticalImages.length === 0) {
          assignments[index] = null; // 세로형 이미지가 없으면 null
          continue;
        }

        const cycle = Math.floor(verticalIndex / verticalImages.length);
        const withinCycle = verticalIndex % verticalImages.length;

        if (cycle === 0) {
          assignments[index] = verticalImages[withinCycle];
        } else {
          if (!verticalShuffleCache[cycle]) {
            verticalShuffleCache[cycle] = shuffleWithSeed(verticalImages, cycle);
          }
          assignments[index] = verticalShuffleCache[cycle][withinCycle];
        }
        verticalIndex++;
      } else {
        // 가로형 프레임에는 가로형 이미지만 할당
        if (horizontalImages.length === 0) {
          assignments[index] = null; // 가로형 이미지가 없으면 null
          continue;
        }

        const cycle = Math.floor(horizontalIndex / horizontalImages.length);
        const withinCycle = horizontalIndex % horizontalImages.length;

        if (cycle === 0) {
          assignments[index] = horizontalImages[withinCycle];
        } else {
          if (!horizontalShuffleCache[cycle]) {
            horizontalShuffleCache[cycle] = shuffleWithSeed(horizontalImages, cycle);
          }
          assignments[index] = horizontalShuffleCache[cycle][withinCycle];
        }
        horizontalIndex++;
      }
    }
    return assignments;
  }, [projectCount, totalFrames, PROJECT_IMAGES, isProjectLayout, currentFrameClasses, framesToSkip]); // currentFrameClasses와 framesToSkip 추가

  // 🌟 추가: 실제로 렌더링될 프레임들의 최소 row-start를 계산하여 상단 gap 방지
  const rowStartOffset = useMemo(() => {
    let minRowStart = Infinity;

    currentFrameClasses.forEach((frameClass, index) => {
      // 건너뛸 프레임은 제외
      if (framesToSkip.has(index)) return;

      // assignment 확인
      const assignment = projectAssignments[index];
      if (!assignment || !assignment.verticalSrc || !assignment.horizontalSrc) return;

      // orientation 필터 확인
      const frameOrientation = frameClass.includes('aspect-[3/4]') ? 'vertical' : 'horizontal';
      const imageOrientation = assignment.orientation || frameOrientation;
      if (assignment.orientation && imageOrientation !== frameOrientation) return;

      // row-start 추출
      const match = frameClass.match(/row-start-(\d+)/);
      if (match) {
        const rowStart = parseInt(match[1], 10) - skipRows;
        if (rowStart < minRowStart) {
          minRowStart = rowStart;
        }
      }
    });

    // 첫 번째 렌더링되는 프레임의 row-start가 1이 되도록 오프셋 계산
    return minRowStart === Infinity ? 0 : minRowStart - 1;
  }, [currentFrameClasses, framesToSkip, projectAssignments, skipRows]);

  // 이미지가 없으면 빈 갤러리 렌더링
  if (projectCount === 0) {
    return (
      <section
        className="HomeGallery relative mb-[20px] w-full"
        style={{ paddingLeft: horizontalPadding, paddingRight: horizontalPadding }}>
        <div
          className={`grid w-full ${isMobile ? 'grid-cols-[repeat(11,minmax(0,1fr))]' : 'grid-cols-16'}`}
          style={{ gap }}></div>
      </section>
    );
  }

  return (
    <section
      ref={sectionRef}
      className="HomeGallery relative mb-[20px] w-full"
      style={{ paddingLeft: horizontalPadding, paddingRight: horizontalPadding }}>
      <div
        className="grid w-full"
        style={{
          gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`,
          gridAutoRows: 'min-content', // 빈 행의 높이를 0으로 만들어 상단 gap 방지
          columnGap: gap,
          rowGap: gap,
        }}>
        {currentFrameClasses.map((frameClass, index) => {
          // 🌟 핵심 수정: 건너뛸 행에 속하는 프레임은 렌더링하지 않습니다.
          if (framesToSkip.has(index)) {
            return null; // 프레임을 건너뜁니다.
          } // 건너뛰지 않는 프레임에 대한 이미지 할당

          const assignment = projectAssignments[index];

          // assignment가 없거나 이미지가 없으면 렌더링하지 않음
          if (!assignment || !assignment.verticalSrc || !assignment.horizontalSrc) {
            return null;
          }

          // 틀의 orientation 결정 (틀의 aspect 비율에 따라)
          const frameOrientation = frameClass.includes('aspect-[3/4]') ? 'vertical' : 'horizontal';

          // 이미지의 orientation 결정
          // orientation이 설정되어 있으면 그 값 사용, 없으면 프레임에 맞춤 (폴백)
          const imageOrientation = assignment.orientation || frameOrientation;

          // orientation이 설정된 이미지는 반드시 맞는 프레임에만 표시
          // vertical 이미지는 3/4 프레임에만, horizontal 이미지는 4/3 프레임에만
          if (assignment.orientation && imageOrientation !== frameOrientation) {
            return null;
          }

          const orientation = imageOrientation;
          const aspectRatio = orientation === 'vertical' ? '3 / 4' : '4 / 3';
          const src = orientation === 'vertical' ? assignment.verticalSrc : assignment.horizontalSrc;

          // 고유 ID 생성: 섹션ID + 프로젝트ID + 프레임인덱스
          const uniqueId = `section-${sectionId}-${assignment.projectId}-${index}`;

          // 선택 상태 확인: uniqueId가 있으면 우선 사용, 없으면 projectId로 비교
          const isSelected = selectedUniqueId
            ? selectedUniqueId === uniqueId
            : selectedProjectId != null && assignment.projectId === selectedProjectId;
          const isOtherSelected = (selectedProjectId != null || selectedUniqueId != null) && !isSelected;

          return (
            <div
              // 🌟 중요: 건너뛴 행의 개수만큼 row-start 값을 조정하여
              // 갤러리가 시작 행에서부터 자연스럽게 이어지도록 합니다.
              ref={(el) => {
                if (isProjectLayout && isFirstSection) setCardRef(index, el);
              }}
              key={`${frameClass}-${index}`}
              className={`${frameClass.replace(
                /row-start-(\d+)/,
                (_, p1) => `row-start-${parseInt(p1, 10) - skipRows - rowStartOffset}`,
              )} relative ${isSelected ? 'z-50' : ''} ${isOtherSelected ? 'pointer-events-none' : ''}`}
              style={
                isProjectLayout
                  ? {
                      // 첫 번째 섹션: 초기에 숨김 (GSAP이 제어)
                      // 다른 섹션: CSS transition으로 페이드인
                      opacity: isFirstSection ? 0 : imagesReady ? 1 : 0,
                      transition: isFirstSection ? 'none' : 'opacity 0.5s ease-out',
                      willChange: isFirstSection ? 'transform, opacity' : 'opacity',
                      // 첫 번째 섹션: visibility로 초기 렌더링 방지
                      visibility: isFirstSection && !imagesReady ? 'hidden' : 'visible',
                    }
                  : undefined
              }>
              <ImageCard
                projectId={uniqueId}
                verticalSrc={assignment.verticalSrc}
                horizontalSrc={assignment.horizontalSrc}
                orientation={orientation}
                aspectRatio={aspectRatio}
                className="h-full w-full"
                enableHoverEffect={!isSelected && !isOtherSelected}
                clickDisabled={assignment.clickDisabled}
                distortionScale={distortionScale}
                radiusPx={radiusPx}
                blurStd={blurStd}
                easingFactor={easingFactor}
                onClickProject={(_pid, rect) => {
                  onSelectImage?.({
                    projectId: assignment.projectId,
                    projectSlug: assignment.projectSlug,
                    src,
                    orientation,
                    aspectRatio,
                    rect,
                    uniqueId,
                  });
                }}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}

// 메모이제이션으로 불필요한 리렌더링 방지
export default memo(HomeGallery);
