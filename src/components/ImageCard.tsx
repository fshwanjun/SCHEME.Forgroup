'use client';

import React from 'react';
import HoverDistortImage from './HoverDistortImage';
import Image from 'next/image';

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
  onClickProject?: (projectId?: string | number, rect?: DOMRect) => void;
  enableHoverEffect?: boolean;
}) {
  const hasVertical = Boolean(verticalSrc);
  const hasHorizontal = Boolean(horizontalSrc);
  const resolvedOrientation = orientation ?? (hasVertical ? 'vertical' : hasHorizontal ? 'horizontal' : 'vertical');
  const src = resolvedOrientation === 'vertical' ? (verticalSrc ?? horizontalSrc) : (horizontalSrc ?? verticalSrc);
  const computedAspect = aspectRatio ?? (resolvedOrientation === 'vertical' ? '3 / 4' : '4 / 3');

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
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

  if (!src) return null;

  const imageContent = enableHoverEffect ? (
    <HoverDistortImage
      src={src}
      aspectRatio={computedAspect}
      className="h-full w-full object-cover"
      preserveAspect="xMidYMid slice"
    />
  ) : (
    <Image
      src={src}
      alt="Image"
      width={100}
      height={100}
      className="block h-auto w-full object-cover"
      draggable={false}
    />
  );

  return (
    <div
      id={projectId ? `project-${projectId}` : undefined}
      onClick={handleClick}
      className={`relative block ${className ?? ''}`}
      style={{ aspectRatio: computedAspect, lineHeight: 0, cursor: 'pointer' }}
      aria-label={projectId ? `Open project ${projectId}` : 'Open project'}>
      {imageContent}
    </div>
  );
}
