# Higgsfield 이미지→영상 템플릿 · 15초 / 4컷

착장 이미지 4장을 **각 3.75초씩 균등 분배한 15초 세로 숏폼**으로 만드는 작업 템플릿.
Higgsfield 웹에서 직접 붙여넣어 쓰는 용도다. 자동화 코드가 아니라 **손으로 쓰는 레시피**다.

---

## 0. 길이 설계 (먼저 읽을 것)

Higgsfield 는 **3초 / 5초 / 10초** 고정 길이로만 생성한다. `3.75초`는 직접 못 뽑는다.
그래서 이렇게 간다:

| 단계 | 값 |
|---|---|
| 생성 | 컷당 **5초** × 4개 |
| 편집 | 각 클립을 **3.75초**로 트림 (앞 0.2s 워밍업 버리고 3.75s 사용 권장) |
| 최종 | 3.75 × 4 = **15.00초** |
| 프레임레이트 | **24fps 권장** — 3.75s = 정확히 90프레임 (30fps 는 112.5프레임이라 안 떨어짐) |
| 컷 전환 | **하드컷**. 크로스페이드를 넣으면 겹치는 만큼 4등분이 깨진다 |

타임라인 배치:

| 컷 | 시작 | 끝 | 길이 |
|---|---|---|---|
| 1 | 00:00.00 | 00:03.75 | 3.75s |
| 2 | 00:03.75 | 00:07.50 | 3.75s |
| 3 | 00:07.50 | 00:11.25 | 3.75s |
| 4 | 00:11.25 | 00:15.00 | 3.75s |

> 트림이 번거로우면 대안: 5초 × 4 = 20초 그대로 쓰거나, 3초 × 4 = 12초.
> 단 **"정확히 15초 + 완전 균등"** 조건은 위의 트림 방식에서만 성립한다.

---

## 1. 공통 설정 (4컷 전부 동일하게)

| 항목 | 값 | 이유 |
|---|---|---|
| 모드 | **Image to Video** (Start frame 만 사용, End frame 비움) | 착장이 바뀌면 안 된다 |
| 모델 | Higgsfield DoP / Kling 2.x / Seedance 중 하나로 **4컷 통일** | 모델을 섞으면 그레이딩·질감이 튄다 |
| 길이 | **5s** | 위 0번 참조 |
| 비율 | **9:16** (원본 이미지 비율 유지) | 숏폼 |
| Motion / 강도 | **Low ~ Low-Medium (10단계 중 3~4)** | 강하면 얼굴·손이 무너진다 |
| Enhance prompt | **OFF** | 켜면 프롬프트를 임의로 다시 써서 옷 색·아이템이 바뀐다 |
| Seed | **고정** (아무 값 하나 정해서 4컷 재사용) | 재생성 시 룩 유지 |
| 인물 수 | 2명 고정 | 배경에 사람 추가 금지 (네거티브로 막음) |

### 1-1. 스타일 고정 블록 (모든 프롬프트 맨 앞에 그대로 붙인다)

```text
Editorial fashion film. Two Korean male models in a bright beige neoclassical room:
tall paneled walls, a large window with soft diffused daylight on the left, a light oak
open shelving unit, a cream boucle curved sofa, polished beige stone floor.
Muted warm neutral color grade, soft natural light, shallow depth of field,
cinematic 35mm look, 9:16 vertical, full-body framing.
Outfits, faces, hair and accessories stay exactly as in the source image.
```

### 1-2. 네거티브 프롬프트 (4컷 공통, 그대로 복사)

```text
face morphing, identity change, outfit changing, clothing color shift, extra limbs,
extra fingers, warped hands, distorted body proportions, flicker, jitter, warping floor,
text, watermark, logo, subtitles, extra people appearing, crowd, fast camera shake,
scene change, cartoon, plastic skin, over-smoothing
```

---

## 2. 컷별 템플릿 (빈칸 채우기용)

새 이미지 세트로 다시 만들 때는 아래 블록을 컷 수만큼 복제해서 쓴다.

```text
[스타일 고정 블록 — 1-1 그대로]

Pose & motion:
왼쪽 모델 = ____________________________________________
오른쪽 모델 = __________________________________________
Natural relaxed model posing, subtle weight shift, slow blinks, quiet breathing.
Fabric of the wide trousers sways naturally. No walking out of frame.

Camera: ____________________ , very slow and smooth.
```

- **왼쪽/오른쪽 모델** 칸: 동작 **1~2개만**. 많이 적을수록 안 무너진다.
- **Camera** 칸: 4컷이 서로 다른 카메라를 쓰되, 전부 "느리게". 아래 2-1 순서 추천.

### 2-1. 카메라 순서 (기승전결)

| 컷 | 카메라 | Higgsfield 프리셋에서 고를 이름 |
|---|---|---|
| 1 | 천천히 밀고 들어감 | `Dolly In` / `Push In` (Slow) |
| 2 | 신발 → 얼굴로 올림 | `Tilt Up` (없으면 `Crane Up` 약하게) |
| 3 | 왼쪽으로 완만한 호 | `Arc Left` / `Lazy Susan` (Slow) |
| 4 | 뒤로 빠지며 마무리 | `Dolly Out` / `Zoom Out` (Slow) |

> 프리셋 이름은 모델별로 조금씩 다르다. 목록에 없으면 `Static` 고르고 카메라 지시는 프롬프트 텍스트에만 남긴다.

---

## 3. 이번 4장에 채워 넣은 값 (복붙용)

각 컷의 **Start frame 에 해당 이미지를 업로드**하고, 아래 프롬프트를 그대로 붙인다.
(네거티브는 1-2 를 4컷 공통으로 사용)

### 컷 1 — 크림 폴로 + 네이비 와이드 / 네이비 셔츠 + 아이보리 와이드 (걷는 컷)

카메라: `Dolly In (Slow)` · Motion: Low

```text
Editorial fashion film. Two Korean male models in a bright beige neoclassical room:
tall paneled walls, a large window with soft diffused daylight on the left, a light oak
open shelving unit, a cream boucle curved sofa, polished beige stone floor.
Muted warm neutral color grade, soft natural light, shallow depth of field,
cinematic 35mm look, 9:16 vertical, full-body framing.
Outfits, faces, hair and accessories stay exactly as in the source image.

Pose & motion:
The model in the cream knit polo and navy pleated wide trousers keeps walking slowly
forward with one hand in his pocket, then turns his head a little further toward the window.
The model in the open navy shirt and ivory wide trousers shifts his weight onto the front
foot and glances toward the camera at the very end.
Natural relaxed model posing, subtle weight shift, slow blinks, quiet breathing.
Fabric of the wide trousers sways naturally with each step. No walking out of frame.

Camera: slow dolly in, very slow and smooth.
```

### 컷 2 — 네이비 코치자켓+타이 / 네이비 폴로 레이어드 + 워시드 데님 (정면)

카메라: `Tilt Up (Slow)` · Motion: Low-Medium

```text
Editorial fashion film. Two Korean male models in a bright beige neoclassical room:
tall paneled walls, a large window with soft diffused daylight on the left, a light oak
open shelving unit, a cream boucle curved sofa, polished beige stone floor.
Muted warm neutral color grade, soft natural light, shallow depth of field,
cinematic 35mm look, 9:16 vertical, full-body framing.
Outfits, faces, hair and accessories stay exactly as in the source image.

Pose & motion:
The model in the navy coach jacket with a black tie straightens the front of his jacket
with one hand and gives a small, confident closed-mouth smile.
The model in the navy short-sleeve polo layered over a white collared shirt slides the
shoulder bag strap slightly and tilts his chin a touch to the side.
Natural relaxed model posing, subtle weight shift, slow blinks, quiet breathing.
Baggy denim hems move faintly. No walking out of frame.

Camera: slow tilt up from the shoes to the faces, very slow and smooth.
```

### 컷 3 — 차콜 하프집 니트+스카프 / 네이비 반팔 폴로 + 와이드 슬랙스 (측면)

카메라: `Arc Left (Slow)` · Motion: Low

```text
Editorial fashion film. Two Korean male models in a bright beige neoclassical room:
tall paneled walls, a large window with soft diffused daylight on the left, a light oak
open shelving unit, a cream boucle curved sofa, polished beige stone floor.
Muted warm neutral color grade, soft natural light, shallow depth of field,
cinematic 35mm look, 9:16 vertical, full-body framing.
Outfits, faces, hair and accessories stay exactly as in the source image.

Pose & motion:
The model in the charcoal half-zip ribbed knit slowly draws the fringed scarf up over his
forearm, still looking off toward the window.
The model in the navy short-sleeve polo and dark wide pleated trousers turns his head
slowly from profile toward the camera and holds the gaze.
Natural relaxed model posing, subtle weight shift, slow blinks, quiet breathing.
Knit texture and trouser hems settle with the movement. Feet stay planted.

Camera: slow arc to the left around the models, very slow and smooth.
```

### 컷 4 — 블랙 워크자켓 + 올리브 와이드 / 카키 자켓 + 다크 데님 (커피, 마무리)

카메라: `Dolly Out (Slow)` · Motion: Low-Medium

```text
Editorial fashion film. Two Korean male models in a bright beige neoclassical room:
tall paneled walls, a large window with soft diffused daylight on the left, a light oak
open shelving unit, a cream boucle curved sofa, polished beige stone floor.
Muted warm neutral color grade, soft natural light, shallow depth of field,
cinematic 35mm look, 9:16 vertical, full-body framing.
Outfits, faces, hair and accessories stay exactly as in the source image.

Pose & motion:
The model in the black hardware-detailed work jacket slides both hands deeper into his
pockets and shifts his stance, chin lifting slightly.
The model in the olive-khaki corduroy-collar jacket raises the paper cup, takes one small
sip, lowers it, then looks straight into the camera.
Natural relaxed model posing, subtle weight shift, slow blinks, quiet breathing.
Wide trousers sway slightly. Feet stay planted.

Camera: slow dolly out, ending on a full-body wide shot, very slow and smooth.
```

---

## 4. 작업 순서

1. Higgsfield → **Image to Video** → 컷1 이미지 업로드
2. 1번 공통 설정 적용 (모델·5s·9:16·Motion Low·Enhance prompt OFF·Seed 고정)
3. 3번의 컷1 프롬프트 + 1-2 네거티브 붙여넣고 생성
4. 컷2·3·4 반복 — **모델과 Seed 는 바꾸지 않는다**
5. 4개 다운로드 → 편집 툴에서 각 **3.75초**로 트림, 하드컷으로 이어붙임 (24fps)
6. 필요하면 Higgsfield `Upscale` 로 2K, 음악은 편집 단계에서 15초에 맞춰 페이드아웃

## 5. 잘 안 나올 때

| 증상 | 대응 |
|---|---|
| 옷 색/아이템이 바뀐다 | Enhance prompt 가 켜져 있는지 확인 → OFF. Motion 강도 한 단 낮춘다 |
| 얼굴이 뭉개진다 | Motion 을 Low 로. 동작 지시를 모델당 1개로 줄인다 |
| 배경에 사람이 생긴다 | 네거티브의 `extra people appearing, crowd` 유지 + 카메라 이동폭 축소 |
| 손이 이상하다 | "hand in pocket" 처럼 **손을 숨기는 포즈**로 지시를 바꾼다 |
| 컷마다 톤이 다르다 | 모델·Seed 통일 확인. 그래도 다르면 편집에서 LUT 한 장으로 맞춘다 |
| 걸어서 프레임 밖으로 나간다 | `No walking out of frame.` / `Feet stay planted.` 문장 유지 |
