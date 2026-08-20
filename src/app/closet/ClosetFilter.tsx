"use client";

/* 옷장 분류 필터 + 그리드.
   페이지에서 이 조각만 클라이언트로 떼어낸 이유: 선택 상태(useState) 하나 때문에
   화면 전체를 클라이언트로 물들일 필요가 없다. 아이템 목록이 붙는 W3 에서도
   서버에서 받은 데이터를 props 로 내려주면 이 경계가 그대로 유지된다. */

import { useState } from "react";

import { SlotIcon } from "@/components/icons";
import { Chip, GlassCard } from "@/components/ui";
import { SLOT_META, SLOT_ORDER, type ItemKind } from "@/lib/types";

type Filter = ItemKind | "all";

export function ClosetFilter() {
  const [filter, setFilter] = useState<Filter>("all");

  /* 조사(이/가) 때문에 라벨을 문장에 그대로 끼우면 "티(상의)이 없어요"가 된다.
     분류 이름은 문장 앞에 떼어놓고 뒤 문장은 고정으로 둔다. */
  const emptyTitle =
    filter === "all" ? "옷장이 아직 비어 있어요" : `${SLOT_META[filter].label} 분류에 담긴 옷이 없어요`;

  return (
    <>
      <ul className="tray-scroll -mx-4 flex gap-2 px-4 py-1" aria-label="분류 필터">
        <li>
          <Chip selected={filter === "all"} onClick={() => setFilter("all")}>
            전체
          </Chip>
        </li>
        {SLOT_ORDER.map((kind) => (
          <li key={kind}>
            <Chip selected={filter === kind} onClick={() => setFilter(kind)}>
              <SlotIcon name={kind} className="h-4 w-4" />
              {SLOT_META[kind].label}
            </Chip>
          </li>
        ))}
      </ul>

      <GlassCard as="section" className="flex flex-col items-start gap-3">
        <p className="text-sm font-bold text-ink">{emptyTitle}</p>
        <p className="text-xs leading-relaxed text-ink-soft">
          옷 사진을 올리면 배경을 지우고 종류까지 자동으로 정리해 드려요. 한 번 올려두면
          다음 착장에서도 계속 꺼내 쓸 수 있어요.
        </p>

        {/* 빈 그리드 자리. 아이템이 생기면 이 3칸 자리에 카드가 채워진다. */}
        <div className="grid w-full grid-cols-3 gap-2" aria-hidden="true">
          {[1, 2, 3].map((cell) => (
            <div
              key={cell}
              className="rounded-2xl border border-dashed border-canvas-line bg-canvas-neutral"
              style={{ aspectRatio: "1 / 1" }}
            />
          ))}
        </div>
      </GlassCard>
    </>
  );
}

export default ClosetFilter;
