/* ============================================================================
 * AI 게이트웨이 — 앱 코드가 AI 를 부르는 유일한 입구.
 *
 * 라우트 핸들러는 이 파일만 import 한다. 어느 벤더를 쓰는지, 재시도를 몇 번 하는지,
 * 타임아웃이 얼마인지는 전부 여기서 정한다. 벤더를 갈아끼울 때 라우트 코드는
 * 한 줄도 바뀌지 않는다(docs/AI-GATEWAY.md).
 *
 * 서버 전용이다. API 키가 process.env 에 있으므로 클라이언트 번들에 들어가면 안 된다.
 * (`server-only` 패키지는 이 프로젝트에 설치돼 있지 않아 런타임 가드로 대신한다.)
 * ========================================================================== */

import { createFalBackgroundRemover } from "./providers/fal-bg";
import { createGeminiImageProvider, createGeminiItemClassifier } from "./providers/gemini-image";
import { createVeoVideoProvider } from "./providers/veo-video";
import {
  AiError,
  type AiCallOptions,
  type BackgroundRemoveRequest,
  type BackgroundRemoveResult,
  type BackgroundRemover,
  type ImageGenRequest,
  type ImageGenResult,
  type ImageProvider,
  type InlineImage,
  type ItemClassifier,
  type ItemClassifyRequest,
  type ItemClassifyResult,
  type MediaBytes,
  type RemoteImage,
  type VideoGenRequest,
  type VideoPollResult,
  type VideoProvider,
  type VideoStartResult,
} from "./types";
import type { CompiledPrompt } from "./prompt";

// 앱 코드가 두 곳에서 import 하지 않도록 계약 타입과 컴파일러를 여기서 다시 내보낸다.
export * from "./types";
export {
  compileOutfitPrompt,
  compileVideoPrompt,
  SLOT_PROMPT_ORDER,
  type CompiledPrompt,
  type CompiledVideoPrompt,
  type OutfitPromptInput,
  type OutfitItemSpec,
  type AvatarSpec,
  type AvatarSheetRef,
  type PaletteTokenSpec,
  type SceneSpec,
  type SlotColorSpec,
  type VideoPreset,
  type VideoPromptInput,
} from "./prompt";

// ---------------------------------------------------------------------------
// 실행 정책
// ---------------------------------------------------------------------------

interface CallPolicy {
  timeoutMs: number;
  retries: number;
}

/**
 * 작업별 상한과 재시도 횟수.
 *
 * 영상 시작(startVideo)만 재시도 0인 이유: 요청이 접수됐는데 응답만 못 받은 경우
 * 재시도하면 같은 영상을 두 번 만들고 두 번 과금된다(컷당 $1~3). 실패하면 사용자에게
 * 다시 물어보는 편이 싸다.
 */
export const AI_POLICY = {
  image: { timeoutMs: 90_000, retries: 1 },
  videoStart: { timeoutMs: 30_000, retries: 0 },
  videoPoll: { timeoutMs: 15_000, retries: 2 },
  videoFetch: { timeoutMs: 120_000, retries: 1 },
  background: { timeoutMs: 60_000, retries: 2 },
  classify: { timeoutMs: 30_000, retries: 2 },
} as const satisfies Record<string, CallPolicy>;

const BACKOFF_BASE_MS = 600;
const BACKOFF_CAP_MS = 8_000;

// ---------------------------------------------------------------------------
// 어댑터 선택
// ---------------------------------------------------------------------------

const IMAGE_FACTORIES: Record<string, () => ImageProvider> = {
  gemini: () => createGeminiImageProvider(),
};

const VIDEO_FACTORIES: Record<string, () => VideoProvider> = {
  veo: () => createVeoVideoProvider(),
};

const BACKGROUND_FACTORIES: Record<string, () => BackgroundRemover> = {
  fal: () => createFalBackgroundRemover(),
};

const CLASSIFIER_FACTORIES: Record<string, () => ItemClassifier> = {
  gemini: () => createGeminiItemClassifier(),
};

/** 어댑터는 상태가 없지만 매 호출 새로 만들 이유도 없어 이름별로 한 번만 만든다. */
const instances = new Map<string, unknown>();

function resolve<T>(
  capability: string,
  factories: Record<string, () => T>,
  envValue: string | undefined,
  fallback: string,
): T {
  const name = (envValue ?? fallback).trim();
  const cacheKey = `${capability}:${name}`;
  const cached = instances.get(cacheKey);
  if (cached) return cached as T;

  const factory = factories[name];
  if (!factory) {
    throw new AiError({
      code: "config",
      message: `${capability} 어댑터 "${name}" 를 찾을 수 없습니다. 가능한 값: ${Object.keys(factories).join(", ")}`,
    });
  }
  const created = factory();
  instances.set(cacheKey, created);
  return created;
}

export function getImageProvider(): ImageProvider {
  return resolve("image", IMAGE_FACTORIES, process.env.AI_IMAGE_PROVIDER, "gemini");
}

export function getVideoProvider(): VideoProvider {
  return resolve("video", VIDEO_FACTORIES, process.env.AI_VIDEO_PROVIDER, "veo");
}

export function getBackgroundRemover(): BackgroundRemover {
  return resolve("background", BACKGROUND_FACTORIES, process.env.AI_BG_PROVIDER, "fal");
}

export function getItemClassifier(): ItemClassifier {
  return resolve("classify", CLASSIFIER_FACTORIES, process.env.AI_CLASSIFY_PROVIDER, "gemini");
}

// ---------------------------------------------------------------------------
// 공통 래퍼 (가드 · 로깅 · 타임아웃 · 재시도)
// ---------------------------------------------------------------------------

/** 키가 브라우저로 새어 나가는 최악의 사고를 개발 중에 바로 잡기 위한 가드. */
function assertServer(): void {
  if (typeof window !== "undefined") {
    throw new AiError({
      code: "config",
      message: "AI 게이트웨이는 서버에서만 호출할 수 있습니다. 라우트 핸들러로 옮기세요.",
    });
  }
}

interface AiLogFields {
  op: string;
  provider: string;
  model?: string;
  requestId?: string;
  attempt?: number;
  ms?: number;
  ok?: boolean;
  code?: string;
  status?: number;
  /** 프롬프트 본문·base64 는 절대 로그에 넣지 않는다. 크기만 남긴다. */
  promptChars?: number;
  images?: number;
  retrying?: boolean;
}

function logAi(fields: AiLogFields): void {
  // 한 줄 JSON 이라 Vercel 로그에서 그대로 필터링된다.
  console.info(JSON.stringify({ tag: "ai", ...fields }));
}

function backoffMs(attempt: number): number {
  const base = Math.min(BACKOFF_CAP_MS, BACKOFF_BASE_MS * 2 ** attempt);
  // 여러 사용자가 같은 429 에서 동시에 깨어나지 않도록 ±25% 흔든다.
  return Math.round(base * (0.75 + Math.random() * 0.5));
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new AiError({ code: "canceled", message: "호출자가 중단함" }));
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    function onAbort(): void {
      clearTimeout(timer);
      reject(new AiError({ code: "canceled", message: "호출자가 중단함" }));
    }
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

async function run<T>(
  op: string,
  policy: CallPolicy,
  options: AiCallOptions,
  meta: Omit<AiLogFields, "op" | "attempt" | "ms" | "ok" | "code">,
  task: (callOptions: AiCallOptions) => Promise<T>,
): Promise<T> {
  assertServer();

  const maxRetries = options.retries ?? policy.retries;
  const timeoutMs = options.timeoutMs ?? policy.timeoutMs;
  let lastError: AiError | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const startedAt = Date.now();
    try {
      const result = await task({ ...options, timeoutMs });
      logAi({ ...meta, op, attempt, ms: Date.now() - startedAt, ok: true, requestId: options.requestId });
      return result;
    } catch (error) {
      const aiError = AiError.wrap(error, meta.provider, `${op} 실패`);
      const willRetry = aiError.retryable && attempt < maxRetries;
      logAi({
        ...meta,
        op,
        attempt,
        ms: Date.now() - startedAt,
        ok: false,
        code: aiError.code,
        status: aiError.status,
        retrying: willRetry,
        requestId: options.requestId,
      });
      if (!willRetry) throw aiError;
      lastError = aiError;
      await sleep(backoffMs(attempt), options.signal);
    }
  }

  // 루프는 항상 return 이나 throw 로 끝나지만, 타입을 좁히기 위해 남겨 둔다.
  throw lastError ?? new AiError({ code: "unknown", provider: meta.provider, message: `${op} 실패` });
}

// ---------------------------------------------------------------------------
// 공개 API
// ---------------------------------------------------------------------------

/** 착장 이미지 생성. 첨부 순서는 req.images 그대로 유지된다. */
export function generateOutfitImage(
  req: ImageGenRequest,
  options: AiCallOptions = {},
): Promise<ImageGenResult> {
  const provider = getImageProvider();
  return run(
    "image.generate",
    AI_POLICY.image,
    options,
    {
      provider: provider.id,
      model: provider.model,
      promptChars: req.prompt.length,
      images: req.images.length,
    },
    (callOptions) => provider.generateImage(req, callOptions),
  );
}

/**
 * 컴파일된 지시서로 바로 생성한다.
 * imageOrder 를 그대로 넘기므로 "N번째 첨부" 대응이 어긋날 여지가 없다 — 라우트에서
 * 직접 ImageGenRequest 를 조립하기보다 이쪽을 쓰는 편이 안전하다.
 */
export function generateImageFromCompiled(
  compiled: CompiledPrompt,
  options: AiCallOptions & { aspectRatio?: ImageGenRequest["aspectRatio"]; seed?: number } = {},
): Promise<ImageGenResult> {
  const { aspectRatio, seed, ...callOptions } = options;
  return generateOutfitImage(
    { prompt: compiled.prompt, images: compiled.imageOrder, aspectRatio, seed },
    callOptions,
  );
}

/** 영상 생성 시작. 즉시 operation 이름만 돌려준다(라우트는 202 로 응답할 것). */
export function startOutfitVideo(
  req: VideoGenRequest,
  options: AiCallOptions = {},
): Promise<VideoStartResult> {
  const provider = getVideoProvider();
  return run(
    "video.start",
    AI_POLICY.videoStart,
    options,
    { provider: provider.id, model: provider.model, promptChars: req.prompt.length },
    (callOptions) => provider.startVideo(req, callOptions),
  );
}

/** 영상 진행 상태 1회 조회. 대기 루프는 호출자(폴링 라우트)가 만든다. */
export function pollOutfitVideo(
  opName: string,
  options: AiCallOptions = {},
): Promise<VideoPollResult> {
  const provider = getVideoProvider();
  return run(
    "video.poll",
    AI_POLICY.videoPoll,
    options,
    { provider: provider.id, model: provider.model },
    (callOptions) => provider.pollVideo(opName, callOptions),
  );
}

/** 완료된 영상 바이트 받기. 받은 즉시 Storage(results 버킷)로 올릴 것. */
export function fetchGeneratedVideo(
  video: RemoteImage | InlineImage,
  options: AiCallOptions = {},
): Promise<MediaBytes> {
  const provider = getVideoProvider();
  return run(
    "video.fetch",
    AI_POLICY.videoFetch,
    options,
    { provider: provider.id, model: provider.model },
    (callOptions) => provider.fetchVideo(video, callOptions),
  );
}

/** 옷 사진 배경 제거. 결과 URL 은 수명이 짧으니 곧바로 우리 Storage 로 옮길 것. */
export function removeItemBackground(
  req: BackgroundRemoveRequest,
  options: AiCallOptions = {},
): Promise<BackgroundRemoveResult> {
  const provider = getBackgroundRemover();
  return run(
    "bg.remove",
    AI_POLICY.background,
    options,
    { provider: provider.id, model: provider.model },
    (callOptions) => provider.removeBackground(req, callOptions),
  );
}

/** 드롭한 옷이 7종 중 어느 슬롯인지 분류. */
export function classifyItem(
  req: ItemClassifyRequest,
  options: AiCallOptions = {},
): Promise<ItemClassifyResult> {
  const provider = getItemClassifier();
  return run(
    "item.classify",
    AI_POLICY.classify,
    options,
    { provider: provider.id, model: provider.model },
    (callOptions) => provider.classify(req, callOptions),
  );
}

// ---------------------------------------------------------------------------
// 설정 점검
// ---------------------------------------------------------------------------

export interface AiProviderInfo {
  capability: "image" | "video" | "background" | "classify";
  provider: string;
  model: string;
  /** 필요한 환경변수가 채워져 있는지. 키 값 자체는 절대 내보내지 않는다. */
  configured: boolean;
}

/**
 * 어떤 어댑터가 물려 있고 키가 준비됐는지 한눈에 본다.
 * 배포 직후 점검용 — 관리자만 볼 수 있는 곳에서만 노출할 것.
 */
export function getAiProviderInfo(): AiProviderInfo[] {
  const hasGoogle = Boolean(process.env.GOOGLE_AI_API_KEY);
  const hasFal = Boolean(process.env.FAL_KEY);

  const safe = <T extends { id: string; model: string }>(get: () => T): { id: string; model: string } => {
    try {
      return get();
    } catch {
      return { id: "(설정 오류)", model: "-" };
    }
  };

  const image = safe(getImageProvider);
  const video = safe(getVideoProvider);
  const background = safe(getBackgroundRemover);
  const classify = safe(getItemClassifier);

  return [
    { capability: "image", provider: image.id, model: image.model, configured: hasGoogle },
    { capability: "video", provider: video.id, model: video.model, configured: hasGoogle },
    { capability: "background", provider: background.id, model: background.model, configured: hasFal },
    { capability: "classify", provider: classify.id, model: classify.model, configured: hasGoogle },
  ];
}

/** 테스트에서 환경변수를 바꿔가며 어댑터를 다시 만들 때 쓴다. */
export function resetAiProviderCache(): void {
  instances.clear();
}
