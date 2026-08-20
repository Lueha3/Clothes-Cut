/**
 * Clothes-Cut 도메인 공용 타입 — 드레스룸 캔버스·프롬프트 컴파일러·API 가 함께 보는 정본.
 *
 * 이 파일은 의존성이 없다(런타임 import 0개). 서버·클라이언트 어디서든 자유롭게 쓰라고
 * 일부러 그렇게 뒀다. Prisma 가 만든 타입을 여기서 재수출하지 않는 이유도 같다 —
 * `prisma generate` 를 돌리기 전이나 브라우저 번들에서도 이 파일은 항상 유효해야 한다.
 *
 * 대신 값 문자열은 prisma/schema.prisma 의 enum 과 글자 단위로 같다. 한쪽만 고치면
 * 컴파일은 통과하고 런타임에서 터지므로, 값을 바꿀 때는 두 파일을 함께 고칠 것.
 */

// ---------------------------------------------------------------------------
// 아이템 / 슬롯
// ---------------------------------------------------------------------------

/** 아이템 7종. 트레이의 분류이자 캔버스 슬롯 키 — 둘은 같은 축이다. */
export const ITEM_KINDS = [
  "top",
  "outer",
  "watch",
  "bag",
  "pants",
  "shoes",
  "belt",
] as const;

export type ItemKind = (typeof ITEM_KINDS)[number];

/** 슬롯 키는 아이템 종류와 1:1이다. 읽는 쪽 문맥에 맞춰 별칭을 둔다. */
export type SlotKey = ItemKind;

/** 상의 계열 / 하의 계열. 2단계 드래그의 1단계(대분류 드롭존)에 쓴다. */
export type SlotZone = "upper" | "lower";

export const ZONE_LABEL: Record<SlotZone, string> = {
  upper: "상체",
  lower: "하체",
};

/**
 * 아바타 스티커 좌표계. M0 프로토타입(prototype/js/items.js)의 100×200 뷰박스를
 * 그대로 승계한다. 세로가 가로의 2배라 y 값과 % 가 1:1이 아니다 — 직접 계산하지 말고
 * 아래 anchorBoxPct() / anchorCenterPct() 를 쓸 것.
 */
export const AVATAR_VIEWBOX = { width: 100, height: 200 } as const;

/** 뷰박스 기준 부착 위치. x,y 는 상자의 **중심**이다(좌상단 아님). */
export interface SlotAnchor {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface SlotMeta {
  key: ItemKind;
  /** UI 라벨. 트레이 칩·빈 슬롯 배지에 그대로 노출된다. */
  label: string;
  zone: SlotZone;
  /** 자동 재배치 토스트 문구에 들어가는 신체 부위명("시계는 손목이 어울려요"). */
  bodyPart: string;
  anchor: SlotAnchor;
  /**
   * 2D 스티커 겹침 순서(작을수록 아래). 신발·바지가 바닥, 아우터가 상의를 덮고,
   * 가방·시계가 맨 위에 온다 — 실제로 옷을 입는 순서와 같다.
   */
  layer: number;
}

/**
 * 슬롯 7종 정의. 앵커 좌표는 프로토타입 값 그대로다(검증된 수치라 임의로 바꾸지 말 것).
 */
export const SLOT_META: Record<ItemKind, SlotMeta> = {
  top: {
    key: "top",
    label: "티(상의)",
    zone: "upper",
    bodyPart: "상체 몸통",
    anchor: { x: 50, y: 62, w: 44, h: 40 },
    layer: 30,
  },
  outer: {
    key: "outer",
    label: "아우터",
    zone: "upper",
    bodyPart: "상체 겉옷",
    anchor: { x: 50, y: 60, w: 54, h: 48 },
    layer: 50,
  },
  watch: {
    key: "watch",
    label: "시계",
    zone: "upper",
    bodyPart: "손목",
    anchor: { x: 82, y: 92, w: 12, h: 12 },
    layer: 70,
  },
  bag: {
    key: "bag",
    label: "가방",
    zone: "upper",
    bodyPart: "어깨/손",
    anchor: { x: 16, y: 78, w: 18, h: 22 },
    layer: 60,
  },
  pants: {
    key: "pants",
    label: "바지",
    zone: "lower",
    bodyPart: "하체 다리",
    anchor: { x: 50, y: 132, w: 40, h: 52 },
    layer: 20,
  },
  shoes: {
    key: "shoes",
    label: "신발",
    zone: "lower",
    bodyPart: "발",
    anchor: { x: 50, y: 186, w: 40, h: 16 },
    layer: 10,
  },
  belt: {
    key: "belt",
    label: "벨트",
    zone: "lower",
    bodyPart: "허리",
    anchor: { x: 50, y: 103, w: 40, h: 8 },
    layer: 40,
  },
};

/** 트레이·필터·요약 카드에서 슬롯을 나열하는 기본 순서(상의 계열 → 하의 계열). */
export const SLOT_ORDER: readonly ItemKind[] = ITEM_KINDS;

/** 겹쳐 그릴 때의 순서. 아래에 깔릴 것부터 나온다. */
export const SLOT_RENDER_ORDER: readonly ItemKind[] = [...ITEM_KINDS].sort(
  (a, b) => SLOT_META[a].layer - SLOT_META[b].layer,
);

export function isItemKind(value: unknown): value is ItemKind {
  return typeof value === "string" && (ITEM_KINDS as readonly string[]).includes(value);
}

export function slotsInZone(zone: SlotZone): ItemKind[] {
  return ITEM_KINDS.filter((kind) => SLOT_META[kind].zone === zone);
}

/** 캔버스 컨테이너 크기와 무관하게 쓰는 % 박스. */
export interface PercentBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * 앵커를 컨테이너 기준 % 박스로 바꾼다(좌상단 기준).
 * 뷰박스가 100×200이라 x·w 는 그대로 %가 되고 y·h 는 절반이 된다.
 */
export function anchorBoxPct(kind: ItemKind): PercentBox {
  const { x, y, w, h } = SLOT_META[kind].anchor;
  return {
    left: ((x - w / 2) / AVATAR_VIEWBOX.width) * 100,
    top: ((y - h / 2) / AVATAR_VIEWBOX.height) * 100,
    width: (w / AVATAR_VIEWBOX.width) * 100,
    height: (h / AVATAR_VIEWBOX.height) * 100,
  };
}

/** translate(-50%, -50%) 로 중앙 정렬해 놓을 때 쓰는 중심 좌표(%). */
export function anchorCenterPct(kind: ItemKind): { x: number; y: number } {
  const { x, y } = SLOT_META[kind].anchor;
  return {
    x: (x / AVATAR_VIEWBOX.width) * 100,
    y: (y / AVATAR_VIEWBOX.height) * 100,
  };
}

// ---------------------------------------------------------------------------
// 상태 값 (prisma enum 과 동일)
// ---------------------------------------------------------------------------

export const AVATAR_STATUSES = ["draft", "processing", "ready", "failed"] as const;
export type AvatarStatus = (typeof AVATAR_STATUSES)[number];

export const PROJECT_STATUSES = ["draft", "done", "archived"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const GENERATION_KINDS = ["image", "video"] as const;
export type GenerationKind = (typeof GENERATION_KINDS)[number];

export const GENERATION_STATUSES = ["queued", "running", "done", "failed"] as const;
export type GenerationStatus = (typeof GENERATION_STATUSES)[number];

/** 아직 끝나지 않은 상태들. 탭 배지 "진행 중 N건" 과 폴링 종료 판정이 이 목록을 본다. */
export const ACTIVE_GENERATION_STATUSES: readonly GenerationStatus[] = ["queued", "running"];

export function isGenerationSettled(status: GenerationStatus): boolean {
  return status === "done" || status === "failed";
}

// ---------------------------------------------------------------------------
// 색
// ---------------------------------------------------------------------------

/** "#1B2A4A" 7자만 허용. DB CHECK 제약(prisma/rls.sql)과 같은 규칙이다. */
export const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

export function isHexColor(value: unknown): value is string {
  return typeof value === "string" && HEX_COLOR_PATTERN.test(value);
}

/** 저장 전 정규화. 대소문자가 섞이면 같은 색이 다른 문자열로 쌓인다. */
export function normalizeHex(value: string): string {
  return value.trim().toUpperCase();
}

/** CIELab 대표색. ΔE(CIEDE2000) 비교의 기준이라 hex 가 아니라 Lab 을 원본으로 둔다. */
export interface LabColor {
  L: number;
  a: number;
  b: number;
}

/**
 * 슬롯의 최종 색을 고른다. 토큰이 항상 이긴다 —
 * 토큰을 지정한 순간부터 그 부위의 색은 팔레트가 관리하는 값이어야 하고,
 * 예전에 찍어 둔 custom_hex 가 남아 있어도 그건 이력일 뿐이다.
 */
export function resolveSlotHex(
  tokenHex: string | null | undefined,
  customHex: string | null | undefined,
): string | null {
  if (isHexColor(tokenHex)) return normalizeHex(tokenHex);
  if (isHexColor(customHex)) return normalizeHex(customHex);
  return null;
}

// ---------------------------------------------------------------------------
// Json 컬럼 스키마 — DB 의 jsonb 를 읽고 쓰는 쪽이 공유하는 모양
// ---------------------------------------------------------------------------

/** avatars.sheet_urls. 컷이 늘어날 수 있어 전부 선택값으로 둔다. */
export interface AvatarSheetUrls {
  front?: string;
  side?: string;
  full?: string;
}

/** generations.input_refs 안의 슬롯 한 칸. 생성 시점의 착장을 그대로 굳힌 값이다. */
export interface GenerationSlotRef {
  slot: ItemKind;
  itemId: string;
  /** 배경 제거본이 있으면 그것, 없으면 원본. 생성 시점 URL 을 그대로 남긴다. */
  imageUrl: string;
  /** resolveSlotHex() 로 확정한 색. 색 지정이 없으면 null(아이템 원래 색 유지). */
  hex: string | null;
  tokenId: string | null;
  /** 지시서에 "NAVY" 처럼 이름으로 쓰기 위해 라벨도 함께 굳힌다. */
  tokenLabel: string | null;
}

/** generations.input_refs 전체. 아이템을 나중에 지워도 이 기록은 남는다. */
export interface GenerationInputRefs {
  avatarId: string;
  sheetUrls: AvatarSheetUrls;
  slots: GenerationSlotRef[];
  /** 영상 생성일 때 시작 프레임이 된 이미지 결과 URL. */
  sourceImageUrl?: string;
  aspectRatio?: AspectRatio;
}

export const ASPECT_RATIOS = ["9:16", "1:1", "16:9"] as const;
export type AspectRatio = (typeof ASPECT_RATIOS)[number];

/** 숏폼이 기본이다. */
export const DEFAULT_ASPECT_RATIO: AspectRatio = "9:16";

// ---------------------------------------------------------------------------
// 저장소 · 한도
// ---------------------------------------------------------------------------

export const STORAGE_BUCKETS = {
  avatars: "avatars",
  items: "items",
  results: "results",
} as const;

export type StorageBucket = (typeof STORAGE_BUCKETS)[keyof typeof STORAGE_BUCKETS];

/**
 * 업로드 경로는 반드시 `{user_id}/...` 로 시작해야 한다.
 * Storage RLS 가 첫 폴더 이름을 소유자 uuid 와 대조하므로, 규칙을 어기면 업로드가 거부된다.
 */
export function buildStorageObjectPath(userId: string, fileName: string): string {
  return `${userId}/${fileName}`;
}

/** 기획의 핵심 제약. DB 트리거(prisma/rls.sql)가 최종 방어선이고 UI 는 미리 막는다. */
export const MAX_AVATARS_PER_USER = 10;

/** 아바타 시트를 만들 레퍼런스 사진 장수. */
export const AVATAR_SOURCE_PHOTO_MIN = 1;
export const AVATAR_SOURCE_PHOTO_MAX = 5;

/** 압축 전 원본 상한. Storage 버킷의 file_size_limit(20MB)과 같은 값이다. */
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
