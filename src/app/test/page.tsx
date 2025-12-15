'use client';

import { useState } from 'react';
import HoverDistortImage from '@/components/HoverDistortImage';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { HOVER_DISTORT_CONFIG } from '@/config/appConfig';

export default function TestPage() {
  // 비례 기반 파라미터 (대각선 기준 비율)
  const [distortionScale, setDistortionScale] = useState(HOVER_DISTORT_CONFIG.defaultDistortionScale);
  const [radiusPercent, setRadiusPercent] = useState(HOVER_DISTORT_CONFIG.defaultRadiusPercent);
  const [blurStd, setBlurStd] = useState(HOVER_DISTORT_CONFIG.defaultBlurStd);
  const [easingFactor, setEasingFactor] = useState(HOVER_DISTORT_CONFIG.defaultEasingFactor);

  return (
    <div className="flex min-h-screen flex-col items-center gap-8 bg-stone-100 p-8 dark:bg-stone-950">
      <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">Distortion Test Playground</h1>
      <p className="text-sm text-stone-500">모든 값은 이미지 대각선 길이에 비례하여 적용됩니다</p>

      <div className="flex w-full max-w-5xl flex-col gap-8 lg:flex-row">
        {/* Controls */}
        <Card className="h-fit w-full space-y-6 p-6 lg:w-80">
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Distortion Scale (대각선 비율)</Label>
                <span className="text-sm text-stone-500">{(distortionScale * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-stone-200 accent-stone-900 dark:bg-stone-800 dark:accent-stone-100"
                value={distortionScale}
                onChange={(e) => setDistortionScale(Number(e.target.value))}
                min={0.1}
                max={2}
                step={0.05}
              />
              <p className="text-xs text-stone-500">왜곡 강도 (대각선의 비율)</p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Radius (대각선 비율)</Label>
                <span className="text-sm text-stone-500">{(radiusPercent * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-stone-200 accent-stone-900 dark:bg-stone-800 dark:accent-stone-100"
                value={radiusPercent}
                onChange={(e) => setRadiusPercent(Number(e.target.value))}
                min={0.05}
                max={0.5}
                step={0.01}
              />
              <p className="text-xs text-stone-500">왜곡 렌즈 반경 (대각선의 비율)</p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Blur (대각선 비율)</Label>
                <span className="text-sm text-stone-500">{(blurStd * 100).toFixed(1)}%</span>
              </div>
              <input
                type="range"
                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-stone-200 accent-stone-900 dark:bg-stone-800 dark:accent-stone-100"
                value={blurStd}
                onChange={(e) => setBlurStd(Number(e.target.value))}
                min={0.01}
                max={0.2}
                step={0.005}
              />
              <p className="text-xs text-stone-500">블러 강도 (대각선의 비율)</p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Easing Factor (Lerp)</Label>
                <span className="text-sm text-stone-500">{easingFactor.toFixed(3)}</span>
              </div>
              <input
                type="range"
                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-stone-200 accent-stone-900 dark:bg-stone-800 dark:accent-stone-100"
                value={easingFactor}
                onChange={(e) => setEasingFactor(Number(e.target.value))}
                min={0.01}
                max={0.5}
                step={0.01}
              />
              <p className="text-xs text-stone-500">애니메이션 속도 (높을수록 빠름)</p>
            </div>
          </div>
        </Card>

        {/* Preview Grid */}
        <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-2">
          {/* Image 1: Vertical */}
          <Card className="overflow-hidden p-4">
            <div className="mb-2 text-sm font-medium text-stone-500">Aspect Ratio: 3/4</div>
            <div className="relative w-full overflow-hidden rounded-md border border-stone-200 dark:border-stone-800">
              <HoverDistortImage
                src="/images/main/main_1.jpeg"
                aspectRatio="3 / 4"
                distortionScale={distortionScale}
                radiusPercent={radiusPercent}
                blurStd={blurStd}
                easingFactor={easingFactor}
                className="w-full"
              />
            </div>
          </Card>

          {/* Image 2: Horizontal */}
          <Card className="overflow-hidden p-4">
            <div className="mb-2 text-sm font-medium text-stone-500">Aspect Ratio: 4/3</div>
            <div className="relative w-full overflow-hidden rounded-md border border-stone-200 dark:border-stone-800">
              <HoverDistortImage
                src="/images/main/main_2.jpeg"
                aspectRatio="4 / 3"
                distortionScale={distortionScale}
                radiusPercent={radiusPercent}
                blurStd={blurStd}
                easingFactor={easingFactor}
                className="w-full"
              />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
