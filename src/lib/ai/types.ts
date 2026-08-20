/* ============================================================================
 * AI 게이트웨이 타입 계약
 *
 * 앱 코드(라우트 핸들러)는 이 파일의 인터페이스만 알면 되고, 어느 벤더를 쓰는지는
 * gateway.ts 가 환경변수로 정한다. 벤더를 갈아끼울 때 고쳐야 하는 파일은
 * providers/* 하나뿐이 되도록 요청·응답 모양을 벤더 중립으로 정의한다.
 *
 * 이미지 바이트는 base64 문자열로 주고받는다. Uint8Array 가 더 자연스러워 보이지만
 * 생성 결과를 generations 스냅샷·큐 페이로드로 직렬화해야 할 때가 있어서,
 * 어디서든 JSON 으로 옮길 수 있는 표현을 기본형으로 뒀다.
 * ========================================================================== */

import type { AspectRatio, ItemKind } from "@/lib/types";

// 값의 정본은 도메인 계약(@/lib/types)이다. 어댑터 쪽에서 다시 정의하면 두 벌이 된다.
export type { AspectRatio, ItemKind };

// ---------------------------------------------------------------------------
// 이미지 표현
// ---------------------------------------------------------------------------

/** 인라인 바이트. mimeType 은 "image/png" 처럼 완전한 형태여야 한다. */
export interface InlineImage {
  kind: "inline";
  mimeType: string;
  /** base64 (data URL 접두사 없이 순수 페이로드만) */
  base64: string;
}

/** 원격 이미지. Supabase 공개/서명 URL 또는 벤더가 돌려준 임시 URL. */
export interface RemoteImage {
  kind: "url";
  url: string;
  mimeType?: string;
}

/** 어댑터가 받는 이미지 입력. URL 이면 어댑터가 필요할 때 직접 내려받는다. */
export type ImageInput = InlineImage | RemoteImage;

/** 첨부 이미지 한 장의 역할. 프롬프트 컴파일러가 붙이고 어댑터가 순서대로 첨부한다. */
export type ImageRefRole = "avatar_sheet" | "item" | "mood";

/**
 * 프롬프트의 "N번째 첨부 이미지"와 1:1 대응하는 참조.
 * 배열 순서가 곧 첨부 순서다 — 순서가 틀어지면 지시서 전체가 어긋난다.
 */
export interface ImageRef {
  role: ImageRefRole;
  /** 프롬프트 본문에 쓰이는 한국어 이름("검정 라이더", "정면 컷"). */
  label: string;
  /** role === "item" 일 때 어느 슬롯의 아이템인지. */
  slot?: ItemKind;
  /** items.id / avatars.id. generations.input_refs 스냅샷에 그대로 남긴다. */
  sourceId?: string;
  input: ImageInput;
}

// ---------------------------------------------------------------------------
// 공통 호출 옵션
// ---------------------------------------------------------------------------

export interface AiCallOptions {
  /** 라우트에서 만든 AbortController. 사용자가 화면을 떠나면 끊는다. */
  signal?: AbortSignal;
  /** 이 호출 하나의 상한(ms). 미지정이면 게이트웨이 기본값. */
  timeoutMs?: number;
  /** 재시도 횟수(첫 시도 제외). 미지정이면 게이트웨이 기본값. */
  retries?: number;
  /** 로그 상관관계용. generations.id 를 넣으면 추적이 쉽다. */
  requestId?: string;
}

// ---------------------------------------------------------------------------
// 에러
// ---------------------------------------------------------------------------

/**
 * 재시도 판단과 사용자 문구를 코드 한 곳에서 정하기 위한 분류.
 * - config       : 환경변수 누락 등 배포 설정 문제 (재시도 무의미)
 * - auth         : 키가 틀렸거나 권한 없음 (재시도 무의미)
 * - rate_limit   : 429. 잠시 뒤 재시도 가능
 * - quota        : 결제·할당량 소진. 재시도해도 같음
 * - timeout      : 우리 쪽 상한 초과
 * - network      : 연결 실패
 * - upstream     : 5xx 등 벤더 일시 장애
 * - invalid_response : 200 인데 이미지가 없거나 형식이 깨짐
 * - safety       : 안전 필터 차단 (프롬프트를 바꿔야 함)
 * - canceled     : 호출자가 중단
 * - unknown      : 분류 실패
 */
export type AiErrorCode =
  | "config"
  | "auth"
  | "rate_limit"
  | "quota"
  | "timeout"
  | "network"
  | "upstream"
  | "invalid_response"
  | "safety"
  | "canceled"
  | "unknown";

export interface AiErrorInit {
  code: AiErrorCode;
  /** 개발자용 메시지(로그). 절대 사용자에게 그대로 보여주지 말 것. */
  message: string;
  /** 사용자에게 보여줄 한국어 한 줄. 없으면 code 기본 문구를 쓴다. */
  userMessage?: string;
  provider?: string;
  status?: number;
  retryable?: boolean;
  cause?: unknown;
}

/** 코드별 기본 사용자 문구. 톤은 프로젝트 규칙대로 따뜻하고 짧게. */
const DEFAULT_USER_MESSAGE: Record<AiErrorCode, string> = {
  config: "생성 기능이 아직 준비되지 않았어요. 잠시 뒤에 다시 시도해 주세요.",
  auth: "생성 기능이 아직 준비되지 않았어요. 잠시 뒤에 다시 시도해 주세요.",
  rate_limit: "지금 요청이 몰렸어요. 조금 뒤에 다시 해볼까요?",
  quota: "오늘 생성 한도를 다 썼어요. 내일 다시 만나요.",
  timeout: "생성이 오래 걸려서 멈췄어요. 한 번만 더 해볼까요?",
  network: "연결이 잠깐 끊겼어요. 한 번만 더 해볼까요?",
  upstream: "생성이 잘 안 됐어요. 한 번만 더 해볼까요?",
  invalid_response: "결과를 받지 못했어요. 한 번만 더 해볼까요?",
  safety: "이 사진이나 지시로는 만들기 어려워요. 다른 사진으로 해볼까요?",
  canceled: "생성을 멈췄어요.",
  unknown: "생성이 잘 안 됐어요. 한 번만 더 해볼까요?",
};

/** 재시도해도 결과가 달라지지 않는 코드들. */
const NON_RETRYABLE: ReadonlySet<AiErrorCode> = new Set<AiErrorCode>([
  "config",
  "auth",
  "quota",
  "safety",
  "canceled",
  "invalid_response",
]);

export class AiError extends Error {
  readonly code: AiErrorCode;
  readonly userMessage: string;
  readonly provider?: string;
  readonly status?: number;
  readonly retryable: boolean;

  constructor(init: AiErrorInit) {
    super(init.message, init.cause !== undefined ? { cause: init.cause } : undefined);
    this.name = "AiError";
    this.code = init.code;
    this.userMessage = init.userMessage ?? DEFAULT_USER_MESSAGE[init.code];
    this.provider = init.provider;
    this.status = init.status;
    this.retryable = init.retryable ?? !NON_RETRYABLE.has(init.code);
  }

  /** API 응답 봉투({ ok:false, error, code })에 그대로 실을 수 있는 모양. */
  toResponse(): { ok: false; error: string; code: AiErrorCode; retryable: boolean } {
    return { ok: false, error: this.userMessage, code: this.code, retryable: this.retryable };
  }

  /** 로그용. 키·base64 가 섞이지 않도록 필드를 골라서 낸다. */
  toLog(): Record<string, unknown> {
    return {
      code: this.code,
      provider: this.provider,
      status: this.status,
      retryable: this.retryable,
      message: this.message,
    };
  }

  static is(value: unknown): value is AiError {
    return value instanceof AiError;
  }

  /** HTTP 상태코드를 코드로 옮긴다. 벤더 3곳이 같은 규칙을 쓴다. */
  static fromStatus(
    status: number,
    provider: string,
    detail: string,
    cause?: unknown,
  ): AiError {
    const code: AiErrorCode =
      status === 401 || status === 403
        ? "auth"
        : status === 429
          ? "rate_limit"
          : status === 402
            ? "quota"
            : status === 408 || status === 504
              ? "timeout"
              : status >= 500
                ? "upstream"
                : "invalid_response";
    return new AiError({
      code,
      provider,
      status,
      message: `${provider} ${status}: ${detail}`,
      cause,
    });
  }

  /** 예상 못한 예외를 AiError 로 감싼다. AbortError 는 취소/타임아웃으로 구분. */
  static wrap(error: unknown, provider: string, fallbackMessage: string): AiError {
    if (AiError.is(error)) return error;
    if (error instanceof DOMException && error.name === "AbortError") {
      return new AiError({ code: "canceled", provider, message: `${provider} 호출 중단`, cause: error });
    }
    if (error instanceof Error && error.name === "AbortError") {
      return new AiError({ code: "canceled", provider, message: `${provider} 호출 중단`, cause: error });
    }
    if (error instanceof TypeError) {
      // fetch 가 네트워크 단계에서 실패하면 TypeError 를 던진다.
      return new AiError({ code: "network", provider, message: `${provider} 연결 실패: ${error.message}`, cause: error });
    }
    return new AiError({
      code: "unknown",
      provider,
      message: `${fallbackMessage}: ${error instanceof Error ? error.message : String(error)}`,
      cause: error,
    });
  }
}

// ---------------------------------------------------------------------------
// 이미지 생성
// ---------------------------------------------------------------------------

export interface ImageGenRequest {
  /** prompt.ts 가 컴파일한 착장 지시서 전문. */
  prompt: string;
  /** 첨부 이미지. 배열 순서가 프롬프트의 "N번째 첨부"와 일치해야 한다. */
  images: readonly ImageRef[];
  aspectRatio?: AspectRatio;
  /** 지원하는 벤더만 반영한다(Gemini 는 무시). 회귀 테스트 재현용. */
  seed?: number;
}

export interface ImageGenResult {
  image: InlineImage;
  provider: string;
  model: string;
  /** 모델이 이미지와 함께 준 설명. 실패 진단에만 쓰고 UI 에 띄우지 않는다. */
  text?: string;
  latencyMs: number;
}

export interface ImageProvider {
  readonly id: string;
  readonly model: string;
  generateImage(req: ImageGenRequest, options?: AiCallOptions): Promise<ImageGenResult>;
}

// ---------------------------------------------------------------------------
// 영상 생성 — 시작/폴링 분리
// ---------------------------------------------------------------------------

/**
 * Veo 는 한 컷에 1~3분이 걸려 서버리스 함수 하나로 붙잡을 수 없다.
 * 그래서 어댑터는 start(즉시 반환) / poll(짧게 조회) / fetch(결과 내려받기)로
 * 쪼개고, 라우트는 POST 202 → GET 폴링 2단계로 노출한다.
 */
export interface VideoGenRequest {
  prompt: string;
  /** 이미지 생성 결과를 시작 프레임으로 쓴다. */
  startFrame: ImageInput;
  aspectRatio?: AspectRatio;
  /** 5~10초(기획서 §2.5). 벤더가 지원하는 범위로 어댑터가 보정한다. */
  durationSeconds?: number;
  negativePrompt?: string;
}

export interface VideoStartResult {
  /** 벤더의 long-running operation 이름. generations.provider_op_name 에 저장. */
  opName: string;
  provider: string;
  model: string;
}

export interface VideoRunning {
  status: "running";
  opName: string;
  /** 사용자에게 보여줄 진행 힌트("40초 지났어요"). 없으면 UI 기본 문구. */
  progressHint?: string;
}

export interface VideoDone {
  status: "done";
  opName: string;
  /** 결과 위치. 벤더 URL 은 대개 인증이 필요하고 수명이 짧다 → 곧바로 내려받아 Storage 로 옮길 것. */
  video: RemoteImage | InlineImage;
  provider: string;
  model: string;
}

export interface VideoFailed {
  status: "failed";
  opName: string;
  error: AiError;
}

export type VideoPollResult = VideoRunning | VideoDone | VideoFailed;

/** 다운로드 결과. Storage 업로드에 바로 넘긴다. */
export interface MediaBytes {
  bytes: Uint8Array;
  mimeType: string;
  byteLength: number;
}

export interface VideoProvider {
  readonly id: string;
  readonly model: string;
  startVideo(req: VideoGenRequest, options?: AiCallOptions): Promise<VideoStartResult>;
  pollVideo(opName: string, options?: AiCallOptions): Promise<VideoPollResult>;
  /** done 결과의 video 를 실제 바이트로. 벤더 인증 헤더가 필요해서 어댑터가 맡는다. */
  fetchVideo(video: RemoteImage | InlineImage, options?: AiCallOptions): Promise<MediaBytes>;
}

// ---------------------------------------------------------------------------
// 배경 제거 / 아이템 분류
// ---------------------------------------------------------------------------

export interface BackgroundRemoveRequest {
  image: ImageInput;
}

export interface BackgroundRemoveResult {
  /** 알파 채널이 있는 컷아웃. 벤더가 URL 로 주면 URL, 바이트로 주면 inline. */
  image: ImageInput;
  provider: string;
  model: string;
  latencyMs: number;
}

export interface BackgroundRemover {
  readonly id: string;
  readonly model: string;
  removeBackground(
    req: BackgroundRemoveRequest,
    options?: AiCallOptions,
  ): Promise<BackgroundRemoveResult>;
}

export interface ItemClassifyRequest {
  image: ImageInput;
  /** 사용자가 이미 슬롯을 정해 두고 확인만 받는 경우의 힌트. */
  hint?: ItemKind;
}

export interface ItemClassifyResult {
  kind: ItemKind;
  /** 0~1. 임계값 미만이면 UI 가 "어느 자리에 둘까요?"를 묻는다. */
  confidence: number;
  /** 차선 후보. 오분류 자동 재배치 토스트에서 "아니면 아우터?"로 쓸 수 있다. */
  alternatives?: { kind: ItemKind; confidence: number }[];
  provider: string;
  model: string;
  latencyMs: number;
}

export interface ItemClassifier {
  readonly id: string;
  readonly model: string;
  classify(req: ItemClassifyRequest, options?: AiCallOptions): Promise<ItemClassifyResult>;
}

// ---------------------------------------------------------------------------
// 바이트 코덱 — providers 와 gateway 가 함께 쓰는 최소 유틸
// ---------------------------------------------------------------------------

/** 20MB. 벤더 요청 본문 상한과 서버 메모리를 함께 지키는 안전선. */
export const MAX_INLINE_IMAGE_BYTES = 20 * 1024 * 1024;

/** "data:image/png;base64,AAA..." → InlineImage. 형식이 아니면 null. */
export function parseDataUrl(dataUrl: string): InlineImage | null {
  // [\s\S] 를 쓰는 이유: tsconfig target 이 ES2017 이라 정규식 s 플래그를 못 쓴다.
  const match = /^data:([^;,]+);base64,([\s\S]*)$/.exec(dataUrl);
  if (!match) return null;
  return { kind: "inline", mimeType: match[1], base64: match[2] };
}

export function toDataUrl(image: InlineImage): string {
  return `data:${image.mimeType};base64,${image.base64}`;
}

export function bytesToBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}

export function base64ToBytes(base64: string): Uint8Array {
  return new Uint8Array(Buffer.from(base64, "base64"));
}

/** base64 문자열이 실제로 몇 바이트인지(디코드 없이 계산). */
export function base64ByteLength(base64: string): number {
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

// ---------------------------------------------------------------------------
// 네트워크 유틸 — providers/* 세 어댑터가 공유한다.
//
// gateway.ts 가 providers 를 import 하므로, 공용 유틸을 gateway 에 두면 순환 참조가
// 된다. 의존 방향을 types.ts <- providers <- gateway 한 줄로 유지하려고 여기 둔다.
// (클라이언트에서 이 파일을 import 해도 타입만 쓰면 번들에 코드가 남지 않는다.)
// ---------------------------------------------------------------------------

export interface HttpCallContext {
  provider: string;
  timeoutMs: number;
  signal?: AbortSignal;
}

/**
 * 타임아웃과 호출자 취소를 함께 거는 fetch.
 * 타임아웃(TimeoutError)과 사용자 취소(AbortError)를 구분해서 던지므로
 * 재시도 판단이 정확해진다 — 취소는 재시도하면 안 되고 타임아웃은 해도 된다.
 */
export async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  ctx: HttpCallContext,
): Promise<Response> {
  const signals: AbortSignal[] = [AbortSignal.timeout(ctx.timeoutMs)];
  if (ctx.signal) signals.push(ctx.signal);

  try {
    return await fetch(url, { ...init, signal: AbortSignal.any(signals) });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new AiError({
        code: "timeout",
        provider: ctx.provider,
        message: `${ctx.provider} 응답이 ${ctx.timeoutMs}ms 안에 오지 않음`,
        cause: error,
      });
    }
    throw AiError.wrap(error, ctx.provider, `${ctx.provider} 요청 실패`);
  }
}

/** 에러 응답 본문을 로그에 남길 만큼만 잘라 읽는다(벤더가 HTML 을 뱉는 경우 대비). */
export async function readErrorBody(response: Response, limit = 500): Promise<string> {
  try {
    const text = await response.text();
    return text.length > limit ? `${text.slice(0, limit)}…` : text;
  } catch {
    return "(본문 읽기 실패)";
  }
}

/**
 * ImageInput 을 인라인 바이트로 만든다. URL 이면 여기서 내려받는다.
 * 상한을 넘는 이미지는 벤더에 보내기 전에 막는다 — 413 을 벤더에서 받는 것보다
 * 우리가 먼저 걸러야 사용자에게 이유를 말해줄 수 있다.
 */
export async function readImageInputAsInline(
  input: ImageInput,
  ctx: HttpCallContext,
  maxBytes: number = MAX_INLINE_IMAGE_BYTES,
): Promise<InlineImage> {
  if (input.kind === "inline") {
    if (base64ByteLength(input.base64) > maxBytes) {
      throw new AiError({
        code: "invalid_response",
        provider: ctx.provider,
        message: `인라인 이미지가 상한(${maxBytes}B)을 넘음`,
        userMessage: "사진 용량이 너무 커요. 조금 작은 사진으로 해볼까요?",
      });
    }
    return input;
  }

  const media = await readMediaBytes(input.url, ctx, maxBytes);
  return {
    kind: "inline",
    mimeType: input.mimeType ?? media.mimeType,
    base64: bytesToBase64(media.bytes),
  };
}

/** URL 에서 바이트를 받는다. 결과 영상·컷아웃을 Storage 로 옮길 때도 쓴다. */
export async function readMediaBytes(
  url: string,
  ctx: HttpCallContext,
  maxBytes: number = MAX_INLINE_IMAGE_BYTES,
  headers: Record<string, string> = {},
): Promise<MediaBytes> {
  const response = await fetchWithTimeout(url, { method: "GET", headers }, ctx);
  if (!response.ok) {
    throw AiError.fromStatus(response.status, ctx.provider, await readErrorBody(response));
  }

  // Content-Length 가 있으면 내려받기 전에 자른다.
  const declared = Number(response.headers.get("content-length") ?? Number.NaN);
  if (Number.isFinite(declared) && declared > maxBytes) {
    throw new AiError({
      code: "invalid_response",
      provider: ctx.provider,
      message: `내려받을 파일이 상한(${maxBytes}B)을 넘음: ${declared}B`,
      userMessage: "파일이 너무 커서 가져오지 못했어요.",
    });
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > maxBytes) {
    throw new AiError({
      code: "invalid_response",
      provider: ctx.provider,
      message: `내려받은 파일이 상한(${maxBytes}B)을 넘음: ${bytes.byteLength}B`,
      userMessage: "파일이 너무 커서 가져오지 못했어요.",
    });
  }

  return {
    bytes,
    mimeType: response.headers.get("content-type")?.split(";")[0]?.trim() || "application/octet-stream",
    byteLength: bytes.byteLength,
  };
}
