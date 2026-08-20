/* ============================================================================
 * fal.ai BiRefNet 어댑터 — 옷 사진 배경 제거.
 *
 * 클라이언트 wasm 방식(모델 40MB+ 다운로드)은 모바일에서 부적합해 서버 API 로 간다
 * (MVP-DEV-PLAN §3). 건당 비용이 작아서 게이트웨이 기본 재시도를 조금 넉넉히 둔다.
 *
 * 반환은 fal 이 호스팅하는 임시 URL 이다. 수명이 짧으니 호출자가 곧바로 내려받아
 * Supabase Storage(items 버킷)로 옮기고 items.cutout_url 에는 우리 경로를 저장할 것.
 * ========================================================================== */

import {
  AiError,
  fetchWithTimeout,
  readErrorBody,
  readImageInputAsInline,
  toDataUrl,
  type AiCallOptions,
  type BackgroundRemoveRequest,
  type BackgroundRemoveResult,
  type BackgroundRemover,
} from "../types";

const PROVIDER_ID = "fal";
const DEFAULT_ENDPOINT = "https://fal.run";
const DEFAULT_MODEL = "fal-ai/birefnet/v2";

export interface FalConfig {
  apiKey?: string;
  endpoint?: string;
  model?: string;
}

interface FalBirefnetResponse {
  image?: { url?: string; content_type?: string; width?: number; height?: number };
  detail?: string | { msg?: string }[];
  error?: string;
}

function requireKey(config: FalConfig): string {
  const key = config.apiKey ?? process.env.FAL_KEY;
  if (!key) {
    throw new AiError({
      code: "config",
      provider: PROVIDER_ID,
      message: "FAL_KEY 환경변수가 없습니다.",
    });
  }
  return key;
}

function readDetail(json: FalBirefnetResponse): string {
  if (typeof json.detail === "string") return json.detail;
  if (Array.isArray(json.detail)) return json.detail.map((d) => d.msg ?? "").join(", ");
  return json.error ?? "";
}

export function createFalBackgroundRemover(config: FalConfig = {}): BackgroundRemover {
  const endpoint = config.endpoint ?? process.env.FAL_ENDPOINT ?? DEFAULT_ENDPOINT;
  const model = config.model ?? process.env.FAL_BG_MODEL ?? DEFAULT_MODEL;

  return {
    id: PROVIDER_ID,
    model,

    async removeBackground(
      req: BackgroundRemoveRequest,
      options: AiCallOptions = {},
    ): Promise<BackgroundRemoveResult> {
      const apiKey = requireKey(config);
      const timeoutMs = options.timeoutMs ?? 60_000;
      const startedAt = Date.now();

      // fal 은 공개 URL 과 data URI 를 모두 받는다. 비공개 버킷(서명 URL 만 있는 경우)
      // 이라도 확실히 동작하도록 항상 바이트를 실어 보낸다.
      const inline = await readImageInputAsInline(req.image, {
        provider: PROVIDER_ID,
        timeoutMs,
        signal: options.signal,
      });

      const response = await fetchWithTimeout(
        `${endpoint}/${model}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Key ${apiKey}` },
          body: JSON.stringify({
            image_url: toDataUrl(inline),
            // 알파 채널이 필요하므로 png 고정. webp 로 바꾸면 투명도가 깨지는 경로가 있다.
            output_format: "png",
          }),
        },
        { provider: PROVIDER_ID, timeoutMs, signal: options.signal },
      );

      if (!response.ok) {
        throw AiError.fromStatus(response.status, PROVIDER_ID, await readErrorBody(response));
      }

      const json = (await response.json()) as FalBirefnetResponse;
      const url = json.image?.url;
      if (!url) {
        throw new AiError({
          code: "invalid_response",
          provider: PROVIDER_ID,
          message: `배경 제거 결과 URL 이 없음: ${readDetail(json).slice(0, 200)}`,
          userMessage: "배경을 지우지 못했어요. 원본 그대로 담아둘까요?",
        });
      }

      return {
        image: { kind: "url", url, mimeType: json.image?.content_type ?? "image/png" },
        provider: PROVIDER_ID,
        model,
        latencyMs: Date.now() - startedAt,
      };
    },
  };
}
