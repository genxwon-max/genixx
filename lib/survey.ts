import type { SurveyKey } from "./examStore";

/**
 * 설문의 **첫 판(v1)**.
 *
 * 이 파일은 더 이상 「지금 나가는 설문」이 아니다. 운영자가 관리자 화면(ADM-14)에서
 * 문항을 고치고 발행하며, 응답자 화면은 lib/surveyStore.ts가 들고 있는 판을 읽는다.
 * 여기 적힌 것은 브라우저에 저장된 판이 아직 없을 때 깔리는 씨앗이다.
 *
 * 그러므로 이 파일을 고쳐도 이미 쓰던 브라우저의 설문은 바뀌지 않는다. 실제로
 * 문구를 고치려면 관리자 화면에서 고치고 발행해야 하고, 그래야 기록에도 남는다.
 *
 * ── 어디서 온 글인가 ──
 *
 * 학생·학부모 문항은 지어낸 것이 아니라 의뢰인이 준 설문지 두 건을 그대로 옮긴 것이다.
 *
 *   GENIXX 학생 재능진단 설문지 v1.0   (Student Talent Diagnostic Questionnaire)
 *   GENIXX 학부모 재능진단 설문지 v1.0 (Parent Talent Diagnostic Questionnaire)
 *
 * 그래서 문항 글은 손대지 않는다. 표현이 어색해 보여도 그것이 원본이고, 재는 도구의
 * 글을 우리가 다듬으면 그때부터 이 응답은 그 설문지의 응답이 아니게 된다. 고칠 일이
 * 생기면 의뢰인이 다음 판을 주고, 관리자 화면에서 새 판으로 발행한다.
 *
 * 앞선 판에는 초3~6이 혼자 읽게 짧게 끊은 문항 여덟 개가 들어 있었다. v1.0은 초1~고3을
 * 한 벌로 묻는 설문지라 말투가 그보다 어른스럽다. 학년대별 말 고르기는 설문지 쪽에서
 * 판이 갈릴 때 따라가는 것이 맞아, 여기서 미리 손보지 않는다.
 *
 * ── 문항에 붙은 이름표 ──
 *
 *   no       설문지의 문항 번호(S01 · P14). 의뢰인과 같은 번호로 이야기하기 위한 것.
 *   section  설문지의 구역. 응답자 화면이 이 이름으로 문항을 묶어 보여 준다.
 *   group    무엇을 재는 칸인가. 역량 열(C01~C10)이거나 흥미·부모 관여 같은 참고 칸이다.
 *
 * group을 버리면 안 된다. 설문지가 정한 셈법이 「역량마다 연결된 2문항의 평균」이라,
 * 어느 문항이 어느 역량의 것인지 잃으면 S·P 점수를 낼 근거가 사라진다. 특히 부모 관여
 * (P24~P28)는 **재능 점수와 분리해서** 읽으라고 설문지가 못박아 둔 칸이다.
 */

/** 5점 척도 문항 한 줄 */
export type SurveySeedItem = {
  /** 설문지의 문항 번호 (S01 · P14) */
  no: string;
  /** 설문지의 구역 이름 */
  section: string;
  /** 재는 칸 — 역량(C01 논리적 사고)이거나 참고 칸(부모 관여) */
  group: string;
  text: string;
};

/** 해당되는 것을 모두 고르는 묶음 */
export type SurveySeedChoice = {
  no: string;
  section: string;
  label: string;
  options: string[];
};

/** 서술형 질문 한 줄 */
export type SurveySeedOpen = {
  no: string;
  section: string;
  label: string;
  hint?: string;
  placeholder?: string;
};

export type SurveyConfig = {
  key: SurveyKey;
  code: string;
  title: string;
  who: string;
  desc: string;
  note: string;
  items: SurveySeedItem[];
  choices: SurveySeedChoice[];
  opens: SurveySeedOpen[];
};

/* ───────────────────────── 학생 (ASM-04) ───────────────────────── */

const S_TALENT = "나의 재능·역량 문진";
const S_GROWTH = "흥미·몰입·성장 문진";

const studentItems: SurveySeedItem[] = [
  { no: "S01", section: S_TALENT, group: "C01 논리적 사고", text: "나는 복잡한 문제를 보면 규칙이나 원리를 찾아보는 편이다." },
  { no: "S02", section: S_TALENT, group: "C01 논리적 사고", text: "나는 '왜 그런지'를 생각하면서 문제를 이해하려 한다." },
  { no: "S03", section: S_TALENT, group: "C02 문제해결", text: "어려운 문제가 나오면 여러 방법을 시도해 보는 편이다." },
  { no: "S04", section: S_TALENT, group: "C02 문제해결", text: "처음 시도가 실패해도 다른 방법을 생각해 다시 도전한다." },
  { no: "S05", section: S_TALENT, group: "C03 창의성", text: "나는 다른 사람들이 생각하지 못한 방법을 떠올리는 경우가 있다." },
  { no: "S06", section: S_TALENT, group: "C03 창의성", text: "하나의 문제에 대해 여러 가지 답이나 아이디어를 생각할 수 있다." },
  { no: "S07", section: S_TALENT, group: "C04 비판적 사고", text: "누군가의 말을 들으면 '그 근거가 무엇인지' 궁금해한다." },
  { no: "S08", section: S_TALENT, group: "C04 비판적 사고", text: "서로 다른 의견을 비교한 뒤 내 생각을 바꿀 수 있다." },
  { no: "S09", section: S_TALENT, group: "C05 언어·의사소통", text: "나는 내가 생각한 것을 말이나 글로 설명하는 것이 편하다." },
  { no: "S10", section: S_TALENT, group: "C05 언어·의사소통", text: "나는 새로운 단어나 이야기의 내용을 이해하고 설명하는 것을 좋아한다." },
  { no: "S11", section: S_TALENT, group: "C06 수리·수량적 사고", text: "나는 숫자, 계산, 규칙, 패턴을 찾는 활동을 좋아한다." },
  { no: "S12", section: S_TALENT, group: "C06 수리·수량적 사고", text: "자료나 숫자를 비교해서 의미를 찾아내는 것이 재미있다." },
  { no: "S13", section: S_TALENT, group: "C07 공간·시각적 사고", text: "그림, 지도, 퍼즐, 블록, 도형이나 구조를 생각하는 활동을 좋아한다." },
  { no: "S14", section: S_TALENT, group: "C07 공간·시각적 사고", text: "머릿속으로 물건의 모양이나 위치를 바꾸어 생각할 수 있다." },
  { no: "S15", section: S_TALENT, group: "C08 협업·사회적 역량", text: "친구들과 함께 문제를 해결하거나 무언가를 만드는 활동을 좋아한다." },
  { no: "S16", section: S_TALENT, group: "C08 협업·사회적 역량", text: "팀에서 다른 사람의 의견을 듣고 내 역할을 조정할 수 있다." },
  { no: "S17", section: S_TALENT, group: "C09 자기주도성", text: "해야 할 일을 스스로 정하고 시작하는 편이다." },
  { no: "S18", section: S_TALENT, group: "C09 자기주도성", text: "내가 관심 있는 일은 누가 시키지 않아도 계속해 보는 편이다." },
  { no: "S19", section: S_TALENT, group: "C10 학습민첩성", text: "처음 배우는 것도 원리를 이해하면 빠르게 익히는 편이다." },
  { no: "S20", section: S_TALENT, group: "C10 학습민첩성", text: "실수하거나 조언을 받으면 다음에는 다르게 해보려고 한다." },
  { no: "S21", section: S_GROWTH, group: "흥미", text: "나는 새로운 것을 직접 해보면서 배우는 것을 좋아한다." },
  { no: "S22", section: S_GROWTH, group: "흥미", text: "나는 내가 좋아하는 주제를 스스로 찾아보는 편이다." },
  { no: "S23", section: S_GROWTH, group: "몰입", text: "관심 있는 일을 시작하면 시간이 빨리 지나가는 느낌이 든다." },
  { no: "S24", section: S_GROWTH, group: "몰입", text: "어려워도 재미있다고 느끼는 활동은 계속 도전한다." },
  { no: "S25", section: S_GROWTH, group: "자기인식", text: "친구나 선생님에게 내가 잘한다고 들었던 것이 있다." },
  { no: "S26", section: S_GROWTH, group: "자기인식", text: "나는 다른 사람보다 쉽게 할 수 있다고 느끼는 활동이 있다." },
  { no: "S27", section: S_GROWTH, group: "성장", text: "예전에는 어려웠지만 연습을 통해 잘하게 된 것이 있다." },
  { no: "S28", section: S_GROWTH, group: "성장", text: "내가 부족한 부분을 알면 연습 방법을 바꾸려고 한다." },
];

const S_PICK = "내가 좋아하고 잘하는 것";

const studentChoices: SurveySeedChoice[] = [
  {
    no: "SC1",
    section: S_PICK,
    label: "나는 다음 활동을 좋아한다.",
    options: [
      "이야기/글쓰기",
      "숫자/계산",
      "퍼즐/문제풀이",
      "만들기/조립",
      "그림/디자인",
      "발표/토론",
      "친구와 함께하기",
      "혼자 깊게 탐구하기",
      "실험/관찰",
      "새로운 도구 사용",
    ],
  },
  {
    no: "SC2",
    section: S_PICK,
    label: "나는 다음 상황에서 시간이 빨리 간다.",
    options: [
      "책 읽기",
      "게임/퍼즐",
      "만들기",
      "그림/영상",
      "운동/활동",
      "친구와 대화",
      "조사/검색",
      "수학·과학 문제",
      "글쓰기/이야기 만들기",
    ],
  },
  {
    no: "SC3",
    section: S_PICK,
    label: "사람들이 나에게 자주 말하는 강점은?",
    options: [
      "설명을 잘함",
      "아이디어가 많음",
      "계산을 잘함",
      "문제를 잘 풂",
      "손재주가 좋음",
      "친구를 잘 도움",
      "끝까지 함",
      "빨리 배움",
      "관찰을 잘함",
      "잘 모르겠음",
    ],
  },
];

const S_ASK = "나를 더 알아보는 질문";
const S_FLOW = "나의 몰입 경험";

const studentOpens: SurveySeedOpen[] = [
  { no: "SQ1", section: S_ASK, label: "내가 가장 좋아해서 다른 사람이 시키지 않아도 자주 하는 활동은 무엇인가요?" },
  { no: "SQ2", section: S_ASK, label: "최근에 내가 스스로 찾아서 배우거나 알아본 것은 무엇인가요?" },
  { no: "SQ3", section: S_ASK, label: "친구나 선생님이 나에게 잘한다고 말해 준 것은 무엇인가요?" },
  { no: "SQ4", section: S_ASK, label: "어려운 일을 만났을 때 나는 보통 어떻게 해결하나요?" },
  { no: "SQ5", section: S_ASK, label: "최근에 끝까지 해내서 뿌듯했던 일은 무엇인가요?" },
  { no: "SQ6", section: S_ASK, label: "내가 다른 사람보다 쉽게 할 수 있다고 느끼는 일은 무엇인가요?" },
  { no: "SQ7", section: S_ASK, label: "아직 잘 모르겠지만 한번 경험해 보고 싶은 분야는 무엇인가요?" },
  { no: "SQ8", section: S_ASK, label: "내가 생각하는 나의 가장 큰 강점 3가지는 무엇인가요?" },
  {
    no: "SF1",
    section: S_FLOW,
    label: "무엇을 했나요?",
    hint: "최근 6개월 동안 무언가에 깊이 빠져서 시간 가는 줄 몰랐던 경험이 있다면 적어 주세요.",
  },
  { no: "SF2", section: S_FLOW, label: "왜 재미있었나요?" },
  { no: "SF3", section: S_FLOW, label: "얼마나 오래 또는 자주 했나요?" },
];

/* ───────────────────────── 학부모 (ASM-05) ───────────────────────── */

const P_TALENT = "자녀의 재능·역량 관찰";
const P_ENV = "재능 발현 환경·흥미·부모 관여";

const guardianItems: SurveySeedItem[] = [
  { no: "P01", section: P_TALENT, group: "C01 논리적 사고", text: "복잡한 상황에서도 규칙이나 원리를 스스로 찾아내는 편이다." },
  { no: "P02", section: P_TALENT, group: "C01 논리적 사고", text: "사건이나 현상이 왜 그렇게 되었는지 원인과 결과를 연결해서 설명한다." },
  { no: "P03", section: P_TALENT, group: "C02 문제해결", text: "어려운 일이 생기면 한 가지 방법에만 의존하지 않고 여러 해결 방법을 생각해 본다." },
  { no: "P04", section: P_TALENT, group: "C02 문제해결", text: "처음 시도한 방법이 잘되지 않으면 다른 방법으로 바꾸어 다시 시도한다." },
  { no: "P05", section: P_TALENT, group: "C03 창의성", text: "기존과 다른 방법이나 독특한 아이디어를 자주 제안한다." },
  { no: "P06", section: P_TALENT, group: "C03 창의성", text: "평범한 사물이나 상황을 새로운 방식으로 활용하는 경우가 있다." },
  { no: "P07", section: P_TALENT, group: "C04 비판적 사고", text: "어른이나 친구의 말을 그대로 믿기보다 이유나 근거를 확인하려 한다." },
  { no: "P08", section: P_TALENT, group: "C04 비판적 사고", text: "서로 다른 의견을 비교하여 자신의 생각을 수정하거나 보완한다." },
  { no: "P09", section: P_TALENT, group: "C05 언어·의사소통", text: "자신의 생각을 말이나 글로 비교적 명확하게 설명한다." },
  { no: "P10", section: P_TALENT, group: "C05 언어·의사소통", text: "책·영상·대화에서 얻은 내용을 자신의 말로 다시 설명하는 것을 잘한다." },
  { no: "P11", section: P_TALENT, group: "C06 수리·수량적 사고", text: "숫자, 계산, 규칙, 패턴에 관심을 보이거나 빠르게 이해한다." },
  { no: "P12", section: P_TALENT, group: "C06 수리·수량적 사고", text: "일상생활에서 수량, 시간, 비교, 측정 등을 스스로 활용한다." },
  { no: "P13", section: P_TALENT, group: "C07 공간·시각적 사고", text: "퍼즐, 블록, 조립, 지도, 그림, 공간 구조 등을 이해하는 데 강점이 있다." },
  { no: "P14", section: P_TALENT, group: "C07 공간·시각적 사고", text: "머릿속으로 물체를 돌리거나 위치를 바꾸어 생각하는 모습을 보인다." },
  { no: "P15", section: P_TALENT, group: "C08 협업·사회적 역량", text: "친구나 가족과 함께할 때 다른 사람의 의견을 듣고 조정한다." },
  { no: "P16", section: P_TALENT, group: "C08 협업·사회적 역량", text: "공동 활동에서 맡은 역할을 책임지고 다른 사람을 돕는다." },
  { no: "P17", section: P_TALENT, group: "C09 자기주도성", text: "해야 할 일을 스스로 계획하고 시작하는 경우가 많다." },
  { no: "P18", section: P_TALENT, group: "C09 자기주도성", text: "자신이 관심 있는 과제는 외부에서 시키지 않아도 끝까지 해보려 한다." },
  { no: "P19", section: P_TALENT, group: "C10 학습민첩성", text: "새로운 것을 배우면 비교적 빠르게 익히고 다른 상황에도 적용한다." },
  { no: "P20", section: P_TALENT, group: "C10 학습민첩성", text: "실수하거나 피드백을 받은 뒤 다음 시도에서 행동을 바꾸는 편이다." },
  { no: "P21", section: P_ENV, group: "흥미·몰입", text: "자신이 좋아하는 활동에는 시간 가는 줄 모르고 몰입하는 모습을 보인다." },
  { no: "P22", section: P_ENV, group: "흥미·몰입", text: "학교 과목과 관계없이 스스로 찾아보거나 반복해서 하는 관심 분야가 있다." },
  { no: "P23", section: P_ENV, group: "흥미·몰입", text: "특정 주제에 대해 또래보다 깊이 있는 질문을 하는 경우가 많다." },
  { no: "P24", section: P_ENV, group: "부모 관여", text: "자녀가 잘하는 활동이나 관심 분야를 알아보기 위해 대화하거나 관찰한다." },
  { no: "P25", section: P_ENV, group: "부모 관여", text: "자녀가 관심을 보이는 활동을 경험할 기회(책, 체험, 프로젝트 등)를 제공한다." },
  { no: "P26", section: P_ENV, group: "부모 관여", text: "자녀의 결과보다 과정과 노력에 대해 피드백하려고 한다." },
  { no: "P27", section: P_ENV, group: "부모 관여", text: "자녀가 선택한 활동을 일정 기간 스스로 시도해 볼 수 있도록 기다려 준다." },
  { no: "P28", section: P_ENV, group: "부모 관여", text: "자녀의 강점과 어려움을 교사·전문가와 공유하고 필요한 지원을 찾는다." },
  { no: "P29", section: P_ENV, group: "환경·기회", text: "가정에서 새로운 질문이나 아이디어를 자유롭게 이야기할 수 있는 분위기가 있다." },
  { no: "P30", section: P_ENV, group: "환경·기회", text: "실패하더라도 다시 시도하거나 방법을 바꿔 볼 수 있는 환경을 제공한다." },
];

const P_FIND = "자녀의 재능 영역 탐색";
const P_MORE = "추가 관찰 정보";

const guardianOpens: SurveySeedOpen[] = [
  { no: "PQ1", section: P_FIND, label: "자녀가 다른 활동보다 유난히 즐기거나 오래 몰입하는 활동은 무엇입니까?" },
  { no: "PQ2", section: P_FIND, label: "자녀가 주변 사람에게 자주 질문하거나 스스로 찾아보는 주제는 무엇입니까?" },
  { no: "PQ3", section: P_FIND, label: "자녀가 또래보다 쉽게 이해하거나 빠르게 배우는 것처럼 보이는 영역은 무엇입니까?" },
  { no: "PQ4", section: P_FIND, label: "반대로 자녀가 어려워하거나 쉽게 포기하는 상황은 무엇입니까?" },
  { no: "PQ5", section: P_FIND, label: "자녀가 최근 스스로 목표를 세우고 끝까지 해낸 경험이 있다면 적어 주세요." },
  {
    no: "PQ6",
    section: P_FIND,
    label: "자녀의 재능이나 강점을 발견했다고 느낀 구체적인 사례를 적어 주세요.",
    /* 리포트의 '발견의 순간'이 이 칸을 인용한다. 설문지에서 이 자리를 옮기거나 지우면
       그 절이 빈다 — components/exam/StatusTable.tsx가 보호자에게 예고하는 항목이다. */
    hint: "리포트의 '발견의 순간' 절에 표현 그대로 인용됩니다. 언제·무엇을·어떤 상황에서 있었던 일인지 적어 주시면 그대로 실립니다.",
    placeholder: "예) 지난봄 주말에 …",
  },
  { no: "PQ7", section: P_FIND, label: "부모님이 생각하는 자녀의 대표 강점 3가지를 적어 주세요." },
  { no: "PQ8", section: P_FIND, label: "자녀가 앞으로 더 경험해 보았으면 하는 분야가 있다면 적어 주세요." },
  {
    no: "PM1",
    section: P_MORE,
    label: "자녀가 최근 가장 즐거워했던 활동이나 프로젝트는 무엇이었나요?",
    hint: "아래 네 질문은 점수로 세지 않습니다. 진단 결과의 근거와 상담 포인트를 보완하기 위한 참고 정보입니다.",
  },
  { no: "PM2", section: P_MORE, label: "자녀가 스스로 찾아보고 배운 경험이 있다면 구체적으로 적어 주세요." },
  { no: "PM3", section: P_MORE, label: "자녀가 실패하거나 어려움을 겪었을 때 주로 어떤 반응을 보이나요?" },
  { no: "PM4", section: P_MORE, label: "부모님이 자녀의 강점이라고 생각하지만 아직 충분히 발휘할 기회가 없었다고 생각하는 부분이 있나요?" },
];

/* ───────────────────────── 지도교사 (ASM-06) ───────────────────────── */

/**
 * 교사 설문은 아직 v1.0 설문지가 오지 않았다. 앞선 판의 여덟 문항을 그대로 둔다 —
 * 학생·학부모에 맞춰 여기까지 지어내면, 오지 않은 문서를 우리가 쓴 것이 된다.
 * 역량 열도 비워 둔다. 설문지가 오면 그때 C01~C10에 이어 붙인다.
 */
const T_OBS = "수업에서 관찰한 모습";

const teacherItems: SurveySeedItem[] = [
  "수업 중 자기 생각을 근거와 함께 말합니다.",
  "글이나 발표에서 어휘를 상황에 맞게 사용합니다.",
  "수·규칙 문제에서 다른 학생과 다른 접근을 시도합니다.",
  "관찰·실험 활동에서 원인을 스스로 추론하려 합니다.",
  "모둠 활동에서 역할을 조정하고 갈등을 중재합니다.",
  "과제를 끝까지 마무리하는 지구력이 있습니다.",
  "틀렸을 때 이유를 확인하고 고치려 합니다.",
  "관심 분야에서 또래보다 앞선 결과물을 보여준 적이 있습니다.",
].map((text, n) => ({
  no: `T${String(n + 1).padStart(2, "0")}`,
  section: T_OBS,
  group: "",
  text,
}));

export const surveys: Record<SurveyKey, SurveyConfig> = {
  student: {
    key: "student",
    code: "ASM-04",
    title: "학생 재능진단 설문지",
    who: "학생 본인",
    desc: "이 설문은 학생이 스스로 느끼는 흥미, 자신감, 몰입, 문제를 해결하는 방식, 창의적 성향, 협업, 자기주도성 및 학습 방식을 알아보기 위한 자기보고형 문진입니다. 정답은 없습니다. 다른 사람에게 잘 보이기 위한 답보다 평소 자신의 모습에 가깝게 응답해 주세요.",
    note: "설문 결과만으로 재능을 확정하지 않습니다. 학부모 관찰 설문(P), CBT 수행 결과(B)와 함께 해석하며, 스스로 높게 본 영역과 실제 수행에서 강점으로 확인되는 영역이 다를 수 있습니다 — 그 차이도 진단의 중요한 참고 자료로 씁니다.",
    items: studentItems,
    choices: studentChoices,
    opens: studentOpens,
  },
  guardian: {
    key: "guardian",
    code: "ASM-05",
    title: "학부모 재능진단 설문지",
    who: "보호자",
    desc: "본 설문은 학부모님이 최근 6개월 동안 일상에서 관찰한 자녀의 행동, 흥미, 강점, 학습 습관 및 재능 발현 환경을 파악하기 위한 문진입니다. 정답은 없으며, 부모님이 기대하는 모습이 아니라 실제로 관찰한 모습을 기준으로 응답해 주세요. 어머니·아버지 중 한 분이 대표로 답하셔도 되고, 두 분이 함께 보고 답하셔도 됩니다.",
    note: "설문 결과만으로 학생의 재능을 확정하지 않습니다. 학부모 관찰점수(P)·학생 자기보고점수(S)·CBT 수행점수(B)를 따로 산출해 함께 해석하며, 부모의 지원·관여 정도는 학생의 재능 점수와 분리해 읽습니다. 흥미와 재능도 같게 취급하지 않습니다.",
    items: guardianItems,
    choices: [],
    opens: guardianOpens,
  },
  teacher: {
    key: "teacher",
    code: "ASM-06",
    title: "지도교사 관찰 설문",
    who: "담당 교사·교수",
    desc: "학교·학원에서 관찰한 학생의 모습을 입력해 주세요. 학생 응답·보호자 응답과 함께 4원 검증 축을 이룹니다.",
    note: "입력한 내용은 해당 학생의 리포트 해석에만 사용되며, 학생 개인 결과는 보호자 동의 범위 안에서만 열람할 수 있습니다.",
    items: teacherItems,
    choices: [],
    opens: [
      {
        no: "TQ1",
        section: "관찰 사례",
        label: "기억에 남는 관찰 사례가 있다면 적어 주세요",
        hint: "언제·무엇을·어떤 상황·반복성·주변 반응 5요소로 서술하면 해석에 큰 도움이 됩니다.",
        placeholder: "예) 지난 학기 모둠 발표에서 …",
      },
    ],
  },
};

export function isSurveyKey(v: string): v is SurveyKey {
  return v === "student" || v === "guardian" || v === "teacher";
}
