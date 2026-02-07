'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';

import Header from '@/components/Header';
import MobileMenu from '@/components/MobileMenu';
import HomeContainer from '@/components/HomeContainer';
import Image from 'next/image';
import Link from 'next/link';

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
  experienceTitle?: string;
  servicesTitle?: string;
  clientsTitle?: string;
  addressTitle?: string;
  contactTitle?: string;
  socialTitle?: string;
  // 섹션 표시 여부
  experienceVisible?: boolean;
  servicesVisible?: boolean;
  clientsVisible?: boolean;
  addressVisible?: boolean;
  contactVisible?: boolean;
  socialVisible?: boolean;
}

// 기본값
const defaultData: AboutData = {
  imageUrl: '', // 빈 문자열로 설정하여 로딩 중 기본 이미지 플래시 방지
  description: '',
  experience: [],
  services: [],
  clients: [],
  address: '',
  contact: '',
  social: '',
  experienceTitle: 'Experience',
  servicesTitle: 'Services',
  clientsTitle: 'Clients',
  addressTitle: 'Address',
  contactTitle: 'Contact',
  socialTitle: 'Social',
  // 기본적으로 모든 섹션 표시
  experienceVisible: true,
  servicesVisible: true,
  clientsVisible: true,
  addressVisible: true,
  contactVisible: true,
  socialVisible: true,
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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const { data: configData, error } = await supabase.from('config').select('content').eq('id', 'about').single();

        if (error) {
          setIsLoading(false);
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
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="flex h-screen flex-col md:gap-4">
      <Header isFixed={false} headerLogoTrigger={headerLogoTrigger} />
      <MobileMenu />
      <HomeContainer
        isFixed={false}
        addClassName="studio-typography p-5 flex-1 flex flex-col gap-5 overflow-y-auto md:overflow-y-hidden pt-20 md:pt-0">
        <motion.div
          className="page-studio"
          initial={{ opacity: 0 }}
          animate={{ opacity: isLoading ? 0 : 1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
          {/* [좌측] 데스크탑 이미지 영역 (40%) */}
          <div className="pointer-events-none relative hidden h-full min-h-0 w-fit overflow-hidden select-none md:flex md:max-w-[50%] md:min-w-0">
            {!isLoading && data.imageUrl ? (
              <Image
                key={data.imageUrl}
                className="h-full w-auto max-w-full object-cover object-top"
                src={data.imageUrl}
                alt="Studio preview"
                width={1200}
                height={1600}
                sizes="40vw"
                priority
                draggable={false}
              />
            ) : (
              // 이미지가 없거나 로딩 중일 때도 같은 영역 차지, 빈 공간 유지
              <div className="h-full w-full bg-transparent" />
            )}
          </div>

          {/* [우측] 컨텐츠 영역 - flex의 나머지 공간을 채움 */}
          {/* md~xl: 전체 스크롤 (순차 배치), xl이상: overflow hidden (메인설명만 스크롤) */}
          <div className="flex w-full min-w-0 flex-1 flex-col justify-between gap-y-15 md:min-w-0 md:justify-start md:gap-10 md:overflow-y-auto xl:justify-between xl:gap-0 xl:overflow-hidden">
            {/* 1. 메인 설명 */}
            {/* md~xl: 크롭 없음/스크롤 없음, xl이상: 내부 스크롤 가능 */}
            <div className="custom-scroll min-h-[20vh] overflow-hidden pb-12 md:flex md:h-auto md:min-h-0 md:shrink-0 md:flex-col md:overflow-visible md:pr-3 md:pb-0 xl:shrink xl:overflow-auto">
              <h3>{data.description}</h3>
            </div>

            {/* [모바일 전용] 이미지 */}
            {!isLoading && data.imageUrl && (
              <Image
                key={data.imageUrl}
                className="pointer-events-none block h-auto w-full md:hidden"
                src={data.imageUrl}
                alt="Studio preview mobile"
                width={1200}
                height={1600}
                sizes="100vw"
                priority
                draggable={false}
              />
            )}

            {/* 2. 하단 푸터 정보 - 4열 (1200px 이하 2x2) */}
            <div className="grid w-full grid-cols-1 gap-6 pt-4 min-[1200px]:flex min-[1200px]:flex-row min-[1200px]:items-center min-[1200px]:justify-between min-[1200px]:gap-4">
              <a href="mailto:info@studio-for.com" className="transition-opacity hover:opacity-60">
                info@studio-for.com
              </a>
              <a
                href="https://instagram.com/studio__for"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-opacity hover:opacity-60">
                @studio__for
              </a>
              <Link href="/privacy" className="transition-opacity hover:opacity-60">
                Privacy Policy
              </Link>
              <span>©2026. FOR</span>
            </div>

            {/* 모바일 전용 하단 여백 */}
            <div className="h-1 md:hidden" />
          </div>
        </motion.div>
      </HomeContainer>
    </div>
  );
}
