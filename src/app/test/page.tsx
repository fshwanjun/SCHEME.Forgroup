import HomeContainer from '@/components/HomeContainer';
import LogoInline from '@/components/LogoInline';

export default function TestPage() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <LogoInline
        variant="svg"
        lottieSrc="/data.json" // 또는 lottieData={jsonObject}
        src="/data.svg"
        width={600}
        height={320}
        autoplay
        loop
      />
    </div>
  );
}
