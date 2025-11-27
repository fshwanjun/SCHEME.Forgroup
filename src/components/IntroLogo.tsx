'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import LogoInline from './LogoInline';

type IntroLogoPhase = 'enter' | 'logo-exit' | 'overlay-exit' | 'hidden';

const LOGO_EXIT_DURATION = 600; // ms
const OVERLAY_FADE_DURATION = 1500; // ms

export default function IntroLogo({
  duration = 8000,
  onComplete,
  onHeaderAnimationStart,
}: {
  duration?: number;
  onComplete?: () => void;
  onHeaderAnimationStart?: () => void;
}) {
  const [phase, setPhase] = useState<IntroLogoPhase>('enter');

  useEffect(() => {
    const overlayStart = Math.max(0, duration - OVERLAY_FADE_DURATION);
    const logoStart = Math.max(0, overlayStart - LOGO_EXIT_DURATION);

    const logoTimer = window.setTimeout(() => {
      setPhase('logo-exit');
      // 헤더 애니메이션을 logo-exit 단계에서 시작
      onHeaderAnimationStart?.();
    }, logoStart);
    const overlayTimer = window.setTimeout(() => {
      setPhase('overlay-exit');
    }, overlayStart);
    const hideTimer = window.setTimeout(() => {
      setPhase('hidden');
      onComplete?.();
    }, overlayStart + OVERLAY_FADE_DURATION);

    return () => {
      window.clearTimeout(logoTimer);
      window.clearTimeout(overlayTimer);
      window.clearTimeout(hideTimer);
    };
  }, [duration, onComplete, onHeaderAnimationStart]);

  useEffect(() => {
    if (phase !== 'hidden') {
      document.body.style.setProperty('overflow', 'hidden', 'important');
      document.documentElement.style.setProperty('overflow', 'hidden', 'important');
    } else {
      document.body.style.removeProperty('overflow');
      document.documentElement.style.removeProperty('overflow');
      // 일부 브라우저 호환성을 위한 fallback
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }

    return () => {
      document.body.style.removeProperty('overflow');
      document.documentElement.style.removeProperty('overflow');
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [phase]);

  if (phase === 'hidden') {
    return null;
  }

  const overlayClass = cn('intro-logo-overlay', phase === 'overlay-exit' && 'intro-logo-overlay--exit');
  const logoClass = cn(
    'intro-logo-logo p-4 max-w-2xl',
    (phase === 'logo-exit' || phase === 'overlay-exit') && 'intro-logo-logo--exit',
  );

  return (
    <div className={overlayClass}>
      <div className={logoClass}>
        <LogoInline />
      </div>
    </div>
  );
}
