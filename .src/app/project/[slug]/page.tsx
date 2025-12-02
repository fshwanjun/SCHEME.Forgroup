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
    <main className="relative w-ful h-full">
      <div className="fixed bottom-0 left-0 w-full px-[var(--x-padding)] pb-8 flex justify-between gap-4 text-white">
        <div className="flex flex-col gap-1">
          <h5>Wine Rack</h5>
          <h6>Project</h6>
        </div>
        <div className="flex flex-col gap-1">
          <h5>Year</h5>
          <h6>2024</h6>
        </div>
        <div className="flex flex-col gap-1">
          <h5>Client</h5>
          <h6>Sanro</h6>
        </div>
        <div className="flex flex-col gap-1">
          <h5>Services</h5>
          <h6>Industrial Design</h6>
        </div>
      </div>
      <div className="w-full h-full overflow-hidden">
        <img className="w-full h-full object-cover" src="/images/dummy/test-0.jpg" alt="studio" draggable={false} />
      </div>
      <div className="w-full min-h-2/3 grid grid-cols-2 gap-4 overflow-hidden mx-auto px-[var(--x-padding)] py-16">
        <h1 className="leading-[124%]">
          Sanro wine rack
          <br />
          Design Project
          <br />
        </h1>
        <div className="flex flex-col justify-between gap-4">
          <div className="flex flex-row gap-12 pb-40">
            <div className="flex flex-col gap-2 w-[20%]">
              <h5>Product</h5>
              <div className="flex flex-col">
                <span>wine rack</span>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <h5>Design Keywords</h5>
              <div className="flex flex-col">
                <span>
                  warm <br />
                  organic
                  <br />
                  Vivid
                  <br />
                  modern
                  <br />
                  luxurious
                  <br />
                  classic
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <h5>Challenge</h5>
            <div className="flex flex-col">
              <h4>
                The FOR wine rack is a modular storage solution built from five flat metal plates that assemble together
                to form a unique zigzag structure. This efficient, five-panel design simplifies logistics and
                manufacturing, ensuring the piece is easy to set up at home. The rack holds up to six bottles, secured
                within six circular openings. Its key feature is modularity: users can effortlessly stack multiple units
                to create flexible, varied vertical or horizontal display arrangements.
              </h4>
            </div>
          </div>
        </div>
      </div>
      <div className="w-full flex flex-col gap-16 pb-16">
        <div className="w-full max-h-[90vh] md:shrink-0 overflow-hidden px-[var(--x-padding)] ">
          <img className="w-full h-auto object-contain max-w-none" src="/images/dummy/dum-0.jpg" draggable={false} />
        </div>
        <div className="w-full max-h-[90vh] md:shrink-0 overflow-hidden flex justify-start px-[var(--x-padding)]">
          <img className="w-[45%] h-auto object-contain max-w-none" src="/images/dummy/dum-1.jpg" draggable={false} />
        </div>
        <div className="w-full max-h-[90vh] md:shrink-0 overflow-hidden flex justify-end px-[var(--x-padding)]">
          <img className="w-[75%] h-auto object-contain max-w-none" src="/images/dummy/dum-2.jpg" draggable={false} />
        </div>
        <div className="w-full max-h-[90vh] md:shrink-0 overflow-hidden flex justify-start px-[var(--x-padding)]">
          <img className="w-[45%] h-auto object-contain max-w-none" src="/images/dummy/dum-3.jpg" draggable={false} />
        </div>
        <div className="w-full max-h-[90vh] md:shrink-0 overflow-hidden flex justify-center px-[var(--x-padding)]">
          <img className="w-[75%] h-auto object-contain max-w-none" src="/images/dummy/dum-4.jpg" draggable={false} />
        </div>
        <div className="w-full max-h-full md:shrink-0 overflow-hidden flex justify-between">
          <img className="w-full h-auto object-contain max-w-none" src="/images/dummy/dum-5.jpg" draggable={false} />
        </div>
        <div className="w-full max-h-full md:shrink-0 overflow-hidden flex justify-between">
          <img className="w-full h-auto object-contain max-w-none" src="/images/dummy/dum-6.jpg" draggable={false} />
        </div>
      </div>
    </main>
  );
}
