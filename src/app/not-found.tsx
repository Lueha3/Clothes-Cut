/* 404 — 주소가 어긋났을 때. 사과보다 다음 행동을 크게 둔다. */

import type { Metadata } from "next";
import Link from "next/link";

import { GlassCard } from "@/components/ui";

export const metadata: Metadata = { title: "찾는 화면이 없어요" };

export default function NotFound() {
  return (
    <div className="flex flex-col gap-5 px-4 pt-10 pb-10">
      <GlassCard as="section" ribbon className="flex flex-col items-start gap-3">
        <span className="eyebrow-label">404</span>
        <h1 className="text-xl font-extrabold tracking-tight text-ink">
          찾는 화면이 없어요
        </h1>
        <p className="text-sm leading-relaxed text-ink-soft">
          주소가 바뀌었거나 지워진 화면일 수 있어요. 홈에서 다시 시작해볼까요?
        </p>

        <div className="flex w-full flex-col gap-2 pt-1">
          <Link
            href="/"
            className="btn-coral press w-full rounded-2xl px-5 py-3 text-center text-[15px]"
          >
            홈으로 가기
          </Link>
          <Link
            href="/dresser"
            className="btn-ghost press w-full rounded-2xl px-5 py-3 text-center text-[15px]"
          >
            드레스룸 열기
          </Link>
        </div>
      </GlassCard>
    </div>
  );
}
