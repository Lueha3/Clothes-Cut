"use client";

import { useMemo, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { create } from "zustand";

/* ─────────────────────────────────────────────────────────────
 * Toast — 짧은 안내 스낵바
 *   "시계는 손목이 어울려요. 자리를 옮겨뒀어요."
 *   "이 색, 팔레트에 담아둘까요?"  (action 으로 담기 버튼)
 *
 * 전역 상태를 zustand 로 두는 이유: 드레스룸 캔버스·업로드 훅·API 래퍼 등
 * 서로 다른 트리에서 같은 토스트를 띄운다. 컴포넌트 트리를 타고 콜백을
 * 내려보내면 그 경로가 전부 클라이언트 컴포넌트로 물든다.
 *
 * 뷰포트는 layout 에 <ToastViewport /> 하나만 마운트한다.
 * 라이브 리전은 항목이 추가되기 전부터 DOM 에 있어야 낭독되기 때문이다.
 * ───────────────────────────────────────────────────────────── */

/** 자동 소멸까지의 기본 시간. 한 문장을 읽고 판단하기에 충분한 길이. */
const DEFAULT_DURATION_MS = 3200;
/** 화면에 동시에 띄우는 최대 개수. 넘으면 가장 오래된 것부터 밀어낸다. */
const MAX_VISIBLE = 3;

export type ToastTone = "info" | "success" | "warn";

export type ToastAction = {
  label: string;
  onClick: () => void;
};

export type ToastInput = {
  message: string;
  tone?: ToastTone;
  /** ms. 0 이면 자동으로 사라지지 않는다(사용자가 닫기를 눌러야 함). */
  duration?: number;
  action?: ToastAction;
};

export type ToastItem = {
  id: string;
  message: string;
  tone: ToastTone;
  duration: number;
  action?: ToastAction;
};

type ToastStore = {
  toasts: ToastItem[];
  show: (input: ToastInput | string) => string;
  dismiss: (id: string) => void;
  clear: () => void;
};

/* 타이머는 스토어 밖 모듈 스코프에 둔다. 상태에 섞으면 렌더마다 비교 대상이 되고,
   뷰포트가 잠깐 언마운트돼도 예약된 소멸이 유지돼야 한다. */
const timers = new Map<string, number>();
let sequence = 0;

function clearTimer(id: string) {
  const timer = timers.get(id);
  if (timer !== undefined) {
    window.clearTimeout(timer);
    timers.delete(id);
  }
}

export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],

  show: (input) => {
    const next: ToastInput = typeof input === "string" ? { message: input } : input;
    sequence += 1;
    const id = `toast-${sequence}`;

    const item: ToastItem = {
      id,
      message: next.message,
      tone: next.tone ?? "info",
      duration: next.duration ?? DEFAULT_DURATION_MS,
      action: next.action,
    };

    set((state) => {
      const overflow = state.toasts.slice(0, Math.max(0, state.toasts.length + 1 - MAX_VISIBLE));
      overflow.forEach((old) => clearTimer(old.id));
      return { toasts: [...state.toasts.slice(overflow.length), item] };
    });

    if (item.duration > 0 && typeof window !== "undefined") {
      timers.set(
        id,
        window.setTimeout(() => get().dismiss(id), item.duration),
      );
    }

    return id;
  },

  dismiss: (id) => {
    clearTimer(id);
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },

  clear: () => {
    get().toasts.forEach((t) => clearTimer(t.id));
    set({ toasts: [] });
  },
}));

/** React 밖(스토어·유틸·fetch 래퍼)에서 토스트를 띄울 때. */
export function showToast(input: ToastInput | string): string {
  return useToastStore.getState().show(input);
}

/**
 * 컴포넌트에서 쓰는 훅.
 * 액션 3개를 따로 select 한다 — 객체를 통째로 만들어 반환하면 매 렌더 새 참조가 되어
 * zustand v5 가 무한 리렌더로 잡는다.
 */
export function useToast() {
  const show = useToastStore((s) => s.show);
  const dismiss = useToastStore((s) => s.dismiss);
  const clear = useToastStore((s) => s.clear);
  return useMemo(() => ({ show, dismiss, clear }), [show, dismiss, clear]);
}

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

/* 점 색은 장식이다. 뜻은 전부 문장이 전달하므로 색만으로 구분되는 정보는 없다. */
const TONE_DOT: Record<ToastTone, string> = {
  info: "bg-skyx-deep",
  success: "bg-plum",
  warn: "bg-coral-deep",
};

function ToastCard({ toast }: { toast: ToastItem }) {
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div className="toast-rise-in glass-flat pointer-events-auto flex w-full items-center gap-3 rounded-2xl py-2.5 pl-4 pr-2">
      <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${TONE_DOT[toast.tone]}`} aria-hidden="true" />
      <p className="min-w-0 flex-1 text-[13.5px] leading-snug text-ink">{toast.message}</p>

      {toast.action ? (
        <button
          type="button"
          className="press min-h-11 shrink-0 rounded-xl px-3 text-[13px] font-bold text-plum"
          onClick={() => {
            toast.action?.onClick();
            dismiss(toast.id);
          }}
        >
          {toast.action.label}
        </button>
      ) : null}

      <button
        type="button"
        aria-label="알림 닫기"
        onClick={() => dismiss(toast.id)}
        className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-faint"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden="true">
          <path d="m6.6 6.6 10.8 10.8M17.4 6.6 6.6 17.4" />
        </svg>
      </button>
    </div>
  );
}

/**
 * 토스트가 그려지는 자리. layout 에 딱 한 번만 마운트한다.
 * body 로 portal 하는 이유는 바텀시트와 같다 — backdrop-filter 조상 안에서
 * fixed 를 쓰면 화면이 아니라 그 조상 기준으로 붙는다.
 */
export function ToastViewport() {
  const mounted = useMounted();
  const toasts = useToastStore((s) => s.toasts);

  if (!mounted) return null;

  return createPortal(
    <div
      // 하단 탭바를 피해 그 위로 띄운다. 두 값 모두 globals.css 의 계약 변수라
      // 탭바 높이가 바뀌어도 여기가 따라온다.
      className="pointer-events-none fixed inset-x-0 mx-auto flex w-full max-w-md flex-col gap-2 px-4"
      style={{
        bottom: "calc(var(--tabbar-h) + env(safe-area-inset-bottom) + 12px)",
        zIndex: "var(--z-toast)",
      }}
      role="status"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} />
      ))}
    </div>,
    document.body,
  );
}

export default ToastViewport;
