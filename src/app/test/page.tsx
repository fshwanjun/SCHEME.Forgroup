'use client';

import { useState } from 'react';
import HoverDistortImage from '@/components/HoverDistortImage';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export default function TestPage() {
  const [distortionScale, setDistortionScale] = useState(200);
  const [radiusPx, setRadiusPx] = useState(100);
  const [easingFactor, setEasingFactor] = useState(0.08);

  return (
    <div className="flex min-h-screen flex-col items-center gap-8 bg-stone-100 p-8 dark:bg-stone-950">
      <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">Distortion Test Playground</h1>

      <div className="flex w-full max-w-5xl flex-col gap-8 lg:flex-row">
        {/* Controls */}
        <Card className="h-fit w-full space-y-6 p-6 lg:w-80">
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Distortion Scale</Label>
                <span className="text-sm text-stone-500">{distortionScale}</span>
              </div>
              <input
                type="range"
                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-stone-200 accent-stone-900 dark:bg-stone-800 dark:accent-stone-100"
                value={distortionScale}
                onChange={(e) => setDistortionScale(Number(e.target.value))}
                min={0}
                max={1000}
                step={10}
              />
              <p className="text-xs text-stone-500">Strength of the distortion effect</p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Radius (px)</Label>
                <span className="text-sm text-stone-500">{radiusPx}px</span>
              </div>
              <input
                type="range"
                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-stone-200 accent-stone-900 dark:bg-stone-800 dark:accent-stone-100"
                value={radiusPx}
                onChange={(e) => setRadiusPx(Number(e.target.value))}
                min={10}
                max={500}
                step={10}
              />
              <p className="text-xs text-stone-500">Radius of the distortion lens</p>
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
              <p className="text-xs text-stone-500">Animation speed/smoothness (Higher = Faster)</p>
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
                radiusPx={radiusPx}
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
                radiusPx={radiusPx}
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
