'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import dynamic from 'next/dynamic';
import Header from '@/components/Header';
import MobileMenu from '@/components/MobileMenu';
import IntroLogo from '@/components/IntroLogo';
import { supabase } from '@/lib/supabase';
import useWindowSize from '@/hooks/useWindowSize';
import { HOME_LAYOUT_CONFIG } from '@/config/homeLayout';

const ProjectDetailContent = dynamic(() => import('@/components/ProjectDetailContent'), { ssr: false });

interface LandingPageImage {
  id: string;
  url: string;
  order: number;
  orientation?: 'horizontal' | 'vertical';
  projectSlug?: string;
}

interface ProjectImage {
  projectId: string;
  projectSlug?: string;
  verticalSrc: string;
  horizontalSrc: string;
  orientation?: 'horizontal' | 'vertical';
}

interface LoadedAsset {
  texture: THREE.Texture;
  src: string;
  width: number;
  height: number;
  projectId: string;
  projectSlug?: string;
  orientation?: 'horizontal' | 'vertical';
}

interface ProjectContent {
  thumbnail43?: string;
  thumbnail34?: string;
  project?: string;
  year?: number;
  client?: string;
  services?: string;
  product?: string;
  keyword?: string[];
  challenge?: string;
  detailImages?: Array<{
    id: string;
    url: string;
    orientation?: 'horizontal' | 'vertical';
    position?: 'left' | 'center' | 'right' | 'full-cover' | 'full-padding';
  }>;
}

interface Project {
  id: number;
  slug: string;
  title: string;
  description: string;
  contents?: ProjectContent;
}

type LandingConfigContent = {
  images?: LandingPageImage[];
};

interface FrameSpec {
  rowStart: number;
  colStart: number;
  colSpan: number;
  aspectRatio: number;
  orientation: 'horizontal' | 'vertical';
}

const parseFrameClass = (frameClass: string): FrameSpec | null => {
  const rowMatch = frameClass.match(/row-start-(\d+)/);
  const colStartMatch = frameClass.match(/col-start-(\d+)/);
  const colSpanMatch = frameClass.match(/col-span-(\d+)/);
  const aspectMatch = frameClass.match(/aspect-\[(\d+)\/(\d+)\]/);

  if (!rowMatch || !colStartMatch || !colSpanMatch || !aspectMatch) {
    return null;
  }

  const ratioW = Number(aspectMatch[1]) || 1;
  const ratioH = Number(aspectMatch[2]) || 1;
  const aspectRatio = ratioW / ratioH;

  return {
    rowStart: Number(rowMatch[1]),
    colStart: Number(colStartMatch[1]),
    colSpan: Number(colSpanMatch[1]),
    aspectRatio,
    orientation: aspectRatio < 1 ? 'vertical' : 'horizontal',
  };
};

interface CardNode {
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  xWorld: number;
  yContent: number;
  width: number;
  height: number;
  projectId: string;
  projectSlug?: string;
  src: string;
}

type ZoomPhase = 'none' | 'center' | 'cover';
type TweenCompleteAction = 'none' | 'zoom_out_complete' | 'open_cover';

interface CameraTween {
  fromX: number;
  fromY: number;
  fromZoom: number;
  toX: number;
  toY: number;
  toZoom: number;
  startAt: number;
  durationMs: number;
  isZoomOut: boolean;
  completeAction: TweenCompleteAction;
}

const DOM_EASE = { x1: 0.16, y1: 1, x2: 0.3, y2: 1 } as const;
const DOM_DURATION_MS = 900;
const DOM_EASE_CSS = 'cubic-bezier(0.16, 1, 0.3, 1)';

const sampleBezier = (t: number, a1: number, a2: number): number => {
  const inv = 1 - t;
  return 3 * inv * inv * t * a1 + 3 * inv * t * t * a2 + t * t * t;
};

const sampleBezierDerivative = (t: number, a1: number, a2: number): number => {
  const inv = 1 - t;
  return 3 * inv * inv * a1 + 6 * inv * t * (a2 - a1) + 3 * t * t * (1 - a2);
};

const cubicBezierYFromX = (x: number, x1: number, y1: number, x2: number, y2: number): number => {
  const clampedX = Math.min(1, Math.max(0, x));
  let t = clampedX;

  for (let i = 0; i < 6; i += 1) {
    const currentX = sampleBezier(t, x1, x2) - clampedX;
    const slope = sampleBezierDerivative(t, x1, x2);
    if (Math.abs(slope) < 1e-6) break;
    t -= currentX / slope;
    t = Math.min(1, Math.max(0, t));
  }

  return sampleBezier(t, y1, y2);
};

const softenInitialEasing = (linearT: number, easedT: number): number => {
  // DOM cubic-bezier(0.16, 1, 0.3, 1)는 초반 가속이 강해 WebGL 카메라에서는
  // "뚝" 튀는 체감이 생길 수 있어, 선형 성분을 소량 혼합해 시작 구간을 완화합니다.
  return easedT * 0.85 + linearT * 0.15;
};

export default function Home() {
  const [headerLogoTrigger, setHeaderLogoTrigger] = useState<number | undefined>(undefined);
  const [scrollContentHeight, setScrollContentHeight] = useState(1200);
  const [landingImages, setLandingImages] = useState<ProjectImage[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedHeroImageSrc, setSelectedHeroImageSrc] = useState<string | undefined>(undefined);
  const [isHeroImageLoaded, setIsHeroImageLoaded] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isModalInteractive, setIsModalInteractive] = useState(false);
  const [skipModalFadeOut, setSkipModalFadeOut] = useState(false);
  const [sectionCount, setSectionCount] = useState(4);
  const [skipRows, setSkipRows] = useState(0);
  const [isZoomLocked, setIsZoomLocked] = useState(false);
  const [zoomPhase, setZoomPhaseState] = useState<ZoomPhase>('none');
  const windowSize = useWindowSize();
  const isMobile = windowSize.isSm;

  const activeLayout = useMemo(() => (isMobile ? HOME_LAYOUT_CONFIG.mobile : HOME_LAYOUT_CONFIG.desktop), [isMobile]);
  const frameSpecs = useMemo(
    () => activeLayout.frameClasses.map(parseFrameClass).filter((item): item is FrameSpec => item !== null),
    [activeLayout.frameClasses],
  );
  const visibleFrameSpecs = useMemo(() => {
    if (frameSpecs.length === 0) return [];

    const filtered = frameSpecs.filter((frame) => frame.rowStart > skipRows);
    if (filtered.length === 0) return [];

    const minRowStart = filtered.reduce((min, frame) => Math.min(min, frame.rowStart), Number.POSITIVE_INFINITY);
    return filtered.map((frame) => ({
      ...frame,
      rowStart: frame.rowStart - minRowStart + 1,
    }));
  }, [frameSpecs, skipRows]);

  const mountRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const assetsRef = useRef<LoadedAsset[]>([]);
  const cardsRef = useRef<CardNode[]>([]);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const raycasterRef = useRef<THREE.Raycaster | null>(null);
  const selectedCardRef = useRef<CardNode | null>(null);
  const sectionStrideRef = useRef(0);
  const pointerStartRef = useRef<{ x: number; y: number; scrollTop: number } | null>(null);
  const frameRef = useRef<number | null>(null);
  const appendGuardHeightRef = useRef(0);
  const zoomLockedRef = useRef(false);
  const zoomPhaseRef = useRef<ZoomPhase>('none');
  const prevZoomPhaseRef = useRef<ZoomPhase>('none');
  const historyPushedRef = useRef(false);
  const cameraTweenRef = useRef<CameraTween | null>(null);
  const coverRevealStartedRef = useRef(false);
  const pendingProjectRef = useRef<Project | null>(null);
  const pendingHeroImageSrcRef = useRef<string | undefined>(undefined);

  const handleHeaderAnimationStart = useCallback(() => {
    const trigger = Date.now();
    setHeaderLogoTrigger(trigger);
  }, []);

  const handleHomeClick = useCallback(() => {
    if (zoomPhaseRef.current !== 'none') {
      window.location.href = '/';
    }
  }, []);

  const setZoomLocked = useCallback((value: boolean) => {
    zoomLockedRef.current = value;
    setIsZoomLocked(value);
  }, []);

  const setZoomPhase = useCallback((phase: ZoomPhase) => {
    zoomPhaseRef.current = phase;
    setZoomPhaseState(phase);
  }, []);

  const startCameraTween = useCallback(
    (
      toX: number,
      toY: number,
      toZoom: number,
      isZoomOut: boolean,
      completeAction: TweenCompleteAction = 'none',
    ) => {
      const camera = cameraRef.current;
      if (!camera) return;

      cameraTweenRef.current = {
        fromX: camera.position.x,
        fromY: camera.position.y,
        fromZoom: camera.zoom,
        toX,
        toY,
        toZoom,
        startAt: performance.now(),
        durationMs: DOM_DURATION_MS,
        isZoomOut,
        completeAction,
      };
    },
    [],
  );

  const findProjectByCard = useCallback(
    (card: CardNode): Project | null => {
      const project =
        projects.find((p) => p.slug === card.projectSlug) ||
        projects.find((p) => p.slug === card.projectId || p.id.toString() === card.projectId);
      return project || null;
    },
    [projects],
  );

  const startZoomOut = useCallback(() => {
    if (!selectedCardRef.current) return;
    if (zoomPhaseRef.current === 'cover') {
      setIsModalInteractive(false);
      setIsModalVisible(false);
    }
    setZoomPhase('none');
    startCameraTween(0, 0, 1, true, 'zoom_out_complete');
    // 카메라가 원위치로 돌아오는 동안 선택 상태를 유지해 아웃 전환을 부드럽게 만듭니다.
    setZoomLocked(true);
  }, [setZoomLocked, setZoomPhase, startCameraTween]);

  useEffect(() => {
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
    window.history.replaceState({ zoomed: false }, '', window.location.pathname);

    return () => {
      if ('scrollRestoration' in history) {
        history.scrollRestoration = 'auto';
      }
    };
  }, []);

  useEffect(() => {
    const prevPhase = prevZoomPhaseRef.current;
    const currentPhase = zoomPhase;

    const selectedCard = selectedCardRef.current;
    const fallbackSlug = selectedCard?.projectSlug || selectedCard?.projectId;
    const activeSlug = pendingProjectRef.current?.slug || selectedProject?.slug || fallbackSlug;
    const projectUrl = activeSlug ? `/projects/${activeSlug}` : '/';

    // 기존 홈과 같은 흐름: none -> center/cover 진입 시 2-step history push
    if (prevPhase === 'none' && (currentPhase === 'center' || currentPhase === 'cover') && !historyPushedRef.current) {
      window.history.pushState({ modal: true, step: 1, originalPath: '/' }, '', '/');
      window.history.pushState({ modal: true, step: 2, originalPath: '/' }, '', projectUrl);
      historyPushedRef.current = true;
    }

    // cover 상태에서는 URL을 프로젝트 상세 형태로 유지
    if (currentPhase === 'cover' && activeSlug) {
      window.history.replaceState({ modal: true, step: 2, originalPath: '/' }, '', projectUrl);
    }

    if (currentPhase === 'none') {
      historyPushedRef.current = false;
      window.history.replaceState({ zoomed: false }, '', '/');
    }

    prevZoomPhaseRef.current = currentPhase;
  }, [zoomPhase, selectedProject]);

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (zoomPhaseRef.current === 'none') return;

      e.preventDefault();
      e.stopImmediatePropagation();

      const state = e.state;
      if (state?.modal && state?.step === 1) {
        window.history.forward();
        setTimeout(() => {
          setSkipModalFadeOut(true);
          startZoomOut();
        }, 10);
      } else {
        window.history.pushState({ modal: false }, '', '/');
        setSkipModalFadeOut(true);
        startZoomOut();
      }
      return false;
    };

    window.addEventListener('popstate', handlePopState, { capture: true });
    return () => window.removeEventListener('popstate', handlePopState, { capture: true });
  }, [startZoomOut]);

  const rebuildCards = useCallback(() => {
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    if (!scene || !camera) return;

    for (const card of cardsRef.current) {
      card.mesh.geometry.dispose();
      card.mesh.material.dispose();
      scene.remove(card.mesh);
    }
    cardsRef.current = [];

    const assets = assetsRef.current;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const sidePadding = activeLayout.horizontalPadding;
    const gap = activeLayout.gap;
    const gridCols = activeLayout.gridCols;

    if (assets.length === 0 || visibleFrameSpecs.length === 0 || gridCols <= 0) {
      setScrollContentHeight(viewportHeight);
      return;
    }

    const totalGridWidth = viewportWidth - sidePadding * 2;
    const columnWidth = (totalGridWidth - gap * (gridCols - 1)) / gridCols;
    if (columnWidth <= 0) return;

    const verticalPool = assets.filter((item) => item.orientation !== 'horizontal');
    const horizontalPool = assets.filter((item) => item.orientation !== 'vertical');
    const effectiveVerticalPool = verticalPool.length > 0 ? verticalPool : assets;
    const effectiveHorizontalPool = horizontalPool.length > 0 ? horizontalPool : assets;

    let verticalIndex = 0;
    let horizontalIndex = 0;
    const assignedFrames = visibleFrameSpecs.map((frame) => {
      if (frame.orientation === 'vertical') {
        const poolIndex = verticalIndex++;
        return { frame, poolType: 'vertical' as const, poolIndex };
      }
      const poolIndex = horizontalIndex++;
      return { frame, poolType: 'horizontal' as const, poolIndex };
    });

    const maxRow = visibleFrameSpecs.reduce((acc, frame) => Math.max(acc, frame.rowStart), 1);
    const rowHeights = new Array(maxRow).fill(0);
    for (const { frame } of assignedFrames) {
      const width = frame.colSpan * columnWidth + (frame.colSpan - 1) * gap;
      const height = width / frame.aspectRatio;
      rowHeights[frame.rowStart - 1] = Math.max(rowHeights[frame.rowStart - 1], height);
    }

    const rowTopOffsets = new Array(maxRow).fill(0);
    let cumulativeY = 0;
    for (let i = 0; i < maxRow; i += 1) {
      rowTopOffsets[i] = cumulativeY;
      cumulativeY += rowHeights[i] + gap;
    }

    const totalRowsHeight = cumulativeY > 0 ? cumulativeY - gap : 0;
    const sectionGap = gap;
    const sectionStride = totalRowsHeight + sectionGap;
    sectionStrideRef.current = sectionStride;

    const scrollTop = scrollContainerRef.current?.scrollTop ?? 0;

    for (let sectionIndex = 0; sectionIndex < sectionCount; sectionIndex += 1) {
      const sectionOffsetY = sectionStride * sectionIndex;
      const verticalOffset = sectionIndex * 3;
      const horizontalOffset = sectionIndex * 5;

      for (const { frame, poolType, poolIndex } of assignedFrames) {
        const width = frame.colSpan * columnWidth + (frame.colSpan - 1) * gap;
        const height = width / frame.aspectRatio;
        const x = sidePadding + (frame.colStart - 1) * (columnWidth + gap);
        const yContent = sectionOffsetY + rowTopOffsets[frame.rowStart - 1];

        const asset =
          poolType === 'vertical'
            ? effectiveVerticalPool[(poolIndex + verticalOffset) % effectiveVerticalPool.length]
            : effectiveHorizontalPool[(poolIndex + horizontalOffset) % effectiveHorizontalPool.length];

        const geometry = new THREE.PlaneGeometry(width, height);
        const material = new THREE.MeshBasicMaterial({
          map: asset.texture,
          transparent: true,
          opacity: 1,
        });
        const mesh = new THREE.Mesh(geometry, material);
        const xWorld = x + width / 2 - viewportWidth / 2;
        const yWorld = viewportHeight / 2 - (yContent + height / 2 - scrollTop);
        mesh.position.set(xWorld, yWorld, 0);
        scene.add(mesh);
        cardsRef.current.push({
          mesh,
          xWorld,
          yContent,
          width,
          height,
          projectId: asset.projectId,
          projectSlug: asset.projectSlug,
          src: asset.src,
        });
      }
    }

    const contentHeight = Math.max(viewportHeight, sectionStride * sectionCount - sectionGap);
    setScrollContentHeight(contentHeight);
  }, [activeLayout.gap, activeLayout.gridCols, activeLayout.horizontalPadding, sectionCount, visibleFrameSpecs]);

  const handleCanvasTap = useCallback(
    (clientX: number, clientY: number) => {
      const camera = cameraRef.current;
      const raycaster = raycasterRef.current;
      if (!camera || !raycaster) return;

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      const pointer = new THREE.Vector2((clientX / viewportWidth) * 2 - 1, -(clientY / viewportHeight) * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObjects(cardsRef.current.map((card) => card.mesh), false);
      const hitMesh =
        intersects.length > 0 ? (intersects[0].object as THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>) : null;
      const hitCard = hitMesh ? cardsRef.current.find((card) => card.mesh === hitMesh) || null : null;

      if (selectedCardRef.current) {
        const selectedCard = selectedCardRef.current;

        if (zoomPhaseRef.current === 'center' && hitCard && hitCard.mesh === selectedCard.mesh) {
          const pendingProject = findProjectByCard(selectedCard);
          if (!pendingProject) {
            // 링크(프로젝트) 없는 카드는 2차 확대 대신 즉시 줌아웃
            startZoomOut();
            return;
          }

          const coverZoom = Math.max(
            (viewportWidth * 1.02) / selectedCard.width,
            (viewportHeight * 1.02) / selectedCard.height,
          );
          const pendingHeroSrc = selectedCard.src;
          pendingProjectRef.current = pendingProject;
          pendingHeroImageSrcRef.current = pendingHeroSrc;
          // 확대 2단계 시작 시점에 미리 모달 데이터를 준비해 깜빡임을 줄입니다.
          setSelectedProject(pendingProject);
          setSelectedHeroImageSrc(pendingHeroSrc);
          setIsHeroImageLoaded(false);
          setIsModalInteractive(false);
          // 2차 확대에서는 줌 모션을 먼저 보여주고, 중반 이후 모달을 노출합니다.
          setIsModalVisible(false);
          coverRevealStartedRef.current = false;
          startCameraTween(
            selectedCard.mesh.position.x,
            selectedCard.mesh.position.y,
            Math.max(1, Math.min(8, coverZoom)),
            false,
            'open_cover',
          );
          setZoomPhase('cover');
          setZoomLocked(true);
          return;
        }

        startZoomOut();
        return;
      }

      if (!hitCard) return;

      const zoom = Math.min((viewportWidth * 0.82) / hitCard.width, (viewportHeight * 0.82) / hitCard.height);
      startCameraTween(hitCard.mesh.position.x, hitCard.mesh.position.y, Math.max(1, Math.min(4, zoom)), false, 'none');
      selectedCardRef.current = hitCard;
      hitCard.mesh.material.opacity = 1;
      pendingProjectRef.current = findProjectByCard(hitCard);
      pendingHeroImageSrcRef.current = hitCard.src;
      setZoomPhase('center');
      setZoomLocked(true);
    },
    [findProjectByCard, setZoomLocked, setZoomPhase, startCameraTween, startZoomOut],
  );

  const getHoveredCard = useCallback((clientX: number, clientY: number): CardNode | null => {
    const camera = cameraRef.current;
    const raycaster = raycasterRef.current;
    if (!camera || !raycaster) return null;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const pointer = new THREE.Vector2((clientX / viewportWidth) * 2 - 1, -(clientY / viewportHeight) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(cardsRef.current.map((card) => card.mesh), false);
    if (intersects.length === 0) return null;

    const hitMesh = intersects[0].object as THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
    return cardsRef.current.find((card) => card.mesh === hitMesh) || null;
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const scrollContainer = scrollContainerRef.current;
    pointerStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      scrollTop: scrollContainer?.scrollTop ?? 0,
    };
  }, []);

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const start = pointerStartRef.current;
      pointerStartRef.current = null;
      if (!start) return;

      const scrollContainer = scrollContainerRef.current;
      const currentScrollTop = scrollContainer?.scrollTop ?? 0;
      const movedX = Math.abs(e.clientX - start.x);
      const movedY = Math.abs(e.clientY - start.y);
      const movedScroll = Math.abs(currentScrollTop - start.scrollTop);
      const isTap = movedX < 16 && movedY < 16 && movedScroll < 16;
      if (!isTap) return;

      handleCanvasTap(e.clientX, e.clientY);
    },
    [handleCanvasTap],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const scrollContainer = scrollContainerRef.current;
      if (!scrollContainer) return;

      if (zoomLockedRef.current) {
        scrollContainer.style.cursor = 'default';
        return;
      }

      const hovered = getHoveredCard(e.clientX, e.clientY);
      scrollContainer.style.cursor = hovered ? 'pointer' : 'default';
    },
    [getHoveredCard],
  );

  const handlePointerLeave = useCallback(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;
    scrollContainer.style.cursor = 'default';
  }, []);


  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const { data } = await supabase
          .from('project')
          .select('id, slug, title, description, contents')
          .eq('status', 'published')
          .order('display_order', { ascending: true });
        setProjects(data || []);
      } catch {
        setProjects([]);
      }
    };

    fetchProjects();
  }, []);

  useEffect(() => {
    const fetchLandingImages = async () => {
      try {
        const { data } = await supabase.from('config').select('content').eq('id', 'landing').single();

        let content: LandingConfigContent | null = null;
        if (typeof data?.content === 'string') {
          try {
            content = JSON.parse(data.content) as LandingConfigContent;
          } catch {
            content = null;
          }
        } else if (data?.content && typeof data.content === 'object') {
          content = data.content as LandingConfigContent;
        }

        if (!content || !Array.isArray(content.images)) {
          setLandingImages([]);
          return;
        }

        // 홈 페이지와 동일한 형태로 이미지 데이터 구성
        const sortedImages = [...content.images].sort((a, b) => (a.order || 0) - (b.order || 0));
        const projectImages: ProjectImage[] = sortedImages
          .filter((img) => Boolean(img?.url))
          .map((img) => ({
            projectId: img.projectSlug || img.id,
            projectSlug: img.projectSlug,
            verticalSrc: img.url,
            horizontalSrc: img.url,
            orientation: img.orientation,
          }));

        setLandingImages(projectImages);
      } catch {
        setLandingImages([]);
      }
    };

    fetchLandingImages();
  }, []);

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    let cancelled = false;

    const loadAssets = async () => {
      if (landingImages.length === 0) {
        assetsRef.current = [];
        rebuildCards();
        return;
      }

      const loaded = await Promise.all(
        landingImages.map(
          (item) =>
            new Promise<LoadedAsset | null>((resolve) => {
              const src = item.orientation === 'horizontal' ? item.horizontalSrc : item.verticalSrc;
              loader.load(
                src,
                (texture: any) => {
                  texture.colorSpace = THREE.SRGBColorSpace;
                  texture.minFilter = THREE.LinearFilter;
                  texture.magFilter = THREE.LinearFilter;
                  const image = texture.image as { width?: number; height?: number } | undefined;
                  resolve({
                    texture,
                    src,
                    width: image?.width || 1,
                    height: image?.height || 1,
                    projectId: item.projectId,
                    projectSlug: item.projectSlug,
                    orientation: item.orientation,
                  });
                },
                undefined,
                () => resolve(null),
              );
            }),
        ),
      );

      if (cancelled) {
        loaded.forEach((asset) => asset?.texture.dispose());
        return;
      }

      assetsRef.current = loaded.filter((item): item is LoadedAsset => item !== null);
      rebuildCards();
    };

    loadAssets();
    return () => {
      cancelled = true;
    };
  }, [landingImages, rebuildCards]);

  useEffect(() => {
    if (frameSpecs.length === 0) {
      setSkipRows(0);
      return;
    }

    const minVisibleFrames = 8;
    const totalRows = frameSpecs.reduce((max, frame) => Math.max(max, frame.rowStart), 1);
    let maxSkipRows = Math.max(0, Math.floor(totalRows / 2));

    while (maxSkipRows > 0) {
      const remainingFrames = frameSpecs.filter((frame) => frame.rowStart > maxSkipRows).length;
      if (remainingFrames >= minVisibleFrames) {
        break;
      }
      maxSkipRows -= 1;
    }

    const randomSkipRows = maxSkipRows > 0 ? Math.floor(Math.random() * (maxSkipRows + 1)) : 0;
    setSkipRows(randomSkipRows);
  }, [frameSpecs]);

  useEffect(() => {
    setSectionCount(4);
    appendGuardHeightRef.current = 0;
    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer) {
      scrollContainer.scrollTop = 0;
    }
    startZoomOut();
  }, [isMobile, landingImages.length, skipRows, startZoomOut]);

  useEffect(() => {
    rebuildCards();

    const onResize = () => {
      const renderer = rendererRef.current;
      const camera = cameraRef.current;
      if (!renderer || !camera) return;

      const width = window.innerWidth;
      const height = window.innerHeight;
      renderer.setSize(width, height);
      camera.left = -width / 2;
      camera.right = width / 2;
      camera.top = height / 2;
      camera.bottom = -height / 2;
      camera.updateProjectionMatrix();
      rebuildCards();
      startZoomOut();
    };

    const onScroll = () => {
      if (zoomLockedRef.current) return;

      const scrollContainer = scrollContainerRef.current;
      if (!scrollContainer) return;

      const nearBottomThreshold = 1800;
      const isNearBottom =
        scrollContainer.scrollTop + scrollContainer.clientHeight >= scrollContainer.scrollHeight - nearBottomThreshold;

      if (isNearBottom && scrollContainer.scrollHeight > appendGuardHeightRef.current) {
        appendGuardHeightRef.current = scrollContainer.scrollHeight + 10;
        setSectionCount((prev) => prev + 2);
      }
    };
    const scrollContainer = scrollContainerRef.current;

    window.addEventListener('resize', onResize);
    scrollContainer?.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      window.removeEventListener('resize', onResize);
      scrollContainer?.removeEventListener('scroll', onScroll);
    };
  }, [rebuildCards, startZoomOut]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.setClearColor(0xffffff, 1);
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-width / 2, width / 2, height / 2, -height / 2, -2000, 2000);
    camera.position.set(0, 0, 10);
    camera.zoom = 1;
    camera.updateProjectionMatrix();

    rendererRef.current = renderer;
    sceneRef.current = scene;
    cameraRef.current = camera;
    raycasterRef.current = new THREE.Raycaster();

    const tick = () => {
      const currentCamera = cameraRef.current;
      const currentRenderer = rendererRef.current;
      const currentScene = sceneRef.current;
      if (!currentCamera || !currentRenderer || !currentScene) return;

      const scrollTop = scrollContainerRef.current?.scrollTop ?? 0;
      const viewportHeight = window.innerHeight;
      const isZoomOutAnimating = cameraTweenRef.current?.isZoomOut === true;
      const shouldDimOthers = selectedCardRef.current !== null && !isZoomOutAnimating;

      for (const card of cardsRef.current) {
        card.mesh.position.y = viewportHeight / 2 - (card.yContent + card.height / 2 - scrollTop);
        const mat = card.mesh.material;
        const isSelected = selectedCardRef.current?.mesh === card.mesh;
        if (isSelected) {
          // 선택된 카드는 항상 완전 불투명 유지
          mat.opacity = 1;
        } else {
          // 줌아웃 시작과 동시에 비선택 카드 opacity를 원래대로 복원
          const targetOpacity = shouldDimOthers ? 0.22 : 1;
          mat.opacity += (targetOpacity - mat.opacity) * 0.14;
        }
      }

      const tween = cameraTweenRef.current;
      if (tween) {
        const elapsed = performance.now() - tween.startAt;
        const t = Math.min(1, Math.max(0, elapsed / tween.durationMs));
        const easedRaw = cubicBezierYFromX(t, DOM_EASE.x1, DOM_EASE.y1, DOM_EASE.x2, DOM_EASE.y2);
        const eased = softenInitialEasing(t, easedRaw);

        currentCamera.position.x = tween.fromX + (tween.toX - tween.fromX) * eased;
        currentCamera.position.y = tween.fromY + (tween.toY - tween.fromY) * eased;
        currentCamera.zoom = tween.fromZoom + (tween.toZoom - tween.fromZoom) * eased;

        if (tween.completeAction === 'open_cover' && !coverRevealStartedRef.current && t >= 0.55) {
          coverRevealStartedRef.current = true;
          setIsModalVisible(true);
        }

        if (t >= 1) {
          if (tween.completeAction === 'open_cover') {
            // 표시는 이미 시작됐고, 완료 시점에 인터랙션만 활성화
            setSkipModalFadeOut(false);
            setIsModalInteractive(true);
            setZoomPhase('cover');
            setZoomLocked(true);
          } else if (tween.completeAction === 'zoom_out_complete' && selectedCardRef.current) {
            selectedCardRef.current = null;
            pendingProjectRef.current = null;
            pendingHeroImageSrcRef.current = undefined;
            setSelectedProject(null);
            setSelectedHeroImageSrc(undefined);
            setIsHeroImageLoaded(false);
            setIsModalVisible(false);
            setIsModalInteractive(false);
            setSkipModalFadeOut(false);
            coverRevealStartedRef.current = false;
            setZoomPhase('none');
            setZoomLocked(false);
          }
          cameraTweenRef.current = null;
        }
      }
      currentCamera.updateProjectionMatrix();

      currentRenderer.render(currentScene, currentCamera);
      frameRef.current = window.requestAnimationFrame(tick);
    };

    frameRef.current = window.requestAnimationFrame(tick);

    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
      for (const card of cardsRef.current) {
        card.mesh.geometry.dispose();
        card.mesh.material.dispose();
        scene.remove(card.mesh);
      }
      cardsRef.current = [];
      assetsRef.current.forEach((asset) => asset.texture.dispose());
      assetsRef.current = [];
      renderer.dispose();
      mount.removeChild(renderer.domElement);
      rendererRef.current = null;
      sceneRef.current = null;
      cameraRef.current = null;
      raycasterRef.current = null;
    };
  }, [setZoomLocked]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        startZoomOut();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [startZoomOut]);

  return (
    <div className="relative h-svh w-full bg-white">
      <div ref={mountRef} className="fixed inset-0 z-0 h-full w-full" />
      <IntroLogo onHeaderAnimationStart={handleHeaderAnimationStart} />
      <Header
        headerLogoTrigger={headerLogoTrigger}
        isFixed={true}
        onHomeClick={zoomPhase !== 'none' ? handleHomeClick : undefined}
      />
      <MobileMenu />
      <div
        ref={scrollContainerRef}
        className={`relative z-10 h-full w-full overflow-x-hidden ${isZoomLocked ? 'overflow-y-hidden' : 'overflow-y-auto'}`}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}>
        <div aria-hidden className="w-full" style={{ height: scrollContentHeight }} />
      </div>

      {selectedProject?.contents && (
        <div
          className={`fixed inset-0 z-220 transition-opacity ${skipModalFadeOut ? 'duration-0' : 'duration-800'} ${
            isModalVisible ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ transitionTimingFunction: DOM_EASE_CSS, willChange: 'opacity' }}>
          <div
            className={`${isModalInteractive ? 'pointer-events-auto' : 'pointer-events-none'} relative h-full w-full overflow-y-auto bg-white`}
            style={{
              ...(selectedHeroImageSrc && !isHeroImageLoaded
                ? {
                    backgroundImage: `url(${selectedHeroImageSrc})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                  }
                : {}),
              transition: `background-image 0.25s ${DOM_EASE_CSS}`,
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                startZoomOut();
              }
            }}>
            <main className="relative min-h-full w-full">
              <ProjectDetailContent
                key={selectedProject.slug}
                contents={selectedProject.contents}
                title={selectedProject.title}
                heroImageSrc={selectedHeroImageSrc}
                onHeroImageLoad={() => setIsHeroImageLoaded(true)}
              />
            </main>
          </div>
        </div>
      )}
    </div>
  );
}
