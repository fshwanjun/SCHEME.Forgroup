'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

import Header from '@/components/Header';
import MobileMenu from '@/components/MobileMenu';
import HomeContainer from '@/components/HomeContainer';
import Image from 'next/image';

// 리스트 아이템 타입 정의
interface ListItem {
  id: string;
  text: string;
}

// 데이터 타입 정의
interface AboutData {
  imageUrl: string;
  description: string;
  experience: ListItem[] | string; // 호환성 유지 (string일 경우도 처리)
  services: ListItem[] | string;
  clients: ListItem[] | string;
  address: string;
  contact: string;
  social: string;
}

// 기본값
const defaultData: AboutData = {
  imageUrl: '/images/dummy/studio.jpg',
  description: 'No description available.',
  experience: [],
  services: [],
  clients: [],
  address: '',
  contact: '',
  social: '',
};

// 리스트 렌더링 헬퍼 컴포넌트
function RenderList({ items }: { items: ListItem[] | string }) {
  // 1. 문자열인 경우 (구버전 호환)
  if (typeof items === 'string') {
    return <span>{items}</span>;
  }

  // 2. 배열이지만 비어있는 경우
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }

  // 3. 리스트 아이템 렌더링
  return (
    <ul className="flex flex-col space-y-1">
      {items.map((item) => (
        <li key={item.id}>{item.text}</li>
      ))}
    </ul>
  );
}

export default function StudioPage() {
  const [data, setData] = useState<AboutData>(defaultData);
  const [headerLogoTrigger, setHeaderLogoTrigger] = useState<number | undefined>(undefined);

  useEffect(() => {
    const fetchData = async () => {
      const { data: configData, error } = await supabase.from('config').select('content').eq('id', 'about').single();

      if (error) {
        console.error('About 페이지 로드 에러:', error.message);
        return;
      }

      let parsedData: AboutData = defaultData;

      if (configData?.content) {
        try {
          // jsonb 타입이므로 이미 객체로 반환됨 (또는 string일 수도 있음)
          const content = configData.content;
          const parsed = typeof content === 'string' ? JSON.parse(content) : content;
          parsedData = { ...defaultData, ...parsed };
        } catch {
          // 파싱 실패 시 description으로 간주 (구버전 호환)
          if (typeof configData.content === 'string') {
            parsedData.description = configData.content;
          }
        }
      }

      setData(parsedData);
      // 헤더 로고 애니메이션 트리거
      setHeaderLogoTrigger(Date.now());
    };

    fetchData();
  }, []);

  return (
    <HomeContainer
      isFixed={false}
      addClassName="studio-typography p-5 min-h-screen h-full flex flex-col gap-5 overflow-y-auto md:max-h-screen md:overflow-y-hidden">
      <Header isFixed={false} headerLogoTrigger={headerLogoTrigger} />
      <MobileMenu />
      <div className="page-studio">
        {/* [좌측] 데스크탑 이미지 영역 (40%) */}
        <div className="relative hidden h-full min-h-0 overflow-hidden md:flex md:max-w-[40%] md:min-w-0 md:flex-[0_0_50%]">
          {data.imageUrl ? (
            <Image
              className="h-full w-auto max-w-full object-contain object-top"
              src={data.imageUrl}
              alt="Studio preview"
              width={1200}
              height={1600}
              draggable={false}
              unoptimized
            />
          ) : (
            // 이미지가 없을 때도 같은 영역 차지, 빈 공간 유지
            <div className="h-full w-full bg-transparent" />
          )}
        </div>

        {/* [우측] 컨텐츠 영역 (60%) */}
        <div className="flex min-w-0 basis-full flex-col justify-between gap-5 md:max-w-[58%] md:min-w-0 md:flex-[0_0_60%] md:overflow-hidden">
          {/* 1. 메인 설명 (스크롤 가능 영역) */}
          <div className="custom-scroll overflow-hidden md:flex md:flex-col md:overflow-auto md:pr-3">
            <h3>{data.description}</h3>
          </div>

          {/* [모바일 전용] 이미지 */}
          {data.imageUrl && (
            <Image
              className="block h-auto w-full md:hidden"
              src={data.imageUrl}
              alt="Studio preview mobile"
              width={1200}
              height={1600}
              draggable={false}
              unoptimized
            />
          )}

          {/* 2. 하단 3열 그리드 정보 */}
          <div className="grid w-full grid-cols-3 gap-x-4 gap-y-10">
            <div className="flex flex-col gap-2">
              <h5>Experience</h5>
              <div className="flex flex-col">
                <RenderList items={data.experience} />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <h5>Services</h5>
              <div className="flex flex-col">
                <RenderList items={data.services} />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <h5>Clients</h5>
              <div className="flex flex-col">
                <RenderList items={data.clients} />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <h5>Address</h5>
              <span className="flex flex-col">{data.address}</span>
            </div>
            <div className="flex flex-col gap-2">
              <h5>Contact</h5>
              <span className="flex flex-col">{data.contact}</span>
            </div>
            <div className="flex flex-col gap-2">
              <h5>Social</h5>
              <span className="flex flex-col">{data.social}</span>
            </div>
          </div>
        </div>
      </div>
    </HomeContainer>
  );
}
