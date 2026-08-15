/**
 * 하네스 린트 규칙 조각 — packages/config/eslint.base.mjs 가 spread 한다.
 * 문서만 있으면 에이전트가 무시한다. 컨벤션은 여기서 error로 강제된다.
 *
 * [하네스 적용 수정 G2] 원본 템플릿에서 바꾼 것:
 *  1. files 글롭의 `src/` 접두 제거 — 모든 ts·tsx 로 확대.
 *     모노레포에는 루트 src/ 가 없다. 그대로 두면 어떤 파일에도 매칭되지 않아
 *     규칙이 "설치됐지만 강제되지 않는" 상태가 된다 (any·I접두 위반이 전부 통과).
 *  2. `import tseslint from 'typescript-eslint'` → `@typescript-eslint/*` 직접 import.
 *     CLI가 안내한 devDependency 목록에 `typescript-eslint` 가 없어 import가 깨진다.
 *  3. naming-convention 의 boolean 선택자는 타입 정보를 요구한다 →
 *     languageOptions.parserOptions.projectService 를 함께 켠다.
 *  4. no-restricted-imports 의 `queries/` 패턴 제거 — 이 프로젝트에 없는 레이어다.
 *     대신 워크스페이스 공개 API(@repo/*) 우회를 막는다.
 */
import tsPlugin from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import importPlugin from 'eslint-plugin-import'

export default [
    {
        files: ['**/*.{ts,tsx}'],
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                projectService: true,
            },
        },
        plugins: {
            '@typescript-eslint': tsPlugin,
            import: importPlugin,
        },
        rules: {
            // ── 명명 규칙 (10-architecture) ─────────────────────────────
            '@typescript-eslint/naming-convention': [
                'error',
                {
                    selector: 'variable',
                    types: ['boolean'],
                    format: ['PascalCase', 'camelCase'],
                    prefix: ['is', 'has', 'should', 'can', 'must', 'was', 'will'],
                },
                {
                    // [하네스 적용 수정 G5] 원본은 camelCase 만 허용한다. 그러면
                    // 화살표 함수 컴포넌트(`const HomePage = () => ...`)와 Context
                    // (`const AuthContext = createContext(...)`)가 전부 error 가 된다 —
                    // 하네스 자신의 참조 구현(ProtectedRoute.tsx)도 여기에 걸린다.
                    selector: 'variable',
                    format: ['camelCase', 'PascalCase'],
                    leadingUnderscore: 'allow',
                },
                {
                    selector: 'variable',
                    modifiers: ['const'],
                    format: ['UPPER_CASE', 'camelCase', 'PascalCase'],
                    filter: { regex: '^[_A-Z0-9]+$', match: true },
                },
                { selector: 'function', format: ['PascalCase', 'camelCase'] },
                { selector: 'class', format: ['PascalCase'] },
                {
                    selector: 'interface',
                    format: ['PascalCase'],
                    custom: { regex: '^I[A-Z]', match: true },
                },
                {
                    selector: 'typeAlias',
                    format: ['PascalCase'],
                    custom: { regex: '^T[A-Z]', match: true },
                },
                {
                    selector: 'typeParameter',
                    format: ['PascalCase'],
                    prefix: ['T'],
                },
            ],

            // ── any 금지 (00-core) ──────────────────────────────────────
            '@typescript-eslint/no-explicit-any': 'error',

            // ── 공개 API 경계 (10-architecture) ─────────────────────────
            'no-restricted-imports': [
                'error',
                {
                    patterns: [
                        {
                            group: ['@repo/*/src/*', '@repo/*/dist/*'],
                            message:
                                '워크스페이스 패키지는 exports 공개 API로만 import하세요 (10-architecture).',
                        },
                        {
                            group: ['**/components/*/*/*'],
                            message:
                                '기능 폴더는 index.ts 공개 API로만 import하세요 (10-architecture).',
                        },
                    ],
                },
            ],

            // ── import 정렬 ─────────────────────────────────────────────
            'import/order': [
                'error',
                {
                    groups: [
                        ['builtin', 'external'],
                        ['internal', 'parent', 'sibling', 'index'],
                    ],
                    'newlines-between': 'always',
                    alphabetize: { order: 'asc', caseInsensitive: true },
                },
            ],
        },
    },
    {
        // 스토리 export(Default, Interaction 등)는 관례상 PascalCase — 명명 규칙 예외
        files: ['**/*.stories.{ts,tsx}'],
        rules: {
            '@typescript-eslint/naming-convention': 'off',
        },
    },
    {
        // 참고용 템플릿·하네스 인프라는 린트 대상이 아니다
        ignores: ['.harness/**', '**/_story-template.tsx'],
    },
]
