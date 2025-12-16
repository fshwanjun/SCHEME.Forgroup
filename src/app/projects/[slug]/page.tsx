import { Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import ProjectDetailClient from './ProjectDetailClient';

// 타입 정의
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

// 1. 빌드 시 정적 생성할 경로(슬러그)를 결정합니다.
export async function generateStaticParams() {
  const { data: project } = await supabase.from('project').select('slug');

  // { slug: '프로젝트-슬러그-1' }, { slug: '프로젝트-슬러그-2' } 와 같은 배열을 반환
  return (
    project?.map((project) => ({
      slug: project.slug,
    })) || []
  );
}

// 2. 상세 데이터 가져오기 (특정 슬러그를 기반으로)
async function getProjectBySlug(slug: string): Promise<ProjectDetail | null> {
  const { data: project, error } = await supabase
    .from('project')
    .select('id, title, slug, description, contents')
    .eq('slug', slug)
    .single();

  if (error || !project) {
    return null;
  }

  return project as ProjectDetail;
}

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  
  if (!project) {
    return { title: 'Project Not Found | for' };
  }
  
  // contents.project가 있으면 사용, 없으면 title 사용
  const projectName = project.contents?.project || project.title;
  return {
    title: `${projectName} | for`,
  };
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);

  if (!project) {
    notFound();
  }

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ProjectDetailClient project={project} />
    </Suspense>
  );
}
