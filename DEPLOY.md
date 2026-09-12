# 배포 (Vercel)

## 왜 리전을 고정하는가

`apps/web/vercel.json` 이 함수 리전을 **`sin1` (싱가포르)** 로 고정한다.
Neon 인스턴스가 `ap-southeast-1` (싱가포르)에 있기 때문이다.

이걸 지정하지 않으면 Vercel 기본값인 `iad1` (미국 버지니아)에서 돌고,
모든 DB 왕복이 태평양을 건넌다. 공고 검색 한 번에 쿼리가 여러 번 나가므로
체감 차이가 크다. **DB 리전을 바꾸면 이 값도 같이 바꾼다.**

## Vercel 대시보드 설정

GitHub 연결이 끝났다면 `kimwj731001/jobtalkbusiness` 를 import 하고 아래만 맞춘다.

| 항목 | 값 |
|---|---|
| **Root Directory** | `apps/web` ← **이것만 틀리면 빌드가 실패한다** |
| Framework Preset | Next.js (자동 감지) |
| Build / Install Command | 기본값 그대로 (npm workspaces 를 Vercel 이 알아서 처리한다) |
| Node.js Version | 22 이상 |

Root Directory 를 `apps/web` 으로 지정해도 Vercel 은 workspace 루트에서 `npm install` 을
실행한다. `packages/*` 를 따로 설정할 필요가 없다.

## 환경변수

Settings → Environment Variables 에서 **Production / Preview / Development 전부**에 넣는다.

| 이름 | 값 | 용도 |
|---|---|---|
| `DATABASE_URL` | Neon **pooler** 주소 (`-pooler` 포함) | 런타임 쿼리 |
| `DIRECT_URL` | Neon **직결** 주소 (`-pooler` 없음) | 마이그레이션 |

로컬 `.env` 의 값을 그대로 쓰면 된다.

> 런타임에 pooler 를 쓰는 이유는 서버리스 때문이다. 함수 인스턴스가 요청마다 뜨고 지므로
> 직결을 쓰면 커넥션이 금방 고갈된다.

## Prisma 클라이언트 생성

`packages/db` 의 `postinstall` 이 `prisma generate` 를 돌린다.
Vercel 이 `npm install` 할 때 자동으로 실행되므로 빌드 커맨드를 손댈 필요가 없다.

이게 없으면 **빌드는 성공하고 런타임에 죽는다** — 가장 찾기 어려운 형태의 실패다.

## 마이그레이션은 배포에 포함되지 않는다

의도적이다. 빌드 중에 `prisma migrate deploy` 를 돌리지 않는다.

스키마 변경은 배포보다 위험하고 되돌리기 어렵다. 빌드 파이프라인이 자동으로
운영 DB 스키마를 바꾸면, 롤백할 수 없는 변경이 코드 롤백만으로 해결되지 않는 상태가 된다.

스키마를 바꿨으면 배포 **전에** 로컬에서 직접 적용한다:

```bash
npm run migrate:deploy --workspace @jobtalk/db
npm run verify --workspace @jobtalk/db
```

`verify` 가 중요하다. Prisma 가 만들지 못하는 CHECK 제약·트리거·파기 함수는
마이그레이션 SQL 에 손으로 넣어야 하는데, 빠뜨리면 L6·L7 의 DB 레벨 방어가 조용히 사라진다.
자세한 건 [packages/db/README.md](packages/db/README.md).

## 배포 후 확인

```bash
curl https://<배포주소>/api/postings
```

정상이면 이렇게 나온다 (공고가 없으므로 `items` 는 빈 배열):

```json
{ "items": [], "nextCursor": null, "eligibilityFilterApplied": false }
```

루트 페이지(`/`)에 규칙 수와 `confidence=low` 건수가 뜨면 DB 연결까지 살아 있는 것이다.

스모크 테스트를 배포본에 대고 돌릴 수도 있다:

```bash
SMOKE_BASE_URL=https://<배포주소> npm run smoke --workspace @jobtalk/web
```

> ⚠️ 스모크는 테스트용 공고를 **실제 DB 에 만들었다가 지운다.** 운영 데이터가 쌓인 뒤에는
> 별도 DB 를 향하게 하거나 돌리지 않는다.

## 지금 배포하면 보이는 것

**화면은 상태 페이지 하나뿐이다.** 검색 UI 는 CLAUDE.md 5장의 7단계이고 아직 없다.
지금 배포하는 목적은 파이프라인을 먼저 뚫어두는 것이다 —
UI 를 만든 뒤에 배포 문제를 디버깅하는 것보다 순서가 낫다.

## Vercel 설치 범위 — 빌드가 로컬에서만 되는 이유

Vercel 은 Root Directory(`apps/web`) 기준으로 설치한다.
**루트 `package.json` 의 devDependencies 는 설치되지 않는다.**

로컬에서 `npm install` 을 루트에서 돌리면 전부 깔리므로 이 차이가 드러나지 않는다.
실제로 첫 배포가 `@types/node` 없음으로 실패했다.

그래서 `apps/web` 은 빌드에 필요한 것을 **직접 선언한다** — `typescript`, `@types/node`, `prisma`.
루트에만 있는 것(`vitest` 등)에 빌드가 의존하면 안 된다.

같은 이유로:

- `prisma generate` 를 `apps/web` 의 build 스크립트에 명시한다.
  `packages/db` 의 `postinstall` 은 Vercel 설치 범위 밖이라 실행되지 않는다.
- `tsconfig.json` 이 `__tests__` / `scripts` / `vercel.config.ts` 를 제외한다.
  테스트 도구는 Vercel 에 없으므로 프로덕션 빌드가 이들을 타입체크하면 깨진다.
  로컬 검사 범위는 `tsconfig.test.json` 이 유지한다.

### 배포 전에 이걸 재현하는 법

루트가 아니라 **`apps/web` 에서** 설치해야 Vercel 과 같은 범위가 된다.

```bash
git clone <이 리포지토리> /tmp/sim
cd /tmp/sim/apps/web
npm install                      # 루트가 아니라 여기서
DATABASE_URL=... DIRECT_URL=... npm run build
```

설치된 패키지 수가 Vercel 로그와 비슷하면(현재 89 vs 88) 범위가 맞은 것이다.
루트에서 설치하면 130개가 넘고, 그건 Vercel 을 재현하지 못한 것이다.

### 빌드 리전 ≠ 함수 리전

빌드 로그의 `Running build in Washington, D.C., USA (East) – iad1` 은 빌드 머신 위치다.
`vercel.json` 의 `regions` 는 배포된 **함수**가 도는 위치이고, 그쪽이 DB 지연을 결정한다.
둘은 별개이므로 빌드 리전이 iad1 이어도 문제가 아니다.
