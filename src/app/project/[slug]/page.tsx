import Homecontainer from '@/components/Homecontainer';

type PageProps = {
  params: { slug: string };
};

export async function generateMetadata({ params }: PageProps) {
  return {
    title: `Project: ${params.slug}`,
  };
}

export default function ProjectDetailPage({ params }: PageProps) {
  const { slug } = params;
  return (
    <main className="w-ful h-full">
      <div className="w-full h-full overflow-hidden">
        <img className="w-full h-full object-cover" src="/images/dummy/test-0.jpg" alt="studio" draggable={false} />
      </div>
      <div>
        <h1>/project/{slug}</h1>
        <div></div>
      </div>
    </main>
  );
}
