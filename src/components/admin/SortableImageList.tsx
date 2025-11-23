"use client";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableImageItem } from "./SortableImageItem";
import { Label } from "@/components/ui/label";
import ImageUploader from "./ImageUploader";
import { useState } from "react";

export interface DetailImage {
  id: string;
  url: string;
}

interface SortableImageListProps {
  images: DetailImage[];
  onImagesChange: (images: DetailImage[]) => void;
  folderPath: string;
}

export default function SortableImageList({
  images,
  onImagesChange,
  folderPath,
}: SortableImageListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = images.findIndex((item) => item.id === active.id);
      const newIndex = images.findIndex((item) => item.id === over.id);
      onImagesChange(arrayMove(images, oldIndex, newIndex));
    }
  };

  const handleAddImage = (url: string) => {
    const newImage: DetailImage = {
      id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      url,
    };
    onImagesChange([...images, newImage]);
  };

  const handleRemoveImage = (id: string) => {
    if (confirm("이 이미지를 목록에서 제거하시겠습니까?")) {
      onImagesChange(images.filter((img) => img.id !== id));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Label className="text-stone-300">
          상세 이미지 목록 (순서 변경 가능)
        </Label>
        <span className="text-xs text-stone-500">
          {images.length}개의 이미지
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={images} strategy={rectSortingStrategy}>
            {images.map((image) => (
              <SortableImageItem
                key={image.id}
                id={image.id}
                url={image.url}
                onRemove={handleRemoveImage}
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
    </div>
  );
}
