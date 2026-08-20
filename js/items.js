/* ─────────────────────────────────────────────────────────────
 * 아이템 정의: 종류별 소속 영역(상체/하체)과 정밀 앵커 위치
 *
 * zone   : 아이템이 놓여야 하는 대분류 드롭존 (upper | lower)
 * anchor : 아바타 뷰박스(0~100 x 0~200) 기준의 정밀 부착 위치.
 *          사용자는 대략적인 영역에만 드래그하면 되고(2단계 드래그),
 *          실제 부착점은 여기 정의된 신체 부위로 자동 스냅된다.
 * ───────────────────────────────────────────────────────────── */
const ITEM_TYPES = {
  top:    { label: '티(상의)', emoji: '👕', zone: 'upper', anchor: { x: 50, y: 62,  w: 44, h: 40 }, bodyPart: '상체 몸통' },
  outer:  { label: '아우터',   emoji: '🧥', zone: 'upper', anchor: { x: 50, y: 60,  w: 54, h: 48 }, bodyPart: '상체 겉옷' },
  watch:  { label: '시계',     emoji: '⌚', zone: 'upper', anchor: { x: 82, y: 92,  w: 12, h: 12 }, bodyPart: '손목' },
  bag:    { label: '가방',     emoji: '👜', zone: 'upper', anchor: { x: 16, y: 78,  w: 18, h: 22 }, bodyPart: '어깨/손' },
  pants:  { label: '바지',     emoji: '👖', zone: 'lower', anchor: { x: 50, y: 132, w: 40, h: 52 }, bodyPart: '하체 다리' },
  shoes:  { label: '신발',     emoji: '👟', zone: 'lower', anchor: { x: 50, y: 186, w: 40, h: 16 }, bodyPart: '발' },
  belt:   { label: '벨트',     emoji: '🩹', zone: 'lower', anchor: { x: 50, y: 103, w: 40, h: 8  }, bodyPart: '허리' },
};

const ZONE_LABEL = { upper: '상체', lower: '하체' };

/* 깔맞춤 톤 선택이 가능한 부위 목록 (모든 착장 부위 클릭 가능) */
const TONE_PARTS = ['top', 'outer', 'watch', 'bag', 'pants', 'shoes', 'belt'];

/** 업로드된 아이템 카드 하나 */
class WardrobeItem {
  constructor(id, type, dataUrl, fileName) {
    this.id = id;
    this.type = type;        // ITEM_TYPES 키
    this.dataUrl = dataUrl;  // 이미지 data URL
    this.fileName = fileName;
  }
  get def() { return ITEM_TYPES[this.type]; }
}
