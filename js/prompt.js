/* ─────────────────────────────────────────────────────────────
 * AI 착장 지시서(프롬프트) 빌더
 * 레퍼런스 사진 + 모델별 착장 아이템 + 깔맞춤 톤을
 * 이미지/영상 생성 모델에 전달할 지시문으로 조립한다.
 * ───────────────────────────────────────────────────────────── */

function buildOutfitPrompt(state) {
  const lines = [];
  lines.push('당신은 패션 화보 착장 전문가입니다. 첨부된 레퍼런스 사진을 기준으로 착장 합성 이미지를 생성하세요.');
  lines.push('');
  lines.push(`[레퍼런스] 첫 번째 첨부 이미지가 가이드 사진입니다. 사진 속 모델 ${state.modelCount}명의 얼굴, 체형, 포즈, 배경 분위기를 그대로 유지하세요.`);
  lines.push('');
  lines.push('[착장 지시]');

  let attachmentIndex = 2; // 1번은 레퍼런스
  const imageOrder = [];

  for (let m = 0; m < state.modelCount; m++) {
    const outfit = state.outfits[m] || {};
    const parts = Object.entries(outfit);
    if (parts.length === 0) {
      lines.push(`- 모델 ${m + 1} (왼쪽에서 ${m + 1}번째): 기존 착장 유지.`);
      continue;
    }
    lines.push(`- 모델 ${m + 1} (왼쪽에서 ${m + 1}번째):`);
    for (const [typeKey, item] of parts) {
      const def = ITEM_TYPES[typeKey];
      lines.push(`    · ${attachmentIndex}번째 첨부 이미지의 ${def.label}을(를) 이 모델의 ${def.bodyPart} 위치에 자연스럽게 착용시키세요.`);
      imageOrder.push(item);
      attachmentIndex++;
    }
  }

  const toneSummary = ToneState.summary();
  if (toneSummary.length > 0) {
    lines.push('');
    lines.push(`[깔맞춤 톤] 선택된 색: ${ToneState.colorName} (${ToneState.cssColor})`);
    for (const t of toneSummary) {
      lines.push(`- 모델 ${t.model}: ${t.parts.join(', ')} 부위를 위 색상 톤으로 통일감 있게 맞추세요.`);
    }
  }

  lines.push('');
  lines.push('[품질 요구] 조명·그림자·원단 질감이 레퍼런스와 자연스럽게 어우러지는 고해상도 패션 화보 스타일. 모델의 얼굴과 신원은 절대 변경하지 마세요.');

  return { prompt: lines.join('\n'), imageOrder };
}

function buildVideoPrompt(state) {
  const toneSummary = ToneState.summary();
  const toneLine = toneSummary.length > 0
    ? ` 깔맞춤된 ${ToneState.colorName} 컬러 포인트가 잘 보이도록.`
    : '';
  return (
    `첨부된 착장 이미지를 시작 프레임으로, 모델 ${state.modelCount}명이 패션 화보 촬영장에서 ` +
    `자연스럽게 포즈를 바꾸며 옷의 핏과 디테일을 보여주는 짧은 런웨이 스타일 영상.` +
    toneLine +
    ' 부드러운 카메라 무빙, 스튜디오 조명, 모델의 얼굴과 착장은 시작 프레임 그대로 유지.'
  );
}
