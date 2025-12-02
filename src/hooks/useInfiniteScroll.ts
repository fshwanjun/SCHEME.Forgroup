import { useState, useEffect, useRef, useCallback } from 'react';

export interface UseInfiniteScrollOptions {
  /**
   * 초기 섹션 ID 배열
   * @default [0, 1, 2]
   */
  initialSectionIds?: number[];
  /**
   * 트리거 지점까지의 여유 공간 (픽셀)
   * @default 1000
   */
  triggerOffset?: number;
  /**
   * 무한 스크롤 비활성화 조건 (예: 줌 상태일 때)
   */
  disabled?: boolean;
  /**
   * 최대 섹션 개수 (메모리 관리용)
   * @default 10
   */
  maxSections?: number;
  /**
   * 스크롤 컨테이너 ref
   */
  scrollContainerRef?: React.RefObject<HTMLElement | null>;
}

export interface UseInfiniteScrollReturn {
  /**
   * 현재 섹션 ID 배열
   */
  sectionIds: number[];
  /**
   * 트리거 요소 ref setter
   */
  setTriggerElement: (element: HTMLElement | null) => void;
  /**
   * 섹션 리스트 렌더링 헬퍼
   */
  renderSections: <T>(renderItem: (id: number, index: number, isTrigger: boolean) => T) => T[];
  /**
   * 수동으로 다음 섹션 추가
   */
  loadNext: () => void;
  /**
   * 섹션 ID 리셋
   */
  reset: () => void;
}

export function useInfiniteScroll(options: UseInfiniteScrollOptions = {}): UseInfiniteScrollReturn {
  const {
    initialSectionIds = [0, 1, 2],
    triggerOffset = 1000,
    disabled = false,
    maxSections = 10,
    scrollContainerRef,
  } = options;

  const [sectionIds, setSectionIds] = useState<number[]>(initialSectionIds);
  const [triggerElement, setTriggerElement] = useState<HTMLElement | null>(null);
  const isLoadingRef = useRef(false);
  const lastLoadTimeRef = useRef(0);
  // 스크롤 컨테이너를 state로 관리하여 변경 감지
  const [scrollContainer, setScrollContainer] = useState<HTMLElement | null>(null);

  // scrollContainerRef.current를 주기적으로 확인
  useEffect(() => {
    const checkContainer = () => {
      const container = scrollContainerRef?.current ?? null;
      setScrollContainer((prev) => {
        if (prev !== container) {
          return container;
        }
        return prev;
      });
    };

    // 초기 체크
    checkContainer();

    // 100ms마다 체크 (컴포넌트 마운트 직후 ref가 설정되지 않을 수 있음)
    const interval = setInterval(checkContainer, 100);

    // 3초 후 interval 정리 (충분한 시간이 지나면 더 이상 체크 불필요)
    const cleanup = setTimeout(() => {
      clearInterval(interval);
    }, 3000);

    return () => {
      clearInterval(interval);
      clearTimeout(cleanup);
    };
  }, [scrollContainerRef]);

  // 다음 섹션 로드
  const loadNext = useCallback(() => {
    // 디바운싱: 300ms 내 중복 호출 방지
    const now = Date.now();
    if (now - lastLoadTimeRef.current < 300) {
      return;
    }
    
    if (isLoadingRef.current) {
      return;
    }
    
    isLoadingRef.current = true;
    lastLoadTimeRef.current = now;

    setSectionIds((prev) => {
      const lastId = prev[prev.length - 1];
      const newId = lastId + 1;
      
      // 최대 섹션 개수 초과 시 오래된 섹션 제거
      if (prev.length >= maxSections) {
        return [...prev.slice(1), newId];
      }
      
      return [...prev, newId];
    });

    // 로딩 플래그 리셋
    setTimeout(() => {
      isLoadingRef.current = false;
    }, 100);
  }, [maxSections]);

  // 스크롤 이벤트로 트리거 감지
  useEffect(() => {
    if (disabled || !scrollContainer) return;

    const handleScroll = () => {
      if (isLoadingRef.current || !triggerElement) return;

      const rect = triggerElement.getBoundingClientRect();
      
      // 컨테이너 높이
      const containerHeight = scrollContainer.clientHeight;

      // 트리거 요소의 상단이 컨테이너 하단 + offset 이내에 있으면 로드
      if (rect.top <= containerHeight + triggerOffset) {
        loadNext();
      }
    };

    // 초기 체크 (약간의 지연 후 실행)
    const initialCheck = setTimeout(handleScroll, 300);

    // 스크롤 이벤트 (throttle 적용)
    let ticking = false;
    const throttledScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
      }
    };

    // 스크롤 이벤트 리스너 등록
    scrollContainer.addEventListener('scroll', throttledScroll, { passive: true });
    window.addEventListener('resize', throttledScroll, { passive: true });
    
    return () => {
      clearTimeout(initialCheck);
      scrollContainer.removeEventListener('scroll', throttledScroll);
      window.removeEventListener('resize', throttledScroll);
    };
  }, [disabled, triggerElement, triggerOffset, loadNext, scrollContainer]);

  // 섹션 리스트 렌더링 헬퍼
  const renderSections = useCallback(
    <T>(renderItem: (id: number, index: number, isTrigger: boolean) => T): T[] => {
      return sectionIds.map((id, index) => {
        // 마지막에서 두 번째 섹션을 트리거로 사용
        const isTrigger = index === sectionIds.length - 2;
        return renderItem(id, index, isTrigger);
      });
    },
    [sectionIds],
  );

  // 리셋
  const reset = useCallback(() => {
    setSectionIds(initialSectionIds);
    isLoadingRef.current = false;
    lastLoadTimeRef.current = 0;
  }, [initialSectionIds]);

  return {
    sectionIds,
    setTriggerElement,
    renderSections,
    loadNext,
    reset,
  };
}
