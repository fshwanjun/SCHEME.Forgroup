/**
 * Distort 효과 설정 파일
 *
 * 각 페이지별로 다른 distort 효과를 적용할 수 있습니다.
 */

export interface DistortConfig {
  /** 왜곡 최대 강도 (기본값: 500, 낮을수록 약함) */
  distortionScale: number;
  /** 왜곡 반경 픽셀 (기본값: 400) */
  radiusPx: number;
  /** 블러 강도 (기본값: 80) */
  blurStd: number;
  /** 이징 팩터 - 애니메이션 부드러움 (기본값: 0.08, 낮을수록 부드러움) */
  easingFactor: number;
}

/** 홈 페이지 distort 설정 (기본값) */
export const HOME_DISTORT_CONFIG: DistortConfig = {
  distortionScale: 200,
  radiusPx: 300,
  blurStd: 80,
  easingFactor: 0.08,
};

/** Test1 페이지 distort 설정 (홈보다 조금 약함) */
export const TEST1_DISTORT_CONFIG: DistortConfig = {
  distortionScale: 200,
  radiusPx: 300,
  blurStd: 80,
  easingFactor: 0.08,
};

/** Test2 페이지 distort 설정 (test1보다 더 약함) */
export const TEST2_DISTORT_CONFIG: DistortConfig = {
  distortionScale: 500,
  radiusPx: 300,
  blurStd: 80,
  easingFactor: 0.04,
};

/** 프로젝트 페이지 distort 설정 */
export const PROJECT_DISTORT_CONFIG: DistortConfig = {
  distortionScale: 500,
  radiusPx: 400,
  blurStd: 80,
  easingFactor: 0.08,
};
