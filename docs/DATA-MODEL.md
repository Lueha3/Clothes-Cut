# 데이터 모델 (M1 / MVP)

`prisma/schema.prisma` · `prisma/rls.sql` · `src/lib/types.ts` 세 파일이 데이터 계층의 정본이다.
이 문서는 "왜 그렇게 잡았는지"와 "어떤 순서로 적용하는지"를 적는다.

---

## 0. 먼저 알아야 할 두 가지 (진행 전 확인)

1. **Prisma 7 은 드라이버 어댑터가 필수다.** `new PrismaClient()` 만으로는 DB 에 붙지 못한다.
   `@prisma/adapter-pg` 와 `pg` 가 아직 설치돼 있지 않아 `src/lib/db.ts` 는 지금 상태로는 컴파일되지 않는다.

   ```bash
   npm i @prisma/adapter-pg pg
   npm i -D @types/pg
   npx prisma generate
   ```

   (`package.json` 수정 권한이 없어 코드 대신 여기 남긴다. 위 세 줄을 실행하면 `db.ts` 의 타입 에러 2건이 사라진다.)

2. **접속 문자열은 schema.prisma 에 못 쓴다.** Prisma 7 에서 `datasource.url` / `directUrl` 이
   스키마에서 제거되어 루트 `prisma.config.ts` 로 옮겼다. 런타임 접속은 어댑터가, 마이그레이션은
   `prisma.config.ts` 의 `datasource.url`(= `DIRECT_URL`)이 담당한다.

---

## 1. 테이블 개요

```
auth.users (Supabase)
   └─ profiles          id = auth.users.id (uuid)
        ├─ avatars      사용자당 10개 제한(트리거)
        │     └─ projects       (avatar 삭제는 Restrict — 참조 중이면 못 지운다)
        ├─ items        옷장. kind 7종 + 대표색(Lab)
        ├─ palettes     ├─ palette_tokens   NAVY = #1B2A4A
        └─ projects
              ├─ outfit_slots   (project_id, slot) 유니크 · item_id · token_id? · custom_hex?
              └─ generations    image/video · queued→running→done|failed
```

### 이름 규칙
DB 는 snake_case(`@@map` / `@map`), Prisma 모델·필드는 PascalCase/camelCase.
RLS 정책과 PostgREST 에서 따옴표 없이 읽히는 이름이라 정책문이 짧아지고 오타가 줄어든다.

### PK
전부 `uuid`, 기본값은 DB 의 `gen_random_uuid()`.
Prisma 밖(SQL 마이그레이션·Supabase 클라이언트)에서 insert 해도 PK 가 비지 않는다.

---

## 2. 설계 판단과 근거

### 2.1 `profiles.id` = `auth.users.id`
Prisma 관례대로 cuid PK 를 두고 `supabase_id` 를 따로 담으면, RLS 정책이
`user_id = auth.uid()` (cuid 문자열 vs uuid) 로 **항상 거짓**이 되어 무력화된다.
우회하려면 정책마다 `user_id in (select id from profiles where supabase_id = auth.uid()::text)`
서브쿼리를 넣어야 하고, 이건 모든 테이블·모든 행에 붙는 비용이다.
그래서 PK 자체를 auth 의 uuid 로 맞췄다 — 정책이 한 줄로 끝나고 인덱스도 그대로 탄다.

`auth.users(id)` 로의 FK 는 Prisma 가 `auth` 스키마를 모르므로 `rls.sql` 에서 건다.

### 2.2 `outfit_slots` — 색 통일의 핵심
- `(project_id, slot)` 유니크: 한 프로젝트의 한 슬롯에는 아이템 하나.
- `token_id` (nullable) + `custom_hex` (nullable): **토큰이 항상 이긴다.**
  판정 로직은 `resolveSlotHex()`(`src/lib/types.ts`) 하나로 통일했다.
- `token_id` 가 M2 Color QC 의 입력이다. 생성 결과에서 그 부위의 Lab 대표색을 측정해
  토큰 hex 와 CIEDE2000(ΔE)으로 비교하고, 어긋나면 부분 재생성한다.
  **MVP 에서 QC 를 돌리지 않더라도 지정 이력은 지금부터 쌓인다** — 나중에 스키마를 고치면
  그 이전 데이터가 전부 검증 불가가 되기 때문이다.
- 토큰 삭제는 `SetNull`. 팔레트를 정리했을 뿐인데 옷이 벗겨지면 안 된다.
- 아이템 삭제는 `Cascade`. 아이템이 사라지면 그 착장 칸은 의미가 없다.

### 2.3 `items.base_color_lab` 는 Json, hex 는 부가
ΔE 비교는 Lab 공간에서 해야 정확하다. hex 로만 저장하면 왕복 변환에서 값이 뭉개진다.
`base_color_hex` 는 "팔레트에 담을까요?" 칩에 바로 쓰려고 함께 둔 표시용 값이다.

### 2.4 `generations`
- `prompt_snapshot`(Text): 실제로 모델에 보낸 착장 지시서 전문. 컴파일러가 바뀌어도
  이 결과물이 무엇으로 만들어졌는지 재현할 수 있어야 한다.
- `input_refs`(Json): 아바타 시트 URL, 슬롯별 이미지/확정 hex/토큰 라벨 스냅샷.
  모양은 `GenerationInputRefs`(`src/lib/types.ts`). 아이템을 나중에 지워도 이 기록은 남는다.
- `provider_op_name`: Veo `predictLongRunning` 의 operation name. 폴링이 이 값으로 조회한다.
- `source_generation_id`: 영상이 어떤 이미지에서 나왔는지(자기 참조 FK). 라이브러리에서
  이미지-영상을 한 묶음으로 보여준다.
- `user_id` 를 두지 않았다. 소유권은 `project` 를 통해 판정한다 —
  탭 배지의 "진행 중 N건"은 `projects(user_id)` + `generations(project_id, status)` 인덱스로 처리된다.

### 2.5 아바타 삭제는 Restrict
`projects.avatar_id` 가 `onDelete: Restrict` 라, 참조 중인 아바타는 DB 가 삭제를 막는다.
기획의 "삭제 시 참조 프로젝트 경고"를 앱 코드만이 아니라 DB 가 뒷받침한다.
UI 는 삭제 전에 참조 프로젝트 수를 세어 먼저 안내할 것.

### 2.6 enum vs String
Prisma enum 을 썼다(`ItemKind` 등). 값이 7종/4종으로 고정이고 오타가 곧 버그라
DB 레벨에서 막는 편이 낫다. 대신 **`src/lib/types.ts` 의 문자열 유니온과 값이 글자 단위로 같아야 한다.**
한쪽만 고치면 컴파일은 통과하고 런타임에서 터진다.

---

## 3. `src/lib/types.ts` — 다른 영역과의 계약

Prisma 타입을 재수출하지 않는다. 의존성 0개라 `prisma generate` 전에도, 브라우저 번들에서도 항상 유효하다.

| 내보내는 것 | 쓰는 곳 |
|---|---|
| `ITEM_KINDS` / `ItemKind` / `isItemKind()` | 전 영역 |
| `SLOT_META` (라벨·zone·bodyPart·anchor·layer) | 드레스룸 캔버스(W3), 프롬프트 컴파일러(W5) |
| `AVATAR_VIEWBOX` / `anchorBoxPct()` / `anchorCenterPct()` | 캔버스 슬롯 배치 |
| `SLOT_RENDER_ORDER` | 스티커 겹침 순서 |
| `resolveSlotHex()` | 리컬러 시트(W4), 지시서 컴파일(W5) |
| `GenerationInputRefs` / `AvatarSheetUrls` / `LabColor` | 생성 파이프라인 |
| `STORAGE_BUCKETS` / `buildStorageObjectPath()` | 업로드 전부 |
| `MAX_AVATARS_PER_USER` 등 한도 상수 | UI 사전 검증 |

**앵커 좌표는 M0 프로토타입(`prototype/js/items.js`)의 100×200 뷰박스 값을 그대로 승계했다.**
세로가 가로의 2배라 y 값과 % 가 1:1이 아니다 — 직접 나누지 말고 `anchorBoxPct()` 를 쓸 것.

---

## 4. 적용 순서

```bash
# 0) 사전 준비 (§0 참고)
npm i @prisma/adapter-pg pg && npm i -D @types/pg
cp .env.local.example .env.local     # DATABASE_URL / DIRECT_URL 채우기

# 1) 스키마 검증 (DB 연결 없이 가능)
npx prisma validate

# 2) 클라이언트 생성
npx prisma generate

# 3) 마이그레이션 — DIRECT_URL 로 접속한다
npx prisma migrate dev --name init      # 로컬/개발
npx prisma migrate deploy               # 스테이징·운영

# 4) RLS·제약·Storage 정책 적용
#    Supabase 대시보드 › SQL Editor 에 prisma/rls.sql 전체를 붙여넣고 실행.
#    전 문장이 멱등이라 스키마가 바뀔 때마다 다시 실행해도 안전하다.
```

`rls.sql` 은 **반드시 마이그레이션 이후**에 돌린다. 테이블이 없으면 `alter table` 부터 실패한다.
스키마를 바꿔 새 테이블을 추가했다면 `rls.sql` 에 해당 테이블을 추가하고 다시 실행할 것 —
**RLS 를 켜지 않은 테이블은 anon 키로 전부 읽힌다.**

---

## 5. `rls.sql` 이 하는 일

| 절 | 내용 |
|---|---|
| 0 | `pgcrypto` 확장, `profiles.id → auth.users(id)` FK (계정 삭제 시 cascade) |
| 1 | hex 형식 CHECK (`palette_tokens.hex`, `outfit_slots.custom_hex`) |
| 2 | **아바타 10개 제한 트리거** |
| 3 | 전 테이블 RLS 활성화 |
| 4 | 정책 + `authenticated` 롤 GRANT |
| 5 | Storage 버킷 3개 생성 + 사용자 폴더 정책 |

### 왜 RLS 인가
서버는 Prisma(테이블 소유자 연결)로만 DB 에 붙고, 소유자는 RLS 를 우회하므로 정책이 앱 동작에
영향을 주지 않는다. 반면 브라우저에 노출된 anon 키로 오는 PostgREST 는 소유자가 아니라 RLS 가 강제된다.
즉 `rls.sql` 은 "앱 서버를 거치지 않는 모든 경로"에 대한 방어선이다.

### 아바타 10개 제한 트리거
앱 코드의 count 검사만으로는 두 탭에서 동시에 저장하면 11개가 된다(서로의 미커밋 행을 못 본다).
그래서 사용자 단위 `pg_advisory_xact_lock` 으로 같은 사용자의 동시 insert 를 직렬화한 뒤 센다.
`user_id` 를 바꾸는 update 에도 같은 검사가 걸린다.
에러 메시지는 그대로 사용자에게 보여줄 수 있는 문구다 — **"아바타는 10명까지 저장할 수 있어요"**.

### 정책 요약
- `profiles`: 본인 행만 select/insert/update. **delete 정책 없음** — 계정 삭제는 `auth.users` 삭제 → cascade 로만.
- `avatars` / `items` / `palettes` / `projects`: `user_id = (select auth.uid())` 로 4종(select·insert·update·delete).
- `palette_tokens`: 부모 `palettes` 를 통해 소유권 판정.
- `outfit_slots`: 부모 `projects` 를 통해. **`with check` 에서 `item_id` 소유까지 확인한다** —
  남의 아이템 id 를 자기 슬롯에 꽂아 이미지 URL 을 읽어 가는 경로를 막는다.
- `generations`: **select 만.** 상태를 만들고 바꾸는 건 서버뿐이라, 클라이언트가 `status` 를
  `done` 으로 위조할 경로를 아예 없앤다.

`auth.uid()` 는 전부 `(select auth.uid())` 로 감쌌다. 그래야 행마다 재평가되지 않고 한 번만 계산돼 인덱스를 탄다.

### Storage
버킷 3개(`avatars` / `items` / `results`)는 **전부 비공개**다. 얼굴·옷 사진이라 공개 URL 을
추측당하면 그대로 유출된다. 노출은 signed URL 로만 한다.

경로 규칙은 `{bucket}/{user_id}/{파일명}` — 첫 폴더가 소유자 uuid 여야 정책을 통과한다.
`buildStorageObjectPath(userId, fileName)` 을 쓰면 규칙을 어길 일이 없다.

> ⚠️ **SELECT 정책을 지우면 업로드가 깨진다.** Storage 는 업로드(INSERT) 시 내부적으로
> `insert ... returning *` 을 실행하고, 이 RETURNING 이 SELECT RLS 를 통과해야 한다.
> SELECT 정책이 하나도 없으면 "new row violates row-level security policy" 로 업로드가 실패한다.

---

## 6. 알려진 트레이드오프 / 남은 결정

- **`prisma-client-js` 생성기**를 골랐다. import 경로가 `@prisma/client` 로 유지돼 다른 영역이
  건드릴 게 없다. Prisma 7 의 새 `prisma-client` 생성기로 옮기려면 `output` 경로가 필수이고,
  생성 결과가 `src/` 안에 떨어져 `.gitignore`·ESLint·Tailwind 스캔 대상에서 빼는 작업이 따라온다.
  `prisma generate` 가 deprecation 경고를 내면 그때 함께 결정할 것.
- **`updated_at` 은 Prisma 의 `@updatedAt`(앱 레벨)로 관리한다.** DB 트리거를 두지 않았다 —
  쓰기 경로가 서버 Prisma 하나뿐이기 때문이다. SQL 로 직접 수정하는 운영 작업을 시작하게 되면
  그때 `moddatetime` 트리거를 추가할 것.
- **service role 키는 쓰지 않는다.** 생성 결과 업로드까지 전부 사용자 세션이 있는 요청 안에서
  일어나므로 MVP 에 필요 없다. 세션 없는 백그라운드 워커를 도입하는 순간 다시 검토할 것.
- **`items.kind` 는 사용자가 고칠 수 있다.** 비전 분류가 틀렸을 때 되돌릴 방법이 있어야 한다.
  분류 신뢰도(confidence)는 저장하지 않는다 — 쓸 곳이 정해지면 그때 컬럼을 추가한다.
