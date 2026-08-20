import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

/**
 * Prisma 싱글턴.
 *
 * ⚠️ 이 파일이 돌려면 두 가지가 먼저 필요하다(package.json 수정 권한이 없어 여기 적어 둔다).
 *    1) npm i @prisma/adapter-pg pg && npm i -D @types/pg
 *       Prisma 7 은 드라이버 어댑터가 **필수**다. 어댑터도 accelerateUrl 도 없으면
 *       PrismaClient 생성자가 타입·런타임 양쪽에서 거부한다.
 *    2) npx prisma generate
 *       @prisma/client 는 껍데기고 실제 타입은 생성 결과(.prisma/client)에서 나온다.
 *
 * 접속은 커넥션 풀러(DATABASE_URL, 6543)로 한다. 마이그레이션만 direct(5432)를 쓰고
 * 그 설정은 prisma.config.ts 에 있다.
 */
function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    // 여기서 막지 않으면 첫 쿼리에서야 알 수 없는 접속 에러로 터진다.
    throw new Error("DATABASE_URL 이 설정되어 있지 않습니다. .env.local 을 확인해 주세요.");
  }
  return url;
}

function createPrismaClient() {
  return new PrismaClient({
    // node-postgres 는 기본적으로 이름 붙은 prepared statement 를 쓰지 않아
    // Supabase 의 transaction 모드 풀러와 그대로 맞는다.
    adapter: new PrismaPg({ connectionString: requireDatabaseUrl() }),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

declare global {
  var prismaGlobal: PrismaClient | undefined;
}

// dev 에서 HMR 이 모듈을 다시 평가할 때마다 새 풀이 생기면 커넥션이 금방 고갈된다.
export const prisma: PrismaClient = globalThis.prismaGlobal ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.prismaGlobal = prisma;
}
