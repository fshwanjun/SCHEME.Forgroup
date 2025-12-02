import { useState, useEffect } from 'react';

type WindowSize = {
  width: number;
  height: number;
  aspect: number;
  isLg: boolean;
  isMd: boolean;
  isSm: boolean;
};

const LG_MIN = 1024;
const MD_MIN = 768;

function computeSize(): WindowSize {
  if (typeof window === 'undefined') {
    return { width: 0, height: 0, aspect: 0, isLg: false, isMd: false, isSm: true };
  }
  const width = window.innerWidth;
  const height = window.innerHeight;
  return {
    width,
    height,
    aspect: height > 0 ? width / height : 0,
    isLg: width >= LG_MIN,
    isMd: width >= MD_MIN && width < LG_MIN,
    isSm: width < MD_MIN,
  };
}

const useWindowSize = () => {
  const [windowSize, setWindowSize] = useState<WindowSize>(() => computeSize());

  useEffect(() => {
    const handleResize = () => {
      setWindowSize(computeSize());
    };
    // Ensure state is up-to-date on mount
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return windowSize;
};

export default useWindowSize;
