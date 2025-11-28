'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Loader2, ExternalLink, Upload, X, Trash2, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import Link from 'next/link';
import { PROJECT_LAYOUT_CONFIG } from '@/config/projectLayout';

// 프로젝트 레이아웃 아이템 타입 정의
interface ProjectLayoutItem {
  id: string; // 프레임 인덱스 기반 고유 ID
  frameIndex: number; // PROJECT_FRAME_CLASSES 배열의 인덱스
  imageUrl: string | null; // 업로드한 이미지 URL (null이면 미업로드)
  orientation: 'horizontal' | 'vertical' | null; // 업로드한 이미지의 비율 (null이면 미업로드)
  projectId: string | null; // 선택된 프로젝트 ID (null이면 미선택, 이미지에 링크)
  order: number; // 표시 순서
}

// 프로젝트 타입 정의
interface Project {
  id: number;
  slug: string;
  title: string;
  contents?: {
    thumbnail43?: string;
    thumbnail34?: string;
  };
}

// Sortable Layout Item
function SortableProjectLayoutItem({
  item,
  projects,
  onSelectProject,
  onImageUpload,
  onImageRemove,
  onRemove,
}: {
  item: ProjectLayoutItem;
  projects: Project[];
  onSelectProject: (frameIndex: number, projectId: string | null) => void;
  onImageUpload: (frameIndex: number, imageUrl: string, orientation: 'horizontal' | 'vertical') => void;
  onImageRemove: (frameIndex: number) => void;
  onRemove: (frameIndex: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const selectedProject = item.projectId ? projects.find((p) => p.id.toString() === item.projectId) : null;

  // 업로드한 이미지의 orientation 사용, 없으면 null
  const orientation = item.orientation;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group flex items-center gap-4 rounded-lg border border-stone-800 bg-stone-900 p-3 transition-colors hover:border-stone-600"
      onClick={(e) => e.stopPropagation()}>
      {/* 드래그 핸들 */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab rounded bg-stone-800 p-1.5 text-stone-400 transition-colors hover:bg-stone-700 hover:text-stone-200 active:cursor-grabbing"
        onClick={(e) => e.stopPropagation()}
        title="Drag to reorder">
        <GripVertical className="h-4 w-4" />
      </button>

      {/* 프레임 정보 */}
      <div className="shrink-0">
        <span className="rounded bg-stone-800 px-2 py-1 text-[10px] font-medium text-stone-300">
          Frame {item.frameIndex + 1}
        </span>
      </div>

      {/* Orientation 배지 */}
      <div className="shrink-0">
        <span className="rounded bg-stone-800 px-2 py-1 text-[10px] font-medium text-stone-300">
          {orientation === 'vertical' ? 'Vertical' : orientation === 'horizontal' ? 'Horizontal' : 'No Image'}
        </span>
      </div>

      {/* 이미지 업로드 */}
      <div className="shrink-0">
        {item.imageUrl ? (
          <div className="relative">
            <div className="relative h-16 w-16 overflow-hidden rounded bg-stone-950">
              <Image
                src={item.imageUrl}
                alt="Uploaded image"
                className="h-full w-full object-cover"
                width={64}
                height={64}
                unoptimized
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onImageRemove(item.frameIndex)}
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 p-0 text-white hover:bg-red-600"
              title="Remove image">
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <button
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = 'image/*';
              input.onchange = async (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (!file) return;

                try {
                  const fileExt = file.name.split('.').pop();
                  const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
                  const filePath = `project-layout/${fileName}`;

                  const { error: uploadError } = await supabase.storage.from('images').upload(filePath, file);

                  if (uploadError) throw uploadError;

                  const {
                    data: { publicUrl },
                  } = supabase.storage.from('images').getPublicUrl(filePath);
                  
                  // 이미지 비율 감지 후 업로드
                  const orientation = await detectImageOrientation(publicUrl);
                  onImageUpload(item.frameIndex, publicUrl, orientation);
                } catch (error) {
                  console.error('Upload error:', error);
                  alert('Failed to upload image');
                }
              };
              input.click();
            }}
            className="flex h-16 w-16 items-center justify-center rounded border border-dashed border-stone-700 bg-stone-900/50 text-stone-500 transition-colors hover:border-stone-600 hover:bg-stone-900 hover:text-stone-400"
            title="Upload image">
            <Upload className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* 썸네일 - 업로드한 이미지만 표시 */}
      {item.imageUrl ? (
        <div className="relative h-16 shrink-0 overflow-hidden rounded bg-stone-950" style={{ maxWidth: '96px' }}>
          <Image
            src={item.imageUrl}
            alt="Uploaded image"
            className="h-full w-auto object-contain"
            width={96}
            height={64}
            unoptimized
          />
        </div>
      ) : (
        <div className="relative h-16 shrink-0 overflow-hidden rounded bg-stone-950" style={{ maxWidth: '96px' }}>
          <div className="flex h-full w-full items-center justify-center text-xs text-stone-600">No Image</div>
        </div>
      )}

      {/* 프로젝트 선택 드롭다운 (링크용) */}
      <div className="flex-1">
        <select
          value={item.projectId || ''}
          onChange={(e) => {
            const projectId = e.target.value || null;
            onSelectProject(item.frameIndex, projectId);
          }}
          className="w-full rounded border border-stone-700 bg-stone-800 px-3 py-1.5 text-sm text-stone-200 focus:border-stone-600 focus:ring-1 focus:ring-stone-600 focus:outline-none"
          disabled={!item.imageUrl}>
          <option value="">-- Select Project (Link) --</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id.toString()}>
              {project.title}
            </option>
          ))}
        </select>
      </div>

      {/* 프로젝트 링크 */}
      {selectedProject && (
        <Link href={`/project/${selectedProject.slug}`} target="_blank">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-stone-400 hover:bg-stone-800 hover:text-stone-200"
            title="View project">
            <ExternalLink className="h-4 w-4" />
          </Button>
        </Link>
      )}

      {/* 아이템 삭제 버튼 */}
      <Button
        variant="ghost"
        size="icon"
        onClick={(e) => {
          e.stopPropagation();
          onRemove(item.frameIndex);
        }}
        className="h-8 w-8 shrink-0 text-stone-400 hover:bg-stone-800 hover:text-red-400"
        title="Delete item">
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

// 이미지 비율을 자동으로 감지하는 함수
const detectImageOrientation = async (urlOrFile: string | File): Promise<'horizontal' | 'vertical'> => {
  return new Promise<'horizontal' | 'vertical'>((resolve) => {
    const img = document.createElement('img');
    let objectUrl: string | null = null;

    img.onload = () => {
      const orientation = img.naturalWidth >= img.naturalHeight ? 'horizontal' : 'vertical';
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
      resolve(orientation);
    };

    img.onerror = () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
      resolve('horizontal');
    };

    if (typeof urlOrFile === 'string') {
      img.src = urlOrFile;
    } else {
      objectUrl = URL.createObjectURL(urlOrFile);
      img.src = objectUrl;
    }
  });
};

export default function ProjectLayoutManager() {
  const [layoutItems, setLayoutItems] = useState<ProjectLayoutItem[]>([]);
  const [originalLayoutItems, setOriginalLayoutItems] = useState<ProjectLayoutItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set());

  // 변경 사항 여부 확인
  const isChanged = JSON.stringify(layoutItems) !== JSON.stringify(originalLayoutItems);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // 프로젝트 목록 불러오기
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const { data, error } = await supabase
          .from('project')
          .select('id, slug, title, contents')
          .eq('status', 'published')
          .order('display_order', { ascending: true });

        if (error) {
          console.error('프로젝트 로드 에러:', error);
        } else {
          setProjects(data || []);
        }
      } catch (error) {
        console.error('프로젝트 로드 에러:', error);
      }
    };

    fetchProjects();
  }, []);

  // 프로젝트 레이아웃 설정 불러오기
  useEffect(() => {
    const fetchLayout = async () => {
      setLoading(true);
      try {
        const { data: configData } = await supabase.from('config').select('content').eq('id', 'projectLayout').single();

        const totalFrames = PROJECT_LAYOUT_CONFIG.desktop.frameClasses.length;
        let items: ProjectLayoutItem[] = [];

        if (configData?.content && typeof configData.content === 'object' && 'items' in configData.content) {
          const savedItems = (configData.content as { items: ProjectLayoutItem[] }).items || [];
          // 저장된 아이템이 있으면 사용, 없으면 새로 생성
          if (savedItems.length > 0) {
            items = savedItems;
          } else {
            // 프레임 수만큼 빈 아이템 생성
            items = Array.from({ length: totalFrames }, (_, index) => ({
              id: `frame-${index}`,
              frameIndex: index,
              imageUrl: null,
              orientation: null,
              projectId: null,
              order: index,
            }));
          }
        } else {
          // 프레임 수만큼 빈 아이템 생성
          items = Array.from({ length: totalFrames }, (_, index) => ({
            id: `frame-${index}`,
            frameIndex: index,
            imageUrl: null,
            projectId: null,
            order: index,
          }));
        }

        // order 기준으로 정렬
        const sortedItems = [...items].sort((a, b) => (a.order || 0) - (b.order || 0));
        setLayoutItems(sortedItems);
        setOriginalLayoutItems(sortedItems);
      } catch (error) {
        console.error('레이아웃 로드 에러:', error);
        // 에러 발생 시 기본 아이템 생성
        const totalFrames = PROJECT_LAYOUT_CONFIG.desktop.frameClasses.length;
        const items = Array.from({ length: totalFrames }, (_, index) => ({
          id: `frame-${index}`,
          frameIndex: index,
          imageUrl: null,
          projectId: null,
          order: index,
        }));
        setLayoutItems(items);
        setOriginalLayoutItems(items);
      }
      setLoading(false);
    };

    fetchLayout();
  }, []);

  // 프로젝트 선택 핸들러
  const handleSelectProject = (frameIndex: number, projectId: string | null) => {
    const updatedItems = layoutItems.map((item) =>
      item.frameIndex === frameIndex
        ? {
            ...item,
            projectId,
          }
        : item,
    );
    setLayoutItems(updatedItems);
  };

  // 이미지 업로드 핸들러
  const handleImageUpload = (frameIndex: number, imageUrl: string, orientation: 'horizontal' | 'vertical') => {
    const updatedItems = layoutItems.map((item) =>
      item.frameIndex === frameIndex
        ? {
            ...item,
            imageUrl,
            orientation,
          }
        : item,
    );
    setLayoutItems(updatedItems);
  };

  // 이미지 제거 핸들러
  const handleImageRemove = (frameIndex: number) => {
    if (!confirm('Are you sure you want to remove this image?')) return;

    const updatedItems = layoutItems.map((item) =>
      item.frameIndex === frameIndex
        ? {
            ...item,
            imageUrl: null,
            orientation: null,
          }
        : item,
    );
    setLayoutItems(updatedItems);
  };

  // 레이아웃 아이템 삭제 핸들러
  const handleRemoveItem = (frameIndex: number) => {
    if (!confirm('Are you sure you want to delete this layout item?')) return;

    const updatedItems = layoutItems
      .filter((item) => item.frameIndex !== frameIndex)
      .map((item, index) => ({
        ...item,
        order: index,
      }));
    setLayoutItems(updatedItems);
  };

  // 새 카드 추가 핸들러
  const handleAddNewCard = () => {
    const totalFrames = PROJECT_LAYOUT_CONFIG.desktop.frameClasses.length;
    // 사용된 frameIndex 찾기
    const usedFrameIndices = new Set(layoutItems.map((item) => item.frameIndex));
    
    // 사용되지 않은 첫 번째 frameIndex 찾기, 없으면 순환 사용
    let newFrameIndex = 0;
    for (let i = 0; i < totalFrames; i++) {
      if (!usedFrameIndices.has(i)) {
        newFrameIndex = i;
        break;
      }
    }
    // 모두 사용 중이면 마지막 인덱스 다음 사용 (순환)
    if (usedFrameIndices.has(newFrameIndex)) {
      newFrameIndex = Math.max(...Array.from(usedFrameIndices)) + 1;
    }

    const maxOrder = layoutItems.length > 0 ? Math.max(...layoutItems.map((item) => item.order || 0)) : -1;
    const newItem: ProjectLayoutItem = {
      id: `frame-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      frameIndex: newFrameIndex,
      imageUrl: null,
      orientation: null,
      projectId: null,
      order: maxOrder + 1,
    };

    setLayoutItems([...layoutItems, newItem]);
  };

  // 여러 이미지 업로드 핸들러
  const handleMultipleImageUpload = async (files: File[]) => {
    const imageFiles = files.filter((file) => file.type.startsWith('image/'));

    if (imageFiles.length === 0) {
      alert('No valid image files found.');
      return;
    }

    const totalFrames = PROJECT_LAYOUT_CONFIG.desktop.frameClasses.length;
    const usedFrameIndices = new Set(layoutItems.map((item) => item.frameIndex));
    let nextFrameIndex = 0;

    const newItems: ProjectLayoutItem[] = [];
    const maxOrder = layoutItems.length > 0 ? Math.max(...layoutItems.map((item) => item.order || 0)) : -1;

    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i];
      const fileId = `${Date.now()}-${i}-${Math.random().toString(36).substr(2, 9)}`;
      setUploadingFiles((prev) => new Set(prev).add(fileId));

      try {
        // 사용되지 않은 frameIndex 찾기
        while (usedFrameIndices.has(nextFrameIndex) && nextFrameIndex < totalFrames) {
          nextFrameIndex++;
        }
        // 모두 사용 중이면 순환
        if (nextFrameIndex >= totalFrames) {
          nextFrameIndex = Math.max(...Array.from(usedFrameIndices), -1) + 1;
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}_${i}.${fileExt}`;
        const filePath = `project-layout/${fileName}`;

        const { error: uploadError } = await supabase.storage.from('images').upload(filePath, file);

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from('images').getPublicUrl(filePath);

        // 이미지 비율 감지하여 적절한 프레임 선택
        const orientation = await detectImageOrientation(publicUrl);
        const frameClass = PROJECT_LAYOUT_CONFIG.desktop.frameClasses[nextFrameIndex];
        const frameOrientation = frameClass.includes('aspect-[3/4]') ? 'vertical' : 'horizontal';
        
        // 비율이 맞지 않으면 다음 적절한 프레임 찾기
        if (orientation !== frameOrientation) {
          for (let j = 0; j < totalFrames; j++) {
            const testFrameClass = PROJECT_LAYOUT_CONFIG.desktop.frameClasses[j];
            const testOrientation = testFrameClass.includes('aspect-[3/4]') ? 'vertical' : 'horizontal';
            if (orientation === testOrientation && !usedFrameIndices.has(j)) {
              nextFrameIndex = j;
              break;
            }
          }
        }

        usedFrameIndices.add(nextFrameIndex);

        const newItem: ProjectLayoutItem = {
          id: `frame-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 9)}`,
          frameIndex: nextFrameIndex,
          imageUrl: publicUrl,
          orientation,
          projectId: null,
          order: maxOrder + 1 + i,
        };

        newItems.push(newItem);
        nextFrameIndex++;
      } catch (error) {
        console.error('Upload error:', file.name, error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        alert(`Failed to upload ${file.name}: ${message}`);
      } finally {
        setUploadingFiles((prev) => {
          const next = new Set(prev);
          next.delete(fileId);
          return next;
        });
      }
    }

    if (newItems.length > 0) {
      setLayoutItems([...layoutItems, ...newItems]);
    }
  };

  // 드래그 오버 핸들러
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragging(true);
    }
  };

  // 드래그 리브 핸들러
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  // 드롭 핸들러
  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    await handleMultipleImageUpload(files);
  };

  // 레이아웃 저장
  const saveLayout = async (itemsToSave: ProjectLayoutItem[]) => {
    setLoading(true);
    try {
      const { error } = await supabase.from('config').upsert({
        id: 'projectLayout',
        content: { items: itemsToSave },
      });

      if (error) {
        console.error('Save error:', error);
        alert('An error occurred while saving: ' + error.message);
      } else {
        setOriginalLayoutItems(itemsToSave);
        alert('Saved successfully.');
      }
    } catch (error) {
      console.error('Save error:', error);
      alert('An error occurred while saving.');
    }
    setLoading(false);
  };

  // 드래그 종료 핸들러
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = layoutItems.findIndex((item) => item.id === active.id);
      const newIndex = layoutItems.findIndex((item) => item.id === over.id);
      const reorderedItems = arrayMove(layoutItems, oldIndex, newIndex).map((item, index) => ({
        ...item,
        order: index,
      }));
      setLayoutItems(reorderedItems);
    }
  };

  return (
    <Card className="border-stone-800 bg-stone-900">
      <CardContent className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="mb-2 text-stone-200">Project Layout</CardTitle>
            <CardDescription className="text-stone-400">
              Manage which projects appear in the project page gallery. Select a project for each frame and reorder by
              dragging. Drag and drop multiple images to add new cards.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleAddNewCard}
              variant="outline"
              className="gap-2 border-stone-700 bg-stone-800 text-stone-200 hover:border-stone-600 hover:bg-stone-200 hover:text-stone-900">
              <Plus className="h-4 w-4" />
              Add Card
            </Button>
            <Link href="/project" target="_blank">
              <Button
                variant="outline"
                className="gap-2 border-stone-700 bg-stone-800 text-stone-200 hover:border-stone-600 hover:bg-stone-200 hover:text-stone-900">
                View Project Page <ExternalLink className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>

        {/* 드래그 앤 드롭 영역 */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            'rounded-lg border-2 border-dashed p-8 text-center transition-colors',
            isDragging
              ? 'border-stone-500 bg-stone-800/50'
              : 'border-stone-700 bg-stone-900/30 hover:border-stone-600',
            uploadingFiles.size > 0 && 'pointer-events-none opacity-50',
          )}>
          {uploadingFiles.size > 0 ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-stone-400" />
              <p className="text-sm text-stone-400">Uploading {uploadingFiles.size} file(s)...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload className="h-8 w-8 text-stone-500" />
              <p className="text-sm text-stone-400">
                Drag and drop images here to add new cards, or click "Add Card" to add an empty card
              </p>
            </div>
          )}
        </div>

        {/* 레이아웃 아이템 리스트 */}
        <div className="space-y-2">
          {loading && layoutItems.length === 0 ? (
            <div className="py-8 text-center text-stone-500">
              <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin opacity-50" />
              Loading layout...
            </div>
          ) : layoutItems.length === 0 ? (
            <div className="py-8 text-center text-stone-500">No layout items found.</div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={layoutItems.map((item) => item.id)} strategy={verticalListSortingStrategy}>
                {layoutItems.map((item) => (
                  <SortableProjectLayoutItem
                    key={item.id}
                    item={item}
                    projects={projects}
                    onSelectProject={handleSelectProject}
                    onImageUpload={handleImageUpload}
                    onImageRemove={handleImageRemove}
                    onRemove={handleRemoveItem}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </div>

        <p className="text-xs text-stone-500">
          💡 Tip: Upload an image for each frame, then optionally link it to a project. Drag and drop items to reorder
          them.
        </p>

        {/* Update Button */}
        <div className="flex justify-end border-t border-stone-800 pt-4">
          <Button
            onClick={() => saveLayout(layoutItems)}
            disabled={loading || !isChanged}
            className="w-full bg-stone-100 text-stone-900 hover:bg-stone-200 disabled:cursor-not-allowed disabled:opacity-50 md:w-auto">
            {loading ? 'Saving...' : isChanged ? 'Update' : 'No Changes'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
