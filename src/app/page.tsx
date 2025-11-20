'use client';

import HomeContainer from '@/components/HomeContainer';
import HomeGallery, { type GallerySelection } from '@/components/HomeGallery';
import IntroLogo from '@/components/IntroLogo';
import { useCallback, useEffect, useMemo, useState } from 'react';
import InfiniteScroll, { InfiniteScrollEndHandler } from '@/components/InfiniteScroll';
import { motion } from 'framer-motion';

export default function Home() {
  const [state, setState] = useState(1);
  const [selected, setSelected] = useState<GallerySelection | null>(null);
  const [zoomStyle, setZoomStyle] = useState({ x: 0, y: 0, scale: 1 });

  const handleSelectImage = useCallback((image: GallerySelection) => {
    setSelected((current) => (current?.projectId === image.projectId ? null : image));
  }, []);

  useEffect(() => {
    if (selected && selected.rect) {
      const rect = selected.rect;
      const scaleX = window.innerWidth / rect.width;
      const scaleY = window.innerHeight / rect.height;
      // 화면을 꽉 채우기 위해 더 작은 스케일을 기준으로 하거나,
      // 더 큰 스케일을 기준으로 하여 꽉 채울 수 있음 (Cover).
      // 여기서는 약간의 여백을 두거나 딱 맞게 설정. "확대해서 중앙으로"이므로 Fit을 우선 시도.
      // 1.02 정도 곱해서 여백 없이 꽉 차게 조정 가능.
      const scale = Math.min(scaleX, scaleY);

      // 현재 이미지의 중심 좌표 (스크롤 포함되지 않은 viewport 기준)
      const imageCenterX = rect.left + rect.width / 2;
      const imageCenterY = rect.top + rect.height / 2;

      // 화면의 중심 좌표
      const screenCenterX = window.innerWidth / 2;
      const screenCenterY = window.innerHeight / 2;

      // 이동해야 할 거리 (컨테이너 기준 0,0에서 시작하므로 transform으로 이동)
      // scale이 적용되면 원점(0,0) 기준으로 확대되므로,
      // 이미지가 화면 중앙에 오기 위한 보정값을 계산해야 함.
      // P_target = P_current * scale + translate
      // screenCenter = imageCenter * scale + translate
      // translate = screenCenter - imageCenter * scale
      const tx = screenCenterX - imageCenterX * scale;
      const ty = screenCenterY - imageCenterY * scale;

      setZoomStyle({ x: tx, y: ty, scale });
      document.body.style.overflow = 'hidden';
    } else {
      setZoomStyle({ x: 0, y: 0, scale: 1 });
      document.body.style.overflow = '';
    }
  }, [selected]);

  const list = useMemo(
    () =>
      Array.from({ length: state }).map((_, j) => (
        <HomeGallery key={j} onSelectImage={handleSelectImage} selectedProjectId={selected?.projectId ?? null} />
      )),
    [state, handleSelectImage, selected?.projectId],
  );

  const handleEnd = useCallback<InfiniteScrollEndHandler>(() => {
    setState((value) => value + 1);
  }, []);

  return (
    <>
      <IntroLogo />
      <motion.div
        animate={zoomStyle}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        style={{ transformOrigin: '0 0', width: '100%', height: '100%' }}>
        <HomeContainer isFixed={true}>
          <InfiniteScroll onEnd={handleEnd} rootMargin="0px 0px 300px 0px">
            <div className="relative flex w-full flex-col">{list}</div>
          </InfiniteScroll>
        </HomeContainer>
      </motion.div>
    </>
  );
}
