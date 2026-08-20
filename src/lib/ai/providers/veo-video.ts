/* ============================================================================
 * Veo 어댑터 — 착장 이미지를 시작 프레임으로 한 짧은 영상 생성.
 *
 * M0 프로토타입은 브라우저에서 8초 간격 60회 폴링 루프를 붙잡고 있었다(api.js).
 * 서버리스에서는 그 구조가 불가능해서 세 조각으로 쪼갰다:
 *   startVideo  → operation 이름만 받고 즉시 반환 (라우트는 202)
 *   pollVideo   → 호출자(폴링 라우트)가 주기적으로 한 번씩 부른다
 *   fetchVideo  → done 이면 바이트를 받아 Storage 로 옮긴다
 * 이 파일 안에는 대기 루프가 없다. 있으면 함수 타임아웃에 걸린다.
 * ========================================================================== */

import {
  AiError,
  fetchWithTimeout,
  readErrorBody,
  readImageInputAsInline,
  readMediaBytes,
  type AiCallOptions,
  type InlineImage,
  type MediaBytes,
  type RemoteImage,
  type VideoGenRequest,
  type VideoPollResult,
  type VideoProvider,
  type VideoStartResult,
} from "../types";

const PROVIDER_ID = "veo";
const DEFAULT_API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_MODEL = "veo-3.0-generate-001";

/** 영상 파일 상한 100MB. 9:16 10초면 훨씬 작지만 벤더가 4K 를 주는 경우를 대비. */
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

export interface VeoConfig {
  apiKey?: string;
  apiBase?: string;
  model?: string;
}

interface VeoOperation {
  name?: string;
  done?: boolean;
  error?: { code?: number; message?: string; status?: string };
  metadata?: { progressPercent?: number };
  response?: {
    generateVideoResponse?: {
      generatedSamples?: { video?: { uri?: string; mimeType?: string } }[];
      raiMediaFilteredReasons?: string[];
    };
    generatedVideos?: { video?: { uri?: string; mimeType?: string } }[];
  };
}

function requireKey(config: VeoConfig): string {
  const key = config.apiKey ?? process.env.GOOGLE_AI_API_KEY;
  if (!key) {
    throw new AiError({
      code: "config",
      provider: PROVIDER_ID,
      message: "GOOGLE_AI_API_KEY 환경변수가 없습니다.",
    });
  }
  return key;
}

/**
 * operation 이름은 DB(generations.provider_op_name)를 거쳐 다시 들어온다.
 * 그대로 URL 에 붙이므로 경로 탈출·다른 호스트 지시를 막는다.
 */
function assertSafeOpName(opName: string): void {
  if (!/^[A-Za-z0-9/_.-]+$/.test(opName) || opName.includes("..") || opName.startsWith("/")) {
    throw new AiError({
      code: "invalid_response",
      provider: PROVIDER_ID,
      message: `허용되지 않는 operation 이름: ${opName.slice(0, 80)}`,
    });
  }
}

function readVideoRef(op: VeoOperation): RemoteImage | null {
  const sample =
    op.response?.generateVideoResponse?.generatedSamples?.[0]?.video ??
    op.response?.generatedVideos?.[0]?.video;
  if (!sample?.uri) return null;
  return { kind: "url", url: sample.uri, mimeType: sample.mimeType ?? "video/mp4" };
}

export function createVeoVideoProvider(config: VeoConfig = {}): VideoProvider {
  const apiBase = config.apiBase ?? process.env.GEMINI_API_BASE ?? DEFAULT_API_BASE;
  const model = config.model ?? process.env.VEO_MODEL ?? DEFAULT_MODEL;

  return {
    id: PROVIDER_ID,
    model,

    async startVideo(req: VideoGenRequest, options: AiCallOptions = {}): Promise<VideoStartResult> {
      const apiKey = requireKey(config);
      const timeoutMs = options.timeoutMs ?? 30_000;

      const frame = await readImageInputAsInline(req.startFrame, {
        provider: PROVIDER_ID,
        timeoutMs,
        signal: options.signal,
      });

      const parameters: Record<string, unknown> = {
        aspectRatio: req.aspectRatio ?? "9:16",
      };
      if (req.durationSeconds) parameters.durationSeconds = req.durationSeconds;
      if (req.negativePrompt) parameters.negativePrompt = req.negativePrompt;
      // 인물 생성 정책은 프로젝트·리전마다 허용값이 달라 기본으로 보내지 않는다.
      // 사람이 나오는 영상이 거부되면 VEO_PERSON_GENERATION=allow_adult 로 켠다.
      if (process.env.VEO_PERSON_GENERATION) {
        parameters.personGeneration = process.env.VEO_PERSON_GENERATION;
      }

      const response = await fetchWithTimeout(
        `${apiBase}/models/${model}:predictLongRunning`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
          body: JSON.stringify({
            instances: [
              {
                prompt: req.prompt,
                image: { bytesBase64Encoded: frame.base64, mimeType: frame.mimeType },
              },
            ],
            parameters,
          }),
        },
        { provider: PROVIDER_ID, timeoutMs, signal: options.signal },
      );

      if (!response.ok) {
        throw AiError.fromStatus(response.status, PROVIDER_ID, await readErrorBody(response));
      }

      const op = (await response.json()) as VeoOperation;
      if (!op.name) {
        throw new AiError({
          code: "invalid_response",
          provider: PROVIDER_ID,
          message: "predictLongRunning 이 operation 이름을 주지 않음",
        });
      }
      return { opName: op.name, provider: PROVIDER_ID, model };
    },

    async pollVideo(opName: string, options: AiCallOptions = {}): Promise<VideoPollResult> {
      const apiKey = requireKey(config);
      const timeoutMs = options.timeoutMs ?? 15_000;
      assertSafeOpName(opName);

      const response = await fetchWithTimeout(
        `${apiBase}/${opName}`,
        { method: "GET", headers: { "x-goog-api-key": apiKey } },
        { provider: PROVIDER_ID, timeoutMs, signal: options.signal },
      );

      if (!response.ok) {
        throw AiError.fromStatus(response.status, PROVIDER_ID, await readErrorBody(response));
      }

      const op = (await response.json()) as VeoOperation;

      if (op.error) {
        // 작업 자체의 실패다. 폴링을 계속할 이유가 없으니 예외 대신 상태로 돌려준다.
        return {
          status: "failed",
          opName,
          error: new AiError({
            code: "upstream",
            provider: PROVIDER_ID,
            message: `Veo 작업 실패: ${op.error.status ?? ""} ${op.error.message ?? ""}`.trim(),
            retryable: false,
          }),
        };
      }

      if (!op.done) {
        const percent = op.metadata?.progressPercent;
        return {
          status: "running",
          opName,
          progressHint: typeof percent === "number" ? `${Math.round(percent)}% 진행됐어요` : undefined,
        };
      }

      const video = readVideoRef(op);
      if (!video) {
        const filtered = op.response?.generateVideoResponse?.raiMediaFilteredReasons?.[0];
        return {
          status: "failed",
          opName,
          error: new AiError({
            code: filtered ? "safety" : "invalid_response",
            provider: PROVIDER_ID,
            message: filtered ? `Veo 안전 필터 차단: ${filtered}` : "완료됐는데 영상 URI 가 없음",
          }),
        };
      }

      return { status: "done", opName, video, provider: PROVIDER_ID, model };
    },

    async fetchVideo(
      video: RemoteImage | InlineImage,
      options: AiCallOptions = {},
    ): Promise<MediaBytes> {
      if (video.kind === "inline") {
        const bytes = new Uint8Array(Buffer.from(video.base64, "base64"));
        return { bytes, mimeType: video.mimeType, byteLength: bytes.byteLength };
      }

      const apiKey = requireKey(config);
      const timeoutMs = options.timeoutMs ?? 120_000;

      // 프로토타입은 ?key= 쿼리로 붙였지만, 헤더로 보내야 URL 이 로그·리퍼러에 키와
      // 함께 남지 않는다. 파일 엔드포인트도 x-goog-api-key 를 받는다.
      return readMediaBytes(
        video.url,
        { provider: PROVIDER_ID, timeoutMs, signal: options.signal },
        MAX_VIDEO_BYTES,
        { "x-goog-api-key": apiKey },
      );
    },
  };
}
