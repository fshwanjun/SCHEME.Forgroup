'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';
import Header from '@/components/Header';

interface DetailImage {
  id: string;
  url: string;
  orientation?: 'horizontal' | 'vertical';
  position?: 'left' | 'center' | 'right' | 'full-cover' | 'full-padding';
}

interface ProjectContent {
  project: string;
  year: number;
  client: string;
  services: string;
  product: string;
  keyword: string[];
  challenge: string;
  thumbnail43?: string;
  thumbnail34?: string;
  detailImages?: DetailImage[];
}

interface ProjectDetail {
  id: number;
  title: string;
  slug: string;
  description: string;
  contents?: ProjectContent;
}

interface ProjectModalProps {
  params: Promise<{ slug: string }>;
}

export default function ProjectModal({ params }: ProjectModalProps) {
  const [slug, setSlug] = useState<string | null>(null);
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [isClosing, setIsClosing] = useState(false);
  const [initialRect, setInitialRect] = useState<DOMRect | null>(null);
  const [initialImageSrc, setInitialImageSrc] = useState<string | null>(null);
  const router = useRouter();
  const modalRef = useRef<HTMLDivElement>(null);
  const scrollPositionRef = useRef<number>(0);

  // params를 처리
  useEffect(() => {
    params.then((resolvedParams) => {
      setSlug(resolvedParams.slug);
    });
  }, [params]);

  // 이미지 위치 정보 가져오기
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const transitionData = sessionStorage.getItem('imageTransition');
      const imageSrc = sessionStorage.getItem('imageSrc');
      
      if (transitionData) {
        try {
          const rect = JSON.parse(transitionData);
          setInitialRect(rect as DOMRect);
          sessionStorage.removeItem('imageTransition');
        } catch (e) {
          console.error('Failed to parse image transition data', e);
        }
      }
      
      if (imageSrc) {
        setInitialImageSrc(imageSrc);
        sessionStorage.removeItem('imageSrc');
      }
    }
  }, []);

  // 프로젝트 데이터 가져오기
  useEffect(() => {
    if (!slug) return;

    const fetchProject = async () => {
      try {
        const { data, error } = await supabase
          .from('project')
          .select('id, title, slug, description, contents')
          .eq('slug', slug)
          .limit(1)
          .single();

        if (error) {
          console.error('Supabase Query Error:', error.message);
          router.push('/project');
          return;
        }

        if (data) {
          setProject(data as ProjectDetail);
        } else {
          router.push('/project');
        }
      } catch (error) {
        console.error('Error fetching project:', error);
        router.push('/project');
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [slug, router]);

  // 모달 열릴 때 스크롤 위치 저장 및 body 스크롤 잠금
  useEffect(() => {
    if (slug) {
      scrollPositionRef.current = window.scrollY;
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollPositionRef.current}px`;
      document.body.style.width = '100%';
    }

    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      if (scrollPositionRef.current !== undefined) {
        window.scrollTo(0, scrollPositionRef.current);
      }
    };
  }, [slug]);

  // ESC 키로 닫기
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && slug) {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [slug]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      router.push('/project');
    }, 300); // 애니메이션 시간과 맞춤
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  if (!slug || loading || !project) {
    return null;
  }

  const { contents } = project;

  // 초기 이미지 확대 애니메이션 변수 계산 (홈 페이지 스타일)
  const [imageAnimation, setImageAnimation] = useState<{
    initial: any;
    animate: any;
  }>({
    initial: { scale: 0.9, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
  });

  useEffect(() => {
    if (initialRect && typeof window !== 'undefined') {
      const rect = initialRect;
      
      // 홈 페이지와 동일한 방식: 상하 여백 100px씩 (총 200px)
      const verticalPadding = 200;
      const availableHeight = window.innerHeight - verticalPadding;
      
      // 이미지가 화면에 꽉 차도록 스케일 계산
      const scale = availableHeight / rect.height;
      
      // 이미지의 중심 좌표 (뷰포트 기준)
      const imageCenterX = rect.left + rect.width / 2;
      const imageCenterY = rect.top + rect.height / 2;
      
      // 화면의 중심 좌표 (뷰포트 기준)
      const screenCenterX = window.innerWidth / 2;
      const screenCenterY = window.innerHeight / 2;
      
      // 목표: 이미지의 중심을 화면의 중심으로 이동
      // 초기 상태: 이미지가 클릭한 위치에 있고, 스케일이 1
      // 최종 상태: 이미지가 화면 중심에 있고, 스케일이 scale
      
      // 초기 translate는 0 (원래 위치)
      // 최종 translate는 화면 중심으로 이동시키기 위한 값
      const finalX = screenCenterX - imageCenterX * scale;
      const finalY = screenCenterY - imageCenterY * scale;
      
      // Transform Origin을 이미지의 중심으로 설정
      const originX = imageCenterX;
      const originY = imageCenterY;

      setImageAnimation({
        initial: {
          x: 0,
          y: 0,
          scale: 1,
          opacity: 0.9,
        },
        animate: {
          x: finalX,
          y: finalY,
          scale: scale,
          opacity: 1,
          transition: {
            duration: 0.8,
            ease: [0.16, 1, 0.3, 1], // 홈 페이지와 동일한 easing
          },
        },
      });
    }
  }, [initialRect]);

  const contentVariants = {
    initial: { opacity: 0, y: 20 },
    animate: {
      opacity: 1,
      y: 0,
      transition: {
        delay: 0.5,
        duration: 0.4,
        ease: [0.19, 1, 0.22, 1],
      },
    },
    exit: {
      opacity: 0,
      y: 20,
      transition: {
        duration: 0.2,
      },
    },
  };

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isClosing ? 0 : 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-[100] bg-black"
        onClick={handleBackdropClick}
      />
      
      {/* Modal Content */}
      <div
        ref={modalRef}
        className="fixed inset-0 z-[101] overflow-y-auto"
        onClick={handleBackdropClick}>
        <AnimatePresence mode="wait">
          {!isClosing && contents && (
            <>
              {/* Hero Image with Animation */}
              {contents.thumbnail43 && initialRect && (
                <motion.div
                  key="hero-image"
                  initial={imageAnimation.initial}
                  animate={imageAnimation.animate}
                  exit={{ opacity: 0, scale: imageAnimation.initial.scale || 1 }}
                  style={{
                    position: 'fixed',
                    top: initialRect.top,
                    left: initialRect.left,
                    width: initialRect.width,
                    height: initialRect.height,
                    transformOrigin: `${initialRect.width / 2}px ${initialRect.height / 2}px`,
                  }}
                  className="relative overflow-hidden pointer-events-none">
                  <Image
                    className="h-full w-full object-cover"
                    src={contents.thumbnail43}
                    alt={`${contents.project} studio hero image`}
                    width={1920}
                    height={1080}
                    priority
                    draggable={false}
                  />
                </motion.div>
              )}
              {/* Fallback: initialRect가 없을 때 */}
              {contents.thumbnail43 && !initialRect && (
                <motion.div
                  key="hero-image-fallback"
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100vw',
                    height: '100vh',
                  }}
                  className="relative overflow-hidden pointer-events-none">
                  <Image
                    className="h-full w-full object-cover"
                    src={contents.thumbnail43}
                    alt={`${contents.project} studio hero image`}
                    width={1920}
                    height={1080}
                    priority
                    draggable={false}
                  />
                </motion.div>
              )}
              
              {/* Content */}
              <motion.div
                key="modal-content"
                initial={contentVariants.initial}
                animate={contentVariants.animate}
                exit={contentVariants.exit}
                className="relative z-10 min-h-screen bg-black">
                <Header isFixed={true} />
                <main className="relative w-full">
                  {/* Hero Section Spacer */}
                  <div className="h-screen" />
                  
                  <div className="fixed bottom-0 left-0 z-20 flex w-full justify-between gap-4 px-[var(--x-padding)] pb-8 text-white mix-blend-difference pointer-events-none">
                    <div className="flex flex-col gap-1">
                      <h6>Project</h6>
                      <h5>{contents?.project}</h5>
                    </div>
                    <div className="flex flex-col gap-1">
                      <h5>Year</h5>
                      <h6>{contents.year}</h6>
                    </div>
                    <div className="flex flex-col gap-1">
                      <h5>Client</h5>
                      <h6>{contents.client}</h6>
                    </div>
                    <div className="flex flex-col gap-1">
                      <h5>Services</h5>
                      <h6>{contents.services}</h6>
                    </div>
                  </div>

              <div className="mx-auto grid min-h-2/3 w-full grid-cols-2 gap-4 overflow-hidden bg-black px-[var(--x-padding)] py-16">
                <h1 className="leading-[124%]">
                  {project.title || contents.project || 'Design Project'}
                  <br />
                  Design Project
                  <br />
                </h1>
                <div className="flex flex-col justify-between gap-4">
                  <div className="flex flex-row gap-12 pb-40">
                    <div className="flex w-[20%] flex-col gap-2">
                      <h5>Product</h5>
                      <div className="flex flex-col">
                        <span>{contents.product}</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <h5>Design Keywords</h5>
                      {contents.keyword && contents.keyword.length > 0 && (
                        <div className="flex flex-col">
                          {contents.keyword.map((tag, idx) => (
                            <span className="capitalize" key={idx}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  {/* 챌린지 */}
                  {contents.challenge && (
                    <div className="flex flex-col gap-2">
                      <h5>Challenge</h5>
                      <div className="flex flex-col">
                        <h4>{contents.challenge}</h4>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {/* Detail Images */}
              {contents.detailImages && contents.detailImages.length > 0 && (
                <div className="flex w-full flex-col gap-16 bg-black">
                  {contents.detailImages.map((detailImage, index) => {
                    const position = detailImage.position || 'center';
                    const orientation = detailImage.orientation || 'horizontal';

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
                      switch (position) {
                        case 'full-cover':
                          return 'px-[var(--x-padding)]';
                        case 'full-padding':
                          return 'px-0';
                        case 'left':
                        case 'right':
                        case 'center':
                        default:
                          return 'px-[var(--x-padding)]';
                      }
                    };

                    // position에 따른 width 클래스 결정
                    const getWidthClasses = () => {
                      switch (position) {
                        case 'full-cover':
                          return 'w-full';
                        case 'full-padding':
                          return 'w-screen';
                        default:
                          return 'max-w-full';
                      }
                    };

                    // position에 따른 object-fit 클래스 결정
                    const getObjectFitClasses = () => {
                      if (position === 'full-cover' || position === 'full-padding') {
                        return 'object-cover';
                      }
                      return 'object-contain';
                    };

                    // position에 따른 높이 클래스 결정
                    const getHeightClasses = () => {
                      if (position === 'full-cover' || position === 'full-padding') {
                        return 'h-full';
                      }
                      return 'h-auto';
                    };

                    // 컨테이너 높이 설정
                    const getContainerHeightClass = () => {
                      if (position === 'full-cover' || position === 'full-padding') {
                        return 'h-[90vh]';
                      }
                      return '';
                    };

                    return (
                      <div
                        key={detailImage.id || index}
                        className={`flex max-h-[90vh] w-full ${getPositionClasses()} overflow-hidden ${getPaddingClasses()} md:shrink-0 ${getContainerHeightClass()}`}>
                        <img
                          className={`${getHeightClasses()} ${getWidthClasses()} ${getObjectFitClasses()}`}
                          src={detailImage.url}
                          alt={`${contents.project} gallery image ${index + 1}`}
                          draggable={false}
                          style={{ maxHeight: '90vh' }}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
                </main>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

