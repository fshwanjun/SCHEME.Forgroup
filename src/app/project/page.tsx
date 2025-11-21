'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import ImageCard from '@/components/ImageCard';
import HomeContainer from '@/components/HomeContainer';
import Header from '@/components/Header';

const COVER_IMAGES = ['main_0', 'main_1', 'main_2', 'main_3'].map((id) => ({
  projectId: id,
  verticalSrc: `/images/main/${id}.jpeg`,
  horizontalSrc: `/images/main/${id}.jpeg`,
}));

const COVER_FRAMES: Array<{
  top: string;
  left?: string;
  right?: string;
  width: string;
  orientation: 'vertical' | 'horizontal';
  zIndex?: number;
}> = [
  { top: '0%', left: '60%', width: '38vw', orientation: 'vertical', zIndex: 3 },
  { top: '10%', left: '5%', width: '40vw', orientation: 'horizontal', zIndex: 1 },
  { top: '35%', left: '22%', width: '42vw', orientation: 'horizontal', zIndex: 2 },
  { top: '57%', left: '55%', width: '38vw', orientation: 'vertical', zIndex: 4 },
  { top: '60%', left: '10%', width: '22vw', orientation: 'vertical', zIndex: 4 },
  { top: '84%', left: '18%', width: '30vw', orientation: 'vertical', zIndex: 4 },
  { top: '105%', left: '58%', width: '35vw', orientation: 'horizontal', zIndex: 4 },
  { top: '115%', left: '14%', width: '35vw', orientation: 'vertical', zIndex: 4 },
  // { top: '72%', left: '38%', width: '20vw', orientation: 'vertical', zIndex: 3 },
  // { top: '20%', right: '5%', width: '20vw', orientation: 'horizontal', zIndex: 2 },
];

export default function ProjectPage() {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setExpanded(true), 80);
    return () => clearTimeout(t);
  }, []);

  const cards = useMemo(() => {
    return COVER_FRAMES.map((frame, index) => {
      const image = COVER_IMAGES[index % COVER_IMAGES.length];

      const baseStyle: CSSProperties = {
        width: frame.width,
        zIndex: frame.zIndex,
        transition:
          'top 900ms cubic-bezier(0.19, 1, 0.22, 1), left 900ms cubic-bezier(0.19, 1, 0.22, 1), right 900ms cubic-bezier(0.19, 1, 0.22, 1), transform 950ms cubic-bezier(0.19,1,0.22,1), opacity 700ms ease',
        transitionDelay: `${index * 10}ms`,
      };

      if (expanded) {
        baseStyle.top = frame.top;
        baseStyle.left = frame.left ?? 'auto';
        baseStyle.right = frame.right ?? 'auto';
        baseStyle.transform = 'translate(0, 0) scale(1)';
        baseStyle.opacity = 1;
      } else {
        baseStyle.top = '50%';
        baseStyle.left = '50%';
        baseStyle.right = 'auto';
        baseStyle.transform = 'translate(-50%, -50%) scale(0.9)';
        baseStyle.opacity = 0;
      }

      return (
        <div key={`${frame.top}-${frame.left ?? frame.right ?? index}`} className="absolute my-20" style={baseStyle}>
          <ImageCard
            projectId={image.projectId}
            verticalSrc={image.verticalSrc}
            horizontalSrc={image.horizontalSrc}
            orientation={frame.orientation}
            aspectRatio={frame.orientation === 'vertical' ? '3 / 4' : '4 / 3'}
            className="w-full overflow-hidden"
            enableHoverEffect={false}
          />
        </div>
      );
    });
  }, [expanded]);

  const containerStyle = useMemo<CSSProperties>(() => {
    return expanded
      ? {
          minHeight: '280vh',
          paddingBottom: '80vh',
          transition:
            'min-height 900ms cubic-bezier(0.19, 1, 0.22, 1), padding-bottom 900ms cubic-bezier(0.19, 1, 0.22, 1)',
        }
      : {
          minHeight: '90vh',
          paddingBottom: '0',
          transition:
            'min-height 900ms cubic-bezier(0.19, 1, 0.22, 1), padding-bottom 900ms cubic-bezier(0.19, 1, 0.22, 1)',
        };
  }, [expanded]);

  return (
    <>
      <Header isFixed={true} />
      <HomeContainer>
        <div className="relative" style={containerStyle}>
          {cards}
        </div>
      </HomeContainer>
    </>
  );
}
