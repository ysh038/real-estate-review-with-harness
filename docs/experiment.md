# 실험 — 하네스는 결과물을 얼마나 바꾸는가

## 질문

> 이미 만들어 본 프로젝트([real-estate-agent-review](https://github.com/ysh038/real-estate-agent-review))를
> 내가 만든 하네스([create-harness](https://github.com/ysh038/create-harness))를 얹은 상태로 다시 만들면,
> 결과물이 얼마나 더 나아지는가?

## 설계

| | 대조군 (원본) | 실험군 (이 저장소) |
|---|---|---|
| 스택 | Turborepo + Next.js 15 + Bun/Hono + PostgreSQL | **동일** (통제변인) |
| 범위 | Phase 1~13 | MVP + Phase 1 (비교는 동일 구간만) |
| 에이전트 지침 | 손으로 쓴 `CLAUDE.md` 1개 + `/vibe`·`/ship` 커맨드 | create-harness 코어 (`AGENTS.md` + 규칙 4종 + 워크플로 6종) |
| 강제 수단 | 문서 + ESLint 기본 규칙(`no-unused-vars`) | **검증 게이트** — `.harness/config.json` 5종 + 커밋 훅 + 토큰 stylelint + 명명/경계 ESLint |

**조작변인은 "강제 수단"이다.** 스택·범위·사람·모델을 같게 두고, 규칙이 *문서로만* 존재할 때와
*게이트로* 존재할 때의 결과물 차이를 본다.

### 하네스 모듈 선택 결과

CLI가 감지로 자동 제외한 모듈 — 둘 다 스택 불일치가 이유다.

| 모듈 | 상태 | CLI가 출력한 이유 |
|---|---|---|
| `design-system` | 포함 | CSS / CSS Modules 프로젝트로 판단 |
| `lint` | 포함 | ESLint flat config + TypeScript 감지 |
| `auth-http` | **제외** | axios·react-router 없음 — 참조 구현이 컴파일되지 않습니다 |
| `data-fetching` | **제외** | @tanstack/react-query·zustand 없음 — 참조 구현이 컴파일되지 않습니다 |

→ 하네스의 참조 구현 축(축 1의 절반)은 이 실험에서 빠진다. 남은 것은 **컨벤션 + 게이트**다.
이것 자체가 결과다: 하네스는 현재 Vite SPA 밖에서는 절반만 적용된다.

---

## 베이스라인 (원본 측정치)

`real-estate-agent-review`, 104 커밋 시점. 빌드 산출물(`.next/`, `dist/`)과 테스트 파일 제외.

| 지표 | 값 | 측정 명령 |
|---|---|---|
| 총 커밋 | 104 | `git log --oneline \| wc -l` |
| 커밋 타입 | feat 53 / docs 36 / fix 6 / chore 5 / test 1 | `git log --pretty=%s \| grep -oE '^[a-z]+' \| sort \| uniq -c` |
| 소스 파일 | 92 | `find apps packages \( -name '*.ts' -o -name '*.tsx' \) …` |
| 테스트 파일 | 11 | `find … -name '*.test.ts'` |
| feat 커밋 중 테스트 동반 | **26 / 53 (49%)** | 아래 스니펫 |
| `any` 사용 | **0** | `grep -rnE ':[[:space:]]*any\b\|<any>\|as any' apps packages` |
| 계약 우회 (앱 안 `z.object`) | **0** | `grep -rn 'z\.object(' apps` |
| 라우트에서 직접 DB 접근 | **0** | `grep -rlE 'drizzle-orm' apps/api/src/routes` |
| CSS 파일 | **1** | `find apps -name '*.css'` |
| tsx 내 하드코딩 hex 색상 | **254** (색상 문맥 187) | `grep -rnE '#[0-9a-fA-F]{6}\b' apps/web --include='*.tsx'` |

```bash
# feat 커밋 중 테스트 동반 비율
feat=0; withtest=0
for h in $(git log --pretty=%H --grep='^feat'); do
  feat=$((feat+1))
  git show --name-only --pretty=format: "$h" | grep -q '\.test\.ts' && withtest=$((withtest+1))
done
echo "$withtest / $feat"
```

### 베이스라인이 말하는 것

원본의 손으로 쓴 CLAUDE.md는 **레이어·계약·타입 규율을 완벽하게 지켜냈다.**
`any` 0건, 계약 우회 0건, 라우트 SQL 0건. "문서는 확률적으로만 지켜진다"는 하네스의 전제가
적어도 이 축에서는 성립하지 않았다. 하네스가 이 지표들을 개선할 여지는 **없다** — 이미 만점이다.

드리프트는 다른 곳에 있었다. **CSS 파일 1개, tsx 인라인 스타일 hex 254건.**
화면마다 색이 제각각인 전형적인 UI 드리프트다. 하네스가 정확히 겨냥한다고 주장하는 영역이다.

> **다만 하네스도 이걸 게이트로는 못 잡는다.** stylelint는 `.css` 파일만 본다.
> `style={{ color: '#4f46e5' }}` 는 tsx 안에 있어 검사 대상이 아니다. 하네스가 이 드리프트를
> 막는다면 그건 게이트가 아니라 **"스타일은 컴포넌트 옆 `*.module.css`"** 라는 컨벤션 때문이다.
> 즉 이 축에서도 하네스는 결국 확률적이다. → 예측 P2에서 검증한다.

---

## 지표 (실험군에서 매 작업마다 기록)

| # | 지표 | 정의 | 왜 보는가 |
|---|---|---|---|
| M1 | 게이트 차단 | 커밋 게이트가 커밋을 거부한 횟수와 사유 | 게이트가 실제로 일을 하는가. 0이면 하네스는 장식이다 |
| M2 | 검증 실패 유입 | 커밋된 상태에서 발견된 lint/typecheck/build 실패 수 | 대조군은 CI 빨간불로 드러난다 |
| M3 | 재작업 커밋 비율 | 직전 자기 커밋을 고치는 `fix:` 비율 | 한 번에 맞게 만드는가 |
| M4 | 컨벤션 이탈 | `any` / 계약 우회 / 라우트 SQL / 하드코딩 색상 건수 | 베이스라인과 직접 대조 |
| M5 | 테스트 선행 비율 | feat 커밋 중 테스트 동반 비율 (베이스라인 49%) | `/impl` 의 Red→Green이 실제로 지켜지는가 |
| M6 | 기능당 소요 | 기능 하나에 쓴 세션·턴 수 | 하네스의 비용. 개선이 공짜가 아니다 |
| M7 | 문서 동기화 | `task-log`·`product-spec` 이 갱신된 커밋 비율 | 장기 기억이 유지되는가 |

### 예측 (반증 가능하게 적는다)

- **P1** — M4의 `any`·계약 우회·라우트 SQL은 **대조군과 동일하게 0**일 것이다.
  베이스라인이 이미 만점이라 하네스가 개선할 여지가 없다. (하네스에 불리한 예측)
- **P2** — M4의 하드코딩 색상은 **크게 줄어들 것이다**(254 → 20 미만). 단 그 원인은
  stylelint 게이트가 아니라 `30-design-system` 컨벤션 + CSS Modules 강제다.
  인라인 스타일로 hex를 쓰면 게이트는 여전히 통과한다 — 실제로 통과하는지 확인한다.
- **P3** — M5 테스트 선행 비율은 49%보다 **높을 것이다**. `/impl` 이 Red→Green을 요구하고
  `test` 가 checks에 있다.
- **P4** — M6은 **대조군보다 나쁠 것이다.** 게이트 통과 비용이 매 커밋에 붙는다.

---

## 하네스 갭 로그

설치·배선 과정에서 하네스가 못 잡았거나 오히려 방해한 지점. 재현 근거를 함께 남긴다.
(create-harness 쪽 후속 작업 후보다 — 이 저장소에서는 수정하지 않고 대상 저장소에서 우회한다.)

### G1 — 색상 토큰 강제가 실효 0이었다 · **심각**

CLI가 생성한 체크: `bunx stylelint "src/**/*.css"`. 모노레포에는 루트 `src/` 가 없다.
실제 CSS는 `apps/web/app/globals.css` 에 있다.

```
# apps/web/app/globals.css 에 .probe { color: #ff0000; background: rgb(1,2,3); } 삽입 후
bunx stylelint "src/**/*.css"      → exit 0  (통과)
bunx stylelint "apps/web/**/*.css" → exit 2  (error 2건)
```

규칙 자체는 정상이다. **체크가 코드에 닿지 않았다.** 5종 체크가 전부 초록인데 강제는 0이었다.
→ 우회: `.harness/config.json` 의 glob을 `apps/**/*.css`·`packages/**/*.css` 로 교체.

### G2 — `eslint.harness.config.js` 가 아무 데도 연결되지 않는다 · **심각**

CLI는 파일만 생성하고 "기존 config에 spread하라"는 주석만 남긴다. 실제로 spread되지 않은
상태에서 `any`, `I` 접두 없는 인터페이스를 넣어도 lint 5/5 통과.
게다가 파일이 `import tseslint from 'typescript-eslint'` 를 쓰는데 **CLI가 안내한 devDependency
목록에 `typescript-eslint` 가 없다** — 그대로 연결하면 모듈 해석 실패.

→ 우회: `packages/config/eslint.base.mjs` 에서 spread, import를 `@typescript-eslint/*` 로 교체,
files 글롭에서 `src/` 접두 제거, `parserOptions.projectService` 추가(boolean 명명 규칙이 타입 정보를 요구).

### G3 — 모듈이 제외돼도 그 모듈 전제 규칙은 설치된다 · **중간**

README는 "모듈을 빼면 그 모듈을 전제하는 규칙·워크플로도 함께 빠집니다"라고 명시한다.
실제로는 `src/registry.ts` 의 `RULE_MODULE_REQUIREMENT` 에 `30-design-system.md` 하나만 등록돼 있어,
`auth-http`·`data-fetching` 을 제외했는데도 `.cursor/rules/20-data-fetching.mdc`·`50-auth-http.mdc`
가 생성됐다. 두 문서는 axios 인스턴스·TanStack Query 3계층·`import.meta.env.VITE_*` 를 지시한다 —
이 프로젝트에 없는 라이브러리다. 에이전트에게 존재하지 않는 코드를 모방하라고 지시하는 셈.

→ 우회: 두 `.mdc` 삭제.

### G4 — `src/` 하드코딩으로 생성물이 타입체크 밖에 놓인다 · **중간**

`src/design-system/{tokens.css,tokens.ts,_story-template.tsx}` 가 저장소 루트에 생성된다.
모노레포 루트 `src/` 는 어느 워크스페이스 tsconfig의 `include` 에도 없어 **typecheck 대상이 아니다.**
`detect.ts` 의 stylelint baseline 스캐너도 루트 `src/` 만 훑어 브라운필드 유예 목록이 항상 비게 된다.

→ 우회: `apps/web/design-system/` 으로 이동, `layout.tsx` 에서 `tokens.css` import.

### G5 — 하네스의 참조 구현이 하네스 자신의 린트 규칙에 걸린다 · **중간**

`naming-convention` 의 `selector: 'variable'` 이 `format: ['camelCase']` 만 허용한다.
React에서 화살표 함수 컴포넌트와 Context는 PascalCase `const` 다:

```
apps/web/app/layout.tsx  12:7  error  Variable name `RootLayout` must match: camelCase
apps/web/app/page.tsx     1:7  error  Variable name `HomePage`   must match: camelCase
```

같은 형태가 하네스 자신의 참조 구현에도 있다 —
`templates/presets/react-fe/reference/auth-http/ProtectedRoute.tsx:24` 의 `export const AuthContext = createContext(...)`.
(그 파일이 컴포넌트를 `function ProtectedRoute()` 선언식으로 쓴 덕에 컴포넌트 쪽은 우연히 피했다.)

→ 우회: variable 선택자에 `PascalCase` 추가.

### G6 — turbo 캐시가 게이트 통과를 위조한다 · **심각**

하네스 설정 파일은 워크스페이스 밖(저장소 루트)에 있어 turbo 해시 입력에 안 잡힌다.
규칙을 강화한 직후:

```
bun run lint          → Tasks: 5 successful, 5 total   (캐시 재생)
bunx turbo lint --force → @repo/api  error  import/order   ✖ 1 problem
```

`.harness/config.json` 의 체크가 `bun run lint` 이므로 **커밋 게이트가 이 위조된 통과를 그대로 믿는다.**
모노레포 + 태스크 러너 조합에서는 하네스의 "게이트가 강제한다"는 전제가 조용히 무너진다.

→ 우회: `turbo.json` 에 `globalDependencies` 로 하네스 설정 파일 등록.

### G7 — task-log 기록이 구조적으로 한 커밋 늦는다 · **경미**

`/ship` 절차는 4단계에서 커밋하고 5단계에서 `docs/task-log.md` 에 **커밋 해시**를 적는다.
해시는 커밋 후에야 존재하므로 로그 줄은 항상 다음 커밋에 실린다. 기능 하나에 커밋 2개가
붙어 M3(재작업 커밋 비율)·M7(문서 동기화) 측정이 왜곡된다.

→ 우회 없음. 측정 시 `docs:` 단독 커밋을 재작업으로 세지 않는다.

### 갭 요약

| ID | 심각도 | 한 줄 | 성격 |
|---|---|---|---|
| G1 | 심각 | stylelint 체크가 모노레포 코드에 안 닿음 | `src/` 하드코딩 |
| G2 | 심각 | 린트 규칙이 미연결 + 의존성 안내 누락 | 설치 미완성 |
| G3 | 중간 | 제외 모듈의 규칙이 남아 잘못된 지시를 함 | 문서-구현 불일치 |
| G4 | 중간 | 생성물이 typecheck 밖에 놓임 | `src/` 하드코딩 |
| G5 | 중간 | 참조 구현이 자기 린트 규칙에 걸림 | 자기 정합성 |
| G6 | 심각 | 캐시된 통과를 게이트가 신뢰 | 태스크 러너 미대응 |
| G7 | 경미 | task-log 기록이 항상 다음 커밋에 실림 | 워크플로 순서 |

**G1·G2·G6은 같은 얼굴을 하고 있다: 5종 체크가 전부 초록인데 아무것도 강제하지 않는 상태.**
하네스의 핵심 주장("문서가 아니라 게이트로 강제")에 대한 가장 아픈 반례다.
설치 직후 "통과"는 강제되고 있다는 증거가 **아니다.**

> 이 실험이 채택한 검증 습관: 게이트를 얹은 직후 **일부러 위반 코드를 넣어 실제로 거부되는지
> 확인한다.** G1·G2·G6은 전부 이 방법으로만 드러났다.

---

## 로그

| 날짜 | 작업 | M1 | M2 | M5 | 비고 |
|---|---|---|---|---|---|
| 2026-08-15 | 모노레포 스켈레톤 + 하네스 설치·배선 | n/a | 0 | – | 갭 G1~G6 발견. 검증 5종 통과 |
| 2026-08-15 | offices 스키마 + bbox 조회 API (`/spec`→`/impl`) | n/a | 0 | 1/1 | AC 11개 → 테스트 22개. Red 13실패 확인 후 Green |

### M1 측정 불가 — 세션 구성 문제

커밋 게이트는 `.claude/settings.json` 의 `PreToolUse` 훅이다. 이 훅은 **Claude Code의 프로젝트
디렉터리가 이 저장소일 때만** 로드된다. 지금까지의 세션은 다른 저장소를 프로젝트 루트로 열고
이곳을 추가 작업 디렉터리로 붙여 진행해서, 훅이 걸리지 않았다.

즉 **M1(게이트 차단 횟수)은 현재 구성에서 측정되지 않는다.** 게이트 스크립트 자체는 정상이다 —
`--no-verify`·force push에 대해 `deny` 를 돌려주는 것은 직접 호출로 확인했다. 하지만 "게이트가
에이전트를 실제로 막는가"는 검증되지 않았고, 그동안은 **내가 자발적으로 `run-checks.mjs` 를
돌린 것**이지 강제된 것이 아니다.

→ 이후 세션은 이 저장소를 프로젝트 루트로 열고 진행해야 M1이 측정된다. 그전까지 M1은 `n/a`.
create-harness TODO의 "Cursor·Claude 실제 세션에서 규칙·커맨드·훅 로드를 눈으로 확인"이
아직 미완인 항목과 같은 문제다.

### 이번 작업에서 관찰된 것

- **`/spec` 이 실제로 일을 했다.** AC3("경계선 위 좌표 포함")을 처음에 서비스 단위 테스트로
  분류했다가, 테스트를 쓰는 단계에서 "repository를 mock하면 mock이 시킨 대로 답하는지만
  확인하게 된다"는 걸 깨닫고 통합 테스트로 옮겼다. 명세를 먼저 쓰지 않았다면 그냥 통과하는
  가짜 테스트가 됐을 자리다.
- **`/impl` 의 Red 단계가 값을 했다.** 구현 전 13개 실패를 확인했고, 그중 1개("잘못된 bbox면
  repository를 호출하지 않는다")는 라우트가 아직 404를 내서 **엉뚱한 이유로 통과**하고 있었다.
  Red를 안 봤으면 그 테스트가 무의미하다는 걸 몰랐을 것이다.
- **게이트가 잡지 못한 실수도 있었다.** 통합 테스트에서 AC2가 남긴 행이 AC3으로 새어 들어가
  실패했다. 5종 체크는 이걸 못 막는다 — 테스트를 실제로 돌려서만 드러난다.
