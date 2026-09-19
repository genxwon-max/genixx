/**
 * 진단 보고서 — 무료 요약본(2면)과 정밀본(10면)의 내용.
 *
 * 의뢰인이 2026-08 보여 준 시안 두 장(「진단레포트_무료요약_2p」·「진단레포트_정밀_10p」)을
 * 그대로 옮긴 예시다. 보고서의 얼개는 아직 정해지지 않았다 — 의뢰인이 「이런 느낌으로
 * 나올 것 같다」며 예시로 쓰라고 했다. 확정본이 오면 이 파일의 값부터 고친다.
 *
 * ── 표현은 섞어 쓴다 ──
 *   시안은 「상위 9%」 같은 백분위와 「영재 전문가」를 쓴다. 저장소의 다른 화면은 윤리 헌장
 *   제7조를 들어 서열 표현과 「영재」를 피한다. 정해진 것이 없어 둘을 섞었다 — 백분위와
 *   또래 대비 숫자는 시안대로 두고, 보고서 이름은 평가 이름(TalentMe)을 달아 「재능 진단
 *   보고서」로, 전문가는 「전문가 40인」으로 적는다. 「영재」는 기관 이름에만 남긴다.
 *
 * ── 글 속 표시 ──
 *   **굵게** · [[강조색]] · {아이} = 아이를 부르는 이름(서윤이, 민지). 조사는 {아이} 뒤에
 *   「는/가/의」처럼 모음 뒤 꼴로 붙인다 — callName이 받침 있는 이름에 「이」를 붙여 둔다.
 *
 * ── 실제 결과에 쓸 때 ──
 *   buildLiveReport가 이 예시를 바탕으로 과목 점수·백분위·유형·이름·날짜만 응시 기록에서
 *   다시 계산해 덮는다. 영역별 세부 점수와 풀이 시간, 서술 문구는 아직 잴 데이터가 없어
 *   예시 문안 그대로다 — 보는 화면 위쪽 띠(인쇄되지 않는 곳)에 그 사실을 적는다.
 */

import { assessment, type SubjectId } from "./exam";

export type Edition = "summary" | "full";

export const editions: Record<Edition, { label: string; price: string }> = {
  summary: { label: "요약본", price: "무료" },
  full: { label: "정밀본", price: "39,000원" },
};

export const isEdition = (v: string): v is Edition => v === "summary" || v === "full";

export type Scored = { label: string; score: number };

export type SubjectReport = {
  id: SubjectId;
  name: string;
  power: string;
  score: number;
  pct: number;
  items: number;
  minutes: number;
  /** 요약본 2면 — 잘한 영역 · 더 살펴볼 영역 · AI 한 줄 */
  best: { label: string; pct: number };
  weak: { label: string; pct: number };
  ai: string;
  areas: Scored[];
  /** 문항 유형별 정답률 (%) */
  types: Scored[];
  review: {
    head: string;
    title: string;
    desc: string;
    answer: string;
    ai: string;
    expert: string;
  };
  misses: string[];
  plan: { when: string; what: string }[];
  quote: string;
  perItem: string;
  vsPeer: string;
  parent: string;
  kid: string;
};

export type DiagReport = {
  student: { name: string; call: string; grade: string; gradeShort: string };
  date: string;
  no: string;
  round: string;
  items: number;
  minutes: number;
  norm: number;
  reviewers: number;
  type: {
    lead?: string;
    name: string;
    kidName: string;
    desc: string;
    kidDesc: string;
    share: number;
  };
  pct: number;
  abilities: (Scored & { pct: number })[];
  subjects: SubjectReport[];
  reliability: { agreement: string; consistency: string; mismatch: string };

  summary: {
    strengths: { t: string; d: string }[];
    parent: string;
    kid: string;
    parent2: string;
    kid2: string;
    today: string[];
  };
  overview: {
    abilityNote: string;
    strengths: string[];
    growth: string[];
    thrive: string;
    stuck: string;
    parent: string;
    kid: string;
  };
  fusion: {
    creativity: Scored[];
    creativityNote: string;
    layers: Scored[];
    layersNote: string;
    matrix: { row: string; cells: number[] }[];
    matrixNote: string;
    habits: string[];
    path: { t: string; d: string; now?: boolean }[];
    parent: string;
    kid: string;
    use: { t: string; d: string }[];
  };
  style: {
    time: Scored[];
    timeNote: string;
    focus: Scored[];
    focusNote: string;
    challenge: number;
    challengeNote: string;
    afterMiss: string;
    fixed: string;
    fixedNote: string;
    plan: { t: string; d: string; rest?: boolean }[];
    planNote: string;
    parent: string;
    kid: string;
    closing: string;
  };
  kidPage: {
    title: string;
    desc: string;
    badges: { icon: "search" | "link" | "chat"; t: string; d: string }[];
    missions: { t: string; tag: string }[];
  };
  home: {
    three: { tag: string; t: string; d: string; goal: string }[];
    roadmap: { when: string; sub: string; cells: string[] }[];
    roadmapNote: string;
    path: string;
    dont: { say: string; why: string }[];
    better: string;
    success: string;
    successNote: string;
    review: string;
    reviewers: { role: string; who: string }[];
  };
};

/* ───────────────────────── 이름 ───────────────────────── */

/** 성을 뗀 이름에 받침이 있으면 「이」를 붙인다 — 서윤 → 서윤이, 민지 → 민지 */
export function callName(full: string) {
  const given = full.length >= 3 ? full.slice(1) : full;
  const last = given.charCodeAt(given.length - 1);
  const hangul = last >= 0xac00 && last <= 0xd7a3;
  return hangul && (last - 0xac00) % 28 !== 0 ? `${given}이` : given;
}

/** 시안의 점수와 백분위는 「상위 = 100 - 점수」로 맞물려 있다(94 → 6%, 79 → 21%). 표준화 표본이
    들어오기 전까지 같은 규칙으로 백분위를 낸다 */
export const pctOf = (score: number) => Math.min(99, Math.max(1, 100 - Math.round(score)));

/* ───────────────────────── 예시 — 이서윤 · 초등 3학년 ───────────────────────── */

export const sampleReport: DiagReport = {
  student: { name: "이서윤", call: "서윤이", grade: "초등 3학년", gradeShort: "3학년" },
  date: "2026년 8월 24일",
  no: "GX-2026-0824-1187",
  round: assessment.round,
  items: 78,
  minutes: 90,
  norm: 12480,
  reviewers: 5,
  type: {
    lead: "질문을 멈추지 않는",
    name: "탐험가형",
    kidName: "탐험가",
    desc: "궁금한 것을 끝까지 파고들고, 직접 확인해야 마음이 놓이는 아이입니다. 과학 탐구와 창의적 연결에서 특히 높은 힘을 보였습니다.",
    kidDesc: "궁금한 걸 그냥 넘기지 않고, 꼭 확인해봐야 마음이 놓이는 친구",
    share: 8.4,
  },
  pct: 9,
  abilities: [
    { label: "언어사고력", score: 88, pct: 12 },
    { label: "수리논리력", score: 82, pct: 18 },
    { label: "과학탐구력", score: 94, pct: 6 },
    { label: "창의융합력", score: 91, pct: 9 },
    { label: "문제해결력", score: 79, pct: 21 },
    { label: "자기주도력", score: 74, pct: 26 },
  ],
  reliability: { agreement: "0.91", consistency: "0.88", mismatch: "4.7%" },
  subjects: [
    {
      id: "korean",
      name: "국어",
      power: "읽고 이해하고 표현하는 힘",
      score: 84,
      pct: 16,
      items: 26,
      minutes: 28,
      best: { label: "추론하며 읽기", pct: 11 },
      weak: { label: "긴 글 요약하기", pct: 41 },
      ai: "글의 숨은 뜻을 잘 찾습니다. 다만 핵심만 골라 줄이는 훈련이 필요합니다.",
      areas: [
        { label: "추론하며 읽기", score: 89 },
        { label: "어휘력", score: 81 },
        { label: "비판적 읽기", score: 78 },
        { label: "글로 표현하기", score: 76 },
        { label: "요약하기", score: 59 },
      ],
      types: [
        { label: "사실확인", score: 92 },
        { label: "추론", score: 88 },
        { label: "어휘", score: 81 },
        { label: "서술형", score: 74 },
        { label: "요약", score: 58 },
      ],
      review: {
        head: "국어 17번",
        title: "이야기 속 인물의 마음이 바뀐 까닭을 쓰세요 (서술형)",
        desc: "글에 직접 드러나지 않은 인물의 감정 변화를 앞뒤 사건으로 추론해 서술하는 문항입니다.",
        answer:
          "동생이 자기 그림을 몰래 고쳐서 화가 났는데, 나중에 동생이 형을 도우려고 그런 걸 알았기 때문이에요. 왜냐하면 앞에서 동생이 형 그림을 계속 쳐다봤거든요.",
        ai: "근거 문장을 앞 단락에서 정확히 인용했습니다. 인과 연결어 사용 3회로 3학년 평균 1.4회의 2.1배입니다.",
        expert:
          "직접 언급되지 않은 단서를 스스로 찾아 연결했습니다. 3학년 수준을 넘어서는 추론입니다. 다만 문장이 길어지며 핵심이 뒤로 밀렸습니다.",
      },
      misses: [
        "오답 6문항 가운데 4문항이 요약·핵심 찾기 유형입니다.",
        "글이 길어질수록 정답률이 떨어집니다. 짧은 글 91% → 긴 글 68%.",
        "어휘 오답은 모두 한자어 계열이었습니다. 실마리, 짐작 등.",
      ],
      plan: [
        { when: "1주차", what: "읽은 책을 한 문장으로 말하기 (하루 3분)" },
        { when: "2~3주차", what: "문단마다 소제목 붙이기" },
        { when: "4주차", what: "긴 기사 하나를 세 문장으로 줄이기" },
      ],
      quote: "읽어내는 힘은 충분합니다. 줄이는 연습만 남았습니다.",
      perItem: "64초",
      vsPeer: "+34",
      parent:
        "추론과 근거 대기는 확실한 강점입니다. 반면 **요약하기가 59**로 유일하게 평균 근처입니다. 생각이 많아 줄이기 어려워하는 유형으로, '한 문장으로 말하기' 훈련이 직접적인 처방이 됩니다.",
      kid: "{아이}는 **숨은 이유를 찾아내는 힘**이 뛰어나요.\n대신 길게 쓰다 보면 중요한 말이 뒤로 밀려요.\n책을 읽고 **딱 한 문장으로 말하기**를 해봐요.",
    },
    {
      id: "math",
      name: "수학",
      power: "수와 규칙을 다루는 힘",
      score: 79,
      pct: 21,
      items: 26,
      minutes: 28,
      best: { label: "규칙성 찾기", pct: 14 },
      weak: { label: "자료와 가능성", pct: 38 },
      ai: "패턴 감각이 뛰어납니다. 표와 그래프를 읽는 경험을 늘려주세요.",
      areas: [
        { label: "규칙성 찾기", score: 86 },
        { label: "수와 연산", score: 82 },
        { label: "문제해결 전략", score: 77 },
        { label: "도형과 공간", score: 73 },
        { label: "자료와 가능성", score: 62 },
      ],
      types: [
        { label: "계산", score: 88 },
        { label: "규칙", score: 86 },
        { label: "도형", score: 73 },
        { label: "문장제", score: 71 },
        { label: "자료해석", score: 61 },
      ],
      review: {
        head: "수학 22번",
        title: "표를 보고 다음에 올 수를 구하고, 그렇게 생각한 까닭을 쓰세요",
        desc: "규칙을 찾아 다음 항을 예측하고, 발견한 규칙을 언어로 설명하는 통합형 문항입니다.",
        answer:
          "다음은 31이에요. 3, 6, 11, 18… 늘어나는 수가 3, 5, 7로 2씩 커져요. 그래서 다음은 9를 더해서 31.",
        ai: "정답입니다. 차의 차라는 계층적 규칙을 스스로 도출했습니다. 소요시간 71초로 정답자 평균 96초보다 빠릅니다.",
        expert:
          "규칙을 찾은 뒤 말로 설명하는 단계까지 완결했습니다. 반면 자료해석 문항에서는 표를 끝까지 읽지 않고 답한 흔적이 3회 있었습니다.",
      },
      misses: [
        "오답 7문항 가운데 5문항이 표·그래프 제시형입니다.",
        "다섯 문항 모두 소요시간이 평균보다 짧았습니다. 성급한 판단으로 보입니다.",
        "계산 자체의 오류는 26문항 중 한 건뿐이었습니다.",
      ],
      plan: [
        { when: "1주차", what: "표가 나오면 한 줄씩 짚으며 소리내어 읽기" },
        { when: "2~3주차", what: "실제 자료로 질문 세 개 만들기" },
        { when: "4주차", what: "막대와 꺾은선 그래프 직접 그려보기" },
      ],
      quote: "계산이 아니라 읽는 순서가 문제였습니다.",
      perItem: "58초",
      vsPeer: "+29",
      parent:
        "패턴 감각은 뚜렷한 강점이나 **자료와 가능성이 62**로 눈에 띄게 낮습니다. 오답 세 문항 모두 표를 끝까지 읽지 않아 생긴 실수로, 개념 미습득이 아닙니다. '표 읽고 질문 만들기' 활동으로 빠르게 개선될 수 있습니다.",
      kid: "**규칙 찾기**는 정말 잘해요. 게다가 빠르기까지 했어요.\n그런데 표를 끝까지 안 보고 답한 게 세 번 있었어요.\n표가 나오면 **손가락으로 한 줄씩** 짚어봐요.",
    },
    {
      id: "science",
      name: "과학",
      power: "관찰하고 탐구하는 힘",
      score: 94,
      pct: 6,
      items: 26,
      minutes: 28,
      best: { label: "관찰과 분류", pct: 4 },
      weak: { label: "과학적 의사소통", pct: 22 },
      ai: "관찰의 밀도가 또래보다 확연히 높습니다. 설명하는 훈련이 더해지면 좋겠습니다.",
      areas: [
        { label: "관찰과 분류", score: 96 },
        { label: "예상과 추리", score: 93 },
        { label: "실험 설계", score: 90 },
        { label: "자료 해석", score: 84 },
        { label: "과학적 의사소통", score: 78 },
      ],
      types: [
        { label: "관찰", score: 96 },
        { label: "분류", score: 94 },
        { label: "추리", score: 93 },
        { label: "설계", score: 90 },
        { label: "설명", score: 78 },
      ],
      review: {
        head: "과학 9번",
        title: "두 화분이 다르게 자란 까닭을 예상하고, 확인할 방법을 쓰세요",
        desc: "변인을 찾아내고 이를 확인할 검증 방법까지 스스로 설계하는 문항입니다.",
        answer:
          "햇빛 때문인 것 같아요. 확인하려면 똑같은 화분 두 개에 물을 똑같이 주고, 하나만 상자로 덮어서 일주일 보면 돼요. 물은 꼭 똑같이 줘야 해요.",
        ai: "만점입니다. 통제변인인 물의 양을 스스로 언급했습니다. 3학년 응답자 중 4.1%에서만 나타난 반응입니다.",
        expert:
          "누가 가르쳐주지 않아도 '다른 조건은 같게'라는 원리에 도달했습니다. 영재교육원 관찰추천 전형에서 높게 평가되는 반응 유형입니다.",
      },
      misses: [
        "오답 두 문항 모두 설명·전달 유형이었습니다. 아는데 표현이 짧습니다.",
        "그림이나 도표로 설명하라는 지시에 글로만 답했습니다.",
        "관찰과 추리 문항에서는 오답이 한 건도 없었습니다.",
      ],
      plan: [
        { when: "1주차", what: "알아낸 것을 가족에게 3분간 설명하기" },
        { when: "2~3주차", what: "설명할 때 그림 한 장을 반드시 곁들이기" },
        { when: "4주차", what: "탐구 주제 하나를 정해 짧은 발표문 만들기" },
      ],
      quote: "이미 탐구하는 사람처럼 생각합니다. 이제 전하는 일이 남았습니다.",
      perItem: "71초",
      vsPeer: "+44",
      parent:
        "세 과목 가운데 가장 강한 영역이며, 특히 실험 설계에서 통제변인을 자발적으로 언급한 점은 또래 4.1%에서만 나타납니다. 다만 **과학적 의사소통이 78**로 상대적으로 낮아, 아는 것을 남에게 전달하는 훈련이 남은 과제입니다.",
      kid: "과학은 정말 최고였어요.\n특히 **실험을 직접 만들어내는 힘**이 대단해요.\n이제 알아낸 걸 **다른 사람에게 설명해보기**에 도전해봐요.",
    },
  ],

  summary: {
    strengths: [
      {
        t: "끝까지 관찰하기",
        d: "실험 관찰 문항에서 놓치기 쉬운 조건까지 찾아냈습니다. 해당 유형 정답률 96%.",
      },
      {
        t: "서로 다른 것 잇기",
        d: "국어에서 쓴 방법을 과학 문제에 옮겨 쓰는 모습이 78문항 중 9회 반복됐습니다.",
      },
      {
        t: "이유 대며 말하기",
        d: "서술형에서 '왜냐하면'을 스스로 붙였습니다. 3학년 평균의 2.1배.",
      },
    ],
    parent:
      "과학 탐구력이 또래 상위 6% 수준으로 세 과목 가운데 가장 뚜렷한 강점입니다. 다만 **자기주도력이 74**로 여섯 항목 중 가장 낮아, 흥미가 없는 과제에서는 실제 능력보다 낮은 결과가 나올 수 있습니다. 잘하는 것을 밀어주는 동시에 스스로 계획을 세워보는 연습을 함께 권합니다.",
    kid: "{아이}는 **궁금한 걸 끝까지 알아내는 힘**이 아주 커요.\n그중에서도 과학에서 제일 반짝였어요.\n앞으로는 **내가 할 일을 스스로 정해보는 연습**을 같이 해봐요.",
    parent2:
      "세 과목 모두 상위권이지만 **과목 간 편차가 있습니다.** 과학 94, 국어 84, 수학 79 순이며 가장 낮은 영역은 '자료와 가능성'입니다. 이 편차가 능력 차이인지 경험 차이인지는 정밀본에서 확인하실 수 있습니다.",
    kid2: "세 과목 다 잘했어요. 그중에서도 **과학이 제일 반짝**였어요.\n표와 그래프를 읽는 문제는 조금 어려웠어요. 괜찮아요, 같이 연습하면 돼요.",
    today: [
      '"관찰을 정말 잘한대"처럼 구체적인 강점 한 가지를 먼저 전해주세요.',
      "표와 그래프는 실제 자료를 함께 보는 것만으로도 빠르게 올라옵니다.",
      "과목 간 점수를 나란히 두고 비교하면 흥미가 먼저 꺾입니다.",
    ],
  },

  overview: {
    abilityNote:
      "**자기주도력** (시키지 않아도 스스로 하는 힘)이 여섯 항목 중 가장 낮습니다. 능력이 부족해서가 아니라 관심 밖 과제에서 힘이 덜 나오는 유형입니다.",
    strengths: [
      "관찰의 밀도 — 조건과 변화를 놓치지 않습니다.",
      "교과 넘나들기 — 국어 전략을 과학에 적용합니다.",
      "근거 대기 — '왜냐하면'을 스스로 씁니다.",
    ],
    growth: [
      "자료 읽기 — 표와 그래프 해석이 상위 38%에 머뭅니다.",
      "요약하기 — 긴 글에서 핵심만 남기는 데 어려움이 있습니다.",
    ],
    thrive:
      "질문에 바로 답을 주기보다 **같이 찾아보는 시간**이 주어질 때, 직접 만들고 확인해볼 여지가 있을 때 힘이 납니다.",
    stuck:
      "정해진 형식과 분량을 지켜야 하는 과제, 흥미가 없는 반복 연습이 길게 이어질 때 수행이 떨어집니다.",
    parent:
      "강점 세 가지는 모두 **스스로 파고드는 힘**에서 나옵니다. 반면 낮게 나온 두 영역은 '정해진 형식을 따르는 과제'라는 공통점이 있습니다. 즉 능력의 문제라기보다 **흥미 유무에 따른 수행 편차**로 해석됩니다. 관심 주제를 통로로 삼아 형식 과제를 연결해주는 방식이 효과적입니다.",
    kid: "{아이}는 **궁금한 걸 파고드는 힘**이 최고예요.\n대신 표나 그래프를 읽는 건 아직 낯설어요.\n좋아하는 주제로 표를 만들어보면 훨씬 쉬워질 거예요.",
  },

  fusion: {
    creativity: [
      { label: "유창성 · 많이 떠올리기", score: 84 },
      { label: "융통성 · 다르게 보기", score: 91 },
      { label: "독창성 · 남과 다르게", score: 88 },
    ],
    creativityNote: "아이디어를 많이 내는 것보다 **관점을 바꾸는 힘**이 더 큽니다.",
    layers: [
      { label: "논리적 사고", score: 85 },
      { label: "비판적 사고", score: 80 },
      { label: "메타인지", score: 71 },
    ],
    layersNote:
      "**메타인지** (내가 뭘 아는지 아는 힘)가 상대적으로 낮습니다. 3학년에서는 흔한 결과입니다.",
    matrix: [
      { row: "관찰 · 수집", cells: [82, 76, 96] },
      { row: "연결 · 전이", cells: [88, 84, 93] },
      { row: "근거 제시", cells: [89, 80, 91] },
      { row: "표현 · 전달", cells: [76, 74, 78] },
    ],
    matrixNote:
      "진할수록 높은 점수입니다. **연결·전이가 세 과목 모두 고르게 높은 것**이 이 아이의 가장 뚜렷한 특징입니다.",
    habits: [
      "**하나.** 답을 쓰기 전에 조건부터 다시 읽습니다. 14회 관찰.",
      "**둘.** 한 과목에서 쓴 방법을 다른 과목에 옮겨 씁니다. 9회.",
      "**셋.** 틀린 뒤 다음 문항의 속도를 늦춥니다. 7회 중 6회.",
      "**넷.** 자신 없는 문항도 비워두지 않고 일단 씁니다. 무응답 0건.",
    ],
    path: [
      {
        t: "지금 · 초등 3~4학년",
        d: "한 과목에서 배운 방법을 다른 과목에 옮겨 쓰는 단계입니다. 현재 여기에 있습니다.",
        now: true,
      },
      {
        t: "다음 · 초등 5~6학년",
        d: "스스로 탐구 주제를 정하고 여러 과목의 방법을 조합해 해결하는 단계로 이어집니다.",
      },
      {
        t: "그 다음 · 중등",
        d: "융합 탐구와 프로젝트형 과제에서 강점이 드러납니다. 지금 서두를 필요는 없습니다.",
      },
    ],
    parent:
      "이 아이의 핵심 경쟁력은 개별 과목 점수가 아니라 **연결하는 힘**입니다. 세 과목 모두에서 고르게 높게 나타났고, 이는 단기간의 학습으로 만들어지기 어려운 특성입니다. 반면 **메타인지 71**은 지금부터 길러줄 수 있는 영역입니다. 문제를 푼 뒤 '이건 확실해, 이건 헷갈려'를 스스로 표시하게 하는 습관이 가장 간단한 훈련입니다.",
    kid: "{아이}한테는 아주 특별한 힘이 있어요.\n**한 곳에서 배운 걸 다른 곳에 써먹는 힘**이에요.\n이제 문제를 풀고 나서 '확실해'와 '헷갈려'를 표시해봐요.",
    use: [
      {
        t: "과목 선택이 아니라 방식 선택으로",
        d: "어떤 과목을 더 시킬지보다, 아이가 잘 쓰는 방식을 어느 과목에 붙일지를 정하는 데 쓰십시오.",
      },
      {
        t: "약한 칸을 메우려 하지 않기",
        d: "표현·전달이 낮다고 발표 학원을 붙이는 방식은 대체로 역효과입니다. 강한 칸을 통로로 삼는 편이 빠릅니다.",
      },
    ],
  },

  style: {
    time: [
      { label: "~30초", score: 14 },
      { label: "30~60초", score: 31 },
      { label: "1~2분", score: 38 },
      { label: "2~3분", score: 22 },
      { label: "3분+", score: 9 },
    ],
    timeNote:
      "3분 넘게 붙잡은 아홉 문항 가운데 **일곱 문항을 맞혔습니다.** 오래 걸린다고 포기하는 편이 아닙니다.",
    focus: [
      { label: "1~20번", score: 92 },
      { label: "21~40번", score: 89 },
      { label: "41~60번", score: 84 },
      { label: "61~78번", score: 71 },
    ],
    focusNote:
      "후반부에서 **21%p 하락**했습니다. 집중이 유지되는 구간은 약 55~60분으로 추정됩니다.",
    challenge: 79,
    challengeNote: "어려운 문항에서 오히려 시간을 더 씁니다. 도전 성향 상위 21%.",
    afterMiss: "86%",
    fixed: "11문항",
    fixedNote: "그중 여덟 문항이 정답이 됐습니다. 검토 습관이 실제로 도움이 되고 있습니다.",
    plan: [
      { t: "집중 학습 50분", d: "정답률이 유지되는 구간. 어려운 과제를 앞쪽에 배치" },
      { t: "휴식 10분", d: "몸을 움직이기", rest: true },
      { t: "가벼운 마무리 30분", d: "좋아하는 과목으로 배치" },
    ],
    planNote:
      "후반부 정답률 하락과 3분 이상 몰입 문항의 높은 정답률을 함께 고려한 배치입니다. 반복 연습은 뒤로 미루는 편이 유리합니다.",
    parent:
      "가장 실용적인 발견은 **후반부 21%p 하락**입니다. 능력이 아니라 지속 시간의 문제이므로 학습 단위를 50분 이내로 끊고 짧게 쉬는 구조가 효과적입니다. 긴 시험을 앞두고 있다면 지구력 훈련을 따로 준비하시길 권합니다. 도전 성향과 오답 회복력은 이미 충분히 높아 손댈 필요가 없습니다.",
    kid: "{아이}는 어려운 문제를 만나면 **도망가지 않고 더 붙잡는** 멋진 아이예요.\n그런데 뒤로 갈수록 조금 지쳤어요.\n**50분 공부하고 10분 쉬기**를 지켜보면 끝까지 힘이 남아요.",
    closing:
      "이 지면의 수치는 능력이 아니라 **일하는 방식**을 보여줍니다. 오래 붙잡는 성향은 시간이 넉넉한 과제에서 강점이 되고, 촉박한 시험에서는 약점이 됩니다. 바꾸려 하기보다 **어떤 과제에 어떤 성향을 쓸지 알려주는 편**이 효과적입니다. 후반부 집중도 하락 역시 의지의 문제가 아니라 3학년의 일반적인 지속 시간 범위 안에 있습니다.",
  },

  kidPage: {
    title: "{아이}는 탐험가예요",
    desc: "궁금한 걸 그냥 넘기지 않고, 꼭 확인해봐야 마음이 놓이는 친구",
    badges: [
      { icon: "search", t: "관찰 배지", d: "남들이 못 보고\n지나친 것까지 찾아냈어요" },
      { icon: "link", t: "연결 배지", d: "국어에서 배운 걸\n과학에 써먹었어요" },
      { icon: "chat", t: "이유 배지", d: "'왜냐하면'을 붙여서\n설명했어요" },
    ],
    missions: [
      { t: "책 읽고 한 문장으로 말하기", tag: "국어" },
      { t: "풀고 나서 확실해·헷갈려 표시", tag: "생각" },
      { t: "표가 나오면 한 줄씩 짚어 읽기", tag: "수학" },
      { t: "50분 하고 10분 쉬기", tag: "습관" },
      { t: "알아낸 걸 가족에게 설명하기", tag: "과학" },
      { t: "오늘 할 일 내가 정해보기", tag: "습관" },
    ],
  },

  home: {
    three: [
      {
        tag: "하나 · 국어",
        t: "한 문장 요약 놀이",
        d: '읽은 책이나 본 영상을 한 문장으로만 말하게 합니다. 길어지면 "더 짧게"라고만 하세요. 주 3회, 회당 3분.',
        goal: "요약하기 59 → 목표 75",
      },
      {
        tag: "둘 · 수학",
        t: "표 읽고 질문 만들기",
        d: "기사나 영양성분표 같은 실제 표를 보고 아이가 질문을 세 개 만들게 합니다. 답은 부모가 찾습니다. 주 2회, 회당 5분.",
        goal: "자료와 가능성 62 → 목표 78",
      },
      {
        tag: "셋 · 과학",
        t: "선생님 놀이",
        d: "아이가 알아낸 것을 가족에게 3분간 설명하게 합니다. 모르는 척 질문해주세요. 주 1회.",
        goal: "과학적 의사소통 78 → 목표 88",
      },
    ],
    roadmap: [
      {
        when: "1개월차",
        sub: "습관 만들기",
        cells: ["한 문장 요약 주 3회", "표 읽고 질문 만들기", "주 1회 설명하기"],
      },
      {
        when: "2개월차",
        sub: "범위 넓히기",
        cells: ["설명문과 기사로 확장", "그래프와 꺾은선까지 확장", "직접 실험 설계해보기"],
      },
      {
        when: "3개월차",
        sub: "스스로 하기",
        cells: ["독서 기록 스스로 관리", "오답 스스로 분류", "탐구 주제 하나 정해 발표"],
      },
    ],
    roadmapNote: "모든 활동의 공통 목표는 자기주도력 74와 메타인지 71을 함께 끌어올리는 것입니다.",
    path: "과학탐구력 상위 6%와 실험 설계에서의 통제변인 자발 언급은 영재교육원 관찰추천 전형에서 유의미하게 평가되는 지표입니다. 다만 지원 여부는 아이의 흥미 지속과 학교 생활 부담을 함께 고려해 결정하시길 권합니다. 제닉스는 특정 기관 지원을 권유하지 않습니다.",
    dont: [
      { say: "수학이 제일 낮네", why: "세 과목 모두 상위권입니다." },
      { say: "잘하니까 더 열심히", why: "부담이 흥미를 먼저 꺾습니다." },
    ],
    better: "표 읽는 게 아직 낯설구나, 같이 해볼까?",
    success:
      "긴 글을 읽고 **스스로 한 문장 요약을 시도**한다 · 표가 나오면 **끝까지 읽고 답**한다 · 문제를 푼 뒤 **헷갈린 것을 스스로 말**한다 · 공부 시간을 **스스로 끊고 쉰다**",
    successNote: "점수 상승보다 위 네 가지 행동의 변화가 먼저 나타나는 것이 정상적인 순서입니다.",
    review:
      "{이름} 학생은 스스로 질문을 만들고 확인하려는 태도가 세 과목 전반에서 일관되게 관찰되었습니다. 특히 과학 실험 설계 문항에서 통제변인을 자발적으로 언급한 점, 국어의 추론 전략을 과학에 전이해 사용한 점은 3학년 수준을 넘어서는 반응입니다. 현 단계에서는 성취를 끌어올리기보다 관심을 오래 유지할 수 있는 환경을 만들어주는 것이 우선입니다.",
    reviewers: [
      { role: "주 검토 · 전문가", who: "A위원 · 과학교육 14년" },
      { role: "교차 검토 · 전문가", who: "C위원 · 국어교육 11년" },
      { role: "최종 승인", who: "제닉스 진단평가위원회" },
    ],
  },
};

/* ───────────────────────── 실제 응시 기록으로 덮기 ───────────────────────── */

export type LiveInput = {
  name: string;
  grade: string;
  date: Date;
  reportId: string;
  round: string;
  /** 과목 환산 점수 (제출하지 않은 과목은 없음) */
  scores: Partial<Record<SubjectId, number>>;
  /** 유형 이름 (lib/result decideType) */
  typeName?: string;
  typeDesc?: string;
};

const gradeShortOf = (grade: string) => grade.replace(/^(초등|중등|중학교|고등)\s*/, "") || grade;

/**
 * 예시 보고서를 바탕으로, 응시 기록에서 계산할 수 있는 값만 바꿔 끼운다.
 *
 * 과목 점수가 바뀌면 그 과목의 영역별 점수도 같은 폭만큼 옮긴다 — 과목 종합이 60인데
 * 영역이 모두 80대로 남으면 한 면 안에서 숫자가 서로 어긋나 보이기 때문이다. 서술 문구 속
 * 숫자까지는 따라가지 못한다(예시 문안).
 */
export function buildLiveReport(input: LiveInput): DiagReport {
  const base = sampleReport;
  const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

  const subjects = base.subjects.map((s) => {
    const score = input.scores[s.id];
    if (score === undefined) return s;
    const d = score - s.score;
    return {
      ...s,
      score,
      pct: pctOf(score),
      areas: s.areas.map((a) => ({ ...a, score: clamp(a.score + d) })),
      types: s.types.map((a) => ({ ...a, score: clamp(a.score + d) })),
    };
  });

  const [ko, ma, sc] = subjects.map((s) => s.score);
  const derived = [ko, ma, sc, (ko + sc) / 2 + 3, (ma + sc) / 2 - 7, (ko + ma + sc) / 3 - 11];
  const abilities = base.abilities.map((a, i) => {
    const score = clamp(derived[i]);
    return { ...a, score, pct: pctOf(score) };
  });
  const mean = (ko + ma + sc) / 3;

  const date = input.date;
  const no = `GX-${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}${String(
    date.getDate(),
  ).padStart(2, "0")}-${input.reportId.replace(/\D/g, "").slice(-4).padStart(4, "0")}`;

  return {
    ...base,
    student: {
      name: input.name,
      call: callName(input.name),
      grade: input.grade,
      gradeShort: gradeShortOf(input.grade),
    },
    date: date.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" }),
    no,
    round: input.round,
    type: input.typeName
      ? {
          ...base.type,
          lead: undefined,
          name: input.typeName,
          kidName: input.typeName.replace(/형$/, ""),
          desc: input.typeDesc ?? base.type.desc,
        }
      : base.type,
    pct: pctOf(mean + 5),
    abilities,
    subjects,
    kidPage: {
      ...base.kidPage,
      title: input.typeName
        ? `{아이}는 ${input.typeName.replace(/형$/, "")}예요`
        : base.kidPage.title,
    },
  };
}
