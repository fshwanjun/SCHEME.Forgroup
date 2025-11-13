'use client';

import React, { useCallback, useEffect, useId, useRef } from 'react';

export default function HoverDistortImage({
  src,
  alt = '',
  className,
  aspectRatio,
  distortionScale = 160, // strength of distortion
  radiusPx = 120, // lens radius in element pixels
  blurStd = 2, // blur on displacement map to avoid banding
  preserveAspect = 'xMaxYMax',
}: {
  src: string;
  alt?: string;
  className?: string;
  aspectRatio?: string; // e.g. "3 / 4"
  distortionScale?: number;
  radiusPx?: number;
  blurStd?: number;
  preserveAspect?: 'none' | 'xMinYMin' | 'xMidYMin' | 'xMaxYMin' | 'xMinYMid' | 'xMidYMid' | 'xMaxYMid' | 'xMinYMax' | 'xMidYMax' | 'xMaxYMax' | 'xMinYMin slice' | 'xMidYMin slice' | 'xMaxYMin slice' | 'xMinYMid slice' | 'xMidYMid slice' | 'xMaxYMid slice' | 'xMinYMax slice' | 'xMidYMax slice' | 'xMaxYMax slice';
}) {
  const id = useId().replace(/:/g, '-');
  const filterId = `hover-distort-${id}`;

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const feImageRef = useRef<SVGFEImageElement | null>(null);
  const feDispRef = useRef<SVGFEDisplacementMapElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const elemSizeRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 });
  const animRafRef = useRef<number | null>(null);
  const animatingRef = useRef<boolean>(false);
  const currentScaleRef = useRef<number>(0);
  const targetScaleRef = useRef<number>(0);
  const currentPctRef = useRef<{ x: number; y: number }>({ x: 50, y: 50 });
  const targetPctRef = useRef<{ x: number; y: number }>({ x: 50, y: 50 });

  // Create offscreen canvas once
  useEffect(() => {
    if (!canvasRef.current) {
      const c = document.createElement('canvas');
      c.width = 512;
      c.height = 512;
      canvasRef.current = c;
    }
  }, []);

  // Track element size and adjust canvas resolution
  useEffect(() => {
    if (!wrapperRef.current) return;
    const el = wrapperRef.current;
    const measure = () => {
      const r = el.getBoundingClientRect();
      elemSizeRef.current = { w: r.width, h: r.height };
      if (canvasRef.current) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const target = Math.min(1024, Math.max(256, Math.max(r.width, r.height) * dpr));
        const dim = Math.round(target);
        if (canvasRef.current.width !== dim || canvasRef.current.height !== dim) {
          canvasRef.current.width = dim;
          canvasRef.current.height = dim;
        }
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const updateDisplacementMap = useCallback((xPct: number, yPct: number) => {
    const c = canvasRef.current;
    const imgEl = feImageRef.current;
    if (!c || !imgEl) return;
    const cw = c.width;
    const ch = c.height;
    const ctx = c.getContext('2d');
    if (!ctx) return;

    const { w: ew, h: eh } = elemSizeRef.current;
    const rx = Math.max(6, (radiusPx * cw) / Math.max(ew, 1));
    const ry = Math.max(6, (radiusPx * ch) / Math.max(eh, 1));
    const cx = (xPct / 100) * cw;
    const cy = (yPct / 100) * ch;

    const img = ctx.createImageData(cw, ch);
    const data = img.data;
    // neutral 128,128 outside lens; smoothstep falloff inside
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
  }, [radiusPx]);

  const startAnimIfNeeded = useCallback(() => {
    if (animatingRef.current) return;
    animatingRef.current = true;
    const step = () => {
      // ease position
      const cp = currentPctRef.current;
      const tp = targetPctRef.current;
      const nx = cp.x + (tp.x - cp.x) * 0.2;
      const ny = cp.y + (tp.y - cp.y) * 0.2;
      currentPctRef.current = { x: nx, y: ny };
      updateDisplacementMap(nx, ny);
      // ease scale
      const cs = currentScaleRef.current;
      const ts = targetScaleRef.current;
      const ns = cs + (ts - cs) * 0.2;
      currentScaleRef.current = ns;
      if (feDispRef.current) {
        feDispRef.current.setAttribute('scale', ns.toFixed(2));
      }
      // stop when both close to targets
      const nearPos = Math.hypot(tp.x - nx, tp.y - ny) < 0.05;
      const nearScale = Math.abs(ts - ns) < 0.1;
      if (nearPos && nearScale) {
        animatingRef.current = false;
        animRafRef.current = null;
        return;
      }
      animRafRef.current = requestAnimationFrame(step);
    };
    animRafRef.current = requestAnimationFrame(step);
  }, [updateDisplacementMap]);

  const handleEnter = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * 100;
    const py = ((e.clientY - rect.top) / rect.height) * 100;
    targetPctRef.current = { x: px, y: py };
    targetScaleRef.current = distortionScale;
    startAnimIfNeeded();
  }, [distortionScale, startAnimIfNeeded]);

  const handleMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * 100;
    const py = ((e.clientY - rect.top) / rect.height) * 100;
    targetPctRef.current = { x: px, y: py };
    targetScaleRef.current = distortionScale;
    startAnimIfNeeded();
  }, [distortionScale, startAnimIfNeeded]);

  const handleLeave = useCallback(() => {
    targetScaleRef.current = 0;
    startAnimIfNeeded();
  }, [startAnimIfNeeded]);

  return (
    <div
      ref={wrapperRef}
      onMouseEnter={handleEnter}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className={`relative ${className ?? ''}`}
      style={{
        aspectRatio: aspectRatio,
        lineHeight: 0,
      } as React.CSSProperties}>
      <svg className="w-full h-full block" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id={filterId} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
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
        </defs>
        <image
          href={src}
          x="0"
          y="0"
          width="100%"
          height="100%"
          preserveAspectRatio={preserveAspect}
          filter={`url(#${filterId})`}
        />
      </svg>
    </div>
  );
}


