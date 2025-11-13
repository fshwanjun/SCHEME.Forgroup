'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import useWindowSize from '@/util/useWindowSize';
import ImageCard from './ImageCard';

export type Aspect = `${number}/${number}`;

export type SteppedItem = {
  src: string;
  aspect: Aspect;
  widthPercent?: number;
  projectId?: string | number;
  src3x4?: string; // 세로형 3:4
  src4x3?: string; // 가로형 4:3
};

export type FrameRule = {
  projectId?: string | number;
  orientation?: 'vertical' | 'horizontal';
  widthPercent?: number;
  aspect?: Aspect;
};

type EnrichedItem = SteppedItem & {
  orientation: 'vertical' | 'horizontal';
};

function getHeightFactor(aspect: Aspect): number {
  const [wStr, hStr] = aspect.split('/') as [string, string];
  const w = Number(wStr);
  const h = Number(hStr);
  if (!isFinite(w) || !isFinite(h) || w === 0) return 1;
  return h / w;
}

export default function SteppedRow({
  items,
  spacing = 20,
  outerSubtractPx = 40,
  frameRules,
  direction = 'rtl',
  className,
}: {
  items: SteppedItem[];
  spacing?: number;
  outerSubtractPx?: number;
  frameRules?: FrameRule[];
  direction?: 'rtl' | 'ltr';
  itemsPerRow?: number;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { width: windowWidth } = useWindowSize();
  const [layout, setLayout] = useState<{
    widths: number[];
    heights: number[];
    tops: number[];
    rights: number[];
    containerHeight: number;
  } | null>(null);

  const enrichedItems = useMemo<EnrichedItem[]>(() => {
    return items.map((item, index) => {
      const frame = frameRules?.[index];
      const orientation =
        frame?.orientation ?? (item.aspect === '3/4' ? 'vertical' : 'horizontal');
      const derivedAspect: Aspect =
        frame?.aspect ??
        (frame?.orientation
          ? frame.orientation === 'vertical'
            ? '3/4'
            : '4/3'
          : item.aspect);
      return {
        ...item,
        aspect: derivedAspect,
        widthPercent: frame?.widthPercent ?? item.widthPercent,
        projectId: frame?.projectId ?? item.projectId ?? index,
        src3x4: item.src3x4 ?? item.src,
        src4x3: item.src4x3 ?? item.src,
        orientation,
      } as EnrichedItem;
    });
  }, [items, frameRules]);

  useEffect(() => {
    const el = containerRef.current;
    const computedFromWindow = Math.max(0, windowWidth - outerSubtractPx);
    const containerWidth = computedFromWindow || el?.clientWidth || 0;
    if (!containerWidth) {
      setLayout(null);
      return;
    }

    // Compute missing widthPercent when exactly one item omits it
    const providedPercents = enrichedItems
      .map((it) => it.widthPercent)
      .filter((v): v is number => typeof v === 'number');
    let computedPercents: number[] = enrichedItems.map((it) => it.widthPercent ?? NaN);
    const missingIndexes = computedPercents.map((v, idx) => (Number.isNaN(v) ? idx : -1)).filter((idx) => idx >= 0);

    if (missingIndexes.length === 1) {
      const sumProvided = providedPercents.reduce((acc, v) => acc + v, 0);
      const leftover = Math.max(0, 100 - sumProvided);
      computedPercents[missingIndexes[0]] = leftover;
    }

    // Fallback: if none or multiple missing, coerce NaN to 0 to avoid NaN widths
    computedPercents = computedPercents.map((v) => (Number.isFinite(v) ? v : 0));

    // Only between-item gaps; no extra on outer ends inside the row container
    const contentWidth = Math.max(0, containerWidth - (enrichedItems.length - 1) * spacing);

    const widths = computedPercents.map((p) => (contentWidth * p) / 100);
    const heights = enrichedItems.map((it, idx) => widths[idx] * getHeightFactor(it.aspect));

    const rights: number[] = [];
    const tops: number[] = [];

    let accWidth = 0;
    let accHeight = 0;
    items.forEach((_, i) => {
      rights[i] = accWidth + i * spacing; // right-aligned, no extra outer gap
      tops[i] = accHeight + i * spacing;
      accWidth += widths[i];
      accHeight += heights[i];
    });

    const containerHeight = accHeight + (enrichedItems.length - 1) * spacing;

    setLayout({ widths, heights, tops, rights, containerHeight });
  }, [enrichedItems, items.length, spacing, outerSubtractPx, windowWidth]);

  const containerStyle = useMemo(() => {
    return {
      width: `calc(100vw - ${outerSubtractPx}px)`,
      height: layout?.containerHeight ?? undefined,
    } as React.CSSProperties;
  }, [layout?.containerHeight, outerSubtractPx]);

  return (
    <div ref={containerRef} className={`w-full relative${className ? ` ${className}` : ''}`} style={containerStyle}>
      {enrichedItems.map((it, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            right: direction === 'rtl' && layout ? `${layout.rights[i]}px` : undefined,
            left: direction === 'ltr' && layout ? `${layout.rights[i]}px` : undefined,
            top: layout ? `${layout.tops[i]}px` : undefined,
            width: layout
              ? `${layout.widths[i]}px`
              : typeof it.widthPercent === 'number'
              ? `${it.widthPercent}%`
              : undefined,
          }}>
          <ImageCard
            projectId={it.projectId ?? i}
            verticalSrc={it.src3x4 ?? it.src}
            horizontalSrc={it.src4x3 ?? it.src}
            orientation={it.orientation}
            className="w-full"
            aspectRatio={it.aspect.replace('/', ' / ')}
          />
        </div>
      ))}
    
    </div>
  );
}
