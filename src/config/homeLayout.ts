/**
 * 홈 페이지 갤러리 레이아웃 설정
 *
 * 각 문자열은 하나의 이미지 "프레임"을 나타내며,
 * 그리드 상의 위치 (row-start, col-start)와 크기 (col-span, row-span),
 * 그리고 가로/세로 비율 (aspect-[3/4] 또는 aspect-[4/3])을 정의합니다.
 */

// 데스크톱 화면용 프레임 클래스 배열 (16열 그리드 시스템)
export const HOME_FRAME_CLASSES: string[] = [
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

// 모바일 화면용 프레임 클래스 배열 (11열 그리드 시스템)
export const HOME_MOBILE_FRAME_CLASSES: string[] = [
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

// 홈 페이지 레이아웃 설정
export const HOME_LAYOUT_CONFIG = {
  desktop: {
    frameClasses: HOME_FRAME_CLASSES,
    gridCols: 16,
    gap: 20,
    horizontalPadding: 20,
  },
  mobile: {
    frameClasses: HOME_MOBILE_FRAME_CLASSES,
    gridCols: 11,
    gap: 10,
    horizontalPadding: 10,
  },
} as const;
