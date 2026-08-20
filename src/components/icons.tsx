import type { ReactNode, SVGProps } from "react";

/* ─────────────────────────────────────────────────────────────
 * 인라인 SVG 아이콘 세트
 *
 * 이모지를 쓰지 않는 이유: 기기·OS마다 글리프 디자인과 광학 크기가 달라
 * 탭바 정렬과 선 굵기가 무너진다. 전부 24x24 뷰박스 / 1.8px 라운드 스트로크 /
 * currentColor 로 직접 작도해 색·굵기를 CSS 한 곳에서 제어한다.
 * ───────────────────────────────────────────────────────────── */

const BASE = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  // 아이콘은 항상 텍스트 라벨과 함께 쓰므로 스크린리더에서 숨긴다.
  "aria-hidden": true,
} satisfies SVGProps<SVGSVGElement>;

type Glyph = { outline: ReactNode; solid: ReactNode };

/* 탭 글리프 — 비활성은 outline, 활성은 같은 실루엣의 solid.
   solid 는 fillRule="evenodd" 로 안쪽 디테일(문·손잡이·얼굴)을 구멍으로 남겨
   채워도 무엇을 그린 아이콘인지 알아볼 수 있게 했다. */
const TAB_GLYPHS = {
  // 홈 — 집
  home: {
    outline: (
      <path d="M4.3 11.4 12 4.6l7.7 6.8V19a1.4 1.4 0 0 1-1.4 1.4h-4.1V17a2.2 2.2 0 0 0-4.4 0v3.4H5.7A1.4 1.4 0 0 1 4.3 19Z" />
    ),
    solid: (
      <path
        fill="currentColor"
        stroke="none"
        fillRule="evenodd"
        d="M12 4.6 4.3 11.4V19a1.4 1.4 0 0 0 1.4 1.4h12.6a1.4 1.4 0 0 0 1.4-1.4v-7.6L12 4.6Zm0 10.2a2.2 2.2 0 0 1 2.2 2.2v3.4H9.8V17a2.2 2.2 0 0 1 2.2-2.2Z"
      />
    ),
  },
  // 드레스룸 — 옷걸이 (옷장(closet)과 실루엣이 겹치지 않게 행거로 구분)
  dresser: {
    outline: (
      <>
        <path d="M12 8.9V7.6a1.8 1.8 0 1 1 1.8-1.8" />
        <path d="M12 8.9 4.1 14.9c-.9.7-.4 2.1.7 2.1h14.4c1.1 0 1.6-1.4.7-2.1L12 8.9Z" />
      </>
    ),
    solid: (
      <>
        <path d="M12 8.9V7.6a1.8 1.8 0 1 1 1.8-1.8" />
        <path
          fill="currentColor"
          stroke="none"
          d="M12 8.9 4.1 14.9c-.9.7-.4 2.1.7 2.1h14.4c1.1 0 1.6-1.4.7-2.1L12 8.9Z"
        />
      </>
    ),
  },
  // 생성 — 스파클(별 2개). 가운데 FAB 안에서는 흰색으로 상속된다.
  create: {
    outline: (
      <>
        <path d="M12 3.8c.95 3.7 2.5 5.25 6.2 6.2-3.7.95-5.25 2.5-6.2 6.2-.95-3.7-2.5-5.25-6.2-6.2 3.7-.95 5.25-2.5 6.2-6.2Z" />
        <path d="M17.8 14.6c.45 1.75 1.2 2.5 2.95 2.95-1.75.45-2.5 1.2-2.95 2.95-.45-1.75-1.2-2.5-2.95-2.95 1.75-.45 2.5-1.2 2.95-2.95Z" />
      </>
    ),
    solid: (
      <>
        <path
          fill="currentColor"
          stroke="none"
          d="M12 3.8c.95 3.7 2.5 5.25 6.2 6.2-3.7.95-5.25 2.5-6.2 6.2-.95-3.7-2.5-5.25-6.2-6.2 3.7-.95 5.25-2.5 6.2-6.2Z"
        />
        <path
          fill="currentColor"
          stroke="none"
          d="M17.8 14.6c.45 1.75 1.2 2.5 2.95 2.95-1.75.45-2.5 1.2-2.95 2.95-.45-1.75-1.2-2.5-2.95-2.95 1.75-.45 2.5-1.2 2.95-2.95Z"
        />
      </>
    ),
  },
  // 옷장 — 양문 캐비닛
  closet: {
    outline: (
      <>
        <rect x="4.3" y="3.6" width="15.4" height="16.8" rx="2.4" />
        <path d="M12 3.6v16.8" />
        <path d="M9.7 10.9v2" />
        <path d="M14.3 10.9v2" />
      </>
    ),
    solid: (
      <path
        fill="currentColor"
        stroke="none"
        fillRule="evenodd"
        d="M6.7 3.6h10.6a2.4 2.4 0 0 1 2.4 2.4v12a2.4 2.4 0 0 1-2.4 2.4H6.7a2.4 2.4 0 0 1-2.4-2.4V6a2.4 2.4 0 0 1 2.4-2.4ZM11.4 5v14h1.2V5h-1.2ZM8.4 10.9a.7.7 0 0 1 1.4 0v1.4a.7.7 0 0 1-1.4 0v-1.4ZM14.2 10.9a.7.7 0 0 1 1.4 0v1.4a.7.7 0 0 1-1.4 0v-1.4Z"
      />
    ),
  },
  // 마이 — 원 안의 사람
  my: {
    outline: (
      <>
        <circle cx="12" cy="12" r="8.6" />
        <circle cx="12" cy="9.7" r="3" />
        <path d="M5.9 18c1.2-2.7 3.4-4.2 6.1-4.2s4.9 1.5 6.1 4.2" />
      </>
    ),
    solid: (
      <path
        fill="currentColor"
        stroke="none"
        fillRule="evenodd"
        d="M12 3.4a8.6 8.6 0 1 0 0 17.2 8.6 8.6 0 0 0 0-17.2ZM12 6.7a3 3 0 1 1 0 6 3 3 0 0 1 0-6ZM12 13.8c2.7 0 4.9 1.5 6.1 4.2a8.57 8.57 0 0 1-12.2 0c1.2-2.7 3.4-4.2 6.1-4.2Z"
      />
    ),
  },
} satisfies Record<string, Glyph>;

export type TabIconKey = keyof typeof TAB_GLYPHS;

/** 하단 탭 아이콘. active=true면 같은 실루엣의 솔리드 변형으로 전환된다. */
export function TabIcon({
  name,
  active = false,
  ...props
}: SVGProps<SVGSVGElement> & { name: TabIconKey; active?: boolean }) {
  return (
    <svg {...BASE} {...props}>
      {active ? TAB_GLYPHS[name].solid : TAB_GLYPHS[name].outline}
    </svg>
  );
}

/* 아이템 슬롯 7종 — 드레스룸 빈 슬롯 배지·트레이 칩·옷장 필터에서 공통으로 쓴다.
   색 맵을 두지 않는 이유: 캔버스는 무채색 규칙(예외 규칙 #1)이라 아이콘에
   브랜드 색을 칠하면 옷 색 지각이 흔들린다. 색은 쓰는 쪽에서 ink 계열로만. */
const SLOT_GLYPHS = {
  // 티(상의)
  top: (
    <path d="M8.8 4.2 4.4 6.6l1.8 3.8 1.6-.8v9.2a1.2 1.2 0 0 0 1.2 1.2h6a1.2 1.2 0 0 0 1.2-1.2V9.6l1.6.8 1.8-3.8-4.4-2.4a3.4 3.4 0 0 1-6.4 0Z" />
  ),
  // 아우터 — 앞이 열린 재킷(라펠 + 중심선)
  outer: (
    <>
      <path d="M9 4.2 4.5 6.5l1.4 4.9 1.9-.6v8a1.2 1.2 0 0 0 1.2 1.2h6a1.2 1.2 0 0 0 1.2-1.2v-8l1.9.6 1.4-4.9L15 4.2Z" />
      <path d="M9 4.2 12 7.8l3-3.6" />
      <path d="M12 7.8v11.9" />
    </>
  ),
  // 시계 — 케이스 + 위아래 스트랩
  watch: (
    <>
      <circle cx="12" cy="12" r="4.1" />
      <path d="M9.7 8.4 10 4.6h4l.3 3.8" />
      <path d="M9.7 15.6 10 19.4h4l.3-3.8" />
      <path d="M12 10.3V12l1.3.9" />
    </>
  ),
  // 가방 — 손잡이 달린 토트
  bag: (
    <>
      <path d="M5.6 8.6h12.8l.9 10.1a1.4 1.4 0 0 1-1.4 1.5H6.1a1.4 1.4 0 0 1-1.4-1.5Z" />
      <path d="M9.1 8.6V7.1a2.9 2.9 0 0 1 5.8 0v1.5" />
    </>
  ),
  // 바지 — 허리밴드 + 두 다리
  pants: (
    <>
      <path d="M7.6 3.8h8.8l.7 16.4h-3.8L12 11.6l-1.3 8.6H6.9Z" />
      <path d="M7.6 6.6h8.8" />
    </>
  ),
  // 신발 — 스니커 측면
  shoes: (
    <>
      <path d="M4.6 16.1c1.6 0 2.7-.6 3.5-1.6l2.3-2.9c.5-.6 1.3-.7 1.9-.2l.8.7 4.7 2.2a2.6 2.6 0 0 1 1.5 2.4v1.4a.8.8 0 0 1-.8.8H5.4a.8.8 0 0 1-.8-.8Z" />
      <path d="m12.4 12.7-1.7 1.9" />
    </>
  ),
  // 벨트 — 스트랩 + 버클
  belt: (
    <>
      <rect x="3.2" y="9.4" width="17.6" height="5.2" rx="1.6" />
      <rect x="9.4" y="8.1" width="5.2" height="7.8" rx="1.6" />
      <path d="M14.6 12h2" />
    </>
  ),
} satisfies Record<string, ReactNode>;

export type SlotIconKey = keyof typeof SLOT_GLYPHS;

/** 아이템 슬롯 아이콘 (top/outer/watch/bag/pants/shoes/belt). */
export function SlotIcon({
  name,
  ...props
}: SVGProps<SVGSVGElement> & { name: SlotIconKey }) {
  return (
    <svg {...BASE} {...props}>
      {SLOT_GLYPHS[name]}
    </svg>
  );
}

/** 플러스 — "＋ 옷 추가" 칩, 빈 아바타 슬롯 등. */
export function PlusIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...BASE} {...props}>
      <path d="M12 5.4v13.2M5.4 12h13.2" />
    </svg>
  );
}

/** 왼쪽 셰브론 — 뒤로가기 버튼(헤더 actions 슬롯 등). */
export function ChevronLeftIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...BASE} {...props}>
      <path d="M14.6 5.4 8 12l6.6 6.6" />
    </svg>
  );
}
