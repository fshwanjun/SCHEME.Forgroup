/**
 * 애플리케이션 전역 설정 값
 */

// ===== LogoInline 설정 =====
export const LOGO_CONFIG = {
  defaultSrc: '/for30.json',
  retry: {
    maxAttempts: 5,
    interval: 50, // ms
  },
  animation: {
    autoplayDelay: 100, // ms (IntroLogo용)
    startDelay: 50, // ms (Header용)
    fallbackDelay: 50, // ms
  },
} as const;

// ===== IntroLogo 설정 =====
export const INTRO_LOGO_CONFIG = {
  defaultDuration: 8000, // ms
  logoExitDuration: 600, // ms
  overlayFadeDuration: 1500, // ms
} as const;

// ===== HoverDistortImage 설정 =====
export const HOVER_DISTORT_CONFIG = {
  // 비례 기반 설정 (이미지 대각선 기준)
  baseDiagonal: 1000, // 기준 대각선 길이 (px)
  defaultRadiusPercent: 0.29, // 대각선의 29%를 반경으로 사용
  defaultDistortionScale: 1.65, // 대각선 비율 기반 왜곡 강도 (1.65 = 대각선의 165%)
  defaultBlurStd: 0.15, // 대각선 비율 기반 블러 (0.15 = 대각선의 15%)
  defaultEasingFactor: 0.08,
  scaleMultiplier: 0.4, // 대각선 비율 기반 스케일 배율
  mouseMoveTimer: 100, // ms
  // 필터 영역 확장 (잘림 방지)
  filterExpand: 0.2, // 필터 영역을 20% 확장
  animation: {
    nearPosThreshold: 0.2,
    nearScaleThreshold: 0.5,
    minEasingFactor: 0.01,
    maxEasingFactor: 1,
  },
  canvas: {
    minSize: 64,
    maxSize: 256,
    minRadius: 12,
    devicePixelRatioLimit: 2,
  },
} as const;

// ===== ImageCard 설정 =====
export const IMAGE_CARD_CONFIG = {
  vertical: {
    width: 900,
    height: 1200,
    aspectRatio: '3 / 4',
  },
  horizontal: {
    width: 1200,
    height: 900,
    aspectRatio: '4 / 3',
  },
} as const;

// ===== Header 설정 =====
export const HEADER_CONFIG = {
  zIndex: {
    detailPage: 400,
    projectOrStudio: 50,
    default: 350,
  },
  logo: {
    mobileWidth: 160,
    desktopWidth: 300,
  },
} as const;

// ===== ProjectDetailContent 설정 =====
export const PROJECT_DETAIL_CONFIG = {
  animation: {
    duration: 0.6,
    delay: 0.8,
    ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
  },
  image: {
    maxHeight: '90vh',
  },
} as const;

// ===== MobileMenu 설정 =====
export const MOBILE_MENU_CONFIG = {
  zIndex: {
    button: 400,
    menu: 300,
  },
  logo: {
    height: 80,
    width: 200,
  },
} as const;

// ===== 기타 설정 =====
export const APP_CONFIG = {
  defaultAspectRatios: {
    vertical: '3 / 4',
    horizontal: '4 / 3',
  },
} as const;
