/**
 * 헤더/푸터 메뉴 정의.
 * 출처: GENIXX 플랫폼 사이트맵·메뉴 정의서 — 4장 공개 존(PUB) / 5장 계정 존(ACC).
 * 화면 ID를 주석으로 남겨 후속 기능정의서와 대조할 수 있게 한다.
 */

export type SubMenu = {
  id: string; // 사이트맵 화면 ID
  label: string;
  href: string;
  desc: string;
};

export type MenuGroup = {
  id: string;
  label: string;
  href: string;
  summary: string;
  children: SubMenu[];
};

export const menu: MenuGroup[] = [
  {
    id: "PUB-02",
    label: "GENIXX 소개",
    href: "/about",
    summary: "우리가 무엇을 재능이라 부르고, 그것을 어떻게 확인하는지",
    children: [
      {
        id: "PUB-02-1",
        label: "우리가 보는 재능",
        href: "/about/talent",
        desc: "8핵심재능 × S1~S4 처리위계로 정의한 '재능'",
      },
      {
        id: "PUB-02-2",
        label: "진단 원리 (HITL)",
        href: "/about/hitl",
        desc: "AI 1차 분석 → 교육전문가 협진 확정의 2단 구조",
      },
      {
        id: "PUB-02-3",
        label: "이론적 근거",
        href: "/about/theory",
        desc: "Renzulli · Gardner · Gagné · OECD 역량 프레임",
      },
      {
        id: "PUB-02-4",
        label: "진단 윤리 헌장",
        href: "/about/charter",
        desc: "라벨링 방지 원칙과 Article 7 전문",
      },
      {
        id: "PUB-02-5",
        label: "참여진 소개",
        href: "/about/team",
        desc: "연구·AI 개발·출제·평가 참여자와 이력",
      },
    ],
  },
  {
    id: "PUB-03",
    label: "진단 서비스",
    href: "/service",
    summary: "학력진단(무료)에서 성장추적까지 4단계 사다리",
    children: [
      {
        id: "PUB-03-1",
        label: "학력진단 (무료)",
        href: "/service/academic",
        desc: "국어·수학·과학 3과목 간이 진단",
      },
      {
        id: "PUB-03-2",
        label: "재능진단 1단계",
        href: "/service/talent-base",
        desc: "지필 + SJT + 설문 + 면담 4원 검증",
      },
      {
        id: "PUB-03-3",
        label: "심화진단 2단계",
        href: "/service/talent-advanced",
        desc: "음향·신체·사회관계 멀티모달 수행과제",
      },
      {
        id: "PUB-03-4",
        label: "성장추적 3단계",
        href: "/service/tracking",
        desc: "연 4회 회차 구독 · G-Graph 시계열",
      },
      {
        id: "PUB-03-5",
        label: "요금 안내",
        href: "/service/pricing",
        desc: "단품 · 패키지 · 구독 요금",
      },
    ],
  },
  {
    id: "PUB-04",
    label: "샘플 리포트",
    href: "/sample",
    summary: "결과지 전 페이지를 가입 전에 공개합니다",
    children: [
      {
        id: "PUB-04-1",
        label: "샘플 PDF 뷰어",
        href: "/sample/report",
        desc: "전 페이지 공개 · 다운로드 가능",
      },
      {
        id: "PUB-04-2",
        label: "대시보드 데모",
        href: "/sample/demo",
        desc: "GeniusMap · 직교 매트릭스 조작 체험",
      },
      {
        id: "PUB-04-3",
        label: "문항 미리보기",
        href: "/sample/questions",
        desc: "과목별 예시 문항 · 응시 화면 구성 공개",
      },
    ],
  },
  {
    id: "PUB-05",
    label: "콘텐츠",
    href: "/insight",
    summary: "재능 해설 · 양육 가이드 · 연구노트",
    children: [
      {
        id: "PUB-05-1",
        label: "재능 이야기",
        href: "/insight/column",
        desc: "재능 영역별 해설 칼럼",
      },
      {
        id: "PUB-05-2",
        label: "양육 가이드",
        href: "/insight/parenting",
        desc: "발현 조건(양육 촉매) 기반 실천 가이드",
      },
      {
        id: "PUB-05-3",
        label: "연구노트·백서",
        href: "/insight/research",
        desc: "타당화 결과 · 통계 지표 공개",
      },
      {
        id: "PUB-05-4",
        label: "공지·보도자료",
        href: "/insight/news",
        desc: "회차 공지 · 파일럿 모집 안내",
      },
    ],
  },
  {
    id: "PUB-06",
    label: "고객지원",
    href: "/support",
    summary: "문의 · FAQ · 학부모 설명회",
    children: [
      { id: "PUB-06-1", label: "FAQ", href: "/support/faq", desc: "5개 카테고리 자주 묻는 질문" },
      {
        id: "PUB-06-2",
        label: "1:1 문의",
        href: "/support/inquiry",
        desc: "비회원도 이메일 인증으로 문의 가능",
      },
      {
        id: "PUB-06-3",
        label: "학부모 설명회 영상",
        href: "/support/orientation",
        desc: "5~7분 FAQ형 안내 영상",
      },
    ],
  },
  {
    id: "PUB-07",
    label: "파트너",
    href: "/partner",
    summary: "학교·학원·교육청 도입과 해석 전문가 과정",
    children: [
      {
        id: "PUB-07-1",
        label: "기관 도입 문의",
        href: "/partner/contact",
        desc: "교육청·학교·학원·영재교육원 대상",
      },
      {
        id: "PUB-07-2",
        label: "인증 해석 전문가 과정",
        href: "/partner/certification",
        desc: "수료증 = 결과 해석·상담 권한",
      },
    ],
  },
];

/** 푸터 하단 법적 고지 (PUB-08) */
export const legalLinks: SubMenu[] = [
  { id: "PUB-08-1", label: "이용약관", href: "/legal/terms", desc: "서비스 이용 조건" },
  {
    id: "PUB-08-2",
    label: "개인정보처리방침",
    href: "/legal/privacy",
    desc: "보관 5년 후 자동 파기",
  },
  {
    id: "PUB-08-3",
    label: "아동용 눈높이 고지",
    href: "/legal/privacy-kids",
    desc: "아이가 읽을 수 있는 문장으로 쓴 안내",
  },
  {
    id: "PUB-08-4",
    label: "AI 이용·행동로그 고지",
    href: "/legal/ai-notice",
    desc: "AI 채점 범위와 사람 최종 확정 원칙",
  },
  { id: "PUB-08-5", label: "환불·청약철회 규정", href: "/legal/refund", desc: "전자상거래법 기준" },
];

/**
 * 정책·법적 고지(PUB-08)를 다른 갈래와 같은 모양으로 묶은 것.
 * 사이트맵 8장은 원래 푸터 전용이지만, 새 홍보 헤더는 공개 존 일곱 갈래를
 * 모두 헤더에서 찾을 수 있게 하기로 해서 여기서 MenuGroup으로 승격한다.
 */
export const legalGroup: MenuGroup = {
  id: "PUB-08",
  label: "정책·법적 고지",
  href: "/legal",
  summary: "약관·개인정보·AI 이용 고지를 한자리에서",
  children: legalLinks,
};

/** 공개 존(PUB) 일곱 갈래 전체 — 새 홍보 헤더가 쓴다 */
export const publicMenu: MenuGroup[] = [...menu, legalGroup];

/**
 * 헤더 상단 유틸 바로 내리는 갈래.
 *
 * 일곱을 한 줄에 늘어놓으면 1240px 컨테이너에서 로고·CTA와 부딪친다. 학부모가
 * 처음 찾는 넷(소개·서비스·샘플·콘텐츠)만 주 메뉴에 두고, 필요할 때 찾아가는
 * 셋은 위 얇은 줄로 올린다. 감추는 게 아니라 층을 나누는 것이다.
 */
export const utilMenuIds: string[] = ["PUB-06", "PUB-07", "PUB-08"];

/**
 * 회원 유형.
 * ⚠ 가입 화면(ACC-01-1)이 쓰는 정본은 `lib/account.ts`의 `signupTypes`다.
 *   사이트맵 5장이 "학부모 / 교사 / 기관담당자 3분기, 학생은 독립 가입 경로 없음"으로
 *   정하고 있어 학생 항목을 두지 않는다. 여기 목록은 홍보 페이지 설명용으로만 남긴다.
 */
export const memberTypes = [
  {
    id: "parent",
    label: "학부모",
    tagline: "자녀의 진단을 신청하고 결과를 열람합니다",
    detail: "서비스의 대표 회원입니다. 한 계정에 자녀를 여러 명 등록할 수 있습니다.",
    tone: "bg-surface-blue text-brand-700",
    badge: "가장 많이 선택",
  },
  {
    id: "teacher",
    label: "학교·교사",
    tagline: "학급 학생의 관찰 설문을 입력합니다",
    detail: "소속 기관 관리자의 승인 후 활성화됩니다. 승인 전에는 학생 데이터에 접근할 수 없습니다.",
    tone: "bg-surface-mint text-emerald-700",
    badge: "승인 필요",
  },
  {
    id: "org",
    label: "기관·학원",
    tagline: "학원·학교·교육청 단위로 운영합니다",
    detail: "학생 명부와 접속코드, 응시권·정산을 관리합니다. 사업자 정보 확인 후 계정이 개설됩니다.",
    tone: "bg-surface-amber text-amber-700",
    badge: "B2B",
  },
  {
    id: "student",
    label: "학생",
    tagline: "발급받은 접속코드로 응시합니다",
    detail:
      "학생은 따로 가입하지 않습니다. 보호자 계정 안의 프로필로 등록되고, 8자리 접속코드와 생년월일로 응시 화면에 들어갑니다. 만 14세 이상이면 동의를 본인이 하되 계정은 그대로 보호자 계정 하나입니다.",
    tone: "bg-surface-sky text-brand-600",
    badge: "가입 없음",
  },
] as const;

export type MemberTypeId = (typeof memberTypes)[number]["id"];
