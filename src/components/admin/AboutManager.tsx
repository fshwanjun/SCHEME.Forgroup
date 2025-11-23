"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ExternalLink, GripVertical, Plus, Trash2 } from "lucide-react";
import ImageUploader from "./ImageUploader";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// 리스트 아이템 타입 정의
interface ListItem {
  id: string;
  text: string;
}

// JSON 데이터 구조 정의
interface AboutData {
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
const initialData: AboutData = {
  imageUrl: "/images/dummy/studio.jpg",
  description: "",
  experience: [],
  services: [],
  clients: [],
  address: "",
  contact: "",
  social: "",
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
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 mb-2 group"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-stone-500 hover:text-stone-300 p-1 rounded hover:bg-stone-800"
        title="드래그하여 순서 변경"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <Input
        value={item.text}
        onChange={(e) => onChange(item.id, e.target.value)}
        className="bg-stone-950 border-stone-800 text-stone-200 h-9"
      />
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onRemove(item.id)}
        className="text-stone-500 hover:text-red-400 hover:bg-stone-800 h-9 w-9 shrink-0"
        title="삭제"
      >
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
    })
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
      text: "",
    };
    onItemsChange([...items, newItem]);
  };

  const handleRemoveItem = (id: string) => {
    onItemsChange(items.filter((item) => item.id !== id));
  };

  const handleChangeItem = (id: string, text: string) => {
    onItemsChange(
      items.map((item) => (item.id === id ? { ...item, text } : item))
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-stone-300">{title}</Label>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleAddItem}
          className="h-6 px-2 text-xs text-stone-400 hover:text-stone-200 hover:bg-stone-800"
        >
          <Plus className="h-3 w-3 mr-1" /> 추가
        </Button>
      </div>
      <div className="bg-stone-900/50 border border-stone-800 rounded-md p-2 min-h-[100px]">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={items} strategy={verticalListSortingStrategy}>
            {items.length === 0 ? (
              <div className="text-center text-xs text-stone-600 py-8">
                항목을 추가해주세요.
              </div>
            ) : (
              items.map((item) => (
                <SortableItem
                  key={item.id}
                  item={item}
                  onRemove={handleRemoveItem}
                  onChange={handleChangeItem}
                />
              ))
            )}
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}

// --- Main Component ---
export default function AboutManager() {
  const [data, setData] = useState<AboutData>(initialData);
  const [originalData, setOriginalData] = useState<AboutData>(initialData); // 👈 초기 데이터 저장
  const [loading, setLoading] = useState(false);

  // 변경 사항 여부 확인 (JSON 문자열 비교)
  const isChanged = JSON.stringify(data) !== JSON.stringify(originalData);

  // 1. About 내용 불러오기
  useEffect(() => {
    const fetchAboutContent = async () => {
      setLoading(true);
      const { data: configData } = await supabase
        .from("config")
        .select("content")
        .eq("id", "about")
        .single();

      if (configData?.content) {
        try {
          // jsonb 타입이므로 이미 객체로 반환될 수 있음
          const content = configData.content;
          const parsed =
            typeof content === "string" ? JSON.parse(content) : content;

          // 마이그레이션: 기존 string 데이터를 ListItem[] 형태로 변환
          const migrateList = (field: any): ListItem[] => {
            if (Array.isArray(field)) return field;
            if (typeof field === "string" && field.trim() !== "") {
              return field.split("\n").map((text, idx) => ({
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
          console.log("데이터 로드 실패 또는 구버전 데이터", e);
          // 구버전 텍스트 데이터가 있다면 description으로 간주
          if (typeof configData.content === "string") {
            const newData = { ...initialData, description: configData.content };
            setData(newData);
            setOriginalData(newData); // 👈 원본 데이터 설정
          }
        }
      }
      setLoading(false);
    };

    fetchAboutContent();
  }, []);

  // 2. 일반 필드 핸들러
  const handleChange = (field: keyof AboutData, value: string) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  // 3. 리스트 필드 핸들러
  const handleListChange = (
    field: "experience" | "services" | "clients",
    items: ListItem[]
  ) => {
    setData((prev) => ({ ...prev, [field]: items }));
  };

  // 4. 저장 함수
  const handleUpdateAbout = async () => {
    setLoading(true);

    // jsonb 컬럼이므로 객체 자체를 전달 (JSON.stringify 제거)
    // 만약 에러가 발생하면 Supabase 설정이나 버전에 따라 stringify가 필요할 수도 있음.
    // 하지만 일반적인 jsonb 타입은 객체를 그대로 보냅니다.
    const contentPayload = data;

    const { error } = await supabase
      .from("config")
      .update({ content: contentPayload })
      .eq("id", "about");

    if (error) {
      console.error(error);
      alert("에러 발생: " + error.message);
    } else {
      alert("저장되었습니다.");
      setOriginalData(data); // 👈 저장 성공 시 원본 데이터 갱신
    }
    setLoading(false);
  };

  return (
    <Card className="p-4 md:p-6 mb-8 bg-stone-900 border-stone-800 shadow-lg">
      <CardHeader className="p-0 mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <CardTitle className="text-xl text-stone-100">
              About 페이지 편집
            </CardTitle>
            <CardDescription className="text-stone-400">
              웹사이트의 소개말과 상세 정보를 수정합니다.
            </CardDescription>
          </div>
          <Link
            href="/about"
            target="_blank"
            className="flex items-center gap-1 text-xs text-stone-500 hover:text-stone-300 transition-colors bg-stone-800 px-3 py-1.5 rounded-full"
          >
            페이지 보기 <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="p-0 space-y-6">
        {/* 이미지 URL (ImageUploader로 대체) */}
        <div className="space-y-2">
          <ImageUploader
            label="메인 이미지 (About Page)"
            value={data.imageUrl}
            onChange={(url) => handleChange("imageUrl", url)}
            folderPath="about" // about 폴더에 저장
            disabled={loading}
          />
          <div className="flex gap-2 items-center">
            <Label className="text-xs text-stone-500 shrink-0">
              직접 입력:
            </Label>
            <Input
              value={data.imageUrl}
              onChange={(e) => handleChange("imageUrl", e.target.value)}
              disabled={loading}
              placeholder="또는 이미지 URL을 직접 입력하세요"
              className="h-8 text-xs bg-stone-950 border-stone-800 text-stone-400"
            />
          </div>
        </div>

        {/* 메인 설명 */}
        <div className="space-y-2">
          <Label className="text-stone-300">메인 소개글 (Description)</Label>
          <Textarea
            rows={6}
            value={data.description}
            onChange={(e) => handleChange("description", e.target.value)}
            disabled={loading}
            placeholder="스튜디오 소개글을 입력하세요."
            className="bg-stone-950 border-stone-800 text-stone-200"
          />
        </div>

        {/* 리스트 편집 영역 (3열) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-stone-800">
          <SortableSection
            title="Experience"
            items={data.experience}
            onItemsChange={(items) => handleListChange("experience", items)}
          />
          <SortableSection
            title="Services"
            items={data.services}
            onItemsChange={(items) => handleListChange("services", items)}
          />
          <SortableSection
            title="Clients"
            items={data.clients}
            onItemsChange={(items) => handleListChange("clients", items)}
          />
        </div>

        {/* 일반 텍스트 영역 (Address, Contact, Social) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-stone-800">
          <div className="space-y-2">
            <Label className="text-stone-300">Address</Label>
            <Textarea
              rows={4}
              value={data.address}
              onChange={(e) => handleChange("address", e.target.value)}
              className="bg-stone-950 border-stone-800 text-stone-200"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-stone-300">Contact</Label>
            <Textarea
              rows={4}
              value={data.contact}
              onChange={(e) => handleChange("contact", e.target.value)}
              className="bg-stone-950 border-stone-800 text-stone-200"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-stone-300">Social</Label>
            <Textarea
              rows={4}
              value={data.social}
              onChange={(e) => handleChange("social", e.target.value)}
              className="bg-stone-950 border-stone-800 text-stone-200"
            />
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button
            onClick={handleUpdateAbout}
            disabled={loading || !isChanged} // 👈 변경 사항이 없으면 비활성화
            className="bg-stone-100 text-stone-900 hover:bg-stone-200 w-full md:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading
              ? "저장 중..."
              : isChanged
              ? "모든 변경사항 저장"
              : "변경사항 없음"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
