'use client';

import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { HOVER_DISTORT_CONFIG } from '@/config/appConfig';
import useWindowSize from '@/hooks/useWindowSize';

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
  const windowSize = useWindowSize();
  const [mounted, setMounted] = useState(false);
  const [filterReady, setFilterReady] = useState(false);

  // 모바일에서는 distortion 효과 비활성화 (Safari 포함 모든 브라우저에서 SVG 사용)
  const isMobile = mounted && windowSize.isSm;
  const actualDistortionEnabled = distortionEnabled && !isMobile;

  useEffect(() => {
    setMounted(true);
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
  const mouseMoveTimerRef = useRef<number | null>(null);

  // Blob URL 관리 (Safari 호환용)
  const blobGenRef = useRef(0);
  const prevBlobUrlRef = useRef<string | null>(null);

  /**
   * feImage에 displacement map URL을 적용하는 헬퍼.
   * Safari 호환성을 위해 Blob URL + xlink:href를 사용합니다.
   */
  const applyMapToFeImages = useCallback((canvas: HTMLCanvasElement, onApplied?: () => void) => {
    const gen = ++blobGenRef.current;

    canvas.toBlob(
      (blob) => {
        // 최신 generation만 적용 (이전 비동기 결과 무시)
        if (!blob || gen !== blobGenRef.current) return;

        // 이전 Blob URL 해제
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

        onApplied?.();
      },
      'image/png',
    );
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

  // distortionEnabled가 false에서 true로 변경될 때 모든 상태 리셋
  useEffect(() => {
    if (!actualDistortionEnabled) {
      setFilterReady(false);
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

  // distortion이 활성화될 때 모든 상태를 초기값으로 리셋
  useEffect(() => {
    if (!actualDistortionEnabled) return;
    let cancelled = false;

    const timeoutId = setTimeout(() => {
      currentScaleRef.current = 0;
      targetScaleRef.current = 0;
      currentPctRef.current = { x: 50, y: 50 };
      targetPctRef.current = { x: 50, y: 50 };
      prevMousePosRef.current = null;
      animatingRef.current = false;

      if (feDispRef.current) feDispRef.current.setAttribute('scale', '0');
      if (maskFeDispRef.current) maskFeDispRef.current.setAttribute('scale', '0');

      if (!canvasRef.current || !feImageRef.current) return;

      const c = canvasRef.current;
      const ctx = c.getContext('2d', { willReadFrequently: false });
      if (!ctx) return;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      if (c.width === 0 || c.height === 0) {
        c.width = HOVER_DISTORT_CONFIG.canvas.minSize;
        c.height = HOVER_DISTORT_CONFIG.canvas.minSize;
      }

      const img = ctx.createImageData(c.width, c.height);
      const data = img.data;
      for (let i = 0; i < data.length; i += 4) {
        data[i] = 128;
        data[i + 1] = 128;
        data[i + 2] = 0;
        data[i + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
      // 초기 displacement map이 적용된 후에만 필터를 활성화 (Safari 화질 저하 방지)
      applyMapToFeImages(c, () => {
        if (!cancelled) setFilterReady(true);
      });
    }, 10);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [actualDistortionEnabled, applyMapToFeImages]);

  useEffect(() => {
    if (!actualDistortionEnabled) return;
    if (!canvasRef.current) {
      const c = document.createElement('canvas');
      c.width = HOVER_DISTORT_CONFIG.canvas.minSize;
      c.height = HOVER_DISTORT_CONFIG.canvas.minSize;
      canvasRef.current = c;
    }
  }, [actualDistortionEnabled]);

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
      const dpr = Math.min(window.devicePixelRatio || 1, HOVER_DISTORT_CONFIG.canvas.devicePixelRatioLimit);
      const target = Math.min(
        HOVER_DISTORT_CONFIG.canvas.maxSize,
        Math.max(HOVER_DISTORT_CONFIG.canvas.minSize, Math.max(r.width, r.height) * dpr),
      );
      const dim = Math.round(target);
      if (canvasRef.current.width !== dim || canvasRef.current.height !== dim) {
        canvasRef.current.width = dim;
        canvasRef.current.height = dim;
        if (feImageRef.current) {
          const ctx = canvasRef.current.getContext('2d', { willReadFrequently: false });
          if (ctx) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            const img = ctx.createImageData(dim, dim);
            const d = img.data;
            for (let i = 0; i < d.length; i += 4) {
              d[i] = 128;
              d[i + 1] = 128;
              d[i + 2] = 0;
              d[i + 3] = 255;
            }
            ctx.putImageData(img, 0, 0);
            applyMapToFeImages(canvasRef.current);
          }
        }
      }
    };

    const timeoutId = setTimeout(measure, 0);
    const ro = new ResizeObserver(measure);
    ro.observe(el);

    return () => {
      clearTimeout(timeoutId);
      ro.disconnect();
    };
  }, [actualDistortionEnabled, applyMapToFeImages]);

  const updateDisplacementMap = useCallback(
    (xPct: number, yPct: number) => {
      if (!actualDistortionEnabled) return;
      const c = canvasRef.current;
      if (!c || !feImageRef.current) return;
      const cw = c.width;
      const ch = c.height;
      const ctx = c.getContext('2d', { willReadFrequently: false });
      if (!ctx) return;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      const { w: ew, h: eh } = elemSizeRef.current;
      const rx = Math.max(HOVER_DISTORT_CONFIG.canvas.minRadius, (radiusPx * cw) / Math.max(ew, 1));
      const ry = Math.max(HOVER_DISTORT_CONFIG.canvas.minRadius, (radiusPx * ch) / Math.max(eh, 1));
      const cx = (xPct / 100) * cw;
      const cy = (yPct / 100) * ch;

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
          const xr = 128 + dx * s * 127;
          const yg = 128 + dy * s * 127;
          data[idx] = xr;
          data[idx + 1] = yg;
          data[idx + 2] = 0;
          data[idx + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
      applyMapToFeImages(c);
    },
    [radiusPx, actualDistortionEnabled, applyMapToFeImages],
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
      maskFeDispRef.current?.setAttribute('scale', ns.toFixed(2));

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

      let dx = 0;
      let dy = 0;
      if (prevMousePosRef.current) {
        dx = px - prevMousePosRef.current.x;
        dy = py - prevMousePosRef.current.y;
      }
      prevMousePosRef.current = { x: px, y: py };

      const speed = Math.hypot(dx, dy);
      targetScaleRef.current = Math.min(distortionScale, speed * HOVER_DISTORT_CONFIG.scaleMultiplier);

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
    : {};

  return (
    <div
      ref={wrapperRef}
      {...eventHandlers}
      className={`relative ${className ?? ''}`}
      role={alt ? 'img' : undefined}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : 'true'}
      style={
        {
          aspectRatio: aspectRatio,
          lineHeight: 0,
        } as React.CSSProperties
      }>
      <svg className="block h-full w-full" xmlns="http://www.w3.org/2000/svg" style={{ imageRendering: 'auto' }}>
        {actualDistortionEnabled ? (
          <defs>
            {/* 메인 이미지용 필터 */}
            <filter
              id={filterId}
              x="0"
              y="0"
              width="100%"
              height="100%"
              colorInterpolationFilters="sRGB">
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
            {/* 마스크용 필터 */}
            <filter
              id={maskFilterId}
              x="-5%"
              y="-5%"
              width="110%"
              height="110%"
              colorInterpolationFilters="sRGB">
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
          </defs>
        ) : null}
        <g mask={filterReady ? `url(#${maskId})` : undefined}>
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
