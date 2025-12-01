import { useState, useEffect, useRef, useCallback } from 'react';
import { type GallerySelection } from '@/components/HomeGallery';

export interface ZoomStyle {
  x: number;
  y: number;
  scale: number;
  originX: number;
  originY: number;
}

export type ZoomMode = 'default' | 'center' | 'cover';

export interface UseZoomOptions {
  /**
   * 초기 줌 모드
   * - default: 줌 없음
   * - center: 중심으로 확대, 여백 있음
   * - cover: 화면을 완전히 채움
   * @default 'default'
   */
  initialMode?: ZoomMode;
  /**
   * center 모드일 때 사용할 상하 여백 (픽셀)
   * @default 200
   */
  centerPadding?: number;
  /**
   * 애니메이션 duration (밀리초)
   * @default 800
   */
  animationDuration?: number;
  /**
   * 스크롤을 고정할지 여부
   * @default true
   */
  lockScroll?: boolean;
  /**
   * 리사이즈 시 줌 아웃할지 여부
   * @default true
   */
  zoomOutOnResize?: boolean;
  /**
   * 컨테이너 ref (transform origin 계산용)
   */
  containerRef?: React.RefObject<HTMLDivElement>;
  /**
   * 디버그 모드
   * @default false
   */
  debug?: boolean;
}

export interface UseZoomReturn {
  /**
   * 현재 선택된 이미지
   */
  selected: GallerySelection | null;
  /**
   * 현재 줌 모드
   */
  mode: ZoomMode;
  /**
   * 줌 스타일
   */
  zoomStyle: ZoomStyle;
  /**
   * 애니메이션 진행 중 여부
   */
  isAnimating: boolean;
  /**
   * 이미지 선택 및 모드 설정
   */
  selectImage: (image: GallerySelection, mode?: ZoomMode) => void;
  /**
   * 줌 모드 변경 (현재 선택된 이미지 유지)
   */
  setMode: (mode: ZoomMode) => void;
  /**
   * 줌 아웃 (default 모드로 복귀)
   */
  zoomOut: () => void;
  /**
   * 줌 스타일 업데이트 (추가 확대 등)
   */
  updateZoomStyle: (updater: (prev: ZoomStyle) => ZoomStyle) => void;
}

// 디버그 로그 유틸리티 (사용하지 않음)
const debugLog = (debug: boolean, ...args: unknown[]) => {
  // 디버그 로그 비활성화
};

export function useZoom(options: UseZoomOptions = {}): UseZoomReturn {
  const {
    initialMode = 'default',
    centerPadding = 200,
    animationDuration = 800,
    // lockScroll 옵션은 제거됨 (스크롤 방지 기능 삭제)
    zoomOutOnResize = true,
    containerRef,
    debug = false,
  } = options;

  const [selected, setSelected] = useState<GallerySelection | null>(null);
  const [mode, setModeState] = useState<ZoomMode>(initialMode);
  const [zoomStyle, setZoomStyle] = useState<ZoomStyle>({ x: 0, y: 0, scale: 1, originX: 0, originY: 0 });
  const [isAnimating, setIsAnimating] = useState(false);

  const internalContainerRef = useRef<HTMLDivElement>(null);
  const actualContainerRef = containerRef || internalContainerRef;
  const zoomStyleRef = useRef<ZoomStyle>({ x: 0, y: 0, scale: 1, originX: 0, originY: 0 });
  const animationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const originalRectRef = useRef<DOMRect | null>(null);
  const prevModeRef = useRef<ZoomMode>(initialMode);

  // zoomStyle이 변경될 때마다 ref 업데이트
  useEffect(() => {
    zoomStyleRef.current = zoomStyle;
  }, [zoomStyle]);

  // 줌 계산 (모드에 따라 다른 계산) - 클릭한 요소의 중심을 origin으로 사용
  const calculateZoom = useCallback(
    (targetMode: ZoomMode) => {
      if (!selected) {
        debugLog(debug, '[useZoom] calculateZoom이 selected 없이 호출됨');
        return;
      }

      const prevMode = prevModeRef.current;

      debugLog(debug, '[useZoom] 줌 계산 시작', {
        projectId: selected.projectId,
        targetMode,
        prevMode,
      });

      // default 모드는 줌 없음 - 기존 origin 유지하며 scale만 1로
      if (targetMode === 'default') {
        setZoomStyle((prev) => ({
          x: 0,
          y: 0,
          scale: 1,
          originX: prev.originX,
          originY: prev.originY,
        }));
        setIsAnimating(true);

        if (animationTimerRef.current) {
          clearTimeout(animationTimerRef.current);
        }
        animationTimerRef.current = setTimeout(() => {
          setIsAnimating(false);
          animationTimerRef.current = null;
          // 애니메이션 완료 후 origin도 초기화
          setZoomStyle({ x: 0, y: 0, scale: 1, originX: 0, originY: 0 });
          originalRectRef.current = null;
        }, animationDuration);

        // 이전 모드 업데이트
        prevModeRef.current = 'default';
        return;
      }

      // 저장된 원본 rect 사용
      const rect = originalRectRef.current;
      if (!rect) {
        debugLog(debug, '[useZoom] 원본 rect가 없음');
        return;
      }

      // 스케일 계산
      let scale: number;
      if (targetMode === 'cover') {
        // 화면을 완전히 채우도록 (부동소수점 오차 방지를 위해 약간의 여유 추가)
        const scaleX = window.innerWidth / rect.width;
        const scaleY = window.innerHeight / rect.height;
        scale = Math.max(scaleX, scaleY) * 1.001; // 0.1% 여유 추가로 여백 완전 제거
      } else {
        // center: 여백을 두고 중심에 배치
        const availableHeight = window.innerHeight - centerPadding;
        const availableWidth = window.innerWidth - centerPadding;
        const scaleX = availableWidth / rect.width;
        const scaleY = availableHeight / rect.height;
        scale = Math.min(scaleX, scaleY);
      }

      // center ↔ cover 전환 시 scale만 변경 (origin 유지)
      if ((prevMode === 'center' && targetMode === 'cover') || (prevMode === 'cover' && targetMode === 'center')) {
        // cover 모드로 전환 시 여백 제거를 위한 여유 적용
        const finalScale = targetMode === 'cover' ? scale * 1.001 : scale / 1.001;
        debugLog(debug, '[useZoom] 모드 전환: scale만 변경', { from: prevMode, to: targetMode, scale: finalScale });
        setZoomStyle((prev) => ({ ...prev, scale: finalScale }));

        setIsAnimating(true);
        if (animationTimerRef.current) {
          clearTimeout(animationTimerRef.current);
        }
        animationTimerRef.current = setTimeout(() => {
          setIsAnimating(false);
          animationTimerRef.current = null;
        }, animationDuration);

        // 이전 모드 업데이트
        prevModeRef.current = targetMode;
        return;
      }

      // 이전 모드 업데이트
      prevModeRef.current = targetMode;

      // 클릭한 이미지의 화면상 중심 좌표를 origin으로 사용
      const imageCenterX = rect.left + rect.width / 2;
      const imageCenterY = rect.top + rect.height / 2;

      // 컨테이너 기준으로 origin 계산 (컨테이너 내에서의 상대 위치)
      let originX = imageCenterX;
      let originY = imageCenterY;

      if (actualContainerRef.current) {
        const containerRect = actualContainerRef.current.getBoundingClientRect();
        // 컨테이너 내에서의 상대 좌표
        originX = imageCenterX - containerRect.left;
        originY = imageCenterY - containerRect.top;
      }

      // 화면 중심
      const screenCenterX = window.innerWidth / 2;
      const screenCenterY = window.innerHeight / 2;

      // Translate 계산: 이미지 중심이 화면 중심으로 이동하도록
      // origin이 이미지 중심이므로, scale 후 이미지 중심은 그대로 유지됨
      // 따라서 단순히 (화면중심 - 이미지중심) 만큼 이동하면 됨
      const tx = screenCenterX - imageCenterX;
      const ty = screenCenterY - imageCenterY;

      // 디버그 로그 제거

      setZoomStyle({ x: tx, y: ty, scale, originX, originY });

      setIsAnimating(true);

      if (animationTimerRef.current) {
        clearTimeout(animationTimerRef.current);
      }

      animationTimerRef.current = setTimeout(() => {
        setIsAnimating(false);
        animationTimerRef.current = null;
      }, animationDuration);
    },
    [selected, centerPadding, actualContainerRef, animationDuration, debug],
  );

  // 모드가 변경될 때마다 줌 재계산
  useEffect(() => {
    if (selected) {
      calculateZoom(mode);
    }
  }, [mode, selected, calculateZoom]);

  // 리사이즈 핸들러
  const handleResize = useCallback(() => {
    if (!zoomOutOnResize || !selected) return;
    debugLog(debug, '[useZoom] 리사이즈 감지, 줌 아웃');
    setSelected(null);
    setModeState('default');
    originalRectRef.current = null;
  }, [zoomOutOnResize, selected, debug]);

  // 리사이즈 리스너 등록
  useEffect(() => {
    if (!zoomOutOnResize || !selected) return;

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [zoomOutOnResize, selected, handleResize]);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (animationTimerRef.current) {
        clearTimeout(animationTimerRef.current);
      }
      originalRectRef.current = null;
    };
  }, []);

  // 이미지 선택
  const selectImage = useCallback(
    (image: GallerySelection, targetMode: ZoomMode = 'center') => {
      debugLog(debug, '[useZoom] selectImage called', {
        projectId: image.projectId,
        targetMode,
      });

      // rect가 없으면 DOM에서 가져오기
      if (!image.rect) {
        const element = document.getElementById(`project-${image.projectId}`);
        if (element) {
          image.rect = element.getBoundingClientRect();
        } else {
          // 이미지 요소를 찾을 수 없음
          return;
        }
      }

      // 원본 rect 저장 (클릭 시점의 화면상 위치)
      originalRectRef.current = image.rect;

      setSelected(image);
      setModeState(targetMode);
    },
    [debug],
  );

  // 모드 변경
  const setMode = useCallback(
    (newMode: ZoomMode) => {
      if (!selected && newMode !== 'default') {
        // 선택된 이미지가 없습니다
        return;
      }

      debugLog(debug, '[useZoom] 모드 변경', { from: mode, to: newMode });
      setModeState(newMode);

      // default 모드로 변경 시 선택 해제
      if (newMode === 'default') {
        setSelected(null);
        originalRectRef.current = null;
      }
    },
    [selected, mode, debug],
  );

  // 줌 아웃
  const zoomOut = useCallback(() => {
    // default 모드로 먼저 변경 (애니메이션 트리거)
    setModeState('default');
    // 애니메이션 완료 후 selected 초기화
    setTimeout(() => {
      setSelected(null);
    }, animationDuration);
  }, [animationDuration]);

  // 줌 스타일 업데이트
  const updateZoomStyle = useCallback((updater: (prev: ZoomStyle) => ZoomStyle) => {
    setZoomStyle(updater);
  }, []);

  return {
    selected,
    mode,
    zoomStyle,
    isAnimating,
    selectImage,
    setMode,
    zoomOut,
    updateZoomStyle,
  };
}
