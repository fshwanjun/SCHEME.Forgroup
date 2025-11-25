// app/projects/[slug]/page.tsx
import { supabase } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import ProjectDetailContent from '@/components/ProjectDetailContent';

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
  contents?: ProjectContent; // 👈 jsonb 추가
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
  // Next.js에서 params.slug는 이미 디코딩된 상태로 전달됩니다.

  const { data: project, error } = await supabase
    .from('project')
    .select('id, title, slug, description, contents') // 👈 contents 추가
    .eq('slug', slug)
    .limit(1);

  if (error) {
    console.error('Supabase Query Error:', error.message);
    return null; // DB 오류 시 null 반환
  }

  const projectData = project?.[0] || null;

  // 2. 프로젝트를 찾지 못한 경우 명시적 null 반환
  if (!projectData) {
    return null;
  }

  return projectData as ProjectDetail;
}

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  return {
    title: `Project: ${slug}`,
  };
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);

  if (!project) {
    // 프로젝트가 없으면 404 페이지를 표시
    notFound();
  }

  const { contents } = project;

  return (
    <>
      <Header />
      <main className="w-ful relative h-full">
        {contents && <ProjectDetailContent contents={contents} title={project.title} />}
      </main>
    </>
  );
}
