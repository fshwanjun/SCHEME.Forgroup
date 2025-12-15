/**
 * Distort 효과 설정 파일
 *
 * 각 페이지별로 다른 distort 효과를 적용할 수 있습니다.
 * 모든 값은 이미지 대각선 길이에 비례하여 적용됩니다.
 */

export interface DistortConfig {
  /** 대각선 비율 기반 왜곡 강도 (1.65 = 대각선의 165%) */
  distortionScale: number;
  /** 대각선 대비 반경 비율 (0.29 = 대각선의 29%) */
  radiusPercent: number;
  /** 대각선 비율 기반 블러 (0.15 = 대각선의 15%) */
  blurStd: number;
  /** 이징 팩터 - 애니메이션 부드러움 (0.08, 낮을수록 부드러움) */
  easingFactor: number;
}

/** 홈 페이지 distort 설정 (기본값) */
export const HOME_DISTORT_CONFIG: DistortConfig = {
  distortionScale: 1.65,
  radiusPercent: 0.29,
  blurStd: 0.15,
  easingFactor: 0.08,
};

/** Test1 페이지 distort 설정 */
export const TEST1_DISTORT_CONFIG: DistortConfig = {
  distortionScale: 1.65,
  radiusPercent: 0.29,
  blurStd: 0.15,
  easingFactor: 0.08,
};

/** Test2 페이지 distort 설정 */
export const TEST2_DISTORT_CONFIG: DistortConfig = {
  distortionScale: 1.65,
  radiusPercent: 0.29,
  blurStd: 0.15,
  easingFactor: 0.04,
};

/** 프로젝트 페이지 distort 설정 */
export const PROJECT_DISTORT_CONFIG: DistortConfig = {
  distortionScale: 1.65,
  radiusPercent: 0.29,
  blurStd: 0.15,
  easingFactor: 0.08,
};
