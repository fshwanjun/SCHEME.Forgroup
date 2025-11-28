'use client';

import { useState, useEffect, useMemo } from 'react';
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
import { GripVertical, Trash2, Loader2, Upload, ExternalLink } from 'lucide-react';
import ImageUploader from './ImageUploader';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import Link from 'next/link';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// 랜딩 페이지 이미지 타입 정의
interface LandingPageImage {
  id: string;
  url: string;
  order: number;
  orientation?: 'horizontal' | 'vertical';
  projectSlug?: string; // 프로젝트 상세 페이지 링크 (선택적)
}

// 이미지 비율을 자동으로 감지하는 함수
const detectImageOrientation = async (urlOrFile: string | File): Promise<'horizontal' | 'vertical'> => {
  return new Promise<'horizontal' | 'vertical'>((resolve) => {
    const img = document.createElement('img');
    let objectUrl: string | null = null;

    img.onload = () => {
      // 가로가 세로보다 크거나 같으면 horizontal, 그렇지 않으면 vertical
      const orientation = img.naturalWidth >= img.naturalHeight ? 'horizontal' : 'vertical';
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
      resolve(orientation);
    };

    img.onerror = () => {
      // 에러 발생 시 기본값으로 horizontal 반환
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
      resolve('horizontal');
    };

    if (typeof urlOrFile === 'string') {
      img.src = urlOrFile;
    } else {
      // File 객체인 경우 Object URL 생성
      objectUrl = URL.createObjectURL(urlOrFile);
      img.src = objectUrl;
    }
  });
};

// Sortable Image Item
function SortableLandingImageItem({
  image,
  onRemove,
  onProjectChange,
  projects,
}: {
  image: LandingPageImage;
  onRemove: (id: string) => void;
  onProjectChange: (id: string, projectSlug: string | undefined) => void;
  projects: Array<{ id: number; slug: string; title: string }>;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: image.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

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

      {/* 썸네일 */}
      <div className="relative h-16 shrink-0 overflow-hidden rounded bg-stone-950" style={{ maxWidth: '96px' }}>
        <Image
          src={image.url}
          alt="Landing page image"
          className="h-full w-auto object-contain"
          width={96}
          height={64}
          unoptimized
        />
      </div>

      {/* Orientation 배지 */}
      <div className="shrink-0">
        <span className="rounded bg-stone-800 px-2 py-1 text-[10px] font-medium text-stone-300">
          {image.orientation === 'vertical' ? 'Vertical' : 'Horizontal'}
        </span>
      </div>

      {/* 이미지 URL 표시 */}
      <div className="flex-1 truncate text-sm text-stone-300">{image.url.split('/').pop()}</div>

      {/* 프로젝트 링크 선택 */}
      <div className="w-48 shrink-0">
        <Select
          value={image.projectSlug || undefined}
          onValueChange={(value) => onProjectChange(image.id, value === '__none__' ? undefined : value)}>
          <SelectTrigger className="h-8 border-stone-700 bg-stone-800 text-xs text-stone-200 hover:bg-stone-700">
            <SelectValue placeholder="No project" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">No project</SelectItem>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.slug}>
                {project.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 삭제 버튼 */}
      <Button
        variant="ghost"
        size="icon"
        onClick={(e) => {
          e.stopPropagation();
          onRemove(image.id);
        }}
        className="h-8 w-8 shrink-0 text-stone-400 hover:bg-stone-800 hover:text-red-400"
        title="Delete image">
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

interface Project {
  id: number;
  slug: string;
  title: string;
}

export default function LandingPageManager() {
  const [images, setImages] = useState<LandingPageImage[]>([]);
  const [originalImages, setOriginalImages] = useState<LandingPageImage[]>([]); // 원본 데이터 저장
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set());
  const [projects, setProjects] = useState<Project[]>([]);

  // 변경 사항 여부 확인 (JSON 문자열 비교 - 메모이제이션으로 최적화)
  const isChanged = useMemo(() => {
    return JSON.stringify(images) !== JSON.stringify(originalImages);
  }, [images, originalImages]);

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
          .select('id, slug, title')
          .eq('status', 'published')
          .order('display_order', { ascending: true });

        if (error) {
          console.error('프로젝트 로드 에러:', error);
        } else {
          setProjects((data as Project[]) || []);
        }
      } catch (error) {
        console.error('프로젝트 로드 에러:', error);
      }
    };

    fetchProjects();
  }, []);

  // 랜딩 페이지 이미지 목록 불러오기
  useEffect(() => {
    const fetchImages = async () => {
      setLoading(true);
      try {
        const { data: configData } = await supabase.from('config').select('content').eq('id', 'landing').single();

        if (configData?.content && typeof configData.content === 'object' && 'images' in configData.content) {
          const landingImages = (configData.content as { images: LandingPageImage[] }).images || [];
          // order 기준으로 정렬
          const sortedImages = [...landingImages].sort((a, b) => (a.order || 0) - (b.order || 0));
          setImages(sortedImages);
          setOriginalImages(sortedImages); // 원본 데이터 저장
        }
      } catch (error) {
        console.error('랜딩 페이지 이미지 로드 에러:', error);
      }
      setLoading(false);
    };

    fetchImages();
  }, []);

  // 이미지 업로드 핸들러
  const handleAddImage = async (url: string) => {
    // 이미지 비율 자동 감지
    const orientation = await detectImageOrientation(url);
    const newImage: LandingPageImage = {
      id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      url,
      order: images.length,
      orientation,
    };

    const updatedImages = [...images, newImage];
    setImages(updatedImages);
  };

  // 이미지 삭제 핸들러
  const handleRemoveImage = async (id: string) => {
    if (!confirm('Do you want to delete this image?')) return;

    const updatedImages = images
      .filter((img) => img.id !== id)
      .map((img, index) => ({
        ...img,
        order: index,
      }));
    setImages(updatedImages);
  };

  // 프로젝트 링크 변경 핸들러
  const handleProjectChange = (imageId: string, projectSlug: string | undefined) => {
    const updatedImages = images.map((img) =>
      img.id === imageId
        ? {
            ...img,
            projectSlug,
          }
        : img,
    );
    setImages(updatedImages);
  };

  // 이미지 저장 (Supabase config 테이블에 저장)
  const saveImages = async (imagesToSave: LandingPageImage[]) => {
    setLoading(true);
    try {
      const { error } = await supabase.from('config').upsert({
        id: 'landing',
        content: { images: imagesToSave },
      });

      if (error) {
        console.error('Save error:', error);
        alert('An error occurred while saving: ' + error.message);
      } else {
        setOriginalImages(imagesToSave); // 저장 성공 시 원본 데이터 갱신
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
      const oldIndex = images.findIndex((item) => item.id === active.id);
      const newIndex = images.findIndex((item) => item.id === over.id);
      const reorderedImages = arrayMove(images, oldIndex, newIndex).map((img, index) => ({
        ...img,
        order: index,
      }));
      setImages(reorderedImages);
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

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  // 파일 업로드 핸들러
  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter((file) => file.type.startsWith('image/'));

    if (imageFiles.length === 0) {
      alert('No valid image files found.');
      return;
    }

    await handleFiles(imageFiles);
  };

  const handleFiles = async (files: File[]) => {
    const newImages: LandingPageImage[] = [];

    for (const file of files) {
      const fileId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      setUploadingFiles((prev) => new Set(prev).add(fileId));

      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
        const filePath = `landing/${fileName}`;

        const { error: uploadError } = await supabase.storage.from('images').upload(filePath, file);

        if (uploadError) {
          throw uploadError;
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from('images').getPublicUrl(filePath);

        // 이미지 비율 자동 감지 (업로드된 URL 사용)
        const orientation = await detectImageOrientation(publicUrl);
        const newImage: LandingPageImage = {
          id: `img-${fileId}`,
          url: publicUrl,
          order: images.length + newImages.length,
          orientation,
        };
        newImages.push(newImage);
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

    if (newImages.length > 0) {
      const updatedImages = [...images, ...newImages];
      setImages(updatedImages);
    }
  };

  const isUploading = uploadingFiles.size > 0;

  return (
    <Card className="border-stone-800 bg-stone-900">
      <CardContent className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="mb-2 text-stone-200">Landing Page Images</CardTitle>
            <CardDescription className="text-stone-400">
              Manage images displayed in the home page gallery. You can change the order by dragging and dropping.
            </CardDescription>
          </div>
          <Link href="/" target="_blank">
            <Button
              variant="outline"
              className="gap-2 border-stone-700 bg-stone-800 text-stone-200 hover:border-stone-600 hover:bg-stone-200 hover:text-stone-900">
              View Home <ExternalLink className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        {/* 드래그앤드롭 영역 */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            'relative rounded-lg border-2 border-dashed transition-colors',
            isDragging ? 'border-stone-500 bg-stone-800/50' : 'border-stone-800 bg-stone-900/30',
            isUploading && 'pointer-events-none opacity-50',
          )}>
          {isDragging && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-lg bg-stone-900/90">
              <Upload className="h-12 w-12 text-stone-400" />
              <p className="text-lg font-medium text-stone-200">Drop images here</p>
              <p className="text-sm text-stone-400">Multiple images supported</p>
            </div>
          )}

          {isUploading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-lg bg-stone-900/90">
              <Loader2 className="h-8 w-8 animate-spin text-stone-400" />
              <p className="text-sm text-stone-400">Uploading {uploadingFiles.size} file(s)...</p>
            </div>
          )}

          {/* 이미지 리스트 */}
          <div className="space-y-2 p-4">
            {loading && images.length === 0 ? (
              <div className="py-8 text-center text-stone-500">
                <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin opacity-50" />
                Loading images...
              </div>
            ) : images.length === 0 ? (
              <div className="py-8 text-center text-stone-500">No images. Click the button below to add images.</div>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={images.map((img) => img.id)} strategy={verticalListSortingStrategy}>
                  {images.map((image) => (
                    <SortableLandingImageItem
                      key={image.id}
                      image={image}
                      onRemove={handleRemoveImage}
                      onProjectChange={handleProjectChange}
                      projects={projects}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            )}

            {/* 이미지 추가 버튼 */}
            <div className="mt-2">
              <ImageUploader
                value=""
                onChange={handleAddImage}
                folderPath="landing"
                label="Add Image"
                bucketName="images"
              />
            </div>
          </div>
        </div>

        <p className="text-xs text-stone-500">
          💡 Tip: Drag and drop multiple images at once, or click the upload button to add them one by one.
        </p>

        {/* Update Button */}
        <div className="flex justify-end border-t border-stone-800 pt-4">
          <Button
            onClick={() => saveImages(images)}
            disabled={loading || !isChanged}
            className="w-full bg-stone-100 text-stone-900 hover:bg-stone-200 disabled:cursor-not-allowed disabled:opacity-50 md:w-auto">
            {loading ? 'Saving...' : isChanged ? 'Update' : 'No Changes'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
