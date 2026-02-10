'use client';

import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { HOVER_DISTORT_CONFIG } from '@/config/appConfig';

const XLINK_NS = 'http://www.w3.org/1999/xlink';

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
  const [canUseHoverDistortion, setCanUseHoverDistortion] = useState(false);
  const [isSafariBrowser, setIsSafariBrowser] = useState(false);
  const [filterReady, setFilterReady] = useState(false);

  const useSafariOptimizedDistortion = isSafariBrowser;
  const useMaskDistortion = !useSafariOptimizedDistortion;
  const distortionScaleValue = useSafariOptimizedDistortion ? Math.min(distortionScale, 110) : distortionScale;
  const blurStdValue = useSafariOptimizedDistortion ? Math.min(blurStd, 10) : blurStd;
  const canvasMaxSize = useSafariOptimizedDistortion ? 96 : HOVER_DISTORT_CONFIG.canvas.maxSize;
  const canvasDprLimit = useSafariOptimizedDistortion ? 1 : HOVER_DISTORT_CONFIG.canvas.devicePixelRatioLimit;
  const filterInset = useSafariOptimizedDistortion ? '-30%' : '-50%';
  const filterSize = useSafariOptimizedDistortion ? '160%' : '200%';
  const minFrameIntervalMs = useSafariOptimizedDistortion ? 1000 / 30 : 0;
  const posQuantizeStep = useSafariOptimizedDistortion ? 0.5 : 0.01;
  const scaleQuantizeStep = useSafariOptimizedDistortion ? 0.25 : 0.01;
  const actualDistortionEnabled = distortionEnabled && canUseHoverDistortion;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const supportsHoverWithFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
      setCanUseHoverDistortion(supportsHoverWithFinePointer);
    }

    if (typeof navigator !== 'undefined') {
      const ua = navigator.userAgent;
      const isSafari =
        /Safari/i.test(ua) && !/Chrome|Chromium|CriOS|Edg|Edge|Android|FxiOS|OPR|SamsungBrowser/i.test(ua);
      setIsSafariBrowser(isSafari);
    }
  }, []);

  const id = useId().replace(/:/g, '-');
  const filterId = `hover-distort-${id}`;
  const maskFilterId = `hover-distort-mask-filter-${id}`;
  const maskId = `hover-distort-mask-${id}`;

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const feImageRef = useRef<SVGFEImageElement | null>(null);
  const feDispRef = useRef<SVGFEDisplacementMapElement | null>(null);
  const feOffsetRef = useRef<SVGFEOffsetElement | null>(null);
  const maskFeImageRef = useRef<SVGFEImageElement | null>(null);
  const maskFeDispRef = useRef<SVGFEDisplacementMapElement | null>(null);
  const maskFeOffsetRef = useRef<SVGFEOffsetElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const elemSizeRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 });
  const animRafRef = useRef<number | null>(null);
  const animatingRef = useRef<boolean>(false);
  const currentScaleRef = useRef<number>(0);
  const targetScaleRef = useRef<number>(0);
  const currentPctRef = useRef<{ x: number; y: number }>({ x: 50, y: 50 });
  const targetPctRef = useRef<{ x: number; y: number }>({ x: 50, y: 50 });

  const prevMousePosRef = useRef<{ x: number; y: number } | null>(null);
  const mouseMoveTimerRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);
  const lastAppliedRef = useRef<{ dx: number; dy: number; scale: number } | null>(null);

  // Blob URL 관리 (초기 설정/리사이즈 시에만 사용, 호버 중에는 절대 변경 없음)
  const blobGenRef = useRef(0);
  const prevBlobUrlRef = useRef<string | null>(null);
  const mapAppliedRef = useRef(false);

  /**
   * 정적 displacement map 생성 (캔버스 중앙에 방사형 그라디언트).
   * 호버 시에는 feOffset으로 위치만 이동하므로 맵은 초기화/리사이즈 시에만 생성합니다.
   */
  const generateStaticMap = useCallback(
    (canvas: HTMLCanvasElement) => {
      const cw = canvas.width;
      const ch = canvas.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: false });
      if (!ctx) return;

      const { w: ew, h: eh } = elemSizeRef.current;
      const rx = Math.max(HOVER_DISTORT_CONFIG.canvas.minRadius, (radiusPx * cw) / Math.max(ew, 1));
      const ry = Math.max(HOVER_DISTORT_CONFIG.canvas.minRadius, (radiusPx * ch) / Math.max(eh, 1));
      const cx = cw / 2;
      const cy = ch / 2;

      const img = ctx.createImageData(cw, ch);
      const data = img.data;
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
            s = s * s * (3 - 2 * s);
          }
          data[idx] = 128 + dx * s * 127;
          data[idx + 1] = 128 + dy * s * 127;
          data[idx + 2] = 0;
          data[idx + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
    },
    [radiusPx],
  );

  /**
   * Blob URL로 feImage에 displacement map을 1회 설정.
   * Safari에서 feImage href를 반복 변경하면 이미지가 사라지는 버그를 방지하기 위해
   * 초기화/리사이즈 시에만 호출합니다 (호버 중에는 feOffset만 변경).
   */
  const setStaticDisplacementMap = useCallback((canvas: HTMLCanvasElement, onReady?: () => void) => {
    const gen = ++blobGenRef.current;

    canvas.toBlob((blob) => {
      if (!blob || gen !== blobGenRef.current) return;

      if (prevBlobUrlRef.current) {
        URL.revokeObjectURL(prevBlobUrlRef.current);
      }

      const url = URL.createObjectURL(blob);
      prevBlobUrlRef.current = url;

      // href + xlink:href 동시 설정 (Safari는 xlink:href를 우선 인식)
      if (feImageRef.current) {
        feImageRef.current.setAttribute('href', url);
        feImageRef.current.setAttributeNS(XLINK_NS, 'xlink:href', url);
      }
      if (maskFeImageRef.current) {
        maskFeImageRef.current.setAttribute('href', url);
        maskFeImageRef.current.setAttributeNS(XLINK_NS, 'xlink:href', url);
      }

      mapAppliedRef.current = true;
      onReady?.();
    }, 'image/png');
  }, []);

  // 언마운트 시 Blob URL 정리
  useEffect(() => {
    return () => {
      if (prevBlobUrlRef.current) {
        URL.revokeObjectURL(prevBlobUrlRef.current);
        prevBlobUrlRef.current = null;
      }
    };
  }, []);

  // distortionEnabled 변경 시 애니메이션 상태 리셋
  useEffect(() => {
    if (!actualDistortionEnabled) {
      setFilterReady(false);
      mapAppliedRef.current = false;
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

  // distortion 활성화 시 캔버스 생성 + 상태 초기화
  useEffect(() => {
    if (!actualDistortionEnabled) return;

    if (!canvasRef.current) {
      const c = document.createElement('canvas');
      c.width = HOVER_DISTORT_CONFIG.canvas.minSize;
      c.height = HOVER_DISTORT_CONFIG.canvas.minSize;
      canvasRef.current = c;
    }

    // 애니메이션 상태 초기화
    currentScaleRef.current = 0;
    targetScaleRef.current = 0;
    currentPctRef.current = { x: 50, y: 50 };
    targetPctRef.current = { x: 50, y: 50 };
    prevMousePosRef.current = null;
    lastFrameTimeRef.current = 0;
    lastAppliedRef.current = null;
    animatingRef.current = false;
    mapAppliedRef.current = false;

    if (feDispRef.current) feDispRef.current.setAttribute('scale', '0');
    if (maskFeDispRef.current) maskFeDispRef.current.setAttribute('scale', '0');
    if (feOffsetRef.current) {
      feOffsetRef.current.setAttribute('dx', '0');
      feOffsetRef.current.setAttribute('dy', '0');
    }
    if (maskFeOffsetRef.current) {
      maskFeOffsetRef.current.setAttribute('dx', '0');
      maskFeOffsetRef.current.setAttribute('dy', '0');
    }
  }, [actualDistortionEnabled]);

  // ResizeObserver: 요소 크기 측정 + displacement map 생성/적용
  useEffect(() => {
    if (!actualDistortionEnabled) return;
    if (!wrapperRef.current) return;
    if (!canvasRef.current) return;

    const el = wrapperRef.current;
    const measure = () => {
      if (!el || !canvasRef.current) return;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;

      elemSizeRef.current = { w: r.width, h: r.height };
      const dpr = Math.min(window.devicePixelRatio || 1, canvasDprLimit);
      const target = Math.min(
        canvasMaxSize,
        Math.max(HOVER_DISTORT_CONFIG.canvas.minSize, Math.max(r.width, r.height) * dpr),
      );
      const dim = Math.round(target);

      const needsResize = canvasRef.current.width !== dim || canvasRef.current.height !== dim;
      if (needsResize) {
        canvasRef.current.width = dim;
        canvasRef.current.height = dim;
      }

      // 리사이즈 시 또는 아직 맵이 적용되지 않았으면 생성/적용
      if (feImageRef.current && (needsResize || !mapAppliedRef.current)) {
        generateStaticMap(canvasRef.current);
        setStaticDisplacementMap(canvasRef.current, () => setFilterReady(true));
      }
    };

    const timeoutId = setTimeout(measure, 0);
    const ro = new ResizeObserver(measure);
    ro.observe(el);

    return () => {
      clearTimeout(timeoutId);
      ro.disconnect();
    };
  }, [actualDistortionEnabled, generateStaticMap, setStaticDisplacementMap, canvasMaxSize, canvasDprLimit]);

  // 애니메이션 루프: feOffset(dx, dy) + feDisplacementMap(scale)만 업데이트
  // feImage href는 절대 변경하지 않음 → Safari 호환
  const startAnimIfNeeded = useCallback(() => {
    if (!actualDistortionEnabled) return;
    if (!canvasRef.current || !feImageRef.current || !feDispRef.current) return;
    if (!feOffsetRef.current) return;
    if (useMaskDistortion && !maskFeOffsetRef.current) return;
    if (useMaskDistortion && (!maskFeImageRef.current || !maskFeDispRef.current)) return;
    if (animatingRef.current) return;
    animatingRef.current = true;

    const lerpFactor = Math.min(
      Math.max(easingFactor, HOVER_DISTORT_CONFIG.animation.minEasingFactor),
      HOVER_DISTORT_CONFIG.animation.maxEasingFactor,
    );

    const step = (timestamp: number) => {
      if (minFrameIntervalMs > 0) {
        const elapsed = timestamp - lastFrameTimeRef.current;
        if (elapsed < minFrameIntervalMs) {
          animRafRef.current = requestAnimationFrame(step);
          return;
        }
        lastFrameTimeRef.current = timestamp;
      }

      const cp = currentPctRef.current;
      const tp = targetPctRef.current;

      const nx = cp.x + (tp.x - cp.x) * lerpFactor;
      const ny = cp.y + (tp.y - cp.y) * lerpFactor;

      currentPctRef.current = { x: nx, y: ny };

      // feOffset으로 displacement map 위치 이동 (feImage href 변경 없음 → Safari 호환)
      const { w: ew, h: eh } = elemSizeRef.current;
      const rawDx = (nx / 100 - 0.5) * ew;
      const rawDy = (ny / 100 - 0.5) * eh;
      const dx = Math.round(rawDx / posQuantizeStep) * posQuantizeStep;
      const dy = Math.round(rawDy / posQuantizeStep) * posQuantizeStep;

      const cs = currentScaleRef.current;
      const ts = targetScaleRef.current;

      const rawNs = cs + (ts - cs) * lerpFactor;
      const ns = Math.round(rawNs / scaleQuantizeStep) * scaleQuantizeStep;

      currentScaleRef.current = ns;
      const prevApplied = lastAppliedRef.current;
      const changed = !prevApplied || prevApplied.dx !== dx || prevApplied.dy !== dy || prevApplied.scale !== ns;

      if (changed) {
        feOffsetRef.current?.setAttribute('dx', dx.toFixed(2));
        feOffsetRef.current?.setAttribute('dy', dy.toFixed(2));
        if (useMaskDistortion) {
          maskFeOffsetRef.current?.setAttribute('dx', dx.toFixed(2));
          maskFeOffsetRef.current?.setAttribute('dy', dy.toFixed(2));
        }
        feDispRef.current?.setAttribute('scale', ns.toFixed(2));
        if (useMaskDistortion) {
          maskFeDispRef.current?.setAttribute('scale', ns.toFixed(2));
        }
        lastAppliedRef.current = { dx, dy, scale: ns };
      }

      const nearPos = Math.hypot(tp.x - nx, tp.y - ny) < HOVER_DISTORT_CONFIG.animation.nearPosThreshold;
      const nearScale = Math.abs(ts - ns) < HOVER_DISTORT_CONFIG.animation.nearScaleThreshold;

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
  }, [
    actualDistortionEnabled,
    easingFactor,
    minFrameIntervalMs,
    posQuantizeStep,
    scaleQuantizeStep,
    useMaskDistortion,
  ]);

  const handleEnter = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!actualDistortionEnabled) return;
      if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
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
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!actualDistortionEnabled) return;
      if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
      if (!wrapperRef.current) return;
      if (!canvasRef.current || !feImageRef.current || !feDispRef.current) return;

      const rect = wrapperRef.current.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;

      let dx = 0;
      let dy = 0;
      if (prevMousePosRef.current) {
        dx = px - prevMousePosRef.current.x;
        dy = py - prevMousePosRef.current.y;
      }
      if (useSafariOptimizedDistortion && Math.hypot(dx, dy) < 0.8) return;
      prevMousePosRef.current = { x: px, y: py };

      const speed = Math.hypot(dx, dy);
      targetScaleRef.current = Math.min(distortionScaleValue, speed * HOVER_DISTORT_CONFIG.scaleMultiplier);

      if (mouseMoveTimerRef.current) {
        clearTimeout(mouseMoveTimerRef.current);
      }
      mouseMoveTimerRef.current = window.setTimeout(() => {
        targetScaleRef.current = 0;
        mouseMoveTimerRef.current = null;
      }, HOVER_DISTORT_CONFIG.mouseMoveTimer);

      const pctX = (px / rect.width) * 100;
      const pctY = (py / rect.height) * 100;
      targetPctRef.current = { x: pctX, y: pctY };

      if (!animatingRef.current) {
        startAnimIfNeeded();
      }
    },
    [distortionScaleValue, startAnimIfNeeded, actualDistortionEnabled, useSafariOptimizedDistortion],
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
        onPointerEnter: handleEnter,
        onPointerMove: handleMove,
        onPointerLeave: handleLeave,
      }
    : {};

  return (
    <div
      ref={wrapperRef}
      {...eventHandlers}
      className={`relative ${className ?? ''}`}
      role={alt ? 'img' : undefined}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : 'true'}
      style={{ aspectRatio: aspectRatio, lineHeight: 0 } as React.CSSProperties}>
      <svg className="block h-full w-full" xmlns="http://www.w3.org/2000/svg" style={{ imageRendering: 'auto' }}>
        {actualDistortionEnabled ? (
          <defs>
            {/* ===== 메인 이미지용 필터 ===== */}
            <filter
              id={filterId}
              x={filterInset}
              y={filterInset}
              width={filterSize}
              height={filterSize}
              colorInterpolationFilters="sRGB">
              {/* 중립 배경 (128,128,0 = 변위 없음) — feOffset 이동 후 빈 영역을 채움 */}
              <feFlood floodColor="rgb(128,128,0)" floodOpacity="1" result="neutral" />
              {/* 정적 displacement map (Blob URL, 1회만 설정됨) */}
              <feImage
                ref={feImageRef}
                x="0"
                y="0"
                width="100%"
                height="100%"
                preserveAspectRatio="none"
                result="rawMap"
              />
              {/* 마우스 위치에 따라 displacement map 이동 (Safari 호환: href 변경 없음) */}
              <feOffset ref={feOffsetRef} in="rawMap" dx="0" dy="0" result="offsetMap" />
              {/* 이동된 맵을 중립 배경 위에 합성 */}
              <feComposite in="offsetMap" in2="neutral" operator="over" result="finalMap" />
              <feGaussianBlur in="finalMap" stdDeviation={blurStdValue} result="smap" />
              <feDisplacementMap
                ref={feDispRef}
                in="SourceGraphic"
                in2="smap"
                scale={0}
                xChannelSelector="R"
                yChannelSelector="G"
              />
            </filter>
            {useMaskDistortion && (
              <>
                {/* ===== 마스크용 필터 ===== */}
                <filter
                  id={maskFilterId}
                  x={filterInset}
                  y={filterInset}
                  width={filterSize}
                  height={filterSize}
                  colorInterpolationFilters="sRGB">
                  <feFlood floodColor="rgb(128,128,0)" floodOpacity="1" result="maskNeutral" />
                  <feImage
                    ref={maskFeImageRef}
                    x="0"
                    y="0"
                    width="100%"
                    height="100%"
                    preserveAspectRatio="none"
                    result="maskRawMap"
                  />
                  <feOffset ref={maskFeOffsetRef} in="maskRawMap" dx="0" dy="0" result="maskOffsetMap" />
                  <feComposite in="maskOffsetMap" in2="maskNeutral" operator="over" result="maskFinalMap" />
                  <feGaussianBlur in="maskFinalMap" stdDeviation={blurStdValue} result="maskSmap" />
                  <feDisplacementMap
                    ref={maskFeDispRef}
                    in="SourceGraphic"
                    in2="maskSmap"
                    scale={0}
                    xChannelSelector="R"
                    yChannelSelector="G"
                  />
                </filter>
                {/* 마스크 정의 */}
                <mask id={maskId} maskUnits="objectBoundingBox">
                  <rect
                    x="0"
                    y="0"
                    width="100%"
                    height="100%"
                    fill="white"
                    filter={filterReady ? `url(#${maskFilterId})` : undefined}
                  />
                </mask>
              </>
            )}
          </defs>
        ) : null}
        <g mask={useMaskDistortion && filterReady ? `url(#${maskId})` : undefined}>
          <image
            href={src}
            xlinkHref={src}
            x="0"
            y="0"
            width="100%"
            height="100%"
            preserveAspectRatio={preserveAspect}
            filter={filterReady ? `url(#${filterId})` : undefined}
            imageRendering="optimizeQuality"
          />
        </g>
      </svg>
    </div>
  );
}
