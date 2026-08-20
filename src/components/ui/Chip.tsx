"use client";

import type { ReactNode } from "react";

import { triggerHaptic } from "@/lib/haptics";

/* ─────────────────────────────────────────────────────────────
 * Chip — 아이템 트레이 칩 · 팔레트 토큰 칩 · 필터 칩
 *
 * "use client" 를 붙이는 이유: 내부에서 클릭 핸들러를 만들어 햅틱을 울린다.
 * 이게 없으면 서버 컴포넌트가 정적 칩(onClick 없음)을 그릴 때도 터진다.
 *
 * 예외 규칙 #2: 사용자 팔레트 색은 브랜드 코랄·플럼과 헷갈리면 안 된다.
 * swatch 를 주면 HEX 라벨이 기본으로 함께 나온다(hexLabel={false} 로만 끌 수 있음).
 * 색 원의 테두리도 무채색(--canvas-line) 고정 — .color-chip 이 그 역할을 한다.
 * ───────────────────────────────────────────────────────────── */

export type ChipProps = {
  /** 선택 상태. onClick 이 있으면 aria-pressed 로도 나간다. */
  selected?: boolean;
  onClick?: () => void;
  /** 사용자 색 (#RRGGBB). 주면 왼쪽에 색 원이 붙는다. */
  swatch?: string;
  /** swatch 의 HEX 문자열을 함께 노출. 색만으로 정보를 전달하지 않기 위한 기본값 true. */
  hexLabel?: boolean;
  disabled?: boolean;
  size?: "sm" | "md";
  className?: string;
  /** 라벨이 아이콘뿐일 때 반드시 채울 것. */
  "aria-label"?: string;
  children?: ReactNode;
};

export function Chip({
  selected = false,
  onClick,
  swatch,
  hexLabel = true,
  disabled = false,
  size = "md",
  className,
  "aria-label": ariaLabel,
  children,
}: ChipProps) {
  const interactive = typeof onClick === "function";
  const hex = swatch ? swatch.toUpperCase() : null;
  const showHex = Boolean(hex) && hexLabel;

  const classes = [
    "inline-flex shrink-0 select-none items-center gap-2 whitespace-nowrap rounded-full border font-semibold",
    // 누를 수 있는 칩은 예외 없이 44px — 트레이에서 가로로 좁아도 높이는 지킨다.
    interactive ? "min-h-11 px-4 text-sm press" : size === "sm" ? "min-h-8 px-3 text-xs" : "min-h-10 px-3.5 text-[13px]",
    selected
      ? "border-coral-deep bg-white/95 text-coral-ink"
      : "border-sky-line bg-white/70 text-ink-soft",
    disabled ? "cursor-not-allowed opacity-50" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  const inner = (
    <>
      {hex ? (
        <span className="color-chip h-5 w-5" data-selected={selected} style={{ background: hex }} aria-hidden="true" />
      ) : null}
      {children}
      {showHex ? (
        // tabular-nums: 칩이 여러 개 늘어설 때 HEX 폭이 흔들리지 않게
        <span className="font-mono text-[11px] tracking-tight text-ink-soft tabular-nums">{hex}</span>
      ) : null}
    </>
  );

  if (!interactive) {
    return (
      <span className={classes} aria-label={ariaLabel}>
        {inner}
      </span>
    );
  }

  return (
    <button
      type="button"
      className={classes}
      disabled={disabled}
      aria-pressed={selected}
      aria-label={ariaLabel}
      onClick={() => {
        triggerHaptic("light");
        onClick?.();
      }}
    >
      {inner}
    </button>
  );
}

export default Chip;
