'use client';

import { useEffect, useState } from 'react';

export default function LogoInline({
  src = '/header.svg',
  width = 200,
  height = 65,
  className,
  playTrigger,
}: {
  src?: string;
  width?: number;
  height?: number;
  className?: string;
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
    <span
      className={`logo-inline block ${className ?? ''}`}
      style={{ width, height, lineHeight: 0 }}
      aria-label="SCHEME.Forgroup logo"
      role="img"
      suppressHydrationWarning>
      {markup ? (
        <span
          // Ensure the inline SVG scales and inherits currentColor
          style={{ display: 'block' }}
          dangerouslySetInnerHTML={{ __html: markup }}
        />
      ) : null}
      <style jsx>{`
        .logo-inline :global(svg) {
          display: block;
          width: 100%;
          height: 100%;
        }
        /* Make fills inherit text color, even if SVG uses presentation attributes */
        .logo-inline :global(svg *) {
          fill: currentColor !important;
          stroke: currentColor;
        }
      `}</style>
    </span>
  );
}
