'use client';

import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Upload, X, ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface ImageUploaderProps {
  value: string;
  onChange: (url: string) => void;
  bucketName?: string;
  folderPath?: string;
  label?: string;
  disabled?: boolean;
}

export default function ImageUploader({
  value,
  onChange,
  bucketName = 'images',
  folderPath = 'uploads',
  label = 'Upload Image',
  disabled = false,
}: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 파일 유효성 검사 (이미지 파일만 허용)
    if (!file.type.startsWith('image/')) {
      alert('Only image files can be uploaded.');
      return;
    }

    // 파일 크기 제한 (예: 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be 5MB or less.');
      return;
    }

    try {
      setIsUploading(true);

      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      const filePath = `${folderPath}/${fileName}`;

      const { error: uploadError } = await supabase.storage.from(bucketName).upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      // Public URL 가져오기
      const {
        data: { publicUrl },
      } = supabase.storage.from(bucketName).getPublicUrl(filePath);

      onChange(publicUrl);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      alert('Error occurred while uploading image: ' + message);
    } finally {
      setIsUploading(false);
      // 입력값 초기화하여 같은 파일 다시 선택 가능하게 함
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = () => {
    // 실제 스토리지에서 삭제하는 로직은 선택 사항 (여기서는 URL만 지움)
    // 필요하다면 supabase.storage.from(bucketName).remove([path]) 호출 가능
    if (confirm('Are you sure you want to remove the image?')) {
      onChange('');
    }
  };

  return (
    <div className="space-y-3">
      <Label className="text-stone-300">{label}</Label>

      {!value ? (
        // 업로드 UI
        <div
          onClick={() => !disabled && !isUploading && fileInputRef.current?.click()}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-stone-800 bg-stone-900/50 p-6 transition-colors hover:bg-stone-900',
            (disabled || isUploading) && 'cursor-not-allowed opacity-50',
            !disabled && !isUploading && 'hover:border-stone-600',
          )}>
          {isUploading ? (
            <>
              <Loader2 className="h-8 w-8 animate-spin text-stone-500" />
              <p className="text-sm text-stone-500">Uploading...</p>
            </>
          ) : (
            <>
              <div className="rounded-full bg-stone-800 p-3">
                <Upload className="h-5 w-5 text-stone-400" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-stone-300">Click to select image</p>
                <p className="mt-1 text-xs text-stone-500">PNG, JPG, GIF up to 5MB</p>
              </div>
            </>
          )}
        </div>
      ) : (
        // 미리보기 UI
        <div className="group relative flex aspect-video items-center justify-center overflow-hidden rounded-lg border border-stone-800 bg-stone-900 md:aspect-auto md:h-64">
          <Image
            src={value}
            alt="Uploaded preview"
            width={1280}
            height={720}
            className="h-full w-full object-contain"
            unoptimized
          />

          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
            <Button variant="secondary" size="sm" onClick={() => window.open(value, '_blank')} className="h-8 text-xs">
              <ImageIcon className="mr-1.5 h-3 w-3" /> View Original
            </Button>
            <Button variant="destructive" size="sm" onClick={handleRemove} disabled={disabled} className="h-8 text-xs">
              <X className="mr-1.5 h-3 w-3" /> Remove
            </Button>
          </div>
        </div>
      )}

      {/* 숨겨진 파일 입력 */}
      <Input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled || isUploading}
      />
    </div>
  );
}
