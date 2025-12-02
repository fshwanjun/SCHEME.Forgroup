import { useState, useEffect, useRef, useCallback } from 'react';
import { useIntersection } from '@/hooks/useIntersectionObserver';

export interface UseInfiniteScrollOptions {
  /**
   * 초기 섹션 ID 배열
   * @default [0, 1, 2]
   */
  initialSectionIds?: number[];
  /**
   * 트리거 인덱스 (몇 번째 섹션을 감시할지)
   * @default 1 (두 번째 섹션)
   */
  triggerIndex?: number;
  /**
   * 트리거 지점까지의 여유 공간 (픽셀)
   * @default 1000
   */
  triggerOffset?: number;
  /**
   * IntersectionObserver의 rootMargin
   * @default '0px 0px 500px 0px'
   */
  rootMargin?: string;
  /**
   * 스크롤 이벤트 백업 활성화 여부
   * @default true
   */
  enableScrollBackup?: boolean;
  /**
   * 무한 스크롤 비활성화 조건 (예: 줌 상태일 때)
   */
  disabled?: boolean;
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
    triggerIndex = 1,
    triggerOffset = 1000,
    rootMargin = '0px 0px 500px 0px',
    enableScrollBackup = true,
    disabled = false,
  } = options;

  const [sectionIds, setSectionIds] = useState<number[]>(initialSectionIds);
  const [triggerElement, setTriggerElement] = useState<HTMLElement | null>(null);
  const triggeredRef = useRef(false);

  // sectionIds가 변경되면 트리거 리셋
  useEffect(() => {
    triggeredRef.current = false;
  }, [sectionIds]);

  // 다음 섹션 로드
  const loadNext = useCallback(() => {
    setSectionIds((prev) => {
      const lastId = prev[prev.length - 1];
      const newId = lastId + 1;
      const newIds = [...prev.slice(1), newId];
      return newIds;
    });
  }, []);

  // 트리거 지점에 도달했는지 감지 (IntersectionObserver) - 지정된 인덱스의 섹션을 감시
  useIntersection(
    triggerElement,
    (entry: IntersectionObserverEntry) => {
      if (disabled) return;

      // 지정된 섹션의 바닥이 화면 중간쯤 왔을 때 미리 로딩
      if (entry.isIntersecting) {
        const rect = entry.boundingClientRect;
        // 섹션의 바닥이 뷰포트 높이 + triggerOffset 보다 위에 있을 때
        const isTriggerPoint = rect.bottom <= window.innerHeight + triggerOffset;

        if (isTriggerPoint && !triggeredRef.current) {
          triggeredRef.current = true;
          loadNext();
        }
      }
    },
    { rootMargin, threshold: [0, 0.1, 0.5, 1] },
  );

  // 스크롤 이벤트로도 감지 (백업) - 지정된 섹션 기준
  useEffect(() => {
    if (disabled || !enableScrollBackup) return;

    const handleScroll = () => {
      if (!triggerElement || triggeredRef.current) return;

      const rect = triggerElement.getBoundingClientRect();
      const windowHeight = window.innerHeight;

      // 섹션의 바닥이 화면 하단 근처에 도달했는지 확인
      const isTriggerPoint = rect.bottom <= windowHeight + triggerOffset;

      if (isTriggerPoint) {
        triggeredRef.current = true;
        loadNext();
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [disabled, enableScrollBackup, triggerElement, triggerOffset, loadNext]);

  // 섹션 리스트 렌더링 헬퍼
  const renderSections = useCallback(
    <T>(renderItem: (id: number, index: number, isTrigger: boolean) => T): T[] => {
      return sectionIds.map((id, index) => {
        const isTrigger = index === triggerIndex;
        return renderItem(id, index, isTrigger);
      });
    },
    [sectionIds, triggerIndex],
  );

  // 리셋
  const reset = useCallback(() => {
    setSectionIds(initialSectionIds);
    triggeredRef.current = false;
  }, [initialSectionIds]);

  return {
    sectionIds,
    setTriggerElement,
    renderSections,
    loadNext,
    reset,
  };
}
