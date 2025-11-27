'use client';

import { useEffect, useState } from 'react';
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

  useEffect(() => {
    // 헤더 로고 애니메이션 트리거
    setHeaderLogoTrigger(Date.now());
  }, []);

  const { contents } = project;

  return (
    <>
      <Header headerLogoTrigger={headerLogoTrigger} />
      <MobileMenu headerLogoTrigger={headerLogoTrigger} />
      <main className="w-ful relative h-full">
        {contents && <ProjectDetailContent contents={contents} title={project.title} />}
      </main>
    </>
  );
}

