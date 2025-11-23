"use client";

import { useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, X, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

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
  bucketName = "images",
  folderPath = "uploads",
  label = "이미지 업로드",
  disabled = false,
}: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 파일 유효성 검사 (이미지 파일만 허용)
    if (!file.type.startsWith("image/")) {
      alert("이미지 파일만 업로드할 수 있습니다.");
      return;
    }

    // 파일 크기 제한 (예: 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("파일 크기는 5MB 이하여야 합니다.");
      return;
    }

    try {
      setIsUploading(true);

      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random()
        .toString(36)
        .substring(2, 15)}_${Date.now()}.${fileExt}`;
      const filePath = `${folderPath}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      // Public URL 가져오기
      const {
        data: { publicUrl },
      } = supabase.storage.from(bucketName).getPublicUrl(filePath);

      onChange(publicUrl);
    } catch (error: any) {
      console.error("Upload error:", error);
      alert("이미지 업로드 중 오류가 발생했습니다: " + error.message);
    } finally {
      setIsUploading(false);
      // 입력값 초기화하여 같은 파일 다시 선택 가능하게 함
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemove = () => {
    // 실제 스토리지에서 삭제하는 로직은 선택 사항 (여기서는 URL만 지움)
    // 필요하다면 supabase.storage.from(bucketName).remove([path]) 호출 가능
    if (confirm("이미지를 제거하시겠습니까?")) {
      onChange("");
    }
  };

  return (
    <div className="space-y-3">
      <Label className="text-stone-300">{label}</Label>

      {!value ? (
        // 업로드 UI
        <div
          onClick={() =>
            !disabled && !isUploading && fileInputRef.current?.click()
          }
          className={cn(
            "border-2 border-dashed border-stone-800 rounded-lg p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors bg-stone-900/50 hover:bg-stone-900",
            (disabled || isUploading) && "opacity-50 cursor-not-allowed",
            !disabled && !isUploading && "hover:border-stone-600"
          )}
        >
          {isUploading ? (
            <>
              <Loader2 className="h-8 w-8 text-stone-500 animate-spin" />
              <p className="text-sm text-stone-500">업로드 중...</p>
            </>
          ) : (
            <>
              <div className="p-3 bg-stone-800 rounded-full">
                <Upload className="h-5 w-5 text-stone-400" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-stone-300">
                  클릭하여 이미지 선택
                </p>
                <p className="text-xs text-stone-500 mt-1">
                  PNG, JPG, GIF up to 5MB
                </p>
              </div>
            </>
          )}
        </div>
      ) : (
        // 미리보기 UI
        <div className="relative group rounded-lg overflow-hidden border border-stone-800 bg-stone-900 aspect-video md:aspect-auto md:h-64 flex items-center justify-center">
          <img
            src={value}
            alt="Uploaded preview"
            className="w-full h-full object-contain"
          />

          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => window.open(value, "_blank")}
              className="h-8 text-xs"
            >
              <ImageIcon className="h-3 w-3 mr-1.5" /> 원본 보기
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleRemove}
              disabled={disabled}
              className="h-8 text-xs"
            >
              <X className="h-3 w-3 mr-1.5" /> 제거
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
