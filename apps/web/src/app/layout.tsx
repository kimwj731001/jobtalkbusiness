import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '외국인 일자리 적법성 판정',
  description: '내 비자로 여기서 일하면 합법인가 — 근거와 함께 답하는 일자리 검색',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-white text-neutral-900 antialiased">{children}</body>
    </html>
  );
}
