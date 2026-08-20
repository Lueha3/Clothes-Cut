# AI 게이트웨이 (src/lib/ai)

착장 이미지 생성, 영상 생성, 배경 제거, 아이템 분류를 **벤더 교체 가능한 어댑터**로 감싼 계층이다.
앱 코드(라우트 핸들러)는 `@/lib/ai/gateway` 하나만 import 한다. 벤더가 바뀌어도 라우트는 한 줄도 바뀌지 않는다.

## 1. 파일 구조와 의존 방향

```
src/lib/ai/
  types.ts                 계약(인터페이스·AiError·코덱·공용 fetch 유틸)
  prompt.ts                착장 지시서 컴파일러 (순수 함수)
  color.ts                 Lab 변환 · CIEDE2000 · 대표색 · 리컬러 (순수 함수)
  gateway.ts               어댑터 선택 + 재시도/타임아웃/로깅 + 공개 API   ← 앱은 여기만 본다
  providers/
    gemini-image.ts        이미지 생성 + 아이템 분류 (Gemini)
    veo-video.ts           영상 생성 시작/폴링/다운로드 (Veo)
    fal-bg.ts              배경 제거 (fal.ai BiRefNet)
```

의존 방향은 한 줄이다: `types.ts ← providers/* ← gateway.ts`.
(`prompt.ts`·`color.ts`는 아무것도 호출하지 않는 순수 모듈이라 어느 쪽에서도 자유롭게 쓴다.)

- `gateway.ts`, `providers/*` 는 **서버 전용**이다. 브라우저에서 부르면 `AiError(code: "config")` 를 던진다.
  (`server-only` 패키지는 이 프로젝트에 설치돼 있지 않아 런타임 가드로 대신한다 — §9 참고.)
- `color.ts` 는 **클라이언트에서도 쓴다**. 리컬러 바텀시트의 즉시 프리뷰가 이 파일을 그대로 부른다.
- `prompt.ts` 도 클라이언트에서 안전하다. 생성 화면의 "지시서 미리보기(접기)"를 같은 함수로 그린다.

## 2. 앱에서 쓰는 법

### 2.1 이미지 생성 (POST 즉시 응답 + 폴링)

```ts
import {
  compileOutfitPrompt,
  generateImageFromCompiled,
  avatarSheetsFromUrls,
  outfitSlotsFromRefs,
  AiError,
} from "@/lib/ai/gateway";

const compiled = compileOutfitPrompt({
  avatar: { id: avatar.id, sheets: avatarSheetsFromUrls(avatar.sheetUrls) },
  slots: outfitSlotsFromRefs(inputRefs.slots, labelByItemId),
  palette: tokens.map((t) => ({ label: t.label, hex: t.hex })),
  scene: { aspectRatio: "9:16" },
});

// compiled.warnings 는 사용자에게 그대로 보여줘도 되는 한국어다.
// compiled.prompt 는 generations.prompt_snapshot 에 그대로 저장한다.

try {
  const result = await generateImageFromCompiled(compiled, { requestId: generationId });
  // result.image = { kind:"inline", mimeType, base64 } → Storage(results 버킷)로 업로드
} catch (error) {
  if (AiError.is(error)) return Response.json(error.toResponse(), { status: 502 });
  throw error;
}
```

`generateImageFromCompiled` 를 쓰면 `compiled.imageOrder` 가 그대로 첨부되므로
"N번째 첨부" 대응이 어긋날 수 없다. 라우트에서 손으로 `ImageGenRequest` 를 조립하지 말 것.

### 2.2 영상 생성 (2단계 — 서버리스 타임아웃 회피)

한 요청으로 붙잡으면 함수 타임아웃에 걸린다. 반드시 시작과 폴링을 나눈다.

```ts
// POST /api/generations  → 즉시 202
const { opName, provider, model } = await startOutfitVideo({
  prompt: compileVideoPrompt({ outfit: { slots }, preset: "runway" }).prompt,
  startFrame: { kind: "url", url: imageResultUrl },
  aspectRatio: "9:16",
  durationSeconds: 6,
});
// generations: status=running, provider_op_name=opName, provider=provider 로 저장

// GET /api/generations/[id] → 폴링에서 1회 조회
const poll = await pollOutfitVideo(generation.providerOpName);
if (poll.status === "done") {
  const media = await fetchGeneratedVideo(poll.video);  // Uint8Array
  // → Storage 업로드 후 result_url 저장, status=done
} else if (poll.status === "failed") {
  // poll.error.userMessage 를 generations.error 에 저장
}
```

벤더가 준 영상 URL은 **인증이 필요하고 수명이 짧다**. 사용자에게 그대로 주지 말고
`fetchGeneratedVideo` 로 받아 Supabase Storage 로 옮긴 뒤 우리 URL을 내려줄 것.

### 2.3 배경 제거 · 분류 (옷 추가 플로우)

```ts
const { image } = await removeItemBackground({ image: { kind: "url", url: originalUrl } });
// image.url 은 fal 임시 URL → 곧바로 내려받아 items 버킷으로 옮기고 items.cutout_url 저장

const { kind, confidence, alternatives } = await classifyItem({ image });
// confidence 가 낮으면(예: < 0.6) 자동 배치하지 말고 "어느 자리에 둘까요?" 를 물을 것
```

## 3. 환경변수

| 변수 | 필수 | 기본값 | 설명 |
|---|---|---|---|
| `GOOGLE_AI_API_KEY` | O | — | Gemini 이미지·분류·Veo 공통 키. **서버 전용**(`NEXT_PUBLIC_` 금지) |
| `FAL_KEY` | O | — | fal.ai 키. 배경 제거 |
| `AI_IMAGE_PROVIDER` | | `gemini` | 이미지 어댑터 선택 |
| `AI_VIDEO_PROVIDER` | | `veo` | 영상 어댑터 선택 |
| `AI_BG_PROVIDER` | | `fal` | 배경 제거 어댑터 선택 |
| `AI_CLASSIFY_PROVIDER` | | `gemini` | 분류 어댑터 선택 |
| `GEMINI_API_BASE` | | `https://generativelanguage.googleapis.com/v1beta` | 프록시·리전 전환용 |
| `GEMINI_IMAGE_MODEL` | | `gemini-2.5-flash-image` | 이미지 모델 |
| `GEMINI_VISION_MODEL` | | `gemini-2.5-flash` | 분류 모델 |
| `GEMINI_IMAGE_ASPECT_CONFIG` | | (꺼짐) | `1` 이면 `generationConfig.imageConfig.aspectRatio` 를 함께 보낸다. 모델 버전이 지원하는지 확인한 배포에서만 켤 것 |
| `VEO_MODEL` | | `veo-3.0-generate-001` | 영상 모델 |
| `VEO_PERSON_GENERATION` | | (미전송) | 인물 생성 정책. 사람이 나오는 영상이 거부되면 `allow_adult` 로 설정 |
| `FAL_ENDPOINT` | | `https://fal.run` | fal 엔드포인트 |
| `FAL_BG_MODEL` | | `fal-ai/birefnet/v2` | 배경 제거 모델 |

`getAiProviderInfo()` 로 현재 물린 어댑터와 키 설정 여부를 확인할 수 있다(키 값 자체는 절대 반환하지 않는다).

## 4. 실행 정책 (재시도 · 타임아웃)

`AI_POLICY` (gateway.ts) 가 정본이며, 호출부에서 `options.retries` / `options.timeoutMs` 로 덮어쓸 수 있다.

| 작업 | 타임아웃 | 재시도 | 비고 |
|---|---|---|---|
| `generateOutfitImage` | 90s | 1 | 건당 과금이라 1회만 |
| `startOutfitVideo` | 30s | **0** | 접수된 요청을 다시 보내면 **두 번 과금**된다. 실패는 사용자에게 되묻는다 |
| `pollOutfitVideo` | 15s | 2 | 조회는 공짜 |
| `fetchGeneratedVideo` | 120s | 1 | 파일 다운로드 |
| `removeItemBackground` | 60s | 2 | 건당 비용이 작다 |
| `classifyItem` | 30s | 2 | 〃 |

- 백오프: 600ms → 1.2s → 2.4s … 상한 8s, ±25% 지터.
- `AiError.retryable === false` 면 즉시 중단한다(설정·인증·안전 필터·할당량·형식 오류).
- 호출자 `AbortSignal` 이 끊기면 대기 중이던 재시도도 즉시 멈춘다.
- 로그는 한 줄 JSON(`{"tag":"ai",...}`). **프롬프트 본문과 base64 는 절대 남기지 않고** 길이만 남긴다.

## 5. 에러 처리

모든 실패는 `AiError` 로 통일된다.

| code | 재시도 | 사용자에게 보이는 문구(기본) |
|---|---|---|
| `config` / `auth` | X | 생성 기능이 아직 준비되지 않았어요. 잠시 뒤에 다시 시도해 주세요. |
| `rate_limit` | O | 지금 요청이 몰렸어요. 조금 뒤에 다시 해볼까요? |
| `quota` | X | 오늘 생성 한도를 다 썼어요. 내일 다시 만나요. |
| `timeout` / `network` / `upstream` | O | 한 번만 더 해볼까요? 계열 문구 |
| `invalid_response` | X | 결과를 받지 못했어요. 한 번만 더 해볼까요? |
| `safety` | X | 이 사진이나 지시로는 만들기 어려워요. 다른 사진으로 해볼까요? |
| `canceled` | X | 생성을 멈췄어요. |

`error.toResponse()` 가 `{ ok:false, error, code, retryable }` 를 만들어 준다 —
프로젝트 공통 API 응답 봉투와 같은 모양이라 라우트에서 그대로 반환하면 된다.
`error.message`(개발자용)에는 벤더 응답 일부가 들어 있으니 **사용자에게 노출하지 말 것**.

## 6. 어댑터 교체 / 추가

예: 이미지 생성을 Seedream 으로 바꾸려면

1. `src/lib/ai/providers/seedream-image.ts` 를 만들고 `ImageProvider` 를 구현한다
   (`id`, `model`, `generateImage`). 실패는 반드시 `AiError` 로 던진다 —
   `AiError.fromStatus(status, id, detail)` 이 HTTP 상태를 코드로 옮겨 준다.
2. `gateway.ts` 의 `IMAGE_FACTORIES` 에 `seedream: () => createSeedreamImageProvider()` 한 줄 추가.
3. 배포 환경변수에 `AI_IMAGE_PROVIDER=seedream`.

라우트·프롬프트·DB 는 손대지 않는다. W0 벤치마크(이미지 모델 3종 비교)가 이 구조를 전제로 한다.

새 어댑터가 지켜야 할 규칙:
- 첨부 이미지 순서를 **재정렬하지 말 것**. `req.images` 순서가 지시서의 "N번 첨부"다.
- 이미지 입력이 URL 이면 `readImageInputAsInline()` 로 받아 상한(20MB)을 함께 검사한다.
- 장시간 작업은 어댑터 안에서 기다리지 말고 start/poll 로 쪼갠다.
- API 키는 URL 쿼리가 아니라 헤더로 보낸다(로그·리퍼러 유출 방지).

## 7. 벤더별 비용과 제약 (기획서 §4 기준 추정 — 실제 단가는 벤더 페이지에서 재확인할 것)

| 용도 | 벤더/모델 | 대략 비용 | 제약 |
|---|---|---|---|
| 착장 이미지 | Gemini 2.5 Flash Image | $0.03~0.06 / 장 | 멀티 이미지 첨부, 안전 필터 존재. 화면 비율 파라미터는 모델 버전에 따라 다름(§3의 `GEMINI_IMAGE_ASPECT_CONFIG`) |
| 영상 | Veo 3.x | $1~3 / 컷 | 1~3분 소요, long-running operation, 결과 URL 수명 짧음. **재시도 금지** |
| 배경 제거 | fal.ai BiRefNet v2 | ~$0.002 / 건 | 동기 응답. 결과는 fal 임시 URL |
| 아이템 분류 | Gemini 2.5 Flash (vision) | 매우 작음 | JSON 강제 출력. 7종 밖 값이 오면 `invalid_response` |

콘텐츠 1편 = 이미지 몇 장 + 영상 1컷 ≈ **$3~8**. 생성 라우트에는 반드시 rate limit 을 건다
(예: `generate-image:{userId}` 60초에 3회).

## 8. 순수 모듈 두 개

### 8.1 `prompt.ts` — 착장 지시서 컴파일러

불변식: **`imageOrder[i]` = 프롬프트의 `(i+1)번 첨부`**. 이 대응이 밀리면 시계가 신발 자리에 붙는다.

- 첨부 순서: 아바타 시트(정면 → 측면 → 전신) → 아이템(top, outer, watch, bag, belt, pants, shoes) → 무드 레퍼런스.
- 입력 배열의 순서와 무관하게 항상 같은 결과가 나온다(결정적). `fingerprint` 로 스냅샷 회귀 테스트를 건다.
- 색이 지정된 슬롯은 **HEX 원문을 그대로** 문장에 넣고, 같은 토큰을 쓰는 부위는 "서로 완전히 같은 색" 을 못 박는다.
- 얼굴·신원 유지 지시는 항상 들어간다. 빈 슬롯에는 "새로 만들어 입히지 마세요" 를 넣어 모델의 창작을 막는다.
- 예외를 던지지 않는다. 부실한 입력은 `warnings`(한국어)로 돌려주고 막을지 말지는 호출자가 정한다.
- DB 스냅샷 어댑터: `avatarSheetsFromUrls(avatars.sheet_urls)`, `outfitSlotsFromRefs(generations.input_refs.slots)`.

### 8.2 `color.ts` — 색 계산

| 함수 | 용도 |
|---|---|
| `rgbToLab` / `labToRgb` / `hexToLab` / `labToHex` | sRGB(D65) ↔ CIELab |
| `deltaE2000(lab1, lab2)` | CIEDE2000 색차. Color QC 판정의 근거 |
| `qcVerdict(dE)` | `pass`(≤3) / `correct`(3~6) / `regenerate`(>6) — 기획서 §2.4 |
| `extractDominantLab(rgba)` | 대표색. 투명 픽셀 제외 → 명도 상·하위 20% 잘라 하이라이트/그림자 제거 → 성분별 중앙값 |
| `createRecolorMapper(base, target)` / `recolorRgba(...)` | Lab 색 이동. 명암 편차(질감)를 그대로 두고 평균 명도만 목표색에 맞춘다 |
| `recolorAccuracy(rgba, targetHex)` | 리컬러 결과를 다시 측정해 ΔE 를 확인 |

`normalizeHexStrict()` 는 검증까지 하고 실패 시 `null` 을 준다.
(`@/lib/types` 의 `normalizeHex()` 는 검증 없이 대문자로만 바꾸는 가벼운 함수다. 사용자 입력을 처음 받는 자리에는 strict 쪽을 쓴다.)

**검산 결과** (Node 로 실측, 2026-08-20):
- sRGB→Lab: `#FFFFFF`→(100,0,0), `#FF0000`→(53.2408, 80.0925, 67.2032), `#00FF00`→(87.7347, -86.1827, 83.1793), `#0000FF`→(32.2970, 79.1875, -107.8602), `#808080`→L 53.5850 — 표준값과 소수 4자리까지 일치.
- RGB→Lab→RGB 왕복 오차 0 (전 색역 격자 검사).
- CIEDE2000: Sharma-Wu-Dalal(2005) 검증 데이터 **34/34 통과**(허용오차 0.0001), 대칭성 확인.
- 대표색: 네이비 원단 + 그림자 + 하이라이트 + 흰 로고 + 투명 여백을 섞은 합성 픽셀에서 `#1B2A4A` 정확히 복원.
- 리컬러: 네이비→버건디 변환 후 재측정 ΔE00 = 0.000, 원본 명암 편차 보존, 입력 배열 불변, 투명 픽셀 유지.

## 9. 알려진 한계 / 다음 사람이 확인할 것

1. **실제 네트워크 호출은 아직 한 번도 하지 않았다.** 키가 없어서다. 요청 조립·응답 파싱·에러 분류·재시도는
   fetch 를 스텁으로 갈아끼운 시나리오 테스트로 전부 검증했지만, 벤더 실 응답 형식은 W0 에서 키를 받은 뒤
   한 번씩 찍어 보고 맞춰야 한다. 특히:
   - Gemini 이미지: `generationConfig.imageConfig.aspectRatio` 지원 여부 (→ `GEMINI_IMAGE_ASPECT_CONFIG`)
   - Veo: `parameters` 의 `durationSeconds` / `personGeneration` 허용값
   - fal BiRefNet v2: 입력 필드명(`image_url`)과 응답(`image.url`)
2. **`server-only` 패키지가 설치돼 있지 않다.** package.json 수정 금지 규칙 때문에 런타임 가드
   (`typeof window !== "undefined"`)로 대신했다. 설치가 허용되면 `gateway.ts`·`providers/*` 맨 위에
   `import "server-only"` 를 넣어 번들 단계에서 막는 편이 안전하다.
3. **웹푸시(생성 완료 알림)는 이 계층 밖이다.** `web-push` 도 미설치다(W5에서 판단할 것).
4. **`next.config.ts` 에 아직 아무 설정이 없다.** 이 계층이 도는 데 필요한 것:
   - 생성 라우트에 `export const maxDuration = 60` (플랜 상한 확인)
   - Supabase Storage 이미지를 `next/image` 로 쓸 거면 `images.remotePatterns`
   - CSP 를 도입한다면 `connect-src` 에 `https://generativelanguage.googleapis.com`, `https://fal.run` 추가
5. **Color QC 루프(M2)는 아직 없다.** `deltaE2000` / `qcVerdict` / `extractDominantLab` 은 준비돼 있으니,
   의류 세그먼테이션(Grounded-SAM 2 등)만 어댑터로 하나 더 붙이면 된다. 인터페이스는 `types.ts` 에
   `ItemClassifier` 옆에 `SegmentationProvider` 를 추가하는 모양이 자연스럽다.
6. **골든셋 회귀 테스트 러너가 없다.** 이 리포에는 vitest/jest 가 설치돼 있지 않아 검증을
   `node --experimental-strip-types` 스크립트로 돌렸다. 테스트 러너가 들어오면
   `compileOutfitPrompt` 의 `fingerprint` 를 스냅샷 키로 삼아 20세트 골든셋을 고정할 것.
