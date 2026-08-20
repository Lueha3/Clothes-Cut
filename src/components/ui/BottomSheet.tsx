"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

/* ─────────────────────────────────────────────────────────────
 * BottomSheet — 모바일 바텀시트 (리컬러 시트 · 업로드 시트 공용)
 *
 * 반드시 document.body 로 portal 한다. backdrop-filter 가 걸린 요소는 자식
 * position:fixed 의 컨테이닝 블록이 되기 때문에, .glass-card 안에서 그대로
 * 렌더하면 시트가 화면이 아니라 그 카드 기준으로 떠서 엉뚱한 곳에 붙는다.
 *
 * 진입/퇴장을 CSS 애니메이션(.sheet-slide-in) 대신 인라인 transform + transition
 * 으로 처리하는 이유: animation-fill-mode: forwards 로 굳은 transform 은 인라인
 * 스타일을 이겨서, 스와이프 중 손가락을 따라가는 translateY 가 먹지 않는다.
 * ───────────────────────────────────────────────────────────── */

/** 퇴장 애니메이션 길이. 이 시간 뒤에 DOM 에서 내린다. */
const CLOSE_MS = 240;
/** 이만큼 끌어내리면 닫는다. */
const DRAG_CLOSE_PX = 96;
/** 짧게 끌었어도 이 속도(px/ms)를 넘으면 튕겨 닫는다. */
const FLICK_VELOCITY = 0.55;

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/* portal 은 브라우저에서만 가능하다. useState+useEffect 로 마운트 플래그를 세우면
   effect 안에서 동기 setState 를 하게 되므로(연쇄 렌더) useSyncExternalStore 로
   서버 스냅샷을 false 로 고정한다 — 하이드레이션 불일치도 같이 막힌다. */
function subscribeNoop() {
  return () => {};
}
function useMounted(): boolean {
  return useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );
}

export type BottomSheetSnap = "auto" | "half" | "full";

export type BottomSheetProps = {
  open: boolean;
  onClose: () => void;
  /** 시트 제목. 주면 aria-labelledby 로 연결된다. */
  title?: string;
  /** 제목을 보이게 두지 않을 때의 접근성 이름. title 이 없으면 반드시 채울 것. */
  label?: string;
  /** auto: 내용만큼(최대 86dvh) · half: 56dvh · full: 92dvh */
  snapHeight?: BottomSheetSnap;
  /** 스크롤 영역 아래 고정되는 영역. 하단 CTA 를 여기에 둔다. */
  footer?: ReactNode;
  /** 오른쪽 위 닫기 버튼 노출. */
  showClose?: boolean;
  children?: ReactNode;
};

const SNAP_CLASS: Record<BottomSheetSnap, string> = {
  auto: "max-h-[86dvh]",
  half: "h-[56dvh]",
  full: "h-[92dvh]",
};

export function BottomSheet({
  open,
  onClose,
  title,
  label,
  snapHeight = "auto",
  footer,
  showClose = true,
  children,
}: BottomSheetProps) {
  const mounted = useMounted();

  /* open prop 을 렌더 중에 상태로 흡수한다. effect 로 옮기면 열릴 때마다
     한 프레임 늦게 반응해 첫 진입 트랜지션이 튄다. */
  const [prevOpen, setPrevOpen] = useState(open);
  const [rendered, setRendered] = useState(open);
  const [closing, setClosing] = useState(false);
  /** 진입 트랜지션 스위치 — false 로 한 프레임 그린 뒤 true 로 올린다. */
  const [entered, setEntered] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);

  if (prevOpen !== open) {
    setPrevOpen(open);
    if (open) {
      setRendered(true);
      setClosing(false);
      setEntered(false);
      setDragY(0);
    } else {
      // 바로 언마운트하지 않고 아래로 내려가는 동안만 남긴다.
      setClosing(true);
    }
  }

  const sheetRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startY: number; startAt: number; pointerId: number } | null>(null);
  /* onClose 를 ref 로 들고 다닌다. 이걸 effect 의존성에 넣으면 부모가 리렌더될
     때마다(핸들러 identity 가 바뀌면) 포커스가 시트로 다시 끌려온다. */
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  const requestClose = useCallback(() => {
    onCloseRef.current();
  }, []);

  const titleId = useId();
  const active = rendered && !closing;

  // 퇴장 애니메이션이 끝나면 DOM 에서 내린다.
  useEffect(() => {
    if (!closing) return;
    const timer = window.setTimeout(() => {
      setRendered(false);
      setClosing(false);
    }, CLOSE_MS);
    return () => window.clearTimeout(timer);
  }, [closing]);

  // 진입: 두 프레임 뒤에 올린다. 한 프레임만으로는 초기 transform 이 커밋되기 전에
  // 값이 바뀌어 트랜지션이 통째로 생략되는 기기가 있다.
  useEffect(() => {
    if (!active) return;
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setEntered(true));
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [active]);

  // 배경 스크롤 잠금
  useEffect(() => {
    if (!rendered) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [rendered]);

  // ESC 닫기 + 포커스 트랩 + 닫힌 뒤 포커스 복귀
  useEffect(() => {
    if (!active) return;
    const sheet = sheetRef.current;
    const restoreTo = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    // 컨테이너 자체에 포커스를 준다 — 스크린리더가 dialog 이름부터 읽고,
    // 이어지는 Tab 이 시트 안 첫 요소로 들어간다.
    sheet?.focus({ preventScroll: true });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        requestClose();
        return;
      }
      if (event.key !== "Tab" || !sheet) return;

      const items = Array.from(sheet.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetWidth > 0 || el.offsetHeight > 0,
      );
      if (items.length === 0) {
        event.preventDefault();
        sheet.focus({ preventScroll: true });
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];
      const focused = document.activeElement;

      if (event.shiftKey && (focused === first || focused === sheet)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && focused === last) {
        event.preventDefault();
        first.focus();
      }
    };

    // capture 단계로 잡는다. 시트 안 입력창(HEX 입력 등)이 keydown 을 먼저
    // 삼켜도 ESC 는 항상 시트에 도착해야 한다.
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      restoreTo?.focus({ preventScroll: true });
    };
  }, [active, requestClose]);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    // 헤더 안 닫기 버튼을 누른 경우엔 드래그를 시작하지 않는다.
    // 포인터를 캡처해 버리면 버튼의 click 이 안 나간다.
    if (event.target instanceof Element && event.target.closest("button")) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;

    dragRef.current = { startY: event.clientY, startAt: performance.now(), pointerId: event.pointerId };
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const delta = event.clientY - drag.startY;
    // 위로 끌 때는 고무줄처럼 1/4 만 따라간다 — 시트가 화면 위로 떠오르면 어색하다.
    setDragY(delta > 0 ? delta : delta * 0.25);
  };

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setDragging(false);

    const delta = event.clientY - drag.startY;
    const elapsed = Math.max(1, performance.now() - drag.startAt);
    const velocity = delta / elapsed;

    if (delta > DRAG_CLOSE_PX || (delta > 24 && velocity > FLICK_VELOCITY)) {
      requestClose();
      return;
    }
    setDragY(0);
  };

  if (!mounted || !rendered) return null;

  const shown = active && entered;
  const transform = shown ? `translateY(${dragY}px)` : "translateY(100%)";

  return createPortal(
    <div className="fixed inset-0 flex items-end justify-center" style={{ zIndex: "var(--z-sheet)" }}>
      {/* 딤 — 검정이 아니라 하늘 잉크 반투명. 하늘 배경 위에서 검정은 탁해 보인다.
          touch-action: none 으로 뒤 페이지가 손가락을 따라 스크롤되는 것도 막는다. */}
      <div
        aria-hidden="true"
        onClick={requestClose}
        className="absolute inset-0 touch-none"
        style={{
          background: "rgba(46,110,158,.28)",
          backdropFilter: "blur(2px)",
          WebkitBackdropFilter: "blur(2px)",
          opacity: shown ? 1 : 0,
          transition: "opacity 200ms ease-out",
        }}
      />

      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={title ? undefined : label}
        tabIndex={-1}
        className={`glass-card relative flex w-full max-w-md flex-col rounded-b-none outline-none ${SNAP_CLASS[snapHeight]}`}
        style={{
          // 뒤 콘텐츠가 비치면 읽기 어렵다 — 시트만 불투명도를 올린다.
          background: "rgba(255,255,255,.96)",
          transform,
          transition: dragging ? "none" : "transform 300ms cubic-bezier(.16,1,.3,1)",
        }}
      >
        {/* 손잡이 + 제목 = 드래그 영역. .drag-stage 가 touch-action/user-select/
            컨텍스트 메뉴를 한 번에 정리한다(iOS 롱프레스 대응). */}
        <div
          className="drag-stage shrink-0 px-5 pt-3"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <div className="mx-auto h-1 w-9 rounded-full bg-ink-faint/35" aria-hidden="true" />
          <div className="mt-3 flex min-h-8 items-center justify-between gap-3">
            {title ? (
              <h2 id={titleId} className="text-[17px] font-bold text-ink">
                {title}
              </h2>
            ) : (
              <span />
            )}
            {showClose ? (
              <button
                type="button"
                onClick={requestClose}
                aria-label="닫기"
                className="press -mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-soft hover:bg-white/70"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="m6.6 6.6 10.8 10.8M17.4 6.6 6.6 17.4" />
                </svg>
              </button>
            ) : null}
          </div>
        </div>

        {/* overscroll-contain: 시트 안을 끝까지 스크롤해도 뒤 페이지로 넘어가지 않는다. */}
        <div className={`min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-2 ${footer ? "pb-3" : "safe-bottom"}`}>
          {children}
        </div>

        {footer ? (
          <div className="safe-bottom shrink-0 border-t border-sky-line/60 px-5 pt-3">{footer}</div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

export default BottomSheet;
