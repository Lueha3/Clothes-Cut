/* 홈 — 저장된 아바타를 고르고 새 착장을 시작하는 진입 화면.
   아바타·생성물 데이터는 W1~W2 에서 붙는다. 지금은 빈 상태만 있는데,
   빈 칸을 그대로 두지 않고 "다음에 뭘 하면 되는지"를 문구로 들고 있게 했다. */

import type { Metadata } from "next";
import Link from "next/link";

import { PlusIcon } from "@/components/icons";
import { GlassCard } from "@/components/ui";
import { MAX_AVATARS_PER_USER } from "@/lib/types";

export const metadata: Metadata = { title: "홈" };

/* 캐러셀에 미리 깔아두는 빈 슬롯 수. 저장된 아바타가 생기면 그 개수만큼 줄어든다. */
const EMPTY_AVATAR_SLOTS = [1, 2, 3];

export default function HomePage() {
  return (
    <div className="flex flex-col gap-7 px-4 pt-6 pb-10">
      <section className="flex flex-col gap-2">
        <span className="eyebrow-label">오늘의 착장</span>
        <h1 className="text-2xl leading-snug font-extrabold tracking-tight text-ink">
          어떤 옷을 입혀볼까요?
        </h1>
        <p className="text-sm leading-relaxed text-ink-soft">
          아바타를 고르고 옷을 올리면, 숏폼 한 편까지 10분이면 돼요.
        </p>
      </section>

      <section aria-labelledby="home-avatars" className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 id="home-avatars" className="text-[15px] font-bold text-ink">
            내 아바타
          </h2>
          <span className="text-xs font-semibold text-ink-soft">
            0 / {MAX_AVATARS_PER_USER}
          </span>
        </div>

        {/* -mx-4 px-4: 카드가 화면 가장자리까지 흘러가도 첫 카드 왼쪽 여백은 본문과 맞춘다. */}
        <ul className="tray-scroll -mx-4 flex gap-3 px-4 py-1">
          <li>
            <Link
              href="/my"
              className="press flex h-[140px] w-[104px] flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-coral-deep/55 bg-white/85 text-center text-[13px] font-bold text-coral-ink"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full border border-dashed border-coral-deep/55">
                <PlusIcon className="h-5 w-5" />
              </span>
              아바타 만들기
            </Link>
          </li>

          {EMPTY_AVATAR_SLOTS.map((slot) => (
            <li key={slot}>
              <div className="flex h-[140px] w-[104px] flex-col items-center justify-center gap-1.5 rounded-3xl border border-dashed border-sky-line bg-white/45 text-center">
                <span className="text-xs font-semibold text-ink-faint">빈 슬롯</span>
              </div>
            </li>
          ))}
        </ul>

        <p className="text-xs leading-relaxed text-ink-soft">
          사진 몇 장이면 아바타가 생겨요. 한 번 만들어두면 계속 같은 얼굴로 입힐 수 있어요.
        </p>
      </section>

      <Link
        href="/dresser"
        className="btn-coral press w-full rounded-2xl px-5 py-3.5 text-center text-base"
      >
        새 착장 시작하기
      </Link>

      <section aria-labelledby="home-recent" className="flex flex-col gap-3">
        <h2 id="home-recent" className="text-[15px] font-bold text-ink">
          최근 만든 것
        </h2>

        <GlassCard as="article" className="flex flex-col items-start gap-3">
          <div className="flex items-center gap-3">
            {/* 9:16 자리표시 — 결과물이 어떤 비율로 나오는지 미리 보여준다. */}
            <div
              className="w-14 shrink-0 rounded-xl border border-dashed border-canvas-line bg-canvas-neutral"
              style={{ aspectRatio: "9 / 16" }}
              aria-hidden="true"
            />
            <div className="flex flex-col gap-1">
              <p className="text-sm font-bold text-ink">아직 만든 결과물이 없어요</p>
              <p className="text-xs leading-relaxed text-ink-soft">
                착장을 마치면 이미지와 영상이 여기에 차곡차곡 모여요.
              </p>
            </div>
          </div>

          <Link href="/create" className="btn-ghost press rounded-2xl px-4 text-sm">
            생성 화면 보기
          </Link>
        </GlassCard>
      </section>
    </div>
  );
}
