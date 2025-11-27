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
  defaultDistortionScale: 200,
  defaultRadiusPx: 400,
  defaultBlurStd: 4,
  defaultEasingFactor: 0.1,
  scaleMultiplier: 500,
  mouseMoveTimer: 100, // ms
  animation: {
    nearPosThreshold: 0.2,
    nearScaleThreshold: 0.5,
    minEasingFactor: 0.01,
    maxEasingFactor: 1,
  },
  canvas: {
    minSize: 64,
    maxSize: 128,
    minRadius: 6,
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

