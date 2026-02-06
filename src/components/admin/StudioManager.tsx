'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { revalidateStudio } from '@/lib/revalidate';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import ImageUploader from './ImageUploader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

// JSON 데이터 구조 정의
interface StudioData {
  imageUrl: string;
  description: string;
}

// 초기값
const initialData: StudioData = {
  imageUrl: '/images/dummy/studio.jpg',
  description: '',
};

// --- Main Component ---
export default function StudioManager() {
  const [data, setData] = useState<StudioData>(initialData);
  const [originalData, setOriginalData] = useState<StudioData>(initialData);
  const [loading, setLoading] = useState(false);

  // 변경 사항 여부 확인
  const isChanged = useMemo(() => {
    return JSON.stringify(data) !== JSON.stringify(originalData);
  }, [data, originalData]);

  // Studio 내용 불러오기
  useEffect(() => {
    const fetchStudioContent = async () => {
      setLoading(true);
      const { data: configData } = await supabase.from('config').select('content').eq('id', 'about').single();

      if (configData?.content) {
        try {
          const content = configData.content;
          const parsed = typeof content === 'string' ? JSON.parse(content) : content;

          const newData: StudioData = {
            imageUrl: parsed.imageUrl || initialData.imageUrl,
            description: parsed.description || initialData.description,
          };

          setData(newData);
          setOriginalData(newData);
        } catch {
          if (typeof configData.content === 'string') {
            const newData = { ...initialData, description: configData.content };
            setData(newData);
            setOriginalData(newData);
          }
        }
      }
      setLoading(false);
    };

    fetchStudioContent();
  }, []);

  // 필드 핸들러
  const handleChange = (field: keyof StudioData, value: string) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  // 저장 함수
  const handleUpdateStudio = async () => {
    setLoading(true);

    const { error } = await supabase.from('config').update({ content: data }).eq('id', 'about');

    if (error) {
      alert('Error occurred: ' + error.message);
    } else {
      await revalidateStudio();
      alert('Saved successfully.');
      setOriginalData(data);
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
        {/* 이미지 URL */}
        <div className="space-y-2">
          <ImageUploader
            label="Main Image (Studio Page)"
            value={data.imageUrl}
            onChange={(url) => handleChange('imageUrl', url)}
            folderPath="about"
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

        <div className="flex justify-end pt-4">
          <Button
            onClick={handleUpdateStudio}
            disabled={loading || !isChanged}
            className="w-full bg-stone-100 text-stone-900 hover:bg-stone-200 disabled:cursor-not-allowed disabled:opacity-50 md:w-auto">
            {loading ? 'Saving...' : isChanged ? 'Save All Changes' : 'No Changes'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
