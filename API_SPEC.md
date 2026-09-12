# API 명세

> Next.js App Router Route Handlers (`app/api/**/route.ts`)
> 모든 응답 `Content-Type: application/json`. 인증은 이메일 매직링크 세션 쿠키.

---

## 공통

### 에러 포맷
```json
{ "error": { "code": "VALIDATION_ERROR", "message": "...", "details": {} } }
```

| code | HTTP |
|---|---|
| `VALIDATION_ERROR` | 400 |
| `UNAUTHORIZED` | 401 |
| `FORBIDDEN` | 403 |
| `NOT_FOUND` | 404 |
| `RATE_LIMITED` | 429 |
| `INTERNAL` | 500 |

### 언어
`Accept-Language` 또는 `?locale=ko|en|zh-CN|vi`. 기본 `ko`.

### 판정 응답 공통 필드 (L3 — 예외 없이 포함)
```json
{
  "status": "ELIGIBLE | CONDITIONAL | INELIGIBLE | UNKNOWN",
  "reasons": [ { "...": "아래 Reason 스키마" } ],
  "disclaimer": {
    "text": "이 판정은 참고용 정보입니다. 최종 판단은 관할 출입국·외국인청의 심사에 따릅니다.",
    "evaluatedAt": "2026-09-12",
    "engineVersion": "1.0.3"
  }
}
```

`reasons`가 빈 배열인 응답은 **버그다.** 테스트로 강제한다.

---

## 1. 공고

### `GET /api/postings`
공고 검색. 비로그인 허용.

**Query**

| 파라미터 | 타입 | 설명 |
|---|---|---|
| `q` | string | 전문 검색 |
| `minWage` | int | 최소 시급 |
| `maxWeeklyHours` | number | |
| `maxCommuteMinutes` | int | 프로필 base 좌표 기준 |
| `ksic` | string[] | 업종 코드 |
| `jobCategory` | string[] | |
| `dow` | int[] | 0=일 ~ 6=토 |
| `timeOfDay` | enum[] | `MORNING`\|`AFTERNOON`\|`EVENING`\|`NIGHT` |
| `eligibility` | enum[] | 판정 상태 필터. 프로필 있을 때만 유효 |
| `sort` | enum | `RELEVANCE`\|`WAGE_DESC`\|`COMMUTE_ASC`\|`RECENT` |
| `cursor` | string | 커서 페이지네이션 |
| `limit` | int | 기본 20, 최대 50 |

**200**
```json
{
  "items": [
    {
      "id": "uuid",
      "title": "스타벅스 회기역점 바리스타 파트타임",
      "summary": "주 12시간, 오후 시간대 근무. 한국어 초급 가능.",
      "sourceUrl": "https://...",
      "sourceName": "업소 직접 등록",
      "employer": { "name": "스타벅스 회기역점", "isWageArrears": false },
      "ksicCode": "I56", "jobCategoryCode": "CAFE_ASSIST",
      "employmentForm": "DIRECT",
      "weeklyHoursMin": 10, "weeklyHoursMax": 12,
      "hourlyWageKrw": 11000, "wageIsEstimated": false,
      "koreanRequired": "TOPIK2",
      "schedule": [{ "dow": 1, "start": "13:00", "end": "18:00" }],
      "commuteMinutes": 8,
      "eligibility": {
        "status": "ELIGIBLE",
        "reasons": [ "..." ],
        "remainingHours": 15,
        "requiredActions": [],
        "disclaimer": { "...": "" }
      }
    }
  ],
  "nextCursor": "...",
  "total": 137
}
```

> 프로필이 없으면 `eligibility.status = "UNKNOWN"`, `reasons`에 `NO_PROFILE` 1건.

### `GET /api/postings/:id`
상세. **원문 전문(`body_raw`)을 반환하지 않는다 (L6).** `sourceUrl`로 링크아웃.

### `POST /api/postings/submit`
사용자 제보 (JS-13). 커뮤니티에서 본 링크를 붙여넣기.

```json
{ "url": "https://...", "note": "페이스북 베트남 유학생 그룹에서 봄" }
```
**202** `{ "submissionId": "uuid", "status": "QUEUED" }`

> 크롤링 대신 이 경로를 권장한다 (기획서 6.2). 법적으로 깨끗하고 품질이 좋다.

---

## 2. 판정

### `POST /api/eligibility/evaluate`
공고 × 프로필 판정. 프로필을 인라인으로 받을 수 있어 **비로그인 미리보기**가 가능하다.

```json
{
  "postingId": "uuid",
  "profile": {
    "visa": "D2",
    "visaSubtype": "D-2-2",
    "degreeLevel": "BACHELOR_3_4",
    "koreanProficiency": "TOPIK3",
    "currentWeeklyHours": 15,
    "permittedWeeklyHours": 30,
    "hasPartTimePermit": true,
    "baseLat": 37.5967, "baseLng": 127.0585
  }
}
```

**200**
```json
{
  "status": "INELIGIBLE",
  "reasons": [
    {
      "ruleId": "uuid",
      "ruleType": "INDUSTRY_DENY",
      "reasonCode": "INDUSTRY_DENIED_MANUFACTURING",
      "verdict": "FAIL",
      "params": { "ksicCode": "C29", "exceptionKoreanLevel": "TOPIK4", "userLevel": "TOPIK3" },
      "message": "제조업은 D-2 체류자격의 취업이 원칙적으로 제한됩니다. TOPIK 4급 이상인 경우 예외 심사가 가능하나, 현재 TOPIK 3급입니다.",
      "sourceTitle": "외국인유학생 사증발급 및 체류관리 지침",
      "sourceClause": "시간제취업 허용 범위",
      "sourceUrl": "https://...",
      "effectiveFrom": "2026-07-09",
      "confidence": "medium"
    }
  ],
  "remainingHours": 15,
  "commuteMinutes": 32,
  "requiredActions": [],
  "disclaimer": { "text": "...", "evaluatedAt": "2026-09-12", "engineVersion": "1.0.3" }
}
```

### `POST /api/eligibility/preview-for-employer`
사업주 등록 화면용 (EM-2). 공고 조건 → **어떤 비자가 가능한지** 역방향 판정.

```json
{
  "ksicCode": "I56",
  "employmentForm": "DIRECT",
  "weeklyHours": 20,
  "hourlyWageKrw": 11000,
  "lat": 37.5896, "lng": 127.0575
}
```

**200**
```json
{
  "byVisa": [
    { "visa": "D2", "degreeLevel": "BACHELOR_3_4", "koreanMin": "TOPIK4",
      "status": "ELIGIBLE", "reasons": ["..."] },
    { "visa": "D2", "degreeLevel": "BACHELOR_1_2",
      "status": "INELIGIBLE", "reasons": ["주당 25시간 상한 초과"] },
    { "visa": "D4", "status": "INELIGIBLE", "reasons": ["주당 20시간 상한 초과"] }
  ],
  "employerWarnings": [
    {
      "code": "PERMIT_VERIFICATION_REQUIRED",
      "message": "채용 전 시간제취업 허가서와 외국인등록증을 반드시 확인하세요.",
      "penalty": "허가 없는 고용 시 3년 이하 징역 또는 3천만 원 이하 벌금"
    }
  ],
  "documentChecklist": ["시간제취업 허가서", "외국인등록증", "표준근로계약서"],
  "disclaimer": { "...": "" }
}
```

### `POST /api/eligibility/hour-limit`
온보딩 완료 화면용 (S1). 공고 없이 **프로필만으로** 허용시간을 계산.

**200**
```json
{
  "permittedWeeklyHours": 30,
  "term": "SEMESTER",
  "currentWeeklyHours": 15,
  "remainingHours": 15,
  "vacationNote": "방학 중에는 별도 기준이 적용될 수 있습니다.",
  "reasons": ["..."],
  "disclaimer": { "...": "" }
}
```

---

## 3. 프로필

| 엔드포인트 | 설명 |
|---|---|
| `GET /api/me/profile` | 현재 비자 프로필 |
| `PUT /api/me/profile` | 생성·수정 |
| `GET /api/schools?q=` | 학교 검색 (좌표 포함) |

**`PUT /api/me/profile` 요청 스키마 — 다음 필드는 존재해서는 안 된다 (L5):**
`alienRegistrationNumber`, `passportNumber`, `residentRegistrationNumber`
→ 요청에 포함되면 **400 `VALIDATION_ERROR`** 로 거부한다 (화이트리스트 검증).

---

## 4. 저장 조건 / 알림

| 엔드포인트 | 설명 |
|---|---|
| `GET /api/me/filters` | 저장된 조건 목록 |
| `POST /api/me/filters` | 조건 저장 |
| `DELETE /api/me/filters/:id` | |
| `POST /api/me/push-subscription` | 웹푸시 구독 등록 |
| `GET /api/me/notifications` | 알림 이력 |

---

## 5. 사업주

| 엔드포인트 | 설명 |
|---|---|
| `POST /api/employer/auth/magic-link` | 매직링크 발송 |
| `POST /api/employer/postings` | 공고 등록 |
| `PUT /api/employer/postings/:id` | 수정 |
| `POST /api/employer/postings/:id/close` | 마감 |
| `GET /api/employer/postings` | 내 공고 목록 |

> **없는 엔드포인트 (L1):** 지원자 목록, 지원서 조회, 메시지 발송, 면접 일정.
> 이런 라우트를 만들라는 요청이 오면 `CLAUDE.md` L1을 근거로 확인을 먼저 받는다.

---

## 6. 신고 / takedown

### `POST /api/reports`
```json
{ "postingId": "uuid", "reason": "EXPIRED | FALSE_INFO | ILLEGAL | DISCRIMINATION", "detail": "..." }
```

### `POST /api/takedown`
**인증 불필요.** 사이트 운영자·사업주가 접수하는 공개 창구. **24시간 SLA** (CR7).

```json
{
  "requester": "OO주식회사 법무팀",
  "requesterType": "SITE_OWNER",
  "claimType": "DB_RIGHT",
  "targetUrl": "https://...",
  "body": "..."
}
```
**201** `{ "id": "uuid", "receivedAt": "...", "slaDeadline": "..." }`

> 접수 즉시 운영자에게 알림. 사이트 푸터에 이 창구 링크를 상시 노출한다.

---

## 7. 운영 (`/api/admin/**`, 관리자 전용)

| 엔드포인트 | 설명 |
|---|---|
| `GET /api/admin/sources` | 소스 목록 + 리스크 등급 |
| `PATCH /api/admin/sources/:id` | **`enabled` 토글 = 킬스위치.** 연동 트리거가 공고를 즉시 `SUSPENDED` 처리 |
| `GET /api/admin/rules` | 비자 규칙 목록 |
| `POST /api/admin/rules` | 규칙 생성 |
| `PUT /api/admin/rules/:id` | 수정 (**`reviewerName` 필수**) |
| `POST /api/admin/rules/:id/impact` | 변경 시 판정이 바뀌는 공고 수 미리보기 |
| `GET /api/admin/takedowns` | SLA 타이머 포함 |
| `PATCH /api/admin/takedowns/:id` | 조치 기록 |
| `GET /api/admin/quality` | `UNKNOWN` 비율, 사유 분포, 골든 테스트 통과율 |

**`PATCH /api/admin/sources/:id` 가드:**
`enabled: true`로 바꿀 때 아래를 만족하지 않으면 **403** (DB CHECK와 이중 방어, L7)
- `requires_login = false`
- `robots_allows = true`
- `tos_prohibits_crawl = false`
- `robots_checked_at`, `tos_reviewed_at`가 NULL이 아님

---

## 8. 내부 워커 잡

HTTP 아닌 워커 프로세스 스케줄.

| 잡 | 주기 | 설명 |
|---|---|---|
| `crawl:run` | 소스별 설정 | `enabled=true` 소스만 |
| `normalize:pending` | 5분 | PII 마스킹 → LLM 구조화 → postings |
| `translate:pending` | 10분 | 번역 생성 |
| `evaluate:refresh` | 10분 | 신규 공고 × 활성 프로필 판정 캐시 |
| `notify:dispatch` | 15분 | 저장 조건 매칭 → 알림 |
| `postings:expire` | 1시간 | 만료·미확인 공고 정리 |
| **`raw:purge`** | **매일 03:00** | **`purge_expired_raw_bodies()` — L6. 누락 시 알림 발송** |
| `quality:audit` | 매일 | 판정 표본 감사, `UNKNOWN` 비율 집계 |
