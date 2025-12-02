'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Image from 'next/image';
import type { DetailImage } from './SortableImageList';

interface SortableImageItemProps {
  image: DetailImage;
  onRemove: (id: string) => void;
  onUpdate: (id: string, updates: Partial<DetailImage>) => void;
}

export function SortableImageItem({ image, onRemove, onUpdate }: SortableImageItemProps) {
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
      className="group relative flex flex-col overflow-hidden rounded-lg border border-stone-800 bg-stone-900"
      onClick={(e) => e.stopPropagation()}>
      {/* 드래그 핸들 - 상단에 배치 */}
      <div className="flex items-center justify-end border-b border-stone-800 bg-stone-900 px-2 py-1.5">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab rounded bg-stone-800 p-1.5 text-stone-400 transition-colors hover:bg-stone-700 hover:text-stone-200 active:cursor-grabbing"
          onClick={(e) => e.stopPropagation()}
          title="Drag to reorder">
          <GripVertical className="h-4 w-4" />
        </button>
      </div>

      {/* 이미지 영역 */}
      <div className="relative w-full bg-stone-950">
        <Image
          src={image.url}
          alt="Project detail"
          className="h-auto w-full object-contain"
          width={600}
          height={600}
          unoptimized
        />
      </div>

      {/* 하단 컨트롤 영역 (항상 표시) */}
      <div
        className="flex items-center justify-between gap-2 border-t border-stone-800 bg-stone-900 p-2"
        onClick={(e) => e.stopPropagation()}>
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
    </div>
  );
}
