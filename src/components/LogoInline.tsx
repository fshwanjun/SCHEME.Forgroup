'use client';

import { cn } from '@/lib/utils';
import { useEffect, useState, useMemo } from 'react';

// SVG 마크업을 전역적으로 캐싱하여 재로드 방지
const svgCache = new Map<string, string>();

export default function LogoInline({
  src = '/header.svg',
  width = 300,
  height = 200,
  playTrigger,
}: {
  src?: string;
  width?: number;
  height?: number;
  playTrigger?: number | string;
}) {
  const [markup, setMarkup] = useState<string | null>(() => svgCache.get(src) || null);

  useEffect(() => {
    // 이미 캐시에 있으면 다시 로드하지 않음
    const cached = svgCache.get(src);
    if (cached) {
      setMarkup(cached);
      return;
    }

    // 캐시에 없으면 로드
    let active = true;
    fetch(src, { cache: 'force-cache' })
      .then((r) => r.text())
      .then((text) => {
        if (!active) return;
        svgCache.set(src, text);
        setMarkup(text);
      })
      .catch(() => {
        // noop: on error, keep markup null
      });
    return () => {
      active = false;
    };
  }, [src]); // playTrigger 제거 - 애니메이션 재시작 방지

  // 마크업이 변경되지 않는 한 같은 요소를 유지하여 애니메이션 재시작 방지
  const svgContent = useMemo(() => {
    if (!markup) return null;
    return <div className="flex scale-180 items-center justify-center" dangerouslySetInnerHTML={{ __html: markup }} />;
  }, [markup]);

  return (
    <div
      className="logo-inline flex items-center justify-center overflow-hidden"
      style={{ width, height }}
      aria-label="SCHEME.Forgroup logo"
      role="img"
      suppressHydrationWarning>
      {svgContent}
      <style jsx>{`
        .logo-inline :global(svg) {
          display: block;
          height: 100%;
        }
        /* Make fills inherit text color, even if SVG uses presentation attributes */
        .logo-inline :global(svg *) {
          fill: currentColor !important;
          stroke: currentColor;
        }
      `}</style>
    </div>
  );
}
