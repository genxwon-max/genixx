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
    summary: "받게 될 결과지를 가입 전에 미리 봅니다",
    children: [
      {
        id: "PUB-04-1",
        label: "샘플 PDF 뷰어",
        href: "/sample/report",
        desc: "정밀본 한 면 미리보기",
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
  {
    id: "PUB-08-6",
    label: "운영정책",
    href: "/legal/operation",
    desc: "회차 운영·정정·제재의 실제 기준",
  },
  {
    id: "PUB-08-7",
    label: "청소년보호정책",
    href: "/legal/youth",
    desc: "이용자 대부분이 미성년자라 전제로 두는 것",
  },
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
 * 커뮤니티 — 공지사항 · 자유게시판 · 오시는 길.
 *
 * menu에 바로 넣지 않고 따로 두는 까닭: menu는 다른 시안 홈(home3·4·5)의 헤더·푸터도
 * 읽는데, 그쪽 메가메뉴는 여섯 칸 격자에 맞춰 그려져 있어 일곱째 갈래가 들어가면 줄이
 * 깨진다. 공개 사이트((site) 존)의 머리띠·푸터만 siteMenu를 읽는다.
 */
export const communityGroup: MenuGroup = {
  id: "PUB-09",
  label: "커뮤니티",
  href: "/community",
  summary: "공지사항 · 자유게시판 · 오시는 길",
  children: [
    {
      id: "PUB-09-1",
      label: "공지사항",
      href: "/community/notice",
      desc: "회차 일정·점검 안내",
    },
    {
      id: "PUB-09-2",
      label: "자유게시판",
      href: "/community/board",
      desc: "보호자·기관 회원이 나누는 이야기",
    },
    {
      id: "PUB-09-3",
      label: "오시는 길",
      href: "/community/location",
      desc: "주소와 연락처",
    },
  ],
};

/** 공개 사이트((site) 존) 머리띠·푸터의 갈래 */
export const siteMenu: MenuGroup[] = [...menu, communityGroup];

/**
 * 갈래 첫 화면 — 헤더에서 갈래 이름을 누르면 여기로 간다.
 * 갈래마다 따로 두던 모음(허브) 화면은 걷었다. 하위 화면이 히어로 밑 탭 줄로 서로
 * 이어져 있어, 카드로 한 번 더 고르게 하는 화면이 중간에 끼면 한 번 더 누르게만 된다.
 */
export function firstPageOf(groupHref: string) {
  return siteMenu.find((g) => g.href === groupHref)!.children[0].href;
}

/**
 * 푸터 맨 위 정책 띠 — 공개 사이트와 계정 존이 같은 목록을 쓴다.
 *
 * legalLinks와 따로 두는 까닭은 이 띠가 「법적 고지 모음」이 아니라 **푸터에서 늘
 * 같은 자리에 서는 줄**이기 때문이다. 그래서 법적 고지가 아닌 회사소개와 광고제휴가
 * 여기 함께 서고, 순서도 국내 서비스가 관행처럼 쓰는 차례를 따른다.
 *
 * 개인정보처리방침만 굵게 세운다. 다른 것보다 중요해서가 아니라 표시 의무다.
 *
 * AI 이용·행동로그 고지와 아동용 눈높이 고지는 이 띠에 세우지 않는다. 둘 다 이
 * 서비스에만 있는 고지라 관행의 차례에 끼면 줄만 길어지고, 정작 읽어야 할 사람은
 * 푸터를 훑다가 만나는 것이 아니라 동의 화면과 결과 화면에서 만난다. 문서는 그대로
 * 남아 있고 /legal 허브(legalLinks)에서 찾을 수 있다.
 */
export const policyLinks: { href: string; label: string; strong?: boolean }[] = [
  { href: "/about", label: "회사소개" },
  { href: "/legal/terms", label: "이용약관" },
  { href: "/legal/operation", label: "운영정책" },
  { href: "/legal/privacy", label: "개인정보처리방침", strong: true },
  { href: "/legal/youth", label: "청소년보호정책" },
  { href: "/partner/ads", label: "광고제휴" },
  { href: "/legal/refund", label: "환불·청약철회 규정" },
];

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
 *   가입 화면은 "학생 / 학부모·법정대리인 / 기관 담당자" 세 갈래로 열린다. 예전 사이트맵이
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
      "만 14세 이상이면 학생이 직접 가입해 본인 동의로 응시합니다. 만 14세 미만은 학생 혼자 가입을 끝낼 수 없고, 법정대리인 동의가 확인되면 프로필이 열립니다. 그때는 8자리 접속코드와 생년월일로 응시 화면에 들어갑니다.",
    tone: "bg-surface-sky text-brand-600",
    badge: "만 14세 이상 본인 가입",
  },
] as const;

export type MemberTypeId = (typeof memberTypes)[number]["id"];
