
'use client';

import { useMemo } from 'react';
import ImageCard from './ImageCard';
import type { FrameRule } from './SteppedRow';

type ProjectImage = {
  projectId: string;
  verticalSrc: string;
  horizontalSrc: string;
};

const FRAME_CLASSES: string[] = [
  'frame-card aspect-[3/4] row-start-1 col-span-4 col-start-8 self-end',
  'frame-card aspect-[3/4] row-start-1 col-span-5 col-start-12',
  'frame-card aspect-[3/4] row-start-2 col-span-4 col-start-1',
  'frame-card aspect-[4/3] row-start-2 col-span-3 col-start-5',
  'frame-card aspect-[4/3] row-start-3 col-span-5 col-start-5',
  'frame-card aspect-[4/3] row-start-4 col-span-7 col-start-10',
  'frame-card aspect-[3/4] row-start-5 col-span-3 col-start-7',
  'frame-card aspect-[4/3] row-start-6 col-span-6 col-start-1',
  'frame-card aspect-[3/4] row-start-7 col-span-6 col-start-1',
  'frame-card aspect-[4/3] row-start-8 col-span-10 col-start-7',
  'frame-card aspect-[4/3] row-start-9 col-span-6 col-start-1',
  'frame-card aspect-[3/4] row-start-10 col-span-2 col-start-7',
  'frame-card aspect-[4/3] row-start-11 col-span-4 col-start-5',
  'frame-card aspect-[3/4] row-start-12 col-span-4 col-start-1',
  'frame-card aspect-[4/3] row-start-12 col-span-4 col-start-9',
  'frame-card aspect-[4/3] row-start-12 col-span-4 col-start-13 self-end',
  'frame-card aspect-[3/4] row-start-13 col-span-3 col-start-10',
  'frame-card aspect-[4/3] row-start-14 col-span-3 col-start-7',
  'frame-card aspect-[3/4] row-start-15 col-span-6 col-start-1',
  'frame-card aspect-[4/3] row-start-15 col-span-4 col-start-13 self-end',
  'frame-card aspect-[4/3] row-start-16 col-span-6 col-start-7',
  'frame-card aspect-[3/4] row-start-17 col-span-4 col-start-13 self-end',
  'frame-card aspect-[3/4] row-start-18 col-span-5 col-start-12',
  'frame-card aspect-[3/4] row-start-19 col-span-3 col-start-9',
  'frame-card aspect-[4/3] row-start-20 col-span-4 col-start-5',
  'frame-card aspect-[3/4] row-start-21 col-span-4 col-start-1',
  'frame-card aspect-[4/3] row-start-22 col-span-6 col-start-5',
  'frame-card aspect-[4/3] row-start-23 col-span-6 col-start-11',
  'frame-card aspect-[4/3] row-start-24 col-span-6 col-start-1',
  'frame-card aspect-[3/4] row-start-24 col-span-4 col-start-7',
  'frame-card aspect-[4/3] row-start-25 col-span-6 col-start-11',
  'frame-card aspect-[4/3] row-start-26 col-span-5 col-start-6',
  'frame-card aspect-[3/4] row-start-27 col-span-5 col-start-1',
  'frame-card aspect-[3/4] row-start-27 col-span-3 col-start-14',
  'frame-card aspect-[4/3] row-start-27 col-span-4 col-start-10 self-end',
  'frame-card aspect-[4/3] row-start-28 col-span-4 col-start-6',
  'frame-card aspect-[4/3] row-start-29 col-span-7 col-start-10',
  'frame-card aspect-[4/3] row-start-30 col-span-6 col-start-4',
  'frame-card aspect-[3/4] row-start-31 col-span-3 col-start-1',
  'frame-card aspect-[4/3] row-start-32 col-span-8 col-start-4',
];

const PROJECT_IMAGES: ProjectImage[] = ['main-0', 'main-1', 'main-2', 'main-3'].map((id) => ({
  projectId: id,
  verticalSrc: `./images/main/${id}.jpg`,
  horizontalSrc: `./images/main/${id}.jpg`,
}));

function shuffleArray<T>(input: T[]): T[] {
  const arr = [...input];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default function HomeGallery() {
  const projectAssignments = useMemo(() => {
    const totalFrames = FRAME_CLASSES.length;
    if (PROJECT_IMAGES.length === 0 || totalFrames === 0) return [];
    const assignments: ProjectImage[] = [];
    const shuffleCache: ProjectImage[][] = [];
    for (let index = 0; index < totalFrames; index++) {
      const cycle = Math.floor(index / PROJECT_IMAGES.length);
      const withinCycle = index % PROJECT_IMAGES.length;
      if (cycle === 0) {
        assignments.push(PROJECT_IMAGES[withinCycle]);
      } else {
        if (!shuffleCache[cycle]) {
          shuffleCache[cycle] = shuffleArray(PROJECT_IMAGES);
        }
        assignments.push(shuffleCache[cycle][withinCycle]);
      }
    }
    return assignments;
  }, []);

  return (
    <section className="HomeGallery w-full relative mb-[20px] px-[20px]">
      <div className="grid grid-cols-16 gap-[20px] w-full">
        {FRAME_CLASSES.map((frameClass, index) => {
          const assignment =
            projectAssignments[index % projectAssignments.length] ?? PROJECT_IMAGES[index % PROJECT_IMAGES.length];
          const orientation = frameClass.includes('aspect-[3/4]') ? 'vertical' : 'horizontal';
          const aspectRatio = orientation === 'vertical' ? '3 / 4' : '4 / 3';

          return (
            <div key={`${frameClass}-${index}`} className={`${frameClass} relative`}>
              <ImageCard
                projectId={assignment.projectId}
                verticalSrc={assignment.verticalSrc}
                horizontalSrc={assignment.horizontalSrc}
                orientation={orientation}
                aspectRatio={aspectRatio}
                className="w-full h-full"
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}