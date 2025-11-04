'use client';

import Homecontainer from '@/components/Homecontainer';
import useWindowSize from '@/util/useWindowSize';
import { useEffect, useState } from 'react';
import { cn } from '@/util/cn';

export default function StudioPage() {
  const { height } = useWindowSize();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isShort = mounted && height < 880;
  return (
    <Homecontainer addClassName="flex md:flex-row flex-col gap-[var(--x-padding)] md:h-full h-fit overflow-x-hidden">
      <div className="h-full md:block hidden md:shrink-0 overflow-hidden">
        <img
          className="lg:h-full h-auto lg:w-auto w-[40vw] object-contain max-w-none"
          src="/images/dummy/studio.jpg"
          alt="studio"
          draggable={false}
        />
      </div>
      <div className="flex flex-col justify-between">
        <h3 className={cn(isShort && 'text-xl md:text-2xl', 'leading-[130%]')}>
          FOR is a creative collaboration between Moon Kim and Phan Thao Dang. The Korean-German duo strives to create
          distinctive perspectives and attitudes that deliver ideas through in-depth analysis and open dialogue.
          Adapting flexibly and practically to the unique context and challenges of each project, their work spans
          industrial, spatial, and experimental design, grounded in in-depth research, creative experimentation, and
          fluid collaboration. With expertise spanning diverse fields, FOR identifies what collaborators genuinely seek
          and creates outcomes that are both insightful and original. By combining their diverse backgrounds and
          expertise, FOR pushes the boundaries of method and expression.
        </h3>
        <img className="w-full h-auto md:hidden block" src="/images/dummy/studio.jpg" alt="studio" draggable={false} />
        <div className="w-full grid grid-cols-3 gap-y-10 gap-x-4">
          <div className="flex flex-col gap-2">
            <h6>Experience</h6>
            <div className="flex flex-col">
              <span>
                Lorem ipsum dolor <br />
                sit amet, consectetur <br />
                adipiscing elit, <br />
                sed do eiusmod tempor <br />
                dolore magna aliqua. <br />
                Nisl tincidunt eget nullam
                <br />
                magna eget est lorem <br />
                ipsum dolor sit. <br />
                Volutpat odio facilisis mauris <br />
                sit amet massa.{' '}
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <h6>Services</h6>
            <div className="flex flex-col">
              <span>
                Brand identitly
                <br />
                Art direction
                <br />
                Product design
                <br />
                Brand identitly
                <br />
                Art direction
                <br />
                Product design
                <br />
                Brand identitly
                <br />
                Art direction
                <br />
                Product design
                <br />
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <h6>Clients</h6>
            <div className="flex flex-col">
              <span>
                Google
                <br />
                Apple
                <br />
                Acne Studios
                <br />
                Scheme
                <br />
                Adidas
                <br />
                Nike
                <br />
                Cos
                <br />
                Cocacola
                <br />
                032C
                <br />
                Arcteryx
                <br />
                Stussy
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <h6>Address</h6>
            <div className="flex flex-col">
              <span>
                55, Dosan-daero 26-gil, Gangnam-gu,
                <br />
                Seoul, Republic of Korea
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <h6>Contact</h6>
            <div className="flex flex-col">
              <span>
                for@abcdefghijk.com
                <br />
                +00 (0)00 000 00000
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <h6>Social</h6>
            <div className="flex flex-col">
              <span>
                @FORFORFOR
                <br />
                @FORFORFORfor
              </span>
            </div>
          </div>
        </div>
      </div>
    </Homecontainer>
  );
}
