# 비자 규칙 데이터셋 (visa_rules 시드)

> ⚠️ **이 문서의 모든 값은 2차 출처(민간 가이드 사이트) 기반이며, 출입국 지침 원문과 대조되지 않았다.**
> 따라서 대부분 `confidence: 'low'` 또는 `'medium'`이고, `low`인 규칙은 판정 시 `UNKNOWN`을 유발한다 (CLAUDE.md L4).
>
> **최우선 액션: 「외국인유학생 사증발급 및 체류관리 지침」 최신본(2026-07-09 개정) 원문 확보.**
> 원문 대조 후 `confidence`를 올리고, 그때 비로소 판정이 `ELIGIBLE`을 낼 수 있게 된다.

---

## 1. confidence 운영 규칙

| 값 | 의미 | 판정 엔진 동작 |
|---|---|---|
| `high` | 지침 원문 확인 + 전문가 검수 완료 | 정상 평가 |
| `medium` | 지침 원문 확인, 검수 미완 | 정상 평가하되 UI에 "확인 권장" 표시 |
| `low` | 2차 출처만 있음 / 자료 간 상충 | **INDETERMINATE → 전체 판정 UNKNOWN** |

`high`로 올리려면 `rule_reviews`에 검수자 기록이 있어야 한다. 코드로 강제한다.

---

## 2. 자료 간 상충 항목 (해소 전 `low` 고정)

| 항목 | 자료 A | 자료 B | 영향 |
|---|---|---|---|
| **통학 거리 제한** | 학기 중 **60분** 이내 | **수도권 90분 / 지방 60분** | 🔴 핵심 필터. 30분 차이가 검색 결과를 통째로 바꾼다 |
| D-2 학부 1~2학년 상한 | 주 25시간 | — | 🟡 |
| D-2 학부 3~4학년·석박사 상한 | 주 30시간 | 석박사 30시간 / 학부 25시간 | 🟡 |
| D-4 기준 미충족 시 | 주 10시간 | 석박사 미충족 15시간 언급 | 🟡 |
| 주말·공휴일·방학 | 한국어 기준 충족 D-2는 상한 미적용 | 명시 없음 | 🟡 |
| 제조업 예외 | TOPIK 4급 이상 "예외 심사 가능" | 심사 재량 범위 불명 | 🟠 심사 재량이면 단정 불가 |

> **통학 거리는 반드시 원문으로 확정할 것.** 이게 틀리면 제품의 핵심 필터가 틀린다.

---

## 3. 시드 데이터 — D-2

### 3.1 주당 시간 상한

```sql
-- 학부 1~2학년 (전문학사 포함), 한국어 기준 미충족
INSERT INTO visa_rules (visa, rule_type, applies_when, value, violation_status,
  source_title, source_clause, effective_from, confidence, reason_code, note) VALUES
('D2', 'WEEKLY_HOUR_CAP',
 '{"degree_level": ["ASSOCIATE","BACHELOR_1_2"], "korean_below": "TOPIK3"}',
 '{"hours": 10, "term": "SEMESTER"}', 'INELIGIBLE',
 '외국인유학생 사증발급 및 체류관리 지침', '시간제취업 허용시간',
 '2026-07-09', 'low', 'WEEKLY_HOUR_EXCEEDED',
 '2차 출처. 원문 미대조'),

-- 학부 1~2학년, TOPIK 3급/KIIP 3단계 이상
('D2', 'WEEKLY_HOUR_CAP',
 '{"degree_level": ["ASSOCIATE","BACHELOR_1_2"], "korean_min": "TOPIK3"}',
 '{"hours": 25, "term": "SEMESTER"}', 'INELIGIBLE',
 '외국인유학생 사증발급 및 체류관리 지침', '시간제취업 허용시간',
 '2026-07-09', 'low', 'WEEKLY_HOUR_EXCEEDED',
 '자료에 따라 25/30시간 상충'),

-- 학부 3~4학년·석박사, 한국어 기준 미충족
('D2', 'WEEKLY_HOUR_CAP',
 '{"degree_level": ["BACHELOR_3_4","MASTER","DOCTORATE"], "korean_below": "TOPIK4"}',
 '{"hours": 10, "term": "SEMESTER"}', 'INELIGIBLE',
 '외국인유학생 사증발급 및 체류관리 지침', '시간제취업 허용시간',
 '2026-07-09', 'low', 'WEEKLY_HOUR_EXCEEDED', NULL),

-- 학부 3~4학년·석박사, TOPIK 4급/KIIP 4단계 이상
('D2', 'WEEKLY_HOUR_CAP',
 '{"degree_level": ["BACHELOR_3_4","MASTER","DOCTORATE"], "korean_min": "TOPIK4"}',
 '{"hours": 30, "term": "SEMESTER"}', 'INELIGIBLE',
 '외국인유학생 사증발급 및 체류관리 지침', '시간제취업 허용시간',
 '2026-07-09', 'low', 'WEEKLY_HOUR_EXCEEDED', NULL);
```

### 3.2 금지 업종

```sql
INSERT INTO visa_rules (visa, rule_type, applies_when, value, violation_status,
  source_title, effective_from, confidence, reason_code, note) VALUES

-- 제조업·건설업 (제조업은 TOPIK 4급 예외 심사)
('D2', 'INDUSTRY_DENY',
 '{"korean_below": "TOPIK4"}',
 '{"ksic_prefixes": ["C", "F"], "labels": ["제조업", "건설업"]}', 'INELIGIBLE',
 '외국인유학생 사증발급 및 체류관리 지침',
 '2026-07-09', 'low', 'INDUSTRY_DENIED_MANUFACTURING',
 'TOPIK 4급 이상은 예외 심사 가능하나 재량 범위 불명 → 4급 이상에도 별도 WARN 규칙 필요'),

-- 건설업은 한국어 급수와 무관하게 금지
('D2', 'INDUSTRY_DENY',
 '{}',
 '{"ksic_prefixes": ["F"], "labels": ["건설업"]}', 'INELIGIBLE',
 '외국인유학생 사증발급 및 체류관리 지침',
 '2026-07-09', 'low', 'INDUSTRY_DENIED_CONSTRUCTION', NULL),

-- 선원취업
('D2', 'INDUSTRY_DENY', '{}',
 '{"ksic_prefixes": ["H501","H502"], "labels": ["선원취업"]}', 'INELIGIBLE',
 '외국인유학생 사증발급 및 체류관리 지침',
 '2026-07-09', 'low', 'INDUSTRY_DENIED_SEAFARER', NULL);
```

### 3.3 금지 고용형태

```sql
INSERT INTO visa_rules (visa, rule_type, applies_when, value, violation_status,
  source_title, effective_from, confidence, reason_code, note) VALUES
('D2', 'EMPLOYMENT_FORM_DENY', '{}',
 '{"forms": ["DISPATCH","SUBCONTRACT","PLATFORM"],
   "labels": ["파견","도급","특수형태근로(배달·택배·대리·보험설계·학습지·방문판매)"]}',
 'INELIGIBLE',
 '외국인유학생 사증발급 및 체류관리 지침',
 '2026-07-09', 'medium', 'EMPLOYMENT_FORM_DENIED',
 '여러 2차 출처가 일치 → medium. 물류센터 공고가 대부분 여기 걸린다');
```

> 💡 **물류센터·배달은 유학생이 가장 많이 지원하려 하고 가장 자주 거절당하는 영역이다.**
> 이 규칙 하나가 실제 사용자 가치의 상당 부분을 만든다.

### 3.4 통학 거리

```sql
-- 🔴 자료 상충. 원문 확인 전까지 confidence='low' 고정 → UNKNOWN 유발
INSERT INTO visa_rules (visa, rule_type, applies_when, value, violation_status,
  source_title, effective_from, confidence, reason_code, note) VALUES
('D2', 'COMMUTE_MAX_MINUTES',
 '{"region": "CAPITAL_AREA", "term": "SEMESTER"}',
 '{"minutes": 60, "alternative_claim": 90}', 'INELIGIBLE',
 '외국인유학생 사증발급 및 체류관리 지침',
 '2026-07-09', 'low', 'COMMUTE_EXCEEDED',
 '자료 A: 학기 중 60분 / 자료 B: 수도권 90분·지방 60분. 원문 확인 필수');
```

### 3.5 사전 허가

```sql
-- WARN. 미보유는 FAIL이 아니라 "신청하면 됨" → CONDITIONAL
INSERT INTO visa_rules (visa, rule_type, applies_when, value, violation_status,
  source_title, effective_from, confidence, reason_code, note) VALUES
('D2', 'PERMIT_REQUIRED', '{}',
 '{"permit": "PART_TIME_WORK_PERMIT",
   "steps": ["표준근로계약서 작성","학교 유학생 담당자 확인서 발급",
             "하이코리아 또는 출입국관서 신청","허가 완료 후 근무 시작"],
   "documents": ["여권","외국인등록증","통합신청서","시간제취업 확인서",
                 "재학증명서","성적/출석증명서","한국어능력 증빙",
                 "표준근로계약서","사업자등록증 사본"],
   "fee_krw": 20000,
   "warning": "허가 완료 전 근무 불가"}',
 'CONDITIONAL',
 '외국인유학생 사증발급 및 체류관리 지침',
 '2026-07-09', 'medium', 'PERMIT_REQUIRED_PART_TIME',
 '신청 중 근무는 불법. UI에서 강조할 것');
```

---

## 4. 시드 데이터 — D-4

```sql
INSERT INTO visa_rules (visa, rule_type, applies_when, value, violation_status,
  source_title, effective_from, confidence, reason_code, note) VALUES

('D4', 'WEEKLY_HOUR_CAP', '{"korean_below": "TOPIK2"}',
 '{"hours": 10, "term": "SEMESTER"}', 'INELIGIBLE',
 '외국인유학생 사증발급 및 체류관리 지침', '2026-07-09', 'low',
 'WEEKLY_HOUR_EXCEEDED', NULL),

('D4', 'WEEKLY_HOUR_CAP', '{"korean_min": "TOPIK2"}',
 '{"hours": 20, "term": "SEMESTER"}', 'INELIGIBLE',
 '외국인유학생 사증발급 및 체류관리 지침', '2026-07-09', 'low',
 'WEEKLY_HOUR_EXCEEDED', 'TOPIK 2급/KIIP 2단계 기준'),

-- D-2와 동일한 업종·고용형태·허가 규칙을 D-4에도 복제
('D4', 'EMPLOYMENT_FORM_DENY', '{}',
 '{"forms": ["DISPATCH","SUBCONTRACT","PLATFORM"]}', 'INELIGIBLE',
 '외국인유학생 사증발급 및 체류관리 지침', '2026-07-09', 'medium',
 'EMPLOYMENT_FORM_DENIED', NULL),

('D4', 'INDUSTRY_DENY', '{}',
 '{"ksic_prefixes": ["C","F"], "labels": ["제조업","건설업"]}', 'INELIGIBLE',
 '외국인유학생 사증발급 및 체류관리 지침', '2026-07-09', 'low',
 'INDUSTRY_DENIED_MANUFACTURING',
 'D-4는 TOPIK 4급 예외가 적용되는지 불명확 → 원문 확인 필요'),

('D4', 'PERMIT_REQUIRED', '{}',
 '{"permit": "PART_TIME_WORK_PERMIT", "warning": "허가 완료 전 근무 불가"}',
 'CONDITIONAL',
 '외국인유학생 사증발급 및 체류관리 지침', '2026-07-09', 'medium',
 'PERMIT_REQUIRED_PART_TIME', NULL);
```

---

## 5. 시드 데이터 — E-9 (MVP UI 미노출, 엔진만)

```sql
INSERT INTO visa_rules (visa, rule_type, applies_when, value, violation_status,
  source_title, effective_from, confidence, reason_code, note) VALUES

-- 사업장 변경은 동일 권역 내에서만
('E9', 'REGION_LOCK', '{}',
 '{"scope": "SAME_REGION"}', 'INELIGIBLE',
 '외국인력정책위원회 사업장 변경 제도 개선방안 (2023-07-05)',
 '2023-07-05', 'medium', 'REGION_LOCKED',
 '권역 구분 코드 정의 필요'),

-- 동일 업종 내에서만
('E9', 'INDUSTRY_LOCK', '{}',
 '{"scope": "SAME_INDUSTRY"}', 'INELIGIBLE',
 '외국인력정책위원회 사업장 변경 제도 개선방안 (2023-07-05)',
 '2023-07-05', 'medium', 'INDUSTRY_LOCKED', NULL),

-- 변경 횟수 상한 (원칙 3회, 사유별 예외 존재)
('E9', 'CHANGE_COUNT_CAP', '{}',
 '{"max_changes": 3, "exceptions": ["휴업","폐업","임금체불","근로조건 위반","부당처우"]}',
 'INELIGIBLE',
 '외국인근로자의 고용 등에 관한 법률 제25조',
 '2021-01-01', 'medium', 'CHANGE_COUNT_EXCEEDED', NULL);
```

> ⚠️ **E-9 판정 결과를 표시하는 모든 화면에는 다음을 함께 출력한다:**
> "E-9 사업장 변경은 고용센터를 통해서만 가능합니다. 이 서비스는 사전 정보 제공 도구이며 알선을 제공하지 않습니다."

---

## 6. 한국어 능력 서열 매핑

`korean_min` / `korean_below` 비교를 위한 서열. TOPIK과 KIIP를 하나의 축으로 다룬다.

| 값 | 서열 |
|---|---|
| `NONE` | 0 |
| `TOPIK1` / `KIIP1` | 1 |
| `TOPIK2` / `KIIP2` | 2 |
| `TOPIK3` / `KIIP3` | 3 |
| `TOPIK4` / `KIIP4` | 4 |
| `TOPIK5` / `KIIP5` | 5 |
| `TOPIK6` | 6 |

```ts
const KOREAN_RANK: Record<KoreanProficiency, number> = {
  NONE: 0,
  TOPIK1: 1, KIIP1: 1,
  TOPIK2: 2, KIIP2: 2,
  TOPIK3: 3, KIIP3: 3,
  TOPIK4: 4, KIIP4: 4,
  TOPIK5: 5, KIIP5: 5,
  TOPIK6: 6,
};
```

> ⚠️ TOPIK 급수와 KIIP 단계를 1:1로 대응시키는 것은 **우리의 단순화**다.
> 실제 지침이 두 기준을 어떻게 병렬 인정하는지 원문에서 확인할 것. 확인 전까지 관련 규칙은 `low`.

---

## 7. 허용 업종 화이트리스트 (참고)

지침이 열거한 허용 업종. `INDUSTRY_ALLOW` 규칙으로 쓸지, `INDUSTRY_DENY`만 쓸지는 원문의 규정 방식에 따른다.

| job_category | 설명 | KSIC 힌트 |
|---|---|---|
| `RESTAURANT_ASSIST` | 일반 음식점 보조 | I56 |
| `CAFE_ASSIST` | 카페 보조 | I56 |
| `RETAIL_SALES` | 매장 판매·상품 정리 보조 | G47 |
| `OFFICE_ASSIST` | 사무 보조 | N75 |
| `EVENT_ASSIST` | 행사 보조 | N752 |
| `TOUR_GUIDE_ASSIST` | 관광안내 보조 | N752 |
| `TRANSLATION_ASSIST` | 통역·번역 보조 | M73 |
| `DUTY_FREE_SALES` | 면세점 판매 보조 | G47 |
| `MAJOR_RELATED` | 전공 연계 보조업무 | — |
| `VACATION_INTERN` | 방학 중 인턴 | — |

**금지 목록 (참고)**

| job_category | employment_form |
|---|---|
| `DELIVERY_RIDER` 배달대행 | PLATFORM |
| `COURIER` 택배기사 | PLATFORM |
| `PROXY_DRIVER` 대리기사 | PLATFORM |
| `INSURANCE_AGENT` 보험설계사 | PLATFORM |
| `TUTOR_VISIT` 학습지 교사 | PLATFORM |
| `DOOR_TO_DOOR_SALES` 방문판매원 | PLATFORM |
| `MANUFACTURING_LINE` 생산라인 | — (업종 규칙) |
| `CONSTRUCTION` 건설 현장 | — (업종 규칙) |
| 유아·초등 영어교육 | — (E-2 영역) |

---

## 8. 규칙 추가·변경 절차

1. 지침 원문에서 근거 확인 → `source_title`, `source_clause`, `source_url`, `effective_from` 기입
2. `confidence`는 기본 `low`로 생성
3. **골든 테스트를 먼저 작성** (가능 / 불가 / 경계 3케이스)
4. 행정사·노무사 검수 → `rule_reviews` 기록
5. 검수 통과 시에만 `confidence`를 `medium` 이상으로 승급
6. 기존 규칙을 수정할 때는 **UPDATE가 아니라** 기존 행에 `effective_to`를 넣고 새 행을 INSERT
   (과거 판정 재현성 유지 — CLAUDE.md L2)
7. `POST /api/admin/rules/:id/impact`로 영향 범위 확인 후 반영

> **절대 하지 말 것:** 기존 규칙 행을 직접 UPDATE해서 값을 바꾸는 것.
> 그 순간 과거 판정의 근거가 소급 변조되고, 분쟁 시 방어할 수 없게 된다.
