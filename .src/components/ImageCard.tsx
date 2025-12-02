'use client';

import React from 'react';
import HoverDistortImage from './HoverDistortImage';

export default function ImageCard({
  projectId,
  verticalSrc,
  horizontalSrc,
  orientation = 'vertical',
  className,
  onClickProject,
  aspectRatio,
  enableHoverEffect = true,
}: {
  projectId?: string | number;
  verticalSrc?: string; // 3:4 이미지 URL
  horizontalSrc?: string; // 4:3 이미지 URL
  orientation?: 'vertical' | 'horizontal';
  className?: string;
  aspectRatio?: string; // 선택적으로 강제 비율, 예: "3 / 4" | "4 / 3"
  onClickProject?: (projectId?: string | number) => void;
  enableHoverEffect?: boolean;
}) {
  const hasVertical = Boolean(verticalSrc);
  const hasHorizontal = Boolean(horizontalSrc);
  const resolvedOrientation =
    orientation ?? (hasVertical ? 'vertical' : hasHorizontal ? 'horizontal' : 'vertical');
  const src =
    resolvedOrientation === 'vertical'
      ? verticalSrc ?? horizontalSrc
      : horizontalSrc ?? verticalSrc;
  const computedAspect =
    aspectRatio ?? (resolvedOrientation === 'vertical' ? '3 / 4' : '4 / 3');

  const handleClick = () => {
    if (onClickProject) {
      onClickProject(projectId);
    } else {
      // fallback: 전역 이벤트로 프로젝트 id 알림
      window.dispatchEvent(
        new CustomEvent('image-card-click', {
          detail: { projectId },
        }),
      );
    }
  };

  if (!src) return null;

  const imageContent = enableHoverEffect ? (
    <HoverDistortImage
      src={src}
      aspectRatio={computedAspect}
      className="w-full h-full object-cover"
      preserveAspect="xMidYMid slice"
    />
  ) : (
    <img
      src={src}
      alt=""
      className="w-full h-auto object-cover block"
      draggable={false}
      style={{ aspectRatio: computedAspect }}
    />
  );

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`block relative ${className ?? ''}`}
      style={{ aspectRatio: computedAspect, lineHeight: 0, cursor: 'pointer' }}
      aria-label={projectId ? `Open project ${projectId}` : 'Open project'}>
      {imageContent}
    </button>
  );
}


