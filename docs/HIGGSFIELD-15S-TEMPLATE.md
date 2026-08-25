# Higgsfield 이미지→영상 템플릿 v2 · 16초 / 4컷 컬러조합 룩북

레퍼런스 영상(`hf_20260825_040044`)을 분석해 **전면 개편**한 버전.
v1 의 "슬로우모션처럼 보이는" 문제를 구조적으로 제거했다.

---

## 0. 레퍼런스 분석 결과

| 항목 | 측정값 |
|---|---|
| 규격 | 720×1280 (9:16), **24fps**, 16.04초 |
| 구조 | **4클립 × 정확히 4.00초**, 4·8·12초 지점 하드컷 |
| 오디오 | AAC 32kHz 스테레오, mean -24.6dB (BGM) |
| 프레임 간 평균 변화량 | **0.30 ~ 0.49 / 255** |
| 포맷 | 커플(여1·남1) 고정 + 컷마다 컬러 조합 교체 + 상단 텍스트 오버레이 |

### 왜 슬로우로 보였나 — 슬로우가 아니라 "모션 없음"이다

프레임 간 변화량 **0.3~0.5** 는 사람이 평범하게 걷기만 해도 나오는 **8~20** 의 수십 분의 일이다.
즉 재생 속도가 느린 게 아니라, **움직이는 게 카메라밖에 없다.** 인물은 첫 프레임 포즈 그대로 끝난다.
정지 사진에 느린 줌을 건 것(켄번즈)과 같고, 뇌는 그걸 슬로우모션으로 읽는다.

원인 3가지:

1. **v1 템플릿이 슬로우를 직접 지시했다** — `very slow and smooth`, `slow blinks`,
   `feet stay planted`, `Motion: Low`. 시킨 대로 나온 것이다.
2. **4초 클립에 액션 비트가 0개** — 시작 포즈 = 끝 포즈. 상태 변화가 없다.
3. **4컷 전부 같은 푸시인** — 리듬이 없어 16초가 하나의 긴 드리프트로 들린다.

### v2 의 3원칙

| # | 원칙 | 이유 |
|---|---|---|
| 1 | **카메라 고정, 사람이 움직인다** | 카메라가 움직이고 인물이 멈추면 무조건 슬로우로 보인다. 반대로 하면 같은 4초가 빠르게 읽힌다 |
| 2 | **4초에 액션 비트 1개를 못박는다** | 0.0–0.6s 진입 / 0.6–2.4s 동작 / 2.4–4.0s 홀드. 프롬프트에 초 단위로 쓴다 |
| 3 | **"가까워지는 효과"는 줌이 아니라 걸어 들어와서 만든다** | 푸시인의 답답함 없이 프레임이 타이트해진다 |

---

## 1. 공통 설정

| 항목 | v1 | **v2** |
|---|---|---|
| 모드 | Image to Video | 동일 (Start frame 만, End frame 비움) |
| 길이 | 5s → 3.75s 트림 | **4s** (모델에 4s 옵션 없으면 5s 뽑아 4.00s 트림) |
| 비율 / fps | 9:16 | 9:16 · **24fps** |
| Motion 강도 | ~~Low (3~4/10)~~ | **Medium–High (6~7/10)** |
| 카메라 프리셋 | ~~컷마다 다른 무빙~~ | **Static / Locked-off 고정** (4컷 전부) |
| Enhance prompt | OFF | OFF (유지 — 켜면 옷 색이 바뀐다) |
| Seed | 고정 | 고정 (유지) |
| 텍스트 오버레이 | — | **AI 에 맡기지 말고 편집에서** (아래 5번) |

타임라인 (트림 불필요, 전부 하드컷):

| 컷 | 시작 | 끝 | 착장 | 컬러 조합 | 무드 |
|---|---|---|---|---|---|
| 1 | 00:00 | 00:04 | 크림 니트폴로+네이비 슬랙스 / 네이비 오픈셔츠+아이보리 와이드 | Navy + Cream | soft |
| 2 | 00:04 | 00:08 | 네이비 코치자켓+타이 / 네이비 폴로 레이어드+숄더백, 배기 데님 | Navy + Denim | easy |
| 3 | 00:08 | 00:12 | 차콜 하프집+프린지 스카프 / 네이비 폴로+차콜 와이드 | Charcoal + Navy | sharp |
| 4 | 00:12 | 00:16 | 블랙 워크자켓+올리브 와이드 / 카키 자켓+다크 데님, 커피 | Olive + Black | bold |

> 컬러 조합은 **레퍼런스 영상의 Camel/Burgundy 가 아니라 실제 소스 이미지 4장의 팔레트**다.
> 레퍼런스에서 가져온 것은 포맷(4초×4컷·하드컷·상단 오버레이)이지 색이 아니다.

> 정확히 15초가 필요하면 컷당 3.75초로 트림한다. 단 레퍼런스와 동일하게 가려면 16초가 맞다.

---

## 2. 스타일 고정 블록 (모든 프롬프트 맨 앞에 붙인다)

```text
Editorial fashion lookbook film, shot at normal real-time speed.
Two Korean male models in a bright beige neoclassical room: tall cream paneled walls,
a large multi-pane window with soft diffused daylight on the left, a light oak open
shelving unit at the left edge, a cream boucle curved sofa behind them on the right,
polished beige stone floor. Muted warm neutral color grade, soft natural light,
9:16 vertical, full-body framing, cinematic 35mm look.
Faces, hair, outfits and accessories stay exactly as in the source image.
Real-time motion at 1x speed. Natural human movement tempo.
```

마지막 두 줄이 v2 의 핵심이다. **빼지 말 것.**

---

## 3. 네거티브 프롬프트 (4컷 공통)

```text
slow motion, slow-mo, slowed footage, time ramp, frozen pose, mannequin, statue-like,
static subject, no movement, ken burns zoom, drifting zoom,
face morphing, identity change, outfit changing, clothing color shift,
extra limbs, extra fingers, warped hands, distorted proportions,
flicker, jitter, warping floor, ghosting, motion blur smear,
text, watermark, logo, subtitles, extra people, crowd,
cartoon, plastic skin, over-smoothing
```

앞의 두 줄이 v1 대비 새로 추가된 **안티-슬로우 블록**이다.

---

## 4. 컷 템플릿 (빈칸 채우기)

```text
[2번 스타일 고정 블록 그대로]

Action beat (4 seconds, real-time):
0.0-0.6s — ____________________________________________
0.6-2.4s — ____________________________________________
2.4-4.0s — hold the final pose, steady gaze into camera, natural breathing.

Camera: locked-off static tripod shot, no zoom, no push in, no camera movement.
Outfit: ______________ / ______________.
```

### 4-1. 액션 비트 카탈로그 (4초에 하나만 고른다)

| 종류 | 지시문 |
|---|---|
| 시선 전환 | both turn their heads from the window to the camera together |
| 걸어 들어오기 | both take two steps toward the camera and stop |
| 몸 회전 | he pivots from profile to face the camera and squares his shoulders |
| 재킷 | he opens the jacket by the lapel and pushes one hand into his pocket |
| 주머니 | he pulls one hand out of his pocket and straightens the front of his shirt |
| 가방 | he shrugs the shoulder bag strap higher and lets it settle |
| 스카프 | he draws the fringed scarf up over his forearm and lets the fringe swing |
| 체중 이동 | he shifts his weight to the other leg and squares his shoulders |
| 각도 | he pivots to a three-quarter angle and drops one shoulder |
| 소매 | he pushes one sleeve up to the forearm |
| 컵 | he raises the paper cup, takes one sip, and lowers it |

**모델당 1개, 컷당 최대 2개.** 더 넣으면 손·얼굴이 무너진다.

---

## 5. 텍스트 오버레이 — AI 에 맡기지 말 것

레퍼런스는 상단 텍스트를 AI 가 렌더링했고, **오타가 났다**:

| 실제 출력 | 의도 |
|---|---|
| `Carmel + White` | Camel |
| `Burguorte + Cream` | Burgundy |
| `Burguorte + Black` | Burgundy |

AI 영상 모델은 글자를 안정적으로 못 쓴다. 네거티브에 `text, watermark, subtitles` 를 넣어
**영상에는 글자가 아예 안 나오게** 하고, 편집 툴에서 얹는다.

레퍼런스 오버레이 스펙:

| 항목 | 값 |
|---|---|
| 위치 | 상단 중앙, 세이프에어리어 상단에서 약 8% 아래 |
| 1행 | 세리프 볼드, 착장의 메인 컬러와 크림 `#F2EAE0` 2톤. 컷별 메인: 네이비 `#1E2A44` · 데님 `#7B93B5` · 차콜 `#3A3D42` · 올리브 `#5A5B3C` |
| 2행 | 소문자 세리프, 1행의 40% 크기, 화이트, 자간 넓게 |
| 문구 | `{메인컬러} + {서브컬러}` / `{무드 한 단어}` |
| 등장 | 컷 시작과 동시에, 페이드 없이(하드컷 리듬 유지) |

---

## 6. 완성 프롬프트 4개 (복붙용)

### 컷 1 — Navy + Cream / soft

```text
Editorial fashion lookbook film, shot at normal real-time speed.
Two Korean male models in a bright beige neoclassical room: tall cream paneled walls,
a large multi-pane window with soft diffused daylight on the left, a light oak open
shelving unit at the left edge, a cream boucle curved sofa behind them on the right,
polished beige stone floor. Muted warm neutral color grade, soft natural light,
9:16 vertical, full-body framing, cinematic 35mm look.
Faces, hair, outfits and accessories stay exactly as in the source image.
Real-time motion at 1x speed. Natural human movement tempo.

Action beat (4 seconds, real-time):
0.0-0.6s — both are mid-stride, faces turned toward the window on the left.
0.6-2.4s — they take two more walking steps forward and turn their heads to the camera
together at a normal, clearly visible speed; the model in the cream knit polo pulls his
hand out of his pocket and lets his arm swing once; the open navy shirt of the other
model swings open with the step, showing the white ribbed tank underneath.
2.4-4.0s — hold the final pose, steady gaze into camera, natural breathing.

Camera: locked-off static tripod shot, no zoom, no push in, no camera movement.
Outfit: cream long-sleeve knit polo with navy pleated wide trousers, black belt, black
loafers / open navy shirt over a white ribbed tank with ivory wide trousers, black belt,
black loafers.
```

### 컷 2 — Navy + Denim / easy

```text
Editorial fashion lookbook film, shot at normal real-time speed.
Two Korean male models in a bright beige neoclassical room: tall cream paneled walls,
a large multi-pane window with soft diffused daylight on the left, a light oak open
shelving unit at the left edge, a cream boucle curved sofa behind them on the right,
polished beige stone floor. Muted warm neutral color grade, soft natural light,
9:16 vertical, full-body framing, cinematic 35mm look.
Faces, hair, outfits and accessories stay exactly as in the source image.
Real-time motion at 1x speed. Natural human movement tempo.

Action beat (4 seconds, real-time):
0.0-0.6s — both stand square to the camera, hands in their denim pockets.
0.6-2.4s — the model in the navy coach jacket takes one clear step forward, grabs the
front of his jacket and pulls it open, the black tie swinging; the other model shrugs
the shoulder bag strap higher, lets it settle, and pivots to a three-quarter angle.
The wide denim legs swing with the movement.
2.4-4.0s — hold the final pose, steady gaze into camera, natural breathing.

Camera: locked-off static tripod shot, slightly low angle, no zoom, no push in,
no camera movement.
Outfit: navy coach jacket over a white shirt with a black tie, light-wash baggy denim,
black belt, black loafers / navy short-sleeve polo layered over a white collared shirt,
black shoulder bag, light-wash baggy denim, brown loafers.
```

### 컷 3 — Charcoal + Navy / sharp

```text
Editorial fashion lookbook film, shot at normal real-time speed.
Two Korean male models in a bright beige neoclassical room: tall cream paneled walls,
a large multi-pane window with soft diffused daylight on the left, a light oak open
shelving unit at the left edge, a cream boucle curved sofa behind them on the right,
polished beige stone floor. Muted warm neutral color grade, soft natural light,
9:16 vertical, full-body framing, cinematic 35mm look.
Faces, hair, outfits and accessories stay exactly as in the source image.
Real-time motion at 1x speed. Natural human movement tempo.

Action beat (4 seconds, real-time):
0.0-0.6s — both stand in profile, facing the window on the left.
0.6-2.4s — the model in the charcoal half-zip knit draws the fringed charcoal scarf up
over his forearm, the fringe swinging; the model in the navy polo pivots his whole body
from profile to face the camera and squares his shoulders. The wide trouser legs swing
and settle with the pivot.
2.4-4.0s — hold the final pose, the scarf fringe still settling, steady gaze into
camera, natural breathing.

Camera: locked-off static tripod shot, no zoom, no push in, no camera movement.
Outfit: charcoal ribbed half-zip knit with a white tee underneath, navy pleated wide
trousers, fringed charcoal scarf, black loafers / navy short-sleeve knit polo with
charcoal wide pleated trousers, black belt, black sandals.
```

### 컷 4 — Olive + Black / bold

```text
Editorial fashion lookbook film, shot at normal real-time speed.
Two Korean male models in a bright beige neoclassical room: tall cream paneled walls,
a large multi-pane window with soft diffused daylight on the left, a light oak open
shelving unit at the left edge, a cream boucle curved sofa behind them on the right,
polished beige stone floor. Muted warm neutral color grade, soft natural light,
9:16 vertical, full-body framing, cinematic 35mm look.
Faces, hair, outfits and accessories stay exactly as in the source image.
Real-time motion at 1x speed. Natural human movement tempo.

Action beat (4 seconds, real-time):
0.0-0.6s — both stand deeper in the room, full body visible with headroom above.
0.6-2.4s — they walk two confident steps straight toward the camera and stop, so the
framing naturally tightens from full body to knee-up; the model in the khaki jacket
raises the paper coffee cup, takes one sip and lowers it. The very wide olive and
indigo trouser legs swing heavily with each step.
2.4-4.0s — hold the final pose, chins slightly lifted, direct gaze into camera,
natural breathing.

Camera: locked-off static tripod shot, no zoom, no push in, no camera movement.
The subjects get closer by walking, not by zooming.
Outfit: black work jacket with silver hardware over a charcoal knit, olive-green very
wide trousers, brown loafers / khaki jacket with a brown corduroy collar over a white
tee, dark indigo very wide denim, black loafers, holding a paper coffee cup.
```

---

## 7. 작업 순서

1. Higgsfield → **Image to Video** → 컷1 이미지 업로드
2. 1번 설정 적용 — **4s · 9:16 · Motion Medium-High(6~7) · Camera Static · Enhance prompt OFF · Seed 고정**
3. 6번 컷1 프롬프트 + 3번 네거티브 붙여넣고 생성
4. 컷 2·3·4 반복 — **모델·Seed·카메라 프리셋 절대 바꾸지 않는다**
5. 편집: 24fps 타임라인에 4개를 **하드컷**으로 붙임 (16.00초)
6. 5번 스펙대로 텍스트 오버레이 4장 얹음
7. BGM 16초에 맞춰 배치, 마지막 0.5초 페이드아웃
8. 필요하면 Higgsfield `Upscale` 로 2K

## 8. 트러블슈팅

| 증상 | 대응 |
|---|---|
| **여전히 슬로우로 보인다** | ① Motion 강도부터 확인(6~7) ② 카메라 프리셋이 Static 인지 ③ 프롬프트에 `slow`·`gently`·`softly` 가 남아 있으면 전부 삭제 ④ 액션 비트가 "고개 돌리기" 하나뿐이면 걸음이나 턴으로 교체 |
| 인물이 프레임 밖으로 나간다 | `and stop` 을 반드시 붙인다. 걸음 수를 `two steps` 이하로 |
| 옷 색/아이템이 바뀐다 | Enhance prompt OFF 확인. Motion 을 한 단 낮춘다(7→6) |
| 얼굴이 뭉개진다 | 액션 비트를 모델당 1개로 줄인다. Motion 7 이상은 쓰지 않는다 |
| 손이 이상하다 | 손을 주머니에 넣거나 가방을 쥐는 지시로 바꾼다 |
| 글자가 깨져 나온다 | 네거티브의 `text, watermark, subtitles` 유지 → 편집에서 얹는다 (5번) |
| 회전 동작에서 몸이 녹는다 | 정면↔측면(90도)까지만. 반바퀴 이상 돌리면 어떤 모델도 못 버틴다 |
| 컷마다 톤이 다르다 | 모델·Seed 통일 확인. 그래도 다르면 편집에서 LUT 한 장으로 맞춘다 |
