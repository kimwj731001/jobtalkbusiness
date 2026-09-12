import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';
import { defineConfig } from 'prisma/config';

// prisma.config.ts 가 있으면 Prisma 는 .env 를 자동으로 읽지 않는다.
// .env 는 모노레포 루트에 하나만 둔다 (앱·워커가 같은 값을 쓴다).
const here = path.dirname(fileURLToPath(import.meta.url));
loadEnv({ path: path.resolve(here, '..', '..', '.env') });

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  migrations: {
    seed: 'tsx prisma/seed.ts',
  },
});
