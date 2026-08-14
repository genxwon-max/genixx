/**
 * 출제 발주서 Ver.4.1 — 문항 카드 명세.
 *
 * 출처: 「GeniusX 지필 진단 문항 출제 발주서 · 출제자용 실무 지침」 Ver.4.1 정본
 *       (주)제닉스 GeniusX 출제본부 · 2026.07.07
 *
 * 발주서가 종이로만 돌면 출제자마다 다른 칸을 채운다. 실제 3중 검토에서 단계 이탈과
 * 태그 분쟁이 반복됐다는 것이 발주서 §1.2가 만들어진 이유다. 그래서 §1~§3의 규칙을
 * 화면이 강제할 수 있는 형태(선택지·자동 매핑·차단 조건)로 여기에 옮겼다.
 *
 * 여기 있는 값은 발주서를 옮긴 것이지 우리가 정한 것이 아니다. 발주서가 개정되면
 * 이 파일을 먼저 고치고 화면은 따라오게 한다.
 */

/* ───────────────────────── 인지단계 S1~S4 (§1) ───────────────────────── */

export type Level = "S1" | "S2" | "S3" | "S4";

export const LEVELS: Level[] = ["S1", "S2", "S3", "S4"];

export type LevelSpec = {
  id: Level;
  /** 지각·변별 등 */
  name: string;
  /** 인지 동사 */
  verb: string;
  /** 정보처리 위상 한 줄 — 문항 카드 ②의 「단계 정의 1줄」 */
  define: string;
  /** 형식 (§1 고정 매핑) */
  format: string;
  /** 배점 */
  points: number;
  /** 채점 방식 */
  scoring: string;
  /** 난이도 b 모수 앵커 */
  b: number;
  /** 출제 시 결정적 기준 */
  rule: string;
  /** 허용 조작 */
  allow: string;
  /** 금지 조작 — 하나라도 있으면 이 단계가 아니다 */
  deny: string;
  /** 리트머스 1문 (§1.2) */
  litmus: string;
};

export const levelSpecs: Record<Level, LevelSpec> = {
  S1: {
    id: "S1",
    name: "지각 · 변별",
    verb: "식별 · 구별",
    define: "입력 처리 — 표면 대조만",
    format: "선택형",
    points: 1,
    scoring: "정오",
    b: -1.5,
    rule: "계산·추론 없이 ‘보고 고르기’. 연산이 필요하면 단계 오류",
    allow: "재인, 같음·다름 대조, 짝맞추기, 상태 확인",
    deny: "계산, 원리 적용, 옳고 그름의 판단, 이유 확인, 2단계 이상의 조작 연쇄",
    litmus:
      "발문에서 ‘왜·어떻게·옳은가’를 묻지 않고, 오답이 ‘보이는 특징’만으로 배제되는가? — 아니면 S2 이상",
  },
  S2: {
    id: "S2",
    name: "이해 · 해석",
    verb: "이해 · 연결",
    define: "표상 형성 — 원리·관계로 고르기",
    format: "선 연결형 · 선택형",
    points: 1,
    scoring: "정오",
    b: -0.5,
    rule: "답이 아니라 ‘왜 · 관계(원리)’를 물음. 오개념 오답지가 핵심",
    allow: "개념-예 연결, 인과·관계 파악, 원리에 비춘 진위 판별, 까닭이 결합된 선택",
    deny: "값·문장·절차의 직접 산출(써넣기), 자기 언어의 서술",
    litmus:
      "오답지를 ‘흔한 오개념’으로 만들 수 있는가? — 만들 수 없다면 S1. S2의 변별력은 오개념 오답에서 나온다",
  },
  S3: {
    id: "S3",
    name: "생성 · 적용",
    verb: "적용 · 산출",
    define: "출력 처리 — 배운 절차의 실행",
    format: "단답형",
    points: 2,
    scoring: "부분점수",
    b: 0.5,
    rule: "학생이 직접 절차를 수행. 과정을 쓰게 하여 부분점수",
    allow: "연산 수행, 배운 규칙을 새 소재에 적용, 표 완성, 조건에 맞는 예 1개 산출",
    deny: "방법 자체의 고안, 주장의 타당성 판단, 새로운 상황으로의 전이 예측",
    litmus:
      "모범답안이 ‘배운 절차를 정확히 실행하면 누구나 같은 결과’에 도달하는가? — 학생마다 다른 구성이면 S4",
  },
  S4: {
    id: "S4",
    name: "창의 · 조절",
    verb: "비판 · 창의 · 예측",
    define: "고차 처리 — 방법·주장의 구성 (정답형)",
    format: "서술형",
    points: 3,
    scoring: "루브릭",
    b: 1.5,
    rule: "정답을 ‘생성’하게 함. 재능(Tag B) 신호가 나오는 지점",
    allow: "일반화·정당화, 반례 구성, 역추론, 조건 변화 시 결과 예측, 조건 만족 설계",
    deny: "정답이 없는 가치·태도 판단(→ SJT 소관), 단순 절차 재실행(→ S3)",
    litmus:
      "채점 기준이 ‘무엇을 썼는가’가 아니라 ‘결론과 근거가 성립하는가’를 보는가? — 아니면 S3",
  },
};

/** 문항 카드 ⑤의 「형식 · 배점 · b모수」 한 줄 */
export function formatLine(level: Level) {
  const s = levelSpecs[level];
  return `${s.format} │ 배점 ${s.points}점 │ 채점 ${s.scoring} │ 난이도 b≈${s.b > 0 ? "+" : ""}${s.b}`;
}

/**
 * 3문 판별 절차 (§1.2) — 동사 해석이 아니라 판별 절차로 단계를 정한다.
 *
 * 화면에서 이 셋을 순서대로 물으면 단계가 결정된다. 출제자가 감으로 고르지 않게
 * 하려고 폼에 넣는다.
 */
export const decisionTree = [
  {
    q: "Q1",
    ask: "학생이 답을 만들어 내는가(써넣기·그리기·서술), 아니면 주어진 것에서 고르거나 연결하는가?",
    options: [
      { label: "고름 · 연결", next: "Q2" },
      { label: "만들어 냄", next: "Q3" },
    ],
  },
  {
    q: "Q2",
    ask: "정답을 고르는 데 개념·원리·관계의 이해가 필요한가, 표면 특징(모양·상태·위치·짝)의 대조만으로 충분한가?",
    options: [
      { label: "표면 대조만", next: "S1" as const },
      { label: "원리 · 관계 필요", next: "S2" as const },
    ],
  },
  {
    q: "Q3",
    ask: "산출물이 배운 절차·규칙을 실행한 결과인가, 방법·주장·예측·설계 자체를 학생이 구성해야 하는가?",
    options: [
      { label: "배운 절차 실행", next: "S3" as const },
      { label: "방법 · 주장 구성", next: "S4" as const },
    ],
  },
];

/**
 * 결정적 조작 원칙 — 여러 조작이 섞이면 정답 결정에 필수적인 최고 수준으로 판정한다.
 * 단 상위 조작 없이 우회 가능하면 그 조작은 인정하지 않는다.
 */
export const decisiveRule =
  "한 문항에 여러 조작이 섞이면, 정답 결정에 필수적인 최고 수준의 조작으로 단계를 판정합니다. 다만 상위 조작 없이 우회하여 정답이 가능하면 그 조작은 인정하지 않습니다(예: 추론 없이 소거만으로 풀리는 선다형은 추론 문항이 아님).";

/* ───────────────────────── 재능 · 하위요소 (§2) ───────────────────────── */

export type TalentId = "LANG" | "MATH" | "SPAT" | "NATU" | "INTRA";

export type Subskill = {
  /** LANG-01 같은 코드 */
  code: string;
  name: string;
  define: string;
  /** S1~S4 각 단계에서 어떤 수행으로 나타나는지 (§2.1~2.5 직교 격자) */
  grid: Record<Level, string>;
};

export type Talent = {
  id: TalentId;
  /** 언어-기호 */
  name: string;
  en: string;
  /** 본검사에서 출제 가능한 단계 */
  scope: Level[];
  /** 범위를 좁힌 이유 — 화면에 그대로 적는다 */
  scopeNote?: string;
  subskills: Subskill[];
};

export const talents: Talent[] = [
  {
    id: "LANG",
    name: "언어-기호",
    en: "linguistic",
    scope: ["S1", "S2", "S3", "S4"],
    subskills: [
      {
        code: "LANG-01",
        name: "어휘 · 의미",
        define: "낱말의 소리·형태·의미와 낱말 간 관계(유의·반의·상하)를 처리",
        grid: {
          S1: "낱말 관계 유형 식별",
          S2: "관계의 원리(반의·상하) 이해",
          S3: "관계 낱말을 직접 생성",
          S4: "문맥에 따른 의미 변화 판단",
        },
      },
      {
        code: "LANG-02",
        name: "구문 · 구조",
        define: "문장·문법 구조를 이해하고 어순·호응·문장 성분의 관계를 처리",
        grid: {
          S1: "어순 · 호응 오류 식별",
          S2: "문장 성분의 관계 이해",
          S3: "조건에 맞는 문장 구성",
          S4: "문장 구조를 변형 · 재구성",
        },
      },
      {
        code: "LANG-03",
        name: "담화 · 생성",
        define: "글 수준의 의미를 통합·추론하고 목적에 맞는 언어 표현을 생성",
        grid: {
          S1: "글의 명시 정보 확인",
          S2: "숨은 의미 · 생략 추론",
          S3: "목적에 맞는 짧은 글 생성",
          S4: "주장에 대한 비평 · 정당화",
        },
      },
    ],
  },
  {
    id: "MATH",
    name: "수리-논리",
    en: "math-logical",
    scope: ["S1", "S2", "S3", "S4"],
    subskills: [
      {
        code: "MATH-01",
        name: "수 · 연산",
        define: "수량을 표상·변별하고 연산 절차를 정확히 수행",
        grid: {
          S1: "수량 크기 변별",
          S2: "자릿값 · 연산 원리 이해",
          S3: "연산 절차 수행 · 산출",
          S4: "연산 방법의 일반화",
        },
      },
      {
        code: "MATH-02",
        name: "관계 · 규칙",
        define: "수·양 사이의 관계(비·비례·패턴)를 파악하고 규칙을 발견·적용",
        grid: {
          S1: "패턴 이어지는 항 식별",
          S2: "규칙의 구조 이해",
          S3: "규칙을 새 상황에 적용",
          S4: "규칙의 성립 조건 판단",
        },
      },
      {
        code: "MATH-03",
        name: "논리 · 증명",
        define: "주장의 참·거짓을 논리적으로 정당화하고 일반화·모델링",
        grid: {
          S1: "참 · 거짓 명제 식별",
          S2: "근거-주장 연결 이해",
          S3: "반례 · 예시 생성",
          S4: "주장의 증명 · 정당화",
        },
      },
    ],
  },
  {
    id: "SPAT",
    name: "공간-시각",
    en: "spatial",
    scope: ["S1", "S2", "S3", "S4"],
    subskills: [
      {
        code: "SPAT-01",
        name: "형태 지각",
        define: "형태·부분-전체·시각 세부를 변별하고 시각 정보를 기억",
        grid: {
          S1: "같은 도형 찾기",
          S2: "부분-전체 관계 이해",
          S3: "조각으로 형태 완성",
          S4: "형태의 시각적 재설계",
        },
      },
      {
        code: "SPAT-02",
        name: "공간 관계",
        define: "위치·방향·좌표 등 대상 간 공간적 관계를 파악",
        grid: {
          S1: "위치 · 방향 식별",
          S2: "좌표 · 지도 관계 이해",
          S3: "경로 · 배치 산출",
          S4: "공간 배치의 최적화 판단",
        },
      },
      {
        code: "SPAT-03",
        name: "심적 조작",
        define: "머릿속에서 회전·전개·조립 등 표상을 변형·구성",
        grid: {
          S1: "회전된 도형 식별",
          S2: "전개도-입체 관계 이해",
          S3: "회전 · 조립 결과 산출",
          S4: "복합 변형의 예측 · 설계",
        },
      },
    ],
  },
  {
    id: "NATU",
    name: "자연-생태",
    en: "naturalistic",
    scope: ["S1", "S2", "S3", "S4"],
    scopeNote:
      "탐색적 측정 영역입니다(하위요소 표준 미확립·독자개발). S4는 정답형만 출제하며 점수 비교 대상이 아닙니다.",
    subskills: [
      {
        code: "NATU-01",
        name: "관찰 · 분류",
        define: "자연 대상·현상의 패턴을 관찰·변별하고 기준에 따라 범주화",
        grid: {
          S1: "자연 패턴 · 상태 식별",
          S2: "분류 기준 · 범주 이해",
          S3: "기준 세워 직접 분류",
          S4: "분류 체계의 타당성 판단",
        },
      },
      {
        code: "NATU-02",
        name: "인과 · 탐구",
        define: "현상의 원인-결과를 추론하고 변인 통제 등 검증 절차를 설계",
        grid: {
          S1: "변화 현상 관찰 · 식별",
          S2: "원인-결과 관계 이해",
          S3: "변인 통제 실험 설계",
          S4: "탐구 설계의 오류 진단",
        },
      },
      {
        code: "NATU-03",
        name: "시스템 추론",
        define: "보이지 않는 구조·조건 변화를 역추론하고 결과를 예측",
        grid: {
          S1: "시스템 요소 식별",
          S2: "요소 간 상호작용 이해",
          S3: "조건 변화 결과 산출",
          S4: "보이지 않는 구조 역추론 · 예측",
        },
      },
    ],
  },
  {
    id: "INTRA",
    name: "자기-성찰",
    en: "intrapersonal",
    scope: ["S1", "S2", "S3"],
    scopeNote:
      "본검사는 S1~S3만 출제합니다. 정답 없는 정의적 S4(가치·태도 판단)는 SJT 모듈 소관이라 지필 출제 금지입니다.",
    subskills: [
      {
        code: "INTRA-01",
        name: "자기 인식",
        define: "자기의 상태·감정·강약점을 알아차림",
        grid: {
          S1: "자기 상태 알아차림",
          S2: "강약점의 원인 이해",
          S3: "상태에 맞는 선택 산출",
          S4: "(SJT 소관)",
        },
      },
      {
        code: "INTRA-02",
        name: "자기 점검",
        define: "자기 수행 과정을 모니터링하고 오류·막힘을 탐지",
        grid: {
          S1: "수행 중 이상 감지",
          S2: "오류 지점의 원인 이해",
          S3: "자기 오류를 찾아 명시",
          S4: "(SJT 소관)",
        },
      },
      {
        code: "INTRA-03",
        name: "자기 조정",
        define: "점검 결과에 따라 자기 전략·절차를 수정·교정",
        grid: {
          S1: "전략 차이 인지",
          S2: "전략-상황 적합성 이해",
          S3: "자기 절차를 수정 · 교정",
          S4: "(SJT 소관)",
        },
      },
    ],
  },
];

export const talentOf = (id: TalentId) => talents.find((t) => t.id === id)!;

export const subskillsOf = (id: TalentId) => talentOf(id).subskills;

export function subskillOf(code: string) {
  for (const t of talents) {
    const s = t.subskills.find((x) => x.code === code);
    if (s) return s;
  }
  return null;
}

/** 그 재능이 그 단계를 출제할 수 있는가 (§2 출제 범위 주의) */
export function levelAllowed(talent: TalentId, level: Level) {
  return talentOf(talent).scope.includes(level);
}

/** Tag B 3원 좌표 — 재능 · 하위요소코드 · S단계 (§2.3 개정 표기법) */
export function tagBCoord(talent: TalentId, subskill: string, level: Level) {
  return `${talentOf(talent).name} · ${subskill} · ${level}`;
}

/* ───────────────────────── 경계 판별표 (§6 Ⅱ) ───────────────────────── */

export const boundaryRules = [
  {
    pair: "자기 ↔ 자연",
    ask: "조절·통제의 대상이 무엇인가?",
    rule: "자기 내부 상태·자기 절차 → 자기-성찰 / 외부 실험 변인·조건 → 자연-생태",
    example: "‘공정한 실험 조건 설계’ = 자연-생태",
  },
  {
    pair: "자연 ↔ 수리",
    ask: "처리 대상이 자연 시스템인가, 추상 수 관계인가?",
    rule: "관찰·분류·인과·탐구 → 자연-생태 / 소재만 자연이고 계산·비율이 핵심 → 수리-논리",
    example: "‘식물 키 평균 구하기’ = 수리-논리",
  },
  {
    pair: "수리 ↔ 공간",
    ask: "조작 대상이 수·논리인가, 형태·위치인가?",
    rule: "수량·규칙·증명 → 수리 / 회전·조립·방향 → 공간",
    example: "‘도형 넓이 계산’ = 수리, ‘조각 돌려 맞추기’ = 공간",
  },
  {
    pair: "언어 ↔ 사회",
    ask: "메시지의 형식·의미인가, 화자의 마음·관계인가?",
    rule: "어휘·구문·담화 구조 → 언어 / 의도·감정·관점 추론 → 사회(본검사 범위 밖)",
    example: "‘반어법 문장 구조 파악’ = 언어",
  },
  {
    pair: "사회 ↔ 자기",
    ask: "이해·조절의 대상이 타인인가, 자신인가?",
    rule: "타인 감정·관계 → 사회 / 자기 상태·절차 → 자기",
    example: "‘친구 기분 읽기’ = 사회, ‘내 실수 찾기’ = 자기",
  },
] as const;

/* ───────────────────────── 학년군 · 성취기준 (§7.2) ───────────────────────── */

export type GradeBand = "3-4" | "5-6";

export const gradeBands: { id: GradeBand; label: string; prefix: string; note: string }[] = [
  {
    id: "3-4",
    label: "초등 3·4학년군",
    prefix: "4",
    note: "성취기준 코드가 [4XX]로 시작합니다. 5~6학년군 내용(약분·통분·이분모 비교 등)을 요구하면 안 됩니다.",
  },
  {
    id: "5-6",
    label: "초등 5·6학년군",
    prefix: "6",
    note: "성취기준 코드가 [6XX]로 시작합니다. S4(생성·증명)를 확장 출제합니다.",
  },
];

export const gradeBandOf = (id: GradeBand) => gradeBands.find((g) => g.id === id)!;

/**
 * 성취기준 코드 형식 — [4국04-02] · [4수01-10] · [6과03-01]
 *
 * 발주서 §7.2: 코드 없는 문항은 접수 반려. 학년군 접두 숫자가 맞아야 한다.
 */
const CODE_RE = /^\[?([46])([가-힣]{1,3})(\d{2})-(\d{2})\]?$/;

export function checkStandardCode(code: string, band: GradeBand) {
  const t = code.trim();
  if (!t) return { ok: false, why: "성취기준 코드가 없습니다. 코드 없는 문항은 접수 반려됩니다." };
  const m = CODE_RE.exec(t);
  if (!m) return { ok: false, why: "형식이 맞지 않습니다. [4국04-02]처럼 적어 주세요." };
  if (m[1] !== gradeBandOf(band).prefix) {
    return {
      ok: false,
      why: `${gradeBandOf(band).label}은 [${gradeBandOf(band).prefix}XX] 코드를 씁니다. 학년군을 벗어난 코드입니다.`,
    };
  }
  return { ok: true, why: "" };
}

/** 화면에 그대로 쓰는 예시 코드 */
export const codeSamples: Record<GradeBand, string[]> = {
  "3-4": ["[4국04-02]", "[4수01-10]", "[4과10-01]"],
  "5-6": ["[6국02-03]", "[6수01-07]", "[6과03-01]"],
};

/* ───────────────────────── 제출 전 체크리스트 (§9) ───────────────────────── */

export type CheckItem = { id: string; text: string; auto?: boolean };

export const submitChecklist: CheckItem[] = [
  { id: "code", text: "성취기준(Tag A) 코드가 명시되고 학년군 범위 내인가?", auto: true },
  { id: "tagb", text: "재능(Tag B)에 재능·하위요소·S단계가 좌표로 명시되었는가?", auto: true },
  { id: "verb", text: "인지 동사가 단계 정의와 일치하는가? (S1 연산 없음, S3 ‘왜’ 없음)" },
  { id: "s4", text: "S4가 정답형 창의인가? 정답 없는 가치판단이 섞이지 않았는가?" },
  { id: "distractor", text: "모든 오답지가 특정 오개념을 의도하는가?" },
  { id: "rubric", text: "S3·S4 채점 기준에 ‘인정 예 / 불인정 예’가 포함되었는가?" },
  { id: "variant", text: "AI 자동채점 대비, 정답 표기 변이가 채점 키에 등록되었는가?" },
  { id: "natu", text: "자연-생태 문항이 ‘탐색적 측정’으로 위상 한정되었는가?" },
  { id: "a11y", text: "삽화·그림이 색맹·저시력 학생도 풀 수 있게 설계되었는가?" },
  { id: "anchor", text: "앵커(30%) 표시 + 문항 명세표(블루프린트) 배정과 일치하는가?" },
];

/* ───────────────────────── 진행 절차 (§8) ───────────────────────── */

export const workflowSteps = [
  { no: 1, title: "출제 발주", out: "발주서 + 문항 명세표(블루프린트) 배부", who: "출제본부 → 출제자" },
  { no: 2, title: "출제 계획 수립", out: "배정표 확인·질의, 일정·분담 확정", who: "출제자 + 출제본부" },
  { no: 3, title: "출제", out: "문항 카드 작성 · 초안 제출", who: "출제자" },
  { no: 4, title: "검토", out: "측정 · 교육과정 · 재능태그 3중 검토", who: "검토위원" },
  { no: 5, title: "검토의견 반영", out: "검토의견에 따라 수정", who: "출제자" },
  { no: 6, title: "출제 완성", out: "최종 승인 · 원문항 확정", who: "출제본부" },
  { no: 7, title: "편집", out: "형식 통일 · CBT 입력 · 삽화 사양 확정", who: "편집팀" },
  { no: 8, title: "예비검사·문항분석", out: "소표본 파일럿으로 b·변별도 산출", who: "출제본부" },
  { no: 9, title: "동형 문항 출제", out: "원문항과 난이도·구인이 같은 짝", who: "출제자" },
  { no: 10, title: "검토", out: "동형 문항 3중 검토", who: "검토위원" },
  { no: 11, title: "출제 완성", out: "동형 문항 최종 승인", who: "출제본부" },
  { no: 12, title: "동형 문항 완성", out: "원문항 + 동형 세트 확정 · 문항 풀 등록", who: "출제본부" },
];

/** 앵커 비율 — 전체 문항의 30%를 장기 재사용·미공개로 둔다 (§7.1) */
export const ANCHOR_RATIO = 0.3;

/* ───────────────────────── 문항 ID (§3 ①) ───────────────────────── */

const SUBJECT_LETTER: Record<string, string> = { 국어: "K", 수학: "M", 과학: "S" };

/**
 * 학년 + 교과 + 단원 - 단계 - 일련번호 (예: 4K02-S2-001)
 *
 * 학년 자리는 학년군 접두(4 또는 6)를 쓴다. 단원은 두 자리 번호다.
 */
export function makeItemCode(
  band: GradeBand,
  subject: string,
  unitNo: string,
  level: Level,
  serial: number,
) {
  const g = gradeBandOf(band).prefix;
  const s = SUBJECT_LETTER[subject] ?? "X";
  const u = (unitNo || "").replace(/\D/g, "").padStart(2, "0").slice(-2);
  return `${g}${s}${u}-${level}-${String(serial).padStart(3, "0")}`;
}
