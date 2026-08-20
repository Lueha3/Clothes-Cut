import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * 서버 컴포넌트 / 라우트 핸들러 / 서버 액션용 Supabase 클라이언트.
 *
 * Next 16 에서 cookies() 는 Promise 라 반드시 await 한다.
 * 쿠키 인터페이스는 getAll/setAll 만 쓴다 — get/set/remove 는 @supabase/ssr 0.12 에서
 * deprecated 이고, 세 개를 섞으면 토큰 갱신 때 쿠키가 일부만 반영된다.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server Component 에서는 쿠키를 쓸 수 없다. 세션 갱신은 src/proxy.ts 가
            // 이미 처리하므로 여기서는 조용히 넘긴다 — 읽기만 하는 호출도 많다.
          }
        },
      },
    },
  );
}
