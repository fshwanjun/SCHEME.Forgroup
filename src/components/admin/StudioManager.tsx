'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ExternalLink, GripVertical, Plus, Trash2 } from 'lucide-react';
import ImageUploader from './ImageUploader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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

// 리스트 아이템 타입 정의
interface ListItem {
  id: string;
  text: string;
}

// JSON 데이터 구조 정의
interface StudioData {
  imageUrl: string;
  description: string;
  experience: ListItem[];
  services: ListItem[];
  clients: ListItem[];
  address: string;
  contact: string;
  social: string;
}

// 초기값
const initialData: StudioData = {
  imageUrl: '/images/dummy/studio.jpg',
  description: '',
  experience: [],
  services: [],
  clients: [],
  address: '',
  contact: '',
  social: '',
};

// --- Sortable Item Component ---
function SortableItem({
  item,
  onRemove,
  onChange,
}: {
  item: ListItem;
  onRemove: (id: string) => void;
  onChange: (id: string, text: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="group mb-2 flex items-center gap-2">
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab rounded p-1 text-stone-500 hover:bg-stone-800 hover:text-stone-300 active:cursor-grabbing"
        title="Drag to change order">
        <GripVertical className="h-4 w-4" />
      </button>
      <Input
        value={item.text}
        onChange={(e) => onChange(item.id, e.target.value)}
        className="h-9 border-stone-800 bg-stone-950 text-stone-200"
      />
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onRemove(item.id)}
        className="h-9 w-9 shrink-0 text-stone-500 hover:bg-stone-800 hover:text-red-400"
        title="Delete">
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

// --- Sortable List Container ---
function SortableSection({
  title,
  items,
  onItemsChange,
}: {
  title: string;
  items: ListItem[];
  onItemsChange: (items: ListItem[]) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      onItemsChange(arrayMove(items, oldIndex, newIndex));
    }
  };

  const handleAddItem = () => {
    const newItem: ListItem = {
      id: `item-${Date.now()}`,
      text: '',
    };
    onItemsChange([...items, newItem]);
  };

  const handleRemoveItem = (id: string) => {
    onItemsChange(items.filter((item) => item.id !== id));
  };

  const handleChangeItem = (id: string, text: string) => {
    onItemsChange(items.map((item) => (item.id === id ? { ...item, text } : item)));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-stone-300">{title}</Label>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleAddItem}
          className="h-6 px-2 text-xs text-stone-400 hover:bg-stone-800 hover:text-stone-200">
          <Plus className="mr-1 h-3 w-3" /> Add
        </Button>
      </div>
      <div className="min-h-[100px] rounded-md border border-stone-800 bg-stone-900/50 p-2">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items} strategy={verticalListSortingStrategy}>
            {items.length === 0 ? (
              <div className="py-8 text-center text-xs text-stone-600">Please add an item.</div>
            ) : (
              items.map((item) => (
                <SortableItem key={item.id} item={item} onRemove={handleRemoveItem} onChange={handleChangeItem} />
              ))
            )}
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}

// --- Main Component ---
export default function StudioManager() {
  const [data, setData] = useState<StudioData>(initialData);
  const [originalData, setOriginalData] = useState<StudioData>(initialData); // 👈 초기 데이터 저장
  const [loading, setLoading] = useState(false);

  // 변경 사항 여부 확인 (JSON 문자열 비교 - 메모이제이션으로 최적화)
  const isChanged = useMemo(() => {
    return JSON.stringify(data) !== JSON.stringify(originalData);
  }, [data, originalData]);

  // 1. Studio 내용 불러오기
  useEffect(() => {
    const fetchStudioContent = async () => {
      setLoading(true);
      const { data: configData } = await supabase.from('config').select('content').eq('id', 'about').single();

      if (configData?.content) {
        try {
          // jsonb 타입이므로 이미 객체로 반환될 수 있음
          const content = configData.content;
          const parsed = typeof content === 'string' ? JSON.parse(content) : content;

          // 마이그레이션: 기존 string 데이터를 ListItem[] 형태로 변환
          const migrateList = (field: unknown): ListItem[] => {
            if (Array.isArray(field)) return field as ListItem[];
            if (typeof field === 'string' && field.trim() !== '') {
              return field.split('\n').map((text, idx) => ({
                id: `migrated-${idx}-${Date.now()}`,
                text: text.trim(),
              }));
            }
            return [];
          };

          const newData = {
            ...initialData,
            ...parsed,
            experience: migrateList(parsed.experience),
            services: migrateList(parsed.services),
            clients: migrateList(parsed.clients),
          };

          setData(newData);
          setOriginalData(newData); // 👈 원본 데이터 설정
        } catch (e) {
          console.log('데이터 로드 실패 또는 구버전 데이터', e);
          // 구버전 텍스트 데이터가 있다면 description으로 간주
          if (typeof configData.content === 'string') {
            const newData = { ...initialData, description: configData.content };
            setData(newData);
            setOriginalData(newData); // 👈 원본 데이터 설정
          }
        }
      }
      setLoading(false);
    };

    fetchStudioContent();
  }, []);

  // 2. 일반 필드 핸들러
  const handleChange = (field: keyof StudioData, value: string) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  // 3. 리스트 필드 핸들러
  const handleListChange = (field: 'experience' | 'services' | 'clients', items: ListItem[]) => {
    setData((prev) => ({ ...prev, [field]: items }));
  };

  // 4. 저장 함수
  const handleUpdateStudio = async () => {
    setLoading(true);

    // jsonb 컬럼이므로 객체 자체를 전달 (JSON.stringify 제거)
    // 만약 에러가 발생하면 Supabase 설정이나 버전에 따라 stringify가 필요할 수도 있음.
    // 하지만 일반적인 jsonb 타입은 객체를 그대로 보냅니다.
    const contentPayload = data;

    const { error } = await supabase.from('config').update({ content: contentPayload }).eq('id', 'about');

    if (error) {
      console.error(error);
      alert('Error occurred: ' + error.message);
    } else {
      alert('Saved successfully.');
      setOriginalData(data); // 👈 저장 성공 시 원본 데이터 갱신
    }
    setLoading(false);
  };

  return (
    <Card className="mb-8 border-stone-800 bg-stone-900 p-4 shadow-lg md:p-6">
      <CardHeader className="mb-6 p-0">
        <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
          <div>
            <CardTitle className="text-xl text-stone-100">Edit Studio Page</CardTitle>
            <CardDescription className="text-stone-400">
              Edit the introduction and detailed information of the website.
            </CardDescription>
          </div>
          <Link
            href="/studio"
            target="_blank"
            className="flex items-center gap-1 rounded-full bg-stone-800 px-3 py-1.5 text-xs text-stone-500 transition-colors hover:text-stone-300">
            View Page <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 p-0">
        {/* 이미지 URL (ImageUploader로 대체) */}
        <div className="space-y-2">
          <ImageUploader
            label="Main Image (Studio Page)"
            value={data.imageUrl}
            onChange={(url) => handleChange('imageUrl', url)}
            folderPath="about" // about 폴더에 저장
            disabled={loading}
          />
          <div className="flex items-center gap-2">
            <Label className="shrink-0 text-xs text-stone-500">Direct Input:</Label>
            <Input
              value={data.imageUrl}
              onChange={(e) => handleChange('imageUrl', e.target.value)}
              disabled={loading}
              placeholder="Or enter image URL directly"
              className="h-8 border-stone-800 bg-stone-950 text-xs text-stone-400"
            />
          </div>
        </div>

        {/* 메인 설명 */}
        <div className="space-y-2">
          <Label className="text-stone-300">Main Description</Label>
          <Textarea
            rows={6}
            value={data.description}
            onChange={(e) => handleChange('description', e.target.value)}
            disabled={loading}
            placeholder="Enter studio description."
            className="border-stone-800 bg-stone-950 text-stone-200"
          />
        </div>

        {/* 리스트 편집 영역 (3열) */}
        <div className="grid grid-cols-1 gap-6 border-t border-stone-800 pt-4 md:grid-cols-3">
          <SortableSection
            title="Experience"
            items={data.experience}
            onItemsChange={(items) => handleListChange('experience', items)}
          />
          <SortableSection
            title="Services"
            items={data.services}
            onItemsChange={(items) => handleListChange('services', items)}
          />
          <SortableSection
            title="Clients"
            items={data.clients}
            onItemsChange={(items) => handleListChange('clients', items)}
          />
        </div>

        {/* 일반 텍스트 영역 (Address, Contact, Social) */}
        <div className="grid grid-cols-1 gap-6 border-t border-stone-800 pt-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label className="text-stone-300">Address</Label>
            <Textarea
              rows={4}
              value={data.address}
              onChange={(e) => handleChange('address', e.target.value)}
              className="border-stone-800 bg-stone-950 text-stone-200"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-stone-300">Contact</Label>
            <Textarea
              rows={4}
              value={data.contact}
              onChange={(e) => handleChange('contact', e.target.value)}
              className="border-stone-800 bg-stone-950 text-stone-200"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-stone-300">Social</Label>
            <Textarea
              rows={4}
              value={data.social}
              onChange={(e) => handleChange('social', e.target.value)}
              className="border-stone-800 bg-stone-950 text-stone-200"
            />
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button
            onClick={handleUpdateStudio}
            disabled={loading || !isChanged} // 👈 변경 사항이 없으면 비활성화
            className="w-full bg-stone-100 text-stone-900 hover:bg-stone-200 disabled:cursor-not-allowed disabled:opacity-50 md:w-auto">
            {loading ? 'Saving...' : isChanged ? 'Save All Changes' : 'No Changes'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
