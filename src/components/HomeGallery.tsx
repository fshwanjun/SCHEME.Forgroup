'use client'; // 이 컴포넌트가 클라이언트 측에서 렌더링되어야 함을 나타냅니다. (React 18 이상)

import { useEffect, useMemo, useState, memo, useCallback } from 'react';
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
};

export type GallerySelection = {
  projectId: string;
  projectSlug?: string; // 프로젝트 상세 페이지 링크 (선택적)
  src: string;
  orientation: 'vertical' | 'horizontal';
  aspectRatio: string;
  rect?: DOMRect;
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
  layoutConfig?: LayoutConfig; // 레이아웃 설정 (기본값: HOME_LAYOUT_CONFIG)
};

function HomeGallery({
  images = [],
  onSelectImage,
  selectedProjectId,
  layoutConfig = HOME_LAYOUT_CONFIG,
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

  // 프로젝트 레이아웃에서 이미지가 준비되면 애니메이션 트리거
  useEffect(() => {
    if (isProjectLayout && mounted && projectCount > 0) {
      // DOM이 준비될 때까지 약간의 지연
      const timer = setTimeout(() => {
        setImagesReady(true);
      }, 100);
      return () => clearTimeout(timer);
    } else if (!isProjectLayout) {
      // 홈 레이아웃에서는 즉시 표시
      setImagesReady(true);
    }
  }, [isProjectLayout, mounted, projectCount]);

  // 🌟 수정: 컴포넌트가 처음 마운트될 때 건너뛸 '행'의 개수를 계산합니다.
  // 프로젝트와 홈 모두 랜덤 행 건너뛰기 적용
  useEffect(() => {
    // 최대 건너뛸 행 개수: 전체 행의 절반 정도까지만 건너뛰도록 제한합니다.
    const maxSkipRows = Math.max(0, Math.floor(totalRows / 2));

    // 0부터 maxSkipRows 사이의 난수를 생성합니다.
    const randomSkip = maxSkipRows > 0 ? Math.floor(Math.random() * (maxSkipRows + 1)) : 0;

    setSkipRows(randomSkip);
  }, [totalRows]); // totalRows가 변경되면 다시 계산합니다

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
    const verticalImages: ProjectImage[] = [];
    const horizontalImages: ProjectImage[] = [];
    
    PROJECT_IMAGES.forEach((img) => {
      if (img && img.verticalSrc && img.horizontalSrc) {
        if (img.orientation === 'vertical') {
          verticalImages.push(img);
        } else if (img.orientation === 'horizontal') {
          horizontalImages.push(img);
        } else {
          // orientation이 없으면 둘 다에 추가 (하지만 실제로는 사용하지 않음)
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
      className="HomeGallery relative mb-[20px] w-full"
      style={{ paddingLeft: horizontalPadding, paddingRight: horizontalPadding }}>
      <div
        className="grid w-full"
        style={{
          gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`,
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

          // 이미지의 orientation이 설정되어 있으면 그것을 사용, 없으면 틀의 orientation 사용
          const imageOrientation = assignment.orientation || frameOrientation;

          // 이미지의 orientation과 틀의 orientation이 일치하는지 확인
          // 일치하지 않으면 렌더링하지 않음 (다른 틀에서 렌더링됨)
          if (imageOrientation !== frameOrientation) {
            return null;
          }

          const orientation = imageOrientation;
          const aspectRatio = orientation === 'vertical' ? '3 / 4' : '4 / 3';
          const src = orientation === 'vertical' ? assignment.verticalSrc : assignment.horizontalSrc;
          const isSelected = selectedProjectId != null && assignment.projectId === selectedProjectId;
          const isOtherSelected = selectedProjectId != null && !isSelected;

          return (
            <div
              // 🌟 중요: 건너뛴 행의 개수만큼 row-start 값을 조정하여
              // 갤러리가 시작 행에서부터 자연스럽게 이어지도록 합니다.
              key={`${frameClass}-${index}`}
              className={`${frameClass.replace(
                /row-start-(\d+)/,
                (_, p1) => `row-start-${parseInt(p1, 10) - skipRows}`,
              )} relative transition-transform duration-500 ${isSelected ? 'z-50' : ''} ${
                isOtherSelected ? 'pointer-events-none' : ''
              }`}
              style={
                isProjectLayout
                  ? {
                      opacity: imagesReady ? 1 : 0,
                      transition: 'opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
                    }
                  : undefined
              }>
              <ImageCard
                projectId={assignment.projectId}
                verticalSrc={assignment.verticalSrc}
                horizontalSrc={assignment.horizontalSrc}
                orientation={orientation}
                aspectRatio={aspectRatio}
                className="h-full w-full"
                enableHoverEffect={!isSelected && !isOtherSelected}
                onClickProject={(_pid, rect) => {
                  onSelectImage?.({
                    projectId: assignment.projectId,
                    projectSlug: assignment.projectSlug,
                    src,
                    orientation,
                    aspectRatio,
                    rect,
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
