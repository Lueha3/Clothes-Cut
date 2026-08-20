-- ============================================================================
-- Clothes-Cut — RLS · DB 제약 · Storage 정책
--
-- 실행 순서: prisma migrate deploy 로 테이블을 만든 뒤, Supabase SQL Editor 에
-- 이 파일 전체를 붙여넣어 한 번 실행한다. 모든 문장은 멱등(idempotent) 이라
-- 스키마가 바뀔 때마다 다시 실행해도 안전하다.
--
-- 왜 RLS 를 거는가
--   서버 코드는 Prisma(테이블 소유자 연결)로만 DB 에 붙고, 테이블 소유자는 RLS 를
--   우회하므로 아래 정책은 Prisma 동작에 영향을 주지 않는다. 반면 브라우저에 노출된
--   anon 키로 오는 PostgREST(anon/authenticated 롤)는 소유자가 아니라 RLS 가 강제된다.
--   즉 이 파일은 "앱 서버를 거치지 않는 모든 경로"에 대한 방어선이다.
--
-- 소유권 판정
--   profiles.id = auth.users.id (uuid) 로 잡아 두어서 자식 테이블은 전부
--   user_id = auth.uid() 한 줄로 끝난다. auth.uid() 는 (select auth.uid()) 로 감싼다 —
--   그래야 행마다 재평가되지 않고 한 번만 계산돼 인덱스를 탄다.
-- ============================================================================


-- ============================================================================
-- 0. 확장 · 외래키 (Prisma 가 표현하지 못하는 것들)
-- ============================================================================

-- gen_random_uuid() 용. Postgres 13+ 기본 제공이지만 명시해 둔다.
create extension if not exists pgcrypto;

-- profiles.id → auth.users.id. Prisma 는 auth 스키마를 모르므로 여기서 건다.
-- 계정이 삭제되면 프로필과 그 아래 자산이 전부 함께 지워진다(cascade 연쇄).
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_id_auth_users_fkey'
  ) then
    alter table public.profiles
      add constraint profiles_id_auth_users_fkey
      foreign key (id) references auth.users (id) on delete cascade;
  end if;
end
$$;


-- ============================================================================
-- 1. 값 제약 — hex 형식
--    "#1B2A4A" 7자만 허용. UI·API(zod)에서도 검사하지만, 색이 곧 제품의 신뢰라
--    잘못된 값이 DB 에 남는 경로를 아예 없앤다.
-- ============================================================================

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'palette_tokens_hex_format'
  ) then
    alter table public.palette_tokens
      add constraint palette_tokens_hex_format
      check (hex ~* '^#[0-9a-f]{6}$');
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'outfit_slots_custom_hex_format'
  ) then
    alter table public.outfit_slots
      add constraint outfit_slots_custom_hex_format
      check (custom_hex is null or custom_hex ~* '^#[0-9a-f]{6}$');
  end if;
end
$$;


-- ============================================================================
-- 2. 아바타 10개 제한 (기획의 핵심 제약)
--    앱 코드의 count 검사만 믿으면 두 탭에서 동시에 저장했을 때 11개가 된다.
--    사용자 단위 advisory lock 을 먼저 잡아 같은 사용자의 동시 insert 를 직렬화한 뒤
--    센다 — 이게 없으면 두 트랜잭션이 서로의 미커밋 행을 못 보고 둘 다 통과한다.
-- ============================================================================

create or replace function public.enforce_avatar_limit()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  avatar_count int;
begin
  perform pg_advisory_xact_lock(hashtext('clothes_cut.avatar_limit:' || new.user_id::text));

  -- update 로 들어온 경우 자기 자신은 빼고 센다. insert 는 아직 테이블에 없어
  -- 어차피 걸리지 않으므로 분기 없이 같은 문장으로 처리한다.
  select count(*) into avatar_count
  from public.avatars
  where user_id = new.user_id
    and id <> new.id;

  if avatar_count >= 10 then
    raise exception '아바타는 10명까지 저장할 수 있어요'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

-- user_id 를 바꾸는 update 도 같은 검사를 통과해야 한다(다른 계정으로 옮겨 담기 방지).
drop trigger if exists avatars_enforce_limit on public.avatars;
create trigger avatars_enforce_limit
  before insert or update of user_id on public.avatars
  for each row execute function public.enforce_avatar_limit();


-- ============================================================================
-- 3. RLS 활성화
-- ============================================================================

alter table public.profiles       enable row level security;
alter table public.avatars        enable row level security;
alter table public.items          enable row level security;
alter table public.palettes       enable row level security;
alter table public.palette_tokens enable row level security;
alter table public.projects       enable row level security;
alter table public.outfit_slots   enable row level security;
alter table public.generations    enable row level security;


-- ============================================================================
-- 4. 정책
--    to authenticated 를 반드시 붙인다. 빼면 anon 롤에도 정책이 평가되는데,
--    그때 auth.uid() 가 NULL 이라 결과는 거짓이지만 의도가 드러나지 않는다.
-- ============================================================================

-- ---------- profiles : 본인 행만 ----------
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert to authenticated
  with check (id = (select auth.uid()));

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- 삭제 정책은 두지 않는다. 계정 삭제는 auth.users 삭제 → cascade 로만 일어나야 한다.

-- ---------- user_id 를 직접 가진 테이블 ----------
-- avatars / items / palettes / projects 는 형태가 같아 한 번에 만든다.
do $$
declare
  t text;
begin
  foreach t in array array['avatars', 'items', 'palettes', 'projects']
  loop
    execute format('drop policy if exists %I on public.%I', t || '_select_own', t);
    execute format(
      'create policy %I on public.%I for select to authenticated
         using (user_id = (select auth.uid()))', t || '_select_own', t);

    execute format('drop policy if exists %I on public.%I', t || '_insert_own', t);
    execute format(
      'create policy %I on public.%I for insert to authenticated
         with check (user_id = (select auth.uid()))', t || '_insert_own', t);

    execute format('drop policy if exists %I on public.%I', t || '_update_own', t);
    execute format(
      'create policy %I on public.%I for update to authenticated
         using (user_id = (select auth.uid()))
         with check (user_id = (select auth.uid()))', t || '_update_own', t);

    execute format('drop policy if exists %I on public.%I', t || '_delete_own', t);
    execute format(
      'create policy %I on public.%I for delete to authenticated
         using (user_id = (select auth.uid()))', t || '_delete_own', t);
  end loop;
end
$$;

-- ---------- palette_tokens : 부모(palettes)를 통해 소유권 판정 ----------
drop policy if exists palette_tokens_rw_own on public.palette_tokens;
create policy palette_tokens_rw_own on public.palette_tokens
  for all to authenticated
  using (exists (
    select 1 from public.palettes p
    where p.id = palette_tokens.palette_id
      and p.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.palettes p
    where p.id = palette_tokens.palette_id
      and p.user_id = (select auth.uid())
  ));

-- ---------- outfit_slots : 부모(projects)를 통해 ----------
-- item_id 까지 검사하는 이유: 남의 아이템 id 를 자기 프로젝트 슬롯에 꽂아
-- 그 이미지 URL 을 읽어 가는 경로를 막는다.
drop policy if exists outfit_slots_rw_own on public.outfit_slots;
create policy outfit_slots_rw_own on public.outfit_slots
  for all to authenticated
  using (exists (
    select 1 from public.projects pr
    where pr.id = outfit_slots.project_id
      and pr.user_id = (select auth.uid())
  ))
  with check (
    exists (
      select 1 from public.projects pr
      where pr.id = outfit_slots.project_id
        and pr.user_id = (select auth.uid())
    )
    and exists (
      select 1 from public.items i
      where i.id = outfit_slots.item_id
        and i.user_id = (select auth.uid())
    )
  );

-- ---------- generations : 부모(projects)를 통해, 읽기 전용 ----------
-- 생성 기록을 만들고 상태를 바꾸는 건 서버(Prisma)뿐이다. 클라이언트에는
-- 폴링용 읽기만 열어 둔다 — status 를 done 으로 위조하는 경로를 없앤다.
drop policy if exists generations_select_own on public.generations;
create policy generations_select_own on public.generations
  for select to authenticated
  using (exists (
    select 1 from public.projects pr
    where pr.id = generations.project_id
      and pr.user_id = (select auth.uid())
  ));


-- ---------- 롤 권한 ----------
-- RLS 는 "누가 어떤 행을" 을 정할 뿐, 테이블 접근 자체는 GRANT 가 정한다.
-- 정책만 만들고 GRANT 가 없으면 클라이언트는 permission denied 를 받아 정책이 무의미해진다.
-- anon 에는 아무 테이블 권한도 주지 않는다 — 비로그인 사용자가 읽을 데이터가 없다.
grant usage on schema public to authenticated;

-- `all tables in schema public` 로 뭉뚱그리지 않는다. 그러면 Prisma 의
-- _prisma_migrations 까지 함께 열려 마이그레이션 이력이 클라이언트에 읽힌다.
grant select, insert, update, delete on
  public.profiles, public.avatars, public.items,
  public.palettes, public.palette_tokens,
  public.projects, public.outfit_slots
  to authenticated;

-- generations 는 읽기만(위 정책과 짝을 맞춘다).
-- revoke 를 함께 두는 이유: 예전에 넓게 grant 한 적이 있는 DB 에서도 이 파일을
-- 다시 돌리면 같은 상태로 수렴하게 하려고.
revoke insert, update, delete on public.generations from anon, authenticated;
grant select on public.generations to authenticated;

-- 마이그레이션 이력 테이블은 어느 롤에도 노출하지 않는다.
do $$
begin
  if to_regclass('public._prisma_migrations') is not null then
    execute 'alter table public._prisma_migrations enable row level security';
    execute 'revoke all on public._prisma_migrations from anon, authenticated';
  end if;
end
$$;


-- ============================================================================
-- 5. Storage 버킷
--    경로 규칙: {bucket}/{user_id}/{...}  ← 첫 폴더가 소유자 uuid 여야 한다.
--    버킷은 전부 비공개. 노출은 signed URL 로만 한다(옷·얼굴 사진이라 공개 URL 을
--    추측당하면 그대로 유출된다).
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', false, 20971520,
   array['image/webp', 'image/jpeg', 'image/png']),
  ('items', 'items', false, 20971520,
   array['image/webp', 'image/jpeg', 'image/png']),
  ('results', 'results', false, 209715200,
   array['image/webp', 'image/jpeg', 'image/png', 'video/mp4'])
on conflict (id) do nothing;

-- ⚠️ SELECT 정책을 지우면 업로드 자체가 깨진다.
-- Storage 는 업로드(INSERT) 시 내부적으로 `insert ... returning *` 을 실행하고,
-- 이 RETURNING 이 SELECT RLS 를 통과해야 한다. SELECT 정책이 하나도 없으면
-- "new row violates row-level security policy" 로 업로드가 실패한다.
do $$
declare
  b text;
begin
  foreach b in array array['avatars', 'items', 'results']
  loop
    execute format('drop policy if exists %I on storage.objects', b || '_select_own');
    execute format($p$
      create policy %I on storage.objects for select to authenticated
        using (bucket_id = %L and (storage.foldername(name))[1] = (select auth.uid())::text)
    $p$, b || '_select_own', b);

    execute format('drop policy if exists %I on storage.objects', b || '_insert_own');
    execute format($p$
      create policy %I on storage.objects for insert to authenticated
        with check (bucket_id = %L and (storage.foldername(name))[1] = (select auth.uid())::text)
    $p$, b || '_insert_own', b);

    execute format('drop policy if exists %I on storage.objects', b || '_update_own');
    execute format($p$
      create policy %I on storage.objects for update to authenticated
        using (bucket_id = %L and (storage.foldername(name))[1] = (select auth.uid())::text)
        with check (bucket_id = %L and (storage.foldername(name))[1] = (select auth.uid())::text)
    $p$, b || '_update_own', b, b);

    execute format('drop policy if exists %I on storage.objects', b || '_delete_own');
    execute format($p$
      create policy %I on storage.objects for delete to authenticated
        using (bucket_id = %L and (storage.foldername(name))[1] = (select auth.uid())::text)
    $p$, b || '_delete_own', b);
  end loop;
end
$$;
