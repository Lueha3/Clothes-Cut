# 커플 컬러 조합 룩북 — 힉스필드 영상 프롬프트 템플릿

`@남성모델` · `@여성모델` 두 아바타로 **"커플 색 조합" 릴스**(6컷 · 약 19초)를 뽑기 위한 프롬프트 세트.
레퍼런스는 인스타 릴스 *"Couple colour combo u need to save for..."* 포맷이다.

---

## 1. 레퍼런스 분해

### 1.1 컷 구성 (원본 18.9초 / 6컷)

| # | 타임코드 | 길이 | 조합 | 자막 한 단어 | 여성 | 남성 |
|---|---|---|---|---|---|---|
| 1 | 0.00–3.83 | 3.8s | Camel + Cream | `warm` | 크림 새틴 슬립 미디 원피스 + 카멜 블레이저 어깨 걸침 | 카멜 블레이저 + 화이트 티 + 크림 슬랙스 |
| 2 | 3.83–6.21 | 2.4s | Camel + White | `clean` | 화이트 오프숄더 니트 + 카멜 와이드 슬랙스 | 카멜 니트 폴로 + 크림 슬랙스 |
| 3 | 6.21–9.17 | 3.0s | Chocolate + Cream | `luxurious` | 초콜릿 랩 미디 원피스(벌룬 소매) | 크림 리넨 셔츠 + 초콜릿 슬랙스 |
| 4 | 9.17–12.80 | 3.6s | Chocolate + Black | `expensive` | 블랙 스퀘어넥 톱 + 브라운 레더 A라인 미디 스커트 | 다크 브라운 블레이저 + 블랙 터틀넥 + 블랙 슬랙스 |
| 5 | 12.80–15.49 | 2.7s | Burgundy + Cream | `classic` | 버건디 뷔스티에 + 크림 플리츠 미디 스커트 | 버건디 실크 셔츠 + 크림 슬랙스 |
| 6 | 15.49–18.89 | 3.4s | Burgundy + Black | `powerful` | 버건디 원숄더 새틴 드레스(하이 슬릿) | 블랙 블레이저 + 버건디 셔츠 + 블랙 슬랙스 |

컷당 **2.4~3.8초, 평균 3.1초**. 전환은 전부 **하드컷** — 디졸브·모핑·플래시 없음.

### 1.2 고정되는 것 vs 바뀌는 것

| 고정 (6컷 내내 동일) | 바뀌는 것 |
|---|---|
| 배경 세트 — 밝은 미니멀 쇼룸(오프화이트 몰딩 벽 · 왼쪽 오크 선반 · 뒤쪽 크림 곡선 벤치 · 오크 바닥) | 두 사람의 착장 전체 |
| 조명 — 왼쪽 앞 대형 창의 부드러운 확산광, 하이키, 그림자 거의 없음 | 가방 · 신발 · 주얼리 |
| 카메라 — 삼각대 고정, 눈높이, 9:16 전신 투샷, 50mm 룩 | 상단 자막(색 이름 + 형용사 한 단어) |
| 배치 — 여성이 화면 왼쪽, 남성이 오른쪽 반보 뒤, 어깨가 닿을 듯 붙어 정면 | 포즈의 미세한 차이(손 위치 정도) |
| 프레이밍 — 인물이 세로 화면의 약 65~70%, 머리 위 여유 + 신발 아래 바닥 보임 | |

### 1.3 이 포맷이 먹히는 이유

배경·조명·프레이밍이 **1픽셀도 안 흔들리는 상태에서 옷만 바뀌기 때문에** 시청자 눈에 "색 조합 비교"만 남는다.
따라서 아래 파이프라인의 핵심 목표는 화려한 모션이 아니라 **6컷의 세트 일관성**이다.

---

## 2. 제작 파이프라인

```
[A] 마스터 스틸 1장          두 아바타 합성 · 세트/조명/구도 확정
        │
        ├─→ [B] 착장 교체 스틸 5장   ★ 반드시 마스터에서 각각 파생(체인 금지)
        │
[C] 스틸 6장 → 이미지→영상 5초 6개
        │
[D] 편집   하드컷 · 자막 · 음악
```

**왜 텍스트→영상 한 방으로 안 가는가.** 6번 따로 생성하면 벽 몰딩 간격, 선반 소품, 바닥 결, 노출이
매번 달라진다. 그러면 "옷만 바뀐다"는 착시가 깨지고 그냥 서로 다른 영상 6개가 된다.

**★ 체인 금지.** 2번 스틸로 3번을 만들고, 3번으로 4번을 만드는 식으로 이어가면 오차가 누적돼
6번째쯤엔 얼굴과 세트가 눈에 띄게 밀린다. **항상 마스터 1장 → 각 착장**의 별(star) 구조로 간다.

> 팁: 마스터 스틸이 나오면 그 이미지를 Elements 에 `environment` 로 한 장 더 저장해두면
> 배경 고정력이 올라간다. 6컷 다 만들고 나서 마음에 안 들면 마스터부터 다시 뽑는 게 빠르다.

---

## 3. 템플릿 A — 마스터 스틸 (Step A · 1회)

> 모델: **Nano Banana Pro** (대안: Seedream 4.5) · 비율 **9:16** · 최고 해상도
> 프롬프트 안에서 `@남성모델` `@여성모델` 을 태그해 두 캐릭터 레퍼런스를 동시에 물린다.

```text
Full-body fashion editorial photograph of a Korean couple standing side by side, facing the camera.

SUBJECTS
- Camera-left: @여성모델 — keep her face, skin tone and black low-ponytail hairstyle with soft
  face-framing strands exactly as in her reference. Slim, elegant, weight on one leg.
- Camera-right: @남성모델 — keep his face, skin tone and soft black fringe hairstyle exactly as in
  his reference. Tall and slim, about one head taller than her, standing a half-step behind her
  right shoulder, one hand relaxed in his trouser pocket.
- They stand close, shoulders almost touching. Calm confident expressions, a faint natural smile,
  eyes to the lens. Hands relaxed and clearly visible, five fingers each.

WARDROBE
- Her: {{HER_LOOK}}
- Him: {{HIS_LOOK}}
- Accessories: {{ACCESSORIES}}
- Colour story: {{COLOR_A}} and {{COLOR_B}} only. No other hue anywhere in the frame.

SET
Bright minimal luxury showroom interior: off-white panelled wall with slim moulding, pale oak open
shelving on the left holding a few small ceramic objects, a curved cream boucle bench behind them,
light oak floor. Uncluttered, expensive, quiet.

LIGHT
Soft even diffused daylight from a large window front-left. Gentle falloff, no hard shadows, no
colour cast. High-key exposure, low contrast, true-to-life colour.

CAMERA
Vertical 9:16 full-body two-shot. 50mm lens look, eye level, tripod, shot from about 3 m.
Both subjects centred and fully in frame head to toe: a hand's width of headroom above his hair,
floor visible under their shoes, the couple filling roughly 65% of the frame height.

FINISH
Photorealistic fashion campaign still. Natural skin texture with visible pores, crisp fabric weave
and stitching, accurate fabric drape, subtle film grain. No text, no logo, no watermark.
```

**변수**

| 변수 | 채워 넣을 것 | 예시 |
|---|---|---|
| `{{HER_LOOK}}` | 여성 착장 한 문장 (소재 + 실루엣 + 색) | `a cream silk-satin cowl-neck slip midi dress` |
| `{{HIS_LOOK}}` | 남성 착장 한 문장 | `a camel wool blazer over a plain white crew-neck tee, cream tailored trousers` |
| `{{ACCESSORIES}}` | 가방/신발/시계 | `tan leather top-handle bag, nude pointed slingbacks, dark brown loafers, silver watch` |
| `{{COLOR_A}}` `{{COLOR_B}}` | 조합 색 이름 | `camel`, `cream` |

---

## 4. 템플릿 B — 착장만 교체 (Step B · 5회)

> 마스터 스틸을 첨부하고, **매번 마스터를 원본으로** 쓴다. 같은 모델·같은 비율.

```text
Use the attached image as the base. Change ONLY the clothing.

KEEP 100% IDENTICAL
Both faces, hairstyles and skin. Their exact positions, poses, hand positions and height difference.
The camera angle, focal length and framing. The background set down to the shelf objects.
The lighting, exposure and colour grade.

NEW WARDROBE
- Her: {{HER_LOOK}}
- Him: {{HIS_LOOK}}
- Bag / shoes / jewellery: {{ACCESSORIES}}
- Palette: {{COLOR_A}} and {{COLOR_B}} only.

The fabric must drape and fold naturally on their bodies, with correct contact shadows on the floor
and against the set. Photorealistic, same exposure and colour grade as the base image.
No text, no logo, no watermark.
```

---

## 5. 템플릿 C — 영상 (Step C · 6회)

> 모델: **Kling v3.0 (pro)** 또는 Seedance 2.5 · 비율 **9:16** · **5초** · 사운드 **off**
> 스틸 6장을 각각 시작 프레임으로 넣는다. 5초로 뽑아 편집에서 제일 좋은 3초를 잘라 쓴다.

### 5.1 기본 — 정지에 가까운 미세 모션 (레퍼런스와 동일, 가장 안전)

```text
Fashion lookbook clip. The couple stays exactly where they are in the frame.

MOTION
Natural breathing and blinking. A soft smile grows slightly on both faces.
She shifts her weight from one leg to the other and lets her free hand settle.
He turns his head a few degrees toward her, then back to the lens.
Tiny natural sway in the fabric and in her ponytail. Nothing else moves.

CAMERA
Locked off on a tripod. An almost imperceptible slow push in, nothing else.
No pan, no tilt, no orbit, no handheld shake, no cut.

CONSISTENCY
The outfits, the set, the lighting and both faces stay identical to the first frame for the whole
clip. Nobody walks, nobody leaves frame, no new object enters, no gesture wider than a hand.

Photorealistic, 24fps cinematic, natural motion blur.
```

### 5.2 변주 — 가벼운 포즈 체인지 (조금 더 살아 있는 느낌)

기본 프롬프트의 `MOTION` 블록만 교체한다.

```text
MOTION
She turns her upper body a few degrees toward him, glances at him, smiles, then returns to the lens.
He gives his jacket lapel one small adjustment and slides his hand back into his pocket.
Both feet stay planted on the same spot. Natural breathing and blinking throughout.
```

### 5.3 변주 — 착장 모핑 전환 (컷 대신 이어붙이고 싶을 때)

시작 프레임 = N번 착장 스틸, **끝 프레임 = N+1번 착장 스틸**, 3초. (start/end 프레임을 받는 모델에서)

```text
The couple stands perfectly still. Their outfits transform seamlessly from the first frame's look
into the last frame's look, fabric flowing and re-forming on their bodies.
The faces, poses, set, camera and lighting never change. Locked-off tripod shot.
```

---

## 6. 착장 6세트 (복붙용)

### 1. Camel + Cream — `warm`
- `{{HER_LOOK}}` = `a cream silk-satin cowl-neck slip midi dress, a camel wool blazer draped over her shoulders`
- `{{HIS_LOOK}}` = `a camel single-breasted wool blazer over a plain white crew-neck tee, cream tailored trousers, brown leather belt`
- `{{ACCESSORIES}}` = `tan leather top-handle bag, nude pointed slingbacks, dark brown leather loafers, silver watch`

### 2. Camel + White — `clean`
- `{{HER_LOOK}}` = `a white off-shoulder ribbed knit top tucked into camel high-waist wide-leg trousers, thin brown leather belt`
- `{{HIS_LOOK}}` = `a camel fine-knit long-sleeve polo tucked into cream tailored trousers, white leather belt`
- `{{ACCESSORIES}}` = `ivory quilted top-handle bag, white pointed mules, dark brown loafers, gold hoop earrings`

### 3. Chocolate + Cream — `luxurious`
- `{{HER_LOOK}}` = `a chocolate-brown wrap midi dress with balloon sleeves and a gathered waist`
- `{{HIS_LOOK}}` = `a cream linen shirt with sleeves rolled to the forearm, chocolate-brown pleated trousers`
- `{{ACCESSORIES}}` = `ivory quilted flap bag with a gold chain, cream pointed heels, dark brown loafers`

### 4. Chocolate + Black — `expensive`
- `{{HER_LOOK}}` = `a black square-neck long-sleeve fitted top and a chocolate-brown leather A-line midi skirt`
- `{{HIS_LOOK}}` = `a dark chocolate-brown wool blazer over a black fine-knit turtleneck, black tailored trousers`
- `{{ACCESSORIES}}` = `small black leather top-handle bag, black pointed pumps, black leather chelsea boots, gold watch`

### 5. Burgundy + Cream — `classic`
- `{{HER_LOOK}}` = `a burgundy satin sweetheart bustier top and a cream pleated midi skirt`
- `{{HIS_LOOK}}` = `a burgundy silk shirt tucked into cream tailored trousers, brown leather belt`
- `{{ACCESSORIES}}` = `burgundy leather mini top-handle bag, cream pointed heels, dark brown loafers`

### 6. Burgundy + Black — `powerful`
- `{{HER_LOOK}}` = `a burgundy satin one-shoulder gown with a ruched bodice and a high thigh slit`
- `{{HIS_LOOK}}` = `a black wool tuxedo-style blazer over a burgundy silk shirt, black tailored trousers`
- `{{ACCESSORIES}}` = `black satin clutch held in both hands, black leather derbies, gold drop earrings`

---

## 7. 색 토큰 (깔맞춤 기준값)

프롬프트에 색 이름만 넣으면 컷마다 톤이 밀린다. 흔들릴 때는 이름 옆에 헥스를 같이 적는다 —
`camel (#BD9B71)` 처럼.

| 이름 | 헥스 | 쓰임 |
|---|---|---|
| Cream | `#F1E7D9` | 밝은 중립 베이스 |
| White | `#F7F5F2` | 순백보다 살짝 낮춰야 화면에서 안 튄다 |
| Camel | `#BD9B71` | 따뜻한 중간톤 |
| Chocolate | `#4A2E23` | 깊은 브라운 |
| Black | `#141414` | 완전 검정 대신 살짝 띄운 값 |
| Burgundy | `#5C1A2B` | 붉은 포인트 |

---

## 8. 생성 설정 요약

| 단계 | 모델 | 비율 | 길이/해상도 | 비고 |
|---|---|---|---|---|
| A 마스터 스틸 | Nano Banana Pro (대안 Seedream 4.5) | 9:16 | 최고 해상도 | Elements 태그 2개 동시 사용 |
| B 착장 교체 ×5 | A와 같은 모델 | 9:16 | 동일 | 매번 마스터 첨부 |
| C 영상 ×6 | Kling v3.0 pro (대안 Seedance 2.5) | 9:16 | 5초 · 1080p | 사운드 off, 편집에서 3초로 컷 |

- 시드를 노출하는 모델이면 **A~B 전 구간 같은 시드**를 고정한다.
- 컷당 2~3번 뽑아 얼굴이 가장 안 밀린 테이크를 고른다. 6컷이면 최소 12~18회 생성을 예상할 것.

---

## 9. 네거티브 프롬프트 · 자주 깨지는 것

```text
walking, stepping forward, leaving frame, camera pan, camera tilt, orbit, zoom out, handheld shake,
jump cut, scene change, background change, outfit morphing mid-shot, extra people, extra limbs,
extra fingers, warped hands, face drift, identity change, plastic over-smoothed skin, waxy skin,
distorted proportions, flicker, jitter, text, caption, subtitle, watermark, logo
```

| 증상 | 원인 | 처방 |
|---|---|---|
| 컷마다 얼굴이 조금씩 다르다 | 스틸을 체인으로 파생했다 | 전부 마스터에서 다시 파생 |
| 배경 선반/몰딩이 흔들린다 | 착장 교체 프롬프트가 길어 세트 설명이 묻혔다 | `KEEP 100% IDENTICAL` 블록을 맨 위로, 착장 문장은 짧게 |
| 영상에서 인물이 걸어 나간다 | 모션 지시가 모호 | `Both feet stay planted on the same spot` 를 명시 |
| 손가락이 뭉갠다 | 손이 몸에 겹쳐 있다 | 한 손은 주머니, 다른 손은 가방 손잡이 — 손을 "쥐게" 만든다 |
| 색이 컷마다 밀린다 | 색 이름만 줬다 | §7 헥스를 프롬프트에 병기 |
| 옷이 몸에 붙은 스티커처럼 보인다 | 소재어가 없다 | `silk-satin`, `ribbed knit`, `wool`, `leather` 같은 소재어를 반드시 넣는다 |

---

## 10. 편집 (Step D)

1. **컷 길이** — 2.5~3.5초. 첫 컷과 마지막 컷만 0.5초 정도 길게.
2. **전환** — 하드컷. 트랜지션 효과를 넣으면 "옷만 바뀐다"는 비교감이 죽는다.
3. **비트 싱크** — 컷 전환을 음악 비트에 맞춘다. 6컷 × 3초 ≈ 18~20초.
4. **자막** — 화면 위쪽 1/6 지점.
   - 1행: `Camel + Cream` — 굵은 산세리프(Anton / Archivo Black 급), **색 이름을 그 색으로 칠하고 흰색 외곽선**
   - 2행: `warm` — 소문자 한 단어, 흰색
5. **안전 여백** — 인물 발끝을 화면 하단에서 15% 이상 띄운다. 인스타 하단 UI(아이디·캡션)에 신발이 가린다.
6. **훅** — 첫 0.5초에 `저장각 커플 색 조합 6` 같은 한 줄을 얹으면 이탈이 줄어든다.

---

## 11. 조합 확장

같은 템플릿에서 색만 갈아끼우면 시리즈가 된다. 남녀 중 한쪽은 중립색, 다른 쪽은 포인트색으로 가는 게 규칙.

| 조합 | 형용사 | 시즌 |
|---|---|---|
| Navy + Cream | `timeless` | 사계절 |
| Grey + White | `sharp` | 봄·가을 |
| Olive + Ivory | `easy` | 가을 |
| Charcoal + Camel | `grown` | 겨울 |
| Ecru + Denim | `everyday` | 봄·여름 |
| Forest + Cream | `holiday` | 겨울 |
