/**
 * 연구·자문진 / AI 개발 / 문항 출제·검수 / 평가·채점 참여진.
 *
 * ⚠ 여기 담긴 인물 정보는 화면 설계를 위한 **예시 데이터**입니다.
 *   실제 인물이 아니며, 확정된 참여진 명단으로 교체해야 합니다.
 */

export type GroupId = "research" | "ai" | "item" | "assess";

export type PeopleGroup = {
  id: GroupId;
  label: string;
  short: string;
  desc: string;
  tone: string;
  dot: string;
};

export const peopleGroups: PeopleGroup[] = [
  {
    id: "research",
    label: "연구·자문진",
    short: "연구",
    desc: "재능 구인 정의, 진단 도구 설계, 타당화 연구를 총괄합니다.",
    tone: "bg-surface-blue text-brand-700",
    dot: "bg-brand-500",
  },
  {
    id: "ai",
    label: "AI 개발",
    short: "AI",
    desc: "채점·코딩 모델과 제안값 산출 파이프라인을 만들고 검증합니다.",
    tone: "bg-surface-violet text-accent-600",
    dot: "bg-accent-500",
  },
  {
    id: "item",
    label: "문항 출제·검수",
    short: "출제",
    desc: "학년별 성취기준에 맞춰 문항을 만들고, 별도 인력이 교차 검수합니다.",
    tone: "bg-surface-mint text-emerald-700",
    dot: "bg-emerald-500",
  },
  {
    id: "assess",
    label: "평가·채점",
    short: "평가",
    desc: "AI 1차 채점을 검토하고 케이스 회의에서 최종 판정을 확정합니다.",
    tone: "bg-surface-amber text-amber-700",
    dot: "bg-amber-500",
  },
];

export type Person = {
  id: string;
  name: string;
  role: string;
  group: GroupId;
  org: string;
  headline: string;
  /** 카드에 노출되는 전문 분야 태그 */
  tags: string[];
  bio: string;
  career: string[];
  works: string[];
  /** 이 사람이 GENIXX에서 실제로 맡는 일 */
  duty: string[];
};

export const people: Person[] = [
  {
    id: "kim-jiwon",
    name: "김지원",
    role: "책임연구원 · 진단 총괄",
    group: "research",
    org: "GENIXX 재능연구소",
    headline: "재능을 '등급'이 아니라 '발현 조건'으로 정의한 진단 체계의 설계자",
    tags: ["영재교육", "구인 타당도", "종단 연구"],
    bio: "학령기 아동의 재능 발현 조건을 15년간 추적해 온 연구자입니다. 재능을 고정된 능력치가 아니라 환경·과제·시점의 함수로 보는 관점을 GENIXX 진단 구조 전반에 적용했습니다.",
    career: [
      "교육학 박사 (영재교육 전공)",
      "국내 영재교육 종단연구 공동 연구원",
      "시·도 교육청 영재판별 도구 개발 자문",
      "GENIXX 재능연구소 책임연구원 (현)",
    ],
    works: [
      "8핵심재능 × S1~S4 처리위계 구인 정의",
      "학력 × 재능 직교 매트릭스 설계",
      "라벨링 방지 원칙(Article 7) 초안",
    ],
    duty: ["구인 정의와 진단 청사진 확정", "회차별 타당화 계획 수립", "판정 컷 최종 승인"],
  },
  {
    id: "park-hyunwoo",
    name: "박현우",
    role: "계량심리 총괄",
    group: "research",
    org: "GENIXX 심리측정팀",
    headline: "문항이 실제로 재고 있는지를 숫자로 증명하는 사람",
    tags: ["IRT", "DIF", "요인분석"],
    bio: "문항반응이론(IRT) 기반 문항 분석과 검사 등화를 담당합니다. 회차가 바뀌어도 같은 잣대로 잴 수 있도록 앵커 문항군을 관리합니다.",
    career: [
      "교육측정 박사",
      "대규모 학업성취도 평가 문항분석 참여",
      "검사 등화(equating) 실무 10년",
      "GENIXX 심리측정팀 총괄 (현)",
    ],
    works: [
      "IRT 문항 모수(a·b·c) 및 적합도 모니터링 체계",
      "성·지역·SES DIF 검출 절차",
      "회차 간 등화용 앵커 문항군 운영",
    ],
    duty: ["문항 품질 지표 관리", "타당도·신뢰도 공개 지표 산출", "판정 컷 시뮬레이션"],
  },
  {
    id: "lee-seoyeon",
    name: "이서연",
    role: "교육과정 자문위원",
    group: "research",
    org: "초등교육 연구회",
    headline: "초등 3·4학년이 읽을 수 있는 문장인지 끝까지 따지는 검수자",
    tags: ["초등 교육과정", "이독성", "특수교육 접근성"],
    bio: "20년 초등 교실 경험을 바탕으로 문항 발문과 지문의 이독성을 검토합니다. 특수교육 대상 학생도 같은 문항으로 응시할 수 있도록 접근성 요건을 설계했습니다.",
    career: [
      "초등학교 교사 20년",
      "교육과정 성취기준 개발 참여",
      "특수교육 통합학급 운영 연구",
      "GENIXX 교육과정 자문위원 (현)",
    ],
    works: ["학년별 이독성 기준표", "특수교육 대상 접근성 체크리스트", "아동용 눈높이 고지문 문안"],
    duty: ["발문·지문 이독성 검수", "아동 정서 적합성 판정", "접근성 요건 검토"],
  },

  {
    id: "jung-taeho",
    name: "정태호",
    role: "AI 총괄 · 모델 리드",
    group: "ai",
    org: "GENIXX AI Lab",
    headline: "AI가 어디까지 하고 어디서 멈춰야 하는지 선을 그은 사람",
    tags: ["NLP", "자동채점", "신뢰도 보정"],
    bio: "서술형 자동채점과 개방형 응답 코딩 모델을 개발합니다. 모델의 확신도가 낮은 응답을 자동으로 사람에게 넘기는 라우팅 구조를 설계해, AI 단독 판정이 일어나지 않도록 했습니다.",
    career: [
      "전산학 박사 (자연어처리)",
      "대형 언어모델 기반 교육 서비스 개발 리드",
      "자동채점 시스템 상용화 경험",
      "GENIXX AI Lab 총괄 (현)",
    ],
    works: [
      "서술형 1차 채점 모델 및 신뢰도 산출",
      "confidence 기준 저신뢰 자동 라우팅",
      "AI–인간 일치도(ICC) 추적 파이프라인",
    ],
    duty: ["채점·코딩 모델 개발", "제안값 산출 파이프라인 운영", "모델 성능·편향 정기 점검"],
  },
  {
    id: "han-narae",
    name: "한나래",
    role: "데이터 사이언티스트",
    group: "ai",
    org: "GENIXX AI Lab",
    headline: "네 갈래 정보원을 하나의 좌표로 합치는 사람",
    tags: ["멀티모달", "특성 설계", "실험 설계"],
    bio: "지필·SJT·설문·면담 네 정보원을 하나의 재능 좌표로 통합하는 특성 설계를 담당합니다. 심화진단의 음성·행동 시계열 처리도 맡고 있습니다.",
    career: [
      "통계학 석사",
      "멀티모달 학습 분석 연구",
      "교육 데이터 파이프라인 구축",
      "GENIXX AI Lab (현)",
    ],
    works: ["4원 정보 통합 특성 설계", "음향·행동 시계열 전처리", "회차 간 변화량(G-Graph) 산출"],
    duty: ["특성 설계와 통합 로직", "심화진단 신호 처리", "회차 데이터 품질 점검"],
  },
  {
    id: "song-junyoung",
    name: "송준영",
    role: "AI 윤리·검증 담당",
    group: "ai",
    org: "GENIXX AI Lab",
    headline: "만든 사람과 검증하는 사람을 분리해야 한다고 주장한 사람",
    tags: ["알고리즘 편향", "개인정보", "감사 추적"],
    bio: "모델을 개발한 사람이 스스로를 검증하지 못하도록 계정 권한과 절차를 분리했습니다. 아동 데이터 처리 원칙과 로그 수집 범위 고지문을 담당합니다.",
    career: [
      "정보보호 석사",
      "AI 윤리 가이드라인 수립 참여",
      "개인정보 영향평가 실무",
      "GENIXX AI Lab 검증 담당 (현)",
    ],
    works: ["개발자–검증자 권한 분리 구조", "L1~L3 로그 수집 범위 정의", "AI 이용 고지문 작성"],
    duty: ["모델 편향 정기 검증", "개인정보 처리 절차 감사", "이상 접근 모니터링"],
  },

  {
    id: "choi-eunbi",
    name: "최은비",
    role: "출제 워크벤치 리드",
    group: "item",
    org: "GENIXX 문항개발팀",
    headline: "AI가 뽑은 초안을 사람이 반드시 다시 쓰게 만든 편집자",
    tags: ["문항 개발", "이중 태깅", "문항은행"],
    bio: "AI 초안 생성부터 사람 편집·승인까지의 출제 흐름을 설계했습니다. 학력 내용축과 재능·인지과정축을 독립적으로 부착하는 이중 태깅 체계를 운영합니다.",
    career: [
      "교육과정·평가 석사",
      "교과서 및 평가문항 집필",
      "문항은행 운영 실무",
      "GENIXX 문항개발팀 리드 (현)",
    ],
    works: ["이중 태깅(Tag A × Tag B) 체계", "문항 회전·보안 정책", "검사지 조립 규칙"],
    duty: ["출제 발주서 작성", "AI 초안 편집·승인", "문항 버전 이력 관리"],
  },
  {
    id: "yoon-daehyun",
    name: "윤대현",
    role: "검수 총괄",
    group: "item",
    org: "GENIXX 문항검수팀",
    headline: "출제자와 절대 같은 팀에 두지 않는 3단 검증의 책임자",
    tags: ["내용 검수", "교차 태깅", "편향 점검"],
    bio: "내용 정확성, 태깅 일치도, 윤리·편향 세 단계로 나뉜 검수 절차를 총괄합니다. 태깅 일치도가 기준에 이를 때까지 조정을 반복합니다.",
    career: [
      "교육평가 박사 수료",
      "국가 수준 평가 검토위원",
      "문항 편향 분석 연구",
      "GENIXX 문항검수팀 총괄 (현)",
    ],
    works: ["3단 검수 프로토콜", "태깅 일치도(Kappa) 관리", "반려 사유 코드 체계"],
    duty: ["정답 유일성·발문 명료성 검수", "교차 태깅 조정", "편향·정서 적합성 판정"],
  },

  {
    id: "seo-minjeong",
    name: "서민정",
    role: "채점 워크벤치 리드",
    group: "assess",
    org: "GENIXX 평가운영팀",
    headline: "3학년의 문법이 어긋난 문장을 오답으로 만들지 않기 위해",
    tags: ["루브릭", "이중 채점", "저신뢰 검토"],
    bio: "AI 1차 채점 결과를 사람이 검토하는 큐를 운영합니다. 저학년 서술형은 문장이 미완성인 것이 일반적이므로, 신뢰도가 낮은 응답을 우선 배정하도록 설계했습니다.",
    career: [
      "국어교육 석사",
      "서술형 평가 채점위원",
      "루브릭 개발 실무",
      "GENIXX 평가운영팀 리드 (현)",
    ],
    works: ["3단 이상 루브릭 체계", "저신뢰 자동 배정 기준", "이중 채점 표본 설계"],
    duty: ["AI 채점 결과 검토", "루브릭 적용·조정", "채점자 간 일치도 관리"],
  },
  {
    id: "im-doyoon",
    name: "임도윤",
    role: "판정 협진 · 케이스 컨퍼런스 의장",
    group: "assess",
    org: "GENIXX 평가운영팀",
    headline: "확신이 서지 않으면 판정하지 않고 다음 회차로 넘기는 원칙의 수호자",
    tags: ["케이스 회의", "면담", "경계선 유보"],
    bio: "AI 제안값을 놓고 여러 분야 전문가가 함께 판정하는 케이스 회의를 진행합니다. 판정 컷 경계에 있는 사례는 확정하지 않고 재관찰로 넘기는 절차를 만들었습니다.",
    career: [
      "상담심리 박사",
      "아동·청소년 심리평가 15년",
      "구조화 면담 프로토콜 개발",
      "GENIXX 평가운영팀 (현)",
    ],
    works: ["케이스 카드 6셀 구조", "경계선 유보·재관찰 절차", "구조화 면담 프로토콜"],
    duty: ["케이스 회의 진행", "최종 판정 확정·전자서명", "리포트 발행 승인"],
  },
];

export function peopleOf(group: GroupId) {
  return people.filter((p) => p.group === group);
}

export function personById(id: string) {
  return people.find((p) => p.id === id);
}

export function groupOf(id: GroupId) {
  return peopleGroups.find((g) => g.id === id)!;
}

/** 프로필이 예시 데이터임을 알리는 고지 문구 */
export const peopleDisclaimer =
  "아래 참여진 정보는 화면 설계를 위한 예시 데이터입니다. 실제 인물이 아니며, 확정된 명단으로 교체할 예정입니다.";
