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
