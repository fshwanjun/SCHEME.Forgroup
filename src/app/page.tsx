'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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
  const [showIntro, setShowIntro] = useState<boolean>(false);
  const [introPhase, setIntroPhase] = useState<'idle' | 'playing' | 'fading' | 'done'>('idle');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setShowIntro(true);
    setIntroPhase('playing');
    // Extended intro timings
    const INTRO_PLAY_MS = 6100; // logo motion duration before fade
    const FADE_MS = 1300; // fade out duration
    const t1 = setTimeout(() => {
      setIntroPhase('fading');
      // trigger header logo play aligned with home reveal
      window.dispatchEvent(new Event('header-logo-play'));
    }, INTRO_PLAY_MS);
    const t2 = setTimeout(() => {
      setIntroPhase('done');
      setShowIntro(false);
    }, INTRO_PLAY_MS + FADE_MS);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  const list = useMemo(
    () =>
      Array.from({ length: state * 5 }).map((_, j) => (
        <div key={j}>
          <SteppedRow
            spacing={40}
            direction="rtl"
            items={IMAGE_ORDER.map((id) => ({
              src: `./images/main/${id}.jpg`,
              widthPercent: IMAGE_LAYOUT_CONFIG[id].widthPercent,
              aspect: IMAGE_LAYOUT_CONFIG[id].aspect,
            }))}
          />
          <SteppedRow
            spacing={40}
            direction="ltr"
            items={IMAGE_ORDER.map((id) => ({
              src: `./images/main/${id}.jpg`,
              widthPercent: IMAGE_LAYOUT_CONFIG[id].widthPercent,
              aspect: IMAGE_LAYOUT_CONFIG[id].aspect,
            }))}
          />
        </div>
      )),
    [state],
  );

  const handleEnd = useCallback<InfiniteScrollEndHandler>(() => {
    setState((state) => state + 1);
  }, []);

  return (
    <div className="flex relative">
      {/* Intro overlay */}
      {showIntro ? (
        <div
          className={`fixed inset-0 bg-white z-[200] transition-opacity duration-1000 ${
            introPhase === 'fading' ? 'opacity-0' : 'opacity-100'
          }`}
          aria-hidden>
          <div className="w-full h-full flex items-center justify-center">
            {/* Centered logo; reuse the same asset the header uses to keep motion consistent */}
            <img
              className={`w-[50vw] h-[30vh] transform transition-transform duration-600 ease-out ${
                introPhase === 'fading' ? 'scale-0' : 'scale-100'
              }`}
              src="/header.svg"
              alt="intro logo"
              draggable={false}
            />
          </div>
        </div>
      ) : null}
      {/* Home content container fades in when intro ends */}
      <div
        className={`flex flex-1 transition-opacity duration-1000 ${
          introPhase === 'idle' || introPhase === 'playing' ? 'opacity-0' : 'opacity-100'
        }`}>
        <InfiniteScroll onEnd={handleEnd} rootMargin="0px 0px 300px 0px">
          <div className="flex flex-col">{list}</div>
        </InfiniteScroll>
      </div>
    </div>
  );
}
