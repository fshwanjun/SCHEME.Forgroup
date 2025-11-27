'use client';

import { useEffect, useState, useRef } from 'react';
import Lottie, { type LottieRefCurrentProps } from 'lottie-react';
import { LOGO_CONFIG } from '@/config/appConfig';

// Lottie 애니메이션 데이터를 전역적으로 캐싱하여 재로드 방지
const lottieCache = new Map<string, any>();

export default function LogoInline({
  src = LOGO_CONFIG.defaultSrc,
  playTrigger,
  invert = false,
}: {
  src?: string;
  width?: number;
  height?: number;
  playTrigger?: number | string;
  invert?: boolean;
}) {
  const [animationData, setAnimationData] = useState<any>(() => lottieCache.get(src) || null);
  const lottieRef = useRef<LottieRefCurrentProps>(null);
  const prevPlayTriggerRef = useRef<number | string | undefined>(undefined);
  const hasTriggeredRef = useRef(false);
  const retryTimeoutRef = useRef<number | null>(null);
  const animationTimeoutRef = useRef<number | null>(null);
  const fallbackTimeoutRef = useRef<number | null>(null);

  // 컴포넌트가 마운트될 때 ref 초기화 (src가 변경되면 리셋)
  useEffect(() => {
    // src가 변경될 때만 리셋, playTrigger 변경 시에는 리셋하지 않음
    prevPlayTriggerRef.current = undefined;
    hasTriggeredRef.current = false;
  }, [src]);

  // playTrigger가 변경될 때 hasTriggeredRef 리셋 (새로운 트리거 허용)
  useEffect(() => {
    if (playTrigger !== undefined && prevPlayTriggerRef.current !== playTrigger) {
      hasTriggeredRef.current = false;
    }
  }, [playTrigger]);

  // Lottie JSON 파일 로드
  useEffect(() => {
    // 이미 캐시에 있으면 다시 로드하지 않음
    const cached = lottieCache.get(src);
    if (cached) {
      setAnimationData(cached);
      return;
    }

    // 캐시에 없으면 로드
    let active = true;
    fetch(src, { cache: 'force-cache' })
      .then((r) => r.json())
      .then((data) => {
        if (!active) return;
        lottieCache.set(src, data);
        setAnimationData(data);
      })
      .catch(() => {
        // Lottie 파일 로드 실패 시 무시
      });
    return () => {
      active = false;
    };
  }, [src]);

  // 애니메이션 제어 통합 로직
  useEffect(() => {
    if (!animationData || !lottieRef.current) {
      return;
    }

    // playTrigger가 undefined인 경우: 자동 재생 (IntroLogo용)
    if (playTrigger === undefined) {
      const timeoutId = setTimeout(() => {
        if (lottieRef.current?.play) {
          lottieRef.current.play();
        }
      }, LOGO_CONFIG.animation.autoplayDelay);
      return () => clearTimeout(timeoutId);
    }

    // playTrigger가 설정된 경우: 0 프레임부터 재시작 (Header용)
    // 이전 값과 비교하여 실제로 변경되었는지 확인
    if (prevPlayTriggerRef.current === playTrigger) {
      return;
    }

    // 이미 트리거되었고, 같은 값이면 실행하지 않음
    if (hasTriggeredRef.current && prevPlayTriggerRef.current !== undefined) {
      prevPlayTriggerRef.current = playTrigger;
      return;
    }

    hasTriggeredRef.current = true;
    prevPlayTriggerRef.current = playTrigger;

    // DOM이 업데이트된 후에 애니메이션을 재시작하기 위해 다음 프레임에 실행
    const attemptPlay = (retryCount = 0) => {
      if (!lottieRef.current) {
        if (retryCount < LOGO_CONFIG.retry.maxAttempts) {
          retryTimeoutRef.current = window.setTimeout(() => attemptPlay(retryCount + 1), LOGO_CONFIG.retry.interval);
        }
        return;
      }

      triggerAnimation();
    };

    const timeoutId = window.setTimeout(() => {
      attemptPlay();
    }, LOGO_CONFIG.animation.startDelay);

    const triggerAnimation = () => {
      if (!lottieRef.current) {
        return;
      }

      // Lottie 애니메이션을 처음부터 재생
      try {
        // 먼저 정지
        if (lottieRef.current.pause) {
          lottieRef.current.pause();
        }

        // 0 프레임으로 이동하고 재생
        if ('goToAndStop' in lottieRef.current && typeof (lottieRef.current as any).goToAndStop === 'function') {
          // goToAndStop으로 0 프레임으로 이동
          (lottieRef.current as any).goToAndStop(0, true);

          // 다음 프레임에서 재생
          requestAnimationFrame(() => {
            if (lottieRef.current?.play) {
              lottieRef.current.play();
            }
          });
        } else if ('goToAndPlay' in lottieRef.current && typeof (lottieRef.current as any).goToAndPlay === 'function') {
          // goToAndPlay가 있으면 직접 사용
          (lottieRef.current as any).goToAndPlay(0, true);
        } else {
          // 기본 방법: stop 후 play
          if (lottieRef.current.stop) {
            lottieRef.current.stop();
          }

          // 약간의 딜레이 후 재생 (0 프레임으로 확실히 이동)
          animationTimeoutRef.current = window.setTimeout(() => {
            if (lottieRef.current?.play) {
              lottieRef.current.play();
            }
            animationTimeoutRef.current = null;
          }, LOGO_CONFIG.animation.fallbackDelay);
        }
      } catch (e) {
        // fallback: stop 후 play
        try {
          if (lottieRef.current?.stop) {
            lottieRef.current.stop();
          }
          fallbackTimeoutRef.current = window.setTimeout(() => {
            if (lottieRef.current?.play) {
              lottieRef.current.play();
            }
            fallbackTimeoutRef.current = null;
          }, LOGO_CONFIG.animation.fallbackDelay);
        } catch (fallbackError) {
          // 에러 무시
        }
      }
    };

    return () => {
      window.clearTimeout(timeoutId);
      if (retryTimeoutRef.current !== null) {
        window.clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      if (animationTimeoutRef.current !== null) {
        window.clearTimeout(animationTimeoutRef.current);
        animationTimeoutRef.current = null;
      }
      if (fallbackTimeoutRef.current !== null) {
        window.clearTimeout(fallbackTimeoutRef.current);
        fallbackTimeoutRef.current = null;
      }
    };
  }, [playTrigger, animationData]);

  if (!animationData) {
    return (
      <div
        className="logo-inline flex items-center justify-center overflow-hidden"
        aria-label="SCHEME.Forgroup logo"
        role="img"
        data-logo-inline={src}
        suppressHydrationWarning></div>
    );
  }

  return (
    <div
      className="logo-inline flex h-full w-full items-center justify-center overflow-hidden"
      aria-label="SCHEME.Forgroup logo"
      role="img"
      data-logo-inline={src}
      suppressHydrationWarning>
      <div
        className="h-full w-full"
        style={{
          filter: invert ? 'brightness(0) invert(1)' : 'none', // invert prop에 따라 검정색을 흰색으로 변환
        }}>
        <Lottie
          lottieRef={lottieRef}
          animationData={animationData}
          loop={playTrigger !== undefined ? true : false} // 헤더에서만 반복 재생
          autoplay={playTrigger === undefined ? true : false}
        />
      </div>
    </div>
  );
}
