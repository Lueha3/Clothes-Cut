# Clothes-Cut MVP 개발계획 (모바일 웹, v1 — 2026-08-20)

> 기획안(docs/PLAN.md) M1 범위를 **모바일 웹**으로 구현하는 6주 계획.
> 디자인은 꿈꾸는교회 동아리 앱(Dreaming-vote)의 "꿈꾸는 하늘" 디자인 시스템에서 이식.
> 이 문서는 계획 전용 — 코드는 아직 작성하지 않음.

---

## 1. 목표와 범위

**목표**: 폰 브라우저에서 신규 사용자가 **10분 안에** 아바타 선택 → 옷 착장 → 색 지정 → 이미지+영상 1편 추출.

### MVP 포함 (M1)
- 계정(로그인) + 아바타 영구 저장 10슬롯 (사진 업로드 방식)
- 드레스룸: 부위별 스티커 슬롯 7개, 드래그/탭 착장, 자동 배경제거·분류
- 아이템 탭 → 리컬러 바텀시트 (팔레트 토큰 + HEX + 채도·명도)
- 팔레트 토큰 (토큰 수정 시 연결 아이템 일괄 변경)
- 이미지 생성 → 영상 생성(런웨이 1프리셋) → 9:16 추출, 생성 라이브러리
- 옷장 (업로드한 아이템 재사용)

### MVP 제외 (M2 이후)
- Color QC ΔE 자동 검증 루프 (M2) — 단, ΔE 측정에 필요한 데이터(토큰 지정 이력)는 MVP 스키마에 미리 저장
- 프로그램 내 아바타 생성(경로 B), 다중 모델 씬, LoRA, 결제

---

## 2. 디자인 방향 — "꿈꾸는 하늘" 이식

Dreaming-vote 레포 분석 결과(`design/DESIGN_GUIDE.md`, `src/app/globals.css`, `BottomTabBar.tsx`), 완성도 높은 디자인 시스템이 이미 있어 **그대로 이식 + 2가지 예외 규칙**으로 간다.

### 2.1 가져오는 것 (이식)
| 요소 | 내용 |
|---|---|
| 배경 | 하늘 그라데이션 `#E9F5FC → #CCE4F6 → #BCDCF2` (fixed) |
| 서피스 | `.glass-card` frosted glass (white .78 + blur 22 + radius 24 + 하늘 그림자), `.glass-soft` 칩/배지 |
| 텍스트 | 잉크 3단계 `#3A4149 / #5E6973 / #8A95A1`, `word-break: keep-all` |
| 포인트 | 골드 `#F0B429` · 틸 `#35C3B4` · 하늘 `#7FBDE4` (+ 각 -deep/-ink 변형), `.btn-gold` 주 CTA, `.gradient-text`, `.glass-ribbon` |
| 폰트 | Pretendard Variable |
| 모바일 패턴 | 하단 탭바(5탭, 배지, safe-area 여백), 햅틱(`triggerHaptic`), 바텀시트 문법 |
| 문구 톤 | 따뜻하고 가벼운 청년부 말투 → "오늘의 착장, 10분이면 돼요!" 류로 각색 |

### 2.2 예외 규칙 (Clothes-Cut 특성)
1. **드레스룸 캔버스는 중성 배경** — 색 깔맞춤이 제품의 생명이므로, 옷 색을 판별하는 캔버스 영역만은 하늘색 배경·글래스 블러를 걷어내고 **무채색 서피스**(`#F4F5F6` 류) 위에 렌더링한다. 색이 있는 배경은 색 지각을 왜곡한다. 크롬(탭바·헤더·시트·버튼)은 하늘 글래스 유지.
2. **브랜드 액센트 ≠ 사용자 팔레트** — 골드/틸은 UI 크롬 전용. 사용자가 만든 팔레트 토큰 칩은 항상 HEX 라벨과 함께 표시해 브랜드 색과 혼동되지 않게 한다.
3. **글래스 성능 가드** — `backdrop-filter: blur(22px)`는 저가 폰에서 비싸다. 화면당 글래스 레이어 상한(3~4개), 캔버스 화면에서는 blur 미사용, 스크롤 컨테이너 위 글래스 금지.

### 2.3 탭 구성 (Dreaming-vote 5탭 패턴 적용)
`홈` · `드레스룸`(메인) · `생성`(가운데 강조 — btn-gold 원형 FAB형 탭) · `옷장` · `마이`

---

## 3. 기술 스택

Dreaming-vote와 같은 계열로 통일 — 운영 경험·코드 패턴 재사용.

| 계층 | 선택 | 근거 |
|---|---|---|
| 프레임워크 | Next.js (App Router) + TypeScript + Tailwind v4 | Dreaming-vote 동일. globals.css 토큰 이식 그대로 호환 |
| 인증/DB/스토리지 | Supabase (@supabase/ssr) + Prisma + RLS | 동일 패턴. Storage에 아바타 시트·아이템·결과물 |
| 검증 | zod | API 입력 검증 |
| 상태 | Zustand (드레스룸 캔버스 로컬 상태) + 서버 상태는 fetch/폴링 | |
| 드래그 | dnd-kit (PointerSensor — 터치 지원) + 탭-투-배정 폴백 | HTML5 DnD는 모바일 미지원 |
| 이미지 압축 | browser-image-compression | Dreaming-vote에서 사용 중인 라이브러리 재사용 |
| 배경 제거 | 서버 API (fal.ai BiRefNet, 건당 ~$0.002) | wasm 클라이언트 방식은 모델 40MB+ 다운로드라 모바일 부적합 |
| 아이템 분류·색 추출 | Gemini Flash vision(분류) + 클라이언트 Lab 대표색 추출 | |
| 이미지 생성 | Gemini 2.5 Flash Image (어댑터 계층 뒤에) | W0 벤치마크로 Seedream/Kontext 대비 확정 |
| 영상 생성 | Veo (predictLongRunning + 폴링) | M0 프로토타입 코드 승격 |
| 리컬러 프리뷰 | 오프스크린 Canvas, Lab 색공간 색 이동 (질감·명도 보존) | 클릭 즉시 반응, 최종은 생성 모델 반영 |
| 배포 | Vercel (생성 라우트 maxDuration 상향) | |

**AI 게이트웨이**: `lib/ai/` 아래 provider 어댑터 인터페이스(`generateImage / generateVideo / removeBackground / classifyItem`)로 감싸 벤더 교체 가능하게. API 키는 전부 서버 환경변수 — M0의 "사용자가 키 입력" 방식 폐기.

---

## 4. 모바일 UX 설계 (화면별)

### 홈
저장된 아바타 캐러셀(Dreaming-vote `HomeClubCarousel` 패턴) + "새 착장 시작" btn-gold CTA + 최근 생성물 피드.

### 아바타 스튜디오
- 10슬롯 그리드(빈 슬롯은 점선 글래스 카드 + "＋")
- 슬롯 탭 → 사진 1~5장 업로드(카메라/앨범, 클라이언트 압축) → 서버가 아바타 시트(정면·측면·전신) 생성 → 확정 저장
- 슬롯 카드: 이름·태그, 시트 미리보기, 삭제 시 참조 프로젝트 경고

### 드레스룸 (메인 캔버스)
- 상단 55~60%: 중성 배경 캔버스에 아바타 전신 + **스티커 슬롯 7개** (점선 원형 배지 + 아이콘: 티·아우터·시계·가방·바지·신발·벨트) — 앵커는 M0 프로토타입의 % 좌표 체계 승격
- 하단: **아이템 트레이** (가로 스크롤 칩, "＋ 옷 추가" 첫 칩)
- 착장 인터랙션 2가지 (둘 다 지원):
  - **드래그**: 트레이 칩을 길게 눌러 슬롯으로 드래그(dnd-kit) — 드래그 중 유효 슬롯 하이라이트 + 햅틱, 오분류 시 올바른 슬롯으로 자동 스냅 + 토스트
  - **탭-투-배정**: 칩 탭 → 슬롯들이 펄스 → 슬롯 탭 (한 손 조작·접근성 폴백)
- 옷 추가 시: 업로드 → 배경제거 → 자동 분류 → 대표색 추출 → "팔레트에 추가할까요?" 스낵바
- **착장된 아이템 탭 → 리컬러 바텀시트**: 팔레트 토큰 칩 줄 / HEX 입력 / 캔버스 탭 스포이드(EyeDropper API는 iOS 미지원이라 이미지 탭 샘플링으로 구현) / 채도·명도 슬라이더 / "디자인은 그대로, 색만 바뀝니다" 안내

### 생성
- 착장 요약 카드(모델·아이템·토큰) + 지시서 미리보기(접기) → [이미지 생성]
- 진행 상태 카드(큐→생성 중→완료, 폴링) → 결과 확인 → [영상 만들기] → 9:16 MP4
- 완료 시 web-push 알림(Dreaming-vote 인프라 패턴 재사용) — 폰에서 기다리지 않아도 됨

### 옷장 / 마이
옷장: 업로드 아이템 그리드(분류 필터), 탭하면 현재 프로젝트 트레이에 담기. 마이: 계정·사용량·팔레트 관리.

---

## 5. 데이터 모델 (Supabase)

```
profiles        id(auth.users FK), display_name, created_at
avatars         id, user_id, name, tags[], sheet_urls jsonb(정면/측면/전신), status, created_at
                └ 제약: 사용자당 10개 (DB trigger + RLS)
items           id, user_id, kind(enum 7종), original_url, cutout_url, base_color_lab, created_at
palettes        id, user_id, project_id?, name
palette_tokens  id, palette_id, label, hex, created_at
projects        id, user_id, avatar_id, title, status, created_at
outfit_slots    id, project_id, slot(enum 7종), item_id, token_id?, custom_hex?, updated_at
generations     id, project_id, kind(image|video), status(queued|running|done|failed),
                prompt_snapshot, input_refs jsonb, result_url, provider_op_name?, error?, created_at
```
- 전 테이블 RLS: `user_id = auth.uid()` (Dreaming-vote의 `prisma/rls.sql` 패턴 참고)
- `outfit_slots.token_id`가 색 통일의 핵심 — M2 Color QC가 이 데이터를 그대로 사용
- Storage 버킷: `avatars/`, `items/`, `results/` (사용자별 경로 정책)

---

## 6. 일정 (W0 + 6주)

| 주차 | 내용 | 완료 기준 |
|---|---|---|
| **W0** (3~5일) | 준비: Supabase 프로젝트·Gemini 키·Vercel 연결 / 이미지 편집 모델 3종 벤치마크(동일 착장 지시 20세트 — 신원 유지·색 준수·아이템 충실도 채점) / 리포 재구성: M0 프로토타입 → `/prototype` 이동, Next.js 스캐폴드 + globals.css 디자인 토큰 이식 | 벤치마크 리포트로 이미지 모델 확정, 빈 앱이 하늘 글래스로 배포됨 |
| **W1** | 기반: Supabase Auth(카카오/구글/이메일), Prisma 스키마+RLS, 레이아웃(BottomTabBar·헤더·바텀시트 컴포넌트), 홈 뼈대 | 폰에서 로그인 → 5탭 이동 |
| **W2** | 아바타 스튜디오: 업로드(압축)→시트 생성 파이프라인→10슬롯 CRUD | 사진 3장으로 아바타 저장, 10개 제한 동작 |
| **W3** | 드레스룸: 슬롯 캔버스, 트레이, 드래그+탭 배정, 배경제거·분류·대표색, 옷장 저장 | 폰 터치로 7슬롯 전부 착장 가능 |
| **W4** | 색: 팔레트 토큰 CRUD, 리컬러 바텀시트(Lab 프리뷰), 토큰 연결·일괄 변경 | 두 아이템에 같은 토큰 지정 → 토큰 수정 시 동시 변경 |
| **W5** | 생성: 지시서 컴파일러, 이미지 생성(큐·폴링), Veo 영상, 결과·추출(9:16), 라이브러리, 완료 푸시 | 착장→이미지→영상→MP4 저장 E2E |
| **W6** | 통합 QA: 실기기(iOS Safari·Android Chrome) 체크리스트, 성능(글래스 레이어·이미지 용량·LCP), 온보딩 3장, 에러·재시도 처리, 베타 배포 | **신규 사용자 폰에서 10분 내 1편** 통과 |

리스크 버퍼: W3(모바일 드래그)과 W5(생성 파이프라인)가 가장 위험 — 각 주에 이슈 시 탭-투-배정만으로 출시 / 영상 프리셋 1개 축소라는 다운스코프 경로를 미리 정의.

---

## 7. QA·테스트 전략
- Playwright 모바일 뷰포트(390×844) E2E: 로그인→아바타→착장→리컬러→생성 목(mock) 플로우
- 실기기 체크리스트: 터치 드래그(iOS 스크롤 충돌·long-press 메뉴 억제), safe-area, backdrop-filter 프레임 드랍, 카메라 업로드, 백그라운드 전환 후 폴링 복구
- AI 파이프라인: 지시서 컴파일러 단위 테스트(스냅샷), 어댑터 목 테스트, 주간 골든셋 20세트 회귀(모델 업데이트 감지)
- 색 기능: Lab 변환·대표색 추출 단위 테스트(기준 이미지 세트)

---

## 8. 준비물 (사용자 확인 필요)
1. **Gemini API 키** (이미지·영상, 서버 환경변수) + fal.ai 키(배경제거)
2. **Supabase 프로젝트** 신규 생성 (기존 Dreaming-vote 프로젝트와 분리)
3. **Vercel 프로젝트** 연결
4. 디자인 세부 취향: "꿈꾸는 하늘"을 그대로 쓸지(기본안), 액센트만 Clothes-Cut용으로 바꿀지 — W0에서 스타일 시안 2안으로 확인
