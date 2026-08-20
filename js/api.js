/* ─────────────────────────────────────────────────────────────
 * AI 생성 API 연동 (Google Gemini API)
 *  - 이미지: gemini-2.5-flash-image (레퍼런스+아이템 이미지 편집 합성)
 *  - 영상  : veo-3.0-generate-001 (생성 이미지 → 영상)
 * API 키는 localStorage('clothescut.apiKey')에만 저장된다.
 * ───────────────────────────────────────────────────────────── */

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const IMAGE_MODEL = 'gemini-2.5-flash-image';
const VIDEO_MODEL = 'veo-3.0-generate-001';

const Api = {
  get key() { return localStorage.getItem('clothescut.apiKey') || ''; },
  set key(v) { localStorage.setItem('clothescut.apiKey', v); },

  /** dataURL → { mimeType, data(base64) } */
  splitDataUrl(dataUrl) {
    const [head, data] = dataUrl.split(',');
    const mimeType = head.match(/data:(.*?);base64/)[1];
    return { mimeType, data };
  },

  /**
   * 착장 이미지 생성.
   * @param {string} prompt 착장 지시서
   * @param {string[]} imageDataUrls [레퍼런스, 아이템1, 아이템2, ...]
   * @returns {Promise<string>} 생성된 이미지 dataURL
   */
  async generateImage(prompt, imageDataUrls) {
    if (!this.key) throw new Error('API 키가 설정되지 않았습니다. 우측 상단 🔑 버튼으로 설정하세요.');

    const parts = [{ text: prompt }];
    for (const url of imageDataUrls) {
      parts.push({ inline_data: this.splitDataUrl(url) });
    }

    const res = await fetch(`${API_BASE}/models/${IMAGE_MODEL}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': this.key },
      body: JSON.stringify({ contents: [{ parts }] }),
    });
    if (!res.ok) throw new Error(`이미지 생성 실패 (${res.status}): ${await res.text()}`);

    const json = await res.json();
    const outParts = json.candidates?.[0]?.content?.parts || [];
    const imgPart = outParts.find(p => p.inlineData || p.inline_data);
    if (!imgPart) {
      const textPart = outParts.find(p => p.text);
      throw new Error('모델이 이미지를 반환하지 않았습니다. ' + (textPart ? textPart.text : ''));
    }
    const inline = imgPart.inlineData || imgPart.inline_data;
    return `data:${inline.mimeType || inline.mime_type};base64,${inline.data}`;
  },

  /**
   * 착장 이미지 → 영상 생성 (long-running 작업 폴링).
   * @returns {Promise<string>} 영상 blob URL
   */
  async generateVideo(prompt, imageDataUrl, onStatus = () => {}) {
    if (!this.key) throw new Error('API 키가 설정되지 않았습니다. 우측 상단 🔑 버튼으로 설정하세요.');

    const { mimeType, data } = this.splitDataUrl(imageDataUrl);
    const startRes = await fetch(`${API_BASE}/models/${VIDEO_MODEL}:predictLongRunning`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': this.key },
      body: JSON.stringify({
        instances: [{ prompt, image: { bytesBase64Encoded: data, mimeType } }],
      }),
    });
    if (!startRes.ok) throw new Error(`영상 생성 시작 실패 (${startRes.status}): ${await startRes.text()}`);

    const { name: opName } = await startRes.json();
    onStatus('영상 생성 중… (보통 1~3분 소요)');

    // 폴링
    for (let i = 0; i < 60; i++) {
      await new Promise(r => setTimeout(r, 8000));
      const pollRes = await fetch(`${API_BASE}/${opName}`, {
        headers: { 'x-goog-api-key': this.key },
      });
      if (!pollRes.ok) throw new Error(`영상 상태 확인 실패 (${pollRes.status})`);
      const op = await pollRes.json();
      if (op.error) throw new Error('영상 생성 오류: ' + JSON.stringify(op.error));
      if (op.done) {
        const video = op.response?.generateVideoResponse?.generatedSamples?.[0]?.video
                   || op.response?.generatedVideos?.[0]?.video;
        const uri = video?.uri;
        if (!uri) throw new Error('영상 URI를 찾지 못했습니다: ' + JSON.stringify(op.response));
        onStatus('영상 다운로드 중…');
        const sep = uri.includes('?') ? '&' : '?';
        const fileRes = await fetch(`${uri}${sep}key=${encodeURIComponent(this.key)}`);
        if (!fileRes.ok) throw new Error(`영상 다운로드 실패 (${fileRes.status})`);
        return URL.createObjectURL(await fileRes.blob());
      }
      onStatus(`영상 생성 중… (${(i + 1) * 8}초 경과)`);
    }
    throw new Error('영상 생성 시간 초과');
  },
};
