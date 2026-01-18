'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase'; // 새로 내보낸 함수를 가져옵니다.
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardTitle } from '@/components/ui/card';
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
} from 'lucide-react';
import ImageUploader from './ImageUploader';
import SortableImageList, { DetailImage } from './SortableImageList';
import Image from 'next/image';
import Link from 'next/link';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// 프로젝트 상태 타입 정의
type ProjectStatus = 'ready' | 'published' | 'hidden';

// 폰트 두께 타입 정의
type FontWeight = 'book' | 'regular' | 'medium' | 'bold';

// 프로젝트 컨텐츠 데이터 인터페이스
interface ProjectContent {
  project: string;
  year: string;
  client: string;
  services: string;
  product: string;
  keyword: string;
  challenge: string;
  thumbnail43: string;
  thumbnail34: string;
  detailImages: DetailImage[];
  // 하단 4단 타이틀
  projectTitle: string;
  yearTitle: string;
  clientTitle: string;
  servicesTitle: string;
  // 상세 정보 타이틀
  productTitle: string;
  keywordTitle: string;
  challengeTitle: string;
  // 하단 4단 가시성 토글 (Title / Value 분리)
  projectTitleVisible: boolean;
  projectValueVisible: boolean;
  yearTitleVisible: boolean;
  yearValueVisible: boolean;
  clientTitleVisible: boolean;
  clientValueVisible: boolean;
  servicesTitleVisible: boolean;
  servicesValueVisible: boolean;
  // 상세 정보 가시성 토글 (Title / Value 분리)
  productTitleVisible: boolean;
  productValueVisible: boolean;
  keywordTitleVisible: boolean;
  keywordValueVisible: boolean;
  challengeTitleVisible: boolean;
  challengeValueVisible: boolean;
  // 하단 4단 폰트 두께 (Title / Value 분리)
  projectTitleFontWeight: FontWeight;
  projectValueFontWeight: FontWeight;
  yearTitleFontWeight: FontWeight;
  yearValueFontWeight: FontWeight;
  clientTitleFontWeight: FontWeight;
  clientValueFontWeight: FontWeight;
  servicesTitleFontWeight: FontWeight;
  servicesValueFontWeight: FontWeight;
  // 상세 정보 폰트 두께 (Title / Value 분리)
  productTitleFontWeight: FontWeight;
  productValueFontWeight: FontWeight;
  keywordTitleFontWeight: FontWeight;
  keywordValueFontWeight: FontWeight;
  challengeTitleFontWeight: FontWeight;
  challengeValueFontWeight: FontWeight;
}

const defaultContent: ProjectContent = {
  project: '',
  year: String(new Date().getFullYear()),
  client: '',
  services: '',
  product: '',
  keyword: '',
  challenge: '',
  thumbnail43: '',
  thumbnail34: '',
  detailImages: [],
  // 하단 4단 타이틀 기본값
  projectTitle: 'Project',
  yearTitle: 'Year',
  clientTitle: 'Client',
  servicesTitle: 'Services',
  // 상세 정보 타이틀 기본값
  productTitle: 'Product',
  keywordTitle: 'Design Keywords',
  challengeTitle: 'Challenge',
  // 하단 4단 가시성 기본값 (Title / Value 분리)
  projectTitleVisible: true,
  projectValueVisible: true,
  yearTitleVisible: true,
  yearValueVisible: true,
  clientTitleVisible: true,
  clientValueVisible: true,
  servicesTitleVisible: true,
  servicesValueVisible: true,
  // 상세 정보 가시성 기본값 (Title / Value 분리)
  productTitleVisible: true,
  productValueVisible: true,
  keywordTitleVisible: true,
  keywordValueVisible: true,
  challengeTitleVisible: true,
  challengeValueVisible: true,
  // 하단 4단 폰트 두께 기본값 (Title / Value 분리)
  projectTitleFontWeight: 'bold',
  projectValueFontWeight: 'regular',
  yearTitleFontWeight: 'bold',
  yearValueFontWeight: 'regular',
  clientTitleFontWeight: 'bold',
  clientValueFontWeight: 'regular',
  servicesTitleFontWeight: 'bold',
  servicesValueFontWeight: 'regular',
  // 상세 정보 폰트 두께 기본값 (Title / Value 분리)
  productTitleFontWeight: 'bold',
  productValueFontWeight: 'medium',
  keywordTitleFontWeight: 'bold',
  keywordValueFontWeight: 'medium',
  challengeTitleFontWeight: 'bold',
  challengeValueFontWeight: 'regular',
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
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: project.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const statusColors: Record<ProjectStatus, string> = {
    ready: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    published: 'bg-green-500/20 text-green-400 border-green-500/30',
    hidden: 'bg-red-900/20 text-red-400 border-red-900/30',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => onEdit(project)}
      className="group flex cursor-pointer flex-col gap-3 rounded-lg border border-stone-800 bg-stone-900 p-4 transition-colors hover:border-stone-600 sm:flex-row sm:items-center sm:gap-4">
      <div className="flex w-full flex-1 items-start gap-3 sm:w-auto sm:items-center">
        <button
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          className="mt-0.5 shrink-0 cursor-grab rounded p-1 text-stone-500 hover:bg-stone-800 hover:text-stone-300 active:cursor-grabbing sm:mt-0">
          <GripVertical className="h-5 w-5" />
        </button>
        <div className="flex min-w-0 flex-1 flex-col justify-between">
          <div className="mb-1 flex flex-row items-center gap-2">
            <h4 className="truncate font-medium text-stone-200">{project.title}</h4>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded bg-stone-800 px-1.5 py-0.5 font-mono text-xs text-stone-500">/{project.slug}</span>
            <span className="text-xs text-stone-600">
              {project.updated_at
                ? `${new Date(project.updated_at).toLocaleDateString('en-US')} (Edited)`
                : new Date(project.created_at).toLocaleDateString('en-US')}
            </span>
          </div>
        </div>
      </div>

      <div className="flex w-full items-center justify-between gap-3 pl-9 sm:w-auto sm:justify-end sm:pl-0">
        <div onClick={(e) => e.stopPropagation()}>
          <Select value={project.status} onValueChange={(value) => onStatusChange(project.id, value as ProjectStatus)}>
            <SelectTrigger
              className={`h-6 w-[90px] border px-2 text-[10px] tracking-wider uppercase sm:w-[100px] ${
                statusColors[project.status] || statusColors.ready
              }`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-stone-800 bg-stone-900 text-stone-200">
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
            href={`/projects/${project.slug}`}
            target="_blank"
            onClick={(e) => e.stopPropagation()}
            className="rounded-md p-2 text-stone-500 hover:bg-stone-800 hover:text-stone-200"
            title="Open in new tab">
            <ExternalLink className="h-4 w-4" />
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(project);
            }}
            className="h-9 w-9 text-stone-500 hover:bg-stone-800 hover:text-stone-200">
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(project.id);
            }}
            className="h-9 w-9 text-stone-500 hover:bg-stone-800 hover:text-red-400">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ProjectManager() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [slug, setSlug] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('ready');
  const [contentData, setContentData] = useState<ProjectContent>(defaultContent); // 👈 컨텐츠 데이터 State
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'card' | 'list'>('list');
  const [isOrderChanged, setIsOrderChanged] = useState(false); // 👈 순서 변경 여부

  // 상태 변수
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // 드래그 앤 드롭 센서
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // 1. 프로젝트 목록 불러오기 (Read)
  useEffect(() => {
    const fetchProjects = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('project')
        .select('*')
        .order('display_order', { ascending: true }) // 👈 display_order 기준 정렬
        .order('created_at', { ascending: false });

      if (error) {
        // 에러 무시
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
    setStatus(project.status || 'ready');

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
    setTitle('');
    setDescription('');
    setSlug('');
    setStatus('ready');
    setContentData(defaultContent); // 👈 초기화
    setEditingId(null);
    setIsEditing(false);
    setIsDialogOpen(true);
  };

  // 컨텐츠 필드 핸들러
  const handleContentChange = (field: keyof ProjectContent, value: ProjectContent[keyof ProjectContent]) => {
    setContentData((prev) => ({ ...prev, [field]: value }));
  };

  // 3. 프로젝트 저장 또는 수정 (Create / Update)
  const handleSave = async () => {
    if (!title || !slug) return alert('Please enter title and slug!');

    if (slug.includes(' ') || slug !== encodeURIComponent(slug)) {
      return alert(
        'Slug cannot contain spaces or special characters. English letters, numbers, and hyphens (-) are recommended.',
      );
    }

    setLoading(true);

    let error = null;
    // display_order는 신규 생성 시 가장 마지막 순서(큰 값)로 설정하면 좋음 (간단히 0 또는 max+1)
    const maxOrder = projects.length > 0 ? Math.max(...projects.map((p) => p.display_order || 0)) : 0;

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
        .from('project')
        .update({
          title,
          description,
          slug,
          status,
          contents: contentData, // 👈 컨텐츠 데이터 업데이트
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingId);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('project').insert([payload]);
      error = insertError;
    }

    if (error) {
      if (error.code === '23505') {
        alert('🚨 Slug already exists. Please use a different slug.');
      } else {
        alert('Error during processing: ' + error.message);
      }
      setLoading(false);
    } else {
      // 저장 성공 시 새로고침하여 최신 데이터 가져오기
      setRefreshTrigger((prev) => prev + 1);

      // 수정 모드인 경우 편집 화면 유지
      if (isEditing && editingId) {
        // 최신 데이터를 다시 로드하여 편집 폼에 반영
        const { data: updatedProject } = await supabase.from('project').select('*').eq('id', editingId).single();

        if (updatedProject) {
          setTitle(updatedProject.title);
          setDescription(updatedProject.description);
          setSlug(updatedProject.slug);
          setStatus(updatedProject.status || 'ready');

          // 컨텐츠 데이터 업데이트
          if (updatedProject.contents) {
            setContentData({ ...defaultContent, ...updatedProject.contents });
          }
        }

        alert('Project updated successfully.');
      } else {
        // 새 프로젝트 생성 시에는 폼 초기화하고 다이얼로그 닫기
        setTitle('');
        setDescription('');
        setSlug('');
        setStatus('ready');
        setContentData(defaultContent);
        setIsEditing(false);
        setEditingId(null);
        setIsDialogOpen(false);
        alert('Project created successfully.');
      }
      setLoading(false);
    }
  };

  // 4. 프로젝트 삭제 (Delete)
  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this project?')) return;
    setLoading(true);
    const { error } = await supabase.from('project').delete().eq('id', id);
    if (error) {
      alert('Failed to delete project.');
    } else {
      setRefreshTrigger((prev) => prev + 1);
      alert('Project successfully deleted.');
    }
    setLoading(false);
  };

  // 5. 수정 취소 (다이얼로그 닫기)
  const handleCancel = () => {
    setTitle('');
    setDescription('');
    setSlug('');
    setStatus('ready');
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
    if (!confirm('Do you want to save the changed order?')) return;

    setLoading(true);

    // 모든 프로젝트의 순서를 업데이트 (Batch Update 권장하지만, 여기선 반복문으로 간단히 구현)
    // Supabase의 rpc를 사용하거나 upsert를 사용하면 더 효율적입니다.
    // upsert를 사용하여 일괄 업데이트 시도 (PK인 id 기준으로 업데이트됨)
    // 주의: 다른 컬럼 데이터가 덮어씌워지지 않도록 주의. 여기서는 display_order만 업데이트하는 것이 안전.
    // 하지만 upsert는 모든 필수 컬럼을 요구할 수 있으므로, 가장 안전한 방법은 loop update입니다.
    // 데이터 양이 많지 않으므로 Promise.all로 처리합니다.

    const promises = projects.map((project, index) =>
      supabase
        .from('project')
        .update({ display_order: index + 1 })
        .eq('id', project.id),
    );

    try {
      await Promise.all(promises);
      setIsOrderChanged(false);
      alert('Order saved.');
    } catch (error) {
      alert('Problem occurred while saving order.');
    }

    setLoading(false);
  };

  const statusColors: Record<ProjectStatus, string> = {
    ready: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    published: 'bg-green-500/20 text-green-400 border-green-500/30',
    hidden: 'bg-red-900/20 text-red-400 border-red-900/30',
  };

  // 8. 상태 변경 핸들러 (리스트 뷰에서 직접 변경)
  const handleStatusChange = async (id: number, newStatus: ProjectStatus) => {
    // 낙관적 업데이트 (UI 먼저 반영)
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, status: newStatus } : p)));

    setIsOrderChanged(true); // 👈 상태 변경 시 저장 버튼 활성화

    const { error } = await supabase
      .from('project')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(), // 👈 수정 시간 업데이트
      })
      .eq('id', id);

    if (error) {
      alert('Failed to change status.');
      setRefreshTrigger((prev) => prev + 1); // 실패 시 롤백을 위해 새로고침
    }
  };

  return (
    <div className="relative">
      {/* ===== 입력/수정 폼 (List를 대체하여 표시) ===== */}
      {isDialogOpen ? (
        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCancel}
                className="text-stone-400 hover:text-stone-100">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h3 className="text-xl font-semibold text-stone-100">
                  {isEditing ? 'Edit Project' : 'Register New Project'}
                </h3>
                <p className="text-sm text-stone-400">
                  {isEditing ? 'Edit existing project content.' : 'Add a new project.'}
                </p>
              </div>
            </div>
            {isEditing && editingId && slug && (
              <Link href={`/projects/${slug}`} target="_blank">
                <Button
                  variant="outline"
                  className="gap-2 border-stone-700 bg-stone-800 text-stone-200 hover:border-stone-600 hover:bg-stone-200 hover:text-stone-900">
                  View Project <ExternalLink className="h-4 w-4" />
                </Button>
              </Link>
            )}
          </div>

          <Card className="border-stone-800 bg-stone-900">
            <CardContent className="space-y-6 p-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-stone-300">
                    Title
                  </Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    disabled={loading}
                    placeholder="Project Title"
                    className="border-stone-800 bg-stone-950 text-stone-200"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-stone-300">Status</Label>
                  <Select
                    value={status}
                    onValueChange={(value) => setStatus(value as ProjectStatus)}
                    disabled={loading}>
                    <SelectTrigger className="border-stone-800 bg-stone-950 text-stone-200">
                      <SelectValue placeholder="Select Status" />
                    </SelectTrigger>
                    <SelectContent className="border-stone-800 bg-stone-900 text-stone-200">
                      <SelectItem value="ready">Ready</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="hidden">Hidden</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug" className="text-stone-300">
                  Project Slug (URL Path)
                </Label>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  disabled={loading}
                  placeholder="e.g., my-first-project"
                  className="border-stone-800 bg-stone-950 text-stone-200"
                />
                <p className="text-xs text-stone-500">
                  Used in URL. Use only English letters, numbers, and hyphens (-).
                </p>
              </div>

              {/* ===== 하단 4단 정보 (Project, Year, Client, Services) ===== */}
              <div className="space-y-4 border-t border-stone-800 pt-4">
                <h4 className="text-lg font-medium text-stone-200">Bottom Info (4 Columns)</h4>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  {/* Project */}
                  <div className="space-y-2 rounded-lg border border-stone-800 bg-stone-900/50 p-3">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-stone-500">Title</Label>
                        <div className="flex items-center gap-2">
                          <select
                            value={contentData.projectTitleFontWeight}
                            onChange={(e) => handleContentChange('projectTitleFontWeight', e.target.value)}
                            className="h-5 rounded border border-stone-700 bg-stone-800 px-1 text-[10px] text-stone-300">
                            <option value="book">Book</option>
                            <option value="regular">Regular</option>
                            <option value="medium">Medium</option>
                            <option value="bold">Bold</option>
                          </select>
                          <label className="flex cursor-pointer items-center gap-1">
                            <input
                              type="checkbox"
                              checked={contentData.projectTitleVisible}
                              onChange={(e) => handleContentChange('projectTitleVisible', e.target.checked)}
                              className="h-3 w-3 rounded border-stone-600 bg-stone-800 text-blue-500 focus:ring-blue-500"
                            />
                            <span className="text-[10px] text-stone-500">Show</span>
                          </label>
                        </div>
                      </div>
                      <Input
                        value={contentData.projectTitle}
                        onChange={(e) => handleContentChange('projectTitle', e.target.value)}
                        className="h-8 border-stone-800 bg-stone-950 text-sm text-stone-300"
                        placeholder="Project"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-stone-500">Value</Label>
                        <div className="flex items-center gap-2">
                          <select
                            value={contentData.projectValueFontWeight}
                            onChange={(e) => handleContentChange('projectValueFontWeight', e.target.value)}
                            className="h-5 rounded border border-stone-700 bg-stone-800 px-1 text-[10px] text-stone-300">
                            <option value="book">Book</option>
                            <option value="regular">Regular</option>
                            <option value="medium">Medium</option>
                            <option value="bold">Bold</option>
                          </select>
                          <label className="flex cursor-pointer items-center gap-1">
                            <input
                              type="checkbox"
                              checked={contentData.projectValueVisible}
                              onChange={(e) => handleContentChange('projectValueVisible', e.target.checked)}
                              className="h-3 w-3 rounded border-stone-600 bg-stone-800 text-blue-500 focus:ring-blue-500"
                            />
                            <span className="text-[10px] text-stone-500">Show</span>
                          </label>
                        </div>
                      </div>
                      <Textarea
                        rows={3}
                        value={contentData.project}
                        onChange={(e) => handleContentChange('project', e.target.value)}
                        className="border-stone-800 bg-stone-950 text-sm text-stone-200"
                        placeholder="Project Name"
                      />
                    </div>
                  </div>

                  {/* Year */}
                  <div className="space-y-2 rounded-lg border border-stone-800 bg-stone-900/50 p-3">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-stone-500">Title</Label>
                        <div className="flex items-center gap-2">
                          <select
                            value={contentData.yearTitleFontWeight}
                            onChange={(e) => handleContentChange('yearTitleFontWeight', e.target.value)}
                            className="h-5 rounded border border-stone-700 bg-stone-800 px-1 text-[10px] text-stone-300">
                            <option value="book">Book</option>
                            <option value="regular">Regular</option>
                            <option value="medium">Medium</option>
                            <option value="bold">Bold</option>
                          </select>
                          <label className="flex cursor-pointer items-center gap-1">
                            <input
                              type="checkbox"
                              checked={contentData.yearTitleVisible}
                              onChange={(e) => handleContentChange('yearTitleVisible', e.target.checked)}
                              className="h-3 w-3 rounded border-stone-600 bg-stone-800 text-blue-500 focus:ring-blue-500"
                            />
                            <span className="text-[10px] text-stone-500">Show</span>
                          </label>
                        </div>
                      </div>
                      <Input
                        value={contentData.yearTitle}
                        onChange={(e) => handleContentChange('yearTitle', e.target.value)}
                        className="h-8 border-stone-800 bg-stone-950 text-sm text-stone-300"
                        placeholder="Year"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-stone-500">Value</Label>
                        <div className="flex items-center gap-2">
                          <select
                            value={contentData.yearValueFontWeight}
                            onChange={(e) => handleContentChange('yearValueFontWeight', e.target.value)}
                            className="h-5 rounded border border-stone-700 bg-stone-800 px-1 text-[10px] text-stone-300">
                            <option value="book">Book</option>
                            <option value="regular">Regular</option>
                            <option value="medium">Medium</option>
                            <option value="bold">Bold</option>
                          </select>
                          <label className="flex cursor-pointer items-center gap-1">
                            <input
                              type="checkbox"
                              checked={contentData.yearValueVisible}
                              onChange={(e) => handleContentChange('yearValueVisible', e.target.checked)}
                              className="h-3 w-3 rounded border-stone-600 bg-stone-800 text-blue-500 focus:ring-blue-500"
                            />
                            <span className="text-[10px] text-stone-500">Show</span>
                          </label>
                        </div>
                      </div>
                      <Textarea
                        rows={3}
                        value={contentData.year}
                        onChange={(e) => handleContentChange('year', e.target.value)}
                        className="border-stone-800 bg-stone-950 text-sm text-stone-200"
                        placeholder="2024"
                      />
                    </div>
                  </div>

                  {/* Client */}
                  <div className="space-y-2 rounded-lg border border-stone-800 bg-stone-900/50 p-3">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-stone-500">Title</Label>
                        <div className="flex items-center gap-2">
                          <select
                            value={contentData.clientTitleFontWeight}
                            onChange={(e) => handleContentChange('clientTitleFontWeight', e.target.value)}
                            className="h-5 rounded border border-stone-700 bg-stone-800 px-1 text-[10px] text-stone-300">
                            <option value="book">Book</option>
                            <option value="regular">Regular</option>
                            <option value="medium">Medium</option>
                            <option value="bold">Bold</option>
                          </select>
                          <label className="flex cursor-pointer items-center gap-1">
                            <input
                              type="checkbox"
                              checked={contentData.clientTitleVisible}
                              onChange={(e) => handleContentChange('clientTitleVisible', e.target.checked)}
                              className="h-3 w-3 rounded border-stone-600 bg-stone-800 text-blue-500 focus:ring-blue-500"
                            />
                            <span className="text-[10px] text-stone-500">Show</span>
                          </label>
                        </div>
                      </div>
                      <Input
                        value={contentData.clientTitle}
                        onChange={(e) => handleContentChange('clientTitle', e.target.value)}
                        className="h-8 border-stone-800 bg-stone-950 text-sm text-stone-300"
                        placeholder="Client"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-stone-500">Value</Label>
                        <div className="flex items-center gap-2">
                          <select
                            value={contentData.clientValueFontWeight}
                            onChange={(e) => handleContentChange('clientValueFontWeight', e.target.value)}
                            className="h-5 rounded border border-stone-700 bg-stone-800 px-1 text-[10px] text-stone-300">
                            <option value="book">Book</option>
                            <option value="regular">Regular</option>
                            <option value="medium">Medium</option>
                            <option value="bold">Bold</option>
                          </select>
                          <label className="flex cursor-pointer items-center gap-1">
                            <input
                              type="checkbox"
                              checked={contentData.clientValueVisible}
                              onChange={(e) => handleContentChange('clientValueVisible', e.target.checked)}
                              className="h-3 w-3 rounded border-stone-600 bg-stone-800 text-blue-500 focus:ring-blue-500"
                            />
                            <span className="text-[10px] text-stone-500">Show</span>
                          </label>
                        </div>
                      </div>
                      <Textarea
                        rows={3}
                        value={contentData.client}
                        onChange={(e) => handleContentChange('client', e.target.value)}
                        className="border-stone-800 bg-stone-950 text-sm text-stone-200"
                        placeholder="Client Name"
                      />
                    </div>
                  </div>

                  {/* Services */}
                  <div className="space-y-2 rounded-lg border border-stone-800 bg-stone-900/50 p-3">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-stone-500">Title</Label>
                        <div className="flex items-center gap-2">
                          <select
                            value={contentData.servicesTitleFontWeight}
                            onChange={(e) => handleContentChange('servicesTitleFontWeight', e.target.value)}
                            className="h-5 rounded border border-stone-700 bg-stone-800 px-1 text-[10px] text-stone-300">
                            <option value="book">Book</option>
                            <option value="regular">Regular</option>
                            <option value="medium">Medium</option>
                            <option value="bold">Bold</option>
                          </select>
                          <label className="flex cursor-pointer items-center gap-1">
                            <input
                              type="checkbox"
                              checked={contentData.servicesTitleVisible}
                              onChange={(e) => handleContentChange('servicesTitleVisible', e.target.checked)}
                              className="h-3 w-3 rounded border-stone-600 bg-stone-800 text-blue-500 focus:ring-blue-500"
                            />
                            <span className="text-[10px] text-stone-500">Show</span>
                          </label>
                        </div>
                      </div>
                      <Input
                        value={contentData.servicesTitle}
                        onChange={(e) => handleContentChange('servicesTitle', e.target.value)}
                        className="h-8 border-stone-800 bg-stone-950 text-sm text-stone-300"
                        placeholder="Services"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-stone-500">Value</Label>
                        <div className="flex items-center gap-2">
                          <select
                            value={contentData.servicesValueFontWeight}
                            onChange={(e) => handleContentChange('servicesValueFontWeight', e.target.value)}
                            className="h-5 rounded border border-stone-700 bg-stone-800 px-1 text-[10px] text-stone-300">
                            <option value="book">Book</option>
                            <option value="regular">Regular</option>
                            <option value="medium">Medium</option>
                            <option value="bold">Bold</option>
                          </select>
                          <label className="flex cursor-pointer items-center gap-1">
                            <input
                              type="checkbox"
                              checked={contentData.servicesValueVisible}
                              onChange={(e) => handleContentChange('servicesValueVisible', e.target.checked)}
                              className="h-3 w-3 rounded border-stone-600 bg-stone-800 text-blue-500 focus:ring-blue-500"
                            />
                            <span className="text-[10px] text-stone-500">Show</span>
                          </label>
                        </div>
                      </div>
                      <Textarea
                        rows={3}
                        value={contentData.services}
                        onChange={(e) => handleContentChange('services', e.target.value)}
                        className="border-stone-800 bg-stone-950 text-sm text-stone-200"
                        placeholder="Services"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* ===== 상세 정보 (Product, Keywords, Challenge) ===== */}
              <div className="space-y-4 border-t border-stone-800 pt-4">
                <h4 className="text-lg font-medium text-stone-200">Detail Contents</h4>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {/* Product */}
                  <div className="space-y-2 rounded-lg border border-stone-800 bg-stone-900/50 p-3">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-stone-500">Section Title</Label>
                        <div className="flex items-center gap-2">
                          <select
                            value={contentData.productTitleFontWeight}
                            onChange={(e) => handleContentChange('productTitleFontWeight', e.target.value)}
                            className="h-5 rounded border border-stone-700 bg-stone-800 px-1 text-[10px] text-stone-300">
                            <option value="book">Book</option>
                            <option value="regular">Regular</option>
                            <option value="medium">Medium</option>
                            <option value="bold">Bold</option>
                          </select>
                          <label className="flex cursor-pointer items-center gap-1">
                            <input
                              type="checkbox"
                              checked={contentData.productTitleVisible}
                              onChange={(e) => handleContentChange('productTitleVisible', e.target.checked)}
                              className="h-3 w-3 rounded border-stone-600 bg-stone-800 text-blue-500 focus:ring-blue-500"
                            />
                            <span className="text-[10px] text-stone-500">Show</span>
                          </label>
                        </div>
                      </div>
                      <Input
                        value={contentData.productTitle}
                        onChange={(e) => handleContentChange('productTitle', e.target.value)}
                        className="h-8 border-stone-800 bg-stone-950 text-sm text-stone-300"
                        placeholder="Product"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-stone-500">Value</Label>
                        <div className="flex items-center gap-2">
                          <select
                            value={contentData.productValueFontWeight}
                            onChange={(e) => handleContentChange('productValueFontWeight', e.target.value)}
                            className="h-5 rounded border border-stone-700 bg-stone-800 px-1 text-[10px] text-stone-300">
                            <option value="book">Book</option>
                            <option value="regular">Regular</option>
                            <option value="medium">Medium</option>
                            <option value="bold">Bold</option>
                          </select>
                          <label className="flex cursor-pointer items-center gap-1">
                            <input
                              type="checkbox"
                              checked={contentData.productValueVisible}
                              onChange={(e) => handleContentChange('productValueVisible', e.target.checked)}
                              className="h-3 w-3 rounded border-stone-600 bg-stone-800 text-blue-500 focus:ring-blue-500"
                            />
                            <span className="text-[10px] text-stone-500">Show</span>
                          </label>
                        </div>
                      </div>
                      <Textarea
                        rows={3}
                        value={contentData.product}
                        onChange={(e) => handleContentChange('product', e.target.value)}
                        className="border-stone-800 bg-stone-950 text-sm text-stone-200"
                        placeholder="Product description"
                      />
                    </div>
                  </div>

                  {/* Keywords */}
                  <div className="space-y-2 rounded-lg border border-stone-800 bg-stone-900/50 p-3">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-stone-500">Section Title</Label>
                        <div className="flex items-center gap-2">
                          <select
                            value={contentData.keywordTitleFontWeight}
                            onChange={(e) => handleContentChange('keywordTitleFontWeight', e.target.value)}
                            className="h-5 rounded border border-stone-700 bg-stone-800 px-1 text-[10px] text-stone-300">
                            <option value="book">Book</option>
                            <option value="regular">Regular</option>
                            <option value="medium">Medium</option>
                            <option value="bold">Bold</option>
                          </select>
                          <label className="flex cursor-pointer items-center gap-1">
                            <input
                              type="checkbox"
                              checked={contentData.keywordTitleVisible}
                              onChange={(e) => handleContentChange('keywordTitleVisible', e.target.checked)}
                              className="h-3 w-3 rounded border-stone-600 bg-stone-800 text-blue-500 focus:ring-blue-500"
                            />
                            <span className="text-[10px] text-stone-500">Show</span>
                          </label>
                        </div>
                      </div>
                      <Input
                        value={contentData.keywordTitle}
                        onChange={(e) => handleContentChange('keywordTitle', e.target.value)}
                        className="h-8 border-stone-800 bg-stone-950 text-sm text-stone-300"
                        placeholder="Design Keywords"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-stone-500">Value</Label>
                        <div className="flex items-center gap-2">
                          <select
                            value={contentData.keywordValueFontWeight}
                            onChange={(e) => handleContentChange('keywordValueFontWeight', e.target.value)}
                            className="h-5 rounded border border-stone-700 bg-stone-800 px-1 text-[10px] text-stone-300">
                            <option value="book">Book</option>
                            <option value="regular">Regular</option>
                            <option value="medium">Medium</option>
                            <option value="bold">Bold</option>
                          </select>
                          <label className="flex cursor-pointer items-center gap-1">
                            <input
                              type="checkbox"
                              checked={contentData.keywordValueVisible}
                              onChange={(e) => handleContentChange('keywordValueVisible', e.target.checked)}
                              className="h-3 w-3 rounded border-stone-600 bg-stone-800 text-blue-500 focus:ring-blue-500"
                            />
                            <span className="text-[10px] text-stone-500">Show</span>
                          </label>
                        </div>
                      </div>
                      <Textarea
                        rows={3}
                        value={contentData.keyword}
                        onChange={(e) => handleContentChange('keyword', e.target.value)}
                        className="border-stone-800 bg-stone-950 text-sm text-stone-200"
                        placeholder="Design keywords"
                      />
                    </div>
                  </div>
                </div>

                {/* Challenge */}
                <div className="space-y-2 rounded-lg border border-stone-800 bg-stone-900/50 p-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-stone-500">Section Title</Label>
                      <div className="flex items-center gap-2">
                        <select
                          value={contentData.challengeTitleFontWeight}
                          onChange={(e) => handleContentChange('challengeTitleFontWeight', e.target.value)}
                          className="h-5 rounded border border-stone-700 bg-stone-800 px-1 text-[10px] text-stone-300">
                          <option value="book">Book</option>
                          <option value="regular">Regular</option>
                          <option value="medium">Medium</option>
                          <option value="bold">Bold</option>
                        </select>
                        <label className="flex cursor-pointer items-center gap-1">
                          <input
                            type="checkbox"
                            checked={contentData.challengeTitleVisible}
                            onChange={(e) => handleContentChange('challengeTitleVisible', e.target.checked)}
                            className="h-3 w-3 rounded border-stone-600 bg-stone-800 text-blue-500 focus:ring-blue-500"
                          />
                          <span className="text-[10px] text-stone-500">Show</span>
                        </label>
                      </div>
                    </div>
                    <Input
                      value={contentData.challengeTitle}
                      onChange={(e) => handleContentChange('challengeTitle', e.target.value)}
                      className="h-8 border-stone-800 bg-stone-950 text-sm text-stone-300"
                      placeholder="Challenge"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-stone-500">Content (Long Text)</Label>
                      <div className="flex items-center gap-2">
                        <select
                          value={contentData.challengeValueFontWeight}
                          onChange={(e) => handleContentChange('challengeValueFontWeight', e.target.value)}
                          className="h-5 rounded border border-stone-700 bg-stone-800 px-1 text-[10px] text-stone-300">
                          <option value="book">Book</option>
                          <option value="regular">Regular</option>
                          <option value="medium">Medium</option>
                          <option value="bold">Bold</option>
                        </select>
                        <label className="flex cursor-pointer items-center gap-1">
                          <input
                            type="checkbox"
                            checked={contentData.challengeValueVisible}
                            onChange={(e) => handleContentChange('challengeValueVisible', e.target.checked)}
                            className="h-3 w-3 rounded border-stone-600 bg-stone-800 text-blue-500 focus:ring-blue-500"
                          />
                          <span className="text-[10px] text-stone-500">Show</span>
                        </label>
                      </div>
                    </div>
                    <Textarea
                      rows={6}
                      value={contentData.challenge}
                      onChange={(e) => handleContentChange('challenge', e.target.value)}
                      className="border-stone-800 bg-stone-950 text-stone-200"
                      placeholder="Enter project challenges and detailed description"
                    />
                  </div>
                </div>
              </div>

              {/* ===== 썸네일 이미지 ===== */}
              <div className="space-y-4 border-t border-stone-800 pt-4">
                <h4 className="text-lg font-medium text-stone-200">Thumbnail Images</h4>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <ImageUploader
                      label="Landscape Thumbnail (4:3)"
                      value={contentData.thumbnail43}
                      onChange={(url) => handleContentChange('thumbnail43', url)}
                      bucketName="images"
                      folderPath="projects/thumbnails/4x3"
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <ImageUploader
                      label="Portrait Thumbnail (3:4)"
                      value={contentData.thumbnail34}
                      onChange={(url) => handleContentChange('thumbnail34', url)}
                      bucketName="images"
                      folderPath="projects/thumbnails/3x4"
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>

              {/* ===== 상세 이미지 관리 섹션 (순서 변경 가능) ===== */}
              <div className="space-y-4 border-t border-stone-800 pt-4">
                <SortableImageList
                  images={contentData.detailImages || []}
                  onImagesChange={(images) => handleContentChange('detailImages', images)}
                  folderPath="projects/details"
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-3 border-t border-stone-800 p-6">
              <Button
                variant="outline"
                onClick={handleCancel}
                className="border-stone-700 bg-stone-800 text-stone-400 hover:border-stone-600 hover:bg-stone-700 hover:text-stone-200">
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={loading}
                className="bg-stone-100 text-stone-900 hover:bg-stone-200">
                {loading ? 'Saving...' : isEditing ? 'Update' : 'Register'}
              </Button>
            </CardFooter>
          </Card>
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-left-4 space-y-6 duration-300">
          {/* ===== 상단 액션 바 ===== */}
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <div className="flex w-full items-center justify-between gap-4 md:w-auto md:justify-start">
              <h3 className="text-xl font-semibold text-stone-200">
                Registered Project List <span className="ml-2 text-sm text-stone-500">({projects.length})</span>
              </h3>
              {/* 뷰 모드 토글 버튼 */}
              <div className="flex items-center rounded-md border border-stone-800 bg-stone-900 p-1">
                <button
                  onClick={() => setViewMode('list')}
                  className={`rounded p-1.5 transition-colors ${
                    viewMode === 'list'
                      ? 'bg-stone-800 text-stone-100 shadow-sm'
                      : 'text-stone-500 hover:text-stone-300'
                  }`}
                  title="List View (Order changeable)">
                  <ListIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('card')}
                  className={`rounded p-1.5 transition-colors ${
                    viewMode === 'card'
                      ? 'bg-stone-800 text-stone-100 shadow-sm'
                      : 'text-stone-500 hover:text-stone-300'
                  }`}
                  title="Card View">
                  <LayoutGrid className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex w-full items-center gap-2 overflow-x-auto pb-1 md:w-auto md:pb-0">
              {/* 순서 저장 버튼 (순서 변경 시에만 활성화) */}
              {isOrderChanged && (
                <Button
                  onClick={handleSaveOrder}
                  disabled={loading}
                  className="animate-in fade-in zoom-in shrink-0 bg-blue-600 text-white duration-200 hover:bg-blue-700">
                  <Save className="mr-2 h-4 w-4" /> Save
                </Button>
              )}

              <Link href="/projects" target="_blank" className="shrink-0">
                <Button
                  variant="outline"
                  className="gap-2 border-stone-700 bg-stone-800 text-stone-200 hover:border-stone-600 hover:bg-stone-200 hover:text-stone-900">
                  View All <ExternalLink className="h-4 w-4" />
                </Button>
              </Link>
              <Button
                variant="outline"
                onClick={handleCreateNew}
                className="shrink-0 gap-2 border-stone-700 bg-stone-800 text-stone-200 hover:border-stone-600 hover:bg-stone-200 hover:text-stone-900">
                <Plus className="h-4 w-4" /> New Project
              </Button>
            </div>
          </div>

          {/* ===== 프로젝트 목록 (Read) ===== */}
          {loading && !projects.length ? (
            <div className="rounded-lg border border-dashed border-stone-800 p-12 text-center text-stone-500">
              <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin opacity-50" />
              Loading projects...
            </div>
          ) : projects.length === 0 ? (
            <div className="rounded-lg border border-dashed border-stone-800 bg-stone-900/50 p-12 text-center text-stone-500">
              No projects registered. Click the New Project button to add one.
            </div>
          ) : viewMode === 'list' ? (
            /* === 리스트 뷰 (순서 변경 가능) === */
            <div className="space-y-2">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={projects.map((p) => p.id)} strategy={verticalListSortingStrategy}>
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
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {projects.map((item) => (
                <Card
                  key={item.id}
                  onClick={() => handleEdit(item)}
                  className={`flex h-full cursor-pointer flex-col overflow-hidden border-stone-800 bg-stone-900 shadow-sm transition-all hover:border-stone-600 hover:shadow-md`}>
                  {/* 가로형 썸네일 */}
                  {item.contents?.thumbnail43 && (
                    <div className="relative h-48 w-full overflow-hidden bg-stone-950">
                      <Image
                        src={item.contents.thumbnail43}
                        alt={item.title}
                        width={400}
                        height={300}
                        className="h-full w-full object-cover"
                        unoptimized
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  )}
                  <div className="flex flex-1 flex-col p-5">
                    <div className="mb-4 flex-1">
                      <div className="mb-2 flex items-center justify-between">
                        <CardTitle className="truncate text-lg text-stone-200">{item.title}</CardTitle>
                        <span
                          className={`rounded border px-1.5 py-0.5 text-[10px] tracking-wider uppercase ${
                            statusColors[item.status] || statusColors.ready
                          }`}>
                          {item.status}
                        </span>
                      </div>

                      <div className="mb-3 flex items-center gap-2">
                        <span className="rounded border border-stone-700 bg-stone-800 px-2 py-0.5 font-mono text-xs text-stone-400">
                          /{item.slug}
                        </span>
                        <Link
                          href={`/projects/${item.slug}`}
                          target="_blank"
                          onClick={(e) => e.stopPropagation()}
                          className="text-stone-600 transition-colors hover:text-stone-300"
                          title="새 탭에서 보기">
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </div>
                      <CardDescription className="line-clamp-3 text-stone-400">{item.description}</CardDescription>
                    </div>

                    <div className="flex items-center justify-between border-t border-stone-800 pt-4">
                      <span className="text-xs text-stone-600">
                        {item.updated_at
                          ? `${new Date(item.updated_at).toLocaleDateString('en-US')} (Edited)`
                          : new Date(item.created_at).toLocaleDateString('en-US')}
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(item);
                          }}
                          title="Edit"
                          className="h-8 w-8 text-stone-500 hover:bg-stone-800 hover:text-stone-200">
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
                          title="Delete"
                          className="h-8 w-8 text-stone-500 hover:bg-stone-800 hover:text-red-400">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
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
