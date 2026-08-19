/**
 * 디자인 토큰 강제 — 색상 원시값(#hex, rgb(), 색상 키워드)을 error 처리한다.
 * 에이전트가 규칙 문서를 무시해도 여기서 걸린다.
 *
 * 색상만 켠다. 간격·타이포까지 한 번에 강제하면 토큰이 불완전한 상태에서
 * 에이전트가 존재하지 않는 토큰 이름을 발명한다 — hex보다 나쁜 결과.
 * apps/web/design-system/tokens.css 의 해당 카테고리가 채워지면 아래 주석을 해제할 것.
 *
 * [하네스 적용 수정 G1] tokens.css 자체는 원시값 정본이므로 검사에서 제외한다.
 */
const TOKEN_PROPERTIES = [
    // 색상 — 항상 강제
    '/color$/',
    'fill',
    'stroke',
    'background',
    'border-color',
    'outline-color',

    // 간격 — tokens.css 의 --space-* 가 실사용 값으로 채워지면 해제
    // 'gap', 'padding', 'margin',

    // 타이포 — --font-* 가 채워지면 해제
    // 'font-size', 'font-weight',
]

const OPTIONS = {
    ignoreValues: [
        'currentColor',
        'transparent',
        'inherit',
        'initial',
        'unset',
        'none',
        '/^var\\(--/',
    ],
    message:
        '원시값 대신 디자인 토큰(var(--...))을 쓰세요. 토큰이 없으면 apps/web/design-system/tokens.css 에 먼저 추가하세요.',
}

/**
 * strict-value 플러그인은 함수 값(ignoreFunctions 기본 true)을 건너뛴다.
 * 그래서 `#hex` 는 잡아도 `rgb()` · `hsl()` 은 통과한다 — 색상 속성에 한해 따로 막는다.
 * background-image 의 그라디언트는 대상이 아니므로 var() 조합은 그대로 쓸 수 있다.
 */
const COLOR_FUNCTION_PROPERTIES =
    '/^(color|fill|stroke|background|background-color|border(-(top|right|bottom|left))?-color|outline-color)$/'

const rules = (severity) => ({
    'scale-unlimited/declaration-strict-value': [
        TOKEN_PROPERTIES,
        severity ? { ...OPTIONS, severity } : OPTIONS,
    ],
    'declaration-property-value-disallowed-list': [
        { [COLOR_FUNCTION_PROPERTIES]: ['/rgba?\\(/', '/hsla?\\(/'] },
        { message: OPTIONS.message, ...(severity ? { severity } : {}) },
    ],
})

export default {
    plugins: ['stylelint-declaration-strict-value'],
    // tokens.css 는 원시값의 정본이다 — 여기까지 강제하면 토큰을 정의할 곳이 없어진다.
    ignoreFiles: ['**/design-system/tokens.css'],
    rules: rules(),
}
