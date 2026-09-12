import { NextResponse } from 'next/server';
import { prisma } from '@jobtalk/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 배포 환경 진단.
 *
 * 런타임 실패는 로그를 볼 수 없는 상황에서도 원인을 좁힐 수 있어야 한다.
 *
 * ⚠️ 공개 엔드포인트다. 값은 절대 내보내지 않는다 —
 *    환경변수는 존재 여부(boolean)만, DB 오류는 코드만 낸다.
 *    Prisma 오류 메시지에는 접속 호스트가 들어 있어 그대로 노출하면 안 된다.
 */
export async function GET() {
  const env = {
    DATABASE_URL: Boolean(process.env.DATABASE_URL),
    DIRECT_URL: Boolean(process.env.DIRECT_URL),
  };

  let db: 'ok' | 'error' = 'error';
  let errorCode: string | null = null;
  let errorName: string | null = null;

  try {
    await prisma.$queryRaw`SELECT 1`;
    db = 'ok';
  } catch (error) {
    const e = error as { code?: string; errorCode?: string; name?: string };
    errorCode = e.code ?? e.errorCode ?? null;
    errorName = e.name ?? null;
  }

  return NextResponse.json(
    {
      ok: env.DATABASE_URL && db === 'ok',
      env,
      db,
      errorCode,
      errorName,
      region: process.env.VERCEL_REGION ?? null,
      commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
    },
    { status: 200 },
  );
}
