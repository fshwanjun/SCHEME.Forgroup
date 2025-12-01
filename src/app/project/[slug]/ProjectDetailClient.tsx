'use client';

import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Header from '@/components/Header';
import MobileMenu from '@/components/MobileMenu';
import ProjectDetailContent from '@/components/ProjectDetailContent';

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
  detailImages?: Array<{
    id: string;
    url: string;
    orientation?: 'horizontal' | 'vertical';
    position?: 'left' | 'center' | 'right' | 'full-cover' | 'full-padding';
  }>;
}

interface ProjectDetail {
  id: number;
  title: string;
  slug: string;
  description: string;
  contents?: ProjectContent;
}

export default function ProjectDetailClient({ project }: { project: ProjectDetail }) {
  const [headerLogoTrigger, setHeaderLogoTrigger] = useState<number | undefined>(undefined);
  const searchParams = useSearchParams();
  const router = useRouter();
  const isFromModalRef = useRef(false);
  const isNavigatingRef = useRef(false);

  // URL 쿼리 파라미터에서 hero 이미지 src 가져오기
  const heroImageSrc = searchParams.get('hero') ? decodeURIComponent(searchParams.get('hero')!) : undefined;

  useEffect(() => {
    // 헤더 로고 애니메이션 트리거
    setHeaderLogoTrigger(Date.now());

    // 히스토리 상태 확인 - 프로젝트 페이지에서 모달로 온 경우인지 확인
    const historyState = window.history.state;
    if (historyState && (historyState.modal === true || historyState.zoomed === true)) {
      isFromModalRef.current = true;
      // 히스토리 상태에 플래그 추가
      window.history.replaceState({ ...historyState, fromModal: true }, '', window.location.pathname);
    }
  }, []);

  // 뒤로가기 처리 - 프로젝트 페이지로 복귀
  useEffect(() => {
    const handlePopState = () => {
      // 중복 처리 방지
      if (isNavigatingRef.current) return;

      const currentPath = window.location.pathname;

      // 프로젝트 상세 페이지에서 뒤로가기를 누른 경우
      if (currentPath.startsWith('/project/') && currentPath !== '/project') {
        isNavigatingRef.current = true;

        // 즉시 /project URL로 pushState하여 새로고침 방지
        // popstate 이벤트가 발생한 직후 pushState를 호출하면
        // Next.js가 페이지를 새로고침하지 않고 클라이언트 사이드에서만 처리됨
        window.history.pushState({ zoomed: false, preventRefresh: true }, '', '/project');

        // router.replace를 사용하여 클라이언트 사이드 네비게이션
        // pushState 후 약간의 지연을 두어 Next.js가 이를 감지하도록 함
        requestAnimationFrame(() => {
          router.replace('/project');
          // 다음 이벤트 루프에서 플래그 리셋
          setTimeout(() => {
            isNavigatingRef.current = false;
          }, 100);
        });
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [router]);

  const { contents } = project;

  return (
    <>
      <Header headerLogoTrigger={headerLogoTrigger} />
      <MobileMenu headerLogoTrigger={headerLogoTrigger} />
      <main className="w-ful relative h-full">
        {contents && <ProjectDetailContent contents={contents} title={project.title} heroImageSrc={heroImageSrc} />}
      </main>
    </>
  );
}
