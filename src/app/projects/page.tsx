'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import Header from '@/components/Header';
import MobileMenu from '@/components/MobileMenu';
import ProjectDetailContent from '@/components/ProjectDetailContent';
import useWindowSize from '@/hooks/useWindowSize';
import { PROJECT_LAYOUT_CONFIG } from '@/config/projectLayout';
import { supabase } from '@/lib/supabase';

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

interface LayoutItem {
  frameIndex: number;
  imageUrl: string | null;
  orientation: 'horizontal' | 'vertical' | null;
  projectId: string | null;
  order: number;
  clickDisabled?: boolean;
}

interface FrameSpec {
  rowStart: number;
  colStart: number;
  colSpan: number;
  aspectRatio: number;
}

interface LoadedAsset {
  texture: THREE.Texture;
  src: string;
  width: number;
  height: number;
  frameIndex: number;
  orientation?: 'horizontal' | 'vertical';
  projectId: string;
  projectSlug?: string;
  clickDisabled?: boolean;
}

interface CardNode {
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  material: THREE.ShaderMaterial;
  targetX: number;
  yContent: number;
  width: number;
  height: number;
  projectId: string;
  projectSlug?: string;
  src: string;
  clickDisabled?: boolean;
  targetUv: THREE.Vector2;
  targetIntensity: number;
  currentIntensity: number;
  targetMeshPullFactor: number;
  currentMeshPullFactor: number;
  introFromX: number;
  introFromY: number;
  introDelayMs: number;
  introDurationMs: number;
  introEnabled: boolean;
  introOrder: number;
}

interface CameraTween {
  fromX: number;
  fromY: number;
  fromZoom: number;
  toX: number;
  toY: number;
  toZoom: number;
  startAt: number;
  durationMs: number;
}

interface PickResult {
  card: CardNode;
  uv: THREE.Vector2;
}

type DistortPreset = {
  radius: number;
  strength: number;
  edgeMix: number;
  meshPull: number;
  idleFloor: number;
  maxIntensity: number;
  speedMultiplierPx: number;
  speedMultiplierUv: number;
  mouseMoveTimerMs: number;
  easing: number;
  decay: number;
  uniformLerp: number;
};

const EASE = { x1: 0.16, y1: 1, x2: 0.3, y2: 1 } as const;
const DURATION_MS = 1100;
const EASE_CSS = 'cubic-bezier(0.16, 1, 0.3, 1)';
const INTRO_CARD_DURATION_MS = 560;
const INTRO_MS_PER_PX = 1.1;
const INTRO_MAX_DURATION_MS = 1300;
const INTRO_APPEAR_DURATION_MS = 760;
const INTRO_APPEAR_SPREAD_MS = 220;
const INTRO_CENTER_START_SCALE = 0.07;
const INTRO_CENTER_END_SCALE = 0.58;
const INTRO_END_SCALE = 1;
const INTRO_CENTER_JITTER_PX = 72;

const DISTORT_PRESET: DistortPreset = {
  radius: 0.6,
  strength: 0.2,
  edgeMix: 0,
  meshPull: 0.2,
  idleFloor: 0.2,
  maxIntensity: 1.35,
  speedMultiplierPx: 0.02,
  speedMultiplierUv: 16,
  mouseMoveTimerMs: 180,
  easing: 0.05,
  decay: 0.985,
  uniformLerp: 0.16,
};

const CARD_VERTEX_SHADER = `
varying vec2 vUv;
uniform vec2 uPointer;
uniform vec2 uPrevPointer;
uniform float uIntensity;
uniform float uRadius;
uniform float uStrength;
uniform float uAspect;
uniform float uEdgeMix;
uniform vec2 uMeshSize;
uniform float uMeshPull;
uniform float uMeshPullFactor;

void main() {
  vUv = uv;
  vec3 pos = position;

  vec2 delta = vUv - uPointer;
  delta.x *= uAspect;
  float dist = length(delta);
  float localMask = smoothstep(uRadius, 0.0, dist);
  float edgeFactor = smoothstep(0.55, 1.0, max(abs(vUv.x - 0.5) * 2.0, abs(vUv.y - 0.5) * 2.0));
  float mask = clamp(localMask + edgeFactor * uEdgeMix, 0.0, 1.0);
  float meshMask = clamp(edgeFactor * (0.35 + 0.65 * localMask), 0.0, 1.0);
  meshMask = meshMask * meshMask * (3.0 - 2.0 * meshMask);

  vec2 velocity = (uPointer - uPrevPointer) * uStrength;
  vec2 radialDir = normalize((vUv - uPointer) * vec2(uAspect, 1.0) + vec2(1e-5));
  vec2 pullUv = (-velocity * 0.18 + radialDir * 0.06) * meshMask * uIntensity * uMeshPull * uMeshPullFactor;
  vec2 pullObj = vec2(pullUv.x * uMeshSize.x, pullUv.y * uMeshSize.y);
  pos.xy += pullObj;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

const CARD_FRAGMENT_SHADER = `
uniform sampler2D uTexture;
uniform vec2 uPointer;
uniform vec2 uPrevPointer;
uniform float uIntensity;
uniform float uRadius;
uniform float uStrength;
uniform float uAspect;
uniform float uAlpha;
uniform float uEdgeMix;
uniform float uImageAspect;
varying vec2 vUv;

vec2 coverUv(vec2 uv, float imageAspect, float frameAspect) {
  vec2 scale = vec2(1.0);
  if (imageAspect > frameAspect) {
    scale.x = frameAspect / imageAspect;
  } else {
    scale.y = imageAspect / frameAspect;
  }
  return (uv - 0.5) * scale + 0.5;
}

void main() {
  vec2 delta = vUv - uPointer;
  delta.x *= uAspect;
  float dist = length(delta);
  float localMask = smoothstep(uRadius, 0.0, dist);
  float edgeFactor = smoothstep(0.55, 1.0, max(abs(vUv.x - 0.5) * 2.0, abs(vUv.y - 0.5) * 2.0));
  float mask = clamp(localMask + edgeFactor * uEdgeMix, 0.0, 1.0);

  vec2 velocity = (uPointer - uPrevPointer) * uStrength;
  vec2 flowDistort = -velocity * mask * uIntensity;
  vec2 distortedUv = clamp(vUv + flowDistort, vec2(0.001), vec2(0.999));
  vec2 sampleUv = clamp(coverUv(distortedUv, uImageAspect, uAspect), vec2(0.001), vec2(0.999));

  vec4 color = texture2D(uTexture, sampleUv);
  gl_FragColor = vec4(color.rgb, color.a * uAlpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

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

const parseFrameClass = (frameClass: string): FrameSpec | null => {
  const rowMatch = frameClass.match(/row-start-(\d+)/);
  const colStartMatch = frameClass.match(/col-start-(\d+)/);
  const colSpanMatch = frameClass.match(/col-span-(\d+)/);
  const aspectMatch = frameClass.match(/aspect-\[(\d+)\/(\d+)\]/);
  if (!rowMatch || !colStartMatch || !colSpanMatch || !aspectMatch) return null;
  const ratioW = Number(aspectMatch[1]) || 1;
  const ratioH = Number(aspectMatch[2]) || 1;
  return {
    rowStart: Number(rowMatch[1]),
    colStart: Number(colStartMatch[1]),
    colSpan: Number(colSpanMatch[1]),
    aspectRatio: ratioW / ratioH,
  };
};

const normalizeFrameIndex = (frameIndex: number, totalFrames: number) => {
  if (frameIndex < 0) return null;
  if (frameIndex < totalFrames) return frameIndex;
  if (frameIndex - 1 >= 0 && frameIndex - 1 < totalFrames) return frameIndex - 1;
  return null;
};

const getAssetOrientation = (asset: LoadedAsset): 'horizontal' | 'vertical' => {
  // 실제 이미지 비율을 우선 사용해 잘못된 orientation 메타데이터의 영향을 줄입니다.
  if (asset.width > 0 && asset.height > 0) {
    return asset.width >= asset.height ? 'horizontal' : 'vertical';
  }
  return asset.orientation || 'horizontal';
};

const createCardMaterial = (texture: THREE.Texture, width: number, height: number, imageWidth: number, imageHeight: number) =>
  new THREE.ShaderMaterial({
    uniforms: {
      uTexture: { value: texture },
      uPointer: { value: new THREE.Vector2(0.5, 0.5) },
      uPrevPointer: { value: new THREE.Vector2(0.5, 0.5) },
      uIntensity: { value: 0 },
      uRadius: { value: DISTORT_PRESET.radius },
      uStrength: { value: DISTORT_PRESET.strength },
      uEdgeMix: { value: DISTORT_PRESET.edgeMix },
      uMeshSize: { value: new THREE.Vector2(width, height) },
      uMeshPull: { value: DISTORT_PRESET.meshPull },
      uMeshPullFactor: { value: 0 },
      uAspect: { value: width / Math.max(height, 1) },
      uImageAspect: { value: imageWidth / Math.max(imageHeight, 1) },
      uAlpha: { value: 1 },
    },
    vertexShader: CARD_VERTEX_SHADER,
    fragmentShader: CARD_FRAGMENT_SHADER,
    transparent: true,
  });

export default function ProjectPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [layoutItems, setLayoutItems] = useState<LayoutItem[]>([]);
  const [scrollContentHeight, setScrollContentHeight] = useState(1200);
  const [sectionCount, setSectionCount] = useState(6);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedHeroImageSrc, setSelectedHeroImageSrc] = useState<string | undefined>(undefined);
  const [isHeroImageLoaded, setIsHeroImageLoaded] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isModalInteractive, setIsModalInteractive] = useState(false);
  const [skipModalFadeOut, setSkipModalFadeOut] = useState(false);
  const [isZoomLocked, setIsZoomLocked] = useState(false);
  const [introAnimating, setIntroAnimating] = useState(true);
  const [headerLogoTrigger, setHeaderLogoTrigger] = useState<number | undefined>(undefined);

  const windowSize = useWindowSize();
  const isMobile = windowSize.isSm;
  const activeLayout = useMemo(
    () => (isMobile ? PROJECT_LAYOUT_CONFIG.mobile : PROJECT_LAYOUT_CONFIG.desktop),
    [isMobile],
  );
  const frameSpecs = useMemo(
    () => activeLayout.frameClasses.map(parseFrameClass).filter((v): v is FrameSpec => v !== null),
    [activeLayout.frameClasses],
  );

  const mountRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const raycasterRef = useRef<THREE.Raycaster | null>(null);
  const assetsRef = useRef<LoadedAsset[]>([]);
  const cardsRef = useRef<CardNode[]>([]);
  const selectedCardRef = useRef<CardNode | null>(null);
  const hoveredCardRef = useRef<CardNode | null>(null);
  const pointerClientRef = useRef<{ x: number; y: number } | null>(null);
  const frameRef = useRef<number | null>(null);
  const pointerStartRef = useRef<{ x: number; y: number; scrollTop: number } | null>(null);
  const pointerPrevPosRef = useRef<{ x: number; y: number } | null>(null);
  const mouseMovingUntilRef = useRef(0);
  const cameraTweenRef = useRef<CameraTween | null>(null);
  const coverRevealStartedRef = useRef(false);
  const introStartAtRef = useRef<number | null>(null);
  const introPlayedRef = useRef(false);
  const introAnimatingRef = useRef(true);
  const introMaxDelayRef = useRef(0);
  const zoomLockedRef = useRef(false);
  const historyPushedRef = useRef(false);

  const setZoomLocked = useCallback((value: boolean) => {
    zoomLockedRef.current = value;
    setIsZoomLocked(value);
  }, []);

  const findProjectByCard = useCallback(
    (card: CardNode): Project | null => {
      const bySlug = projects.find((p) => p.slug === card.projectSlug || p.slug === card.projectId);
      if (bySlug) return bySlug;
      const byId = projects.find((p) => p.id.toString() === card.projectId);
      return byId || null;
    },
    [projects],
  );

  const startCameraTween = useCallback((toX: number, toY: number, toZoom: number) => {
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
      durationMs: DURATION_MS,
    };
  }, []);

  const closeCover = useCallback(() => {
    if (!selectedCardRef.current) return;
    setSkipModalFadeOut(true);
    setIsModalInteractive(false);
    setIsModalVisible(false);
    startCameraTween(0, 0, 1);
    setZoomLocked(true);
  }, [setZoomLocked, startCameraTween]);

  const rebuildCards = useCallback(() => {
    const scene = sceneRef.current;
    if (!scene) return;

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

    if (assets.length === 0 || frameSpecs.length === 0 || gridCols <= 0) {
      setScrollContentHeight(viewportHeight);
      return;
    }

    const totalGridWidth = viewportWidth - sidePadding * 2;
    const columnWidth = (totalGridWidth - gap * (gridCols - 1)) / gridCols;
    if (columnWidth <= 0) return;

    const frameAssetMap = new Map<number, LoadedAsset>();
    const orderedAssets: LoadedAsset[] = [];
    const horizontalAssets: LoadedAsset[] = [];
    const verticalAssets: LoadedAsset[] = [];
    for (const asset of assets) {
      const normalized = normalizeFrameIndex(asset.frameIndex, frameSpecs.length);
      if (normalized === null) continue;
      frameAssetMap.set(normalized, asset);
      orderedAssets.push(asset);
      if (getAssetOrientation(asset) === 'horizontal') {
        horizontalAssets.push(asset);
      } else {
        verticalAssets.push(asset);
      }
    }

    if (orderedAssets.length === 0) {
      setScrollContentHeight(viewportHeight);
      return;
    }

    const maxRow = frameSpecs.reduce((acc, frame) => Math.max(acc, frame.rowStart), 1);
    const rowHeights = new Array(maxRow).fill(0);
    for (const frame of frameSpecs) {
      const frameWidth = frame.colSpan * columnWidth + (frame.colSpan - 1) * gap;
      const frameHeight = frameWidth / frame.aspectRatio;
      rowHeights[frame.rowStart - 1] = Math.max(rowHeights[frame.rowStart - 1], frameHeight);
    }

    const rowTopOffsets = new Array(maxRow).fill(0);
    let cumulativeY = 0;
    for (let i = 0; i < maxRow; i += 1) {
      rowTopOffsets[i] = cumulativeY;
      cumulativeY += rowHeights[i] + gap;
    }

    let renderedBottom = 0;
    for (let frameIdx = 0; frameIdx < frameSpecs.length; frameIdx += 1) {
      const frame = frameSpecs[frameIdx];
      const desiredOrientation: 'horizontal' | 'vertical' = frame.aspectRatio >= 1 ? 'horizontal' : 'vertical';
      const mapped = frameAssetMap.get(frameIdx);
      let asset = mapped && getAssetOrientation(mapped) === desiredOrientation ? mapped : undefined;
      if (!asset) {
        const pool = desiredOrientation === 'horizontal' ? horizontalAssets : verticalAssets;
        if (pool.length > 0) {
          asset = pool[frameIdx % pool.length];
        }
      }
      if (!asset) continue;

      const frameWidth = frame.colSpan * columnWidth + (frame.colSpan - 1) * gap;
      const frameHeight = frameWidth / frame.aspectRatio;
      const yLocal = rowTopOffsets[frame.rowStart - 1];
      renderedBottom = Math.max(renderedBottom, yLocal + frameHeight);
    }

    const sectionGap = Math.max(0, Math.round(gap * 0.08));
    const sectionStride = Math.max(1, renderedBottom + sectionGap);
    const scrollTop = scrollContainerRef.current?.scrollTop ?? 0;
    let introMaxDelay = 0;

    for (let sectionIndex = 0; sectionIndex < sectionCount; sectionIndex += 1) {
      const sectionOffsetY = sectionStride * sectionIndex;
      for (let frameIdx = 0; frameIdx < frameSpecs.length; frameIdx += 1) {
        const frame = frameSpecs[frameIdx];
        const desiredOrientation: 'horizontal' | 'vertical' = frame.aspectRatio >= 1 ? 'horizontal' : 'vertical';
        const mapped = frameAssetMap.get(frameIdx);
        let asset = mapped && getAssetOrientation(mapped) === desiredOrientation ? mapped : undefined;
        if (!asset) {
          const pool = desiredOrientation === 'horizontal' ? horizontalAssets : verticalAssets;
          if (pool.length > 0) {
            asset = pool[(sectionIndex * frameSpecs.length + frameIdx) % pool.length];
          }
        }
        if (!asset) continue;

        const frameWidth = frame.colSpan * columnWidth + (frame.colSpan - 1) * gap;
        const frameHeight = frameWidth / frame.aspectRatio;
        const x = sidePadding + (frame.colStart - 1) * (columnWidth + gap);
        const yContent = sectionOffsetY + rowTopOffsets[frame.rowStart - 1];

        const geometry = new THREE.PlaneGeometry(frameWidth, frameHeight, 36, 36);
        const material = createCardMaterial(asset.texture, frameWidth, frameHeight, asset.width, asset.height);
        material.depthTest = false;
        material.depthWrite = false;
        const mesh = new THREE.Mesh(geometry, material);
        const xWorld = x + frameWidth / 2 - viewportWidth / 2;
        const yWorld = viewportHeight / 2 - (yContent + frameHeight / 2 - scrollTop);
        const introEnabled = sectionIndex === 0;
        const introSeed = ((frameIdx * 73 + sectionIndex * 19) % 200) / 199;
        const introAngle = introSeed * Math.PI * 2;
        const introRadius = (0.35 + introSeed * 0.65) * INTRO_CENTER_JITTER_PX;
        const introFromX = introEnabled ? Math.cos(introAngle) * introRadius : 0;
        const introFromY = introEnabled ? Math.sin(introAngle) * introRadius : 0;
        // 순차 계단식 대신, 카드마다 시작 시점을 분산해 겹쳐 나타나도록 설정
        const introDelayMs = introEnabled ? introSeed * INTRO_APPEAR_SPREAD_MS : 0;
        const introDistance = Math.hypot(xWorld - introFromX, yWorld - introFromY);
        const introDurationMs = Math.min(
          INTRO_MAX_DURATION_MS,
          INTRO_CARD_DURATION_MS + introDistance * INTRO_MS_PER_PX,
        );
        if (introEnabled) {
          introMaxDelay = Math.max(introMaxDelay, introDelayMs);
        }
        const introOrder = Math.round(introDelayMs * 1000) + frameIdx;
        const shouldPlayIntro = !introPlayedRef.current;
        if (shouldPlayIntro && introEnabled) {
          mesh.position.set(introFromX, introFromY, 0);
          mesh.scale.setScalar(INTRO_CENTER_START_SCALE);
          material.uniforms.uAlpha.value = 0;
          mesh.renderOrder = introOrder;
        } else {
          mesh.position.set(xWorld, yWorld, 0);
          mesh.scale.setScalar(1);
          material.uniforms.uAlpha.value = 1;
          mesh.renderOrder = 0;
        }
        scene.add(mesh);

        cardsRef.current.push({
          mesh,
          targetX: xWorld,
          yContent,
          width: frameWidth,
          height: frameHeight,
          projectId: asset.projectId,
          projectSlug: asset.projectSlug,
          src: asset.src,
          clickDisabled: asset.clickDisabled,
          material,
          targetUv: new THREE.Vector2(0.5, 0.5),
          targetIntensity: 0,
          currentIntensity: 0,
          targetMeshPullFactor: 0,
          currentMeshPullFactor: 0,
          introFromX,
          introFromY,
          introDelayMs,
          introDurationMs,
          introEnabled,
          introOrder,
        });
      }
    }

    setScrollContentHeight(Math.max(viewportHeight, sectionStride * sectionCount - sectionGap));

    if (!introPlayedRef.current && cardsRef.current.length > 0) {
      introMaxDelayRef.current = introMaxDelay;
      introStartAtRef.current = performance.now();
      setIntroAnimating(true);
    }
  }, [activeLayout.gap, activeLayout.gridCols, activeLayout.horizontalPadding, frameSpecs, sectionCount]);

  const pickCard = useCallback((clientX: number, clientY: number): PickResult | null => {
    const camera = cameraRef.current;
    const raycaster = raycasterRef.current;
    if (!camera || !raycaster) return null;
    const pointer = new THREE.Vector2((clientX / window.innerWidth) * 2 - 1, -(clientY / window.innerHeight) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(cardsRef.current.map((c) => c.mesh), false);
    if (hits.length === 0) return null;
    const hit = hits[0];
    const mesh = hit.object as THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
    const card = cardsRef.current.find((c) => c.mesh === mesh) || null;
    if (!card) return null;
    const uv = hit.uv ? hit.uv.clone() : new THREE.Vector2(0.5, 0.5);
    return { card, uv };
  }, []);

  const handleTap = useCallback(
    (clientX: number, clientY: number) => {
      if (introAnimating) return;
      if (selectedCardRef.current) {
        closeCover();
        return;
      }

      const picked = pickCard(clientX, clientY);
      const card = picked?.card ?? null;
      if (!card || card.clickDisabled) return;

      const project = findProjectByCard(card);
      if (!project) return;

      const zoom = Math.max((window.innerWidth * 1.02) / card.width, (window.innerHeight * 1.02) / card.height);
      startCameraTween(card.mesh.position.x, card.mesh.position.y, Math.max(1, Math.min(8, zoom)));
      selectedCardRef.current = card;
      setSelectedProject(project);
      setSelectedHeroImageSrc(card.src);
      setIsHeroImageLoaded(false);
      setIsModalInteractive(false);
      setIsModalVisible(false);
      coverRevealStartedRef.current = false;
      setSkipModalFadeOut(false);
      setZoomLocked(true);
    },
    [closeCover, findProjectByCard, introAnimating, pickCard, setZoomLocked, startCameraTween],
  );

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (introAnimating) return;
    pointerStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      scrollTop: scrollContainerRef.current?.scrollTop ?? 0,
    };
  }, [introAnimating]);

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const start = pointerStartRef.current;
      pointerStartRef.current = null;
      if (!start) return;
      const movedX = Math.abs(e.clientX - start.x);
      const movedY = Math.abs(e.clientY - start.y);
      const movedScroll = Math.abs((scrollContainerRef.current?.scrollTop ?? 0) - start.scrollTop);
      if (movedX < 16 && movedY < 16 && movedScroll < 16) {
        handleTap(e.clientX, e.clientY);
      }
    },
    [handleTap],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const container = scrollContainerRef.current;
      if (!container) return;
      if (introAnimating) {
        container.style.cursor = 'default';
        return;
      }
      pointerClientRef.current = { x: e.clientX, y: e.clientY };
      if (zoomLockedRef.current) {
        container.style.cursor = 'default';
        return;
      }
      const picked = pickCard(e.clientX, e.clientY);
      const card = picked?.card ?? null;
      hoveredCardRef.current = card;
      if (card && !card.clickDisabled) {
        container.style.cursor = 'pointer';
      } else {
        container.style.cursor = 'default';
      }

      if (zoomLockedRef.current || !picked || !card) {
        pointerPrevPosRef.current = null;
        return;
      }

      const now = performance.now();
      const prev = pointerPrevPosRef.current;
      const dx = prev ? e.clientX - prev.x : 0;
      const dy = prev ? e.clientY - prev.y : 0;
      pointerPrevPosRef.current = { x: e.clientX, y: e.clientY };

      const pxSpeed = Math.hypot(dx, dy);
      const uvDx = (picked.uv.x - card.targetUv.x) * card.width;
      const uvDy = (picked.uv.y - card.targetUv.y) * card.height;
      const uvSpeed = Math.hypot(uvDx, uvDy);
      const combined =
        pxSpeed * DISTORT_PRESET.speedMultiplierPx + uvSpeed * DISTORT_PRESET.speedMultiplierUv + DISTORT_PRESET.idleFloor;
      card.targetIntensity = Math.min(DISTORT_PRESET.maxIntensity, Math.max(card.targetIntensity, combined));
      card.targetMeshPullFactor = 1;
      card.targetUv.lerp(picked.uv, 0.45);
      mouseMovingUntilRef.current = now + DISTORT_PRESET.mouseMoveTimerMs;
    },
    [introAnimating, pickCard],
  );

  const handlePointerLeave = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    container.style.cursor = 'default';
    hoveredCardRef.current = null;
    pointerPrevPosRef.current = null;
    pointerClientRef.current = null;
  }, []);

  useEffect(() => {
    introAnimatingRef.current = introAnimating;
  }, [introAnimating]);

  useEffect(() => {
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
    window.history.replaceState({ zoomed: false }, '', '/projects');
    setHeaderLogoTrigger(Date.now());
    return () => {
      if ('scrollRestoration' in history) {
        history.scrollRestoration = 'auto';
      }
    };
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
    const fetchLayout = async () => {
      try {
        const { data } = await supabase.from('config').select('content').eq('id', 'projectLayout').single();
        if (!data?.content || typeof data.content !== 'object' || !('items' in data.content)) {
          setLayoutItems([]);
          return;
        }
        const items =
          (
            data.content as {
              items?: Array<{
                frameIndex: number;
                imageUrl?: string | null;
                orientation?: 'horizontal' | 'vertical' | null;
                projectId: string | null;
                order: number;
                clickDisabled?: boolean;
              }>;
            }
          ).items || [];
        const sorted = [...items]
          .sort((a, b) => (a.order || 0) - (b.order || 0))
          .map((item) => ({
            frameIndex: item.frameIndex,
            imageUrl: item.imageUrl || null,
            orientation: item.orientation || null,
            projectId: item.projectId,
            order: item.order,
            clickDisabled: item.clickDisabled || false,
          }));
        setLayoutItems(sorted);
      } catch {
        setLayoutItems([]);
      }
    };
    fetchLayout();
  }, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const onScroll = () => {
      if (zoomLockedRef.current) return;
      const remaining = container.scrollHeight - (container.scrollTop + container.clientHeight);
      if (remaining < 1600) {
        setSectionCount((prev) => Math.min(48, prev + 2));
      }
    };

    container.addEventListener('scroll', onScroll, { passive: true });
    return () => container.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    let cancelled = false;

    const loadAssets = async () => {
      if (layoutItems.length === 0) {
        assetsRef.current = [];
        rebuildCards();
        return;
      }
      const loaded = await Promise.all(
        layoutItems
          .filter((item) => Boolean(item.imageUrl))
          .map(
            (item) =>
              new Promise<LoadedAsset | null>((resolve) => {
                const src = item.imageUrl as string;
                loader.load(
                  src,
                  (texture: THREE.Texture) => {
                    texture.colorSpace = THREE.SRGBColorSpace;
                    texture.minFilter = THREE.LinearFilter;
                    texture.magFilter = THREE.LinearFilter;
                    texture.wrapS = THREE.ClampToEdgeWrapping;
                    texture.wrapT = THREE.ClampToEdgeWrapping;
                    const image = texture.image as { width?: number; height?: number } | undefined;
                    resolve({
                      texture,
                      src,
                      width: image?.width || 1,
                      height: image?.height || 1,
                      frameIndex: item.frameIndex,
                      orientation: item.orientation || undefined,
                      projectId: item.projectId || `img-${item.frameIndex}`,
                      projectSlug: item.projectId || undefined,
                      clickDisabled: item.clickDisabled,
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
      assetsRef.current = loaded.filter((v): v is LoadedAsset => v !== null);
      rebuildCards();
    };

    loadAssets();
    return () => {
      cancelled = true;
    };
  }, [layoutItems, rebuildCards]);

  useEffect(() => {
    if (!isZoomLocked) return;
    hoveredCardRef.current = null;
    pointerPrevPosRef.current = null;
    for (const card of cardsRef.current) {
      card.targetIntensity = 0;
      card.currentIntensity = 0;
      card.targetMeshPullFactor = 0;
      card.currentMeshPullFactor = 0;
      card.material.uniforms.uIntensity.value = 0;
      card.material.uniforms.uMeshPullFactor.value = 0;
    }
  }, [isZoomLocked]);

  useEffect(() => {
    if (!selectedCardRef.current) {
      historyPushedRef.current = false;
      window.history.replaceState({ zoomed: false }, '', '/projects');
      return;
    }

    if (!historyPushedRef.current) {
      const slug = selectedProject?.slug || selectedCardRef.current.projectSlug || selectedCardRef.current.projectId;
      const detailUrl = slug ? `/projects/${slug}` : '/projects';
      window.history.pushState({ modal: true, step: 1, originalPath: '/projects' }, '', '/projects');
      window.history.pushState({ modal: true, step: 2, originalPath: '/projects' }, '', detailUrl);
      historyPushedRef.current = true;
    }
  }, [selectedProject]);

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (!selectedCardRef.current) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      const state = e.state;
      if (state?.modal && state?.step === 1) {
        window.history.forward();
        setTimeout(() => closeCover(), 10);
      } else {
        window.history.pushState({ modal: false }, '', '/projects');
        closeCover();
      }
      return false;
    };
    window.addEventListener('popstate', handlePopState, { capture: true });
    return () => window.removeEventListener('popstate', handlePopState, { capture: true });
  }, [closeCover]);

  useEffect(() => {
    rebuildCards();
    const onResize = () => {
      const renderer = rendererRef.current;
      const camera = cameraRef.current;
      if (!renderer || !camera) return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      renderer.setSize(w, h);
      camera.left = -w / 2;
      camera.right = w / 2;
      camera.top = h / 2;
      camera.bottom = -h / 2;
      camera.updateProjectionMatrix();
      rebuildCards();
      closeCover();
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [closeCover, rebuildCards]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const w = window.innerWidth;
    const h = window.innerHeight;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h);
    renderer.setClearColor(0xffffff, 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-w / 2, w / 2, h / 2, -h / 2, -2000, 2000);
    camera.position.set(0, 0, 10);
    camera.zoom = 1;
    camera.updateProjectionMatrix();

    rendererRef.current = renderer;
    sceneRef.current = scene;
    cameraRef.current = camera;
    raycasterRef.current = new THREE.Raycaster();

    const tick = () => {
      const currentRenderer = rendererRef.current;
      const currentScene = sceneRef.current;
      const currentCamera = cameraRef.current;
      if (!currentRenderer || !currentScene || !currentCamera) return;

      const scrollTop = scrollContainerRef.current?.scrollTop ?? 0;
      const viewportHeight = window.innerHeight;
      const now = performance.now();
      const distortionEnabled = !zoomLockedRef.current && selectedCardRef.current === null;
      const isZoomOutAnimating = cameraTweenRef.current?.toZoom === 1;
      const shouldDimOthers = selectedCardRef.current !== null && !isZoomOutAnimating;
      const introStart = introStartAtRef.current;
      const isIntroActive = introAnimatingRef.current && introStart !== null;
      const introAppearPhaseEnd = introMaxDelayRef.current + INTRO_APPEAR_DURATION_MS;
      let introDone = true;

      if (distortionEnabled && pointerClientRef.current) {
        const hovered = pickCard(pointerClientRef.current.x, pointerClientRef.current.y);
        hoveredCardRef.current = hovered?.card ?? null;
      }

      for (const card of cardsRef.current) {
        const targetY = viewportHeight / 2 - (card.yContent + card.height / 2 - scrollTop);
        let introAlpha = 1;
        if (isIntroActive) {
          card.mesh.renderOrder = card.introOrder;
          const elapsed = now - introStart;
          if (card.introEnabled && elapsed < introAppearPhaseEnd) {
            const appearRaw = (elapsed - card.introDelayMs) / INTRO_APPEAR_DURATION_MS;
            const appearT = Math.min(1, Math.max(0, appearRaw));
            const appearEased = cubicBezierYFromX(appearT, EASE.x1, EASE.y1, EASE.x2, EASE.y2);
            const appearSoft = appearEased * appearEased * (3 - 2 * appearEased);
            card.mesh.position.x = card.introFromX;
            card.mesh.position.y = card.introFromY;
            const centerScale =
              INTRO_CENTER_START_SCALE + (INTRO_CENTER_END_SCALE - INTRO_CENTER_START_SCALE) * appearSoft;
            card.mesh.scale.setScalar(centerScale);
            introAlpha = appearSoft;
            introDone = false;
          } else if (card.introEnabled) {
            const spreadRaw = (elapsed - introAppearPhaseEnd) / card.introDurationMs;
            const spreadT = Math.min(1, Math.max(0, spreadRaw));
            const spreadEased = cubicBezierYFromX(spreadT, EASE.x1, EASE.y1, EASE.x2, EASE.y2);
            card.mesh.position.x = card.introFromX + (card.targetX - card.introFromX) * spreadEased;
            card.mesh.position.y = card.introFromY + (targetY - card.introFromY) * spreadEased;
            const introScale = INTRO_CENTER_END_SCALE + (INTRO_END_SCALE - INTRO_CENTER_END_SCALE) * spreadEased;
            card.mesh.scale.setScalar(introScale);
            introAlpha = 1;
            if (spreadT < 1) introDone = false;
          } else {
            card.mesh.position.x = card.targetX;
            card.mesh.position.y = targetY;
            card.mesh.scale.setScalar(1);
            introAlpha = 1;
          }
        } else {
          card.mesh.renderOrder = 0;
          card.mesh.position.x = card.targetX;
          card.mesh.position.y = targetY;
          card.mesh.scale.setScalar(1);
        }

        if (distortionEnabled) {
          const isHovered = hoveredCardRef.current?.mesh === card.mesh;
          if (isHovered) {
            card.targetIntensity = Math.max(card.targetIntensity, DISTORT_PRESET.idleFloor);
            if (now > mouseMovingUntilRef.current) {
              card.targetIntensity = Math.max(card.targetIntensity, DISTORT_PRESET.idleFloor);
            }
            card.targetMeshPullFactor = Math.max(card.targetMeshPullFactor, 0.85);
          } else {
            card.targetIntensity *= DISTORT_PRESET.decay;
            if (card.targetIntensity < 0.0005) card.targetIntensity = 0;
            card.targetMeshPullFactor *= 0.72;
            if (card.targetMeshPullFactor < 0.0005) card.targetMeshPullFactor = 0;
          }
          card.currentIntensity += (card.targetIntensity - card.currentIntensity) * DISTORT_PRESET.easing;
          card.currentMeshPullFactor += (card.targetMeshPullFactor - card.currentMeshPullFactor) * 0.08;
        } else {
          card.targetIntensity = 0;
          card.currentIntensity = 0;
          card.targetMeshPullFactor = 0;
          card.currentMeshPullFactor = 0;
        }

        const mat = card.material;
        if (distortionEnabled) {
          const uIntensity = mat.uniforms.uIntensity.value as number;
          mat.uniforms.uIntensity.value = uIntensity + (card.currentIntensity - uIntensity) * DISTORT_PRESET.uniformLerp;
          mat.uniforms.uMeshPullFactor.value = card.currentMeshPullFactor;
        } else {
          mat.uniforms.uIntensity.value = 0;
          mat.uniforms.uMeshPullFactor.value = 0;
        }

        const pointer = mat.uniforms.uPointer.value as THREE.Vector2;
        const prevPointer = mat.uniforms.uPrevPointer.value as THREE.Vector2;
        pointer.lerp(card.targetUv, 0.1);
        prevPointer.lerp(pointer, 0.06);

        const isSelected = selectedCardRef.current?.mesh === card.mesh;
        if (isSelected) {
          mat.uniforms.uAlpha.value = isIntroActive ? introAlpha : 1;
        } else {
          const targetOpacity = shouldDimOthers ? 0.22 : 1;
          const opacityWithIntro = targetOpacity * introAlpha;
          if (isIntroActive) {
            mat.uniforms.uAlpha.value = opacityWithIntro;
          } else {
            const currentAlpha = mat.uniforms.uAlpha.value as number;
            mat.uniforms.uAlpha.value = currentAlpha + (targetOpacity - currentAlpha) * 0.14;
          }
        }
      }

      if (isIntroActive && introDone) {
        introPlayedRef.current = true;
        introStartAtRef.current = null;
        setIntroAnimating(false);
      }

      const tween = cameraTweenRef.current;
      if (tween) {
        const elapsed = performance.now() - tween.startAt;
        const t = Math.min(1, Math.max(0, elapsed / tween.durationMs));
        const eased = cubicBezierYFromX(t, EASE.x1, EASE.y1, EASE.x2, EASE.y2);
        currentCamera.position.x = tween.fromX + (tween.toX - tween.fromX) * eased;
        currentCamera.position.y = tween.fromY + (tween.toY - tween.fromY) * eased;
        currentCamera.zoom = tween.fromZoom + (tween.toZoom - tween.fromZoom) * eased;

        if (t >= 1) {
          if (selectedCardRef.current && tween.toZoom === 1) {
            selectedCardRef.current = null;
            setSelectedProject(null);
            setSelectedHeroImageSrc(undefined);
            setIsHeroImageLoaded(false);
            setIsModalVisible(false);
            setIsModalInteractive(false);
            setSkipModalFadeOut(false);
            coverRevealStartedRef.current = false;
            setZoomLocked(false);
          } else if (selectedCardRef.current) {
            if (!coverRevealStartedRef.current) {
              coverRevealStartedRef.current = true;
              setIsModalVisible(true);
            }
            setSkipModalFadeOut(false);
            setIsModalInteractive(true);
            setZoomLocked(true);
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
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
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
  }, [pickCard, setZoomLocked]);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeCover();
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [closeCover]);

  const handleProjectClick = useCallback(() => {
    if (selectedCardRef.current) closeCover();
  }, [closeCover]);

  return (
    <div className="relative h-svh w-full bg-white">
      <div ref={mountRef} className="fixed inset-0 z-0 h-full w-full" />

      <Header isFixed={true} headerLogoTrigger={headerLogoTrigger} onProjectClick={handleProjectClick} />
      <MobileMenu onProjectClick={handleProjectClick} />

      {introAnimating && <div className="fixed inset-0 z-100" />}

      <div
        ref={scrollContainerRef}
        className={`relative z-10 h-full w-full overflow-x-hidden ${isZoomLocked || introAnimating ? 'overflow-y-hidden' : 'overflow-y-auto'}`}
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
          style={{ transitionTimingFunction: EASE_CSS, willChange: 'opacity' }}>
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
              transition: `background-image 0.25s ${EASE_CSS}`,
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) closeCover();
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
