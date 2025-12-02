import type { Metadata } from 'next';
// import { Geist, Geist_Mono } from "next/font/google";
import './globals.css';
import Header from '@/components/Header';
import Homecontainer from '@/components/Homecontainer';
import { cn } from '@/util/cn';

// const geistSans = Geist({
//   variable: "--font-geist-sans",
//   subsets: ["latin"],
// });

// const geistMono = Geist_Mono({
//   variable: "--font-geist-mono",
//   subsets: ["latin"],
// });

export const metadata: Metadata = {
  title: 'SCHEME.Forgroup',
  description: 'SCHEME.Forgroup',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <link rel="stylesheet" href="/fonts.css" />
        <link rel="preload" href="/fonts/ABCROM-NormalBold.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/ABCROM-NormalBook.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link
          rel="preload"
          href="/fonts/ABCROM-NormalMedium.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/ABCROM-NormalRegular.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body
        className="overflow-x-hidden overflow-y-auto"
        // className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Header />
        {children}
      </body>
    </html>
  );
}
