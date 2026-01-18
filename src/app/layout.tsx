import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
const abcrom = localFont({
  src: [
    { path: '../../public/fonts/ABCROM-NormalRegular.woff2', weight: '400', style: 'normal' },
    { path: '../../public/fonts/ABCROM-NormalMedium.woff2', weight: '500', style: 'normal' },
    { path: '../../public/fonts/ABCROM-NormalBook.woff2', weight: '600', style: 'normal' },
    { path: '../../public/fonts/ABCROM-NormalBold.woff2', weight: '700', style: 'normal' },
  ],
  display: 'swap',
  variable: '--font-abcrom',
  fallback: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
  adjustFontFallback: 'Arial', // 폰트 메트릭 조정으로 레이아웃 시프트 방지
  preload: true, // 중요한 폰트 파일 자동 preload
});

export const metadata: Metadata = {
  title: 'FOR',
  description: 'FOR creative studio',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  manifest: '/site.webmanifest',
}; 

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={abcrom.variable}>
      <body className={abcrom.className}>{children}</body>
    </html>
  );
}
