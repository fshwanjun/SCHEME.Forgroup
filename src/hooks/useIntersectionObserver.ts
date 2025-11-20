import { useEffect, useRef } from 'react';

type IntersectionHandler = (entry: IntersectionObserverEntry) => void;

type Options = Omit<IntersectionObserverInit, 'root'> & {
  root?: IntersectionObserverInit['root'];
};

export function useIntersection(target: Element | null, handler: IntersectionHandler, options: Options = {}) {
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!target) {
      return undefined;
    }

    if (typeof window === 'undefined' || typeof window.IntersectionObserver === 'undefined') {
      handlerRef.current?.({ isIntersecting: true } as IntersectionObserverEntry);
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => handlerRef.current(entry));
      },
      options,
    );

    observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, [target, options.root, options.rootMargin, options.threshold]);
}
