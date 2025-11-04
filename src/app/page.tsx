'use client';

import { useCallback, useMemo, useState } from 'react';
import InfiniteScroll, { InfiniteScrollEndHandler } from '@/util';
import SteppedRow, { type Aspect } from '@/components/SteppedRow';

// Manage widths and aspects here per image id
const IMAGE_LAYOUT_CONFIG: Record<string, { widthPercent?: number; aspect: Aspect }> = {
  'main-0': { widthPercent: 24, aspect: '3/4' },
  'main-1': { widthPercent: 18, aspect: '3/4' },
  'main-2': { widthPercent: 24, aspect: '4/3' },
  'main-3': { aspect: '3/4' },
};

const IMAGE_ORDER = ['main-0', 'main-1', 'main-2', 'main-3'] as const;

export default function Home() {
  const [state, setState] = useState(1);

  const list = useMemo(
    () =>
      Array.from({ length: state * 5 }).map((_, j) => (
        <>
          <SteppedRow
            key={j}
            spacing={40}
            direction="rtl"
            items={IMAGE_ORDER.map((id) => ({
              src: `./images/main/${id}.jpg`,
              widthPercent: IMAGE_LAYOUT_CONFIG[id].widthPercent,
              aspect: IMAGE_LAYOUT_CONFIG[id].aspect,
            }))}
          />
          <SteppedRow
            key={j}
            spacing={40}
            direction="ltr"
            items={IMAGE_ORDER.map((id) => ({
              src: `./images/main/${id}.jpg`,
              widthPercent: IMAGE_LAYOUT_CONFIG[id].widthPercent,
              aspect: IMAGE_LAYOUT_CONFIG[id].aspect,
            }))}
          />
        </>
      )),
    [state],
  );

  const handleEnd = useCallback<InfiniteScrollEndHandler>(() => {
    setState((state) => state + 1);
  }, []);

  return (
    <div className="flex">
      <InfiniteScroll onEnd={handleEnd} rootMargin="0px 0px 300px 0px">
        <div className="flex flex-col">{list}</div>
      </InfiniteScroll>
    </div>
  );
}
