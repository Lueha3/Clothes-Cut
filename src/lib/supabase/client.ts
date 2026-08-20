"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * 브라우저용 Supabase 클라이언트.
 *
 * 매번 새로 만들어도 된다 — @supabase/ssr 이 세션을 쿠키에서 읽으므로 인스턴스가
 * 상태를 들고 있지 않다. 컴포넌트 밖 모듈 스코프에서 한 번 만들어 두면 로그아웃
 * 이후에도 낡은 인스턴스를 잡고 있게 되니, 필요한 자리에서 호출해 쓸 것.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
