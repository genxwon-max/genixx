/**
 * 학생 등록 칸의 고르개 — 한 명씩 등록(ChildNew)과 여럿 등록(BulkRegister)이 같은 값을 쓴다.
 *
 * 두 화면이 저마다 목록을 들고 있으면 한쪽에만 항목이 늘어, 같은 아이가 어느 화면으로
 * 올라왔느냐에 따라 고를 수 있는 관심 분야가 달라진다.
 */

export type SchoolLevel = "초등" | "중등" | "고등";

/**
 * 학교급과 그 안의 학년.
 *
 * 진단이 열리는 구간은 초등 3~6학년이지만, 학교급은 초·중·고 셋을 다 받는다. 형제자매를
 * 한 계정에 모아 두는 일이 흔한데 큰아이가 중학생이라고 명부에 올리지도 못하면 보호자는
 * 아이마다 다른 자리를 찾아야 한다.
 *
 * ⚠ 초1·2와 중·고등학생은 접수할 진단이 없다. 차림표(lib/examCatalog.ts)가 초3~6만 여는
 *   까닭은 진단 절차가 정한 대상 학년이 그것이라서다 — trackFromGrade가 나머지 학년을
 *   null로 돌려주므로 「내 학년」으로 걸리는 카드도 없다. 설문은 나간다 — 학년대
 *   (lib/surveyBands.ts)가 대상이 아닌 학년을 가장 어린 칸으로 받는다.
 */
export const schoolLevels: { id: SchoolLevel; label: string; grades: number[] }[] = [
  { id: "초등", label: "초등학교", grades: [1, 2, 3, 4, 5, 6] },
  { id: "중등", label: "중학교", grades: [1, 2, 3] },
  { id: "고등", label: "고등학교", grades: [1, 2, 3] },
];

export const levelOf = (id: string) => schoolLevels.find((l) => l.id === id);

/**
 * 학년 열둘을 한 줄로 — 「초등 1학년」 … 「고등 3학년」. 학교급과 학년을 따로 고르지 않고 한 고르개로 받는
 * 자리(회원가입 · 보호자 동의 · 기관 학생 등록)가 쓴다(2026-10-28 사용자: 「모든 학년 선택은 초1~6 · 중1~3 ·
 * 고1~3」). 저장하는 글자는 한 명씩 등록(ChildNew)과 같다.
 */
export const gradeLabels = schoolLevels.flatMap((l) => l.grades.map((g) => `${l.id} ${g}학년`));

/**
 * 학년을 학교급 아래에 묶어 세운다 — 고르개가 「초등학교 ㄴ 1학년 ㄴ 2학년 … 중학교 ㄴ 1학년 …」으로 서게
 * (2026-10-28 사용자 요청). 저장하는 값의 꼴은 자리마다 달라(「초3」 · 「초등 3학년」 · 문항 은행의 3) valueOf로
 * 받는다. 그리는 것은 components/GradeOptions.tsx, 표의 거르개는 Filter 선택지의 group으로 같은 모양을 낸다.
 */
export function gradeGroups<V extends string | number>(valueOf: (level: SchoolLevel, n: number) => V) {
  return schoolLevels.map((l) => ({
    label: l.label,
    options: l.grades.map((n) => ({ value: valueOf(l.id, n), label: `${n}학년` })),
  }));
}

/** 학년 값의 세 가지 꼴 — 짧은 글자(관리자 학생 「초3」) · 긴 글자(명부 「초등 3학년」) · 문항 은행 번호(1~12) */
export const gradeValue = {
  short: (l: SchoolLevel, n: number) => `${l.slice(0, 1)}${n}`,
  long: (l: SchoolLevel, n: number) => `${l} ${n}학년`,
  no: (l: SchoolLevel, n: number) => (l === "초등" ? n : l === "중등" ? n + 6 : n + 9),
};

/** 초1 → 고3 차례. 「고 · 중 · 초」 가나다순으로는 학년이 뒤집힌다. 읽지 못한 글자는 맨 뒤 */
export function gradeOrder(text: string | undefined) {
  const t = text ?? "";
  const n = Number(/(\d)/.exec(t)?.[1] ?? 0);
  if (!n) return 99;
  return /고/.test(t) ? 9 + n : /중/.test(t) ? 6 + n : n;
}

export const genders = ["남자", "여자"];

export const interestAreas = [
  "읽기·글쓰기",
  "수학·논리",
  "과학·자연 탐구",
  "그리기·만들기",
  "음악",
  "운동·신체 활동",
  "코딩·디지털",
  "사회·역사",
  "외국어",
];

export const learningKinds = [
  "영재교육원·영재학급",
  "경시·경진대회 참가",
  "학원·과외",
  "방과후 프로그램",
  "온라인 학습",
  "해외 거주·유학",
];

export const OBSERVATION_MAX = 500;

/**
 * 시·도 — 여럿 등록에서 거주 지역을 고르는 칸.
 *
 * 한 명씩 등록은 우편번호 찾기 창에서 주소를 통째로 고르고 거기서 시·도를 딴다
 * (AddressField의 sidoOf). 스무 명을 한 표에 올리는 자리에서 주소 창을 스무 번 띄울 수는
 * 없어서, 지역별로 세는 데 쓰는 시·도 한 칸만 받는다. 이름은 우편번호 서비스가 돌려주는
 * 짧은 꼴(「서울」 · 「경기」)에 맞춘다.
 */
export const sidoList = [
  "서울",
  "부산",
  "대구",
  "인천",
  "광주",
  "대전",
  "울산",
  "세종",
  "경기",
  "강원",
  "충북",
  "충남",
  "전북",
  "전남",
  "경북",
  "경남",
  "제주",
];

/** 긴 이름으로 적힌 시·도 — 명단 파일에 흔히 이렇게 들어 있다 */
const sidoLong: Record<string, string> = {
  서울특별시: "서울",
  부산광역시: "부산",
  대구광역시: "대구",
  인천광역시: "인천",
  광주광역시: "광주",
  대전광역시: "대전",
  울산광역시: "울산",
  세종특별자치시: "세종",
  경기도: "경기",
  강원도: "강원",
  강원특별자치도: "강원",
  충청북도: "충북",
  충청남도: "충남",
  전라북도: "전북",
  전북특별자치도: "전북",
  전라남도: "전남",
  경상북도: "경북",
  경상남도: "경남",
  제주도: "제주",
  제주특별자치도: "제주",
};

/**
 * 적힌 글자를 시·도 짧은 이름으로 맞춘다. 「서울시 강남구」처럼 뒤에 무엇이 붙어 있어도
 * 첫 마디로 찾는다. 끝내 못 찾으면 적힌 그대로 둔다 — 버리면 보호자가 적은 값이 사라진다.
 */
export function sidoFrom(text: string) {
  const t = text.trim();
  if (!t) return "";
  const head = t.split(/\s+/)[0];
  if (sidoList.includes(head)) return head;
  if (sidoLong[head]) return sidoLong[head];
  const short = sidoList.find((s) => head.startsWith(s));
  return short ?? t;
}
