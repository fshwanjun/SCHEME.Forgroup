'use client';

import { useEffect, useState, useRef } from 'react';
import Lottie, { type LottieRefCurrentProps } from 'lottie-react';

// Lottie 애니메이션 데이터를 전역적으로 캐싱하여 재로드 방지
const lottieCache = new Map<string, any>();

export default function LogoInline({
  src = '/for30.json',
  playTrigger,
}: {
  src?: string;
  width?: number;
  height?: number;
  playTrigger?: number | string;
}) {
  const [animationData, setAnimationData] = useState<any>(() => lottieCache.get(src) || null);
  const lottieRef = useRef<LottieRefCurrentProps>(null);
  const prevPlayTriggerRef = useRef<number | string | undefined>(undefined);
  const hasTriggeredRef = useRef(false);

  // 컴포넌트가 마운트될 때 ref 초기화 (src가 변경되면 리셋)
  useEffect(() => {
    console.log('[LogoInline] 컴포넌트 마운트 또는 src 변경:', src);
    // src가 변경될 때만 리셋, playTrigger 변경 시에는 리셋하지 않음
    prevPlayTriggerRef.current = undefined;
    hasTriggeredRef.current = false;
  }, [src]);

  // playTrigger가 변경될 때 hasTriggeredRef 리셋 (새로운 트리거 허용)
  useEffect(() => {
    if (playTrigger !== undefined && prevPlayTriggerRef.current !== playTrigger) {
      console.log('[LogoInline] playTrigger 변경 감지 - hasTriggeredRef 리셋');
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
      .catch((error) => {
        console.error('[LogoInline] Lottie 파일 로드 실패:', error);
      });
    return () => {
      active = false;
    };
  }, [src]);

  // playTrigger가 변경되면 Lottie 애니메이션 재시작
  useEffect(() => {
    console.log('[LogoInline] playTrigger 변경 감지:', {
      playTrigger,
      prevPlayTrigger: prevPlayTriggerRef.current,
      animationData: !!animationData,
      src,
      hasTriggered: hasTriggeredRef.current,
      lottieRefExists: !!lottieRef.current,
    });

    // playTrigger가 undefined이거나 animationData가 없으면 실행하지 않음
    if (playTrigger === undefined || !animationData) {
      if (playTrigger === undefined) {
        console.log('[LogoInline] playTrigger가 undefined이므로 애니메이션 재시작하지 않음');
      } else if (!animationData) {
        console.log('[LogoInline] animationData가 없으므로 애니메이션 재시작하지 않음');
      }
      prevPlayTriggerRef.current = playTrigger;
      return;
    }

    // 이전 값과 비교하여 실제로 변경되었는지 확인
    // undefined에서 숫자로 변경될 때만 실행 (한 번만 실행)
    if (prevPlayTriggerRef.current === playTrigger) {
      console.log('[LogoInline] playTrigger 값이 변경되지 않았으므로 애니메이션 재시작하지 않음');
      return;
    }

    // 이미 트리거되었고, 같은 값이면 실행하지 않음
    if (hasTriggeredRef.current && prevPlayTriggerRef.current !== undefined) {
      console.log('[LogoInline] 이미 애니메이션이 트리거되었으므로 재시작하지 않음');
      prevPlayTriggerRef.current = playTrigger;
      return;
    }

    console.log(
      '[LogoInline] Lottie 애니메이션 재시작 시작 - playTrigger:',
      playTrigger,
      '(이전:',
      prevPlayTriggerRef.current,
      ')',
    );
    hasTriggeredRef.current = true;
    prevPlayTriggerRef.current = playTrigger;

    // DOM이 업데이트된 후에 애니메이션을 재시작하기 위해 다음 프레임에 실행
    const attemptPlay = (retryCount = 0) => {
      if (!lottieRef.current) {
        if (retryCount < 10) {
          // 최대 10번까지 재시도 (약 1초)
          console.log(`[LogoInline] Lottie ref가 없음 - 재시도 ${retryCount + 1}/10`);
          setTimeout(() => attemptPlay(retryCount + 1), 100);
        } else {
          console.error('[LogoInline] Lottie ref를 찾을 수 없음 - 최대 재시도 횟수 초과');
        }
        return;
      }

      triggerAnimation();
    };

    const timeoutId = setTimeout(() => {
      attemptPlay();
    }, 50);

    const triggerAnimation = () => {
      if (!lottieRef.current) {
        console.error('[LogoInline] Lottie ref가 없음');
        return;
      }

      console.log('[LogoInline] Lottie 애니메이션을 0 프레임부터 재시작');
      console.log('[LogoInline] Lottie ref 메서드 확인:', {
        hasPlay: typeof lottieRef.current.play === 'function',
        hasPause: typeof lottieRef.current.pause === 'function',
        hasStop: typeof lottieRef.current.stop === 'function',
        hasGoToAndStop: 'goToAndStop' in lottieRef.current,
        hasGoToAndPlay: 'goToAndPlay' in lottieRef.current,
        refKeys: Object.keys(lottieRef.current),
      });

      // Lottie 애니메이션을 처음부터 재생
      try {
        // 먼저 정지
        if (lottieRef.current.pause) {
          lottieRef.current.pause();
          console.log('[LogoInline] pause() 호출 완료');
        }

        // 0 프레임으로 이동하고 재생
        // lottie-react의 ref는 내부 animation 인스턴스를 가지고 있음
        if ('goToAndStop' in lottieRef.current && typeof (lottieRef.current as any).goToAndStop === 'function') {
          // goToAndStop으로 0 프레임으로 이동
          (lottieRef.current as any).goToAndStop(0, true);
          console.log('[LogoInline] goToAndStop(0) 호출 완료');

          // 다음 프레임에서 재생
          requestAnimationFrame(() => {
            if (lottieRef.current?.play) {
              lottieRef.current.play();
              console.log('[LogoInline] play() 호출 완료 - goToAndStop 후');
            }
          });
        } else if ('goToAndPlay' in lottieRef.current && typeof (lottieRef.current as any).goToAndPlay === 'function') {
          // goToAndPlay가 있으면 직접 사용
          (lottieRef.current as any).goToAndPlay(0, true);
          console.log('[LogoInline] goToAndPlay(0) 호출 완료');
        } else {
          // 기본 방법: stop 후 play
          if (lottieRef.current.stop) {
            lottieRef.current.stop();
            console.log('[LogoInline] stop() 호출 완료');
          }

          // 약간의 딜레이 후 재생 (0 프레임으로 확실히 이동)
          setTimeout(() => {
            if (lottieRef.current?.play) {
              lottieRef.current.play();
              console.log('[LogoInline] play() 호출 완료 - stop 후');
            }
          }, 50);
        }

        console.log('[LogoInline] Lottie 애니메이션 재시작 완료 (0 프레임부터)');
      } catch (e) {
        console.error('[LogoInline] Lottie 애니메이션 재시작 실패:', e);
        // fallback: stop 후 play
        try {
          if (lottieRef.current?.stop) {
            lottieRef.current.stop();
          }
          setTimeout(() => {
            if (lottieRef.current?.play) {
              lottieRef.current.play();
              console.log('[LogoInline] fallback play() 호출 완료');
            }
          }, 50);
        } catch (fallbackError) {
          console.error('[LogoInline] Lottie 애니메이션 재시작 fallback 실패:', fallbackError);
        }
      }
    };

    return () => {
      clearTimeout(timeoutId);
    };
  }, [playTrigger, animationData, src]);

  // playTrigger가 없으면 자동 재생 (IntroLogo용)
  useEffect(() => {
    if (playTrigger === undefined && animationData && lottieRef.current) {
      console.log('[LogoInline] playTrigger가 없으므로 자동 재생 시작 (IntroLogo용)');
      const timeoutId = setTimeout(() => {
        if (lottieRef.current?.play) {
          lottieRef.current.play();
          console.log('[LogoInline] 자동 재생 시작 완료');
        }
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [playTrigger, animationData]);

  // 애니메이션이 로드되고 playTrigger가 설정되면 즉시 재생 시도
  useEffect(() => {
    if (playTrigger !== undefined && animationData && lottieRef.current) {
      console.log('[LogoInline] 애니메이션 로드 완료, playTrigger 설정됨 - 즉시 재생 시도');
      const timeoutId = setTimeout(() => {
        if (lottieRef.current) {
          try {
            if (lottieRef.current.pause) {
              lottieRef.current.pause();
            }
            if ('goToAndStop' in lottieRef.current && typeof (lottieRef.current as any).goToAndStop === 'function') {
              (lottieRef.current as any).goToAndStop(0, true);
              if (lottieRef.current.play) {
                lottieRef.current.play();
                console.log('[LogoInline] 즉시 재생 성공');
              }
            } else if (lottieRef.current.stop && lottieRef.current.play) {
              lottieRef.current.stop();
              setTimeout(() => {
                if (lottieRef.current?.play) {
                  lottieRef.current.play();
                  console.log('[LogoInline] 즉시 재생 성공 (fallback)');
                }
              }, 50);
            }
          } catch (e) {
            console.error('[LogoInline] 즉시 재생 실패:', e);
          }
        }
      }, 100);
      return () => clearTimeout(timeoutId);
    }
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
          filter: playTrigger !== undefined ? 'brightness(0) invert(1)' : 'none', // 헤더에서만 검정색을 흰색으로 변환
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
