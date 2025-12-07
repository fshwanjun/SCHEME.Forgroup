/**
 * 프로젝트 페이지 갤러리 레이아웃 설정
 *
 * 각 문자열은 하나의 이미지 "프레임"을 나타내며,
 * 그리드 상의 위치 (row-start, col-start)와 크기 (col-span, row-span),
 * 그리고 가로/세로 비율 (aspect-[3/4] 또는 aspect-[4/3])을 정의합니다.
 *
 * 프로젝트 페이지는 홈 페이지와 다른 배치 형식을 사용합니다.
 */

// 데스크톱 화면용 프레임 클래스 배열 (16열 그리드 시스템)
// 프로젝트 페이지 전용 배치 - 홈 페이지와 다른 레이아웃
export const PROJECT_FRAME_CLASSES: string[] = [
  'frame-card aspect-[3/4] row-start-1 col-span-8 col-start-9',
  'frame-card aspect-[4/3] row-start-1 col-span-7 col-start-1 self-end mb-[20%]',
  'frame-card aspect-[4/3] row-start-2 col-span-11 col-start-2',
  'frame-card aspect-[3/4] row-start-3 col-span-5 col-start-1 ml-[8%]',
  'frame-card aspect-[3/4] row-start-3 col-span-8 col-start-8',
  'frame-card aspect-[3/4] row-start-4 col-span-6 col-start-2 self-end ',
  'frame-card aspect-[4/3] row-start-5 col-span-7 col-start-10 ',
  'frame-card aspect-[3/4] row-start-5 col-span-8 col-start-1 ',
  'frame-card aspect-[4/3] row-start-6 col-span-13 col-start-4',
  'frame-card aspect-[3/4] row-start-7 col-span-7 col-start-2',
  'frame-card aspect-[3/4] row-start-8 col-span-6 col-start-9 ',
  'frame-card aspect-[4/3] row-start-9 col-span-12 col-start-1',
  'frame-card aspect-[4/3] row-start-10 col-span-7 col-start-10',
  'frame-card aspect-[3/4] row-start-11 col-span-9 col-start-1',
];

// 모바일 화면용 프레임 클래스 배열 (11열 그리드 시스템)
// 프로젝트 페이지 전용 모바일 배치
export const PROJECT_MOBILE_FRAME_CLASSES: string[] = [
  'frame-card aspect-[3/4] row-start-1 col-span-12 col-start-1 mb-[10%]',
  'frame-card aspect-[3/4] row-start-2 col-span-8 col-start-1 mb-[15%]',
  'frame-card aspect-[4/3] row-start-3 col-span-11 col-start-3 mb-[6%]',
  'frame-card aspect-[3/4] row-start-4 col-span-8 col-start-1 mb-[30%]',
  'frame-card aspect-[4/3] row-start-5 col-span-9 col-start-5 mb-[20%]',
  'frame-card aspect-[4/3] row-start-6 col-span-13 col-start-1 mb-[30%]',
  'frame-card aspect-[3/4] row-start-7 col-span-11 col-start-3 mb-[35%]',
  'frame-card aspect-[3/4] row-start-8 col-span-11 col-start-1 mb-[30%]',
  'frame-card aspect-[3/4] row-start-9 col-span-9 col-start-5 mb-[25%]',
  'frame-card aspect-[4/3] row-start-10 col-span-12 col-start-1 mb-[25%]',
  'frame-card aspect-[4/3] row-start-11 col-span-9 col-start-5 mb-[20%]',
  'frame-card aspect-[3/4] row-start-12 col-span-8 col-start-1 mb-[30%]',
];

// 프로젝트 페이지 레이아웃 설정
export const PROJECT_LAYOUT_CONFIG = {
  desktop: {
    frameClasses: PROJECT_FRAME_CLASSES,
    gridCols: 16,
    gap: 50,
    horizontalPadding: 20,
  },
  mobile: {
    frameClasses: PROJECT_MOBILE_FRAME_CLASSES,
    gridCols: 13,
    gap: 26,
    horizontalPadding: 20,
  },
} as const;
