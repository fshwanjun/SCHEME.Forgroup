// app/projects/[slug]/page.tsx
import { supabase } from '@/lib/supabase';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import Header from '@/components/Header';

// 타입 정의
interface ProjectContent {
  project: string;
  year: number;
  client: string;
  services: string;
  product: string;
  keyword: string[];
  challenge: string;
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
    console.log(`Project with slug: ${slug} not found.`);
    return null;
  }

  return projectData as ProjectDetail;
}

type PageProps = {
  params: { slug: string };
};

export async function generateMetadata({ params }: PageProps) {
  return {
    title: `Project: ${params.slug}`,
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
        {/* 개요 정보 그리드 */}
        {contents && (
          <>
            <div className="fixed bottom-0 left-0 flex w-full justify-between gap-4 px-[var(--x-padding)] pb-8 text-white">
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
            <div className="relative h-full w-full overflow-hidden">
              <Image
                className="h-full w-full object-cover"
                src="/images/dummy/test-0.jpg"
                alt={`${contents.project} studio hero image`}
                width={1920}
                height={1080}
                priority
                draggable={false}
              />
            </div>

            <div className="mx-auto grid min-h-2/3 w-full grid-cols-2 gap-4 overflow-hidden px-[var(--x-padding)] py-16">
              <h1 className="leading-[124%]">
                Sanro wine rack
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
            <div className="flex w-full flex-col gap-16 pb-16">
              <div className="max-h-[90vh] w-full overflow-hidden px-[var(--x-padding)] md:shrink-0">
                <Image
                  className="h-auto w-full max-w-none object-contain"
                  src="/images/dummy/dum-0.jpg"
                  alt={`${contents.project} gallery image 1`}
                  width={1920}
                  height={1080}
                  draggable={false}
                />
              </div>
              <div className="flex max-h-[90vh] w-full justify-start overflow-hidden px-[var(--x-padding)] md:shrink-0">
                <Image
                  className="h-auto w-[45%] max-w-none object-contain"
                  src="/images/dummy/dum-1.jpg"
                  alt={`${contents.project} gallery image 2`}
                  width={1200}
                  height={1600}
                  draggable={false}
                />
              </div>
              <div className="flex max-h-[90vh] w-full justify-end overflow-hidden px-[var(--x-padding)] md:shrink-0">
                <Image
                  className="h-auto w-[75%] max-w-none object-contain"
                  src="/images/dummy/dum-2.jpg"
                  alt={`${contents.project} gallery image 3`}
                  width={1920}
                  height={1280}
                  draggable={false}
                />
              </div>
              <div className="flex max-h-[90vh] w-full justify-start overflow-hidden px-[var(--x-padding)] md:shrink-0">
                <Image
                  className="h-auto w-[45%] max-w-none object-contain"
                  src="/images/dummy/dum-3.jpg"
                  alt={`${contents.project} gallery image 4`}
                  width={1200}
                  height={1600}
                  draggable={false}
                />
              </div>
              <div className="flex max-h-[90vh] w-full justify-center overflow-hidden px-[var(--x-padding)] md:shrink-0">
                <Image
                  className="h-auto w-[75%] max-w-none object-contain"
                  src="/images/dummy/dum-4.jpg"
                  alt={`${contents.project} gallery image 5`}
                  width={1920}
                  height={1280}
                  draggable={false}
                />
              </div>
              <div className="flex max-h-full w-full justify-between overflow-hidden md:shrink-0">
                <Image
                  className="h-auto w-full max-w-none object-contain"
                  src="/images/dummy/dum-5.jpg"
                  alt={`${contents.project} gallery image 6`}
                  width={1920}
                  height={1280}
                  draggable={false}
                />
              </div>
              <div className="flex max-h-full w-full justify-between overflow-hidden md:shrink-0">
                <Image
                  className="h-auto w-full max-w-none object-contain"
                  src="/images/dummy/dum-6.jpg"
                  alt={`${contents.project} gallery image 7`}
                  width={1920}
                  height={1280}
                  draggable={false}
                />
              </div>
            </div>
          </>
        )}
      </main>
    </>
  );
}
