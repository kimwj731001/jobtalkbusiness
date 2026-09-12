# @jobtalk/web

Next.js 15 (App Router). 현재는 **API 만** 있다. 검색 UI 는 7단계에서 만든다.

```bash
npm run dev --workspace @jobtalk/web
npm run test --workspace @jobtalk/web     # 유닛 (DB 불필요)
npm run smoke --workspace @jobtalk/web    # 실서버 왕복 (dev/start 실행 중이어야 함)
```

## 엔드포인트

| 메서드 | 경로 | 비고 |
|---|---|---|
| `GET` | `/api/postings` | 검색. 비로그인 허용 |
| `GET` | `/api/postings/:id` | 상세. **원문 전문을 반환하지 않는다 (L6)** |
| `POST` | `/api/eligibility/evaluate` | 공고 × 프로필 판정 |
| `POST` | `/api/eligibility/hour-limit` | 공고 없이 프로필만으로 허용시간 계산 |

언어는 `?locale=ko|en|zh-CN|vi` 또는 `Accept-Language`. 기본 `ko`.

## 불변 규칙이 코드에 박힌 지점

| 규칙 | 어디에 | 무엇을 |
|---|---|---|
| L3 | `lib/evaluation.ts` | 모든 판정 응답에 `reasons`·`disclaimer` 동봉. 비는 경우가 없다 |
| L5 | `lib/profile-schema.ts` | 식별번호 필드를 **400 으로 거부**. 중첩·배열·대소문자 변형까지 탐색 |
| L6 | `api/postings/[id]` | `raw_postings` 를 조회조차 하지 않는다. 샐 경로 자체가 없다 |
| L1 | — | 지원·메시징·면접 라우트가 없다. 만들라는 요청이 오면 CLAUDE.md L1 로 먼저 확인 |

`lib/profile-schema.ts` 는 화이트리스트 + `strict()` 라, 금지 목록에 없는 새로운 식별자 필드가
와도 이름과 무관하게 거부된다.

## 알려진 제약

**통학 시간이 항상 `null` 이다.** 경로 API(카카오/ODsay) 연동이 없어 `commute_cache` 에서만 읽는다.
캐시가 비어 있으므로 통학 규칙은 `MISSING_POSTING_FIELD` 로 판단 불가가 된다.
추측한 소요시간으로 판정하는 것보다 "모른다"고 답하는 쪽이 맞다.

**판정 필터가 DB 가 아니라 메모리에서 걸린다.** 판정은 프로필마다 달라 미리 계산해 둘 수 없다.
그래서 `?eligibility=` 를 쓰면 한 페이지가 `limit` 보다 적게 찰 수 있다.
공고가 수천 건이 되면 `eligibility_evaluations` 캐시를 조인하는 쪽으로 바꾼다.

**프로필을 `x-visa-profile` 헤더로 받는다.** 세션 인증이 아직 없어서다.
매직링크 세션이 들어오면 이 경로는 사라진다.

**학기/방학을 항상 학기로 본다** (`lib/evaluation.ts`). 방학 상한 미적용 조건이
검증되지 않았고(CLAUDE.md 9장), 둘 중 학기가 더 엄격하다.

## 모노레포 패키지 해석

`next.config.ts` 의 `extensionAlias` 가 필요하다. 패키지 소스는 ESM 규약대로
`./evaluate.js` 라고 쓰지만 실제 파일은 `.ts` 다. 이걸 빼면 빌드가 깨진다.
