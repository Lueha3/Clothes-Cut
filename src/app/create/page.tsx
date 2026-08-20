/* 생성 — 착장을 확인하고 이미지 → 영상 순서로 뽑는 화면.
   실제 파이프라인(POST /api/generations → GET 폴링)은 W5. 여기서는 순서를 눈에 보이게
   두는 것이 목적이라, 지시서 미리보기와 결과 자리를 미리 깔아둔다. */

import type { Metadata } from "next";
import Link from "next/link";

import { SlotIcon } from "@/components/icons";
import { Button, GlassCard } from "@/components/ui";
import { SLOT_META, SLOT_ORDER, DEFAULT_ASPECT_RATIO } from "@/lib/types";

export const metadata: Metadata = { title: "생성" };

/* 지시서 미리보기 자리표시. W5 의 compileOutfitPrompt() 결과가 이 자리에 들어간다 —
   지금 진짜 컴파일러를 부르지 않는 이유는 아바타·슬롯 데이터가 아직 없어서다. */
const PROMPT_PREVIEW = `[모델] 저장된 아바타 시트(정면·측면·전신)의 인물 신원을 그대로 유지
[착장] 아직 올린 옷이 없어요
[색]   지정한 팔레트 토큰 없음
[장면] 스튜디오 정면광 · 전신 · ${DEFAULT_ASPECT_RATIO}`;

export default function CreatePage() {
  return (
    <div className="flex flex-col gap-6 px-4 pt-6 pb-10">
      <section className="flex flex-col gap-2">
        <span className="eyebrow-label">마지막 단계</span>
        <h1 className="text-2xl leading-snug font-extrabold tracking-tight text-ink">
          이대로 한 편 만들어 볼까요?
        </h1>
      </section>

      <GlassCard as="section" ribbon aria-labelledby="create-summary" className="flex flex-col gap-4">
        <h2 id="create-summary" className="text-[15px] font-bold text-ink">
          착장 요약
        </h2>

        <div className="flex items-center gap-3">
          <div
            className="h-16 w-16 shrink-0 rounded-2xl border border-dashed border-canvas-line bg-canvas-neutral"
            aria-hidden="true"
          />
          <div className="flex flex-col gap-1">
            <p className="text-sm font-bold text-ink">아바타를 먼저 골라 주세요</p>
            <Link
              href="/dresser"
              className="text-xs font-bold text-plum underline underline-offset-2"
            >
              드레스룸에서 고르기
            </Link>
          </div>
        </div>

        <ul className="grid grid-cols-2 gap-x-2 gap-y-1.5">
          {SLOT_ORDER.map((kind) => (
            <li
              key={kind}
              className="flex min-h-9 items-center gap-1.5 rounded-xl bg-canvas-neutral px-2 py-1.5"
            >
              <SlotIcon name={kind} className="h-4 w-4 shrink-0 text-ink-faint" />
              <span className="truncate text-[13px] font-semibold text-ink">
                {SLOT_META[kind].label}
              </span>
              <span className="ml-auto shrink-0 text-[11px] text-ink-soft">비어 있음</span>
            </li>
          ))}
        </ul>
      </GlassCard>

      {/* details 를 쓰는 이유: 지시서는 평소엔 접혀 있어야 하고, 여는 동작에 JS 가 필요 없다.
          클라이언트 컴포넌트를 하나 늘리지 않으려는 선택이기도 하다. */}
      <details className="glass-flat p-5">
        <summary className="cursor-pointer text-[15px] font-bold text-ink">
          지시서 미리보기
        </summary>
        <p className="mt-2 text-xs leading-relaxed text-ink-soft">
          착장을 마치면 이 내용 그대로 모델에게 전달돼요.
        </p>
        <pre className="mt-3 overflow-x-auto rounded-2xl bg-canvas-neutral p-3 font-mono text-[11px] leading-relaxed whitespace-pre text-ink-soft">
          {PROMPT_PREVIEW}
        </pre>
      </details>

      <section aria-label="생성 시작" className="flex flex-col gap-2">
        <Button size="lg" variant="coral" disabled>
          이미지 생성
        </Button>
        <p className="px-1 text-xs text-ink-soft">
          슬롯에 옷을 하나라도 올리면 켜져요.
        </p>

        <Button size="lg" variant="soft" disabled className="mt-2">
          영상 만들기
        </Button>
        <p className="px-1 text-xs text-ink-soft">
          이미지를 먼저 만들면 열려요. 영상은 {DEFAULT_ASPECT_RATIO} 세로로 나와요.
        </p>
      </section>

      <section aria-labelledby="create-result" className="flex flex-col gap-3">
        <h2 id="create-result" className="text-[15px] font-bold text-ink">
          결과
        </h2>

        <GlassCard as="article" className="flex items-center gap-3">
          <div
            className="w-16 shrink-0 rounded-xl border border-dashed border-canvas-line bg-canvas-neutral"
            style={{ aspectRatio: "9 / 16" }}
            aria-hidden="true"
          />
          <div className="flex flex-col gap-1">
            <p className="text-sm font-bold text-ink">아직 결과가 없어요</p>
            <p className="text-xs leading-relaxed text-ink-soft">
              만드는 동안 다른 화면을 보고 있어도 괜찮아요. 다 되면 알려드릴게요.
            </p>
          </div>
        </GlassCard>
      </section>
    </div>
  );
}
