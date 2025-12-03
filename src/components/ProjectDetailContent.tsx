'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { PROJECT_DETAIL_CONFIG } from '@/config/appConfig';

interface DetailImage {
  id: string;
  url: string;
  orientation?: 'horizontal' | 'vertical';
  position?: 'left' | 'center' | 'right' | 'full-cover' | 'full-padding';
}

interface ProjectContent {
  project?: string;
  year?: number;
  client?: string;
  services?: string;
  product?: string;
  keyword?: string[];
  challenge?: string;
  thumbnail43?: string;
  thumbnail34?: string;
  detailImages?: DetailImage[];
}

interface ProjectDetailContentProps {
  contents: ProjectContent;
  title?: string;
  heroImageSrc?: string; // 클릭한 이미지를 hero로 사용할 경우
  onHeroImageLoad?: () => void; // Hero 이미지 로드 완료 콜백
}

export default function ProjectDetailContent({
  contents,
  title,
  heroImageSrc,
  onHeroImageLoad,
}: ProjectDetailContentProps) {
  // Hero 이미지 소스 결정: heroImageSrc가 있으면 우선 사용, 없으면 thumbnail43
  const heroImage = heroImageSrc || contents.thumbnail43;
  const [heroImageLoaded, setHeroImageLoaded] = useState(false);

  // heroImage가 변경되면 로드 상태 리셋
  useEffect(() => {
    setHeroImageLoaded(false);
  }, [heroImage]);

  const handleHeroImageLoad = () => {
    setHeroImageLoaded(true);
    onHeroImageLoad?.();
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{
          duration: PROJECT_DETAIL_CONFIG.animation.duration,
          delay: PROJECT_DETAIL_CONFIG.animation.delay,
          ease: PROJECT_DETAIL_CONFIG.animation.ease,
        }}
        className="fixed bottom-0 left-0 z-10 flex w-full justify-between gap-4 px-5 pb-8 text-white mix-blend-difference md:px-5">
        <div className="flex flex-col gap-1">
          <h5>Project</h5>
          <h6>{contents.project || ''}</h6>
        </div>
        {contents.year && (
          <div className="flex flex-col gap-1">
            <h5>Year</h5>
            <h6>{contents.year}</h6>
          </div>
        )}
        {contents.client && (
          <div className="flex flex-col gap-1">
            <h5>Client</h5>
            <h6>{contents.client}</h6>
          </div>
        )}
        {contents.services && (
          <div className="flex flex-col gap-1">
            <h5>Services</h5>
            <h6>{contents.services}</h6>
          </div>
        )}
      </motion.div>
      {heroImage && (
        <div className="relative h-svh w-full overflow-hidden">
          {/* 실제 Hero 이미지 - 배경 이미지로 확대된 썸네일이 이미 표시되고 있음 */}
          <Image
            className={`pointer-events-none h-full w-full object-cover transition-opacity duration-700 ease-out ${
              heroImageLoaded || heroImageSrc === heroImage ? 'opacity-100' : 'opacity-0'
            }`}
            src={heroImage}
            alt={`${contents.project} studio hero image`}
            width={1920}
            height={1080}
            priority
            draggable={false}
            onLoad={handleHeroImageLoad}
            onError={() => {
              // 이미지 로드 실패 시에도 콜백 호출
              handleHeroImageLoad();
            }}
          />
        </div>
      )}

      <div className="mx-auto grid min-h-2/3 w-full gap-20 overflow-hidden px-5 py-16 md:grid-cols-2 md:gap-4 md:px-5">
        <h1 className="text-4xl leading-[124%] md:text-5xl">
          {title || contents.project || 'Design Project'}
          <br />
          Design Project
          <br />
        </h1>
        <div className="flex flex-col justify-between gap-8 md:gap-4">
          <div className="flex w-2/3 flex-row justify-end gap-8 self-end md:w-full md:justify-start md:gap-12 md:self-start md:pb-40">
            {contents.product && (
              <div className="flex flex-col gap-4 md:w-[20%]">
                <h5 className="text-[14px] leading-[130%] font-bold md:text-[16px]">Product</h5>
                <div className="flex flex-col">
                  <span className="text-[14px] leading-[130%] font-semibold capitalize md:text-[16px]">
                    {contents.product}
                  </span>
                </div>
              </div>
            )}
            {contents.keyword && contents.keyword.length > 0 && (
              <div className="flex flex-col gap-4">
                <h5 className="text-[14px] leading-[130%] font-bold md:text-[16px]">Design Keywords</h5>
                <div className="flex flex-col">
                  {contents.keyword.map((tag, idx) => (
                    <span className="text-[14px] leading-[130%] font-semibold capitalize md:text-[16px]" key={idx}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          {/* 챌린지 */}
          {contents.challenge && (
            <div className="flex flex-col gap-4">
              <h5 className="text-[14px] leading-[130%] font-bold md:text-[16px]">Challenge</h5>
              <div className="flex flex-col">
                <h4 className="leading-[122%] font-normal md:leading-[130%]">{contents.challenge}</h4>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Detail Images */}
      {contents.detailImages && contents.detailImages.length > 0 && (
        <div className="flex w-full flex-col gap-2 pb-[20vh] md:gap-16 md:pb-0">
          {contents.detailImages.map((detailImage, index) => {
            const position = detailImage.position || 'center';

            // position에 따른 justify 클래스 결정
            const getPositionClasses = () => {
              switch (position) {
                case 'left':
                  return 'justify-start';
                case 'right':
                  return 'justify-end';
                case 'center':
                case 'full-cover':
                case 'full-padding':
                default:
                  return 'justify-center';
              }
            };

            // position에 따른 padding 클래스 결정
            const getPaddingClasses = () => {
              // 모바일에서는 모든 이미지에 패딩 적용
              switch (position) {
                case 'full-cover':
                  return 'px-5 md:px-0'; // 모바일에서는 padding 있음 (20px), 데스크톱에서는 padding 없음
                case 'full-padding':
                  return 'px-5 md:px-5'; // padding 있음 (div를 꽉 채우지만 좌우 padding 유지)
                case 'left':
                case 'right':
                case 'center':
                default:
                  return 'px-5 md:px-5'; // 기본 padding
              }
            };

            // position에 따른 width 클래스 결정
            const getWidthClasses = () => {
              switch (position) {
                case 'full-cover':
                  return 'w-full md:w-screen'; // 모바일에서는 w-full, 데스크톱에서는 w-screen
                case 'full-padding':
                  return 'w-full'; // padding이 있는 전체 너비
                default:
                  // 모바일에서는 w-full, 데스크톱에서는 원본 크기 유지 (정렬을 위해)
                  return 'w-full md:w-auto';
              }
            };

            // position에 따른 object-fit 클래스 결정 (full-cover와 full-padding 모두 cover)
            const getObjectFitClasses = () => {
              if (position === 'full-cover' || position === 'full-padding') {
                return 'object-cover';
              }
              return 'object-contain';
            };

            // position에 따른 높이 클래스 결정
            const getHeightClasses = () => {
              if (position === 'full-cover' || position === 'full-padding') {
                // 모바일에서는 h-auto로 이미지 비율에 맞게, 데스크톱에서는 h-full
                return 'h-auto md:h-full';
              }
              return 'h-auto';
            };

            // 컨테이너 높이 설정
            // 참고: PROJECT_DETAIL_CONFIG.image.maxHeight = '90vh'
            const getContainerHeightClass = () => {
              if (position === 'full-cover' || position === 'full-padding') {
                // 모바일에서는 높이를 이미지 비율에 맞게, 데스크톱에서는 고정 높이
                return 'md:h-[90vh]';
              }
              return '';
            };

            // orientation에 따른 aspect ratio 클래스 결정 (데스크톱에서만 적용)
            const getAspectRatioClasses = () => {
              if (position === 'full-cover' || position === 'full-padding') {
                return ''; // full-cover와 full-padding은 aspect ratio 적용 안함
              }
              const orientation = detailImage.orientation;
              if (orientation === 'horizontal') {
                return ''; // 가로형: 16:9 비율 (데스크톱에서만)
              } else if (orientation === 'vertical') {
                return ''; // 세로형: 9:16 비율 (데스크톱에서만)
              }
              return ''; // orientation이 없으면 기본 비율 유지
            };

            return (
              <div
                key={detailImage.id || index}
                // 참고: max-h-[90vh] = PROJECT_DETAIL_CONFIG.image.maxHeight
                className={`pointer-events-none flex max-h-[90vh] w-full select-none ${getPositionClasses()} ${getPaddingClasses()} md:shrink-0 ${getContainerHeightClass()} ${
                  position === 'full-cover'
                    ? 'relative overflow-hidden'
                    : position === 'full-padding'
                      ? 'overflow-hidden'
                      : ''
                }`}>
                {position === 'full-cover' ? (
                  <>
                    {/* 모바일: relative 포지셔닝으로 패딩 적용, 높이는 이미지 비율에 맞게 */}
                    <Image
                      className={`${getHeightClasses()} ${getWidthClasses()} ${getObjectFitClasses()} md:hidden`}
                      src={detailImage.url}
                      alt={`${contents.project || 'Project'} gallery image ${index + 1}`}
                      width={0}
                      height={0}
                      sizes="100vw"
                      unoptimized
                      draggable={false}
                      style={{ width: '100%', height: 'auto', objectFit: 'cover' }}
                    />
                    {/* 데스크톱: absolute 포지셔닝 (fill 사용) */}
                    <Image
                      className={`${getHeightClasses()} ${getWidthClasses()} ${getObjectFitClasses()} hidden md:block`}
                      src={detailImage.url}
                      alt={`${contents.project || 'Project'} gallery image ${index + 1}`}
                      fill
                      unoptimized
                      draggable={false}
                    />
                  </>
                ) : position === 'full-padding' ? (
                  <>
                    {/* 모바일: relative 포지셔닝으로 패딩 적용, 높이는 이미지 비율에 맞게 */}
                    <Image
                      className={`${getHeightClasses()} ${getWidthClasses()} ${getObjectFitClasses()} md:hidden`}
                      src={detailImage.url}
                      alt={`${contents.project || 'Project'} gallery image ${index + 1}`}
                      width={0}
                      height={0}
                      sizes="100vw"
                      unoptimized
                      draggable={false}
                      style={{ width: '100%', height: 'auto', objectFit: 'cover' }}
                    />
                    {/* 데스크톱: absolute 포지셔닝 (fill 사용) */}
                    <div className="relative hidden h-full w-full overflow-hidden select-none md:block">
                      <Image
                        className={`${getHeightClasses()} ${getWidthClasses()} ${getObjectFitClasses()}`}
                        src={detailImage.url}
                        alt={`${contents.project || 'Project'} gallery image ${index + 1}`}
                        fill
                        unoptimized
                        draggable={false}
                      />
                    </div>
                  </>
                ) : (
                  <Image
                    className={`${getHeightClasses()} ${getWidthClasses()} ${getObjectFitClasses()} ${getAspectRatioClasses()} select-none`}
                    src={detailImage.url}
                    alt={`${contents.project || 'Project'} gallery image ${index + 1}`}
                    width={0}
                    height={0}
                    sizes="100vw"
                    draggable={false}
                    style={{
                      maxHeight: PROJECT_DETAIL_CONFIG.image.maxHeight,
                      objectFit: 'contain',
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
