# Higgsfield 이미지→영상 템플릿 v5 · 이미지만 바꿔 재사용하는 프롬프트 1개

v4 로 실제 생성한 결과(`hf_20260825_105351`)를 프레임 단위로 다시 확인했다.
**고개 돌림은 정상 작동했지만, 카메라 push-in 이 통제 불능으로 들어가서 마지막엔
가슴 위 클로즈업까지 가버렸다.** 벨트·손·바지가 다 잘려서 룩북으로서는 실패다.
v5 는 이 줌 오버슛을 고치고, 컷마다 따로 쓰던 프롬프트 4개를 **이미지만 갈아 끼우며
재사용하는 프롬프트 1개**로 합쳤다.

---

## 0. 실제 생성 결과 검증 (`hf_20260825_105351`, 4.06초)

첫 프레임 / 중간(약 2초) / 마지막 프레임을 뜯어봤다.

| 시점 | 관찰 |
|---|---|
| 0.0s | 전신샷. 크레딧 폴로 모델은 카메라를 보고 있고, 네이비 셔츠 모델은 옆(상대방 쪽)을 보고 있다 |
| ~2.0s | 아직 허리 아래까지 보이는 미디엄샷. 벨트·손 다 보인다. **여기까지는 의도한 그림** |
| 4.0s (끝) | **가슴 위만 남는 클로즈업.** 벨트·손·바지가 프레임 밖으로 나갔다 |

두 가지가 갈렸다:

- **고개 돌림 — 성공.** 네이비 셔츠 모델이 옆을 보다가 정확히 카메라를 정면으로 본다.
  크림 폴로 모델은 시작부터 끝까지 카메라를 보며 가만히 있다. 지시한 그대로다.
- **카메라 push-in — 실패.** 2초 지점까지는 완만하다가, 그 뒤로 급격히 가속하며 얼굴
  클로즈업까지 밀고 들어간다. "gentle", "slightly tighter medium shot" 이라고 텍스트로
  적었지만 실제 카메라 프리셋의 줌 폭을 못 이겼다. **텍스트 지시만으로는 줌 크기가
  안 잡힌다** — 최종 프레임이 어디까지 보여야 하는지 명시적으로 못박아야 한다.

### v5 에서 고친 것

| # | v4 문제 | v5 수정 |
|---|---|---|
| 1 | "gentle push-in" 만 적고 끝 지점을 안 정함 | **끝 프레임에서 벨트·손이 반드시 보여야 한다**고 명시 |
| 2 | 네거티브에 줌 과함을 막는 항목이 없음 | `extreme close-up`, `face close-up`, `punch zoom`, `cropping out the hands` 등 추가 |
| 3 | 컷마다 착장·소품을 다르게 적은 프롬프트 4개 | **프롬프트 1개로 통일** — 착장은 어차피 업로드 이미지가 결정하므로 텍스트에 안 적어도 된다 |
| 4 | 고개 돌리는 쪽을 컷마다 다르게 지정 | **항상 "오른쪽 모델"로 고정** — 이미지만 바꾸면 그대로 재사용 가능 |

---

## 1. 프롬프트 1개 (4컷 전부 이 텍스트 그대로 복붙, 이미지만 교체)

```text
Editorial fashion lookbook film, natural and clearly alive, not a frozen still.
Two Korean male models stand in a relaxed pose in a bright beige neoclassical room:
tall cream paneled walls, a large multi-pane window with soft diffused daylight on
the left, a light oak open shelving unit at the left edge, a cream boucle curved sofa
behind them on the right, polished beige stone floor. Muted warm neutral color grade,
soft natural light, 9:16 vertical, cinematic 35mm look.
Faces, hair, outfits and accessories stay exactly as in the source image.

Both models keep their feet planted in the exact same spot for the entire shot —
no steps, no walking, no body pivot, no hand gestures, no arm movement.

Head-turn beat (4 seconds, feet locked):
For the first half of the shot, the model on the right is looking off to the side,
not at the camera. In the second half, he turns his head naturally toward the camera;
his hair swings and settles with the turn. The model on the left stays steady the
whole time, gaze already on the camera, with just one slow natural blink.

Camera: an extremely subtle, slow push-in over the full 4 seconds — barely noticeable.
The framing must stay a full-body-to-medium shot the entire time: both models' belts,
waistbands, and hands in their pockets must still be clearly visible in the very last
frame. Never crop above the chest. Never end on a face close-up or a portrait crop.
The push-in should feel almost static, not like a zoom. No pan, no tilt, no shake,
no fast zoom, no accelerating zoom, no punch-in.
```

### 네거티브 프롬프트 (동일하게 재사용)

```text
extreme close-up, face close-up, portrait crop, punch zoom, crash zoom, fast zoom,
accelerating zoom, zooming past the waist, cropping out the hands, cropping out the belt,
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

### 설정

| 항목 | 값 |
|---|---|
| 모드 | Image to Video (Start frame 만, End frame 비움) |
| 길이 | 4s |
| 비율 / fps | 9:16 · 24fps |
| Motion 강도 | **Low (2~3/10)** — v4 의 4~5 가 줌 오버슛의 원인 중 하나였다. 한 단 낮춘다 |
| 카메라 프리셋 | 프리셋 목록에 강도 조절이 있다면 **가장 약한 Push In**. 조절이 안 되고 프리셋 자체가 세게 들어간다면 **차라리 Static 을 쓴다** — 옷이 잘려나가는 것보다 안 움직이는 게 낫다 |
| Enhance prompt | OFF |
| Seed | 컷마다 새로 두거나 고정, 취향껏 (착장이 이미지로 고정되므로 v4 처럼 톤 통일 목적의 Seed 고정은 필수 아님) |

### 작업 순서

1. Higgsfield → **Image to Video** → 컷1 이미지 업로드
2. 위 설정 적용
3. 위 프롬프트 + 네거티브 붙여넣고 생성
4. **생성 결과를 끝까지 재생해서 마지막 프레임 확인** — 벨트·손이 잘렸으면 카메라 프리셋을
   한 단 낮추거나 Static 으로 바꿔서 재생성 (아래 3번 참고)
5. 이미지만 컷2·3·4 로 바꿔서 **같은 프롬프트 그대로** 반복
6. 편집: 24fps 타임라인에 4개를 하드컷으로 붙임 (16.00초)
7. 텍스트 오버레이 4장 얹음 (아래 2번)
8. BGM 16초에 맞춰 배치, 마지막 0.5초 페이드아웃

---

## 2. 텍스트 오버레이 — AI 에 맡기지 말 것

AI 영상 모델은 글자를 안정적으로 못 쓴다. 네거티브의 `text, watermark, subtitles` 로
영상엔 글자를 아예 안 나오게 하고, 편집 툴에서 얹는다.

실제 소스 이미지 4장 기준 컬러 조합 (필요하면 이 문구 그대로 쓴다):

| 컷 | 착장 | 컬러 조합 | 무드 |
|---|---|---|---|
| 1 | 크림 니트폴로 / 네이비 오픈셔츠 | Navy + Cream | soft |
| 2 | 네이비 코치자켓+타이 / 네이비 폴로+숄더백, 배기 데님 | Navy + Denim | easy |
| 3 | 차콜 하프집+프린지 스카프 / 네이비 폴로 | Charcoal + Navy | sharp |
| 4 | 블랙 워크자켓 / 카키 자켓+커피 | Olive + Black | bold |

| 항목 | 값 |
|---|---|
| 위치 | 상단 중앙, 세이프에어리어 상단에서 약 8% 아래 |
| 1행 | 세리프 볼드, 착장의 메인 컬러와 크림 `#F2EAE0` 2톤. 컷별 메인: 네이비 `#1E2A44` · 데님 `#7B93B5` · 차콜 `#3A3D42` · 올리브 `#5A5B3C` |
| 2행 | 소문자 세리프, 1행의 40% 크기, 화이트, 자간 넓게 |
| 문구 | `{메인컬러} + {서브컬러}` / `{무드 한 단어}` |
| 등장 | 컷 시작과 동시에, 페이드 없이(하드컷 리듬 유지) |

---

## 3. 트러블슈팅

| 증상 | 대응 |
|---|---|
| **끝 프레임에서 얼굴 클로즈업까지 밀고 들어간다 (이번에 발생한 문제)** | ① 카메라 프리셋 강도를 낮춘다 ② 그래도 안 잡히면 프리셋을 Static 으로 바꾼다 ③ Motion 을 2~3으로 낮춘다 ④ 그래도 재현되면 **그 프리셋 자체가 텍스트 지시를 무시하는 것** — Higgsfield 프리셋마다 내장된 줌 폭이 있어서 프롬프트로 못 이기는 경우가 있다 |
| 중간까지는 괜찮다가 뒤에서 갑자기 확 당겨진다 | 이번 결과와 같은 패턴 — 줌이 선형이 아니라 뒤로 갈수록 가속하는 프리셋일 수 있다. 프리셋을 바꾸거나 Static 으로 전환 |
| 고개 돌림이 안 보인다 | "the model on the right" 가 실제 업로드 이미지에서 오른쪽에 있는지 확인. 이미지마다 두 모델 좌우가 바뀌면 지시가 반대로 적용된다 |
| 인물이 걷거나 몸을 돌린다 | 네거티브의 `walking, body pivot, spinning` 확인 |
| 옷 색/아이템이 바뀐다 | Enhance prompt OFF 확인. Motion 을 한 단 낮춘다 |
| 얼굴이 뭉개진다 | 시작 시선과 끝 시선의 각도 차이를 크게 잡지 않는다 (옆모습→정면 X, 살짝 옆→정면 O) |
| 손이 이상하다 | 손과 관련된 동작 지시를 아예 넣지 않는다 — 손은 소스 이미지 그대로 고정되는 게 가장 안전하다 |
| 글자가 깨져 나온다 | 네거티브의 `text, watermark, subtitles` 유지 → 편집에서 얹는다 (2번) |
| 컷마다 톤이 다르다 | 편집에서 LUT 한 장으로 맞춘다 |
