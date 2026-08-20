/**
 * 짧은 터치 진동 — 탭 이동·드래그 성공처럼 손끝으로 확인시키고 싶은 순간에 쓴다.
 *
 * 플랫폼 한계: Android(Chrome 계열)는 Vibration API를 지원하지만, iOS Safari/WebKit은
 * 홈 화면 PWA를 포함해 웹 콘텐츠에 진동 API를 아예 노출하지 않는다 — 웹 코드로
 * 우회할 방법이 없는 플랫폼 제약이다. 그래서 feature-detect 후 조용히 no-op 한다.
 *
 * 따라서 햅틱만으로 상태를 전달하는 UI를 만들면 안 된다. 드롭 성공·오분류 스냅 같은
 * 피드백은 반드시 시각 신호(하이라이트·토스트)와 함께 줄 것.
 */

export type HapticPattern = "light" | "medium" | "success";

/* light: 탭 이동·칩 선택 / medium: 드래그 시작·유효 슬롯 진입
   success: 드롭 완료·저장 — 짧게 두 번 울려 앞의 둘과 구분된다 */
const PATTERNS: Record<HapticPattern, number | number[]> = {
  light: 8,
  medium: 16,
  success: [12, 40, 18],
};

export function triggerHaptic(pattern: HapticPattern = "light"): void {
  // SSR·구형 브라우저 가드. navigator 자체가 없거나 vibrate 미구현이면 그냥 통과.
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;

  try {
    navigator.vibrate(PATTERNS[pattern]);
  } catch {
    // 일부 브라우저는 사용자 제스처 컨텍스트 밖 호출에 예외를 던진다 — best-effort라 삼킨다.
  }
}

/** 진동이 실제로 울릴 수 있는 환경인지. 햅틱을 전제로 한 안내 문구를 감출 때 쓴다. */
export function canVibrate(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
}
