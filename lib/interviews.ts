import { staffDirectory } from "./adminUsers";

/**
 * 면담 신청 원장 (EXP-06).
 *
 * 저장소에 「면담을 신청한 사람」이 없었다. 케이스(lib/expertStore.ts의 InterviewCase)에는
 * reasons: ["request"] 꼬리표만 있고 **누가 언제 무엇을 적어** 신청했는지가 없어서,
 * 신청자 목록을 세우면 응시번호만 스무 줄 서고 며칠 묵었는지도 셀 수 없었다.
 *
 * ── 왜 지시자가 없나 ──
 * 신청은 사람이 보낸 것이라 콘솔이 만들지 않는다. 문의가 lib/admin.ts에 있고 우리가 한
 * 일만 lib/inquiryStore.ts에 덮이는 것과 같은 자리다 — 여기는 씨앗이고, 우리가 잡은
 * 일정은 lib/interviewStore.ts가 덮는다. 지시자를 붙이지 않아 뒤에 대시보드가 서버에서
 * 이 줄을 셀 수 있게 열어 둔다.
 *
 * ── 케이스 번호를 미리 든다 ──
 * caseId를 신청 시점에 적어 둔다. 대상으로 받는 순간 케이스가 서는데, 그때 번호가
 * IR-…에서 IV-…로 갈리면 주소와 일정 열쇠가 함께 갈린다. 케이스 번호는 회차와
 * 응시번호로 정해지므로 신청이 들어온 순간 이미 결정되어 있다.
 *
 * ── 연락처는 온전히 담는다 ──
 * 가리는 일은 그리는 쪽이 한다(lib/adminUsers.ts의 maskMail·maskPhone·maskName).
 * 씨앗이 미리 가려 두면 목록에서 전화 뒷자리로 사람을 찾는 일이 막힌다.
 *
 * ⚠ 신청자를 회원 명부(M-… · T-…)에 잇지 않았다. seat(회차 안 응시번호)과
 *   StudentRow.id는 서로 다른 이름공간이고 잇는 표가 저장소에 없다 — 목록에서
 *   개인정보를 안 펴려고 일부러 끊어 둔 것이라 되잇지 않는다. 붙일 때 memberId 한 칸으로
 *   갈아 끼운다.
 *
 * ⚠ seat은 0441 위만 쓴다. 손으로 쓴 2026-3 코호트 일곱(0412·0418·0421·0423·0426·
 *   0430·0433)에 신청을 얹으면 같은 아이가 목록에 두 줄로 선다 — 저쪽 응시번호는
 *   lib/expertStore.ts의 HAND_SCORES가 들고 있고, 생성분은 0441부터 붙는다(ROUND_SEEDS).
 *
 * ⚠ seat이 **없는 신청이 있다**(IR-2603-18). 검사를 치르기 전에 보내온 것이라 붙일
 *   번호가 없다. 화면은 응시번호로 사람을 부르므로, 없을 때 무엇으로 부를지를 저마다
 *   정하지 않고 lib/interviewStore.ts의 seatOf 한 곳에 모아 두었다.
 *
 * ⚠ 접수 일시를 2026-09-08 둘레에 못 박아 두었다. 시계를 읽어 「사흘 전」을 만들면 화면을
 *   대조하는 사람이 매일 다른 목록을 보게 되고, 서버가 그린 값과 브라우저가 그린 값이
 *   갈려 하이드레이션이 어긋난다. 시연 전에 날짜를 옮길 자리가 여기와
 *   lib/interviewStore.ts의 SEED_SLOTS 둘이다.
 */

/** 누가 보냈나 */
export type Relation = "guardian" | "teacher";

export const relations: Record<Relation, string> = {
  guardian: "보호자",
  teacher: "지도교사",
};

/** 어느 통로로 왔나 */
export type Channel = "site" | "phone" | "org";

export const channels: Record<Channel, string> = {
  site: "홈페이지",
  phone: "전화",
  org: "기관",
};

/**
 * 보호자·교사가 보내온 면담 신청 한 건.
 *
 * 문의(lib/admin.ts의 inquiries)와 같은 갈래의 자료다 — 사람이 보낸 것이라 콘솔이
 * 만들지 않고, 우리가 한 일만 저장소가 덮는다.
 */
export type InterviewRequest = {
  /** 신청 번호 — IR-2603-02. 상세의 「신청」 판 머리에만 선다 */
  id: string;
  /**
   * 이 신청이 서는(또는 이미 선) 면담 번호 — IV-2603-0452.
   *
   * 응시번호로 짓는 것이 원칙이나, 아직 안 치른 아이의 신청에는 붙일 번호가 없다.
   * 그때는 신청 번호를 따 IV-2603-R18처럼 짓는다 — 번호 꼴이 갈려도 열쇠 노릇은 같다.
   */
  caseId: string;
  round: string;
  /**
   * 회차 안 응시번호. **없을 수 있다** — 아직 검사를 치르지 않은 아이의 신청이다.
   *
   * 보호자는 결과지를 받기 전에도 신청을 보내고, 실제로 그런 신청이 들어온다(IR-2603-18).
   * 빈 문자열이 아니라 null로 둔다 — 「없음」과 「아직 안 채운 칸」은 다른 것이고,
   * 빈 문자열로 두면 화면이 응시번호 자리에 아무것도 아닌 것을 그린다.
   */
  seat: string | null;
  grade: string;
  applicant: { name: string; relation: Relation; phone: string; mail: string };
  /** 접수 일시 "2026-09-07 22:40" — 정렬과 「며칠 묵었나」의 기준 */
  appliedAt: string;
  /** 신청자가 적어 보낸 글. 그대로 보관하고 줄이지 않는다 */
  want: string;
  channel: Channel;
};

export const interviewRequests: InterviewRequest[] = [
  {
    /* 이미 대상으로 받은 건 — 전문가 콘솔에 케이스가 서 있다(SEED_INTERVIEWS의
       IV-2603-0430). 승격이 어떤 그림인지 첫 화면에서 바로 보이라고 한 줄 둔다 */
    id: "IR-2603-01",
    caseId: "IV-2603-0430",
    round: "2026-3",
    seat: "0430",
    grade: "중2",
    applicant: {
      name: "한지민",
      relation: "guardian",
      phone: "010-3391-4728",
      mail: "hanjm76@naver.com",
    },
    appliedAt: "2026-08-28 21:14",
    want: "아이가 책은 많이 읽는데 학교 성적으로는 그게 잘 안 드러납니다. 결과지에도 언어 축만 높게 나왔는데, 저희가 보기에는 정리하고 설명하는 걸 더 잘합니다. 한 번 이야기를 나눠 볼 수 있을까요.",
    channel: "site",
  },
  {
    id: "IR-2603-02",
    caseId: "IV-2603-0452",
    round: "2026-3",
    seat: "0452",
    grade: "초4",
    applicant: {
      name: "오세영",
      relation: "guardian",
      phone: "010-7742-1093",
      mail: "ohsy0412@kakao.com",
    },
    appliedAt: "2026-09-07 22:40",
    want: "학교에서는 조용한데 집에서는 하루 종일 그림을 그립니다. 결과지에 공간 축이 낮게 나와서 저희가 보는 아이와 달라 한 번 이야기를 나누고 싶습니다.",
    channel: "site",
  },
  {
    id: "IR-2603-03",
    caseId: "IV-2603-0468",
    round: "2026-3",
    seat: "0468",
    grade: "초6",
    applicant: {
      name: "배수현",
      relation: "teacher",
      phone: "010-2205-8817",
      mail: "bae.sh@hanmail.net",
    },
    appliedAt: "2026-09-08 09:12",
    want: "담임입니다. 이 학생이 수업 중에 다른 아이들 순서를 정리하는 걸 자주 봅니다. 검사 결과에는 그 부분이 안 드러난 것 같아 여쭙습니다.",
    channel: "org",
  },
  {
    id: "IR-2603-04",
    caseId: "IV-2603-0475",
    round: "2026-3",
    seat: "0475",
    grade: "중1",
    applicant: {
      name: "문가영",
      relation: "guardian",
      phone: "010-9018-6634",
      mail: "moonky1130@naver.com",
    },
    appliedAt: "2026-09-08 11:03",
    want: "전화로 접수했습니다. 검사 보던 날 아이가 몸이 안 좋았다고 합니다. 점수를 다시 봐 달라는 건 아니고, 아이 이야기를 한 번 들어 봐 주셨으면 합니다.",
    channel: "phone",
  },
  {
    id: "IR-2603-05",
    caseId: "IV-2603-0443",
    round: "2026-3",
    seat: "0443",
    grade: "초5",
    applicant: {
      name: "조은비",
      relation: "guardian",
      phone: "010-4471-2286",
      mail: "joeb.mom@kakao.com",
    },
    appliedAt: "2026-08-31 19:22",
    want: "리포트에서 「능력-흥미 불일치」라는 말을 봤는데 그게 무슨 뜻인지 잘 모르겠습니다. 아이한테 어떻게 말해 줘야 할지 상담받고 싶습니다.",
    channel: "site",
  },
  {
    id: "IR-2603-06",
    caseId: "IV-2603-0449",
    round: "2026-3",
    seat: "0449",
    grade: "초3",
    applicant: {
      name: "신태윤",
      relation: "guardian",
      phone: "010-6620-3374",
      mail: "shinty@naver.com",
    },
    appliedAt: "2026-09-01 08:47",
    want: "아이가 검사 끝나고 와서 「문제가 무슨 말인지 모르겠더라」고 했습니다. 문제를 못 푼 건지 못 읽은 건지 저희도 헷갈립니다.",
    channel: "site",
  },
  {
    id: "IR-2603-07",
    caseId: "IV-2603-0457",
    round: "2026-3",
    seat: "0457",
    grade: "초6",
    applicant: {
      name: "남유리",
      relation: "teacher",
      phone: "010-3308-5541",
      mail: "nam.yr@hanmail.net",
    },
    appliedAt: "2026-09-01 15:30",
    want: "방과후 과학반을 맡고 있습니다. 실험을 설계하는 걸 유난히 잘하는 학생인데 지필 과학은 중간이라 결과지와 제가 보는 모습이 다릅니다.",
    channel: "org",
  },
  {
    id: "IR-2603-08",
    caseId: "IV-2603-0461",
    round: "2026-3",
    seat: "0461",
    grade: "초4",
    applicant: {
      name: "권도현",
      relation: "guardian",
      phone: "010-5583-9107",
      mail: "kwondh84@naver.com",
    },
    appliedAt: "2026-09-02 21:05",
    want: "설문은 제가 쓰고 아이도 따로 썼는데 답이 많이 다르다고 들었습니다. 무엇이 어떻게 다른지, 저희가 아이를 잘못 보고 있는 건지 듣고 싶습니다.",
    channel: "site",
  },
  {
    id: "IR-2603-09",
    caseId: "IV-2603-0464",
    round: "2026-3",
    seat: "0464",
    grade: "초5",
    applicant: {
      name: "홍서아",
      relation: "guardian",
      phone: "010-2914-7760",
      mail: "hongsa.k@kakao.com",
    },
    appliedAt: "2026-09-02 22:18",
    want: "둘째도 작년에 받았는데 그때는 면담을 못 했습니다. 이번에는 꼭 하고 싶습니다. 평일 오후면 언제든 됩니다.",
    channel: "site",
  },
  {
    id: "IR-2603-10",
    caseId: "IV-2603-0470",
    round: "2026-3",
    seat: "0470",
    grade: "중1",
    applicant: {
      name: "강민재",
      relation: "guardian",
      phone: "010-8836-2245",
      mail: "kangmj@hanmail.net",
    },
    appliedAt: "2026-09-03 10:41",
    want: "지방이라 방문이 어렵습니다. 전화로도 되는지 여쭙습니다. 아이가 진로를 정해야 하는 시기라 조언을 듣고 싶습니다.",
    channel: "phone",
  },
  {
    id: "IR-2603-11",
    caseId: "IV-2603-0446",
    round: "2026-3",
    seat: "0446",
    grade: "초3",
    applicant: {
      name: "유하늘",
      relation: "teacher",
      phone: "010-4127-3390",
      mail: "yoo.hn@hanmail.net",
    },
    appliedAt: "2026-09-03 16:55",
    want: "학급에서 말수가 적은 학생입니다. 글로 쓰는 건 잘하는데 말로는 잘 안 합니다. 면담이 부담이 되지 않을지 먼저 상의드리고 싶습니다.",
    channel: "org",
  },
  {
    id: "IR-2603-12",
    caseId: "IV-2603-0472",
    round: "2026-3",
    seat: "0472",
    grade: "초6",
    applicant: {
      name: "임재현",
      relation: "guardian",
      phone: "010-7059-1183",
      mail: "limjh1978@naver.com",
    },
    appliedAt: "2026-09-04 20:09",
    want: "내년에 심화진단도 받을 생각입니다. 그 전에 지금 결과를 어떻게 읽어야 하는지 한 번 정리해 주시면 좋겠습니다.",
    channel: "site",
  },
  {
    id: "IR-2603-13",
    caseId: "IV-2603-0455",
    round: "2026-3",
    seat: "0455",
    grade: "초4",
    applicant: {
      name: "백지원",
      relation: "guardian",
      phone: "010-3364-8892",
      mail: "baekjw@kakao.com",
    },
    appliedAt: "2026-08-27 18:33",
    want: "아이가 만들기를 좋아하는데 결과지에는 그런 이야기가 없습니다. 손으로 하는 것도 재능으로 보시는지 궁금합니다.",
    channel: "site",
  },
  {
    id: "IR-2603-14",
    caseId: "IV-2603-0459",
    round: "2026-3",
    seat: "0459",
    grade: "초5",
    applicant: {
      name: "노선영",
      relation: "guardian",
      phone: "010-6648-0271",
      mail: "nosy.home@naver.com",
    },
    appliedAt: "2026-09-05 07:52",
    want: "리포트를 읽고 나니 아이한테 무슨 말을 해 줘야 할지 오히려 더 모르겠습니다. 라벨을 붙이지 않는다고 쓰여 있던데 그럼 무엇을 말해 주면 되는지요.",
    channel: "site",
  },
  {
    id: "IR-2603-15",
    caseId: "IV-2603-0466",
    round: "2026-3",
    seat: "0466",
    grade: "초6",
    applicant: {
      name: "심우진",
      relation: "teacher",
      phone: "010-2276-4415",
      mail: "shim.wj@hanmail.net",
    },
    appliedAt: "2026-09-05 13:20",
    want: "같은 반에서 두 학생이 받았는데 한 명은 결과를 보고 많이 위축됐습니다. 결과를 전달하는 방법을 상의드리고 싶습니다.",
    channel: "org",
  },
  {
    id: "IR-2603-16",
    caseId: "IV-2603-0478",
    round: "2026-3",
    seat: "0478",
    grade: "중1",
    applicant: {
      name: "표민경",
      relation: "guardian",
      phone: "010-9903-5528",
      mail: "pyomk@kakao.com",
    },
    appliedAt: "2026-09-06 21:44",
    want: "아이가 검사를 두 번째 받는데 작년과 결과가 꽤 다릅니다. 이렇게 바뀌는 게 정상인지, 무엇을 봐야 하는지 듣고 싶습니다.",
    channel: "site",
  },
  {
    id: "IR-2603-17",
    caseId: "IV-2603-0450",
    round: "2026-3",
    seat: "0450",
    grade: "초3",
    applicant: {
      name: "하도경",
      relation: "guardian",
      phone: "010-5514-7036",
      mail: "hadk.mom@naver.com",
    },
    appliedAt: "2026-08-26 12:10",
    want: "8월에 한 번 면담을 했는데 그때 못 여쭌 게 있어서 다시 신청합니다.",
    channel: "phone",
  },
  {
    /* 응시번호가 없는 한 건. 「아직 검사를 안 봤는데」라고 적어 보낸 신청이라 붙일
       응시번호가 없다 — 예전에는 0481을 지어 붙여 두었는데, 그러면 이 줄을 반려한
       까닭(「응시 기록이 없습니다」)과 화면이 서로 다른 말을 한다 */
    id: "IR-2603-18",
    caseId: "IV-2603-R18",
    round: "2026-3",
    seat: null,
    grade: "초4",
    applicant: {
      name: "구예린",
      relation: "guardian",
      phone: "010-3720-6684",
      mail: "kooyr@naver.com",
    },
    appliedAt: "2026-08-25 09:38",
    want: "아직 검사를 안 봤는데 면담부터 받을 수 있을까요. 아이가 어떤 검사인지 미리 알고 싶어 합니다.",
    channel: "site",
  },
];

/** 면담 번호로 신청을 찾는다 — 케이스가 선 뒤에도 신청 원본을 상세에서 편다 */
export const requestOf = (caseId: string) =>
  interviewRequests.find((r) => r.caseId === caseId) ?? null;

/**
 * 면담원.
 *
 * 명부(staffDirectory)에 「면담원」 역할이 없다 — StaffRoleId는 super·author·reviewer·
 * master 넷뿐이고 team은 자유 문자열이다. 그래서 명부를 새로 짓지 않고 **거르는 조건
 * 한 벌만** 여기 둔다. 화면마다 각자 걸러 내면 어느 날 조건이 갈린다.
 *
 * 씨앗 면담원이 이미 정태호(U-04)·이서연(U-05)이라 새 이름을 들이지 않는다. 같은 사람이
 * 두 이름으로 서면 안 된다. 지금 조건으로는 최하윤(U-42)·김유진(U-50)이 함께 걸려 넷이다.
 *
 * ⚠ lib/people.ts의 「이서연」은 교육과정 자문위원이라 동명이인이다. 저쪽과 잇지 않는다.
 *   일정이 면담원을 이름이 아니라 **번호로** 드는 까닭이 그것이다.
 *
 * ⚠ 조직이 바뀌어 이 조건에 열 명이 걸리면 고르개가 열 줄이 된다. 운영자 계정에 근무
 *   설정이 붙을 때까지는 이 조건이 임시다 — 그때 여기 한 곳만 고친다.
 */
export const interviewers = () =>
  staffDirectory.filter((s) => s.team === "평가팀" && s.role === "master" && s.state === "active");

/**
 * 번호로 찾는다.
 *
 * 걸러 낸 넷 안에서 찾지 않고 **명부 전체**에서 찾는다 — 팀을 옮긴 사람의 옛 일정이
 * 이름을 잃으면, 그 일정이 「미정」으로 보여 다시 잡게 된다.
 */
export const interviewerOf = (id?: string | null) =>
  id ? (staffDirectory.find((s) => s.id === id) ?? null) : null;

/**
 * 이름 문자열로만 들고 있던 옛 면담원을 번호로 되돌린다.
 *
 * 전문가 콘솔의 scheduleInterview가 면담원을 이름으로 받는다(lib/expertStore.ts). 이 길이
 * 없으면 씨앗 세 건(이서연·정태호)이 번호 없이 남아 겹침 검사와 면담원 거르개에서 통째로
 * 빠진다 — 이 화면이 내세운 값어치가 정작 옛 자료에는 안 걸린다.
 */
export const interviewerByName = (name?: string | null) =>
  name ? (staffDirectory.find((s) => s.name === name) ?? null) : null;
