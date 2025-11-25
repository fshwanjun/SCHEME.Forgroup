'use client';

import { useState, useCallback } from 'react';
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
  rectSortingStrategy,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { SortableImageItem } from './SortableImageItem';
import { Label } from '@/components/ui/label';
import ImageUploader from './ImageUploader';
import { Upload, Loader2, LayoutGrid, List as ListIcon, GripVertical, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Image from 'next/image';
import { CSS } from '@dnd-kit/utilities';

export interface DetailImage {
  id: string;
  url: string;
  orientation?: 'horizontal' | 'vertical';
  position?: 'left' | 'center' | 'right' | 'full-cover' | 'full-padding';
}

interface SortableImageListProps {
  images: DetailImage[];
  onImagesChange: (images: DetailImage[]) => void;
  folderPath: string;
}

// 리스트 뷰용 아이템 컴포넌트
function SortableImageListItem({
  image,
  onRemove,
  onUpdate,
}: {
  image: DetailImage;
  onRemove: (id: string) => void;
  onUpdate: (id: string, updates: Partial<DetailImage>) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: image.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handlePositionChange = (value: 'left' | 'center' | 'right' | 'full-cover' | 'full-padding') => {
    onUpdate(image.id, { position: value });
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
          alt="Project detail"
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

      {/* Position Select */}
      <div className="flex-1" onClick={(e) => e.stopPropagation()}>
        <Select
          value={image.position || 'center'}
          onValueChange={(value: 'left' | 'center' | 'right' | 'full-cover' | 'full-padding') =>
            handlePositionChange(value)
          }>
          <SelectTrigger
            className="h-8 border-stone-700 bg-stone-950 text-xs text-stone-300 hover:border-stone-600"
            onClick={(e) => e.stopPropagation()}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-stone-800 bg-stone-900 text-stone-200">
            <SelectItem value="left" className="text-xs">
              Left
            </SelectItem>
            <SelectItem value="center" className="text-xs">
              Center
            </SelectItem>
            <SelectItem value="right" className="text-xs">
              Right
            </SelectItem>
            <SelectItem value="full-cover" className="text-xs">
              Full Cover
            </SelectItem>
            <SelectItem value="full-padding" className="text-xs">
              Full Padding
            </SelectItem>
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

export default function SortableImageList({ images, onImagesChange, folderPath }: SortableImageListProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = images.findIndex((item) => item.id === active.id);
      const newIndex = images.findIndex((item) => item.id === over.id);
      onImagesChange(arrayMove(images, oldIndex, newIndex));
    }
  };

  const handleAddImage = async (url: string) => {
    // 이미지 비율 자동 감지
    const orientation = await detectImageOrientation(url);
    const newImage: DetailImage = {
      id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      url,
      orientation,
      position: 'center',
    };
    onImagesChange([...images, newImage]);
  };

  const handleUpdateImage = (id: string, updates: Partial<DetailImage>) => {
    onImagesChange(images.map((img) => (img.id === id ? { ...img, ...updates } : img)));
  };

  const handleRemoveImage = (id: string) => {
    if (confirm('Do you want to remove this image from the list?')) {
      onImagesChange(images.filter((img) => img.id !== id));
    }
  };

  const uploadFile = useCallback(
    async (file: File): Promise<string> => {
      // 파일 유효성 검사
      if (!file.type.startsWith('image/')) {
        throw new Error('Only image files can be uploaded.');
      }

      if (file.size > 5 * 1024 * 1024) {
        throw new Error('File size must be 5MB or less.');
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      const filePath = `${folderPath}/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('images').upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from('images').getPublicUrl(filePath);

      return publicUrl;
    },
    [folderPath],
  );

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      const imageFiles = fileArray.filter((file) => file.type.startsWith('image/'));

      if (imageFiles.length === 0) {
        alert('No valid image files found.');
        return;
      }

      const newImages: DetailImage[] = [];
      const uploadPromises = imageFiles.map(async (file) => {
        const fileId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        setUploadingFiles((prev) => new Set(prev).add(fileId));

        try {
          const url = await uploadFile(file);
          // 이미지 비율 자동 감지 (업로드된 URL 사용)
          const orientation = await detectImageOrientation(url);
          const newImage: DetailImage = {
            id: `img-${fileId}`,
            url,
            orientation,
            position: 'center',
          };
          newImages.push(newImage);
        } catch (error) {
          console.error('Upload error for file:', file.name, error);
          const message = error instanceof Error ? error.message : 'Unknown error';
          alert(`Failed to upload ${file.name}: ${message}`);
        } finally {
          setUploadingFiles((prev) => {
            const next = new Set(prev);
            next.delete(fileId);
            return next;
          });
        }
      });

      await Promise.all(uploadPromises);

      if (newImages.length > 0) {
        onImagesChange([...images, ...newImages]);
      }
    },
    [images, onImagesChange, uploadFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        await handleFiles(files);
      }
    },
    [handleFiles],
  );

  const isUploading = uploadingFiles.size > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-stone-300">Detail Image List (Order changeable)</Label>
        <div className="flex items-center gap-2">
          <span className="text-xs text-stone-500">{images.length} images</span>
          {/* 뷰 모드 전환 버튼 */}
          <div className="flex items-center gap-1 rounded border border-stone-800 bg-stone-900 p-0.5">
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'rounded p-1.5 transition-colors',
                viewMode === 'list' ? 'bg-stone-800 text-stone-100 shadow-sm' : 'text-stone-500 hover:text-stone-300',
              )}
              title="List View">
              <ListIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('card')}
              className={cn(
                'rounded p-1.5 transition-colors',
                viewMode === 'card' ? 'bg-stone-800 text-stone-100 shadow-sm' : 'text-stone-500 hover:text-stone-300',
              )}
              title="Card View">
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>
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

        {/* 카드 뷰 */}
        {viewMode === 'card' ? (
          <div className="grid grid-cols-2 gap-4 p-4 md:grid-cols-4">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={images} strategy={rectSortingStrategy}>
                {images.map((image) => (
                  <SortableImageItem
                    key={image.id}
                    image={image}
                    onRemove={handleRemoveImage}
                    onUpdate={handleUpdateImage}
                  />
                ))}
              </SortableContext>
            </DndContext>

            {/* 추가 버튼 역할의 업로더 */}
            <div className="aspect-square">
              <ImageUploader
                value="" // 항상 비어있음 (새로 추가용)
                onChange={handleAddImage}
                folderPath={folderPath}
                label=" " // 라벨 숨김
                bucketName="images"
              />
            </div>
          </div>
        ) : (
          /* 리스트 뷰 */
          <div className="space-y-2 p-4">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={images} strategy={verticalListSortingStrategy}>
                {images.map((image) => (
                  <SortableImageListItem
                    key={image.id}
                    image={image}
                    onRemove={handleRemoveImage}
                    onUpdate={handleUpdateImage}
                  />
                ))}
              </SortableContext>
            </DndContext>

            {/* 추가 버튼 역할의 업로더 */}
            <div className="mt-2">
              <ImageUploader
                value="" // 항상 비어있음 (새로 추가용)
                onChange={handleAddImage}
                folderPath={folderPath}
                label="Add Image" // 리스트 뷰에서는 라벨 표시
                bucketName="images"
              />
            </div>
          </div>
        )}
      </div>

      <p className="text-xs text-stone-500">
        💡 Tip: Drag and drop multiple images from your computer, or click the upload button to add one at a time.
      </p>
    </div>
  );
}
