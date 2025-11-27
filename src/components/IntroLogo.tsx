'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import LogoInline from './LogoInline';
import { INTRO_LOGO_CONFIG } from '@/config/appConfig';

type IntroLogoPhase = 'enter' | 'logo-exit' | 'overlay-exit' | 'hidden';

export default function IntroLogo({
  duration = INTRO_LOGO_CONFIG.defaultDuration,
  onComplete,
  onHeaderAnimationStart,
}: {
  duration?: number;
  onComplete?: () => void;
  onHeaderAnimationStart?: () => void;
}) {
  const [phase, setPhase] = useState<IntroLogoPhase>('enter');

  useEffect(() => {
    const overlayStart = Math.max(0, duration - INTRO_LOGO_CONFIG.overlayFadeDuration);
    const logoStart = Math.max(0, overlayStart - INTRO_LOGO_CONFIG.logoExitDuration);

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
    }, overlayStart + INTRO_LOGO_CONFIG.overlayFadeDuration);

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
