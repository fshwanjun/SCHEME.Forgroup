import { useState, DetailedHTMLProps, HTMLAttributes, useMemo, useRef, Children, useEffect } from 'react';
import { useIntersection } from '@/hooks/useIntersectionObserver';

export type InfiniteScrollEndHandler = () => void;

export interface InfiniteScrollProps extends DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement> {
  /**
   * 비활성화 여부
   */
  disabled?: boolean;

  /**
   * 마진
   */
  rootMargin?: string;

  /**
   * 스크롤 끝 이벤트 메서드
   */
  onEnd?: InfiniteScrollEndHandler;
}

export default function InfiniteScroll({
  disabled,
  rootMargin,
  onEnd,
  children,
  ...props
}: InfiniteScrollProps): React.ReactNode {
  const [domState, setDomState] = useState<Element | null>(null);
  const triggeredRef = useRef(false);
  const childrenCount = useMemo(() => Children.count(children), [children]);

  // Reset trigger when children change (new content appended)
  useEffect(() => {
    triggeredRef.current = false;
  }, [childrenCount]);

  useIntersection(
    domState,
    (entry: IntersectionObserverEntry) => {
      // DOM이 보일 경우 - 한 번만 트리거, 컨텐츠 갱신 시 초기화
      if (entry.isIntersecting && !triggeredRef.current) {
        triggeredRef.current = true;
        onEnd?.();
      }
    },
    { rootMargin },
  );

  return (
    <div {...props} className="flex w-full flex-col items-center">
      {children}

      {!disabled ? <div ref={setDomState} style={{ width: '100%', height: 1 }} aria-hidden /> : null}
    </div>
  );
}
