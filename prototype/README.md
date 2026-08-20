# M0 프로토타입 (보관용)

기획 초기의 정적 웹 프로토타입입니다. **더 이상 개발하지 않으며**, MVP 본체는 레포 루트의
Next.js 앱(`src/`)입니다.

여기 코드가 MVP로 승계된 부분:

| 프로토타입 | 승계 위치 | 비고 |
|---|---|---|
| `js/items.js`의 슬롯 앵커 좌표(100×200 뷰박스) | `src/lib/types.ts` SLOT_META | 드레스룸 캔버스·프롬프트 컴파일러의 단일 정본 |
| `js/prompt.js` 착장 지시서 조립 | `src/lib/ai/prompt.ts` | 순수 함수로 재작성, 색 HEX 지시 추가 |
| `js/api.js` Gemini/Veo 호출 | `src/lib/ai/providers/*` | **서버 사이드로 승격** — API 키를 브라우저에 두던 방식은 폐기 |

실행(참고용):

```bash
cd prototype && python3 -m http.server 8080
```
