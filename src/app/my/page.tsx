/* 마이 — 계정, 아바타 슬롯, 팔레트, 사용량을 한 화면에서 본다.
   로그인 상태와 실제 수치는 W1~W4 에서 서버에서 읽어 채운다.
   지금은 비로그인 화면만 그린다(제품에 처음 들어온 사람이 보는 상태이기도 하다). */

import type { Metadata } from "next";

import { GlassCard } from "@/components/ui";
import { MAX_AVATARS_PER_USER } from "@/lib/types";

export const metadata: Metadata = { title: "마이" };

export default function MyPage() {
  return (
    <div className="flex flex-col gap-5 px-4 pt-6 pb-10">
      <h1 className="text-2xl leading-snug font-extrabold tracking-tight text-ink">마이</h1>

      <GlassCard as="section" ribbon aria-labelledby="my-account" className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <span
            className="h-12 w-12 shrink-0 rounded-full border border-dashed border-sky-line bg-white/70"
            aria-hidden="true"
          />
          <div className="flex flex-col gap-0.5">
            <h2 id="my-account" className="text-[15px] font-bold text-ink">
              로그인하고 시작해볼까요?
            </h2>
            <p className="text-xs leading-relaxed text-ink-soft">
              아바타와 옷장, 만든 영상이 계정에 저장돼요.
            </p>
          </div>
        </div>

        {/* Route Handler 로 가는 링크라 next/link 가 아니라 순수 <a> 를 쓴다
            (프리페치가 OAuth 리다이렉트를 미리 태워버리면 안 된다). */}
        <a
          href="/api/auth/login?next=/my"
          className="btn-coral press w-full rounded-2xl px-5 py-3 text-center text-[15px]"
        >
          구글로 계속하기
        </a>
      </GlassCard>

      <GlassCard as="section" aria-labelledby="my-avatars" className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-2">
          <h2 id="my-avatars" className="text-[15px] font-bold text-ink">
            아바타
          </h2>
          <span className="text-xs font-semibold text-ink-soft">
            0 / {MAX_AVATARS_PER_USER}
          </span>
        </div>
        <p className="text-xs leading-relaxed text-ink-soft">
          아바타는 {MAX_AVATARS_PER_USER}명까지 저장할 수 있어요. 사진 몇 장이면 하나 만들어져요.
        </p>
      </GlassCard>

      <GlassCard as="section" aria-labelledby="my-palette" className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-2">
          <h2 id="my-palette" className="text-[15px] font-bold text-ink">
            팔레트
          </h2>
          <span className="text-xs font-semibold text-ink-soft">토큰 0개</span>
        </div>
        <p className="text-xs leading-relaxed text-ink-soft">
          자주 쓰는 색을 토큰으로 담아두면, 여러 아이템 색을 한 번에 바꿀 수 있어요.
        </p>
      </GlassCard>

      <GlassCard as="section" aria-labelledby="my-usage" className="flex flex-col gap-3">
        <h2 id="my-usage" className="text-[15px] font-bold text-ink">
          이번 달 사용량
        </h2>
        <dl className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-0.5 rounded-2xl bg-canvas-neutral px-3 py-2.5">
            <dt className="text-[11px] font-semibold text-ink-soft">이미지</dt>
            {/* tabular-nums: 숫자가 늘어나도 두 칸의 폭이 흔들리지 않게 */}
            <dd className="text-lg font-extrabold tabular-nums text-ink">0건</dd>
          </div>
          <div className="flex flex-col gap-0.5 rounded-2xl bg-canvas-neutral px-3 py-2.5">
            <dt className="text-[11px] font-semibold text-ink-soft">영상</dt>
            <dd className="text-lg font-extrabold tabular-nums text-ink">0건</dd>
          </div>
        </dl>
      </GlassCard>
    </div>
  );
}
