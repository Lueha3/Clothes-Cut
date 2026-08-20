/* ============================================================================
 * 착장 지시서 컴파일러 — 이 제품의 핵심 로직.
 *
 * 아바타 시트 + 착장 슬롯 + 팔레트 토큰을 "이미지 편집 모델이 읽는 한 편의 지시서"로
 * 조립한다. 가장 중요한 불변식은 하나다:
 *
 *   출력 imageOrder 의 i번째 원소 = 프롬프트 본문의 "(i+1)번째 첨부 이미지"
 *
 * 이 대응이 한 칸이라도 밀리면 시계가 신발 자리에 붙는다. 그래서 첨부 목록을 먼저
 * 확정하고, 본문은 그 목록의 인덱스만 참조해서 쓴다.
 *
 * 전부 순수 함수다(입출력 결정적, 부수효과·시각·난수 없음). 같은 입력이면 같은
 * 문자열이 나와야 스냅샷 회귀 테스트로 모델 업데이트를 감지할 수 있다.
 * ========================================================================== */

import {
  DEFAULT_ASPECT_RATIO,
  SLOT_META,
  type AvatarSheetUrls,
  type GenerationSlotRef,
  type ItemKind,
} from "@/lib/types";
import type { AspectRatio, ImageInput, ImageRef } from "./types";

/**
 * 도메인 계약(@/lib/types)에서 이 파일이 실제로 쓰는 필드만 좁혀 받는다.
 * SLOT_META 에 필드가 더 있어도 상관없고, label/bodyPart 가 사라지면 여기서 바로 깨져
 * 계약 위반을 컴파일 타임에 알 수 있다.
 */
interface SlotMetaLike {
  label: string;
  bodyPart: string;
}
const SLOT: Record<ItemKind, SlotMetaLike> = SLOT_META;

/**
 * 지시서에 슬롯이 등장하는 고정 순서. 위에서 아래로(머리→발) 읽히게 두면
 * 모델이 착장을 겹쳐 입히는 순서도 자연스러워진다. 결정적 출력의 근거이기도 하다.
 */
export const SLOT_PROMPT_ORDER: readonly ItemKind[] = [
  "top",
  "outer",
  "watch",
  "bag",
  "belt",
  "pants",
  "shoes",
] as const;

export type AvatarSheetView = "front" | "side" | "full" | "back";

/** 아바타 시트 컷 순서. 정면이 신원 판정의 기준이라 항상 1번째 첨부다. */
export const SHEET_VIEW_ORDER: readonly AvatarSheetView[] = ["front", "side", "full", "back"] as const;

/**
 * 슬롯별 착용 방식 힌트. SLOT_META 의 bodyPart("손목")만으로는 모델이 시계를
 * 손등에 얹거나 가방을 공중에 띄우는 일이 잦아서, 프롬프트에서만 쓰는 문장을 따로 둔다.
 * 도메인 데이터가 아니라 프롬프트 문구라서 @/lib/types 가 아니라 여기 있다.
 */
const SLOT_FIT_HINT: Record<ItemKind, string> = {
  top: "어깨선과 소매 길이가 체형에 맞게 떨어지도록",
  outer: "상의 위에 겹쳐 입히고 앞섶은 첨부 이미지와 같은 상태로",
  watch: "왼쪽 손목 바깥쪽에 시계 문자판이 보이도록",
  bag: "어깨에 메거나 손에 들되 끈의 흐름이 자연스럽도록",
  belt: "허리선에 수평으로, 버클이 정면 중앙에 오도록",
  pants: "허리에서 발목까지 다리 실루엣을 따라 자연스럽게",
  shoes: "양발에 신기고 바닥에 닿는 접지면이 어색하지 않도록",
};

const SHEET_VIEW_LABEL: Record<AvatarSheetView, string> = {
  front: "정면 컷",
  side: "측면 컷",
  full: "전신 컷",
  back: "뒷면 컷",
};

// ---------------------------------------------------------------------------
// 입력 타입
// ---------------------------------------------------------------------------

export interface AvatarSheetRef {
  view: AvatarSheetView;
  image: ImageInput;
}

export interface AvatarSpec {
  id?: string;
  /** 표시용 이름. 프롬프트에는 넣지 않는다(모델이 이름을 이미지에 써 넣는 사고 방지). */
  name?: string;
  sheets: readonly AvatarSheetRef[];
  /** "키 175cm 마른 체형" 같은 사용자 메모. 있으면 신원 유지 절에 덧붙인다. */
  notes?: string;
}

/** 슬롯에 지정된 색. 토큰이 있으면 토큰 우선(스키마의 token_id 가 custom_hex 보다 앞서는 규칙과 같다). */
export interface SlotColorSpec {
  /** "#RRGGBB" 7자. 정규화는 호출자(color.ts 의 normalizeHex)가 끝내고 넘긴다. */
  hex: string;
  /** 팔레트 토큰 이름("NAVY"). 없으면 즉석 지정색. */
  tokenLabel?: string;
  tokenId?: string;
}

export interface OutfitItemSpec {
  slot: ItemKind;
  itemId?: string;
  /** 사용자가 붙인 이름. 없으면 슬롯 라벨로 대체한다. */
  label?: string;
  /** 배경 제거된 컷아웃을 우선 넣을 것. 없으면 원본. */
  image: ImageInput;
  color?: SlotColorSpec;
}

export interface PaletteTokenSpec {
  label: string;
  hex: string;
}

export interface SceneSpec {
  /** "밝은 스튜디오 무지 배경" 같은 한 줄. 없으면 기본 스튜디오 문구. */
  background?: string;
  /** "차분한 가을 무드" 같은 분위기 지시. */
  mood?: string;
  aspectRatio?: AspectRatio;
  /** 무드 레퍼런스 이미지. 착장이 아니라 톤 참고용으로만 쓰라고 명시한다. */
  moodImage?: ImageInput;
}

export interface OutfitPromptInput {
  avatar: AvatarSpec;
  slots: readonly OutfitItemSpec[];
  /** 이 프로젝트가 참조하는 팔레트 토큰 전체. 색 통일 절에 목록으로 넣는다. */
  palette?: readonly PaletteTokenSpec[];
  scene?: SceneSpec;
}

export interface CompiledPrompt {
  prompt: string;
  /** 첨부 순서. 어댑터는 이 순서 그대로 이미지를 붙여야 한다. */
  imageOrder: ImageRef[];
  /** 같은 입력이면 같은 값. 골든셋 스냅샷 키·생성 캐시 키로 쓴다. */
  fingerprint: string;
  /** 컴파일은 됐지만 사용자에게 알려야 할 것들. UI 가 그대로 띄워도 되는 한국어. */
  warnings: string[];
}

// ---------------------------------------------------------------------------
// 이미지 생성 지시서
// ---------------------------------------------------------------------------

/**
 * 착장 지시서를 만든다.
 * 실패하지 않는다 — 입력이 부실하면 warnings 에 담아 돌려주고, 막을지 말지는 호출자가 정한다.
 */
export function compileOutfitPrompt(input: OutfitPromptInput): CompiledPrompt {
  const warnings: string[] = [];

  const sheets = orderSheets(input.avatar.sheets, warnings);
  const slots = orderSlots(input.slots, warnings);
  const scene = input.scene ?? {};

  // 1) 첨부 목록부터 확정한다. 본문은 이 배열의 인덱스만 참조한다.
  const imageOrder: ImageRef[] = [
    ...sheets.map<ImageRef>((sheet) => ({
      role: "avatar_sheet",
      label: `아바타 시트 - ${SHEET_VIEW_LABEL[sheet.view]}`,
      sourceId: input.avatar.id,
      input: sheet.image,
    })),
    ...slots.map<ImageRef>((slot) => ({
      role: "item",
      label: itemLabel(slot),
      slot: slot.slot,
      sourceId: slot.itemId,
      input: slot.image,
    })),
  ];
  if (scene.moodImage) {
    imageOrder.push({ role: "mood", label: "무드 레퍼런스", input: scene.moodImage });
  }

  // 첨부 번호(1-based) 역참조 표
  const sheetIndex = new Map<AvatarSheetView, number>();
  sheets.forEach((sheet, i) => sheetIndex.set(sheet.view, i + 1));
  const slotIndex = new Map<ItemKind, number>();
  slots.forEach((slot, i) => slotIndex.set(slot.slot, sheets.length + i + 1));
  const moodIndex = scene.moodImage ? imageOrder.length : null;

  const lines: string[] = [];

  lines.push(
    "당신은 패션 화보 착장 전문가입니다. 첨부된 이미지들을 사용해 한 인물의 착장 사진 한 장을 만들어 주세요.",
  );

  // --- 첨부 이미지 목록 ---
  lines.push("", "[첨부 이미지]");
  imageOrder.forEach((ref, i) => {
    lines.push(`${i + 1}. ${ref.label}`);
  });

  // --- 신원 유지 ---
  lines.push("", "[신원 유지 - 가장 중요]");
  if (sheets.length > 0) {
    const sheetNumbers = sheets.map((s) => `${sheetIndex.get(s.view)}번`).join(", ");
    lines.push(
      `- ${sheetNumbers} 첨부는 모두 같은 인물의 아바타 시트입니다. 이 인물의 얼굴 생김새, 이목구비 비율, 헤어스타일, 피부톤, 체형을 그대로 유지하세요.`,
    );
    const faceRef = sheetIndex.get("front") ?? sheetIndex.get("full");
    if (faceRef) {
      lines.push(`- 얼굴은 ${faceRef}번 첨부를 기준으로 삼으세요. 미화, 보정, 나이 변경, 성별 변경은 하지 마세요.`);
    }
  } else {
    warnings.push("아바타 시트가 없어서 얼굴이 매번 달라질 수 있어요.");
    lines.push("- 참고할 아바타 시트가 없습니다. 인물은 자연스러운 성인 모델로 하되 과장된 표정은 피하세요.");
  }
  if (input.avatar.notes) {
    lines.push(`- 인물 특징 메모: ${collapse(input.avatar.notes)}`);
  }

  // --- 착장 지시 ---
  lines.push("", "[착장 지시]");
  if (slots.length === 0) {
    warnings.push("착장한 아이템이 없어요. 옷을 하나 올려볼까요?");
    lines.push("- 지정된 아이템이 없습니다. 아바타 시트의 기존 착장을 그대로 유지하세요.");
  }
  for (const slot of slots) {
    const meta = SLOT[slot.slot];
    const attachment = slotIndex.get(slot.slot);
    lines.push(
      `- ${meta.label}: ${attachment}번 첨부의 아이템을 이 인물의 ${meta.bodyPart}에 착용시키세요. ${SLOT_FIT_HINT[slot.slot]} 배치합니다.`,
    );
    lines.push(
      "    - 아이템의 디자인, 패턴, 프린트, 로고, 재질감, 실루엣은 첨부 이미지와 동일하게 유지하세요. 없던 디테일을 만들어 넣지 마세요.",
    );
    lines.push(
      slot.color
        ? `    - 색: ${colorInstruction(slot.color)}`
        : "    - 색: 첨부 이미지의 원래 색을 그대로 유지하세요.",
    );
  }

  const emptySlots = SLOT_PROMPT_ORDER.filter((key) => !slotIndex.has(key));
  if (slots.length > 0 && emptySlots.length > 0) {
    lines.push(
      `- 지정되지 않은 부위(${emptySlots.map((key) => SLOT[key].label).join(", ")})에는 새 아이템을 만들어 입히지 마세요. 아바타 시트의 상태를 그대로 두면 됩니다.`,
    );
  }

  // --- 색 통일 ---
  const colorSection = buildColorSection(slots, input.palette);
  if (colorSection.length > 0) {
    lines.push("", "[색 통일]", ...colorSection);
  }

  // --- 씬 ---
  lines.push("", "[씬과 촬영]");
  lines.push(`- 배경: ${scene.background ? collapse(scene.background) : "군더더기 없는 밝은 회색 스튜디오 배경"}`);
  if (scene.mood) lines.push(`- 무드: ${collapse(scene.mood)}`);
  if (moodIndex !== null) {
    lines.push(`- ${moodIndex}번 첨부는 분위기 참고용입니다. 이 이미지의 옷이나 인물은 절대 가져오지 마세요.`);
  }
  lines.push(
    `- 화면 비율: ${scene.aspectRatio ?? DEFAULT_ASPECT_RATIO} 세로 구도, 인물 전신이 잘리지 않게 담으세요.`,
  );
  lines.push("- 조명: 부드러운 스튜디오 조명. 옷의 실제 색이 그대로 보이도록 색이 있는 조명은 쓰지 마세요.");

  // --- 품질과 금지 ---
  lines.push("", "[품질]");
  lines.push("- 고해상도 패션 화보 품질. 원단 질감, 봉제선, 그림자가 자연스럽게 어우러지게 하세요.");
  lines.push("- 손가락, 신발 접지면, 옷의 겹침 순서가 어색하지 않은지 확인하세요.");

  lines.push("", "[금지]");
  lines.push("- 얼굴과 신원 변경");
  lines.push("- 첨부 아이템의 디자인이나 로고 변형");
  lines.push("- 지정된 HEX 색상에서 벗어난 색 사용");
  lines.push("- 이미지 안에 글자, 워터마크, 로고, 프레임 삽입");

  const prompt = lines.join("\n");
  return { prompt, imageOrder, fingerprint: fingerprintOf(prompt, imageOrder), warnings };
}

// ---------------------------------------------------------------------------
// 영상 지시서
// ---------------------------------------------------------------------------

/** MVP 는 런웨이 1개만 노출한다. 나머지는 M2 프리셋 확장용. */
export type VideoPreset = "runway" | "turn" | "pose";

const VIDEO_PRESET_MOTION: Record<VideoPreset, string> = {
  runway: "인물이 카메라 쪽으로 런웨이를 걷듯 두세 걸음 걸어오며 옷의 흐름과 핏을 보여줍니다.",
  turn: "인물이 제자리에서 천천히 한 바퀴 돌며 착장의 앞뒤를 차례로 보여줍니다.",
  pose: "인물이 제자리에서 자세를 두 번 바꾸며 상의와 하의의 디테일을 차례로 보여줍니다.",
};

export interface VideoPromptInput {
  /** 시작 프레임을 만든 착장 정보. 색 강조 문장을 뽑는 데만 쓴다. */
  outfit?: Pick<OutfitPromptInput, "slots" | "palette">;
  preset?: VideoPreset;
  durationSeconds?: number;
  scene?: Pick<SceneSpec, "mood" | "aspectRatio">;
}

export interface CompiledVideoPrompt {
  prompt: string;
  /** 부정 프롬프트를 지원하는 벤더에만 전달된다. */
  negativePrompt: string;
  fingerprint: string;
}

/**
 * 이미지에서 영상으로 넘어가는 지시서. 시작 프레임은 첨부로 따로 넘어가므로 여기서는 다루지 않는다.
 * 영상 모델이 얼굴을 다시 그리는 사고가 잦아 "시작 프레임 유지"를 반복해서 못 박는다.
 */
export function compileVideoPrompt(input: VideoPromptInput = {}): CompiledVideoPrompt {
  const preset = input.preset ?? "runway";
  const duration = clampDuration(input.durationSeconds ?? 6);
  const aspect = input.scene?.aspectRatio ?? DEFAULT_ASPECT_RATIO;

  const lines: string[] = [];
  lines.push("첨부된 착장 이미지를 시작 프레임으로 삼아 짧은 패션 영상 클립을 만드세요.");
  lines.push("");
  lines.push(`[동작] ${VIDEO_PRESET_MOTION[preset]}`);
  lines.push(`[길이] 약 ${duration}초, 컷 전환 없이 한 테이크로.`);
  lines.push(`[카메라] ${aspect} 세로 프레임. 아주 완만한 전진이나 팬 정도만, 흔들림 없이.`);
  lines.push("[조명] 시작 프레임과 같은 스튜디오 조명. 색온도를 바꾸지 마세요.");

  const highlighted = colorHighlight(input.outfit);
  if (highlighted) lines.push(`[색] ${highlighted}`);
  if (input.scene?.mood) lines.push(`[무드] ${collapse(input.scene.mood)}`);

  lines.push("");
  lines.push(
    "[유지] 인물의 얼굴과 신원, 착장한 아이템의 디자인과 색은 시작 프레임 그대로여야 합니다. 옷을 바꾸거나 새 아이템을 등장시키지 마세요.",
  );

  const prompt = lines.join("\n");
  const negativePrompt =
    "얼굴 변형, 신원 변경, 옷 교체, 로고 변형, 글자 삽입, 워터마크, 손가락 왜곡, 급격한 카메라 흔들림, 컷 전환";

  return { prompt, negativePrompt, fingerprint: fingerprintOf(prompt, []) };
}

// ---------------------------------------------------------------------------
// DB 스냅샷 → 컴파일러 입력 어댑터
//
// generations.input_refs(GenerationInputRefs)에 굳혀 둔 값으로 지시서를 다시 만들 수
// 있어야 재생성·회귀 테스트가 된다. 라우트가 손으로 매핑하다 슬롯 순서를 흐트러뜨리는
// 일을 막으려고 변환을 여기 둔다.
// ---------------------------------------------------------------------------

/** avatars.sheet_urls(jsonb) → 첨부용 시트 목록. 비어 있는 컷은 건너뛴다. */
export function avatarSheetsFromUrls(sheetUrls: AvatarSheetUrls): AvatarSheetRef[] {
  const entries: [AvatarSheetView, string | undefined][] = [
    ["front", sheetUrls.front],
    ["side", sheetUrls.side],
    ["full", sheetUrls.full],
  ];
  return entries.flatMap(([view, url]) =>
    url ? [{ view, image: { kind: "url", url } as ImageInput }] : [],
  );
}

/** generations.input_refs.slots → 착장 슬롯 목록. hex 가 null 이면 원래 색 유지다. */
export function outfitSlotsFromRefs(
  refs: readonly GenerationSlotRef[],
  labelByItemId: Readonly<Record<string, string>> = {},
): OutfitItemSpec[] {
  return refs.map((ref) => ({
    slot: ref.slot,
    itemId: ref.itemId,
    label: labelByItemId[ref.itemId],
    image: { kind: "url", url: ref.imageUrl } as ImageInput,
    color: ref.hex
      ? {
          hex: ref.hex,
          tokenLabel: ref.tokenLabel ?? undefined,
          tokenId: ref.tokenId ?? undefined,
        }
      : undefined,
  }));
}

// ---------------------------------------------------------------------------
// 내부 헬퍼 (전부 순수)
// ---------------------------------------------------------------------------

function itemLabel(slot: OutfitItemSpec): string {
  const name = slot.label ? collapse(slot.label) : "";
  const base = SLOT[slot.slot].label;
  return name ? `아이템 - ${base} "${name}"` : `아이템 - ${base}`;
}

/** 시트를 고정 순서로 정렬하고 같은 컷 중복은 첫 장만 남긴다. */
function orderSheets(sheets: readonly AvatarSheetRef[], warnings: string[]): AvatarSheetRef[] {
  const picked: AvatarSheetRef[] = [];
  for (const view of SHEET_VIEW_ORDER) {
    const found = sheets.find((sheet) => sheet.view === view);
    if (found) picked.push(found);
  }
  if (sheets.length > picked.length) {
    warnings.push("같은 각도의 아바타 컷이 여러 장이라 한 장씩만 썼어요.");
  }
  return picked;
}

/** 슬롯을 고정 순서로 정렬. 한 슬롯에 둘 이상이면 첫 번째만 쓴다(DB 유니크 제약과 같은 규칙). */
function orderSlots(slots: readonly OutfitItemSpec[], warnings: string[]): OutfitItemSpec[] {
  const picked: OutfitItemSpec[] = [];
  for (const key of SLOT_PROMPT_ORDER) {
    const matches = slots.filter((slot) => slot.slot === key);
    if (matches.length === 0) continue;
    if (matches.length > 1) {
      warnings.push(`${SLOT[key].label} 자리에 아이템이 여러 개라 첫 번째만 입혔어요.`);
    }
    picked.push(matches[0]);
  }
  return picked;
}

function colorInstruction(color: SlotColorSpec): string {
  const hex = color.hex.trim().toUpperCase();
  const token = color.tokenLabel ? ` (팔레트 토큰 ${color.tokenLabel})` : "";
  return (
    `정확히 ${hex}${token} 로 맞추세요. 조명에 따른 밝기 변화는 자연스럽게 두되, ` +
    "색상과 채도는 이 값에서 벗어나지 않아야 합니다."
  );
}

/** 같은 토큰을 쓰는 부위를 묶어 "물리적으로 같은 색"을 못 박는 절. */
function buildColorSection(
  slots: readonly OutfitItemSpec[],
  palette: readonly PaletteTokenSpec[] | undefined,
): string[] {
  const lines: string[] = [];

  // 토큰별로 어느 부위에 걸렸는지 모은다. slots 가 이미 고정 순서라 결과도 결정적이다.
  const byToken = new Map<string, { hex: string; slots: ItemKind[] }>();
  for (const slot of slots) {
    const label = slot.color?.tokenLabel;
    if (!slot.color || !label) continue;
    const entry = byToken.get(label);
    if (entry) entry.slots.push(slot.slot);
    else byToken.set(label, { hex: slot.color.hex.trim().toUpperCase(), slots: [slot.slot] });
  }

  for (const [label, entry] of byToken) {
    const parts = entry.slots.map((key) => SLOT[key].label).join(", ");
    lines.push(
      entry.slots.length > 1
        ? `- ${label} ${entry.hex}: ${parts} 부위는 서로 완전히 같은 색이어야 합니다. 부위마다 미묘하게 다른 색을 쓰지 마세요.`
        : `- ${label} ${entry.hex}: ${parts}`,
    );
  }

  const unusedTokens = (palette ?? []).filter((token) => !byToken.has(token.label));
  if (unusedTokens.length > 0) {
    lines.push(
      `- 참고 팔레트: ${unusedTokens
        .map((token) => `${token.label} ${token.hex.trim().toUpperCase()}`)
        .join(", ")} (지정된 부위에만 쓰고 다른 곳에 임의로 칠하지 마세요.)`,
    );
  }

  if (lines.length > 0) {
    lines.push("- 지정된 HEX 는 원단 고유색입니다. 그림자와 하이라이트는 이 색을 기준으로 만들어 주세요.");
  }
  return lines;
}

function colorHighlight(outfit: VideoPromptInput["outfit"]): string | null {
  if (!outfit) return null;
  const colored = SLOT_PROMPT_ORDER.flatMap((key) => {
    const slot = outfit.slots.find((candidate) => candidate.slot === key && candidate.color);
    return slot?.color ? [`${SLOT[key].label} ${slot.color.hex.trim().toUpperCase()}`] : [];
  });
  if (colored.length === 0) return null;
  return `${colored.join(", ")} 색이 화면에서 또렷하게 보이도록 하고, 시작 프레임과 같은 색을 유지하세요.`;
}

function clampDuration(seconds: number): number {
  if (!Number.isFinite(seconds)) return 6;
  return Math.min(10, Math.max(4, Math.round(seconds)));
}

/** 줄바꿈과 연속 공백을 한 칸으로. 사용자 입력이 지시서 구조를 깨뜨리지 않게. */
function collapse(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/**
 * FNV-1a 32bit. 암호용이 아니라 "같은 지시서인가"만 판별하는 값이라 이걸로 충분하고,
 * 의존성 없이 브라우저와 서버에서 같은 결과를 낸다.
 */
export function fingerprintOf(prompt: string, imageOrder: readonly ImageRef[]): string {
  const seed = [prompt, ...imageOrder.map((ref, i) => `${i}:${ref.role}:${ref.slot ?? "-"}:${ref.label}`)].join(" ");
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}
