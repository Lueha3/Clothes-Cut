import type { CSSProperties } from "react";

/* ─────────────────────────────────────────────────────────────
 * Skeleton — 로딩 자리표시
 *
 * 셔머는 globals.css 의 .skeleton 이 담당한다. 무채색(canvas-neutral↔흰색)
 * 그라데이션인 이유: 드레스룸 캔버스 옆에서도 옷 색 지각을 오염시키지 않기 위함.
 * prefers-reduced-motion 에서는 전역 규칙이 애니메이션을 멈춰 정지된 회색 블록이 된다.
 *
 * 스켈레톤 자체는 aria-hidden 이다. 진행 상황은 label 로 준 sr-only 문구가 알린다 —
 * 자리표시 도형 수십 개가 스크린리더에 읽히면 그냥 소음이다.
 * ───────────────────────────────────────────────────────────── */

export type SkeletonProps = {
  width?: number | string;
  height?: number | string;
  /** 원형(아바타 썸네일·색 칩 자리). */
  circle?: boolean;
  radius?: number | string;
  className?: string;
  /** 있으면 sr-only 상태 문구를 함께 렌더한다. 화면당 한 곳에만 주는 게 좋다. */
  label?: string;
  style?: CSSProperties;
};

function toSize(value: number | string | undefined): string | undefined {
  if (value === undefined) return undefined;
  return typeof value === "number" ? `${value}px` : value;
}

export function Skeleton({ width, height, circle = false, radius, className, label, style }: SkeletonProps) {
  const size: CSSProperties = {
    width: toSize(width),
    height: toSize(height),
    borderRadius: circle ? "9999px" : toSize(radius),
    ...style,
  };

  return (
    <>
      <span
        className={["skeleton block", className ?? ""].filter(Boolean).join(" ")}
        style={size}
        aria-hidden="true"
      />
      {label ? (
        <span className="sr-only" role="status">
          {label}
        </span>
      ) : null}
    </>
  );
}

export type SkeletonTextProps = {
  /** 줄 수. 마지막 줄은 짧게 그려 문단처럼 보이게 한다. */
  lines?: number;
  className?: string;
  label?: string;
};

export function SkeletonText({ lines = 3, className, label }: SkeletonTextProps) {
  return (
    <div className={["flex flex-col gap-2", className ?? ""].filter(Boolean).join(" ")}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} height={12} radius={6} width={i === lines - 1 ? "62%" : "100%"} />
      ))}
      {label ? (
        <span className="sr-only" role="status">
          {label}
        </span>
      ) : null}
    </div>
  );
}

export default Skeleton;
