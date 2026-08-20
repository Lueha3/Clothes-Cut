/* ─────────────────────────────────────────────────────────────
 * Clothes-Cut 메인 앱
 * 흐름: 레퍼런스 업로드 → 모델 수 선택 → 아이템 업로드 →
 *       상체/하체 드롭존에 드래그(2단계 드래그: 정밀 위치는 자동 스냅) →
 *       깔맞춤 톤 선택 → 이미지·영상 생성
 * ───────────────────────────────────────────────────────────── */

const State = {
  referenceDataUrl: null,
  modelCount: 2,
  items: [],            // WardrobeItem[]
  // outfits[modelIndex] = { typeKey: WardrobeItem } — 같은 부위는 최신 아이템으로 교체
  outfits: {},
  generatedImageUrl: null,
  nextItemId: 1,
};

/* ═══════════ 유틸 ═══════════ */

const $ = sel => document.querySelector(sel);

function toast(msg, isError = false) {
  const el = document.createElement('div');
  el.className = 'toast' + (isError ? ' error' : '');
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.classList.add('show'));
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 400); }, 3200);
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

/* ═══════════ 1단계: 레퍼런스 & 모델 수 ═══════════ */

function initReferenceUpload() {
  const dz = $('#ref-dropzone');
  const input = $('#ref-input');

  dz.addEventListener('click', () => input.click());
  input.addEventListener('change', () => input.files[0] && setReference(input.files[0]));

  dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('dragging'); });
  dz.addEventListener('dragleave', () => dz.classList.remove('dragging'));
  dz.addEventListener('drop', e => {
    e.preventDefault();
    dz.classList.remove('dragging');
    const file = [...e.dataTransfer.files].find(f => f.type.startsWith('image/'));
    if (file) setReference(file);
  });
}

async function setReference(file) {
  State.referenceDataUrl = await readFileAsDataUrl(file);
  const img = $('#ref-preview');
  img.src = State.referenceDataUrl;
  img.hidden = false;
  $('#ref-placeholder').hidden = true;
  updatePromptPreview();
}

function initModelCount() {
  $('#model-count-buttons').addEventListener('click', e => {
    const btn = e.target.closest('button[data-count]');
    if (!btn) return;
    document.querySelectorAll('#model-count-buttons button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    State.modelCount = Number(btn.dataset.count);
    // 줄어든 모델의 착장/톤 선택 정리
    for (const key of Object.keys(State.outfits)) {
      if (Number(key) >= State.modelCount) delete State.outfits[key];
    }
    ToneState.clampToModelCount(State.modelCount);
    renderAvatars();
    renderToneGuideline();
    updatePromptPreview();
  });
}

/* ═══════════ 2단계: 아이템 팔레트 ═══════════ */

function initItemUpload() {
  $('#btn-add-item').addEventListener('click', () => $('#item-input').click());
  $('#item-input').addEventListener('change', async e => {
    for (const file of e.target.files) {
      const dataUrl = await readFileAsDataUrl(file);
      const type = guessItemType(file.name);
      State.items.push(new WardrobeItem(State.nextItemId++, type, dataUrl, file.name));
    }
    e.target.value = '';
    renderItemPalette();
  });
}

/** 파일명에서 종류 추측 (없으면 상의로 두고 사용자가 카드에서 변경) */
function guessItemType(fileName) {
  const n = fileName.toLowerCase();
  const table = [
    ['shoes', ['shoe', 'sneaker', 'boot', '신발', '운동화', '구두']],
    ['pants', ['pant', 'jean', 'trouser', 'slack', '바지', '팬츠', '청바지']],
    ['belt',  ['belt', '벨트']],
    ['watch', ['watch', '시계']],
    ['bag',   ['bag', '가방', '백팩', '토트']],
    ['outer', ['jacket', 'coat', 'outer', 'hoodie', '자켓', '재킷', '코트', '아우터', '점퍼']],
    ['top',   ['tee', 'shirt', 'top', '티', '셔츠', '상의']],
  ];
  for (const [type, keys] of table) {
    if (keys.some(k => n.includes(k))) return type;
  }
  return 'top';
}

function renderItemPalette() {
  const palette = $('#item-palette');
  palette.innerHTML = '';
  if (State.items.length === 0) {
    palette.innerHTML = '<p class="empty">아직 아이템이 없습니다. 사진을 추가해 보세요.</p>';
    return;
  }
  for (const item of State.items) {
    const card = document.createElement('div');
    card.className = `item-card zone-${item.def.zone}`;
    card.draggable = true;
    card.dataset.itemId = item.id;
    card.innerHTML = `
      <img src="${item.dataUrl}" alt="${item.def.label}" />
      <select class="item-type-select" title="아이템 종류">
        ${Object.entries(ITEM_TYPES).map(([k, d]) =>
          `<option value="${k}" ${k === item.type ? 'selected' : ''}>${d.emoji} ${d.label}</option>`).join('')}
      </select>
      <span class="zone-badge">${ZONE_LABEL[item.def.zone]}</span>
      <button class="item-remove" title="삭제">✕</button>
    `;
    card.querySelector('.item-type-select').addEventListener('change', e => {
      item.type = e.target.value;
      renderItemPalette();
    });
    card.querySelector('.item-remove').addEventListener('click', () => {
      State.items = State.items.filter(i => i.id !== item.id);
      renderItemPalette();
    });
    card.addEventListener('dragstart', e => {
      e.dataTransfer.setData('text/item-id', String(item.id));
      e.dataTransfer.effectAllowed = 'copy';
    });
    palette.appendChild(card);
  }
}

/* ═══════════ 3단계: 아바타 & 드롭존 ═══════════ */

const AVATAR_SVG = `
<svg viewBox="0 0 100 200" xmlns="http://www.w3.org/2000/svg" class="avatar-svg">
  <circle cx="50" cy="22" r="13" />                              <!-- 머리 -->
  <rect x="30" y="40" width="40" height="60" rx="12" />          <!-- 몸통 -->
  <rect x="18" y="44" width="10" height="52" rx="5" />           <!-- 왼팔 -->
  <rect x="72" y="44" width="10" height="52" rx="5" />           <!-- 오른팔 -->
  <rect x="32" y="102" width="15" height="82" rx="7" />          <!-- 왼다리 -->
  <rect x="53" y="102" width="15" height="82" rx="7" />          <!-- 오른다리 -->
  <ellipse cx="39" cy="190" rx="11" ry="6" />                    <!-- 왼발 -->
  <ellipse cx="61" cy="190" rx="11" ry="6" />                    <!-- 오른발 -->
</svg>`;

function renderAvatars() {
  const stage = $('#avatar-stage');
  stage.innerHTML = '';
  for (let m = 0; m < State.modelCount; m++) {
    const col = document.createElement('div');
    col.className = 'avatar-col';
    col.innerHTML = `
      <h4>모델 ${m + 1}</h4>
      <div class="avatar-frame" data-model="${m}">
        ${AVATAR_SVG}
        <div class="drop-zone upper" data-zone="upper"><span>상체</span></div>
        <div class="drop-zone lower" data-zone="lower"><span>하체</span></div>
        <div class="placed-layer"></div>
      </div>
      <ul class="outfit-list"></ul>
    `;
    stage.appendChild(col);
    initDropZones(col.querySelector('.avatar-frame'), m);
    renderPlacedItems(m);
  }
}

function initDropZones(frame, modelIndex) {
  for (const zoneEl of frame.querySelectorAll('.drop-zone')) {
    zoneEl.addEventListener('dragover', e => {
      if (!e.dataTransfer.types.includes('text/item-id')) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      zoneEl.classList.add('hover');
    });
    zoneEl.addEventListener('dragleave', () => zoneEl.classList.remove('hover'));
    zoneEl.addEventListener('drop', e => {
      e.preventDefault();
      zoneEl.classList.remove('hover');
      const id = Number(e.dataTransfer.getData('text/item-id'));
      const item = State.items.find(i => i.id === id);
      if (item) placeItem(modelIndex, item, zoneEl.dataset.zone);
    });
  }
}

/**
 * 2단계 드래그의 핵심:
 * 사용자는 상체/하체라는 "대략적 위치"만 잡아주고,
 * 실제 부착 위치는 아이템 종류의 앵커(발·손목·허리…)로 자동 스냅한다.
 * 영역이 어긋나면(예: 신발을 상체에 드롭) 올바른 영역으로 자동 매칭한다.
 */
function placeItem(modelIndex, item, droppedZone) {
  const def = item.def;
  if (def.zone !== droppedZone) {
    toast(`${def.emoji} ${def.label}은(는) ${ZONE_LABEL[def.zone]} 아이템이라 AI가 ${def.bodyPart} 위치로 자동 매칭했어요.`);
  } else {
    toast(`${def.emoji} ${def.label}을(를) 모델 ${modelIndex + 1}의 ${def.bodyPart}에 착장했습니다.`);
  }
  if (!State.outfits[modelIndex]) State.outfits[modelIndex] = {};
  State.outfits[modelIndex][item.type] = item; // 같은 부위는 교체
  renderPlacedItems(modelIndex);
  updatePromptPreview();
}

function removePlacedItem(modelIndex, typeKey) {
  if (State.outfits[modelIndex]) delete State.outfits[modelIndex][typeKey];
  renderPlacedItems(modelIndex);
  updatePromptPreview();
}

function renderPlacedItems(modelIndex) {
  const frame = document.querySelector(`.avatar-frame[data-model="${modelIndex}"]`);
  if (!frame) return;
  const layer = frame.querySelector('.placed-layer');
  const list = frame.parentElement.querySelector('.outfit-list');
  layer.innerHTML = '';
  list.innerHTML = '';

  const outfit = State.outfits[modelIndex] || {};
  for (const [typeKey, item] of Object.entries(outfit)) {
    const a = ITEM_TYPES[typeKey].anchor;
    // 앵커는 100x200 뷰박스 기준 → 퍼센트 변환 (y는 /2)
    const thumb = document.createElement('img');
    thumb.className = 'placed-thumb';
    thumb.src = item.dataUrl;
    thumb.title = ITEM_TYPES[typeKey].label;
    Object.assign(thumb.style, {
      left: `${a.x - a.w / 2}%`,
      top: `${(a.y - a.h / 2) / 2}%`,
      width: `${a.w}%`,
      height: `${a.h / 2}%`,
    });
    layer.appendChild(thumb);

    const li = document.createElement('li');
    li.innerHTML = `${ITEM_TYPES[typeKey].emoji} ${ITEM_TYPES[typeKey].label} → ${ITEM_TYPES[typeKey].bodyPart}
      <button title="착장 해제">✕</button>`;
    li.querySelector('button').addEventListener('click', () => removePlacedItem(modelIndex, typeKey));
    list.appendChild(li);
  }
}

/* ═══════════ 4단계: 깔맞춤 톤 UI ═══════════ */

function initToneControls() {
  const swatchRow = $('#tone-swatches');
  for (const p of TONE_PRESETS) {
    const b = document.createElement('button');
    b.className = 'swatch';
    b.style.background = `hsl(${p.h}, ${p.s}%, ${p.l}%)`;
    b.title = p.name;
    b.addEventListener('click', () => {
      ToneState.hue = p.h; ToneState.sat = p.s; ToneState.light = p.l;
      $('#tone-hue').value = p.h; $('#tone-sat').value = p.s; $('#tone-light').value = p.l;
      updateTonePreview();
    });
    swatchRow.appendChild(b);
  }
  for (const [id, prop] of [['#tone-hue', 'hue'], ['#tone-sat', 'sat'], ['#tone-light', 'light']]) {
    $(id).addEventListener('input', e => {
      ToneState[prop] = Number(e.target.value);
      updateTonePreview();
    });
  }
  updateTonePreview();
}

function updateTonePreview() {
  $('#tone-preview').style.background = ToneState.cssColor;
  $('#tone-name').textContent = ToneState.colorName;
  renderToneGuideline();
  updatePromptPreview();
}

function renderToneGuideline() {
  const wrap = $('#tone-guideline');
  wrap.innerHTML = '';
  for (let m = 0; m < State.modelCount; m++) {
    const row = document.createElement('div');
    row.className = 'tone-model-row';
    row.innerHTML = `<span class="tone-model-label">모델 ${m + 1}</span>`;
    const chips = document.createElement('div');
    chips.className = 'tone-chips';
    for (const partKey of TONE_PARTS) {
      const def = ITEM_TYPES[partKey];
      const chip = document.createElement('button');
      chip.className = 'tone-chip' + (ToneState.isSelected(m, partKey) ? ' selected' : '');
      chip.textContent = `${def.emoji} ${def.label}`;
      if (ToneState.isSelected(m, partKey)) chip.style.borderColor = ToneState.cssColor;
      chip.addEventListener('click', () => {
        ToneState.togglePart(m, partKey);
        renderToneGuideline();
        updatePromptPreview();
      });
      chips.appendChild(chip);
    }
    row.appendChild(chips);
    wrap.appendChild(row);
  }
}

/* ═══════════ 5단계: 생성 ═══════════ */

function updatePromptPreview() {
  const { prompt } = buildOutfitPrompt(State);
  $('#prompt-preview').textContent = prompt;
}

function setStatus(msg, isError = false) {
  const el = $('#generate-status');
  el.textContent = msg;
  el.classList.toggle('error', isError);
}

function initGenerate() {
  $('#btn-generate-image').addEventListener('click', async () => {
    if (!State.referenceDataUrl) return toast('레퍼런스 사진을 먼저 업로드하세요.', true);
    const hasOutfit = Object.values(State.outfits).some(o => Object.keys(o).length > 0);
    if (!hasOutfit) return toast('아이템을 하나 이상 착장해 주세요.', true);

    const btn = $('#btn-generate-image');
    btn.disabled = true;
    setStatus('🖼️ 착장 이미지 생성 중…');
    try {
      const { prompt, imageOrder } = buildOutfitPrompt(State);
      const images = [State.referenceDataUrl, ...imageOrder.map(i => i.dataUrl)];
      const url = await Api.generateImage(prompt, images);
      State.generatedImageUrl = url;
      showResultImage(url);
      $('#btn-generate-video').disabled = false;
      $('#btn-generate-video').title = '';
      setStatus('✅ 이미지 생성 완료! 이어서 영상도 만들 수 있어요.');
    } catch (err) {
      console.error(err);
      setStatus('❌ ' + err.message, true);
    } finally {
      btn.disabled = false;
    }
  });

  $('#btn-generate-video').addEventListener('click', async () => {
    if (!State.generatedImageUrl) return;
    const btn = $('#btn-generate-video');
    btn.disabled = true;
    setStatus('🎬 영상 생성 시작…');
    try {
      const url = await Api.generateVideo(buildVideoPrompt(State), State.generatedImageUrl, setStatus);
      showResultVideo(url);
      setStatus('✅ 영상 생성 완료!');
    } catch (err) {
      console.error(err);
      setStatus('❌ ' + err.message, true);
    } finally {
      btn.disabled = false;
    }
  });
}

function showResultImage(url) {
  const area = $('#result-area');
  area.querySelector('.result-image')?.remove();
  const fig = document.createElement('figure');
  fig.className = 'result-image';
  fig.innerHTML = `<img src="${url}" alt="생성된 착장 이미지" />
    <figcaption><a href="${url}" download="clothes-cut-result.png">⬇ 이미지 저장</a></figcaption>`;
  area.prepend(fig);
}

function showResultVideo(url) {
  const area = $('#result-area');
  area.querySelector('.result-video')?.remove();
  const fig = document.createElement('figure');
  fig.className = 'result-video';
  fig.innerHTML = `<video src="${url}" controls autoplay loop muted></video>
    <figcaption><a href="${url}" download="clothes-cut-result.mp4">⬇ 영상 저장</a></figcaption>`;
  area.appendChild(fig);
}

/* ═══════════ API 키 모달 ═══════════ */

function initApiKeyDialog() {
  const dialog = $('#api-key-dialog');
  $('#btn-api-key').addEventListener('click', () => {
    $('#api-key-input').value = Api.key;
    dialog.showModal();
  });
  $('#api-key-save').addEventListener('click', () => {
    Api.key = $('#api-key-input').value.trim();
    toast('API 키가 저장되었습니다.');
  });
}

/* ═══════════ 부트스트랩 ═══════════ */

initReferenceUpload();
initModelCount();
initItemUpload();
initToneControls();
initGenerate();
initApiKeyDialog();
renderItemPalette();
renderAvatars();
renderToneGuideline();
updatePromptPreview();
