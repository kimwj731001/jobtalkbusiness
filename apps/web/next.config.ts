import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';
import type { NextConfig } from 'next';

// Next 는 앱 디렉터리의 .env 만 읽는다. 이 모노레포는 루트에 하나만 둔다.
loadEnv({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '.env') });

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // 모노레포 패키지를 소스 그대로 가져다 쓴다 (빌드 산출물 없이 TypeScript 직접 참조)
  transpilePackages: ['@jobtalk/shared', '@jobtalk/eligibility', '@jobtalk/db'],
  serverExternalPackages: ['@prisma/client'],

  webpack(config) {
    /**
     * 모노레포 패키지는 TypeScript 소스를 그대로 가져다 쓴다.
     * 그 소스의 상대 import 는 ESM 규약대로 `./evaluate.js` 라고 쓰여 있지만
     * 실제 파일은 `evaluate.ts` 다. webpack 에 이 대응을 알려준다.
     */
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      '.js': ['.ts', '.tsx', '.js'],
    };
    return config;
  },
};

export default nextConfig;
