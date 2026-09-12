# @jobtalk/eligibility

판정 엔진. **순수 함수다** — DB·네트워크·환경변수·현재시각에 의존하지 않는다.
`__tests__/purity.test.ts` 가 이 제약을 코드로 강제한다.

```ts
evaluateEligibility(posting, profile, rules, context) → EligibilityResult
```

규칙은 인자로 들어온다. 엔진 코드에 비자 조건 `if` 문은 없다 (L2).

## 판정이 정해지는 방식

규칙 1건마다 `verdict` 가 나오고, 그것들을 우선순위로 합친다:

```
FAIL > INDETERMINATE > WARN > PASS
  ↓         ↓           ↓      ↓
INELIGIBLE UNKNOWN  CONDITIONAL ELIGIBLE
```

적용된 규칙이 하나도 없으면 `ELIGIBLE` 이 아니라 `UNKNOWN` 이다 (L4).

`INDETERMINATE` 가 나오는 경우는 셋이다:

| 상황 | reasonCode |
|---|---|
| 규칙 `confidence='low'` | `LOW_CONFIDENCE_RULE` |
| 공고 필드 결측 | `MISSING_POSTING_FIELD` |
| 프로필 필드 결측 | `MISSING_PROFILE_FIELD` |

### low confidence 는 PASS 도 FAIL 도 억제한다

`confidence='low'` 규칙은 결과가 무엇이든 `INDETERMINATE` 로 내린다
(`spec/VISA_RULES.md` 1장). 결측으로 이미 `INDETERMINATE` 인 경우만 예외로,
더 구체적인 사유를 유지한다.

여기에는 대가가 있다. **명백한 불가(건설업 등)도 근거가 `low` 면 `UNKNOWN` 이 되어
경고가 사라진다** (골든 케이스 `D2-LOWCONF-001` 이 이 동작을 고정한다).
그래서 UI 는 `UNKNOWN` 을 안전 신호로 표시하면 안 된다. 해소책은 원문 대조뿐이다.

## 근거 3종 세트 (L3)

모든 결과가 반드시 싣는다:

- `reasons[]` — 절대 비지 않는다
- `disclaimer.ruleEffectiveDate` — 적용 규칙 중 가장 늦은 시행·개정일
- `disclaimer.textKey` — 고지 문구의 i18n 키

`reasons` 는 두 종류다:

- `kind: 'RULE'` — `visa_rules` 행에서 나온 사유. `sourceTitle`·`effectiveFrom`·`confidence` 를 가진다.
- `kind: 'ENGINE'` — 엔진이 만든 사유 (`NO_PROFILE`, `NO_RULES_FOUND`).
  대응하는 규칙 행이 없으므로 `sourceTitle` 을 가질 수 없다.
  "근거 데이터가 없다"는 사실 자체가 사유이며 `messageKey` 가 그것을 설명한다.

> `golden-tests.yaml` 의 `INV-L3-002` 는 "모든 reason 에 sourceTitle" 을 요구하지만,
> 규칙 없이 나오는 사유에는 적용할 수 없어 `RULE` 사유로 한정해 구현했다.
> `ENGINE` 사유는 `INV-L3-002b` 로 따로 검사한다.

사용자 노출 문자열은 전부 i18n 키(`messageKey`)로만 나간다. 번역은 API 레이어의 몫이다.

## 테스트

```bash
npm run test --workspace @jobtalk/eligibility
```

골든 테스트는 두 모드로 돈다:

- **low** — 현재 시드 그대로 (`expect_with_low_confidence`)
- **verified** — 원문 대조를 마쳤다고 가정해 `confidence` 를 `high` 로 올린 규칙셋 (`expect_when_verified`)

`verified` 모드는 "규칙 값이 맞다고 치면 엔진 로직이 맞는가"를 검증한다.
값 자체의 정확성은 지침 원문 대조로만 확보된다.

`reasonCodes` 비교는 부분집합(⊆)이다. 기대한 사유가 빠지면 실패하고,
다른 규칙이 추가로 낸 사유는 허용한다.

### 현재 커버리지

골든 케이스 **30건**, 테스트 **50개**. CLAUDE.md 6장의 목표는 100케이스다.

시드 규칙이 존재하는 rule_type 은 전부 3케이스 이상으로 덮여 있고,
그 조건 자체를 테스트가 강제한다. `INDUSTRY_ALLOW` / `KOREAN_LEVEL_MIN` 은
평가기는 구현돼 있으나 대응하는 시드 규칙이 없어 케이스도 없다.
