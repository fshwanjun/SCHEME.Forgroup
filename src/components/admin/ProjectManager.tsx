"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase"; // 새로 내보낸 함수를 가져옵니다.
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ArrowLeft,
  Trash2,
  Edit,
  Loader2,
  ExternalLink,
  Plus,
  LayoutGrid,
  List as ListIcon,
  GripVertical,
  Save,
} from "lucide-react";
import ImageUploader from "./ImageUploader";
import SortableImageList, { DetailImage } from "./SortableImageList";
import Link from "next/link";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// 프로젝트 상태 타입 정의
type ProjectStatus = "ready" | "published" | "hidden";

// 프로젝트 컨텐츠 데이터 인터페이스
interface ProjectContent {
  project: string;
  year: number;
  client: string;
  services: string;
  product: string;
  keyword: string[];
  challenge: string;
  thumbnail43: string;
  thumbnail34: string;
  detailImages: DetailImage[];
}

const defaultContent: ProjectContent = {
  project: "",
  year: new Date().getFullYear(),
  client: "",
  services: "",
  product: "",
  keyword: [],
  challenge: "",
  thumbnail43: "",
  thumbnail34: "",
  detailImages: [],
};

// 프로젝트 데이터 인터페이스 정의 (타입스크립트)
interface Project {
  id: number;
  title: string;
  description: string;
  created_at: string;
  slug: string;
  status: ProjectStatus;
  display_order: number;
  updated_at?: string;
  contents?: ProjectContent; // 👈 jsonb 열 추가
}

// --- Sortable Project Item (List View) ---
function SortableProjectItem({
  project,
  onEdit,
  onDelete,
  onStatusChange,
}: {
  project: Project;
  onEdit: (project: Project) => void;
  onDelete: (id: number) => void;
  onStatusChange: (id: number, status: ProjectStatus) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: project.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const statusColors: Record<ProjectStatus, string> = {
    ready: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    published: "bg-green-500/20 text-green-400 border-green-500/30",
    hidden: "bg-red-900/20 text-red-400 border-red-900/30",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => onEdit(project)}
      className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 bg-stone-900 border border-stone-800 rounded-lg group hover:border-stone-600 transition-colors cursor-pointer"
    >
      <div className="flex items-start sm:items-center gap-3 w-full sm:w-auto flex-1">
        <button
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          className="cursor-grab active:cursor-grabbing text-stone-500 hover:text-stone-300 p-1 rounded hover:bg-stone-800 shrink-0 mt-0.5 sm:mt-0"
        >
          <GripVertical className="h-5 w-5" />
        </button>
        <div className="flex-1 flex flex-col justify-between min-w-0">
          <div className="flex flex-row items-center gap-2 mb-1">
            <h4 className="text-stone-200 font-medium truncate">
              {project.title}
            </h4>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono text-stone-500 bg-stone-800 px-1.5 py-0.5 rounded">
              /{project.slug}
            </span>
            <span className="text-xs text-stone-600">
              {project.updated_at
                ? `${new Date(project.updated_at).toLocaleDateString(
                    "ko-KR"
                  )} (수정됨)`
                : new Date(project.created_at).toLocaleDateString("ko-KR")}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto pl-9 sm:pl-0">
        <div onClick={(e) => e.stopPropagation()}>
          <Select
            value={project.status}
            onValueChange={(value) =>
              onStatusChange(project.id, value as ProjectStatus)
            }
          >
            <SelectTrigger
              className={`h-6 text-[10px] uppercase tracking-wider px-2 w-[90px] sm:w-[100px] border ${
                statusColors[project.status] || statusColors.ready
              }`}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-stone-900 border-stone-800 text-stone-200">
              <SelectItem value="ready" className="text-xs">
                Ready
              </SelectItem>
              <SelectItem value="published" className="text-xs">
                Published
              </SelectItem>
              <SelectItem value="hidden" className="text-xs">
                Hidden
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1">
          <Link
            href={`/project/${project.slug}`}
            target="_blank"
            onClick={(e) => e.stopPropagation()}
            className="p-2 text-stone-500 hover:text-stone-200 hover:bg-stone-800 rounded-md"
            title="새 탭에서 보기"
          >
            <ExternalLink className="h-4 w-4" />
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(project);
            }}
            className="text-stone-500 hover:text-stone-200 hover:bg-stone-800 h-9 w-9"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(project.id);
            }}
            className="text-stone-500 hover:text-red-400 hover:bg-stone-800 h-9 w-9"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ProjectManager() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [slug, setSlug] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("ready");
  const [contentData, setContentData] =
    useState<ProjectContent>(defaultContent); // 👈 컨텐츠 데이터 State
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"card" | "list">("list");
  const [isOrderChanged, setIsOrderChanged] = useState(false); // 👈 순서 변경 여부

  // 상태 변수
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // 스크롤 이동 함수
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // 드래그 앤 드롭 센서
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 1. 프로젝트 목록 불러오기 (Read)
  useEffect(() => {
    const fetchProjects = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("project")
        .select("*")
        .order("display_order", { ascending: true }) // 👈 display_order 기준 정렬
        .order("created_at", { ascending: false });

      if (error) {
        console.error("프로젝트 로드 에러:", error);
      } else {
        setProjects((data as Project[]) || []);
        setIsOrderChanged(false); // 로드 시 변경 상태 초기화
      }
      setLoading(false);
    };

    fetchProjects();
  }, [refreshTrigger]);

  // 2. 수정 모드 진입 (데이터 채우기)
  const handleEdit = (project: Project) => {
    setTitle(project.title);
    setDescription(project.description);
    setSlug(project.slug);
    setStatus(project.status || "ready");

    // 컨텐츠 데이터 로드
    if (project.contents) {
      setContentData({ ...defaultContent, ...project.contents });
    } else {
      setContentData(defaultContent);
    }

    setEditingId(project.id);
    setIsEditing(true);
    setIsDialogOpen(true);
  };

  // 2-1. 새 프로젝트 모드 진입
  const handleCreateNew = () => {
    setTitle("");
    setDescription("");
    setSlug("");
    setStatus("ready");
    setContentData(defaultContent); // 👈 초기화
    setEditingId(null);
    setIsEditing(false);
    setIsDialogOpen(true);
  };

  // 컨텐츠 필드 핸들러
  const handleContentChange = (field: keyof ProjectContent, value: any) => {
    setContentData((prev) => ({ ...prev, [field]: value }));
  };

  // 3. 프로젝트 저장 또는 수정 (Create / Update)
  const handleSave = async () => {
    if (!title || !description || !slug)
      return alert("제목, 내용, 슬러그를 모두 입력해주세요!");

    if (slug.includes(" ") || slug !== encodeURIComponent(slug)) {
      return alert(
        "슬러그는 공백이나 특수문자를 포함할 수 없습니다. 영문, 숫자, 하이픈(-)만 권장합니다."
      );
    }

    setLoading(true);

    let error = null;
    // display_order는 신규 생성 시 가장 마지막 순서(큰 값)로 설정하면 좋음 (간단히 0 또는 max+1)
    const maxOrder =
      projects.length > 0
        ? Math.max(...projects.map((p) => p.display_order || 0))
        : 0;

    const payload = {
      title,
      description,
      slug,
      status,
      display_order: isEditing ? undefined : maxOrder + 1,
      contents: contentData, // 👈 컨텐츠 데이터 저장
    };

    if (isEditing && editingId) {
      const { error: updateError } = await supabase
        .from("project")
        .update({
          title,
          description,
          slug,
          status,
          contents: contentData, // 👈 컨텐츠 데이터 업데이트
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingId);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from("project")
        .insert([payload]);
      error = insertError;
    }

    if (error) {
      console.error(error);
      if (error.code === "23505") {
        alert("🚨 슬러그가 이미 존재합니다. 다른 슬러그를 사용해주세요.");
      } else {
        alert("처리 중 에러 발생: " + error.message);
      }
    } else {
      setTitle("");
      setDescription("");
      setSlug("");
      setStatus("ready");
      setIsEditing(false);
      setEditingId(null);
      setIsDialogOpen(false);
      setRefreshTrigger((prev) => prev + 1);
    }
    setLoading(false);
  };

  // 4. 프로젝트 삭제 (Delete)
  const handleDelete = async (id: number) => {
    if (!confirm("정말로 이 프로젝트를 삭제하시겠습니까?")) return;
    setLoading(true);
    const { error } = await supabase.from("project").delete().eq("id", id);
    if (error) {
      console.error("삭제 에러:", error);
      alert("프로젝트 삭제에 실패했습니다.");
    } else {
      setRefreshTrigger((prev) => prev + 1);
      alert("프로젝트가 성공적으로 삭제되었습니다.");
    }
    setLoading(false);
  };

  // 5. 수정 취소 (다이얼로그 닫기)
  const handleCancel = () => {
    setTitle("");
    setDescription("");
    setSlug("");
    setStatus("ready");
    setContentData(defaultContent); // 👈 초기화
    setIsEditing(false);
    setEditingId(null);
    setIsDialogOpen(false);
  };

  // 6. 순서 변경 (드래그 종료)
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setProjects((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
      setIsOrderChanged(true); // 👈 순서 변경됨 표시
    }
  };

  // 7. 순서 저장 로직
  const handleSaveOrder = async () => {
    if (!isOrderChanged) return;
    if (!confirm("변경된 순서를 저장하시겠습니까?")) return;

    setLoading(true);

    // 모든 프로젝트의 순서를 업데이트 (Batch Update 권장하지만, 여기선 반복문으로 간단히 구현)
    // Supabase의 rpc를 사용하거나 upsert를 사용하면 더 효율적입니다.
    const updates = projects.map((project, index) => ({
      id: project.id,
      title: project.title, // required for upsert if not using partial
      display_order: index + 1,
    }));

    // upsert를 사용하여 일괄 업데이트 시도 (PK인 id 기준으로 업데이트됨)
    // 주의: 다른 컬럼 데이터가 덮어씌워지지 않도록 주의. 여기서는 display_order만 업데이트하는 것이 안전.
    // 하지만 upsert는 모든 필수 컬럼을 요구할 수 있으므로, 가장 안전한 방법은 loop update입니다.
    // 데이터 양이 많지 않으므로 Promise.all로 처리합니다.

    const promises = projects.map((project, index) =>
      supabase
        .from("project")
        .update({ display_order: index + 1 })
        .eq("id", project.id)
    );

    try {
      await Promise.all(promises);
      setIsOrderChanged(false);
      alert("순서가 저장되었습니다.");
    } catch (error) {
      console.error("순서 저장 에러:", error);
      alert("순서 저장 중 문제가 발생했습니다.");
    }

    setLoading(false);
  };

  const statusColors: Record<ProjectStatus, string> = {
    ready: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    published: "bg-green-500/20 text-green-400 border-green-500/30",
    hidden: "bg-red-900/20 text-red-400 border-red-900/30",
  };

  // 8. 상태 변경 핸들러 (리스트 뷰에서 직접 변경)
  const handleStatusChange = async (id: number, newStatus: ProjectStatus) => {
    // 낙관적 업데이트 (UI 먼저 반영)
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: newStatus } : p))
    );

    setIsOrderChanged(true); // 👈 상태 변경 시 저장 버튼 활성화

    const { error } = await supabase
      .from("project")
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(), // 👈 수정 시간 업데이트
      })
      .eq("id", id);

    if (error) {
      console.error("상태 변경 에러:", error);
      alert("상태 변경에 실패했습니다.");
      setRefreshTrigger((prev) => prev + 1); // 실패 시 롤백을 위해 새로고침
    }
  };

  return (
    <div className="relative">
      {/* ===== 입력/수정 폼 (List를 대체하여 표시) ===== */}
      {isDialogOpen ? (
        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCancel}
              className="text-stone-400 hover:text-stone-100"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h3 className="text-xl font-semibold text-stone-100">
                {isEditing ? "프로젝트 수정" : "새 프로젝트 등록"}
              </h3>
              <p className="text-sm text-stone-400">
                {isEditing
                  ? "기존 프로젝트 내용을 수정합니다."
                  : "새로운 프로젝트를 추가합니다."}
              </p>
            </div>
          </div>

          <Card className="bg-stone-900 border-stone-800">
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-stone-300">
                    제목
                  </Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    disabled={loading}
                    placeholder="프로젝트 제목"
                    className="bg-stone-950 border-stone-800 text-stone-200"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-stone-300">상태 (Status)</Label>
                  <Select
                    value={status}
                    onValueChange={(value) => setStatus(value as ProjectStatus)}
                    disabled={loading}
                  >
                    <SelectTrigger className="bg-stone-950 border-stone-800 text-stone-200">
                      <SelectValue placeholder="상태 선택" />
                    </SelectTrigger>
                    <SelectContent className="bg-stone-900 border-stone-800 text-stone-200">
                      <SelectItem value="ready">Ready (준비 중)</SelectItem>
                      <SelectItem value="published">
                        Published (공개)
                      </SelectItem>
                      <SelectItem value="hidden">Hidden (숨김)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug" className="text-stone-300">
                  프로젝트 슬러그 (URL 경로)
                </Label>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  disabled={loading}
                  placeholder="예: my-first-project"
                  className="bg-stone-950 border-stone-800 text-stone-200"
                />
                <p className="text-xs text-stone-500">
                  URL에 사용됩니다. 영문, 숫자, 하이픈(-)만 사용하세요.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-stone-300">
                  간단 설명 (Summary)
                </Label>
                <Textarea
                  id="description"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={loading}
                  placeholder="프로젝트 목록에 표시될 간단한 설명을 입력하세요"
                  className="bg-stone-950 border-stone-800 text-stone-200 resize-none"
                />
              </div>

              {/* ===== 상세 컨텐츠 정보 (JSONB) ===== */}
              <div className="space-y-4 pt-4 border-t border-stone-800">
                <h4 className="text-lg font-medium text-stone-200">
                  썸네일 이미지 (Thumbnails)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <ImageUploader
                      label="가로형 썸네일 (4:3)"
                      value={contentData.thumbnail43}
                      onChange={(url) =>
                        handleContentChange("thumbnail43", url)
                      }
                      bucketName="images"
                      folderPath="projects/thumbnails/4x3"
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <ImageUploader
                      label="세로형 썸네일 (3:4)"
                      value={contentData.thumbnail34}
                      onChange={(url) =>
                        handleContentChange("thumbnail34", url)
                      }
                      bucketName="images"
                      folderPath="projects/thumbnails/3x4"
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>

              {/* ===== 상세 이미지 관리 섹션 (순서 변경 가능) ===== */}
              <div className="space-y-4 pt-4 border-t border-stone-800">
                <SortableImageList
                  images={contentData.detailImages || []}
                  onImagesChange={(images) =>
                    handleContentChange("detailImages", images)
                  }
                  folderPath="projects/details"
                />
              </div>

              {/* ===== 상세 컨텐츠 정보 (JSONB) ===== */}
              <div className="space-y-4 pt-4 border-t border-stone-800">
                <h4 className="text-lg font-medium text-stone-200">
                  상세 정보 (Contents)
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-stone-300">Project Name</Label>
                    <Input
                      value={contentData.project}
                      onChange={(e) =>
                        handleContentChange("project", e.target.value)
                      }
                      className="bg-stone-950 border-stone-800 text-stone-200"
                      placeholder="프로젝트 명칭"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-stone-300">Year</Label>
                    <Input
                      type="number"
                      value={contentData.year}
                      onChange={(e) =>
                        handleContentChange("year", parseInt(e.target.value))
                      }
                      className="bg-stone-950 border-stone-800 text-stone-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-stone-300">Client</Label>
                    <Input
                      value={contentData.client}
                      onChange={(e) =>
                        handleContentChange("client", e.target.value)
                      }
                      className="bg-stone-950 border-stone-800 text-stone-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-stone-300">Services</Label>
                    <Input
                      value={contentData.services}
                      onChange={(e) =>
                        handleContentChange("services", e.target.value)
                      }
                      className="bg-stone-950 border-stone-800 text-stone-200"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-stone-300">Product</Label>
                  <Input
                    value={contentData.product}
                    onChange={(e) =>
                      handleContentChange("product", e.target.value)
                    }
                    className="bg-stone-950 border-stone-800 text-stone-200"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-stone-300">
                    Keywords (쉼표로 구분)
                  </Label>
                  <Input
                    value={contentData.keyword.join(", ")}
                    onChange={(e) =>
                      handleContentChange(
                        "keyword",
                        e.target.value.split(",").map((k) => k.trim())
                      )
                    }
                    className="bg-stone-950 border-stone-800 text-stone-200"
                    placeholder="예: Branding, UI/UX, Web Design"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-stone-300">
                    Challenge (Long Text)
                  </Label>
                  <Textarea
                    rows={6}
                    value={contentData.challenge}
                    onChange={(e) =>
                      handleContentChange("challenge", e.target.value)
                    }
                    className="bg-stone-950 border-stone-800 text-stone-200"
                    placeholder="프로젝트의 도전 과제 및 상세 설명을 입력하세요"
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-3 p-6 border-t border-stone-800">
              <Button
                variant="outline"
                onClick={handleCancel}
                className="border-stone-700 text-stone-400 hover:text-stone-200 hover:bg-stone-800 hover:border-stone-600"
              >
                취소
              </Button>
              <Button
                onClick={handleSave}
                disabled={loading}
                className="bg-stone-100 text-stone-900 hover:bg-stone-200"
              >
                {loading ? "저장 중..." : isEditing ? "수정하기" : "등록하기"}
              </Button>
            </CardFooter>
          </Card>
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
          {/* ===== 상단 액션 바 ===== */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start">
              <h3 className="text-xl font-semibold text-stone-200">
                등록된 프로젝트 목록{" "}
                <span className="text-stone-500 text-sm ml-2">
                  ({projects.length}개)
                </span>
              </h3>
              {/* 뷰 모드 토글 버튼 */}
              <div className="flex items-center bg-stone-900 rounded-md p-1 border border-stone-800">
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-1.5 rounded transition-colors ${
                    viewMode === "list"
                      ? "bg-stone-800 text-stone-100 shadow-sm"
                      : "text-stone-500 hover:text-stone-300"
                  }`}
                  title="리스트 뷰 (순서 변경 가능)"
                >
                  <ListIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode("card")}
                  className={`p-1.5 rounded transition-colors ${
                    viewMode === "card"
                      ? "bg-stone-800 text-stone-100 shadow-sm"
                      : "text-stone-500 hover:text-stone-300"
                  }`}
                  title="카드 뷰"
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex gap-2 items-center w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
              {/* 순서 저장 버튼 (순서 변경 시에만 활성화) */}
              {isOrderChanged && (
                <Button
                  onClick={handleSaveOrder}
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 text-white animate-in fade-in zoom-in duration-200 shrink-0"
                >
                  <Save className="h-4 w-4 mr-2" /> 저장
                </Button>
              )}

              <Link href="/project" target="_blank" className="shrink-0">
                <Button
                  variant="outline"
                  className="gap-2 bg-stone-800 text-stone-200 border-stone-700 hover:bg-stone-200 hover:text-stone-900 hover:border-stone-600"
                >
                  전체 보기 <ExternalLink className="h-4 w-4" />
                </Button>
              </Link>
              <Button
                variant="outline"
                onClick={handleCreateNew}
                className="gap-2 bg-stone-800 text-stone-200 border-stone-700 hover:bg-stone-200 hover:text-stone-900 hover:border-stone-600 shrink-0"
              >
                <Plus className="h-4 w-4" /> 새 프로젝트
              </Button>
            </div>
          </div>

          {/* ===== 프로젝트 목록 (Read) ===== */}
          {loading && !projects.length ? (
            <div className="text-center p-12 text-stone-500 border border-dashed border-stone-800 rounded-lg">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 opacity-50" />
              프로젝트를 불러오는 중입니다...
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center p-12 text-stone-500 border border-dashed border-stone-800 rounded-lg bg-stone-900/50">
              등록된 프로젝트가 없습니다. 새 프로젝트 버튼을 눌러 추가해보세요.
            </div>
          ) : viewMode === "list" ? (
            /* === 리스트 뷰 (순서 변경 가능) === */
            <div className="space-y-2">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={projects.map((p) => p.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {projects.map((project) => (
                    <SortableProjectItem
                      key={project.id}
                      project={project}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onStatusChange={handleStatusChange}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </div>
          ) : (
            /* === 카드 뷰 (기존 그리드) === */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((item) => (
                <Card
                  key={item.id}
                  onClick={() => handleEdit(item)}
                  className={`p-5 transition-all bg-stone-900 border-stone-800 shadow-sm hover:shadow-md hover:border-stone-600 flex flex-col h-full cursor-pointer`}
                >
                  <div className="flex-1 mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <CardTitle className="text-lg truncate text-stone-200">
                        {item.title}
                      </CardTitle>
                      <span
                        className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                          statusColors[item.status] || statusColors.ready
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mb-3">
                      <span className="px-2 py-0.5 rounded bg-stone-800 text-stone-400 text-xs font-mono border border-stone-700">
                        /{item.slug}
                      </span>
                      <Link
                        href={`/project/${item.slug}`}
                        target="_blank"
                        onClick={(e) => e.stopPropagation()}
                        className="text-stone-600 hover:text-stone-300 transition-colors"
                        title="새 탭에서 보기"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                    <CardDescription className="line-clamp-3 text-stone-400">
                      {item.description}
                    </CardDescription>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-stone-800">
                    <span className="text-xs text-stone-600">
                      {item.updated_at
                        ? `${new Date(item.updated_at).toLocaleDateString(
                            "ko-KR"
                          )} (수정됨)`
                        : new Date(item.created_at).toLocaleDateString("ko-KR")}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(item);
                        }}
                        title="수정"
                        className="h-8 w-8 text-stone-500 hover:text-stone-200 hover:bg-stone-800"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(item.id);
                        }}
                        disabled={loading}
                        title="삭제"
                        className="h-8 w-8 text-stone-500 hover:text-red-400 hover:bg-stone-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
