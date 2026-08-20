import type { Metadata, Viewport } from "next";

import BottomTabBar from "@/components/BottomTabBar";
import Header from "@/components/Header";
import { ToastViewport } from "@/components/ui";

import "./globals.css";

/* Pretendard 는 Google Font 가 아니라 next/font/google 로 못 받는다.
   폰트 바이너리를 리포에 넣지 않는 대신 jsdelivr 의 dynamic-subset CSS 를 쓴다
   (한글 글리프를 unicode-range 로 쪼개 실제 쓰인 조각만 받는다). */
const FONT_CSS =
  "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css";

// 로그인·스토리지 첫 요청의 TLS 핸드셰이크를 미리 끝내둔다. 값이 없으면 렌더하지 않는다.
const SUPABASE_ORIGIN = (() => {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    return url ? new URL(url).origin : null;
  } catch {
    return null;
  }
})();

export const metadata: Metadata = {
  title: { default: "Clothes-Cut", template: "%s · Clothes-Cut" },
  description: "아바타에 옷을 입히고 색을 맞춰, 숏폼 한 편까지. 오늘의 착장, 10분이면 돼요.",
  applicationName: "Clothes-Cut",
  appleWebApp: { capable: true, title: "Clothes-Cut", statusBarStyle: "default" },
  // 전화번호 자동 링크가 아이템 개수·HEX 값 같은 숫자를 파랗게 물들이는 걸 막는다.
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // env(safe-area-inset-*) 를 쓰려면 필수. 없으면 노치·홈 인디케이터 여백이 전부 0이 된다.
  viewportFit: "cover",
  // 하늘 그라데이션 최상단 색 — 상태바까지 배경과 이어 보이게.
  themeColor: "#E9F5FC",
  // 확대 제한(userScalable/maximumScale)은 접근성 때문에 두지 않는다.
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://cdn.jsdelivr.net" />
        {SUPABASE_ORIGIN && (
          <>
            <link rel="preconnect" href={SUPABASE_ORIGIN} crossOrigin="anonymous" />
            <link rel="dns-prefetch" href={SUPABASE_ORIGIN} />
          </>
        )}
        <link rel="stylesheet" href={FONT_CSS} crossOrigin="anonymous" />
      </head>
      <body className="antialiased">
        {/* 키보드·스위치 사용자가 탭바를 지나 본문으로 바로 갈 수 있게.
            평소엔 화면 위로 밀어두고 포커스를 받으면 내려온다. */}
        <a
          href="#main"
          className="fixed left-3 top-3 z-50 -translate-y-24 rounded-xl bg-white px-3 py-2 text-sm font-bold text-coral-ink shadow-lg transition-transform focus:translate-y-0"
        >
          본문으로 건너뛰기
        </a>

        <Header />
        <main id="main" className="mx-auto w-full max-w-md">
          {children}
        </main>
        <BottomTabBar />
        {/* 토스트는 body 직속에 전역 1개만 둔다 — .glass-* 서브트리 안에서 렌더하면
            backdrop-filter 가 컨테이닝 블록이 되어 position:fixed 가 화면이 아닌
            그 카드 기준으로 잡힌다(드레스룸 자동 재배치 안내가 엉뚱한 곳에 뜬다). */}
        <ToastViewport />
      </body>
    </html>
  );
}
