/* 드레스룸 — 이 제품의 심장. 무채색 캔버스 위 스티커 슬롯 7개 + 아래 아이템 트레이.
   드래그(dnd-kit)와 탭-투-배정은 W3 에서 붙인다. 이 스텁의 일은 두 가지다:
   (1) 슬롯 좌표계를 SLOT_META 기준으로 못 박고, (2) 마크업 구조를 확정하는 것.
   캔버스에는 하늘색도 blur 도 넣지 않는다(디자인 예외 규칙 #1) — 옷 색을 눈으로
   판별하는 영역이라 배경색과 saturate 가 색 지각을 실제로 왜곡한다. */

import type { Metadata } from "next";
import Link from "next/link";
import { Fragment } from "react";

import { PlusIcon, SlotIcon } from "@/components/icons";
import { GlassCard } from "@/components/ui";
import {
  SLOT_META,
  SLOT_RENDER_ORDER,
  anchorBoxPct,
  anchorCenterPct,
  type ItemKind,
} from "@/lib/types";

export const metadata: Metadata = { title: "드레스룸" };

/* 배지 표시 규칙. 앵커 좌표(SLOT_META)는 정본이라 손대지 않고, "그 앵커 위에 배지를
   어떻게 얹을지"만 여기서 정한다.
     spot=corner : outer 는 top 을 통째로 감싸는 박스라(테두리 사이가 좁다) 중앙에 두면
                   티 배지와 겹친다. 어깨 쪽(박스 좌상단)으로 빼서 떼어놨다.
     label=above : shoes 는 캔버스 맨 아래(93%)라 라벨을 밑에 달면 캔버스를 넘는다. */
const BADGE_LAYOUT: Record<ItemKind, { spot: "center" | "corner"; label: "above" | "below" }> = {
  top: { spot: "center", label: "below" },
  outer: { spot: "corner", label: "below" },
  watch: { spot: "center", label: "below" },
  bag: { spot: "center", label: "below" },
  pants: { spot: "center", label: "below" },
  shoes: { spot: "center", label: "above" },
  belt: { spot: "center", label: "below" },
};

/* 배지 지름 = 캔버스 높이의 9%. 캔버스 최소 높이 360px 에서 약 30px,
   기본 높이(844px 기기의 56svh)에서 약 40px 이 된다. */
const BADGE_HEIGHT_PCT = 9;

/** 아바타 실루엣. M0 프로토타입(prototype/js/app.js)의 100×200 도형을 그대로 옮겼다.
    슬롯 앵커가 이 비율 위에서 잡힌 값이라 도형을 바꾸면 좌표가 어긋난다. */
function AvatarSilhouette() {
  return (
    <svg
      viewBox="0 0 100 200"
      className="absolute inset-0 h-full w-full"
      fill="#DCE0E4"
      aria-hidden="true"
    >
      <circle cx="50" cy="22" r="13" />
      <rect x="30" y="40" width="40" height="60" rx="12" />
      <rect x="18" y="44" width="10" height="52" rx="5" />
      <rect x="72" y="44" width="10" height="52" rx="5" />
      <rect x="32" y="102" width="15" height="82" rx="7" />
      <rect x="53" y="102" width="15" height="82" rx="7" />
      <ellipse cx="39" cy="190" rx="11" ry="6" />
      <ellipse cx="61" cy="190" rx="11" ry="6" />
    </svg>
  );
}

export default function DresserPage() {
  return (
    <div className="flex flex-col gap-4 px-4 pt-5 pb-8">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-lg font-extrabold tracking-tight text-ink">드레스룸</h1>
          <p className="text-xs text-ink-soft">옷을 슬롯에 올리면 바로 입혀져요</p>
        </div>
        <Link href="/create" className="btn-ghost press rounded-2xl px-3.5 text-sm">
          생성으로
        </Link>
      </div>

      {/* 아바타 선택 줄. W2 에서 저장된 아바타 칩으로 채워진다. */}
      <div className="flex items-center gap-2 rounded-2xl border border-sky-line bg-white/70 px-3 py-2">
        <span className="h-8 w-8 shrink-0 rounded-full border border-dashed border-sky-line bg-white/70" aria-hidden="true" />
        <p className="text-xs text-ink-soft">
          아직 고른 아바타가 없어요.{" "}
          <Link href="/my" className="font-bold text-plum underline underline-offset-2">
            아바타 만들기
          </Link>
        </p>
      </div>

      {/* 캔버스. .drag-stage(touch-action:none)를 지금 걸지 않는 이유: 이 영역이 화면의
          절반을 넘어서, 드래그가 없는 지금 걸어버리면 여기에 손가락을 올린 채로는
          페이지를 스크롤할 수 없다. W3 에서 실제 드래그를 붙일 때 함께 켠다. */}
      <section
        aria-label="아바타 착장 캔버스"
        className="canvas-surface relative flex h-[56svh] max-h-[540px] min-h-[360px] items-center justify-center overflow-hidden p-3"
      >
        <p className="sr-only">
          슬롯 7개가 모두 비어 있어요. 아래 트레이에서 옷을 골라 원하는 부위에 올려보세요.
        </p>

        {/* 아바타 무대. 높이는 캔버스에 맞추고 폭은 1:2 비율에서 나온다
            (shrink-0: 플렉스가 폭을 줄여 비율을 깨뜨리지 않게). */}
        <div className="relative h-full w-auto shrink-0" style={{ aspectRatio: "1 / 2" }}>
          <AvatarSilhouette />

          {SLOT_RENDER_ORDER.map((kind) => {
            const meta = SLOT_META[kind];
            const box = anchorBoxPct(kind);
            const center = anchorCenterPct(kind);
            const layout = BADGE_LAYOUT[kind];
            const spot = layout.spot === "corner" ? { x: box.left, y: box.top } : center;

            return (
              /* Fragment 로 감싸는 이유: display:contents 래퍼를 두면 브라우저마다
                 절대배치 자식의 컨테이닝 블록 해석이 갈린다. 박스를 아예 만들지 않는다. */
              <Fragment key={kind}>
                {/* 앵커 박스 = 실제 부착 영역. W3 에서 이 노드가 dnd-kit droppable 이 된다. */}
                <div
                  className="absolute rounded-2xl border border-dashed border-ink-faint/40 bg-white/40"
                  style={{
                    left: `${box.left}%`,
                    top: `${box.top}%`,
                    width: `${box.width}%`,
                    height: `${box.height}%`,
                    zIndex: meta.layer,
                  }}
                  aria-hidden="true"
                />

                {/* 배지 — 비어 있음을 드러내 드롭을 유도한다.
                    크기를 px 가 아니라 캔버스 높이의 %로 잡는 이유: 배지만 고정 크기면
                    화면이 짧은 기기에서 벨트 배지와 바지 배지가 서로 겹친다(둘 사이는
                    앵커 기준 14.5% 뿐이다). %로 두면 어떤 높이에서도 간격이 그대로 유지된다.
                    캔버스가 1:2 비율이라 aspect-ratio 1/1 이면 정사각형이 된다. */}
                <div
                  className="absolute flex items-center justify-center"
                  style={{
                    left: `${spot.x}%`,
                    top: `${spot.y}%`,
                    height: `${BADGE_HEIGHT_PCT}%`,
                    aspectRatio: "1 / 1",
                    transform: "translate(-50%, -50%)",
                    zIndex: meta.layer + 1,
                  }}
                >
                  <span className="flex h-full w-full items-center justify-center rounded-full border border-dashed border-ink-faint/70 bg-white/90 text-ink-faint">
                    <SlotIcon name={kind} className="h-1/2 w-1/2" />
                  </span>
                  {/* 배지 아래 라벨. 문서 흐름에 두면 원이 앵커 중심에서 라벨 높이의
                      절반만큼 밀려 올라가므로 absolute 로 뺀다. */}
                  <span
                    className={`absolute left-1/2 -translate-x-1/2 rounded-full bg-white/90 px-1.5 py-0.5 text-[10px] leading-none font-semibold whitespace-nowrap text-ink-soft ${
                      layout.label === "above" ? "bottom-full mb-0.5" : "top-full mt-0.5"
                    }`}
                  >
                    {meta.label}
                  </span>
                </div>
              </Fragment>
            );
          })}
        </div>
      </section>

      <GlassCard as="section" aria-labelledby="dresser-tray" className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 id="dresser-tray" className="text-[15px] font-bold text-ink">
            아이템 트레이
          </h2>
          <span className="text-xs font-semibold text-ink-soft">0개</span>
        </div>

        <ul className="tray-scroll -mx-1 flex items-center gap-2 px-1 py-1">
          <li>
            <Link
              href="/closet"
              aria-label="옷 추가 — 옷장 열기"
              className="press inline-flex min-h-11 items-center gap-1.5 rounded-full border border-dashed border-coral-deep/55 bg-white/85 px-4 text-sm font-bold text-coral-ink"
            >
              <PlusIcon className="h-4 w-4" />
              옷 추가
            </Link>
          </li>
          <li className="text-xs text-ink-soft">옷을 하나 올려볼까요?</li>
        </ul>

        <p className="text-xs leading-relaxed text-ink-soft">
          칩을 꾹 눌러 슬롯으로 옮겨보세요. 칩을 탭한 다음 슬롯을 눌러도 돼요.
        </p>
      </GlassCard>
    </div>
  );
}
