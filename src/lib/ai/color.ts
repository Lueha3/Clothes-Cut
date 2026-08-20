/* ============================================================================
 * 색 유틸 — sRGB ↔ CIELab 변환, CIEDE2000 색차, 대표색 추출, Lab 리컬러.
 *
 * 이 파일은 전부 순수 함수다. 브라우저(리컬러 프리뷰)와 서버(Color QC) 양쪽에서
 * 같은 코드로 같은 숫자가 나와야 하므로 DOM·Canvas·fetch 의존을 두지 않는다.
 * 픽셀은 항상 호출자가 Uint8ClampedArray(RGBA)로 넘긴다.
 *
 * 색공간 기준: sRGB(IEC 61966-2-1) · 관측자 2° · 백색점 D65.
 * 기획서 §2.4 의 ΔE 판정(≤3 통과 / 3~6 보정 / >6 재생성)이 이 파일의 deltaE2000
 * 값을 그대로 쓴다.
 * ========================================================================== */

import type { LabColor } from "@/lib/types";

/**
 * CIELab. L 0~100, a·b 대략 -128~127.
 * 도메인 계약의 LabColor(items.base_color_lab 에 저장되는 모양)와 같은 타입이다 —
 * 두 벌로 늘리지 않으려고 별칭으로 둔다.
 */
export type Lab = LabColor;

/** sRGB 8비트. 0~255 정수. */
export interface Rgb {
  r: number;
  g: number;
  b: number;
}

/** D65 백색점(2° 관측자). Lab 변환의 정규화 기준. */
const WHITE_D65 = { x: 95.047, y: 100.0, z: 108.883 } as const;

const DEG = 180 / Math.PI;
const RAD = Math.PI / 180;

const clamp = (v: number, min: number, max: number): number =>
  v < min ? min : v > max ? max : v;

// ---------------------------------------------------------------------------
// HEX ↔ RGB
// ---------------------------------------------------------------------------

/** "#1B2A4A" / "1b2a4a" / "#abc" 를 받아 Rgb 로. 형식이 틀리면 null. */
export function parseHex(hex: string): Rgb | null {
  const raw = hex.trim().replace(/^#/, "");
  if (raw.length === 3) {
    if (!/^[0-9a-fA-F]{3}$/.test(raw)) return null;
    return {
      r: parseInt(raw[0] + raw[0], 16),
      g: parseInt(raw[1] + raw[1], 16),
      b: parseInt(raw[2] + raw[2], 16),
    };
  }
  if (raw.length === 6 && /^[0-9a-fA-F]{6}$/.test(raw)) {
    return {
      r: parseInt(raw.slice(0, 2), 16),
      g: parseInt(raw.slice(2, 4), 16),
      b: parseInt(raw.slice(4, 6), 16),
    };
  }
  return null;
}

/** DB(palette_tokens.hex)와 프롬프트에 들어가는 형식으로 고정: 대문자 7자 "#RRGGBB". */
export function formatHex({ r, g, b }: Rgb): string {
  const to2 = (v: number) => Math.round(clamp(v, 0, 255)).toString(16).toUpperCase().padStart(2, "0");
  return `#${to2(r)}${to2(g)}${to2(b)}`;
}

/**
 * 저장·비교 전 정규화. 유효하지 않으면 null 이라 API 입력 검증에 그대로 쓸 수 있다.
 * (@/lib/types 의 normalizeHex 는 검증 없이 대문자로만 바꾸는 가벼운 함수다. 사용자
 *  입력을 처음 받는 자리에서는 이쪽을, 이미 검증된 값에는 그쪽을 쓰면 된다.)
 */
export function normalizeHexStrict(hex: string): string | null {
  const rgb = parseHex(hex);
  return rgb ? formatHex(rgb) : null;
}

// ---------------------------------------------------------------------------
// sRGB ↔ Lab
// ---------------------------------------------------------------------------

/** sRGB 감마 해제(0~1 → 선형 0~1). */
export function srgbToLinear(channel01: number): number {
  return channel01 <= 0.04045 ? channel01 / 12.92 : Math.pow((channel01 + 0.055) / 1.055, 2.4);
}

/** 선형 0~1 → sRGB 감마 적용 0~1. */
export function linearToSrgb(linear01: number): number {
  return linear01 <= 0.0031308 ? linear01 * 12.92 : 1.055 * Math.pow(linear01, 1 / 2.4) - 0.055;
}

export function rgbToLab({ r, g, b }: Rgb): Lab {
  const lr = srgbToLinear(clamp(r, 0, 255) / 255);
  const lg = srgbToLinear(clamp(g, 0, 255) / 255);
  const lb = srgbToLinear(clamp(b, 0, 255) / 255);

  // sRGB → XYZ (D65). 행렬은 IEC 61966-2-1 표준값.
  const x = (lr * 0.4124564 + lg * 0.3575761 + lb * 0.1804375) * 100;
  const y = (lr * 0.2126729 + lg * 0.7151522 + lb * 0.072175) * 100;
  const z = (lr * 0.0193339 + lg * 0.119192 + lb * 0.9503041) * 100;

  const f = (t: number): number =>
    t > 216 / 24389 ? Math.cbrt(t) : (841 / 108) * t + 4 / 29;

  const fx = f(x / WHITE_D65.x);
  const fy = f(y / WHITE_D65.y);
  const fz = f(z / WHITE_D65.z);

  return { L: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
}

/** Lab → sRGB. sRGB 색역을 벗어나는 Lab 은 0~255 로 잘린다(가무트 클립). */
export function labToRgb({ L, a, b }: Lab): Rgb {
  const fy = (L + 16) / 116;
  const fx = fy + a / 500;
  const fz = fy - b / 200;

  const finv = (t: number): number => (t > 6 / 29 ? t * t * t : (108 / 841) * (t - 4 / 29));

  const x = finv(fx) * WHITE_D65.x;
  const y = finv(fy) * WHITE_D65.y;
  const z = finv(fz) * WHITE_D65.z;

  const lr = (x * 3.2404542 + y * -1.5371385 + z * -0.4985314) / 100;
  const lg = (x * -0.969266 + y * 1.8760108 + z * 0.041556) / 100;
  const lb = (x * 0.0556434 + y * -0.2040259 + z * 1.0572252) / 100;

  return {
    r: Math.round(clamp(linearToSrgb(lr) * 255, 0, 255)),
    g: Math.round(clamp(linearToSrgb(lg) * 255, 0, 255)),
    b: Math.round(clamp(linearToSrgb(lb) * 255, 0, 255)),
  };
}

export function hexToLab(hex: string): Lab | null {
  const rgb = parseHex(hex);
  return rgb ? rgbToLab(rgb) : null;
}

export function labToHex(lab: Lab): string {
  return formatHex(labToRgb(lab));
}

// ---------------------------------------------------------------------------
// 색차
// ---------------------------------------------------------------------------

/** CIE76 — 단순 유클리드 거리. 빠른 사전 필터용이고 판정 기준으로는 쓰지 않는다. */
export function deltaE76(x: Lab, y: Lab): number {
  return Math.hypot(x.L - y.L, x.a - y.a, x.b - y.b);
}

/** CIEDE2000 가중치. 그래픽 아트 기본값 1:1:1. */
export interface DeltaEWeights {
  kL?: number;
  kC?: number;
  kH?: number;
}

/**
 * CIEDE2000 색차(ΔE00). Sharma-Wu-Dalal(2005) 정식 공식 그대로 구현했다.
 * Color QC 의 판정값이라 근사식을 쓰지 않는다.
 */
export function deltaE2000(lab1: Lab, lab2: Lab, weights: DeltaEWeights = {}): number {
  const kL = weights.kL ?? 1;
  const kC = weights.kC ?? 1;
  const kH = weights.kH ?? 1;

  const { L: L1, a: a1, b: b1 } = lab1;
  const { L: L2, a: a2, b: b2 } = lab2;

  const C1 = Math.hypot(a1, b1);
  const C2 = Math.hypot(a2, b2);
  const cBar = (C1 + C2) / 2;

  const cBar7 = Math.pow(cBar, 7);
  const G = 0.5 * (1 - Math.sqrt(cBar7 / (cBar7 + 6103515625))); // 25^7 = 6103515625

  const a1p = (1 + G) * a1;
  const a2p = (1 + G) * a2;

  const C1p = Math.hypot(a1p, b1);
  const C2p = Math.hypot(a2p, b2);

  // 색상각. a'=b=0 인 무채색은 0으로 둔다(표준 규정).
  const hp = (b: number, ap: number): number => {
    if (b === 0 && ap === 0) return 0;
    const deg = Math.atan2(b, ap) * DEG;
    return deg >= 0 ? deg : deg + 360;
  };
  const h1p = hp(b1, a1p);
  const h2p = hp(b2, a2p);

  const dLp = L2 - L1;
  const dCp = C2p - C1p;

  let dhp: number;
  if (C1p * C2p === 0) {
    dhp = 0;
  } else {
    const diff = h2p - h1p;
    dhp = diff > 180 ? diff - 360 : diff < -180 ? diff + 360 : diff;
  }
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin((dhp / 2) * RAD);

  const LBarp = (L1 + L2) / 2;
  const CBarp = (C1p + C2p) / 2;

  let hBarp: number;
  if (C1p * C2p === 0) {
    hBarp = h1p + h2p;
  } else {
    const sum = h1p + h2p;
    const absDiff = Math.abs(h1p - h2p);
    hBarp = absDiff <= 180 ? sum / 2 : sum < 360 ? (sum + 360) / 2 : (sum - 360) / 2;
  }

  const T =
    1 -
    0.17 * Math.cos((hBarp - 30) * RAD) +
    0.24 * Math.cos(2 * hBarp * RAD) +
    0.32 * Math.cos((3 * hBarp + 6) * RAD) -
    0.2 * Math.cos((4 * hBarp - 63) * RAD);

  const dTheta = 30 * Math.exp(-Math.pow((hBarp - 275) / 25, 2));
  const CBarp7 = Math.pow(CBarp, 7);
  const RC = 2 * Math.sqrt(CBarp7 / (CBarp7 + 6103515625));
  const RT = -Math.sin(2 * dTheta * RAD) * RC;

  const SL = 1 + (0.015 * Math.pow(LBarp - 50, 2)) / Math.sqrt(20 + Math.pow(LBarp - 50, 2));
  const SC = 1 + 0.045 * CBarp;
  const SH = 1 + 0.015 * CBarp * T;

  const termL = dLp / (kL * SL);
  const termC = dCp / (kC * SC);
  const termH = dHp / (kH * SH);

  return Math.sqrt(termL * termL + termC * termC + termH * termH + RT * termC * termH);
}

/** HEX 두 개의 ΔE00. 팔레트 토큰과 측정색을 바로 비교할 때. */
export function deltaE2000Hex(hex1: string, hex2: string): number | null {
  const a = hexToLab(hex1);
  const b = hexToLab(hex2);
  return a && b ? deltaE2000(a, b) : null;
}

/** Color QC 판정(기획서 §2.4). MVP 는 측정만 하고 M2 에서 이 판정으로 루프를 돈다. */
export type ColorQcVerdict = "pass" | "correct" | "regenerate";

export const COLOR_QC_THRESHOLD = { pass: 3, correct: 6 } as const;

export function qcVerdict(deltaE: number): ColorQcVerdict {
  if (deltaE <= COLOR_QC_THRESHOLD.pass) return "pass";
  if (deltaE <= COLOR_QC_THRESHOLD.correct) return "correct";
  return "regenerate";
}

// ---------------------------------------------------------------------------
// 대표색 추출
// ---------------------------------------------------------------------------

export interface DominantColorOptions {
  /** 이 값 미만 알파는 배경(컷아웃 여백)으로 보고 버린다. 0~255. */
  alphaThreshold?: number;
  /** 명도 하위 몇 %를 그림자로 보고 버릴지. 0~0.49. */
  trimShadowRatio?: number;
  /** 명도 상위 몇 %를 하이라이트로 보고 버릴지. 0~0.49. */
  trimHighlightRatio?: number;
  /** 픽셀 샘플링 간격(1이면 전부). 큰 이미지는 4~8로 두면 결과가 거의 같고 훨씬 빠르다. */
  step?: number;
}

export interface DominantColorResult {
  lab: Lab;
  hex: string;
  /** 중앙값 계산에 실제로 쓰인 픽셀 수. 너무 적으면(<64) 신뢰하지 말 것. */
  sampleCount: number;
}

const DOMINANT_DEFAULTS = {
  alphaThreshold: 200,
  trimShadowRatio: 0.2,
  trimHighlightRatio: 0.2,
  step: 1,
} as const;

/**
 * RGBA 픽셀 배열에서 옷의 대표색을 뽑는다(기획서 §3.4 방식).
 *
 * 평균이 아니라 중앙값을 쓰는 이유: 로고·단추·재봉선 같은 소수 이색 픽셀이
 * 평균을 통째로 끌고 간다. 명도 상·하위를 잘라내는 이유: 접힘 그림자와 광택
 * 하이라이트는 같은 원단이어도 Lab 이 크게 벌어져 "이 옷의 색"이 아니다.
 *
 * 반환 Lab 은 items.base_color_lab 에 그대로 저장하는 값이다.
 */
export function extractDominantLab(
  rgba: Uint8ClampedArray | Uint8Array | number[],
  options: DominantColorOptions = {},
): DominantColorResult | null {
  const alphaThreshold = options.alphaThreshold ?? DOMINANT_DEFAULTS.alphaThreshold;
  const trimLow = clamp(options.trimShadowRatio ?? DOMINANT_DEFAULTS.trimShadowRatio, 0, 0.49);
  const trimHigh = clamp(options.trimHighlightRatio ?? DOMINANT_DEFAULTS.trimHighlightRatio, 0, 0.49);
  const step = Math.max(1, Math.floor(options.step ?? DOMINANT_DEFAULTS.step));

  const labs: Lab[] = [];
  for (let i = 0; i + 3 < rgba.length; i += 4 * step) {
    if (rgba[i + 3] < alphaThreshold) continue;
    labs.push(rgbToLab({ r: rgba[i], g: rgba[i + 1], b: rgba[i + 2] }));
  }
  if (labs.length === 0) return null;

  // 명도 순 정렬 후 양 끝을 잘라 중간톤만 남긴다.
  labs.sort((p, q) => p.L - q.L);
  const cutLow = Math.floor(labs.length * trimLow);
  const cutHigh = labs.length - Math.floor(labs.length * trimHigh);
  const midtones = cutHigh - cutLow >= 1 ? labs.slice(cutLow, cutHigh) : labs;

  const lab = medianLab(midtones);
  return { lab, hex: labToHex(lab), sampleCount: midtones.length };
}

/**
 * 성분별 중앙값. a·b 를 각각 따로 중앙값 내면 색상환을 가로지르는 분포(보라 vs 노랑)
 * 에서는 엉뚱한 색이 나올 수 있지만, 한 벌의 옷은 색상이 한 덩어리로 모여 있어
 * 실사용에서는 문제가 없고 계산이 훨씬 싸다.
 */
export function medianLab(labs: readonly Lab[]): Lab {
  if (labs.length === 0) return { L: 0, a: 0, b: 0 };
  const median = (values: number[]): number => {
    const sorted = [...values].sort((x, y) => x - y);
    const mid = sorted.length >> 1;
    return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  };
  return {
    L: median(labs.map((v) => v.L)),
    a: median(labs.map((v) => v.a)),
    b: median(labs.map((v) => v.b)),
  };
}

// ---------------------------------------------------------------------------
// 리컬러 (Lab 색 이동)
// ---------------------------------------------------------------------------

export interface RecolorOptions {
  /**
   * 목표색의 명도를 얼마나 따라갈지. 0~1, 기본 1.
   * 1이면 픽셀마다 (target.L - base.L) 만큼 평행 이동해 **원본의 명암 편차(=주름·
   * 그림자·질감)는 그대로 두고** 평균 명도만 목표색에 맞춘다.
   * 0이면 명도를 전혀 건드리지 않고 색상만 바꾼다(같은 밝기의 다른 색).
   */
  lightnessFollow?: number;
  /**
   * 원본 a·b 편차를 얼마나 남길지. 0~1, 기본 0.25.
   * 0이면 전 픽셀이 완전히 같은 색조가 되어 프린트·자수가 뭉개진다.
   * 1이면 원래 색조 변화를 그대로 안고 가서 목표색과 어긋난다.
   */
  chromaTexture?: number;
}

const RECOLOR_DEFAULTS = { lightnessFollow: 1, chromaTexture: 0.25 } as const;

/**
 * "이 아이템의 대표색(base)을 목표색(target)으로 옮기는" 픽셀 변환 함수를 만든다.
 * 반환 함수는 Lab → Lab 순수 매핑이라 단위 테스트가 쉽다.
 */
export function createRecolorMapper(
  base: Lab,
  target: Lab,
  options: RecolorOptions = {},
): (pixel: Lab) => Lab {
  const lightnessFollow = clamp(options.lightnessFollow ?? RECOLOR_DEFAULTS.lightnessFollow, 0, 1);
  const chromaTexture = clamp(options.chromaTexture ?? RECOLOR_DEFAULTS.chromaTexture, 0, 1);
  const dL = (target.L - base.L) * lightnessFollow;

  return (pixel: Lab): Lab => ({
    L: clamp(pixel.L + dL, 0, 100),
    a: target.a + (pixel.a - base.a) * chromaTexture,
    b: target.b + (pixel.b - base.b) * chromaTexture,
  });
}

export interface RecolorPixelsOptions extends RecolorOptions {
  /** 이 값 미만 알파 픽셀은 손대지 않는다(컷아웃 여백 보존). */
  alphaThreshold?: number;
}

/**
 * RGBA 픽셀 배열 리컬러. 입력을 변형하지 않고 새 배열을 돌려준다.
 * 리컬러 바텀시트의 즉시 프리뷰(오프스크린 Canvas)가 이 함수를 쓴다.
 */
export function recolorRgba(
  rgba: Uint8ClampedArray,
  base: Lab,
  target: Lab,
  options: RecolorPixelsOptions = {},
): Uint8ClampedArray {
  const alphaThreshold = options.alphaThreshold ?? 1;
  const map = createRecolorMapper(base, target, options);
  const out = new Uint8ClampedArray(rgba);

  for (let i = 0; i + 3 < out.length; i += 4) {
    if (out[i + 3] < alphaThreshold) continue;
    const next = labToRgb(map(rgbToLab({ r: out[i], g: out[i + 1], b: out[i + 2] })));
    out[i] = next.r;
    out[i + 1] = next.g;
    out[i + 2] = next.b;
  }
  return out;
}

/** 리컬러 결과가 목표색에 얼마나 닿았는지 자가 점검(프리뷰 품질 로그·M2 QC 예행). */
export function recolorAccuracy(
  rgba: Uint8ClampedArray,
  targetHex: string,
  options: DominantColorOptions = {},
): { deltaE: number; measuredHex: string; verdict: ColorQcVerdict } | null {
  const target = hexToLab(targetHex);
  const measured = extractDominantLab(rgba, options);
  if (!target || !measured) return null;
  const deltaE = deltaE2000(measured.lab, target);
  return { deltaE, measuredHex: measured.hex, verdict: qcVerdict(deltaE) };
}
