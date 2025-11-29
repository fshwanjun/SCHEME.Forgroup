'use client';

import React from 'react';
import HoverDistortImage from './HoverDistortImage';
import Image from 'next/image';
import { IMAGE_CARD_CONFIG, APP_CONFIG } from '@/config/appConfig';

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

  const altText = projectId ? `Project ${projectId} preview` : 'Project preview';
  const [width, height] =
    resolvedOrientation === 'vertical'
      ? [IMAGE_CARD_CONFIG.vertical.width, IMAGE_CARD_CONFIG.vertical.height]
      : [IMAGE_CARD_CONFIG.horizontal.width, IMAGE_CARD_CONFIG.horizontal.height];

  // 이미지 컴포넌트 렌더링 추적
  // console.log('[ImageCard] render', {
  //   projectId,
  //   enableHoverEffect,
  //   src,
  //   timestamp: Date.now(),
  // });

  // 깜빡임 방지: enableHoverEffect가 변경되어도 HoverDistortImage를 유지하고 distortionEnabled만 제어
  const imageContent = (
    <HoverDistortImage
      src={src}
      alt={altText}
      aspectRatio={computedAspect}
      className="h-full w-full object-cover"
      preserveAspect="xMidYMid slice"
      distortionEnabled={enableHoverEffect}
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
