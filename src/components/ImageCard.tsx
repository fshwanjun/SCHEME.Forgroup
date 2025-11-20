'use client';

import { motion } from 'framer-motion';
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
  layoutId,
}: {
  projectId?: string | number;
  verticalSrc?: string; // 3:4 이미지 URL
  horizontalSrc?: string; // 4:3 이미지 URL
  orientation?: 'vertical' | 'horizontal';
  className?: string;
  aspectRatio?: string; // 선택적으로 강제 비율, 예: "3 / 4" | "4 / 3"
  onClickProject?: (projectId?: string | number, rect?: DOMRect) => void;
  enableHoverEffect?: boolean;
  layoutId?: string;
}) {
  const hasVertical = Boolean(verticalSrc);
  const hasHorizontal = Boolean(horizontalSrc);
  const resolvedOrientation = orientation ?? (hasVertical ? 'vertical' : hasHorizontal ? 'horizontal' : 'vertical');
  const src = resolvedOrientation === 'vertical' ? (verticalSrc ?? horizontalSrc) : (horizontalSrc ?? verticalSrc);
  const computedAspect = aspectRatio ?? (resolvedOrientation === 'vertical' ? '3 / 4' : '4 / 3');

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (onClickProject) {
      onClickProject(projectId, e.currentTarget.getBoundingClientRect());
    } else {
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
      className="h-full w-full object-cover"
      preserveAspect="xMidYMid slice"
    />
  ) : (
    <motion.img
      src={src}
      alt=""
      className="block h-auto w-full object-cover"
      draggable={false}
      style={{ aspectRatio: computedAspect }}
      layoutId={layoutId ? `${layoutId}-img` : undefined}
    />
  );

  return (
    <motion.div
      layoutId={layoutId}
      onClick={handleClick}
      className={`relative block ${className ?? ''}`}
      style={{ aspectRatio: computedAspect, lineHeight: 0, cursor: 'pointer' }}
      aria-label={projectId ? `Open project ${projectId}` : 'Open project'}>
      {imageContent}
    </motion.div>
  );
}
