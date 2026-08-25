# 👗 Clothes-Cut

> 아바타에 옷을 입히고 색을 맞춰, 숏폼 한 편까지. **오늘의 착장, 10분이면 돼요.**

숏폼 패션 크리에이터를 위한 **모바일 웹** AI 옷입히기 스튜디오.
사진 몇 장으로 만든 평생 아바타(최대 10명)에 옷 사진을 드래그해 입히고, 색은 팔레트 토큰으로
정확히 깔맞춘 뒤, 이미지와 영상까지 한 화면에서 뽑는다.

- 📋 [기획안](./docs/PLAN.md) · 🛠 [MVP 개발계획](./docs/MVP-DEV-PLAN.md)
- 🗄 [데이터 모델](./docs/DATA-MODEL.md) · 🤖 [AI 게이트웨이](./docs/AI-GATEWAY.md)
- 🎬 [레퍼런스 티어다운](./docs/REF-LOOKBOOK-TEARDOWN.md) — 룩북 숏폼 1편 분해 → 프롬프트·파라미터 역산

## 개발 상태

**M1 MVP · W0(기반 구축) 완료** — 앱 셸·디자인 시스템·데이터 계층·AI 어댑터·탭 화면 뼈대까지.
기능 구현(아바타 저장 → 드래그 착장 → 리컬러 → 생성)은 W1~W6에서 붙인다.

| 마일스톤 | 상태 |
|---|---|
| M0 프로토타입 | ✅ 완료 → [`prototype/`](./prototype) 에 보관 |
| **M1 W0** 스캐폴드·디자인 토큰·어댑터 | ✅ 완료 |
| M1 W1~W6 기능 구현 | ⏳ 예정 |

## 실행

```bash
npm install
cp .env.local.example .env.local   # 값을 채운다 (Supabase · Gemini · fal)
npx prisma generate
npm run dev                        # http://localhost:3000
```

검증:

```bash
npx next typegen && npx tsc --noEmit   # 타입 (typegen 이 반드시 선행)
npm run lint
npm run build
npx prisma validate
```

DB를 처음 세팅할 때는 마이그레이션 적용 후 **반드시** `prisma/rls.sql` 을 실행한다
(RLS를 켜지 않은 테이블은 anon 키로 전부 읽힌다). 자세한 절차는 [DATA-MODEL.md](./docs/DATA-MODEL.md).

## 구조

```
src/app/            5개 탭(/ · /dresser · /create · /closet · /my) + 루트 레이아웃
src/components/     Header · BottomTabBar · icons
src/components/ui/  GlassCard · BottomSheet · Button · Chip · Skeleton · Toast
src/lib/types.ts    도메인 정본 — 아이템 7종과 신체 앵커 좌표(SLOT_META)
src/lib/ai/         벤더 교체 가능한 AI 어댑터 (앱 코드는 gateway 하나만 import)
  ├ prompt.ts       착장 지시서 컴파일러 (순수 함수)
  ├ color.ts        Lab 변환 · CIEDE2000 · 대표색 추출 · 리컬러
  └ providers/      Gemini 이미지 · Veo 영상 · fal 배경제거
src/lib/supabase/   브라우저 / 서버 클라이언트
prisma/             schema.prisma · rls.sql (RLS · 아바타 10개 제한 트리거 · Storage 정책)
prototype/          M0 정적 프로토타입 (보관용, 개발 중단)
```

## 디자인

꿈꾸는교회 동아리 앱의 **"꿈꾸는 하늘"** 디자인 시스템을 이식하고 액센트만 교체했다.
하늘 그라데이션 배경 · frosted glass 서피스 · 잉크 텍스트는 그대로, 골드→**코랄**, 틸→**플럼**.

| 역할 | 토큰 | 대비 |
|---|---|---|
| 주 액센트 | `coral` #FF6B52 · `coral-deep` #D93E22 · `coral-ink` #B83518 | CTA 흰 텍스트 4.50 · 본문 5.56 |
| 보조 액센트 | `plum` #8E3B72 · `plum-deep` #6E2A58 | CTA 흰 텍스트 6.96 · 본문 6.55 |

> `coral` #FF6B52 는 **장식 전용**이다(흰 배경 대비 2.81). 텍스트에는 `coral-ink` 나 `plum` 을 쓴다.

제품 특성상 둔 예외 3가지:

1. **드레스룸 캔버스는 무채색**(`.canvas-surface`) — 색이 있는 배경은 옷 색 판단을 왜곡한다.
2. **브랜드 액센트 ≠ 사용자 팔레트** — 사용자 색 칩에는 항상 HEX 라벨을 함께 노출한다.
3. **글래스 성능 가드** — 화면당 `backdrop-filter` 3~4개 상한(헤더·탭바·시트), 본문 카드와 캔버스는 blur 없음.
