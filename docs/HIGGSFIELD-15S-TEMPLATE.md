# Higgsfield 이미지→영상 템플릿 v4 · 16초 / 4컷 컬러조합 룩북

v3 는 "레퍼런스에 없는 걷기·턴을 지어냈다"는 지적을 받아 고치다가 **정지에 가깝게 과교정**했다.
이후 두 번째 레퍼런스(`hf_20260825_033036`)를 프레임 단위로 보니, 거기엔 분명한 자연스러운
움직임이 있다 — **눈에 보이는 카메라 줌인 + 고개 돌림 + 그에 따른 머리카락 스윙.**
v4 는 두 레퍼런스를 합친다: **발 고정·몸통 피벗 없음(레퍼런스 A) + 눈에 띄는 push-in과 고개
돌림(레퍼런스 B).**

---

## 0. 레퍼런스 분석 결과 (두 영상 종합)

### 레퍼런스 A — `hf_20260825_040044` (16.04초, 4컷×4초)

| 항목 | 측정값 |
|---|---|
| 규격 | 720×1280 (9:16), 24fps, 16.04초 |
| 구조 | 4클립 × 정확히 4.00초, 4·8·12초 지점 하드컷 |
| 프레임 간 평균 변화량 | 0.30 ~ 0.49 / 255 (사람이 걷기만 해도 나오는 8~20 의 수십 분의 1) |
| 첫/중간/끝 프레임 비교 | **발 위치가 4초 내내 1픽셀도 안 움직인다.** 걷지 않고, 돌지도 않는다 |

이 영상만 보고 "거의 정지 + 몸에서 떨어진 요소만 흔들림"으로 결론 낸 게 v3였다.
결론 자체는 틀리지 않았지만, "고개를 돌리는 동작"까지 지워버린 게 과했다.

### 레퍼런스 B — `hf_20260825_033036` (4.06초, 여러 아웃핏을 빠르게 이어붙인 프리뷰)

이 파일은 하나의 4초 컷이 아니라, 서로 다른 컬러 조합을 2.08s → 0.6s → 0.5s → 0.4s → 0.2s → 0.3s
순으로 점점 짧게 이어붙인 프리뷰 릴이다. 그중 가장 긴 첫 구간(0~2.08s, Camel+Cream)을
프레임 단위로 뜯어보면:

- 여성 모델이 **창가를 보던 시선에서 카메라 쪽으로 고개를 돌린다.** 그 동작을 따라
  **머리카락이 눈에 띄게 흔들린다.**
- 그 사이 **카메라가 풀샷에서 살짝 타이트한 샷으로 명확하게 줌인**된다. 미세한 수준이 아니라
  실제로 보이는 push-in 이다.
- 발·팔·다리·자세는 이 구간 내내 그대로다. 걷지 않고, 몸을 돌리지도 않는다.
- 남성 모델은 거의 정지 상태를 유지하되 시선이 아주 살짝 안정된다 — 이쪽은 굳이 크게
  움직이지 않아도 된다.

### 두 레퍼런스를 합치면

| 요소 | 레퍼런스 A | 레퍼런스 B | v4 결론 |
|---|---|---|---|
| 발 위치 | 고정 | 고정 | **고정 — 걷기/피벗 절대 없음** |
| 몸통 전체 동작(걷기·턴·손짓) | 없음 | 없음 | **넣지 않는다** |
| 카메라 | 거의 감지 안 될 정도의 미세 push-in | **눈에 보이는 명확한 push-in** | **컷마다 눈에 보이는 완만한 push-in을 넣는다** |
| 얼굴/고개 | 고정 | **한쪽 모델이 고개를 카메라로 돌림** | **컷마다 모델 1명이 고개를 돌린다** |
| 머리카락 | 미세하게 흔들림 | 고개 돌림에 따라 크게 흔들림 | **고개를 돌리는 모델은 머리카락이 그 동작에 맞춰 흔들린다** |

---

## 1. 공통 설정

| 항목 | v3 | **v4** |
|---|---|---|
| 모드 | Image to Video | 동일 (Start frame 만, End frame 비움) |
| 길이 | 4s | 4s (모델에 4s 옵션 없으면 5s 뽑아 4.00s 트림) |
| 비율 / fps | 9:16 · 24fps | 동일 |
| Motion 강도 | ~~Low (2~3/10)~~ | **Low-Medium (4~5/10)** — 고개 돌림 + 눈에 보이는 줌을 담기엔 2~3은 부족했다 |
| 카메라 프리셋 | ~~Static / Locked-off~~ | **Slow Push In** (약하게가 아니라 "눈에 보이게, 그러나 과하지 않게") |
| Enhance prompt | OFF | OFF (유지 — 켜면 옷 색이 바뀐다) |
| Seed | 고정 | 고정 (유지) |
| 텍스트 오버레이 | AI 에 맡기지 말고 편집에서 | 동일 (아래 5번) |

타임라인 (트림 불필요, 전부 하드컷):

| 컷 | 시작 | 끝 | 착장 | 컬러 조합 | 무드 | 고개 돌리는 쪽 |
|---|---|---|---|---|---|---|
| 1 | 00:00 | 00:04 | 크림 니트폴로+네이비 슬랙스 / 네이비 오픈셔츠+아이보리 와이드 | Navy + Cream | soft | 네이비 오픈셔츠 쪽 |
| 2 | 00:04 | 00:08 | 네이비 코치자켓+타이 / 네이비 폴로 레이어드+숄더백, 배기 데님 | Navy + Denim | easy | 코치자켓 쪽 |
| 3 | 00:08 | 00:12 | 차콜 하프집+프린지 스카프 / 네이비 폴로+차콜 와이드 | Charcoal + Navy | sharp | 차콜 하프집+스카프 쪽 |
| 4 | 00:12 | 00:16 | 블랙 워크자켓+올리브 와이드 / 카키 자켓+다크 데님, 커피 | Olive + Black | bold | 블랙 워크자켓 쪽 |

> 컬러 조합은 레퍼런스 영상의 Camel/Burgundy/Chocolate 가 아니라 **실제 소스 이미지 4장의 팔레트**다.
> 레퍼런스에서 가져온 것은 포맷(4초×4컷·하드컷·push-in·고개 돌림)이지 색이 아니다.
>
> 컷마다 고개를 돌리는 쪽을 바꾼 이유: 두 모델이 동시에 고개를 돌리면 산만해진다.
> 레퍼런스 B 도 한 명만 뚜렷하게 돌리고 다른 한 명은 거의 정지했다.

> 정확히 15초가 필요하면 컷당 3.75초로 트림한다. 단 레퍼런스와 동일하게 가려면 16초가 맞다.

---

## 2. 스타일 고정 블록 (모든 프롬프트 맨 앞에 붙인다)

```text
Editorial fashion lookbook film, natural and clearly alive, not a frozen still.
Two Korean male models stand in a relaxed pose in a bright beige neoclassical room:
tall cream paneled walls, a large multi-pane window with soft diffused daylight on
the left, a light oak open shelving unit at the left edge, a cream boucle curved sofa
behind them on the right, polished beige stone floor. Muted warm neutral color grade,
soft natural light, 9:16 vertical, full-body framing, cinematic 35mm look.
Faces, hair, outfits and accessories stay exactly as in the source image.
Both models keep their feet planted in the exact same spot for the entire shot —
no steps, no walking, no body pivot, no hand gestures, no arm movement.
Over the full 4 seconds the camera performs one slow, smooth, continuous push-in,
clearly visible but gentle — moving from a full-body medium shot to a slightly
tighter medium shot. No pan, no tilt, no camera shake, no whip zoom.
```

`Micro-motion only` / `feet locked, no pose change` 같은 v3 문구를 지웠다. 저 표현이
너무 강하게 들어가면 모델이 push-in 이나 고개 돌림까지 억눌러서 완전 정지 프레임을 만든다.
대신 "발은 고정, 몸통 동작은 없음"만 명시하고 **카메라 push-in 과 고개 돌림은 허용**한다.

---

## 3. 네거티브 프롬프트 (4컷 공통)

```text
walking, stepping, taking steps, turning the whole body, body pivot, spinning, dancing,
raising arms, gesturing, reaching, waving, exaggerated nodding, hand movement,
completely static shot, frozen frame, no motion at all, mannequin, statue-like,
slow motion, slow-mo, slowed footage, time ramp,
whip zoom, camera shake, camera pan, camera tilt, dolly sideways,
face morphing, identity change, outfit changing, clothing color shift,
extra limbs, extra fingers, warped hands, distorted proportions,
flicker, jitter, warping floor, ghosting, motion blur smear,
text, watermark, logo, subtitles, extra people, crowd,
cartoon, plastic skin, over-smoothing
```

v3 는 `camera push in, camera zoom` 까지 네거티브에 넣어서 카메라를 완전히 죽였다.
v4 는 그 두 항목을 빼고, 대신 `completely static shot, frozen frame, no motion at all` 을
넣어 반대 방향(아예 안 움직이는 것)을 막는다.

---

## 4. 컷 템플릿 (빈칸 채우기)

```text
[2번 스타일 고정 블록 그대로]

Head-turn beat (4 seconds, feet locked, camera pushing in throughout):
0.0-1.5s — ____________________________________________ (돌리는 모델의 시작 시선)
1.5-4.0s — he turns his head naturally toward the camera; his hair swings and settles
with the turn. The other model stays steady, gaze already on the camera, one slow
natural blink.

Camera: one continuous slow push-in over the full 4 seconds, full-body to a slightly
tighter medium shot. No pan, no tilt, no shake.
Outfit: ______________ / ______________.
```

### 4-1. 시작 시선 카탈로그 (고개를 돌리는 모델에게 하나만 고른다)

| 시작 시선 | 지시문 |
|---|---|
| 창가 | he is looking off toward the window on the left |
| 아래 | his gaze is lowered, looking slightly down and aside |
| 상대방 | he glances briefly toward the other model beside him |
| 먼 곳 | he is looking into the middle distance, off-camera |

**돌리는 모델은 컷당 1명만.** 두 명이 동시에 고개를 돌리면 레퍼런스와 다르게 산만해진다.
나머지 한 명은 처음부터 카메라를 보고 있는 채로 두고, 블링크 정도만 허용한다.

---

## 5. 텍스트 오버레이 — AI 에 맡기지 말 것

레퍼런스 A/B 모두 상단 텍스트를 AI 가 렌더링했고, **매번 오타가 났다**:
`Carmel + White`, `Burguorte + Cream`, `Burgolate + Black` 등. AI 영상 모델은 글자를
안정적으로 못 쓴다. 네거티브에 `text, watermark, subtitles` 를 넣어 **영상에는 글자가
아예 안 나오게** 하고, 편집 툴에서 얹는다.

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

### 컷 1 — Navy + Cream / soft (고개 돌림: 네이비 오픈셔츠 쪽)

```text
Editorial fashion lookbook film, natural and clearly alive, not a frozen still.
Two Korean male models stand in a relaxed pose in a bright beige neoclassical room:
tall cream paneled walls, a large multi-pane window with soft diffused daylight on
the left, a light oak open shelving unit at the left edge, a cream boucle curved sofa
behind them on the right, polished beige stone floor. Muted warm neutral color grade,
soft natural light, 9:16 vertical, full-body framing, cinematic 35mm look.
Faces, hair, outfits and accessories stay exactly as in the source image.
Both models keep their feet planted in the exact same spot for the entire shot —
no steps, no walking, no body pivot, no hand gestures, no arm movement.
Over the full 4 seconds the camera performs one slow, smooth, continuous push-in,
clearly visible but gentle — moving from a full-body medium shot to a slightly
tighter medium shot. No pan, no tilt, no camera shake, no whip zoom.

Head-turn beat (4 seconds, feet locked, camera pushing in throughout):
0.0-1.5s — the model in the open navy shirt is looking off toward the window on the left.
1.5-4.0s — he turns his head naturally toward the camera; his hair swings and settles
with the turn. The model in the cream knit polo stays steady, gaze already on the
camera, one slow natural blink.

Camera: one continuous slow push-in over the full 4 seconds, full-body to a slightly
tighter medium shot. No pan, no tilt, no shake.
Outfit: cream long-sleeve knit polo with navy pleated wide trousers, black belt, black
loafers / open navy shirt over a white ribbed tank with ivory wide trousers, black belt,
black loafers.
```

### 컷 2 — Navy + Denim / easy (고개 돌림: 코치자켓 쪽)

```text
Editorial fashion lookbook film, natural and clearly alive, not a frozen still.
Two Korean male models stand in a relaxed pose in a bright beige neoclassical room:
tall cream paneled walls, a large multi-pane window with soft diffused daylight on
the left, a light oak open shelving unit at the left edge, a cream boucle curved sofa
behind them on the right, polished beige stone floor. Muted warm neutral color grade,
soft natural light, 9:16 vertical, full-body framing, cinematic 35mm look.
Faces, hair, outfits and accessories stay exactly as in the source image.
Both models keep their feet planted in the exact same spot for the entire shot —
no steps, no walking, no body pivot, no hand gestures, no arm movement.
Over the full 4 seconds the camera performs one slow, smooth, continuous push-in,
clearly visible but gentle — moving from a full-body medium shot to a slightly
tighter medium shot. No pan, no tilt, no camera shake, no whip zoom.

Head-turn beat (4 seconds, feet locked, camera pushing in throughout):
0.0-1.5s — the model in the navy coach jacket has his gaze lowered, looking slightly
down and aside, the black tie hanging still.
1.5-4.0s — he turns his head naturally toward the camera; his hair swings and settles
with the turn. The model in the navy polo with the shoulder bag stays steady, gaze
already on the camera, one slow natural blink.

Camera: one continuous slow push-in over the full 4 seconds, full-body to a slightly
tighter medium shot. No pan, no tilt, no shake.
Outfit: navy coach jacket over a white shirt with a black tie, light-wash baggy denim,
black belt, black loafers / navy short-sleeve polo layered over a white collared shirt,
black shoulder bag, light-wash baggy denim, brown loafers.
```

### 컷 3 — Charcoal + Navy / sharp (고개 돌림: 차콜 하프집+스카프 쪽)

```text
Editorial fashion lookbook film, natural and clearly alive, not a frozen still.
Two Korean male models stand in a relaxed pose in a bright beige neoclassical room:
tall cream paneled walls, a large multi-pane window with soft diffused daylight on
the left, a light oak open shelving unit at the left edge, a cream boucle curved sofa
behind them on the right, polished beige stone floor. Muted warm neutral color grade,
soft natural light, 9:16 vertical, full-body framing, cinematic 35mm look.
Faces, hair, outfits and accessories stay exactly as in the source image.
Both models keep their feet planted in the exact same spot for the entire shot —
no steps, no walking, no body pivot, no hand gestures, no arm movement.
Over the full 4 seconds the camera performs one slow, smooth, continuous push-in,
clearly visible but gentle — moving from a full-body medium shot to a slightly
tighter medium shot. No pan, no tilt, no camera shake, no whip zoom.

Head-turn beat (4 seconds, feet locked, camera pushing in throughout):
0.0-1.5s — the model in the charcoal half-zip knit is looking off toward the window
on the left, the fringed ends of his scarf hanging still.
1.5-4.0s — he turns his head naturally toward the camera; his hair swings and settles
with the turn, and the scarf fringe sways once with the motion. The model in the navy
polo stays steady, gaze already on the camera, one slow natural blink.

Camera: one continuous slow push-in over the full 4 seconds, full-body to a slightly
tighter medium shot. No pan, no tilt, no shake.
Outfit: charcoal ribbed half-zip knit with a white tee underneath, navy pleated wide
trousers, fringed charcoal scarf, black loafers / navy short-sleeve knit polo with
charcoal wide pleated trousers, black belt, black sandals.
```

### 컷 4 — Olive + Black / bold (고개 돌림: 블랙 워크자켓 쪽)

```text
Editorial fashion lookbook film, natural and clearly alive, not a frozen still.
Two Korean male models stand in a relaxed pose in a bright beige neoclassical room:
tall cream paneled walls, a large multi-pane window with soft diffused daylight on
the left, a light oak open shelving unit at the left edge, a cream boucle curved sofa
behind them on the right, polished beige stone floor. Muted warm neutral color grade,
soft natural light, 9:16 vertical, full-body framing, cinematic 35mm look.
Faces, hair, outfits and accessories stay exactly as in the source image.
Both models keep their feet planted in the exact same spot for the entire shot —
no steps, no walking, no body pivot, no hand gestures, no arm movement.
Over the full 4 seconds the camera performs one slow, smooth, continuous push-in,
clearly visible but gentle — moving from a full-body medium shot to a slightly
tighter medium shot. No pan, no tilt, no camera shake, no whip zoom.

Head-turn beat (4 seconds, feet locked, camera pushing in throughout):
0.0-1.5s — the model in the black work jacket is looking off into the middle distance,
off-camera.
1.5-4.0s — he turns his head naturally toward the camera; his hair swings and settles
with the turn. The model in the khaki jacket stays steady, already holding the paper
coffee cup at rest and gazing at the camera, one slow natural blink.

Camera: one continuous slow push-in over the full 4 seconds, full-body to a slightly
tighter medium shot. No pan, no tilt, no shake.
Outfit: black work jacket with silver hardware over a charcoal knit, olive-green very
wide trousers, brown loafers / khaki jacket with a brown corduroy collar over a white
tee, dark indigo very wide denim, black loafers, already holding a paper coffee cup.
```

---

## 7. 작업 순서

1. Higgsfield → **Image to Video** → 컷1 이미지 업로드
2. 1번 설정 적용 — **4s · 9:16 · Motion Low-Medium(4~5) · Camera Slow Push In · Enhance prompt OFF · Seed 고정**
3. 6번 컷1 프롬프트 + 3번 네거티브 붙여넣고 생성
4. 컷 2·3·4 반복 — **모델·Seed·카메라 프리셋 절대 바꾸지 않는다**
5. 편집: 24fps 타임라인에 4개를 **하드컷**으로 붙임 (16.00초)
6. 5번 스펙대로 텍스트 오버레이 4장 얹음
7. BGM 16초에 맞춰 배치, 마지막 0.5초 페이드아웃
8. 필요하면 Higgsfield `Upscale` 로 2K

## 8. 트러블슈팅

| 증상 | 대응 |
|---|---|
| 여전히 완전 정지처럼 보인다 | ① Camera 프리셋이 `Slow Push In` (또는 동급) 인지 확인 — `Static` 이면 되돌아간다 ② Motion 강도를 4~5로 ③ 프롬프트의 `he turns his head` 문장이 빠지지 않았는지 확인 |
| 인물이 걷거나 몸을 돌린다 | 3번 네거티브의 `walking, body pivot, spinning` 확인. Head-turn beat 문장에 "head" 이외에 몸통이 움직인다는 표현이 섞이지 않았는지 재점검 |
| 줌이 너무 세게/빠르게 들어간다 (컷이 다닥다닥 붙었을 때 어지럽다) | Motion 을 1단 낮춘다(5→4). `clearly visible but gentle` 문구 유지, `dramatic`·`fast` 류 단어를 넣지 않는다 |
| 고개 돌리는 쪽이 아닌 모델까지 움직인다 | "stays steady, gaze already on the camera" 문장이 살아있는지 확인. 네거티브에 `hand movement` 추가돼 있는지 확인 |
| 옷 색/아이템이 바뀐다 | Enhance prompt OFF 확인. Motion 을 한 단 낮춘다 |
| 얼굴이 뭉개진다, 특히 고개 돌리는 컷 | 시작 시선과 끝 시선의 각도 차이를 크게 잡지 않는다 (옆모습→정면 X, 살짝 옆→정면 O) |
| 손이 이상하다 | 손과 관련된 동작 지시를 아예 넣지 않는다 — 손은 소스 이미지 그대로 고정되는 게 가장 안전하다 |
| 글자가 깨져 나온다 | 네거티브의 `text, watermark, subtitles` 유지 → 편집에서 얹는다 (5번) |
| 컷마다 톤이 다르다 | 모델·Seed 통일 확인. 그래도 다르면 편집에서 LUT 한 장으로 맞춘다 |
