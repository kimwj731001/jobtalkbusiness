import { PrismaClient } from '@prisma/client';

export { ruleUuid } from './rule-id.js';
export * from '@prisma/client';

/**
 * 개발 중 HMR 로 클라이언트가 중복 생성되는 것을 막는다.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
