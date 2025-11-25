'use client'; // 이 컴포넌트가 클라이언트 측에서 렌더링되어야 함을 나타냅니다. (React 18 이상)

import { useEffect, useMemo, useState } from 'react';
import ImageCard from '@/components/ImageCard'; // 이미지 카드 렌더링을 위한 컴포넌트입니다.
import useWindowSize from '@/hooks/useWindowSize';

// 프로젝트 이미지의 타입 정의
type ProjectImage = {
  projectId: string; // 프로젝트/이미지 ID
  verticalSrc: string; // 세로 방향 이미지 소스 경로 (aspect-[3/4] 프레임용)
  horizontalSrc: string; // 가로 방향 이미지 소스 경로 (aspect-[4/3] 프레임용)
};

export type GallerySelection = {
  projectId: string;
  src: string;
  orientation: 'vertical' | 'horizontal';
  aspectRatio: string;
  rect?: DOMRect;
};

// 갤러리 레이아웃을 정의하는 Tailwind CSS 클래스 배열입니다.
// 각 문자열은 하나의 이미지 "프레임"을 나타내며,
// 그리드 상의 위치 (row-start, col-start)와 크기 (col-span, row-span),
// 그리고 가로/세로 비율 (aspect-[3/4] 또는 aspect-[4/3])을 정의합니다.
const FRAME_CLASSES: string[] = [
  'frame-card aspect-[3/4] row-start-1 col-span-4 col-start-8 self-end',

  'frame-card aspect-[3/4] row-start-1 col-span-5 col-start-12',

  'frame-card aspect-[3/4] row-start-2 col-span-4 col-start-1',

  'frame-card aspect-[4/3] row-start-2 col-span-3 col-start-5',

  'frame-card aspect-[4/3] row-start-3 col-span-5 col-start-5',

  'frame-card aspect-[4/3] row-start-4 col-span-7 col-start-10',

  'frame-card aspect-[3/4] row-start-5 col-span-3 col-start-7',

  'frame-card aspect-[4/3] row-start-6 col-span-6 col-start-1',

  'frame-card aspect-[3/4] row-start-7 col-span-6 col-start-1',

  'frame-card aspect-[4/3] row-start-8 col-span-10 col-start-7',

  'frame-card aspect-[4/3] row-start-9 col-span-6 col-start-1',

  'frame-card aspect-[3/4] row-start-10 col-span-2 col-start-7',

  'frame-card aspect-[4/3] row-start-11 col-span-4 col-start-5',

  'frame-card aspect-[3/4] row-start-12 col-span-4 col-start-1',

  'frame-card aspect-[4/3] row-start-12 col-span-4 col-start-9',

  'frame-card aspect-[4/3] row-start-12 col-span-4 col-start-13 self-end',

  'frame-card aspect-[3/4] row-start-13 col-span-3 col-start-10',

  'frame-card aspect-[4/3] row-start-14 col-span-3 col-start-7',

  'frame-card aspect-[3/4] row-start-15 col-span-6 col-start-1',

  'frame-card aspect-[4/3] row-start-15 col-span-4 col-start-13 self-end',

  'frame-card aspect-[4/3] row-start-16 col-span-6 col-start-7',

  'frame-card aspect-[3/4] row-start-17 col-span-4 col-start-13 self-end',

  'frame-card aspect-[3/4] row-start-18 col-span-5 col-start-12',

  'frame-card aspect-[3/4] row-start-19 col-span-3 col-start-9',

  'frame-card aspect-[4/3] row-start-20 col-span-4 col-start-5',

  'frame-card aspect-[3/4] row-start-21 col-span-4 col-start-1',

  'frame-card aspect-[4/3] row-start-22 col-span-6 col-start-5',

  'frame-card aspect-[4/3] row-start-23 col-span-6 col-start-11',

  'frame-card aspect-[4/3] row-start-24 col-span-6 col-start-1',

  'frame-card aspect-[3/4] row-start-24 col-span-4 col-start-7',

  'frame-card aspect-[4/3] row-start-25 col-span-6 col-start-11',

  'frame-card aspect-[4/3] row-start-26 col-span-5 col-start-6',

  'frame-card aspect-[3/4] row-start-27 col-span-5 col-start-1',

  'frame-card aspect-[3/4] row-start-27 col-span-3 col-start-14',

  'frame-card aspect-[4/3] row-start-27 col-span-4 col-start-10 self-end',

  'frame-card aspect-[4/3] row-start-28 col-span-4 col-start-6',

  'frame-card aspect-[4/3] row-start-29 col-span-7 col-start-10',

  'frame-card aspect-[4/3] row-start-30 col-span-6 col-start-4',

  'frame-card aspect-[3/4] row-start-31 col-span-3 col-start-1',

  'frame-card aspect-[4/3] row-start-32 col-span-8 col-start-4',
];

// 모바일 화면용 프레임 클래스 배열 (폰 화면에서 사용)
// 11열 그리드 시스템 사용
// 나중에 반응형으로 사용할 수 있도록 export
export const MOBILE_FRAME_CLASSES: string[] = [
  'frame-card aspect-[3/4] row-start-1 col-span-7 col-start-5',
  'frame-card aspect-[3/4] row-start-2 col-span-4 col-start-1',
  'frame-card aspect-[4/3] row-start-3 col-span-7 col-start-1',
  'frame-card aspect-[3/4] row-start-4 col-span-4 col-start-8',
  'frame-card aspect-[3/4] row-start-5 col-span-4 col-start-1',
  'frame-card aspect-[3/4] row-start-5 col-span-3 col-start-5',
  'frame-card aspect-[4/3] row-start-6 col-span-7 col-start-5',
  'frame-card aspect-[3/4] row-start-7 col-span-4 col-start-1',
  'frame-card aspect-[3/4] row-start-8 col-span-4 col-start-5',
  'frame-card aspect-[4/3] row-start-9 col-span-8 col-start-1',
  'frame-card aspect-[3/4] row-start-10 col-span-3 col-start-9',
  'frame-card aspect-[3/4] row-start-11 col-span-5 col-start-4',
  'frame-card aspect-[4/3] row-start-12 col-span-3 col-start-1',
  'frame-card aspect-[4/3] row-start-13 col-span-7 col-start-1',
  'frame-card aspect-[4/3] row-start-14 col-span-4 col-start-8',

  'frame-card aspect-[3/4] row-start-15 col-span-4 col-start-4',
  'frame-card aspect-[3/4] row-start-16 col-span-3 col-start-1',
  'frame-card aspect-[4/3] row-start-17 col-span-3 col-start-1',

  'frame-card aspect-[3/4] row-start-17 col-span-5 col-start-4',
  'frame-card aspect-[3/4] row-start-18 col-span-3 col-start-9',
  'frame-card aspect-[4/3] row-start-19 col-span-8 col-start-1',
  'frame-card aspect-[4/3] row-start-20 col-span-4 col-start-1',
  'frame-card aspect-[3/4] row-start-21 col-span-4 col-start-6',
  'frame-card aspect-[4/3] row-start-22 col-span-6 col-start-6',
  'frame-card aspect-[3/4] row-start-23 col-span-5 col-start-1',
  'frame-card aspect-[3/4] row-start-24 col-span-3 col-start-6',
  'frame-card aspect-[4/3] row-start-25 col-span-6 col-start-6',
  'frame-card aspect-[3/4] row-start-26 col-span-5 col-start-1',
  'frame-card aspect-[3/4] row-start-27 col-span-3 col-start-6',
  'frame-card aspect-[4/3] row-start-28 col-span-6 col-start-6',
  'frame-card aspect-[4/3] row-start-29 col-span-5 col-start-1',
  'frame-card aspect-[3/4] row-start-30 col-span-5 col-start-1',
  'frame-card aspect-[4/3] row-start-31 col-span-6 col-start-6',
  'frame-card aspect-[3/4] row-start-32 col-span-5 col-start-1',
  'frame-card aspect-[4/3] row-start-33 col-span-6 col-start-6',
];

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
function getRowGroups(frameClasses: string[]): { rowFrames: number[][]; totalRows: number } {
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

type HomeGalleryProps = {
  images?: ProjectImage[]; // Landing Page Manager에서 가져온 이미지 목록
  onSelectImage?: (image: GallerySelection) => void;
  selectedProjectId?: string | null;
};

export default function HomeGallery({ images = [], onSelectImage, selectedProjectId }: HomeGalleryProps) {
  // 화면 크기 감지
  const windowSize = useWindowSize();
  const isMobile = windowSize.isSm; // 768px 미만이면 모바일

  // 모바일 여부에 따라 사용할 프레임 클래스 선택
  const currentFrameClasses = useMemo(() => (isMobile ? MOBILE_FRAME_CLASSES : FRAME_CLASSES), [isMobile]);

  // 모바일 여부에 따라 gap 설정
  const gap = useMemo(() => (isMobile ? 10 : 20), [isMobile]);

  // 모바일 여부에 따라 좌우 여백 설정
  const horizontalPadding = useMemo(() => (isMobile ? 10 : 20), [isMobile]);

  // 🌟 수정: 건너뛸 행의 개수를 저장하는 상태입니다.
  const [skipRows, setSkipRows] = useState(0);

  // 🌟 추가: 행 그룹 정보 계산 (현재 사용 중인 프레임 클래스 기준)
  // 모든 hooks는 항상 같은 순서로 호출되어야 함
  const { rowFrames, totalRows } = useMemo(() => getRowGroups(currentFrameClasses), [currentFrameClasses]);

  // images를 메모이제이션하여 dependency 문제 해결
  const PROJECT_IMAGES: ProjectImage[] = useMemo(() => images || [], [images]);
  const projectCount = PROJECT_IMAGES.length;
  const totalFrames = currentFrameClasses.length;

  // 🌟 수정: 컴포넌트가 처음 마운트될 때 건너뛸 '행'의 개수를 계산합니다.
  useEffect(() => {
    // 최대 건너뛸 행 개수: 전체 행의 1/3 (예시) 또는 원하는 임의의 최대값
    // 여기서는 전체 행의 절반 정도까지만 건너뛰도록 제한합니다.
    const maxSkipRows = Math.floor(totalRows / 2);

    // 0부터 maxSkipRows 사이의 난수를 생성합니다.
    const randomSkip = Math.floor(Math.random() * maxSkipRows);

    setSkipRows(randomSkip);
  }, [totalRows]); // totalRows가 변경되면 다시 계산합니다 (단, 이 값은 고정되어 있으므로 마운트 시 한 번만 실행됨)

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

  // 프로젝트 할당 로직은 그대로 유지하되, 건너뛸 프레임 인덱스를 사용하지 않으므로,
  // 할당 로직 자체는 변경되지 않고 렌더링 시에만 건너뛰기를 적용합니다.
  const projectAssignments = useMemo(() => {
    if (projectCount === 0 || totalFrames === 0) return [];
    const assignments: ProjectImage[] = [];
    const shuffleCache: ProjectImage[][] = [];

    // FRAME_CLASSES 배열의 길이에 맞춰 이미지를 할당합니다. (할당 순서는 건너뛰기와 무관하게 결정)
    for (let index = 0; index < totalFrames; index++) {
      const cycle = Math.floor(index / projectCount);
      const withinCycle = index % projectCount;

      if (cycle === 0) {
        const img = PROJECT_IMAGES[withinCycle];
        if (img && img.verticalSrc && img.horizontalSrc) {
          assignments.push(img);
        } else {
          // 이미지가 없으면 빈 객체를 push하지 않고 null을 push하여 나중에 필터링
          assignments.push(null as unknown as ProjectImage);
        }
      } else {
        if (!shuffleCache[cycle]) {
          shuffleCache[cycle] = shuffleWithSeed(PROJECT_IMAGES, cycle);
        }
        const img = shuffleCache[cycle][withinCycle];
        if (img && img.verticalSrc && img.horizontalSrc) {
          assignments.push(img);
        } else {
          assignments.push(null as unknown as ProjectImage);
        }
      }
    }
    return assignments;
  }, [projectCount, totalFrames, PROJECT_IMAGES]); // PROJECT_IMAGES를 dependency로 사용

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
        className={`grid w-full ${isMobile ? 'grid-cols-[repeat(11,minmax(0,1fr))]' : 'grid-cols-16'}`}
        style={{
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

          const orientation = frameClass.includes('aspect-[3/4]') ? 'vertical' : 'horizontal';
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
              }`}>
              <ImageCard
                projectId={assignment.projectId}
                verticalSrc={assignment.verticalSrc}
                horizontalSrc={assignment.horizontalSrc}
                orientation={orientation}
                aspectRatio={aspectRatio}
                className="h-full w-full"
                enableHoverEffect={!isSelected && !isOtherSelected}
                onClickProject={(_pid, rect) =>
                  onSelectImage?.({
                    projectId: assignment.projectId,
                    src,
                    orientation,
                    aspectRatio,
                    rect,
                  })
                }
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
