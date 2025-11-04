'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/project', label: 'Project' },
  { href: '/studio', label: 'Studio' },
];

export default function Header() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);
  const isProjectSlug = segments[0] === 'project' && segments.length >= 2;
  const [isPastHero, setIsPastHero] = useState(false);

  useEffect(() => {
    if (!isProjectSlug) {
      setIsPastHero(false);
      return;
    }

    const handleScroll = () => {
      const threshold = window.innerHeight || 0;
      setIsPastHero(window.scrollY + 88 >= threshold);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [isProjectSlug]);

  const colorClass = isProjectSlug && !isPastHero ? 'text-white' : 'text-black';

  return (
    <header className="fixed w-full top-0 z-100 h-[var(--header-height)] isolate">
      <div className="mx-auto px-[var(--x-padding)] pt-6 flex items-start justify-between">
        <Link
          href="/"
          className={`font-semibold text-[64px] leading-[64px] transition-colors duration-300 ${colorClass}`}>
          <svg
            className="transition-colors duration-300"
            width="200"
            height="65"
            viewBox="0 0 200 65"
            fill="none"
            xmlns="http://www.w3.org/2000/svg">
            <path
              d="M199.024 24.9401C199.075 20.6795 196.541 16.5061 194.23 14.9132C192.39 13.6447 191.039 13.074 188.068 11.9505C183.827 10.3473 181.069 7.57188 176.857 4.3373C173.57 1.81325 168.127 -0.441463 161.849 0.074121C156.106 0.544815 151.517 3.1176 148.983 6.6523C146.19 10.5487 143.403 15.8777 141.737 22.6226C140.83 26.2958 140.357 30.9488 137.486 31.2874C134.027 31.6966 131.658 26.6113 129.184 21.3477C124.353 11.0694 121.328 5.58907 114.207 2.01846C109.187 -0.497895 100.591 -0.260624 93.4846 2.78671C84.4697 6.6523 69.2789 7.04732 60.397 2.90598C52.1461 -0.940373 45.2626 0.53199 38.4206 2.32371C29.9288 4.54764 24.0953 3.20995 18.6031 1.46953C12.8274 -0.359379 7.03029 -0.155456 2.3422 5.25048C-0.368793 8.37732 -0.316103 13.4536 0.466709 16.8396C1.69738 22.157 4.40461 24.9619 5.4057 29.429C6.0869 32.4687 6.25751 36.6177 5.30409 41.5619C4.30048 46.7639 3.81875 49.7894 5.3342 54.4284C6.73422 58.7147 10.3761 61.8492 14.9048 62.5367C23.1118 63.782 28.6994 59.6048 35.978 52.1224C46.0204 41.8005 52.7621 43.6396 55.4066 43.9988C62.5497 44.9696 67.3633 53.6448 75.776 59.7677C86.5334 67.5976 105.504 62.3469 109.205 61.0156C113.879 59.3329 122.692 57.7579 127.186 60.5962C132.968 64.2489 144.455 66.1906 154.917 63.5268C163.589 61.3183 169.333 61.7428 173.232 63.1446C181.796 66.2227 191.478 64.9479 195.057 63.0805C197.76 61.671 200.281 60.0832 199.975 55.7469C199.753 52.5995 197.971 50.4153 196.466 49.0148C194.013 46.7331 191.617 44.4143 191.731 41.2182C191.787 39.6817 192.204 38.3171 193.288 37.2449C196.973 33.5999 198.967 29.6317 199.024 24.9401ZM29.8849 24.404C26.6909 24.5194 23.5095 24.0654 23.3727 22.2455C23.2134 20.1177 27.1664 19.4688 29.9376 19.311C32.6448 19.1584 36.3832 19.4983 36.5024 21.4477C36.6304 23.5203 33.055 24.2886 29.8849 24.404ZM97.8064 22.1339C95.9485 22.5636 94.1257 21.5362 93.9475 19.96C93.7355 18.0875 95.335 16.9537 97.0311 16.6946C98.6745 16.4433 100.245 17.1333 100.492 18.7762C100.699 20.1485 99.6267 21.7132 97.8064 22.1339ZM96.2044 43.3536C93.1045 44.3232 89.8779 42.3827 89.0625 39.7856C88.301 37.359 89.8177 33.8602 93.6715 32.8637C97.3472 31.9146 99.8048 34.254 100.362 36.5036C101.083 39.4213 98.889 42.5136 96.2044 43.3536ZM163.539 49.1879C162.695 48.3068 162.563 46.5151 162.54 45.5519C162.518 44.5849 162.609 41.4054 164.142 41.3221C166.183 41.2105 167.548 46.796 166.562 49.1636C166.074 50.3371 164.376 50.0613 163.539 49.1879ZM172.843 26.2214C170.587 26.2188 167.68 25.5198 166.438 24.8721C165.766 24.5207 164.796 23.773 164.366 22.8432C163.969 21.9851 163.802 20.8783 164.304 19.5996C164.694 18.6082 165.548 18.0041 167.389 18.3376C169.229 18.671 174.078 21.8697 175.002 22.8727C176.093 24.0564 175.671 26.2252 172.843 26.2214Z"
              fill="currentColor"
            />
          </svg>
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          {navItems.map(({ href, label }) => {
            const active = pathname === href || (href !== '/' && pathname.startsWith(href));
            return (
              <Link key={href} href={href} aria-current={active ? 'page' : undefined}>
                <h4 className={`transition-colors duration-300 ${colorClass}`}>{label}</h4>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
