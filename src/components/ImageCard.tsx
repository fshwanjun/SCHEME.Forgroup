'use client';

import React, { useRef, useState, useEffect } from 'react';
import HoverDistortImage from './HoverDistortImage';
import { APP_CONFIG } from '@/config/appConfig';
import useWindowSize from '@/hooks/useWindowSize';

export default function ImageCard({
  projectId,
  verticalSrc,
  horizontalSrc,
  orientation = 'vertical',
  className,
  onClickProject,
  aspectRatio,
  enableHoverEffect = true,
  distortionScale,
  radiusPx,
  blurStd,
  easingFactor,
}: {
  projectId?: string | number;
  verticalSrc?: string; // 3:4 이미지 URL
  horizontalSrc?: string; // 4:3 이미지 URL
  orientation?: 'vertical' | 'horizontal';
  className?: string;
  aspectRatio?: string; // 선택적으로 강제 비율, 예: "3 / 4" | "4 / 3"
  onClickProject?: (projectId?: string | number, rect?: DOMRect) => void;
  enableHoverEffect?: boolean;
  distortionScale?: number; // distortion 효과 강도 (기본값: 500)
  radiusPx?: number; // 왜곡 반경 픽셀 (기본값: 400)
  blurStd?: number; // 블러 강도 (기본값: 80)
  easingFactor?: number; // 이징 팩터 (기본값: 0.08)
}) {
  const windowSize = useWindowSize();
  const [mounted, setMounted] = useState(false);

  // 클라이언트 사이드에서만 마운트 상태 설정 (hydration 불일치 방지)
  useEffect(() => {
    setMounted(true);
  }, []);

  // 모바일에서는 distortion 효과 비활성화
  // mounted 후에만 isMobile 체크하여 hydration 불일치 방지
  const isMobile = mounted && windowSize.isSm;
  const shouldEnableDistortion = enableHoverEffect && !isMobile;

  // 터치 이벤트 추적을 위한 ref
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const touchMovedRef = useRef<boolean>(false);
  // 중복 클릭 방지를 위한 ref (마지막 클릭 시간 추적)
  const lastClickTimeRef = useRef<number>(0);
  const CLICK_DEBOUNCE_MS = 500; // 500ms 내 중복 클릭 방지

  const hasVertical = Boolean(verticalSrc);
  const hasHorizontal = Boolean(horizontalSrc);
  const resolvedOrientation = orientation ?? (hasVertical ? 'vertical' : hasHorizontal ? 'horizontal' : 'vertical');
  const src = resolvedOrientation === 'vertical' ? (verticalSrc ?? horizontalSrc) : (horizontalSrc ?? verticalSrc);
  const computedAspect =
    aspectRatio ??
    (resolvedOrientation === 'vertical'
      ? APP_CONFIG.defaultAspectRatios.vertical
      : APP_CONFIG.defaultAspectRatios.horizontal);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // console.log('[ImageCard] handleClick called', {
    //   projectId,
    //   enableHoverEffect,
    //   src,
    //   timestamp: Date.now(),
    // });

    // 중복 클릭 방지: 마지막 클릭으로부터 500ms 이내면 무시
    const now = Date.now();
    if (now - lastClickTimeRef.current < CLICK_DEBOUNCE_MS) {
      return;
    }
    lastClickTimeRef.current = now;

    e.stopPropagation(); // 이벤트 전파 중단 (window 클릭 리스너 실행 방지)
    if (onClickProject) {
      onClickProject(projectId, e.currentTarget.getBoundingClientRect());
    } else {
      window.dispatchEvent(
        new CustomEvent('image-card-click', {
          detail: { projectId, rect: e.currentTarget.getBoundingClientRect() },
        }),
      );
    }
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    // 터치 시작 위치 저장
    const touch = e.touches[0];
    if (touch) {
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
      touchMovedRef.current = false;
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    // 터치 이동 거리 계산
    if (!touchStartRef.current) return;

    const touch = e.touches[0];
    if (touch) {
      const deltaX = Math.abs(touch.clientX - touchStartRef.current.x);
      const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      // 10px 이상 이동하면 스크롤로 간주
      if (distance > 10) {
        touchMovedRef.current = true;
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    e.stopPropagation(); // 터치 이벤트 전파 중단

    // 스크롤이었다면 클릭 처리 안 함
    if (touchMovedRef.current) {
      touchStartRef.current = null;
      touchMovedRef.current = false;
      return;
    }

    // 중복 클릭 방지: 마지막 클릭으로부터 500ms 이내면 무시
    const now = Date.now();
    if (now - lastClickTimeRef.current < CLICK_DEBOUNCE_MS) {
      touchStartRef.current = null;
      touchMovedRef.current = false;
      return;
    }
    lastClickTimeRef.current = now;

    // 클릭으로 간주하고 처리
    if (onClickProject) {
      onClickProject(projectId, e.currentTarget.getBoundingClientRect());
    } else {
      window.dispatchEvent(
        new CustomEvent('image-card-click', {
          detail: { projectId, rect: e.currentTarget.getBoundingClientRect() },
        }),
      );
    }

    // 리셋
    touchStartRef.current = null;
    touchMovedRef.current = false;
  };

  if (!src) return null;

  const altText = projectId ? `Project ${projectId} preview` : 'Project preview';

  // 이미지 컴포넌트 렌더링 추적
  // console.log('[ImageCard] render', {
  //   projectId,
  //   enableHoverEffect,
  //   src,
  //   timestamp: Date.now(),
  // });

  // 깜빡임 방지: enableHoverEffect가 변경되어도 HoverDistortImage를 유지하고 distortionEnabled만 제어
  // 모바일에서는 distortion 효과 비활성화
  const imageContent = (
    <HoverDistortImage
      src={src}
      alt={altText}
      aspectRatio={computedAspect}
      className="h-full w-full object-cover"
      preserveAspect="xMidYMid slice"
      distortionEnabled={shouldEnableDistortion}
      distortionScale={distortionScale}
      radiusPx={radiusPx}
      blurStd={blurStd}
      easingFactor={easingFactor}
    />
  );

  return (
    <div
      id={projectId ? `project-${projectId}` : undefined}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={`relative block ${className ?? ''}`}
      style={{ aspectRatio: computedAspect, lineHeight: 0, cursor: 'pointer' }}
      aria-label={projectId ? `Open project ${projectId}` : 'Open project'}>
      {imageContent}
    </div>
  );
}
