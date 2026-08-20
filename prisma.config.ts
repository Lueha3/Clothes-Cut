import { defineConfig } from "prisma/config";

/**
 * Prisma 7 설정. schema.prisma 의 datasource 에서 url/directUrl 이 제거되어
 * 접속 문자열은 이 파일이 유일한 자리다(런타임 접속은 src/lib/db.ts 의 어댑터 담당).
 */

// Prisma CLI 는 .env 만 읽고 Next.js 는 .env.local 을 읽는다. 접속 문자열을 두 파일에
// 나눠 적으면 반드시 한쪽이 낡으므로, CLI 쪽에서 .env.local 을 먼저 읽어 한 곳으로 모은다.
try {
  process.loadEnvFile(".env.local");
} catch {
  // .env.local 이 없는 환경(CI·Vercel)에서는 플랫폼 환경변수와 .env 를 그대로 쓴다.
}

// 마이그레이션은 커넥션 풀러(6543)를 통과하면 안 된다 — advisory lock 과 세션 상태가
// 필요해 direct 접속(5432)에서만 안정적으로 돈다.
const migrationUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  // 값이 없을 때 datasource 자체를 비워 둔다. 이러면 URL 없이도 validate·generate 는
  // 그대로 돌고, 실제 DB 가 필요한 migrate 명령에서만 Prisma 가 안내 에러를 낸다.
  ...(migrationUrl ? { datasource: { url: migrationUrl } } : {}),
});
