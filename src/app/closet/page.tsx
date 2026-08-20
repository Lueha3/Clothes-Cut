/* 옷장 — 업로드한 아이템을 모아두고 다음 착장에서 다시 꺼내 쓰는 화면.
   업로드·배경제거·자동 분류 파이프라인은 W3. 지금은 분류 필터와 빈 상태만 있다. */

import type { Metadata } from "next";

import { PlusIcon } from "@/components/icons";
import { Button } from "@/components/ui";

import ClosetFilter from "./ClosetFilter";

export const metadata: Metadata = { title: "옷장" };

export default function ClosetPage() {
  return (
    <div className="flex flex-col gap-5 px-4 pt-6 pb-10">
      <section className="flex flex-col gap-2">
        <span className="eyebrow-label">옷장</span>
        <h1 className="text-2xl leading-snug font-extrabold tracking-tight text-ink">
          모아둔 옷을 다시 꺼내 입혀요
        </h1>
      </section>

      {/* 업로드 진입. 실제 파일 선택·압축·업로드는 W3 에서 이 버튼에 붙는다. */}
      <div className="flex flex-col gap-2">
        <Button size="lg" variant="coral" icon={<PlusIcon className="h-5 w-5" />} disabled>
          옷 추가
        </Button>
        <p className="px-1 text-xs text-ink-soft">
          사진은 한 번에 여러 장 올려도 괜찮아요.
        </p>
      </div>

      <ClosetFilter />
    </div>
  );
}
