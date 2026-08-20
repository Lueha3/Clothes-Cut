/* ============================================================================
 * Gemini 어댑터 — 착장 이미지 생성(멀티 이미지 편집) + 아이템 분류(vision).
 *
 * M0 프로토타입(prototype/js/api.js)의 호출을 서버로 승격한 것이다. 달라진 점:
 *  - API 키가 브라우저 localStorage 가 아니라 서버 환경변수(GOOGLE_AI_API_KEY)다.
 *    클라이언트는 키를 절대 볼 수 없다.
 *  - 첨부 이미지 순서를 prompt.ts 의 imageOrder 가 정하고 여기서는 그대로 붙인다.
 *  - 에러를 AiError 로 분류해 게이트웨이가 재시도 여부를 판단할 수 있게 한다.
 * ========================================================================== */

import { isItemKind } from "@/lib/types";
import {
  AiError,
  base64ByteLength,
  fetchWithTimeout,
  readErrorBody,
  readImageInputAsInline,
  type AiCallOptions,
  type ImageGenRequest,
  type ImageGenResult,
  type ImageProvider,
  type InlineImage,
  type ItemClassifier,
  type ItemClassifyRequest,
  type ItemClassifyResult,
  type ItemKind,
} from "../types";

const PROVIDER_ID = "gemini";
const DEFAULT_API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_IMAGE_MODEL = "gemini-2.5-flash-image";
const DEFAULT_VISION_MODEL = "gemini-2.5-flash";

export interface GeminiConfig {
  apiKey?: string;
  apiBase?: string;
  model?: string;
}

// --- Gemini REST 응답에서 우리가 읽는 부분만 좁게 선언 -----------------------

interface GeminiInlineData {
  mimeType?: string;
  mime_type?: string;
  data?: string;
}

interface GeminiPart {
  text?: string;
  inlineData?: GeminiInlineData;
  inline_data?: GeminiInlineData;
}

interface GeminiResponse {
  candidates?: {
    content?: { parts?: GeminiPart[] };
    finishReason?: string;
  }[];
  promptFeedback?: { blockReason?: string };
  error?: { message?: string; status?: string };
}

function requireKey(config: GeminiConfig): string {
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

/** 안전 필터 차단은 재시도해도 같은 결과라 별도 코드로 올린다. */
function assertNotBlocked(json: GeminiResponse): void {
  const blockReason = json.promptFeedback?.blockReason;
  const finishReason = json.candidates?.[0]?.finishReason;
  if (blockReason || finishReason === "SAFETY" || finishReason === "PROHIBITED_CONTENT") {
    throw new AiError({
      code: "safety",
      provider: PROVIDER_ID,
      message: `Gemini 안전 필터 차단: ${blockReason ?? finishReason}`,
    });
  }
}

async function postJson(
  url: string,
  apiKey: string,
  body: unknown,
  timeoutMs: number,
  signal?: AbortSignal,
): Promise<GeminiResponse> {
  const response = await fetchWithTimeout(
    url,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify(body),
    },
    { provider: PROVIDER_ID, timeoutMs, signal },
  );

  if (!response.ok) {
    throw AiError.fromStatus(response.status, PROVIDER_ID, await readErrorBody(response));
  }

  let json: GeminiResponse;
  try {
    json = (await response.json()) as GeminiResponse;
  } catch (error) {
    throw new AiError({
      code: "invalid_response",
      provider: PROVIDER_ID,
      message: "Gemini 응답이 JSON 이 아님",
      cause: error,
    });
  }

  if (json.error) {
    throw new AiError({
      code: "upstream",
      provider: PROVIDER_ID,
      message: `Gemini 오류: ${json.error.status ?? ""} ${json.error.message ?? ""}`.trim(),
    });
  }
  return json;
}

function readInlineImage(json: GeminiResponse): InlineImage | null {
  const parts = json.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    const inline = part.inlineData ?? part.inline_data;
    if (inline?.data) {
      return {
        kind: "inline",
        mimeType: inline.mimeType ?? inline.mime_type ?? "image/png",
        base64: inline.data,
      };
    }
  }
  return null;
}

function readText(json: GeminiResponse): string | undefined {
  const parts = json.candidates?.[0]?.content?.parts ?? [];
  const text = parts
    .map((part) => part.text)
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .join("\n");
  return text.length > 0 ? text : undefined;
}

// ---------------------------------------------------------------------------
// 이미지 생성
// ---------------------------------------------------------------------------

export function createGeminiImageProvider(config: GeminiConfig = {}): ImageProvider {
  const apiBase = config.apiBase ?? process.env.GEMINI_API_BASE ?? DEFAULT_API_BASE;
  const model = config.model ?? process.env.GEMINI_IMAGE_MODEL ?? DEFAULT_IMAGE_MODEL;

  return {
    id: PROVIDER_ID,
    model,

    async generateImage(req: ImageGenRequest, options: AiCallOptions = {}): Promise<ImageGenResult> {
      const apiKey = requireKey(config);
      const timeoutMs = options.timeoutMs ?? 90_000;
      const startedAt = Date.now();

      // 첨부는 prompt.ts 가 정한 순서 그대로. 여기서 정렬을 다시 하면 지시서가 어긋난다.
      const parts: GeminiPart[] = [{ text: req.prompt }];
      for (const ref of req.images) {
        const inline = await readImageInputAsInline(ref.input, {
          provider: PROVIDER_ID,
          timeoutMs,
          signal: options.signal,
        });
        parts.push({ inline_data: { mime_type: inline.mimeType, data: inline.base64 } });
      }

      const body: Record<string, unknown> = { contents: [{ parts }] };

      // 화면 비율은 프롬프트 본문에도 적혀 있다. 모델 버전에 따라 imageConfig 를
      // 지원하지 않으면 400 이 나므로, 지원이 확인된 배포에서만 켠다.
      if (req.aspectRatio && process.env.GEMINI_IMAGE_ASPECT_CONFIG === "1") {
        body.generationConfig = { imageConfig: { aspectRatio: req.aspectRatio } };
      }

      const json = await postJson(
        `${apiBase}/models/${model}:generateContent`,
        apiKey,
        body,
        timeoutMs,
        options.signal,
      );
      assertNotBlocked(json);

      const image = readInlineImage(json);
      const text = readText(json);
      if (!image) {
        throw new AiError({
          code: "invalid_response",
          provider: PROVIDER_ID,
          message: `모델이 이미지를 반환하지 않음${text ? `: ${text.slice(0, 200)}` : ""}`,
        });
      }
      if (base64ByteLength(image.base64) === 0) {
        throw new AiError({
          code: "invalid_response",
          provider: PROVIDER_ID,
          message: "모델이 빈 이미지를 반환함",
        });
      }

      return { image, provider: PROVIDER_ID, model, text, latencyMs: Date.now() - startedAt };
    },
  };
}

// ---------------------------------------------------------------------------
// 아이템 분류 (드롭한 옷이 어느 슬롯인지)
// ---------------------------------------------------------------------------

const CLASSIFY_INSTRUCTION = [
  "이 사진에 있는 패션 아이템이 어느 종류인지 한 가지만 고르세요.",
  "선택지: top(티셔츠·셔츠·니트 등 상의), outer(재킷·코트·가디건), watch(손목시계),",
  "bag(가방), pants(바지·스커트 등 하의), shoes(신발), belt(벨트).",
  "confidence 는 0과 1 사이 숫자입니다. 확신이 없으면 낮게 주세요.",
  'JSON 만 출력하세요: {"kind":"...","confidence":0.0,"alternatives":[{"kind":"...","confidence":0.0}]}',
].join(" ");

interface ClassifyJson {
  kind?: string;
  confidence?: number;
  alternatives?: { kind?: string; confidence?: number }[];
}

/** 모델은 "shirt" 같은 값도 태연히 뱉는다. 도메인 계약의 가드로 7종만 통과시킨다. */
function toItemKind(value: unknown): ItemKind | null {
  return isItemKind(value) ? value : null;
}

function clamp01(value: unknown): number {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.min(1, Math.max(0, num));
}

/** 모델이 코드블록으로 감싸 주는 경우가 잦아 앞뒤 펜스를 벗겨낸다. */
function stripJsonFence(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/, "")
    .trim();
}

export function createGeminiItemClassifier(config: GeminiConfig = {}): ItemClassifier {
  const apiBase = config.apiBase ?? process.env.GEMINI_API_BASE ?? DEFAULT_API_BASE;
  const model = config.model ?? process.env.GEMINI_VISION_MODEL ?? DEFAULT_VISION_MODEL;

  return {
    id: PROVIDER_ID,
    model,

    async classify(req: ItemClassifyRequest, options: AiCallOptions = {}): Promise<ItemClassifyResult> {
      const apiKey = requireKey(config);
      const timeoutMs = options.timeoutMs ?? 30_000;
      const startedAt = Date.now();

      const inline = await readImageInputAsInline(req.image, {
        provider: PROVIDER_ID,
        timeoutMs,
        signal: options.signal,
      });

      const hint = req.hint ? ` 사용자는 ${req.hint} 자리에 두려고 합니다. 맞는지 확인해 주세요.` : "";
      const json = await postJson(
        `${apiBase}/models/${model}:generateContent`,
        apiKey,
        {
          contents: [
            {
              parts: [
                { text: CLASSIFY_INSTRUCTION + hint },
                { inline_data: { mime_type: inline.mimeType, data: inline.base64 } },
              ],
            },
          ],
          generationConfig: { responseMimeType: "application/json", temperature: 0 },
        },
        timeoutMs,
        options.signal,
      );
      assertNotBlocked(json);

      const text = readText(json);
      if (!text) {
        throw new AiError({
          code: "invalid_response",
          provider: PROVIDER_ID,
          message: "분류 응답이 비어 있음",
          userMessage: "어떤 옷인지 못 알아봤어요. 자리를 직접 골라 주세요.",
        });
      }

      let parsed: ClassifyJson;
      try {
        parsed = JSON.parse(stripJsonFence(text)) as ClassifyJson;
      } catch (error) {
        throw new AiError({
          code: "invalid_response",
          provider: PROVIDER_ID,
          message: `분류 응답 JSON 파싱 실패: ${text.slice(0, 120)}`,
          userMessage: "어떤 옷인지 못 알아봤어요. 자리를 직접 골라 주세요.",
          cause: error,
        });
      }

      const kind = toItemKind(parsed.kind);
      if (!kind) {
        throw new AiError({
          code: "invalid_response",
          provider: PROVIDER_ID,
          message: `분류 결과가 7종 밖의 값: ${String(parsed.kind)}`,
          userMessage: "어떤 옷인지 못 알아봤어요. 자리를 직접 골라 주세요.",
        });
      }

      const alternatives = (parsed.alternatives ?? [])
        .map((alt) => ({ kind: toItemKind(alt.kind), confidence: clamp01(alt.confidence) }))
        .filter((alt): alt is { kind: ItemKind; confidence: number } => alt.kind !== null && alt.kind !== kind);

      return {
        kind,
        confidence: clamp01(parsed.confidence),
        alternatives: alternatives.length > 0 ? alternatives : undefined,
        provider: PROVIDER_ID,
        model,
        latencyMs: Date.now() - startedAt,
      };
    },
  };
}
