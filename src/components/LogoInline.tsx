'use client';

import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

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
  const [markup, setMarkup] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setMarkup(null);
    fetch(src, { cache: 'force-cache' })
      .then((r) => r.text())
      .then((text) => {
        if (!active) return;
        setMarkup(text);
      })
      .catch(() => {
        // noop: on error, keep markup null
      });
    return () => {
      active = false;
    };
  }, [src, playTrigger]);

  return (
    <div
      className="logo-inline flex items-center justify-center overflow-hidden"
      style={{ width, height }}
      aria-label="SCHEME.Forgroup logo"
      role="img"
      suppressHydrationWarning>
      {markup ? (
        <div className="flex scale-180 items-center justify-center" dangerouslySetInnerHTML={{ __html: markup }} />
      ) : null}
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
