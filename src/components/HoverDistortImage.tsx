'use client';

import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { HOVER_DISTORT_CONFIG } from '@/config/appConfig';
import useWindowSize from '@/hooks/useWindowSize';

export default function HoverDistortImage({
  src,
  alt = '',
  className,
  aspectRatio,
  distortionScale = HOVER_DISTORT_CONFIG.defaultDistortionScale,
  radiusPx = HOVER_DISTORT_CONFIG.defaultRadiusPx,
  blurStd = HOVER_DISTORT_CONFIG.defaultBlurStd,
  preserveAspect = 'xMaxYMax',
  distortionEnabled = true,
  easingFactor = HOVER_DISTORT_CONFIG.defaultEasingFactor,
}: {
  src: string;
  alt?: string;
  className?: string;
  aspectRatio?: string; // e.g. "3 / 4"
  distortionScale?: number;
  radiusPx?: number;
  blurStd?: number;
  preserveAspect?:
    | 'none'
    | 'xMinYMin'
    | 'xMidYMin'
    | 'xMaxYMin'
    | 'xMinYMid'
    | 'xMidYMid'
    | 'xMaxYMid'
    | 'xMinYMax'
    | 'xMidYMax'
    | 'xMaxYMax'
    | 'xMinYMin slice'
    | 'xMidYMin slice'
    | 'xMaxYMin slice'
    | 'xMinYMid slice'
    | 'xMidYMid slice'
    | 'xMaxYMid slice'
    | 'xMinYMax slice'
    | 'xMidYMax slice'
    | 'xMaxYMax slice';
  distortionEnabled?: boolean;
  easingFactor?: number;
}) {
  const windowSize = useWindowSize();
  const [mounted, setMounted] = useState(false);
  const [isSafari, setIsSafari] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  // 모바일에서는 distortion 효과 비활성화
  const isMobile = mounted && windowSize.isSm;
  // Safari에서는 SVG feImage + data URL 버그로 인해 displacement map 효과 비활성화
  const actualDistortionEnabled = distortionEnabled && !isMobile && !isSafari;
  // Safari 전용 CSS 기반 폴백 호버 효과
  const useSafariFallback = mounted && distortionEnabled && !isMobile && isSafari;

  useEffect(() => {
    setMounted(true);
    // Safari 감지 (Chrome, Edge 등 WebKit 기반 브라우저 제외)
    if (typeof navigator !== 'undefined') {
      const ua = navigator.userAgent;
      setIsSafari(/^((?!chrome|android).)*safari/i.test(ua));
    }
  }, []);

  const id = useId().replace(/:/g, '-');
  const filterId = `hover-distort-${id}`;
  const maskFilterId = `hover-distort-mask-filter-${id}`;
  const maskId = `hover-distort-mask-${id}`;

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const feImageRef = useRef<SVGFEImageElement | null>(null);
  const feDispRef = useRef<SVGFEDisplacementMapElement | null>(null);
  const maskFeImageRef = useRef<SVGFEImageElement | null>(null);
  const maskFeDispRef = useRef<SVGFEDisplacementMapElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const elemSizeRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 });
  const animRafRef = useRef<number | null>(null);
  const animatingRef = useRef<boolean>(false);
  const currentScaleRef = useRef<number>(0);
  const targetScaleRef = useRef<number>(0);
  const currentPctRef = useRef<{ x: number; y: number }>({ x: 50, y: 50 });
  const targetPctRef = useRef<{ x: number; y: number }>({ x: 50, y: 50 });

  const prevMousePosRef = useRef<{ x: number; y: number } | null>(null);
  // 💡 마우스 이동 감지 타이머 Ref 추가
  const mouseMoveTimerRef = useRef<number | null>(null); // Create offscreen canvas once

  // distortionEnabled가 false에서 true로 변경될 때 모든 상태 리셋
  useEffect(() => {
    if (!actualDistortionEnabled) {
      // distortion이 비활성화될 때 타이머 정리
      if (mouseMoveTimerRef.current) {
        clearTimeout(mouseMoveTimerRef.current);
        mouseMoveTimerRef.current = null;
      }
      if (animRafRef.current) {
        cancelAnimationFrame(animRafRef.current);
        animRafRef.current = null;
      }
      animatingRef.current = false;
      return;
    }

    // 컴포넌트 언마운트 시 cleanup
    return () => {
      if (mouseMoveTimerRef.current) {
        clearTimeout(mouseMoveTimerRef.current);
        mouseMoveTimerRef.current = null;
      }
      if (animRafRef.current) {
        cancelAnimationFrame(animRafRef.current);
        animRafRef.current = null;
      }
    };
  }, [actualDistortionEnabled]);

  // distortion이 활성화될 때 모든 상태를 초기값으로 리셋 (별도 useEffect로 분리)
  useEffect(() => {
    if (!actualDistortionEnabled) return;

    // 약간의 지연을 두어 DOM이 완전히 렌더링되도록 함
    const timeoutId = setTimeout(() => {
      // 모든 상태를 초기값으로 리셋
      currentScaleRef.current = 0;
      targetScaleRef.current = 0;
      currentPctRef.current = { x: 50, y: 50 };
      targetPctRef.current = { x: 50, y: 50 };
      prevMousePosRef.current = null;
      animatingRef.current = false;

      // SVG displacement map scale을 0으로 리셋
      if (feDispRef.current) {
        feDispRef.current.setAttribute('scale', '0');
      }
      // 마스크 필터의 scale도 0으로 리셋
      if (maskFeDispRef.current) {
        maskFeDispRef.current.setAttribute('scale', '0');
      }

      // displacement map을 중립 상태로 리셋
      if (!canvasRef.current || !feImageRef.current) return;

      const c = canvasRef.current;
      const feImage = feImageRef.current;
      const ctx = c.getContext('2d', { willReadFrequently: false });
      if (!ctx) return;

      // Canvas 렌더링 품질 향상
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // canvas가 초기화되지 않았으면 기본 크기로 설정
      if (c.width === 0 || c.height === 0) {
        c.width = HOVER_DISTORT_CONFIG.canvas.minSize;
        c.height = HOVER_DISTORT_CONFIG.canvas.minSize;
      }

      const img = ctx.createImageData(c.width, c.height);
      const data = img.data;
      // 중립 상태: 모든 픽셀을 128, 128로 설정
      for (let i = 0; i < data.length; i += 4) {
        data[i] = 128; // R
        data[i + 1] = 128; // G
        data[i + 2] = 0; // B
        data[i + 3] = 255; // A
      }
      ctx.putImageData(img, 0, 0);
      const url = c.toDataURL('image/png');
      feImage.setAttribute('href', url);
      // 마스크 필터의 feImage도 동일하게 리셋
      if (maskFeImageRef.current) {
        maskFeImageRef.current.setAttribute('href', url);
      }
    }, 10);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [actualDistortionEnabled]);

  useEffect(() => {
    if (!actualDistortionEnabled) return;
    if (!canvasRef.current) {
      const c = document.createElement('canvas');
      c.width = HOVER_DISTORT_CONFIG.canvas.minSize;
      c.height = HOVER_DISTORT_CONFIG.canvas.minSize;
      canvasRef.current = c;
    }
  }, [actualDistortionEnabled]); // Track element size and adjust canvas resolution

  useEffect(() => {
    if (!actualDistortionEnabled) return;
    if (!wrapperRef.current) return;
    if (!canvasRef.current) return;

    const el = wrapperRef.current;
    const measure = () => {
      if (!el || !canvasRef.current) return;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return; // 요소가 아직 렌더링되지 않음

      elemSizeRef.current = { w: r.width, h: r.height };
      const dpr = Math.min(window.devicePixelRatio || 1, HOVER_DISTORT_CONFIG.canvas.devicePixelRatioLimit);
      const target = Math.min(
        HOVER_DISTORT_CONFIG.canvas.maxSize,
        Math.max(HOVER_DISTORT_CONFIG.canvas.minSize, Math.max(r.width, r.height) * dpr),
      );
      const dim = Math.round(target);
      if (canvasRef.current.width !== dim || canvasRef.current.height !== dim) {
        canvasRef.current.width = dim;
        canvasRef.current.height = dim;
        // canvas 크기가 변경되면 중립 상태로 리셋
        if (feImageRef.current) {
          const ctx = canvasRef.current.getContext('2d', { willReadFrequently: false });
          if (ctx) {
            // Canvas 렌더링 품질 향상
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';

            const img = ctx.createImageData(dim, dim);
            const data = img.data;
            for (let i = 0; i < data.length; i += 4) {
              data[i] = 128;
              data[i + 1] = 128;
              data[i + 2] = 0;
              data[i + 3] = 255;
            }
            ctx.putImageData(img, 0, 0);
            const url = canvasRef.current.toDataURL('image/png');
            feImageRef.current.setAttribute('href', url);
            // 마스크 필터의 feImage도 동일하게 업데이트
            if (maskFeImageRef.current) {
              maskFeImageRef.current.setAttribute('href', url);
            }
          }
        }
      }
    };

    // 초기 측정을 약간 지연시켜 DOM이 완전히 렌더링되도록 함
    const timeoutId = setTimeout(measure, 0);
    const ro = new ResizeObserver(measure);
    ro.observe(el);

    return () => {
      clearTimeout(timeoutId);
      ro.disconnect();
    };
  }, [actualDistortionEnabled]);

  const updateDisplacementMap = useCallback(
    (xPct: number, yPct: number) => {
      if (!actualDistortionEnabled) return;
      const c = canvasRef.current;
      const imgEl = feImageRef.current;
      if (!c || !imgEl) return;
      const cw = c.width;
      const ch = c.height;
      const ctx = c.getContext('2d', { willReadFrequently: false });
      if (!ctx) return;

      // Canvas 렌더링 품질 향상
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      const { w: ew, h: eh } = elemSizeRef.current;
      const rx = Math.max(HOVER_DISTORT_CONFIG.canvas.minRadius, (radiusPx * cw) / Math.max(ew, 1));
      const ry = Math.max(HOVER_DISTORT_CONFIG.canvas.minRadius, (radiusPx * ch) / Math.max(eh, 1));
      const cx = (xPct / 100) * cw;
      const cy = (yPct / 100) * ch;

      const img = ctx.createImageData(cw, ch);
      const data = img.data; // neutral 128,128 outside lens; smoothstep falloff inside
      for (let j = 0; j < ch; j++) {
        const dy = (j - cy) / ry;
        for (let i = 0; i < cw; i++) {
          const dx = (i - cx) / rx;
          const idx = (j * cw + i) << 2;
          const r2 = dx * dx + dy * dy;
          let s = 0;
          if (r2 < 1) {
            const r = Math.sqrt(r2);
            s = 1 - r;
            s = s * s * (3 - 2 * s); // smoothstep
          }
          const xr = 128 + dx * s * 127;
          const yg = 128 + dy * s * 127;
          data[idx] = xr;
          data[idx + 1] = yg;
          data[idx + 2] = 0;
          data[idx + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
      const url = c.toDataURL('image/png');
      imgEl.setAttribute('href', url);
      // 마스크 필터의 feImage도 동일하게 업데이트
      if (maskFeImageRef.current) {
        maskFeImageRef.current.setAttribute('href', url);
      }
    },
    [radiusPx, actualDistortionEnabled],
  );

  const startAnimIfNeeded = useCallback(() => {
    if (!actualDistortionEnabled) return;
    if (!canvasRef.current || !feImageRef.current || !feDispRef.current) return;
    if (!maskFeImageRef.current || !maskFeDispRef.current) return;
    if (animatingRef.current) return;
    animatingRef.current = true;

    const lerpFactor = Math.min(
      Math.max(easingFactor, HOVER_DISTORT_CONFIG.animation.minEasingFactor),
      HOVER_DISTORT_CONFIG.animation.maxEasingFactor,
    );

    const step = () => {
      const cp = currentPctRef.current;
      const tp = targetPctRef.current;

      const nx = cp.x + (tp.x - cp.x) * lerpFactor;
      const ny = cp.y + (tp.y - cp.y) * lerpFactor;

      currentPctRef.current = { x: nx, y: ny };
      updateDisplacementMap(nx, ny);

      const cs = currentScaleRef.current;
      const ts = targetScaleRef.current;

      const ns = cs + (ts - cs) * lerpFactor;

      currentScaleRef.current = ns;
      feDispRef.current?.setAttribute('scale', ns.toFixed(2));
      // 마스크 필터의 scale도 동일하게 업데이트
      maskFeDispRef.current?.setAttribute('scale', ns.toFixed(2));

      const nearPos = Math.hypot(tp.x - nx, tp.y - ny) < HOVER_DISTORT_CONFIG.animation.nearPosThreshold;
      const nearScale = Math.abs(ts - ns) < HOVER_DISTORT_CONFIG.animation.nearScaleThreshold;

      // 목표에 도달하면 애니메이션 즉시 정지
      if (nearPos && nearScale) {
        animatingRef.current = false;
        if (animRafRef.current !== null) {
          cancelAnimationFrame(animRafRef.current);
          animRafRef.current = null;
        }
        return;
      }
      animRafRef.current = requestAnimationFrame(step);
    };
    animRafRef.current = requestAnimationFrame(step);
  }, [actualDistortionEnabled, easingFactor, updateDisplacementMap]);

  const handleEnter = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!actualDistortionEnabled) return;
      if (!wrapperRef.current) return;
      if (!canvasRef.current || !feImageRef.current || !feDispRef.current) return;

      const rect = wrapperRef.current.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const pctX = (px / rect.width) * 100;
      const pctY = (py / rect.height) * 100;

      prevMousePosRef.current = { x: px, y: py };
      targetPctRef.current = { x: pctX, y: pctY };
      targetScaleRef.current = 0;

      startAnimIfNeeded();
    },
    [startAnimIfNeeded, actualDistortionEnabled],
  );

  const handleMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!actualDistortionEnabled) return;
      if (!wrapperRef.current) return;
      if (!canvasRef.current || !feImageRef.current || !feDispRef.current) return;

      const rect = wrapperRef.current.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;

      // 이전 위치와의 차이 계산 (속도 기반 scale 계산용)
      let dx = 0;
      let dy = 0;
      if (prevMousePosRef.current) {
        dx = px - prevMousePosRef.current.x;
        dy = py - prevMousePosRef.current.y;
      }
      prevMousePosRef.current = { x: px, y: py };

      // 마우스 이동 속도 기반 scale 계산
      const speed = Math.hypot(dx, dy);
      targetScaleRef.current = Math.min(distortionScale, speed * HOVER_DISTORT_CONFIG.scaleMultiplier);

      // scale이 0으로 돌아가는 타이머 리셋
      if (mouseMoveTimerRef.current) {
        clearTimeout(mouseMoveTimerRef.current);
      }
      mouseMoveTimerRef.current = window.setTimeout(() => {
        targetScaleRef.current = 0;
        mouseMoveTimerRef.current = null;
      }, HOVER_DISTORT_CONFIG.mouseMoveTimer);

      // 위치 업데이트
      const pctX = (px / rect.width) * 100;
      const pctY = (py / rect.height) * 100;
      targetPctRef.current = { x: pctX, y: pctY };

      // 애니메이션이 실행 중이 아니면 시작
      if (!animatingRef.current) {
        startAnimIfNeeded();
      }
    },
    [distortionScale, startAnimIfNeeded, actualDistortionEnabled],
  );

  const handleLeave = useCallback(() => {
    if (!actualDistortionEnabled) return;
    targetScaleRef.current = 0;
    prevMousePosRef.current = null;
    if (mouseMoveTimerRef.current) {
      clearTimeout(mouseMoveTimerRef.current);
      mouseMoveTimerRef.current = null;
    }
    startAnimIfNeeded();
  }, [startAnimIfNeeded, actualDistortionEnabled]);

  const eventHandlers = actualDistortionEnabled
    ? {
        onMouseEnter: handleEnter,
        onMouseMove: handleMove,
        onMouseLeave: handleLeave,
      }
    : useSafariFallback
      ? {
          onMouseEnter: () => setIsHovering(true),
          onMouseLeave: () => setIsHovering(false),
        }
      : {};

  return (
    <div
      ref={wrapperRef}
      {...eventHandlers}
      className={`relative ${useSafariFallback ? 'overflow-hidden' : ''} ${className ?? ''}`}
      role={alt ? 'img' : undefined}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : 'true'}
      style={
        {
          aspectRatio: aspectRatio,
          lineHeight: 0,
        } as React.CSSProperties
      }>
      <svg
        className="block h-full w-full"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          imageRendering: 'auto',
          ...(useSafariFallback
            ? {
                transition: 'filter 0.4s ease-out, transform 0.4s ease-out',
                filter: isHovering ? 'brightness(1.05)' : 'none',
                transform: isHovering ? 'scale(1.02)' : 'scale(1)',
              }
            : {}),
        }}>
        {actualDistortionEnabled ? (
          <defs>
            {/* 메인 이미지용 필터 */}
            <filter
              id={filterId}
              x="0"
              y="0"
              width="100%"
              height="100%"
              colorInterpolationFilters="sRGB"
              filterRes="200%">
              <feImage
                ref={feImageRef}
                x="0"
                y="0"
                width="100%"
                height="100%"
                preserveAspectRatio="none"
                result="map"
              />
              <feGaussianBlur in="map" stdDeviation={blurStd} result="smap" />
              <feDisplacementMap
                ref={feDispRef}
                in="SourceGraphic"
                in2="smap"
                scale={0}
                xChannelSelector="R"
                yChannelSelector="G"
              />
            </filter>
            {/* 마스크용 필터 - 같은 displacement map 사용 */}
            <filter
              id={maskFilterId}
              x="-5%"
              y="-5%"
              width="110%"
              height="110%"
              colorInterpolationFilters="sRGB"
              filterRes="200%">
              <feImage
                ref={maskFeImageRef}
                x="0"
                y="0"
                width="100%"
                height="100%"
                preserveAspectRatio="none"
                result="maskMap"
              />
              <feGaussianBlur in="maskMap" stdDeviation={blurStd} result="maskSmap" />
              <feDisplacementMap
                ref={maskFeDispRef}
                in="SourceGraphic"
                in2="maskSmap"
                scale={0}
                xChannelSelector="R"
                yChannelSelector="G"
              />
            </filter>
            {/* 마스크 정의 - 같은 displacement map 사용하여 외곽도 함께 왜곡 */}
            <mask id={maskId} maskUnits="objectBoundingBox">
              <rect
                x="0"
                y="0"
                width="100%"
                height="100%"
                fill="white"
                filter={actualDistortionEnabled ? `url(#${maskFilterId})` : undefined}
              />
            </mask>
          </defs>
        ) : null}
        <g mask={actualDistortionEnabled ? `url(#${maskId})` : undefined}>
          <image
            href={src}
            xlinkHref={src}
            x="0"
            y="0"
            width="100%"
            height="100%"
            preserveAspectRatio={preserveAspect}
            filter={actualDistortionEnabled ? `url(#${filterId})` : undefined}
            imageRendering="optimizeQuality"
          />
        </g>
      </svg>
    </div>
  );
}
