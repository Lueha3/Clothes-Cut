import type { ButtonHTMLAttributes, ReactNode } from "react";

/* ─────────────────────────────────────────────────────────────
 * Button — 주 CTA / 보조 / 텍스트 버튼
 *
 * 훅이 없어서 "use client" 를 붙이지 않는다. 클라이언트 화면에서 onClick 을
 * 넘겨 쓰면 그 트리에서만 클라이언트로 잡힌다.
 *
 * 색 규칙: coral #FF6B52 는 장식 전용이라 텍스트로 못 쓴다.
 *   - coral 변형은 .btn-coral(coral-deep→plum 그라데이션) 위 흰 글씨(4.50/6.96).
 *   - soft/ghost 는 plum(#8E3B72) 글씨 — 글래스 위에서도 6.56 이 나온다.
 *     여기에 coral-deep 을 쓰면 글래스 위 4.25 로 본문 기준에 걸린다.
 * ───────────────────────────────────────────────────────────── */

export type ButtonVariant = "coral" | "soft" | "ghost";
export type ButtonSize = "md" | "lg";

export type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** 처리 중 — 스피너 표시 + aria-busy + 클릭 잠금(중복 제출 방지). */
  loading?: boolean;
  /** 스크린리더에 읽힐 대기 안내. 시각 라벨은 그대로 둔 채 상태만 덧붙인다. */
  loadingLabel?: string;
  fullWidth?: boolean;
  /** 라벨 왼쪽 아이콘. loading 중에는 스피너로 교체된다. */
  icon?: ReactNode;
  children?: ReactNode;
};

/* min-h-11 = 44px — 터치 타깃 하한. lg 는 하단 고정 CTA 용. */
const SIZE_CLASS: Record<ButtonSize, string> = {
  md: "min-h-11 gap-1.5 rounded-2xl px-4 text-[15px]",
  lg: "min-h-[52px] w-full gap-2 rounded-2xl px-5 text-base",
};

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  coral: "btn-coral",
  soft: "btn-ghost press rounded-2xl",
  ghost:
    "press inline-flex items-center justify-center font-semibold text-plum " +
    "hover:bg-white/55 disabled:opacity-55 disabled:cursor-not-allowed",
};

function Spinner() {
  /* 모션 최소화 설정에서는 전역 CSS 가 애니메이션을 멈춘다(정지된 링만 남음).
     그래서 대기 상태는 스피너가 아니라 aria-busy + sr-only 문구가 전달한다. */
  return (
    <svg className="h-4 w-4 shrink-0 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.4" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

export function Button({
  variant = "coral",
  size = "md",
  loading = false,
  loadingLabel = "잠시만 기다려 주세요",
  fullWidth = false,
  icon,
  className,
  disabled,
  type = "button",
  children,
  ...rest
}: ButtonProps) {
  const classes = [
    "inline-flex select-none items-center justify-center font-semibold",
    SIZE_CLASS[size],
    VARIANT_CLASS[variant],
    fullWidth ? "w-full" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type={type}
      className={classes}
      // 로딩 중에도 disabled 로 잠근다 — 결제·생성처럼 비용이 나가는 액션의
      // 더블탭 중복 호출을 여기서 한 번 막아 둔다.
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Spinner /> : icon}
      {children}
      {loading ? <span className="sr-only">{loadingLabel}</span> : null}
    </button>
  );
}

export default Button;
