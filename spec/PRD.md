# PRD — 외국인 일자리 적법성 판정 서비스 (MVP)

> v0.2 / 2026-09-12 · 대상 독자: Claude Code, 개발자
> 배경·전략은 `기획서_v0.2.md`, 불변 규칙은 `CLAUDE.md` 참조

---

## 1. MVP 스코프

| | |
|---|---|
| 대상 사용자 | 수도권 대학가(서울 동대문구 회기·이문·휘경) **D-2 / D-4** 유학생 |
| 대상 사업주 | 동일 상권 카페·음식점·편의점·매장 |
| 지원 언어 | 한국어 / 영어 / 중국어(간체) / 베트남어 |
| 플랫폼 | 모바일 웹 (PWA). 네이티브 앱 없음 |
| 제외 | E-9 / E-7-4 UI, 실수령액 계산기, 리뷰·평점, 채팅, 지원 접수 |

E-9 / E-7-4는 `visa_rules`와 판정 엔진에 **데이터·로직으로만 존재**하고 UI 라우트를 만들지 않는다.

---

## 2. 유저 스토리

### 2.1 구직자 (유학생)

| ID | 스토리 | 우선순위 |
|---|---|---|
| JS-1 | 회원가입 없이도 공고를 검색하고 기본 필터를 쓸 수 있다 | P0 |
| JS-2 | 비자 프로필을 **텍스트 입력 없이** 3단계로 만들 수 있다 | P0 |
| JS-3 | 각 공고에 내 비자 기준 판정 배지(가능/조건부/불가/확인필요)가 보인다 | P0 |
| JS-4 | 판정을 탭하면 **왜 그런지** 근거 조항과 지침 개정일을 볼 수 있다 | P0 |
| JS-5 | 내 주당 허용시간 대비 잔여 시간이 보이고, 이 공고를 받으면 몇 시간이 되는지 안다 | P0 |
| JS-6 | 학교에서 통학 몇 분인지 보이고, 시간으로 필터링할 수 있다 | P0 |
| JS-7 | 시급·요일·시간대·업종으로 필터링할 수 있다 | P0 |
| JS-8 | 내 언어로 공고 제목·요약·판정 근거를 읽을 수 있다 | P0 |
| JS-9 | 원문 링크로 이동해 직접 지원할 수 있다 | P0 |
| JS-10 | 시간제취업 허가 신청 절차와 필요 서류를 단계별로 볼 수 있다 | P1 |
| JS-11 | 조건을 저장하고 새 공고가 올라오면 알림을 받는다 | P1 |
| JS-12 | 잘못된 공고(마감·허위·차별)를 신고할 수 있다 | P1 |
| JS-13 | 커뮤니티에서 본 공고 링크를 붙여넣어 구조화·판정을 받을 수 있다 | P1 |

### 2.2 사업주

| ID | 스토리 | 우선순위 |
|---|---|---|
| EM-1 | 3분 안에 공고를 등록할 수 있다 (로그인 = 이메일 매직링크) | P0 |
| EM-2 | 등록 중 **"이 조건이면 어떤 비자가 합법인지"** 즉시 보인다 | P0 |
| EM-3 | 불법고용이 되는 조건(파견·제조업·시간 초과)일 때 경고를 받는다 | P0 |
| EM-4 | 채용 시 확인해야 할 서류 체크리스트를 받는다 | P1 |
| EM-5 | 공고 수정·마감을 할 수 있다 | P1 |

### 2.3 운영자

| ID | 스토리 | 우선순위 |
|---|---|---|
| OP-1 | 소스를 **한 번의 토글로 즉시 중단**할 수 있다 (킬스위치) | P0 |
| OP-2 | takedown 요청을 접수하고 24시간 내 조치 상태를 추적할 수 있다 | P0 |
| OP-3 | 비자 규칙을 UI에서 추가·수정하고 검수자를 기록할 수 있다 | P0 |
| OP-4 | 규칙 변경 전 영향 범위(몇 건의 판정이 바뀌는지)를 미리 볼 수 있다 | P1 |
| OP-5 | `UNKNOWN` 판정 비율과 사유를 모니터링할 수 있다 | P1 |

---

## 3. 화면 정의

### S1. 온보딩 — 비자 프로필 (JS-2)

**원칙: 텍스트 입력 0회. 전부 칩/셀렉트.**

```
Step 1  언어          [한국어] [English] [中文] [Tiếng Việt]
Step 2  비자          [D-2 유학] [D-4 어학연수] [기타]
        └ D-2 선택 시  [전문학사] [학사 1~2학년] [학사 3~4학년] [석사] [박사]
Step 3  한국어        [TOPIK 없음] [1급]...[6급]  /  [KIIP 1단계]...[5단계]
Step 4  학교          [검색 셀렉트 — 수도권 대학 프리셋]
Step 5  현재 근무     "지금 알바 하고 있나요?"
        [안 함] [주 ___시간]  ← 슬라이더
        "시간제취업 허가를 받았나요?" [예] [아니오] [모름]
```

**완료 즉시 표시 (가치 증명 순간):**
```
┌────────────────────────────────────────┐
│  당신은 주당 최대 30시간까지 일할 수 있어요  │
│  현재 15시간 → 잔여 15시간               │
│                                        │
│  근거: 외국인유학생 사증발급 및 체류관리    │
│        지침 (2026-07-09 개정)           │
│  ⓘ 최종 판단은 관할 출입국·외국인청 심사    │
└────────────────────────────────────────┘
```

> **이 화면이 제품의 전부다.** 인터뷰 가설에 따르면 유학생 다수가 본인 허용시간을 틀리게 알고 있다.
> 여기서 "몰랐던 사실"을 알려주지 못하면 나머지 기능은 의미가 없다.

**수용 기준**
- [ ] 텍스트 입력 필드가 0개다 (학교 검색 제외)
- [ ] 외국인등록번호·여권번호 입력란이 없다 (L5)
- [ ] 4개 언어 전부에서 동작한다
- [ ] 프로필 없이도 S2로 진입 가능하다 (판정 배지만 "확인 필요"로 표시)
- [ ] 허용시간 표시에 근거·개정일·면책이 모두 있다 (L3)

---

### S2. 검색 결과

```
[필터 바]  판정: [가능만] [조건부 포함]   시급 ___원 이상
           통학 [15분][30분][45분][60분]  요일 [월][화]...[일]
           시간대 [오전][오후][저녁][심야]

┌──────────────────────────────────────────┐
│ ✅ 가능        스타벅스 회기역점            │
│ 카페 보조 · 주 12시간 · 시급 11,000원      │
│ 🚶 학교에서 8분                            │
│ ⏱ 받으면 주 27시간 (상한 30시간)           │
│ [원문 보기 ↗]                    [저장 ♡] │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│ ⚠️ 조건부      OO물류 이문센터              │
│ 상품 정리 · 주 20시간 · 시급 12,000원      │
│ ⚠️ 시간제취업 허가 신청이 먼저 필요합니다    │
│ ⚠️ 이 공고를 받으면 주 35시간 → 상한 초과   │
│ [왜 조건부인가요? ↓]                       │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│ ❌ 불가        OO산업 (제조)               │
│ 생산라인 보조 · 주 20시간                  │
│ ❌ 제조업은 D-2 원칙 금지 (TOPIK 4급 예외)  │
│    현재 TOPIK 3급                         │
│ [왜 불가인가요? ↓]                         │
└──────────────────────────────────────────┘
```

**수용 기준**
- [ ] 모든 카드에 판정 배지가 있다. 배지 없는 카드가 존재하지 않는다
- [ ] 원문 전문이 카드나 상세에 표시되지 않는다 (L6) — 요약과 구조화 필드만
- [ ] "원문 보기"는 반드시 외부 링크아웃이다 (L1/CR4)
- [ ] 체불사업주 공고는 그 사실이 카드에 표시된다
- [ ] 차별적 표현(국적·성별 제한) 감지 시 정책에 따라 처리된다

---

### S3. 판정 상세 (JS-4) — **법적 방어선**

```
❌ 불가

적용된 규칙
 1. 제조업 취업 제한
    D-2 체류자격은 제조업 취업이 원칙적으로 제한되며,
    TOPIK 4급 이상인 경우 예외 심사가 가능합니다.
    현재 프로필: TOPIK 3급 → 요건 미충족

    근거   외국인유학생 사증발급 및 체류관리 지침
    시행일 2026-07-09
    [지침 원문 보기 ↗]

⚠️ 이 판정은 참고용 정보입니다.
   최종 판단은 관할 출입국·외국인청의 심사에 따릅니다.
   판정 기준일: 2026-09-12 · 엔진 v1.0.3
```

**수용 기준**
- [ ] `reasons[]`가 비어 있는 판정이 렌더링되지 않는다 (L3)
- [ ] 근거 조항·시행일·면책 문구가 **모든** 판정에 예외 없이 표시된다
- [ ] 4개 언어 전부에서 근거 문구가 번역된다
- [ ] `UNKNOWN` 판정 시 "왜 판단할 수 없는지"(규칙 결측/필드 결측)를 표시한다

---

### S4. 사업주 공고 등록 (EM-1~3)

```
1. 업소 정보    상호 · 주소(카카오 주소검색) · 업종(셀렉트)
2. 근무 조건    직무 · 주당 시간 · 시급 · 요일/시간대 · 고용형태
3. 실시간 판정  ← 입력과 동시에 갱신

┌─────────────────────────────────────────┐
│ 이 조건으로 채용 가능한 비자              │
│                                         │
│ ✅ D-2 (학사 3~4학년, TOPIK 4급 이상)     │
│ ✅ D-2 (석·박사)                          │
│ ⚠️ D-2 (학사 1~2학년) — 주 25시간 초과    │
│ ❌ D-4 — 주당 상한 초과                   │
│                                         │
│ ⚠️ 채용 전 반드시 확인하세요               │
│   · 시간제취업 허가서 (학생이 제출)        │
│   · 외국인등록증 (체류자격·기간 확인)      │
│   · 허가 없는 고용 시 3년 이하 징역 또는   │
│     3천만 원 이하 벌금                    │
└─────────────────────────────────────────┘
```

> **이게 R1 수익 모델의 실물이다.** 사업주가 돈을 내는 이유는 "구인"이 아니라 "벌금 회피"다.

**수용 기준**
- [ ] 입력 변경 시 300ms 내 판정이 갱신된다
- [ ] `employment_form = DISPATCH/SUBCONTRACT/PLATFORM` 선택 시 유학생 전 비자 `INELIGIBLE` 경고
- [ ] 등록 완료까지 3분 이내 (사용성 테스트로 검증)
- [ ] 사업자등록번호를 평문 저장하지 않는다 (해시만)

---

### S5. 운영 콘솔

| 화면 | 핵심 기능 |
|---|---|
| 소스 관리 | 목록 + **enabled 토글(킬스위치)** + 리스크 등급 + robots/약관 검토 상태 |
| takedown | 접수함, 24시간 SLA 타이머, 조치 기록 |
| 규칙 관리 | `visa_rules` CRUD + `confidence` 설정 + **검수자 기록 필수** |
| 규칙 영향 분석 | 규칙 변경 시 판정이 바뀌는 공고 수 미리보기 |
| 판정 품질 | `UNKNOWN` 비율, 사유별 분포, 골든 테스트 통과율 |

**수용 기준**
- [ ] 소스 비활성화 시 해당 공고가 즉시 `SUSPENDED`로 전환된다 (트리거 동작 확인)
- [ ] 규칙 생성·수정이 `audit_logs`에 남는다
- [ ] `confidence='low'` 규칙은 목록에서 시각적으로 구분된다

---

## 4. 판정 엔진 명세

### 4.1 인터페이스

```ts
// packages/eligibility — 순수 함수. DB·네트워크 의존 없음
export function evaluate(
  posting: PostingFacts,
  profile: VisaProfile,
  rules: VisaRule[],
  ctx: { evaluatedAt: Date; commuteMinutes?: number }
): EligibilityResult;

export type EligibilityStatus = 'ELIGIBLE' | 'CONDITIONAL' | 'INELIGIBLE' | 'UNKNOWN';

export interface EligibilityResult {
  status: EligibilityStatus;
  reasons: Reason[];              // 비어 있을 수 없다 (L3)
  ruleSnapshot: VisaRule[];       // 적용된 규칙 원본
  remainingHours?: number;
  commuteMinutes?: number;
  requiredActions: RequiredAction[];
  engineVersion: string;
}

export interface Reason {
  ruleId: string | null;
  ruleType: RuleType;
  reasonCode: string;             // i18n 키
  verdict: 'PASS' | 'FAIL' | 'WARN' | 'INDETERMINATE';
  params: Record<string, unknown>;
  sourceTitle: string;
  sourceClause?: string;
  effectiveFrom: string;          // YYYY-MM-DD
  confidence: 'high' | 'medium' | 'low';
}
```

### 4.2 판정 알고리즘

```
1. 적용 규칙 수집
   visa_rules WHERE visa = profile.visa
     AND (visa_subtype IS NULL OR visa_subtype = profile.visa_subtype)
     AND effective_from <= evaluatedAt
     AND (effective_to IS NULL OR effective_to > evaluatedAt)
     AND applies_when 이 profile과 매칭

2. 규칙이 0개면            → UNKNOWN (reason: NO_RULES_FOUND)

3. 각 규칙 평가
   판정에 필요한 posting 필드가 결측 → INDETERMINATE
   규칙 confidence = 'low'            → INDETERMINATE (L4)
   그 외                              → PASS / FAIL / WARN

4. 종합 (엄격한 순서 — 완화 방향으로 절대 뒤집지 않는다)
   FAIL 이 하나라도 있으면                    → INELIGIBLE
   아니고 INDETERMINATE 가 하나라도 있으면     → UNKNOWN
   아니고 WARN 이 하나라도 있으면              → CONDITIONAL
   전부 PASS                                 → ELIGIBLE

5. 부가 계산
   remainingHours   = permitted_weekly_hours - current_weekly_hours
   requiredActions  = WARN 규칙들이 요구하는 선행 조치
```

> **4번의 순서를 절대 바꾸지 않는다.** `UNKNOWN`이 `CONDITIONAL`보다 먼저다.
> 판단할 수 없는 것을 "조건부 가능"으로 내리면 사용자가 가능하다고 읽는다.

### 4.3 규칙 타입별 평가

| rule_type | 필요 posting 필드 | 결측 시 | FAIL 조건 |
|---|---|---|---|
| `WEEKLY_HOUR_CAP` | `weekly_hours_max` | INDETERMINATE | `current + posting_hours > cap` |
| `INDUSTRY_DENY` | `ksic_code` | INDETERMINATE | ksic가 금지 prefix에 매칭 |
| `INDUSTRY_ALLOW` | `ksic_code` | INDETERMINATE | ksic가 허용 목록에 없음 |
| `EMPLOYMENT_FORM_DENY` | `employment_form` | `UNKNOWN`이면 INDETERMINATE | 금지 형태에 해당 |
| `COMMUTE_MAX_MINUTES` | 좌표 + 프로필 base 좌표 | INDETERMINATE | 소요시간 > 상한 |
| `PERMIT_REQUIRED` | — | — | 미보유 시 **WARN** (FAIL 아님 — 신청하면 되므로) |
| `KOREAN_LEVEL_MIN` | scope 매칭 시 | — | 프로필 급수 < 요구 급수 |
| `REGION_LOCK` (E-9) | `region_code` | INDETERMINATE | 현재 권역과 불일치 |
| `INDUSTRY_LOCK` (E-9) | `ksic_code` | INDETERMINATE | 현재 업종과 불일치 |
| `CHANGE_COUNT_CAP` (E-9) | — | — | 사용 횟수 ≥ 상한 |

### 4.4 골든 테스트

`packages/eligibility/__tests__/golden/*.yaml`

- 규칙 타입마다 최소 3케이스: **가능 / 불가 / 경계값**
- `UNKNOWN` 케이스 필수: ① 규칙 결측 ② posting 필드 결측 ③ confidence low
- 최소 100케이스, 정확도 **95% 미만이면 배포 금지**
- 규칙 데이터 변경 시 골든 테스트를 **먼저** 갱신한다

---

## 5. 비기능 요구사항

| 항목 | 기준 |
|---|---|
| 검색 응답 | p95 < 500ms (판정 캐시 사용) |
| 실시간 판정 (S4) | < 300ms |
| 모바일 | 360px 기준 설계. 3G 환경 LCP < 3s |
| 접근성 | 한국어 비원어민 기준 — 전문용어 회피, 아이콘 + 텍스트 병기 |
| 가용성 | MVP 단계 99% 목표 |

---

## 6. 데이터 파이프라인

```
[1] 수집      sources.enabled=true 인 소스만. rate limit 준수
              → raw_postings (url, content_hash, body_raw, purge_after=+7d)

[2] PII 마스킹 ⚠️ LLM 호출 전에 수행 (L8, 국외이전 축소)
              전화번호 · 카톡ID · 이메일 · 작성자명 → [MASKED]
              → raw_postings.pii_masked = true

[3] 구조화     Claude API structured output
              입력: 마스킹된 제목 + 본문(2,000자 절단)
              출력: ksic_code, job_category, weekly_hours, hourly_wage,
                    employment_form, korean_required, schedule, summary,
                    extraction_confidence, missing_fields[]
              ※ content_hash 캐시로 재호출 방지

[4] 지오코딩   주소 → 좌표 (카카오 로컬 API)

[5] 저장      → postings (정규화 필드만)

[6] 번역      → posting_translations (en / zh-CN / vi)

[7] 판정 캐시  활성 프로필 × 신규 공고 → eligibility_evaluations

[8] 알림      saved_filters 매칭 → notifications

[9] 파기 배치  매일 1회 purge_expired_raw_bodies()   ← L6, 미실행 시 리스크 누적
```

**LLM 추출 시 반드시 지킬 것**
- `missing_fields[]`를 반드시 채운다 → 판정 엔진의 `UNKNOWN` 근거가 된다
- 추측하지 않는다. 공고에 없는 정보는 `null` + `missing_fields`에 추가
- `extraction_confidence < 0.7`이면 판정에서 해당 필드를 결측으로 취급

---

## 7. MVP 성공 기준

| 지표 | 목표 | 미달 시 |
|---|---|---|
| 비자 프로필 완성률 | ≥ 60% | 온보딩 재설계 |
| 판정 정확도 (감사 표본) | ≥ 95% | **서비스 중단 검토** |
| `UNKNOWN` 비율 | ≤ 20% | 규칙 데이터 보강 |
| 상권 커버리지 | ≥ 70% | 오프라인 영업 강화 |
| 7일 재방문율 | ≥ 25% | 알림·가치제안 재검토 |
| takedown 접수 | 0건 | 1건이라도 발생 시 소스 정책 재검토 |
