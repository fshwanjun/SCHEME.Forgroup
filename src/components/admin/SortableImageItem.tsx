"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SortableImageItemProps {
  id: string;
  url: string;
  onRemove: (id: string) => void;
}

export function SortableImageItem({
  id,
  url,
  onRemove,
}: SortableImageItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative group aspect-square rounded-lg overflow-hidden border border-stone-800 bg-stone-900"
    >
      <img
        src={url}
        alt="Project detail"
        className="w-full h-full object-cover"
      />

      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-white hover:text-stone-300 p-2 rounded-full hover:bg-white/10"
        >
          <GripVertical className="h-6 w-6" />
        </button>
        <Button
          variant="destructive"
          size="icon"
          onClick={() => onRemove(id)}
          className="h-8 w-8 rounded-full"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
