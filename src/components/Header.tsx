import Link from "next/link";
import type { ReactNode } from "react";

/* 상단 얇은 글래스 헤더.
   backdrop-filter 예산(화면당 3~4개) 중 1번을 쓰는 레이어라 값을 인라인으로 적어
   탭바(2번)·바텀시트(3번)와 합쳐 몇 개인지 한눈에 보이게 했다. */
export function Header({ actions }: { actions?: ReactNode }) {
  return (
    <header
      className="sticky top-0 z-30"
      style={{
        // 노치 기기에서 워드마크가 상태바에 물리지 않게. viewportFit: "cover" 와 한 쌍.
        paddingTop: "env(safe-area-inset-top)",
        background: "rgba(255,255,255,.72)",
        backdropFilter: "blur(18px) saturate(1.5)",
        WebkitBackdropFilter: "blur(18px) saturate(1.5)",
        borderBottom: "1px solid rgba(255,255,255,.85)",
      }}
    >
      <div className="mx-auto flex h-13 w-full max-w-md items-center justify-between gap-3 px-4">
        <Link
          href="/"
          className="gradient-text text-[17px] font-extrabold tracking-tight"
          aria-label="Clothes-Cut 홈"
        >
          Clothes-Cut
        </Link>

        {/* 우측 액션 슬롯. 레이아웃에서는 비어 있고, 페이지가 채우고 싶으면
            이 노드(#header-actions)에 포털로 붙이거나 자체 <Header actions=…>를 쓴다. */}
        <div id="header-actions" className="flex min-h-11 items-center gap-1.5">
          {actions}
        </div>
      </div>
    </header>
  );
}

export default Header;
