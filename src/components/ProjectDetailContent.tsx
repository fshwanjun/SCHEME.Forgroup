'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { useState, useEffect, useRef, useCallback } from 'react';
import { PROJECT_DETAIL_CONFIG } from '@/config/appConfig';

// 커스텀 스크롤 인디케이터 컴포넌트
function ScrollIndicator() {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [hasScrollableContent, setHasScrollableContent] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLElement | null>(null);
  const rafRef = useRef<number | null>(null);

  // 스크롤 가능한 부모 요소 찾기
  const findScrollParent = useCallback((element: HTMLElement | null): HTMLElement | null => {
    if (!element) return null;

    let parent = element.parentElement;
    while (parent) {
      const style = getComputedStyle(parent);
      const overflowY = style.overflowY;
      if (overflowY === 'auto' || overflowY === 'scroll') {
        return parent;
      }
      parent = parent.parentElement;
    }
    return null;
  }, []);

  // 스크롤 위치 계산 함수
  const calculateScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const scrollTop = container.scrollTop;
    const scrollHeight = container.scrollHeight;
    const clientHeight = container.clientHeight;

    const maxScroll = scrollHeight - clientHeight;
    if (maxScroll > 0) {
      const progress = Math.min(Math.max(scrollTop / maxScroll, 0), 1);
      setScrollProgress(progress);
      setHasScrollableContent(true);
    } else {
      setHasScrollableContent(false);
    }
  }, []);

  // requestAnimationFrame을 사용한 실시간 스크롤 추적
  useEffect(() => {
    const indicator = indicatorRef.current;
    if (!indicator) return;

    // 스크롤 컨테이너 찾기 (약간의 딜레이로 DOM 렌더링 대기)
    const initTimeout = setTimeout(() => {
      const container = findScrollParent(indicator);
      scrollContainerRef.current = container;

      if (container) {
        setIsReady(true);
        calculateScroll();
      }
    }, 50);

    return () => {
      clearTimeout(initTimeout);
    };
  }, [findScrollParent, calculateScroll]);

  // 스크롤 이벤트 리스너 (실시간 업데이트)
  useEffect(() => {
    if (!isReady) return;

    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      // requestAnimationFrame으로 프레임마다 업데이트
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      rafRef.current = requestAnimationFrame(() => {
        calculateScroll();
      });
    };

    // 초기 계산
    calculateScroll();

    // 스크롤 이벤트 리스너 등록
    container.addEventListener('scroll', handleScroll, { passive: true });

    // 리사이즈 시에도 재계산
    window.addEventListener('resize', handleScroll, { passive: true });

    return () => {
      container.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [isReady, calculateScroll]);

  // 트랙 높이: 10vh ~ 20vh (clamp), 썸 높이: 트랙의 30%
  const thumbPercent = 0.3; // 썸 높이 비율 (30%)

  return (
    <div
      ref={indicatorRef}
      className="pointer-events-none fixed top-1/2 right-2 z-500 -translate-y-1/2 transition-opacity duration-300 md:right-10"
      style={{
        width: 2,
        height: 'clamp(10vh, 15vh, 20vh)', // 최소 10vh, 기본 15vh, 최대 20vh
        opacity: hasScrollableContent && isReady ? 1 : 0,
        mixBlendMode: 'difference',
      }}>
      {/* 트랙 (투명 배경) */}
      <div className="absolute inset-0 rounded-full bg-white/30" />
      {/* 썸 (스크롤 위치 표시) */}
      <div
        className="absolute left-0 w-full rounded-full bg-white"
        style={{
          height: `${thumbPercent * 100}%`, // 트랙의 30%
          top: `${scrollProgress * (1 - thumbPercent) * 100}%`, // 스크롤 위치에 따라 이동
        }}
      />
    </div>
  );
}

interface DetailImage {
  id: string;
  url: string;
  orientation?: 'horizontal' | 'vertical';
  position?: 'left' | 'center' | 'right' | 'full-cover' | 'full-padding';
}

// 폰트 두께 타입 정의
type FontWeight = 'book' | 'regular' | 'medium' | 'bold';

// 폰트 두께 → CSS 클래스 매핑
const fontWeightClass: Record<FontWeight, string> = {
  book: 'font-light',
  regular: 'font-normal',
  medium: 'font-medium',
  bold: 'font-bold',
};

interface ProjectContent {
  project?: string;
  year?: string | number; // 호환성을 위해 number도 허용
  client?: string;
  services?: string;
  product?: string;
  keyword?: string | string[]; // 호환성을 위해 배열도 허용
  challenge?: string;
  thumbnail43?: string;
  thumbnail34?: string;
  detailImages?: DetailImage[];
  // 하단 4단 타이틀
  projectTitle?: string;
  yearTitle?: string;
  clientTitle?: string;
  servicesTitle?: string;
  // 상세 정보 타이틀
  productTitle?: string;
  keywordTitle?: string;
  challengeTitle?: string;
  // 하단 4단 가시성 토글 (Title / Value 분리)
  projectTitleVisible?: boolean;
  projectValueVisible?: boolean;
  yearTitleVisible?: boolean;
  yearValueVisible?: boolean;
  clientTitleVisible?: boolean;
  clientValueVisible?: boolean;
  servicesTitleVisible?: boolean;
  servicesValueVisible?: boolean;
  // 상세 정보 가시성 토글 (Title / Value 분리)
  productTitleVisible?: boolean;
  productValueVisible?: boolean;
  keywordTitleVisible?: boolean;
  keywordValueVisible?: boolean;
  challengeTitleVisible?: boolean;
  challengeValueVisible?: boolean;
  // 하단 4단 폰트 두께 (Title / Value 분리)
  projectTitleFontWeight?: FontWeight;
  projectValueFontWeight?: FontWeight;
  yearTitleFontWeight?: FontWeight;
  yearValueFontWeight?: FontWeight;
  clientTitleFontWeight?: FontWeight;
  clientValueFontWeight?: FontWeight;
  servicesTitleFontWeight?: FontWeight;
  servicesValueFontWeight?: FontWeight;
  // 상세 정보 폰트 두께 (Title / Value 분리)
  productTitleFontWeight?: FontWeight;
  productValueFontWeight?: FontWeight;
  keywordTitleFontWeight?: FontWeight;
  keywordValueFontWeight?: FontWeight;
  challengeTitleFontWeight?: FontWeight;
  challengeValueFontWeight?: FontWeight;
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
      {/* 커스텀 스크롤 인디케이터 */}
      <ScrollIndicator />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{
          duration: PROJECT_DETAIL_CONFIG.animation.duration,
          delay: PROJECT_DETAIL_CONFIG.animation.delay,
          ease: PROJECT_DETAIL_CONFIG.animation.ease,
        }}
        className="fixed bottom-0 left-0 z-10 grid w-full grid-cols-2 gap-4 px-7 pb-8 text-white mix-blend-difference md:grid-cols-4 md:px-10">
        {/* Column 1: Project - 항상 구역 유지 */}
        <div className="flex flex-col gap-1">
          {contents.projectTitleVisible !== false && (
            <h5 className={fontWeightClass[contents.projectTitleFontWeight || 'bold']}>{contents.projectTitle}</h5>
          )}
          {contents.projectValueVisible !== false && (
            <h6 className={`whitespace-pre-line ${fontWeightClass[contents.projectValueFontWeight || 'regular']}`}>{contents.project}</h6>
          )}
        </div>
        {/* Column 2: Year - 항상 구역 유지 */}
        <div className="flex flex-col gap-1">
          {contents.yearTitleVisible !== false && (
            <h5 className={fontWeightClass[contents.yearTitleFontWeight || 'bold']}>{contents.yearTitle}</h5>
          )}
          {contents.yearValueVisible !== false && (
            <h6 className={`whitespace-pre-line ${fontWeightClass[contents.yearValueFontWeight || 'regular']}`}>{contents.year}</h6>
          )}
        </div>
        {/* Column 3: Client - 항상 구역 유지 */}
        <div className="flex flex-col gap-1">
          {contents.clientTitleVisible !== false && (
            <h5 className={fontWeightClass[contents.clientTitleFontWeight || 'bold']}>{contents.clientTitle}</h5>
          )}
          {contents.clientValueVisible !== false && (
            <h6 className={`whitespace-pre-line ${fontWeightClass[contents.clientValueFontWeight || 'regular']}`}>{contents.client}</h6>
          )}
        </div>
        {/* Column 4: Services - 항상 구역 유지 */}
        <div className="flex flex-col gap-1">
          {contents.servicesTitleVisible !== false && (
            <h5 className={fontWeightClass[contents.servicesTitleFontWeight || 'bold']}>{contents.servicesTitle}</h5>
          )}
          {contents.servicesValueVisible !== false && (
            <h6 className={`whitespace-pre-line ${fontWeightClass[contents.servicesValueFontWeight || 'regular']}`}>{contents.services}</h6>
          )}
        </div>
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
          {title || contents.project }
        </h1>
        <div className="flex flex-col justify-between gap-8 md:gap-4">
          <div className="flex w-2/3 flex-row justify-end gap-8 self-end md:w-full md:justify-start md:gap-12 md:self-start md:pb-40">
            {(contents.productTitleVisible !== false || contents.productValueVisible !== false) && contents.product && (
              <div className="flex flex-col gap-4 md:w-[20%]">
                {contents.productTitleVisible !== false && (
                  <h5 className={`text-[14px] leading-[130%] md:text-[16px] ${fontWeightClass[contents.productTitleFontWeight || 'bold']}`}>
                    {contents.productTitle}
                  </h5>
                )}
                {contents.productValueVisible !== false && (
                  <div className="flex flex-col">
                    <span className={`text-[14px] leading-[130%] whitespace-pre-line md:text-[16px] ${fontWeightClass[contents.productValueFontWeight || 'medium']}`}>
                      {contents.product}
                    </span>
                  </div>
                )}
              </div>
            )}
            {(contents.keywordTitleVisible !== false || contents.keywordValueVisible !== false) && contents.keyword && (
              <div className="flex flex-col gap-4">
                {contents.keywordTitleVisible !== false && (
                  <h5 className={`text-[14px] leading-[130%] md:text-[16px] ${fontWeightClass[contents.keywordTitleFontWeight || 'bold']}`}>
                    {contents.keywordTitle}
                  </h5>
                )}
                {contents.keywordValueVisible !== false && (
                  <div className="flex flex-col">
                    <span className={`text-[14px] leading-[130%] whitespace-pre-line md:text-[16px] ${fontWeightClass[contents.keywordValueFontWeight || 'medium']}`}>
                      {Array.isArray(contents.keyword) ? contents.keyword.join('\n') : contents.keyword}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
          {/* 챌린지 */}
          {(contents.challengeTitleVisible !== false || contents.challengeValueVisible !== false) && contents.challenge && (
            <div className="flex flex-col gap-4">
              {contents.challengeTitleVisible !== false && (
                <h5 className={`text-[14px] leading-[130%] md:text-[16px] ${fontWeightClass[contents.challengeTitleFontWeight || 'bold']}`}>
                  {contents.challengeTitle}
                </h5>
              )}
              {contents.challengeValueVisible !== false && (
                <div className="flex flex-col">
                  <h4 className={`leading-[122%] whitespace-pre-line md:leading-[130%] ${fontWeightClass[contents.challengeValueFontWeight || 'regular']}`}>
                    {contents.challenge}
                  </h4>
                </div>
              )}
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
