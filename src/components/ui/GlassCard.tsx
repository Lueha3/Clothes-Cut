import type { HTMLAttributes, ReactNode } from "react";

/* ─────────────────────────────────────────────────────────────
 * GlassCard — 글래스 서피스 래퍼
 *
 * 서버 컴포넌트로 남긴다("use client" 없음). 상태도 이벤트도 없어서
 * 홈·옷장 같은 서버 렌더 화면에서 그대로 쓸 수 있고, 클라이언트 트리
 * 안에서 import 하면 그때만 클라이언트 번들에 섞인다.
 * ───────────────────────────────────────────────────────────── */

/** 카드로 쓸 만한 시맨틱 태그만 허용한다. 전부 HTMLAttributes<HTMLElement>를
    받으므로 제네릭 없이도 타입이 정확하다. */
type GlassCardTag = "div" | "section" | "article" | "aside" | "li" | "header" | "footer";

export type GlassCardVariant = "glass" | "flat" | "soft";

export type GlassCardProps = HTMLAttributes<HTMLElement> & {
  as?: GlassCardTag;
  /**
   * glass: backdrop-filter 가 실제로 켜지는 기본 카드.
   * flat:  같은 룩인데 blur 없음 — 스크롤 컨테이너 안·목록 카드는 반드시 이걸 쓴다.
   * soft:  칩·배지용 얕은 글래스.
   *
   * 기본값이 "flat" 인 이유: 화면당 backdrop-filter 예산이 3~4개인데
   * 헤더·탭바·바텀시트만으로 이미 3개다(디자인 예외 규칙 #3).
   * 본문 카드가 기본으로 blur 를 켜면 그 예산을 조용히 넘긴다.
   */
  variant?: GlassCardVariant;
  /** 상단 4px 코랄→플럼 빛띠. 화면당 1~2곳만 — 남발하면 의미를 잃는다. */
  ribbon?: boolean;
  /** 기본 안쪽 여백(p-5). 캔버스·이미지를 꽉 채우는 카드는 false. */
  padded?: boolean;
  children?: ReactNode;
};

const VARIANT_CLASS: Record<GlassCardVariant, string> = {
  glass: "glass-card",
  flat: "glass-flat",
  soft: "glass-soft rounded-3xl",
};

export function GlassCard({
  as = "div",
  variant = "flat",
  ribbon = false,
  padded = true,
  className,
  children,
  ...rest
}: GlassCardProps) {
  const Component = as;

  /* 클래스 순서로 유틸리티 충돌을 해결할 수 없어서(Tailwind 는 소스 순서가 아니라
     생성된 CSS 순서로 이긴다) 여백은 불리언 prop 으로 켜고 끈다. */
  const classes = [
    VARIANT_CLASS[variant],
    ribbon ? "glass-ribbon" : "",
    padded ? "p-5" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Component className={classes} {...rest}>
      {children}
    </Component>
  );
}

export default GlassCard;
