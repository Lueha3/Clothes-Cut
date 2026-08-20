/* ─────────────────────────────────────────────────────────────
 * 깔맞춤 톤 선택
 *  1) 색깔·채도 선택 (프리셋 스와치 + HSL 슬라이더)
 *  2) 모델별로 톤을 적용할 부위 클릭 선택
 * ───────────────────────────────────────────────────────────── */

const TONE_PRESETS = [
  { name: '네이비',   h: 220, s: 60, l: 30 },
  { name: '블랙',     h: 0,   s: 0,  l: 12 },
  { name: '아이보리', h: 45,  s: 40, l: 88 },
  { name: '버건디',   h: 345, s: 55, l: 30 },
  { name: '올리브',   h: 80,  s: 35, l: 35 },
  { name: '베이지',   h: 35,  s: 35, l: 70 },
  { name: '스카이블루', h: 200, s: 65, l: 65 },
  { name: '핑크',     h: 340, s: 70, l: 75 },
];

const ToneState = {
  hue: 220, sat: 60, light: 35,
  // selections[modelIndex] = Set<partKey>  ex) 0번 모델: {'top','belt'}
  selections: {},

  get cssColor() {
    return `hsl(${this.hue}, ${this.sat}%, ${this.light}%)`;
  },

  get colorName() {
    // 가장 가까운 프리셋 이름을 표시용으로 사용
    let best = null, bestDist = Infinity;
    for (const p of TONE_PRESETS) {
      const dh = Math.min(Math.abs(p.h - this.hue), 360 - Math.abs(p.h - this.hue));
      const d = dh * 1.2 + Math.abs(p.s - this.sat) + Math.abs(p.l - this.light);
      if (d < bestDist) { bestDist = d; best = p; }
    }
    const satDesc = this.sat >= 60 ? '선명한' : this.sat >= 25 ? '차분한' : '무채색에 가까운';
    return `${satDesc} ${best ? best.name : ''} 톤`;
  },

  togglePart(modelIndex, partKey) {
    if (!this.selections[modelIndex]) this.selections[modelIndex] = new Set();
    const set = this.selections[modelIndex];
    set.has(partKey) ? set.delete(partKey) : set.add(partKey);
  },

  isSelected(modelIndex, partKey) {
    return !!this.selections[modelIndex] && this.selections[modelIndex].has(partKey);
  },

  clampToModelCount(count) {
    for (const key of Object.keys(this.selections)) {
      if (Number(key) >= count) delete this.selections[key];
    }
  },

  /** 프롬프트용 요약: [{model:1, parts:['상의','벨트']}, ...] */
  summary() {
    const out = [];
    for (const [idx, set] of Object.entries(this.selections)) {
      if (set.size === 0) continue;
      out.push({
        model: Number(idx) + 1,
        parts: [...set].map(k => ITEM_TYPES[k].label),
      });
    }
    return out.sort((a, b) => a.model - b.model);
  },
};
