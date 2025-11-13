'use client';

import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';

export default function InteractiveGlassImage({
  src,
  alt = '',
  aspectRatio,
  className,
  intensity = 1,
  blurPx = 32,
  highlightSizePx = 500,
  // deformation settings
  deformation = true,
  distortionScale = 120,
  lensRadiusPx = 50,
  mapBlurStd = 4,
  cursorFollow = true,
  baseEffect = false,
}: {
  src: string;
  alt?: string;
  aspectRatio?: string; // e.g. "3 / 4"
  className?: string;
  intensity?: number; // 0..1
  blurPx?: number;
  highlightSizePx?: number;
  deformation?: boolean;
  distortionScale?: number; // pixels
  lensRadiusPx?: number; // in element pixels
  mapBlurStd?: number; // gaussian blur std on displacement map (in px, canvas space)
  cursorFollow?: boolean; // true: follow cursor, false: fixed center
  baseEffect?: boolean; // render non-cursor base highlight/glass effect
}) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const pendingPointRef = useRef<{ x: number; y: number } | null>(null);
  const [isHover, setIsHover] = useState(false);
  const id = useId().replace(/:/g, '-');
  const filterId = `interactive-distort-${id}`;
  const feImageRef = useRef<SVGFEImageElement | null>(null);
  const feDispRef = useRef<SVGFEDisplacementMapElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sizeRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 });
  const lastPctRef = useRef<{ x: number; y: number }>({ x: 50, y: 50 });
  const currentPctRef = useRef<{ x: number; y: number }>({ x: 50, y: 50 });
  const targetPctRef = useRef<{ x: number; y: number }>({ x: 50, y: 50 });
  const currentScaleRef = useRef<number>(0);
  const targetScaleRef = useRef<number>(0);
  const animatingRef = useRef<boolean>(false);
  const runtimeLensRadiusPxRef = useRef<number>(lensRadiusPx);
  const lastMouseEventRef = useRef<{ x: number; y: number; t: number } | null>(null);

  // Hover-based interaction: animate position/scale on element events
  const startAnimLoopIfNeeded = useCallback(() => {
    if (animatingRef.current) return;
    animatingRef.current = true;
    const step = () => {
      const cp = currentPctRef.current;
      const tp = targetPctRef.current;
      const nx = cp.x + (tp.x - cp.x) * 0.18;
      const ny = cp.y + (tp.y - cp.y) * 0.18;
      currentPctRef.current = { x: nx, y: ny };
      if (wrapperRef.current) {
        wrapperRef.current.style.setProperty('--mx', `${nx}%`);
        wrapperRef.current.style.setProperty('--my', `${ny}%`);
      }
      if (deformation) {
        updateDisplacementFromPercent(nx, ny);
      }
      const cs = currentScaleRef.current;
      const ts = targetScaleRef.current;
      const ns = cs + (ts - cs) * 0.18;
      currentScaleRef.current = ns;
      if (feDispRef.current) {
        feDispRef.current.setAttribute('scale', ns.toFixed(2));
      }
      const nearPos = Math.hypot(tp.x - nx, tp.y - ny) < 0.05;
      const nearScale = Math.abs(ts - ns) < 0.1;
      if (nearPos && nearScale && (!deformation || ts === 0)) {
        animatingRef.current = false;
        return;
      }
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
  }, [deformation]);

  const handleMouseEnter = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!wrapperRef.current) return;
    setIsHover(true);
    if (cursorFollow) {
      const rect = wrapperRef.current.getBoundingClientRect();
      const px = ((e.clientX - rect.left) / rect.width) * 100;
      const py = ((e.clientY - rect.top) / rect.height) * 100;
      const clampedX = Math.max(0, Math.min(100, px));
      const clampedY = Math.max(0, Math.min(100, py));
      targetPctRef.current = { x: clampedX, y: clampedY };
      currentPctRef.current = { x: clampedX, y: clampedY };
      lastMouseEventRef.current = { x: e.clientX, y: e.clientY, t: performance.now() };
      runtimeLensRadiusPxRef.current = lensRadiusPx;
      if (wrapperRef.current) {
        wrapperRef.current.style.setProperty('--mx', `${clampedX}%`);
        wrapperRef.current.style.setProperty('--my', `${clampedY}%`);
      }
      if (deformation) {
        updateDisplacementFromPercent(clampedX, clampedY);
      }
    } else {
      // fixed center
      targetPctRef.current = { x: 50, y: 50 };
      currentPctRef.current = { x: 50, y: 50 };
      runtimeLensRadiusPxRef.current = lensRadiusPx;
      if (wrapperRef.current) {
        wrapperRef.current.style.setProperty('--mx', `50%`);
        wrapperRef.current.style.setProperty('--my', `50%`);
      }
      if (deformation) {
        updateDisplacementFromPercent(50, 50);
      }
    }
    // On enter, don't show effect until fast movement is detected
    targetScaleRef.current = 0;
    startAnimLoopIfNeeded();
  }, [cursorFollow, deformation, distortionScale, startAnimLoopIfNeeded]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!wrapperRef.current) return;
    if (cursorFollow) {
      const rect = wrapperRef.current.getBoundingClientRect();
      const px = ((e.clientX - rect.left) / rect.width) * 100;
      const py = ((e.clientY - rect.top) / rect.height) * 100;
      const clampedX = Math.max(0, Math.min(100, px));
      const clampedY = Math.max(0, Math.min(100, py));
      targetPctRef.current = { x: clampedX, y: clampedY };

      // compute cursor speed in px/ms and map to a radius factor
      const now = performance.now();
      const prev = lastMouseEventRef.current;
      lastMouseEventRef.current = { x: e.clientX, y: e.clientY, t: now };
      if (prev) {
        const dt = Math.max(1, now - prev.t);
        const dist = Math.hypot(e.clientX - prev.x, e.clientY - prev.y);
        const speed = dist / dt; // px per ms
        const fastMin = 0.6; // speed threshold to enable effect
        // keep constant radius (no shrinking)
        runtimeLensRadiusPxRef.current = lensRadiusPx;
        // Only apply distortion when moving fast enough
        targetScaleRef.current = deformation && speed >= fastMin ? distortionScale : 0;
      } else {
        runtimeLensRadiusPxRef.current = lensRadiusPx;
        targetScaleRef.current = 0;
      }
    } else {
      // fixed center; keep radius base
      targetPctRef.current = { x: 50, y: 50 };
      // compute speed even in center mode for gating
      const now = performance.now();
      const prev = lastMouseEventRef.current;
      lastMouseEventRef.current = { x: e.clientX, y: e.clientY, t: now };
      let speed = 0;
      if (prev) {
        const dt = Math.max(1, now - prev.t);
        const dist = Math.hypot(e.clientX - prev.x, e.clientY - prev.y);
        speed = dist / dt;
      }
      const fastMin = 0.6;
      runtimeLensRadiusPxRef.current = lensRadiusPx;
      targetScaleRef.current = deformation && speed >= fastMin ? distortionScale : 0;
    }

    startAnimLoopIfNeeded();
  }, [cursorFollow, deformation, distortionScale, startAnimLoopIfNeeded, lensRadiusPx]);

  const handleMouseLeave = useCallback(() => {
    setIsHover(false);
    targetScaleRef.current = 0;
    startAnimLoopIfNeeded();
  }, [startAnimLoopIfNeeded]);

  const overlayOpacity = useMemo(() => {
    const clamped = Math.max(0, Math.min(1, intensity));
    return clamped;
  }, [intensity]);

  // init offscreen canvas once
  useEffect(() => {
    if (!canvasRef.current) {
      const c = document.createElement('canvas');
      c.width = 512;
      c.height = 512;
      canvasRef.current = c;
    }
  }, []);

  // keep wrapper size for radius scaling
  useEffect(() => {
    if (!wrapperRef.current) return;
    const el = wrapperRef.current;
    const measure = () => {
      const r = el.getBoundingClientRect();
      sizeRef.current = { w: r.width, h: r.height };
      // adjust canvas resolution based on element size and devicePixelRatio (clamped)
      if (canvasRef.current) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const target = Math.min(1024, Math.max(256, Math.max(r.width, r.height) * 1.0 * dpr));
        // keep square canvas; DP-friendly dimension
        const dim = Math.round(target);
        if (canvasRef.current.width !== dim || canvasRef.current.height !== dim) {
          canvasRef.current.width = dim;
          canvasRef.current.height = dim;
          // regenerate current map at last position
          updateDisplacementFromPercent(lastPctRef.current.x, lastPctRef.current.y);
        }
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const updateDisplacementFromPercent = useCallback((xPct: number, yPct: number) => {
    const c = canvasRef.current;
    const imgEl = feImageRef.current;
    if (!c || !imgEl) return;

    const cw = c.width;
    const ch = c.height;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const { w: ew, h: eh } = sizeRef.current;

    // map lens radius from element px to canvas px
    const effectiveR = runtimeLensRadiusPxRef.current || lensRadiusPx;
    const rx = Math.max(8, (effectiveR * cw) / Math.max(ew, 1));
    const ry = Math.max(8, (effectiveR * ch) / Math.max(eh, 1));

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
          // smooth falloff: stronger at center, zero at edge
          const r = Math.sqrt(r2);
          // eased falloff to reduce sharp transitions (cubic)
          s = 1 - r;
          s = s * s * (3 - 2 * s); // smoothstep
        }
        // encode vector field into R (x) and G (y). 128 is neutral.
        const xr = 128 + dx * s * 127;
        const yg = 128 + dy * s * 127;
        data[idx] = xr; // R
        data[idx + 1] = yg; // G
        data[idx + 2] = 0; // B unused
        data[idx + 3] = 255; // A
      }
    }
    ctx.putImageData(img, 0, 0);
    const url = c.toDataURL('image/png');
    imgEl.setAttribute('href', url);
  }, [lensRadiusPx]);

  // initialize neutral displacement
  useEffect(() => {
    if (!deformation) return;
    updateDisplacementFromPercent(50, 50);
  }, [deformation, updateDisplacementFromPercent]);

  return (
    <div
      ref={wrapperRef}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative ${className ?? ''}`}
      style={{
        aspectRatio: aspectRatio,
        '--mx': '50%',
        '--my': '50%',
        '--blurPx': `${blurPx}px`,
        '--sizePx': `${highlightSizePx}px`,
        '--op': overlayOpacity,
      } as React.CSSProperties}>
      {/* SVG rendering to allow displacement filter on the image */}
      <svg className="w-full h-full block" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id={filterId} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="linearRGB">
            {/* dynamic displacement map driven by offscreen canvas */}
            <feImage
              ref={feImageRef}
              x="0"
              y="0"
              width="100%"
              height="100%"
              preserveAspectRatio="none"
              result="map"
            />
            {/* Blur the map to eliminate banding/stepping artifacts */}
            <feGaussianBlur in="map" stdDeviation={mapBlurStd} result="smap" />
            <feDisplacementMap
              ref={feDispRef}
              in="SourceGraphic"
              in2="smap"
              scale={0}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
        <image
          href={src}
          x="0"
          y="0"
          width="100%"
          height="100%"
          preserveAspectRatio="xMidYMid slice"
          filter={deformation ? `url(#${filterId})` : undefined}
        />
      </svg>
      {baseEffect ? (
        <span className="pointer-events-none absolute inset-0" aria-hidden>
          {/* Base Layer 1: soft center highlight */}
          <span
            className="absolute inset-0"
            style={{
              mixBlendMode: 'soft-light',
              background:
                `radial-gradient( closest-side circle at 50% 50%, rgba(255,255,255,${overlayOpacity}) 0%, rgba(255,255,255,${overlayOpacity * 0.4}) 30%, transparent 60% )`,
              filter: 'saturate(1.04)',
            }}
          />
          {/* Base Layer 2: vignette */}
          <span
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient( farthest-side circle at 50% 50%, rgba(255,255,255,0) 0%, rgba(255,255,255,0) 50%, rgba(0,0,0,0.12) 100% )',
              mixBlendMode: 'overlay',
              filter: 'contrast(1.03) saturate(1.03)',
            }}
          />
          {/* Base Layer 3: subtle bloom */}
          <span
            className="absolute inset-0"
            style={{
              background:
                `radial-gradient( circle ${highlightSizePx}px at 50% 50%, rgba(255,255,255,0.28), rgba(255,255,255,0) 70% )`,
              filter: `blur(${blurPx}px)`,
              opacity: 0.55,
              mixBlendMode: 'screen',
            }}
          />
        </span>
      ) : null}
    </div>
  );
}


