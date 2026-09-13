import { approvals, gradingQueue, inquiries, type CaseState, type OrgRow, type RoundState } from "./admin";
import type { ExamState, UserState } from "./adminUsers";
import type { FormState } from "./formStore";
import type { DeskState } from "./interviewStore";
import type { ItemState } from "./itemStore";

/**
 * /admin2 — 슈퍼 관리자 콘솔의 뼈대 정의.
 *
 * 기존 /admin의 adminMenu(6그룹 · 20여 화면 · 하위 4단)를 그대로 쓰지 않는다. 저쪽은
 * 네 역할이 함께 쓰는 메뉴라 「출제자에게는 검수가 안 보인다」 같은 가림 규칙이 얹혀
 * 있고, 하위 4단까지 내려간다. 이 콘솔은 **슈퍼 관리자 한 사람**만 쓰므로 가릴 것이
 * 없고, 대신 한 화면에서 다음 화면으로 넘어가는 속도가 전부다. 그래서 12개를 4그룹
 * **한 단**으로만 편다.
 *
 * 처음에는 넷을 전부 펴 두고 접지 않았다. 열둘이 한 줄로 꿰여 내려가니 그룹이 갈리는
 * 자리가 자간 하나에만 걸려 있어서 기둥을 훑기가 어려웠다. 지금은 그룹 머리를 눌러
 * 접는다(components/admin2/Shell.tsx) — 접히는 것은 이 한 단뿐이고, 그 아래로 더
 * 들어가는 단은 여전히 만들지 않는다.
 *
 * 화면 ID(ADM-xx · EXP-xx)는 사이트맵과 대조할 수 있게 그대로 달아 둔다.
 */
export type Admin2NavItem = {
  /** 사이트맵 화면 ID */
  code: string;
  label: string;
  href: string;
  /** 오른쪽 끝에 세우는 대기 건수. 0이면 그리지 않는다 */
  count?: number;
  /** 하위 경로까지 현재 위치로 칠할지 — /admin2는 정확히 일치할 때만 */
  exact?: boolean;
  /**
   * 브라우저 저장소에서만 셀 수 있는 배지.
   *
   * 문항은 lib/itemStore.ts가 localStorage에 들고 있어 서버에서 세지 못한다. 여기
   * count에 서버에서 센 값을 박아 두면 기둥의 숫자와 그 화면의 줄 수가 갈린다 —
   * 표시만 하고 값은 껍데기(Shell)가 살아 있는 목록에서 채운다.
   *
   *   drafts  작성 중 + 반려됨 — 출제 화면에 서 있는 줄 수
   *   review  검수 대기 — 검수 화면에 서 있는 줄 수
   */
  live?: "drafts" | "review" | "approvals" | "grading" | "interviews";
};

export type Admin2NavGroup = {
  label: string;
  items: Admin2NavItem[];
};

/** 지금 손이 가야 하는 건수 — 기둥의 숫자와 대시보드의 「내 앞에 쌓인 것」이 같은 값을 쓴다 */
export const queueCounts = {
  /** 판정 큐에서 아직 사람이 확정하지 않은 것 */
  cases: gradingQueue.filter((c) => c.state === "ai" || c.state === "review" || c.state === "conference").length,
  approvals: approvals.length,
  inquiries: inquiries.filter((i) => i.state !== "answered").length,
  /* 확정됐지만 아직 발행 전인 것. lib/admin.ts의 pending.reports(4)는 손으로 박은 값이라
     눌러서 가는 화면의 어떤 숫자와도 맞지 않았다 — 목록에서 직접 센다. */
  reports: gradingQueue.filter((c) => c.state === "confirmed").length,
};

export const admin2Nav: Admin2NavGroup[] = [
  {
    label: "운영",
    items: [
      { code: "ADM-01", label: "대시보드", href: "/admin2", exact: true },
      { code: "EXP-07", label: "판정 큐", href: "/admin2/queue", count: queueCounts.cases },
    ],
  },
  {
    label: "회원",
    items: [
      { code: "ADM-02", label: "회원", href: "/admin2/members" },
      { code: "ADM-02-1", label: "학생·접속코드", href: "/admin2/students" },
      /* ADM-07은 사이트맵에서 「심리측정 분석」이다(lib/admin.ts). 기관은 ORG-02 */
      { code: "ORG-02", label: "기관", href: "/admin2/orgs" },
      /* 처리한 신청은 브라우저 저장소에만 남아(lib/approvalStore.ts) 서버에서 셀 수
         없다. 서버 값으로 박아 두면 다섯 건을 다 처리하고도 기둥은 계속 5라고 말한다 */
      { code: "ADM-02-2", label: "가입 승인", href: "/admin2/approvals", live: "approvals" },
      /* 동의와 파기는 명부 옆에 둔다 — 「이 회원이 무엇에 동의했나」는 회원을 보다가
         드는 물음이고, 파기 대상도 결국 이 명부의 줄이다. 보안 그룹에 두면 개인정보를
         고치러 온 사람이 시스템 설정부터 뒤진다 */
      { code: "ADM-10", label: "개인정보 관리", href: "/admin2/privacy" },
      /* 파기는 명부에서 뗀다. 저 화면은 회원을 찾으러 매일 열고 이 화면은 지울 때만
         여는데, 한 장에 두면 훑으러 온 사람이 늘 되돌릴 수 없는 단추 옆을 지난다 */
      { code: "ADM-10-1", label: "파기 스케줄러", href: "/admin2/privacy/purge" },
    ],
  },
  {
    /*
     * 문항을 셋으로 편다 — 쓰는 자리 · 보는 자리 · 쌓인 자리.
     *
     * 한동안 문항 상세 한 장에 출제와 검수를 다 넣고 기둥에는 문항 은행만 세웠다. 화면
     * 수로는 그쪽이 적지만, 기둥에서 「지금 검수할 게 몇 개인가」를 볼 자리가 없어서 은행에
     * 들어가 상태 거르개를 걸어야 알 수 있었다. 매일 여는 두 가지 일(쓰기·검수)이 목록으로
     * 서 있지 않으면 그 일이 없는 것처럼 보인다.
     *
     * 고치는 자리는 여전히 문항 상세 하나다. 출제·검수 화면은 「무엇부터 여나」만 답하고,
     * 실제로 채우고 짚는 일은 상세에서 한다 — 워크벤치를 둘로 갈라 같은 문항을 두 화면에서
     * 다르게 그리는 일은 만들지 않는다.
     */
    label: "문항관리",
    items: [
      { code: "EXP-02", label: "문항 출제", href: "/admin2/authoring", live: "drafts" },
      { code: "EXP-03", label: "문항 검수", href: "/admin2/review", live: "review" },
      { code: "ADM-04", label: "문항 은행", href: "/admin2/items" },
    ],
  },
  {
    /*
     * 한 번의 평가가 나가기까지 손대는 것 셋.
     *
     *   평가 회차        언제 여는가 · 어떤 학년군과 과목을 보는가
     *   평가별 문항관리   회차마다 과목별 검사지가 어디까지 짜였는가 · 문항을 담는 자리
     *
     * 「평가 과목」 화면은 뺐다. 과목은 회차마다 정하는 값이 되어(회차 생성·편성 화면의
     * PlanPicker) 따로 볼 목록이 없어졌다 — 과목별 문항 재고는 그 고르는 자리에서 바로
     * 옆에 서고, 어느 회차에 나가는지는 평가별 문항관리가 이미 답한다.
     *
     * 문항관리 **바로 아래**에 둔다. 일이 그 차례로 흐르기 때문이다 — 쓰고(출제) 보고(검수)
     * 쌓은(은행) 문항을 골라 회차에 담는다. 두 그룹을 떼어 놓으면 그 흐름이 기둥에서 끊긴다.
     *
     * 「회차·응시」가 운영 그룹에 있던 것을 여기로 옮겼다. 회차를 여닫는 일은 운영이지만
     * 그 회차에 무엇을 내보낼지 짜는 일과 같은 화면에서 이어지므로, 두 그룹에 갈라 두면
     * 편성하다가 기둥을 위아래로 오간다. 옮기면서 이름도 「평가 회차」로 맞췄다 —
     * 아래 둘이 「평가 …」이고 저것만 「회차」면 셋이 한 갈래로 안 읽힌다.
     *
     * ⚠ 두 곳에 같은 화면을 두지 않는다. 운영 그룹에 남겨 두고 여기에도 세우면 같은 회차를
     *   두 자리에서 열게 되고, 어느 쪽이 진짜인지 묻는 사람이 생긴다.
     */
    label: "평가 관리",
    items: [
      { code: "ADM-05", label: "평가 회차", href: "/admin2/rounds" },
      { code: "ADM-04-3", label: "평가별 문항관리", href: "/admin2/forms" },
    ],
  },
  {
    /*
     * 평가가 끝난 뒤의 자리.
     *
     * 문항관리 → 평가 관리 다음에 둔다. 일이 그 차례로 흐르기 때문이다 — 문항을 써서
     * 회차에 담아 내보내고, 걷힌 응답을 채점한다. 채점이 끝나야 판정(운영 그룹의 판정
     * 큐)이 설 수 있다.
     *
     * 「AI 채점 결과 검토」와 「루브릭 채점」은 한 화면이다. 둘은 같은 일의 앞뒤라 —
     * 「AI가 부분정답이라 했는데 맞나」를 보는 순간이 곧 루브릭을 대는 순간이다 — 화면을
     * 가르면 같은 응답을 두 자리에서 두 번 연다.
     */
    label: "채점 관리",
    items: [
      /*
       * 같은 자료를 둘로 나눠 본다 — 무엇을 묻느냐가 다르기 때문이다.
       *
       *   평가 채점  「지금 봐야 하는 응답이 무엇인가」. 단위가 **응답**이라 확신도가
       *              낮은 것부터 훑는다. 한 아이의 국어는 0.92인데 수학은 0.52일 수 있고,
       *              사람이 볼 것은 뒤의 것뿐이다.
       *   회원 채점  「이 아이에게 무엇을 돌려주는가」. 단위가 **사람**이라 답안지를
       *              통째로 펴 놓고 배점을 손보고 해설을 붙인다. 리포트에 실리는 것이
       *              응답 하나가 아니라 이 한 장이기 때문이다.
       *
       * 자료는 하나다(lib/expertStore.ts). 저쪽에서 확정한 값이 이쪽 답안지에 그대로
       * 서고, 이쪽에서 고친 배점이 저쪽 목록에 그대로 선다.
       */
      /* exact를 주지 않는다 — 채점대(/admin2/grading/SC-…)에서도 이 항목이 켜져야 한다.
         회원 채점과 겹치는 것은 껍데기가 「가장 긴 주소가 이긴다」로 가른다 */
      { code: "EXP-04", label: "평가 채점", href: "/admin2/grading", live: "grading" },
      { code: "EXP-04-1", label: "회원 채점", href: "/admin2/grading/members" },
    ],
  },
  {
    /*
     * 지필로 재지 못한 것을 사람이 직접 묻는 자리.
     *
     * 채점 관리 **바로 다음**에 둔다. 일이 그 차례로 흐르기 때문이다 — 걷힌 응답을 채점하고,
     * 거기서 걸린 아이를 만나고, 그 둘을 합쳐 판정한다(운영 그룹의 판정 큐). 협진의 서명
     * 근거 문자열에 면담 번호가 itv=…로 굳혀 들어가므로(lib/expertStore.ts의 basisOf)
     * 이 그룹이 빠지면 저 문자열이 가리키는 자리가 콘솔에 없다.
     *
     * ── 왜 제 그룹인가 ──
     * 처음에는 운영 그룹에 두 항목을 끼워 넣었다. 그랬더니 그 그룹이 「대시보드 · 면담 관리 ·
     * 면담 일정 · 판정 큐 · 문의」 다섯이 되면서, 매일 훑는 큐 셋 사이에 면담 둘이 끼어
     * 기둥에서 「오늘 밀린 것」을 세는 눈이 한 번 걸렸다. 면담은 큐가 아니라 **사람과 시간을
     * 맞추는 일**이라 성격이 다르고, 화면도 둘이라 접었다 폈다 할 값이 있다.
     *
     * ── 두 화면인 까닭 ──
     * 자료는 하나인데 묻는 것이 다르다. 「평가 채점 / 회원 채점」과 같은 가름이다.
     *
     *   면담 신청  누구부터 잡나 — 단위가 케이스라 상태와 대기 일수로 세운다
     *   면담 일정  어느 날이 비었나 — 단위가 날짜라 달력으로 편다
     *
     * ⚠ 신청 쪽에 exact를 주지 않는다 — 면담 상세(/admin2/interviews/IV-…)에서도 이 항목이
     *   켜져야 한다. 일정(/admin2/interviews/calendar)과 겹치는 것은 껍데기가 「가장 긴
     *   주소가 이긴다」로 가른다.
     *
     * ⚠ 배지가 count가 아니라 live인 까닭은 신청과 일정이 브라우저 저장소에만 있어 서버에서
     *   셀 수 없기 때문이다. 서버 값을 박아 두면 여덟 건을 다 잡고도 기둥은 계속 8이라고 말한다.
     */
    label: "면담 관리",
    items: [
      { code: "EXP-06", label: "면담 신청", href: "/admin2/interviews", live: "interviews" },
      { code: "EXP-06-1", label: "면담 일정", href: "/admin2/interviews/calendar" },
    ],
  },
  {
    /*
     * 평가가 다 끝난 뒤에 나가는 것 — 리포트에 조립되는 문구와 그 문구를 부르는 규칙.
     *
     * 면담 관리 **다음**에 둔다. 일이 그 차례로 흐르기 때문이다 — 채점하고, 걸린 아이를
     * 만나고, 그 둘을 판정해서, 리포트로 내보낸다. 기둥에서 그 차례가 끊기면 「리포트가
     * 무엇으로 만들어지는가」를 묻는 사람이 위아래를 오간다.
     *
     * ── 왜 「리포트 관리」인가 ──
     * 사이트맵의 이름은 「리포트 자산」(ADM-08)이다. 그 말은 문구·활동·자원을 자산으로
     * 쌓아 두는 창고라는 뜻인데, 기둥에 세워 보니 무엇을 하는 자리인지가 안 읽혔다 —
     * 「자산」은 회계 쪽 말로도 읽힌다. 하는 일 그대로 「리포트 관리」로 적는다. 화면 ID는
     * 정의서와 대조할 수 있게 ADM-08 그대로 둔다.
     *
     * ── 두 화면인 까닭 ──
     * 자료는 하나인데 고치는 결이 다르다.
     *
     *   해석 템플릿  아이에게 나가는 **글**을 쓴다. 단위가 문장이고, 학년대마다 다르다
     *   조립 규칙    그 글을 **언제 부를지**를 정한다. 단위가 조건이고, 학년과 무관하다
     *
     * 한 화면에 두면 문장을 다듬으러 온 사람이 조건 숫자 옆을 지나게 되고, 그 숫자는
     * 잘못 건드리면 리포트가 통째로 달라지는 값이다.
     *
     * ⚠ 활동 모듈 DB(ADM-08-2)와 추천 자원 DB(ADM-08-3)는 아직 세우지 않는다. 활동 제안은
     *   지금 해석 템플릿의 한 자리(slot: activity)로 들어가 있고, 그것을 따로 뗄 만큼
     *   자원이 쌓이지 않았다. 쌓이면 이 그룹에 항목을 더한다.
     *
     * ── 승인을 여기 둔 까닭 ──
     * 처음에는 「저것은 아이 하나하나를 넘기는 큐이니 운영 그룹으로 간다」고 적어 두고 뺐다.
     * 세우고 보니 아니었다. 승인 화면에서 문구가 이상한 것을 발견하면 곧바로 해석 템플릿을
     * 고치러 가고, 블록이 왜 붙었는지 궁금하면 조립 규칙을 연다 — 셋이 한 몸으로 쓰인다.
     * 큐라는 성격 하나 때문에 그 왕복을 기둥 위아래로 늘어뜨릴 까닭이 없다. 그리고 이 그룹의
     * 이름이 「리포트 관리」인데 정작 리포트가 나가는 자리가 딴 데 있는 것도 이상했다.
     *
     * 차례는 나가는 것이 먼저다. 매일 여는 것은 승인이고, 템플릿과 규칙은 무언가 잘못됐을 때
     * 여는 자리다.
     */
    label: "리포트 관리",
    items: [
      { code: "EXP-08", label: "리포트 승인", href: "/admin2/reports/approval" },
      { code: "ADM-08-1", label: "해석 템플릿", href: "/admin2/reports/templates" },
      { code: "ADM-08-4", label: "조립 규칙", href: "/admin2/reports/rules" },
    ],
  },
  {
    /*
     * 사람에게 나가는 글 셋.
     *
     *   공지          사이트 공지 — 회차 모집·점검 같은 안내
     *   자주 묻는 질문  고객지원(PUB-06-1)과 홈이 읽는 목록
     *   문의          그래도 들어온 물음에 한 사람씩 답하는 자리
     *
     * 여태 앞의 둘은 화면 파일에 박혀 있어 운영자가 손댈 수 없었다(components/site/
     * HomeFaq.tsx · app/(site)/support/faq/page.tsx). 글을 고치러 온 사람이 두 군데를
     * 다르게 찾아가는 셈이라 한 그룹으로 모은다.
     *
     * 문의를 여기 들인 뒤로 이 그룹은 「미리 적어 두는 것 둘 + 그래도 들어온 것 하나」가
     * 되었다. 셋이 한 흐름으로 읽힌다 — 답을 쓰다가 자주 묻는 질문에 올리고, 올린 글을
     * 링크해 답한다.
     *
     * ⚠ 회차 공지·유의사항은 여기 두지 않는다. 그것은 회차마다 붙는 말이고 고치는 자리가
     *   회차 편성(ADM-05-4)에 이미 있다 — 보기만 하는 목록을 여기 하나 더 세우면, 고치러
     *   들어왔다가 「여기서는 왜 안 고쳐지지」를 한 번 겪고 나서야 저쪽으로 간다.
     */
    label: "콘텐츠",
    items: [
      { code: "ADM-15", label: "공지", href: "/admin2/notices" },
      { code: "ADM-15-1", label: "자주 묻는 질문", href: "/admin2/faq" },
      /*
       * 문의는 자주 묻는 질문 **바로 아래**에 둔다.
       *
       * 한동안 운영 그룹에 두었다. 하는 일이 판정 큐와 같은 큐라는 것이 그때의 이유였는데,
       * 실제로 손이 오가는 자리는 저쪽이 아니라 여기였다 — 같은 물음이 두세 번 들어오면
       * 답을 자주 묻는 질문에 올리고, 올린 뒤에는 그 글을 링크해 답한다. 두 화면을 오가는
       * 일이 잦은데 기둥의 맨 위와 맨 아래에 갈라 두면 그 왕복이 화면 높이만큼 길어진다.
       *
       * 차례는 「무엇을 미리 적어 두었나 → 그래도 들어온 물음」이다. 답을 쓰다가 「이건
       * 아예 올려 두자」로 이어지는 것이 이 두 화면이 함께 서는 까닭이라, 올려 두는 자리가
       * 먼저 선다.
       *
       * ⚠ 배지는 그대로 둔다. 밀린 문의 수는 매일 보는 값이고, 그룹을 옮긴다고 그 성격이
       *   바뀌지는 않는다.
       */
      { code: "ADM-10", label: "문의", href: "/admin2/inquiries", count: queueCounts.inquiries },
    ],
  },
  {
    /*
     * 파는 것과 들어온 돈, 둘.
     *
     *   상품 관리   무엇을 얼마에 파는가 — 등록하고 고치는 자리
     *   결제 내역   그래서 얼마가 들어왔는가 — 읽기만 하는 자리
     *
     * 둘을 한 그룹에 둔 것은 언제나 같이 열리기 때문이다. 매출이 꺾이면 어느 상품이
     * 꺾였는지를 묻고, 상품 값을 고치면 그 뒤로 매출이 어떻게 되었는지를 묻는다.
     *
     * 결제는 이 콘솔에서 **읽기만 한다.** 승인·취소·환불은 결제대행사에서 일어나고
     * 여기로는 결과만 넘어온다 — 그래서 결제 화면에는 줄마다 누를 것이 없다. 항목 이름을
     * 「결제 관리」가 아니라 「결제 내역」으로 둔 까닭도 그것이다. 그룹 이름과 같은 글자가
     * 그 안에 또 서면 기둥에서 어느 쪽을 눌러야 하는지 한 박자 멈추기도 한다.
     */
    label: "결제 관리",
    items: [
      { code: "PAY-01", label: "상품 관리", href: "/admin2/products" },
      { code: "PAY-02", label: "결제 내역", href: "/admin2/payments" },
    ],
  },
  {
    /*
     * 「AI 프롬프트」를 시스템 설정 **바로 아래**에 둔다.
     *
     * 저 화면(ADM-13)은 지금 걸려 있는 값을 읽기만 하는 자리이고, 이 화면은 그 가운데
     * 운영자가 실제로 손댈 수 있는 한 갈래다 — 곁가지이므로 부모 다음에 선다. 콘텐츠의
     * ADM-15 → ADM-15-1, 회원의 ADM-10 → ADM-10-1과 같은 차례다. 곁가지를 부모 위에
     * 세우면 부모를 찾던 눈이 한 번 되돌아온다.
     *
     * ⚠ 문항관리·채점 관리 쪽에 두지 않는다. 저 그룹들은 오늘 밀린 것을 처리하는 자리이고,
     *   프롬프트는 한 번 고치면 그 뒤 모든 회차에 걸리는 값이다 — 성격이 시스템 설정에 가깝다.
     *   무엇보다 프롬프트 하나가 문항 출제와 채점과 판정에 걸쳐 있어서, 어느 한 그룹에 넣으면
     *   나머지 둘에서 찾을 수 없게 된다.
     *
     * ⚠ 배지를 달지 않는다. 프롬프트는 밀리는 일이 아니라 배지가 매일 0이 되고, 0은 그리지
     *   않으므로 이 줄만 폭이 흔들린다.
     */
    label: "시스템",
    items: [
      { code: "ADM-03", label: "운영자·권한", href: "/admin2/staff" },
      { code: "ADM-11", label: "감사 로그", href: "/admin2/audit" },
      { code: "ADM-13", label: "시스템 설정", href: "/admin2/settings" },
      { code: "ADM-13-1", label: "AI 프롬프트", href: "/admin2/ai" },
    ],
  },
];

/** 주소로 지금 화면을 찾는다 — 빵부스러기와 문서 제목이 쓴다 */
export function findAdmin2(pathname: string): { group: string; item: Admin2NavItem } | null {
  let best: { group: string; item: Admin2NavItem } | null = null;
  for (const g of admin2Nav) {
    for (const item of g.items) {
      const hit = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
      if (!hit) continue;
      // 더 긴 주소가 이긴다 — /admin2 와 /admin2/rounds 가 함께 걸리는 것을 막는다
      if (!best || item.href.length > best.item.href.length) best = { group: g.label, item };
    }
  }
  return best;
}

/* ───────────────────────── 상태 색 ─────────────────────────
   상태는 점 + 글자로 적는다. 색은 넷뿐이고, 넷 밖의 값은 회색으로 떨어뜨린다 —
   상태마다 색을 새로 만들면 표 한 장에 무지개가 선다. */

export type Tone = "ok" | "warn" | "danger" | "info" | "muted";

export const toneColor: Record<Tone, string> = {
  ok: "var(--a2-ok)",
  warn: "var(--a2-warn)",
  danger: "var(--a2-danger)",
  info: "var(--a2-info)",
  muted: "var(--a2-ink-4)",
};

/**
 * 상태 → 색조 짝.
 *
 * 화면마다 각자 적어 두었더니 회차 화면에서 서버가 그린 값이 undefined가 되어 같은 상태가
 * 세 가지 색으로 나온 적이 있다("use client" 파일의 export를 서버 컴포넌트가 부르면 값이
 * 넘어오지 않는다). 짝은 지시자 없는 이 파일에 한 벌만 둔다.
 */
/* grading은 open과 같은 색이다. 둘이 화면에서 같은 말(「진행중」)을 쓰기 때문이다
   (lib/admin.ts의 roundStates) — 색이 갈리면 같은 낱말이 표 한 장에 두 색으로 선다 */
export const roundTone: Record<RoundState, Tone> = {
  open: "ok",
  grading: "ok",
  draft: "muted",
  closed: "muted",
};

/**
 * 문항 상태 → 색조.
 *
 * 오늘 손이 가야 하는 둘에만 색을 남긴다 — 검수 대기는 기다리는 것(warn), 반려는
 * 되돌아온 것(danger). 작성 중과 사용 중지는 아직/이미 은행 밖이라 회색으로
 * 떨어뜨린다. 다섯 상태에 다섯 색을 주면 표 한 장이 무지개가 되어 정작 값이 안 읽힌다.
 */
export const itemTone: Record<ItemState, Tone> = {
  draft: "muted",
  submitted: "warn",
  rejected: "danger",
  approved: "ok",
  retired: "muted",
};

/** 검사지 — 초안은 아직 사람이 확정하지 않은 것이라 기다리는 색으로 둔다 */
export const formTone: Record<FormState, Tone> = {
  draft: "warn",
  confirmed: "ok",
};

/**
 * 계정 상태 → 색조.
 *
 * 회원 목록·회원 상세·운영자 목록이 이 한 벌을 쓴다. 세 화면에 각자 적어 두었더니
 * 같은 「탈퇴」가 화면마다 다른 색으로 섰다.
 *
 * ⚠ 학생 목록(StudentsTable)만 제 것을 따로 들고 있다. 저기서는 정지·탈퇴가 곧 시험을
 *   막는 값이라 탈퇴도 danger로 세운다 — 일부러 다른 것이니 여기로 합치지 않는다.
 */
export const accountTone: Record<UserState, Tone> = {
  active: "ok",
  pending: "warn",
  dormant: "muted",
  suspended: "danger",
  withdrawn: "muted",
};

/**
 * 학생 명부에서 쓰는 계정 상태 색조.
 *
 * accountTone과 딱 한 칸(탈퇴)이 다르다. 회원 명부에서 탈퇴는 「더 볼 것 없는 줄」이라
 * 회색이지만, 학생 명부에서 정지·탈퇴는 「시험을 못 보는 아이」라 빨강이다. 일부러 다른
 * 것이므로 두 짝을 합치지 않되, 학생 목록과 학생 상세가 갈리지 않게 한 벌로 둔다.
 */
export const studentAccountTone: Record<UserState, Tone> = {
  active: "ok",
  pending: "warn",
  dormant: "muted",
  suspended: "danger",
  withdrawn: "danger",
};

/**
 * 기관 계약 상태 → 색조.
 *
 * lib/admin.ts contractLabel의 className(text-emerald-700 …)은 쓰지 않는다 — 저쪽은
 * 기존 /admin의 팔레트 색이다. 가져오는 것은 label 글자뿐이고 색은 이 콘솔의 넷에서 고른다.
 */
/**
 * 가입 신청 처리 상태 → 색조.
 *
 * 대기가 경고색인 까닭은 「아직 안 한 일」이기 때문이다. 회색으로 두면 목록에서 처리한
 * 건과 안 한 건이 같은 무게로 읽힌다. 반려는 빨강이되 사고가 아니라 결론이므로 계정
 * 정지와 같은 색조를 쓴다 — 되돌리지 않는 결정이라는 점이 같다.
 */
export const approvalTone: Record<"pending" | "approved" | "rejected", Tone> = {
  pending: "warn",
  approved: "ok",
  rejected: "danger",
};

/**
 * 면담 상태 → 색조.
 *
 * 이 콘솔이 면담에서 하는 일은 「날짜를 잡는 것」 하나다. 그래서 날짜가 잡힌 뒤의
 * 상태(기록 완료·코딩 확정)는 회색으로 떨어뜨린다 — 그것은 전문가 콘솔이 할 일이고,
 * 여기 색이 남아 있으면 다 끝난 줄이 목록에서 계속 손을 부른다. 색은 셋에만 남는다.
 *
 *   applied   방금 들어온 신청 — 받을지 말지 아직 안 정했다
 *   queued    대상인데 날짜가 없다. 이 화면이 있는 까닭
 *   scheduled 이 화면이 제 일을 마친 줄
 *
 * ⚠ 상태 **이름**은 여기 두지 않는다. lib/interviewStore.ts의 deskLabel이
 *   expertStore의 interviewStateLabel에서 그대로 가져다 쓴다 — 같은 상태가 두 콘솔에서
 *   다른 이름으로 서면 안 된다. 저쪽 tone은 Tailwind 임의색이라 여기서 못 쓴다.
 */
export const interviewTone: Record<DeskState, Tone> = {
  applied: "info",
  queued: "warn",
  scheduled: "ok",
  recorded: "muted",
  coded: "muted",
  declined: "muted",
};

export const contractTone: Record<OrgRow["contract"], Tone> = {
  active: "ok",
  trial: "warn",
  expired: "danger",
};

/** 응시 상태 → 색조. 학생 목록과 회원 상세의 자녀 표가 같은 짝을 쓴다 */
export const examTone: Record<ExamState, Tone> = {
  reported: "ok",
  submitted: "warn",
  "in-progress": "info",
  "not-started": "muted",
};

export const caseTone: Record<CaseState, Tone> = {
  ai: "info",
  review: "warn",
  conference: "danger",
  confirmed: "ok",
  published: "muted",
};

/** 숫자를 세 자리마다 끊는다 */
export const n = (v: number) => v.toLocaleString("ko-KR");

/** 비율(%) — 분모가 0이면 0으로. NaN을 화면에 내보내지 않는다 */
export const pct = (value: number, total: number) => (total ? Math.round((value / total) * 100) : 0);
