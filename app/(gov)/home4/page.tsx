import type { Metadata } from "next";
import Link from "next/link";
import GovPhoto from "@/components/home4/GovPhoto";
import {
  ApplyIcon,
  FaqIcon,
  OrgIcon,
  PrincipleIcon,
  QuestionIcon,
  ReportIcon,
} from "@/components/home4/QuickIcons";
import { assessment, questionCountText, subjects, totalQuestions } from "@/lib/exam";
import { axes } from "@/lib/result";
import { company } from "@/lib/site";

export const metadata: Metadata = {
  /* 루트 레이아웃의 template("%s | GENIXX")가 뒤를 붙인다 */
  title: "2026학년도 1회차 TalentMe 재능 진단 안내",
  description:
    "초등 3~4학년 재능 진단 TalentMe 공식 안내. 한국창의영재교육원 전문가 40인이 출제·검수·평가·면담을 맡고, AI는 1차 분석만 제안합니다. 2026 파일럿 무료, 응시 마감 9월 30일.",
};

/* ─────────────────────────────────────────────────────────────
   네 번째 시안 — 공공기관 누리집의 문법으로.

   앞의 셋이 「제품」「서비스」「기사」였다면 이 시안은 「공고」다. 정부·공공기관
   누리집이 국민에게 사업을 안내하는 방식 — 유틸 줄, 큰 메뉴, 안내 띠, 바로가기
   아이콘 줄, 알림판, 표, 단계 도해, 자료실, 정보가 많은 푸터 — 을 그대로 빌렸다.
   학부모가 이 화면에서 느껴야 할 것은 「믿을 만한 기관이 공식적으로 안내한다」는
   인상이다. 글꼴·색·헤더·푸터는 전부 (gov) 존 안에서만 정의한다 — home4.css.

   장 제목은 전부 명사형(사업 개요·진단 체계·응시 안내…)이고 왼쪽에 파란 막대 하나.
   눈썹 글자 + 문장형 제목은 /·/home2·/home3의 버릇이라 쓰지 않는다. 어두운 띠는 첫
   화면과 마지막 띠 둘뿐이고, 내용은 카드가 아니라 표로 싣는다.

   ───── 차례 ─────
   안내 띠    회차 이름, 대상, 마감. 오른쪽에 공고 요약표
   바로가기   여섯 아이콘 — 공공 누리집의 「자주 찾는 서비스」 줄
   알림·진행  왼쪽 알림판, 오른쪽 회차 진행 단계
   개요       사업 개요 — 사진과 숫자 넷 (40 · 8 · 30 · 마감일)
   체계       학력과 재능을 따로 잰다 — 비교표와 여덟 갈래
   전문가단   40인이 출제·검수·평가·면담을 맡는다 — 구성표와 직무표
   절차       AI는 제안하고 사람이 확정한다 — 여섯 단계 도해
   응시 안내  표 한 장
   자료실     표 한 장 (넷)
   FAQ
   기관       학교·교육청·기관 도입 — 표 한 장
   마지막     접수 띠

   ───── 사실의 출처 ─────
   문항 수·시간·회차·마감은 lib/exam, 여덟 갈래는 lib/result에서 읽는다.
   AI의 역할은 /about/hitl(app/(site)/about/hitl)과 lib/brand의 「AI 단독 판정을 하지
   않는다」와 같은 말로 적는다 — 이 시안에만 다른 원리를 쓰면 안 된다.

   ⚠ 「한국창의영재교육원 전문가 40인 — 영재학교 교수진, 교장·교감 출신 교육자.
     출제·검수·평가·면담을 맡는다」는 2026-08-23 의뢰인의 설명이다. 개인 이름·
     이력은 적지 않고 기관·구성·직무 단위로만 적는다.
   ⚠ 알림판의 항목은 전부 저장소에 있는 사실(회차·무료·공개 자료·헌장)이다.
     날짜가 있는 보도자료처럼 꾸미지 않는다 — 없는 소식을 지어내지 않으려는 것.
   ⚠ 후기·응시 인원·금액은 싣지 않는다. 「영재」는 기관 이름과 부정문에서만 쓴다.
   ───────────────────────────────────────────────────────────── */

const [dy, dm, dd] = assessment.deadline.split("-").map(Number);
const deadlineDot = `${dy}. ${dm}. ${dd}.`;
const deadlineKo = `${dy}년 ${dm}월 ${dd}일`;
const subjectNames = subjects.map((s) => s.short).join("·");
const limitMin = subjects[0].limitMin;
const totalItems = totalQuestions();
const measuredAxes = axes.filter((a) => a.subject);

/** 공고 요약 — 첫 화면 오른쪽 표. 자세한 것은 아래 응시 안내표가 맡으므로 넷만 */
const notice = [
  { k: "응시 대상", v: "초등학교 3~4학년" },
  { k: "응시 마감", v: deadlineDot, strong: true },
  { k: "비용", v: "무료 (2026 파일럿)", strong: true },
  { k: "담당·문의", v: `고객지원 ${company.tel} (${company.hours})` },
];

/** 바로가기 여섯 — 전부 실제 경로 */
const quick = [
  { href: "/exam", label: "접수 신청", Icon: ApplyIcon },
  { href: "/sample/report", label: "샘플 리포트", Icon: ReportIcon },
  { href: "/sample/questions", label: "문항 미리보기", Icon: QuestionIcon },
  { href: "/about/hitl", label: "진단 원리", Icon: PrincipleIcon },
  { href: "/support/faq", label: "자주 묻는 질문", Icon: FaqIcon },
  { href: "/partner/contact", label: "기관 도입 문의", Icon: OrgIcon },
];

/** 알림판 — 저장소에 있는 사실만. 보도자료처럼 날짜를 꾸미지 않는다 */
const alerts = [
  {
    tag: "접수중",
    tone: "gv-tag-red",
    t: `${assessment.round} TalentMe 재능 진단 접수 — 응시 마감 ${deadlineDot}`,
    href: "/exam",
  },
  { tag: "안내", tone: "gv-tag-gray", t: "2026 파일럿 회차 전면 무료 운영 — 결제 수단 등록 없음", href: "/service/pricing" },
  { tag: "공지", tone: "gv-tag-gray", t: "샘플 리포트 미리보기와 과목별 예시 문항 공개", href: "/sample" },
  { tag: "공지", tone: "gv-tag-gray", t: "진단 윤리 헌장 — 라벨링 방지 원칙 전문 상시 게시", href: "/about/charter" },
  { tag: "모집", tone: "gv-tag-gray", t: "파일럿 참여 학교·교육청·기관 도입 문의 접수", href: "/partner/contact" },
];

/** 회차 진행 — 오른쪽 세로 단계 */
const progress = [
  { t: "접수·응시", d: `${deadlineKo}까지 · 과목마다 따로 접속` },
  { t: "AI 1차 분석", d: "채점·코딩 제안값 산출 · 1~2일" },
  { t: "전문가 평가·확정", d: "케이스 회의에서 승인·조정" },
  { t: "리포트 발행", d: "확정 전에는 어떤 결과도 보이지 않음" },
];

/** 사업 개요 숫자 넷 — 제품 사실만 */
const figures = [
  { n: "40", unit: "인", l: "출제·검수·평가·면담을 맡는 전문가단" },
  { n: String(axes.length), unit: "갈래", l: `재능 좌표 · 2026년은 ${measuredAxes.length}갈래 측정` },
  { n: String(totalItems), unit: "문항", l: `${questionCountText()} · 과목당 ${limitMin}분` },
  { n: `${dm}. ${dd}.`, unit: "", l: `${assessment.round} 응시 마감` },
];

/** 학력 × 재능 비교표 */
const compare = [
  { k: "무엇을 보나", a: "교과 내용을 얼마나 알고 있는가", b: "조건이 맞았을 때 어떤 행동이 드러나는가" },
  { k: "자료", a: "객관식·서술형 답안", b: "지필 답안(객관식·서술형) + 보호자·교사 관찰 설문 + 면담" },
  { k: "결과의 꼴", a: "과목별 환산 점수", b: "여덟 갈래 좌표와 전문가 확정 소견" },
  { k: "읽는 법", a: "지금 아는 것", b: "아직 드러나지 않은 것을 포함한 가능성" },
];

/** 전문가단 구성 — 의뢰인이 준 사실 그대로, 기관·인원·직무 단위 */
const composition = [
  { k: "소속", v: "한국창의영재교육원" },
  { k: "인원", v: "40인" },
  { k: "구성", v: "영재학교 교수진, 교장·교감을 지낸 교육자" },
  { k: "직무", v: "출제 · 검수 · 평가 · 면담" },
];

/** 전문가단 직무 넷 */
const duties = [
  {
    t: "출제",
    d: "학년군 교육과정 안에서 문항을 씁니다. 지각·이해·생성·창의 네 위계가 정해진 비율로 들어가도록 설계합니다.",
    rule: "출제자는 자기 문항을 검수하지 않습니다",
  },
  {
    t: "검수",
    d: "다른 전문가가 교차 검수합니다. 규칙 대조(AI)는 보조일 뿐, 승인은 사람이 합니다.",
    rule: "검수를 통과한 문항만 은행에 오릅니다",
  },
  {
    t: "평가",
    d: "서술형 채점과 재능 좌표 판정. AI 제안값을 루브릭으로 확정하고, 경계선 사례는 유보합니다.",
    rule: "두 사람이 독립으로 매긴 표본으로 일치도를 점검합니다",
  },
  {
    t: "면담",
    d: "필요한 학생은 면담으로 다시 봅니다. 전사는 AI가, 코딩 확정은 면담한 전문가가 합니다.",
    rule: "확정 전에는 보호자 화면에 결과가 나오지 않습니다",
  },
];

/** 여섯 단계 — 누가 하는지를 함께 적는다 */
const flow = [
  { n: "01", t: "출제", who: "전문가단", d: "학년군 교육과정 안에서 문항 작성" },
  { n: "02", t: "교차 검수", who: "전문가단", d: "출제자와 다른 사람이 승인" },
  { n: "03", t: "응시·관찰", who: "학생·보호자·교사", d: `${subjectNames} 응시, 관찰 설문 제출` },
  { n: "04", t: "1차 분석", who: "AI", d: "채점·코딩 제안값과 확신도 산출", ai: true },
  { n: "05", t: "평가·면담·확정", who: "전문가단", d: "케이스 회의에서 승인·조정" },
  { n: "06", t: "리포트 발행", who: "GENIXX", d: "확정된 값만 보호자에게" },
];

/** 응시 안내표 */
const guide = [
  { k: "응시 대상", v: "초등학교 3~4학년 (2026 파일럿)" },
  { k: "과목·문항", v: `${questionCountText()}, 객관식과 서술형` },
  { k: "응시 시간", v: `과목당 ${limitMin}분 · 과목별로 따로 접속하며, 과목을 나누어 응시할 수 있습니다` },
  { k: "접수 방법", v: "보호자가 회원가입 후 자녀를 등록 → 8자리 접속코드 발급 → 학생은 코드와 생년월일로 입장" },
  {
    k: "관찰 설문",
    v: "보호자·지도교사가 집과 교실에서 본 모습을 적는 설문 (선택). 건너뛰면 리포트 신뢰도 표기가 '참고'로 낮아집니다",
  },
  { k: "결과", v: "AI 1차 분석 뒤 전문가 확정을 거쳐 리포트 발행. 확정 전에는 어떤 결과도 표시되지 않습니다" },
  { k: "비용", v: "무료. 결제 수단을 등록하지 않습니다. 정식 요금은 파일럿 종료 후 공지" },
  { k: "응시 마감", v: deadlineKo },
];

/** 자료실 — 가입 없이 볼 수 있는 것. 표 한 장 */
const archive = [
  { kind: "리포트", t: "샘플 리포트", d: "정밀본 한 면 미리보기", href: "/sample/report" },
  { kind: "문항", t: "문항 미리보기", d: "과목별 예시 문항과 응시 화면 구성", href: "/sample/questions" },
  { kind: "헌장", t: "진단 윤리 헌장", d: "라벨링 방지 원칙(Article 7) 전문", href: "/about/charter" },
  { kind: "연구", t: "연구노트·백서", d: "타당화 결과와 통계 지표", href: "/insight/research" },
];

/** 기관 도입 — lib/pageContent의 파트너 안내와 같은 내용 */
const partner = [
  { k: "대상", v: "학교 · 교육청 · 학원 · 영재교육원 등 교육기관" },
  { k: "제공", v: "학급·학년 단위 집단 리포트, 기관 담당자 화면" },
  { k: "과정", v: "인증 해석 전문가 과정 — 수료자가 결과 해석·상담을 맡습니다" },
  { k: "문의", v: `${company.tel} (${company.hours}) · ${company.email}` },
];

const faqs = [
  {
    q: "영재를 가려내는 검사인가요?",
    a: "아닙니다. TalentMe는 선발 검사가 아니라 관찰 검사입니다. 결과는 등급이나 석차가 아니라 이번 회차에 관찰된 행동의 좌표이며, 아이를 규정하는 이름이 아니라서 회차가 바뀌면 바뀔 수 있습니다.",
  },
  {
    q: "AI가 결과를 판정하나요?",
    a: "아닙니다. AI는 채점과 코딩의 제안값과 확신도를 만들 뿐이고, 판정은 전문가단이 케이스 회의에서 확정합니다. 확신도가 낮은 응답은 자동으로 사람에게 넘어가고, 전문가가 승인하기 전에는 어떤 결과도 표시되지 않습니다.",
  },
  {
    q: "정말 무료인가요?",
    a: "2026 파일럿 회차는 전면 무료이고 결제 수단을 등록하지 않습니다. 정식 서비스 요금은 파일럿이 끝난 뒤 확정해 공지합니다.",
  },
  {
    q: "세 과목을 하루에 다 봐야 하나요?",
    a: `아닙니다. 과목별로 따로 접속하므로 과목을 나누어 응시할 수 있습니다. 과목당 ${limitMin}분이며, ${deadlineKo}까지 세 과목을 마치면 됩니다.`,
  },
  {
    q: "보호자 설문은 꼭 해야 하나요?",
    a: "선택입니다. 건너뛰어도 진단은 진행되지만 학생 응답만으로 판정하게 되어 리포트의 신뢰도 표기가 '참고'로 낮아집니다. 관찰 설문이 1건이면 '보통', 2건 이상이면 '높음'으로 표기됩니다.",
  },
  {
    q: "결과는 언제, 어떻게 받나요?",
    a: "응시와 설문이 끝나면 AI 1차 분석이 1~2일 안에 끝나고, 전문가 확정 뒤 보호자 계정에 리포트가 열립니다. 리포트에는 반영된 정보원 수와 확정 시각이 함께 적힙니다.",
  },
];

export default function Home4() {
  return (
    <>
      {/* ───── 안내 띠 — 평평한 남색, 흰 공고표 ───── */}
      <section className="bg-(--g-navy) text-white">
        <div className="gv-wrap grid gap-10 py-14 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-center lg:gap-16 lg:py-20">
          <div>
            <p className="flex flex-wrap items-center gap-2">
              <span className="gv-tag gv-tag-red">접수중</span>
              <span className="gv-small font-medium text-white/85">
                {assessment.round} · 응시 마감 {deadlineDot}
              </span>
            </p>
            <h1 className="gv-display mt-5">
              초등 3~4학년 재능 진단
              <br />
              TalentMe 접수 안내
            </h1>
            <p className="gv-lead mt-6 max-w-[34rem] text-white/88">
              국어·수학·과학 답안과 보호자·교사의 관찰 설문을 바탕으로 한국창의영재교육원 전문가 40인이 학생의 재능을
              여덟 갈래 좌표로 확정합니다. 결과는 등급·석차가 아닌 좌표와 전문가 확정 소견으로 발행됩니다.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/exam" className="gv-btn gv-btn-white">
                접수 신청
              </Link>
              <Link href="/sample/report" className="gv-btn gv-btn-ghost">
                샘플 리포트 보기
              </Link>
            </div>
          </div>

          {/* 공고 요약표 — 흰 바탕, 표 규칙 */}
          <div className="bg-white p-6 text-(--g-ink) lg:p-7">
            <h2 className="gv-h4">접수 개요</h2>
            <dl className="mt-4 border-t-2 border-(--g-navy)">
              {notice.map((n) => (
                <div key={n.k} className="grid grid-cols-[6rem_1fr] border-b border-(--g-line)">
                  <dt className="gv-small bg-(--g-tint) px-3 py-3 font-bold">{n.k}</dt>
                  <dd className={`gv-body px-3 py-3 leading-snug ${n.strong ? "font-bold text-(--g-blue-2)" : ""}`}>
                    {n.v}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* ───── 바로가기 ───── */}
      <section aria-label="바로가기" className="border-b border-(--g-line) bg-white">
        <ul className="gv-wrap grid grid-cols-3 divide-x divide-(--g-line) lg:grid-cols-6">
          {quick.map(({ href, label, Icon }) => (
            <li
              key={href}
              className="flex max-lg:border-(--g-line) max-lg:[&:nth-child(-n+3)]:border-b max-lg:[&:nth-child(3)]:border-r-0"
            >
              <Link
                href={href}
                className="group flex w-full flex-col items-center gap-2.5 py-6 text-center text-(--g-ink) transition-colors hover:bg-(--g-tint)"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-(--g-tint) text-(--g-blue) transition-colors group-hover:bg-(--g-blue) group-hover:text-white">
                  <Icon className="h-7 w-7" />
                </span>
                <span className="gv-small font-bold">{label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* ───── 알림 · 회차 진행 ───── */}
      <section className="bg-(--g-bg)">
        <div className="gv-wrap grid gap-8 py-12 lg:grid-cols-[minmax(0,8fr)_minmax(0,4fr)] lg:gap-10 lg:py-14">
          <div className="border border-(--g-line) bg-white">
            <div className="flex items-center justify-between border-b-2 border-(--g-navy) px-6 py-4">
              <h2 className="gv-h4">알림</h2>
              <Link href="/support/faq" className="gv-small font-medium text-(--g-ink-2) hover:text-(--g-blue) hover:underline">
                자주 묻는 질문 →
              </Link>
            </div>
            <ul className="divide-y divide-(--g-line)">
              {alerts.map((a) => (
                <li key={a.t}>
                  <Link href={a.href} className="flex items-start gap-3 px-6 py-4 hover:bg-(--g-tint)">
                    <span className={`gv-tag ${a.tone} mt-0.5 w-[3.25rem] justify-center`}>{a.tag}</span>
                    <span className="gv-body text-(--g-ink)">{a.t}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="border border-(--g-line) bg-white">
            <div className="border-b-2 border-(--g-navy) px-6 py-4">
              <h2 className="gv-h4">회차 진행</h2>
            </div>
            <ol className="px-6 py-5">
              {progress.map((p, i) => (
                <li key={p.t} className="relative flex gap-4 pb-6 last:pb-0">
                  {i < progress.length - 1 && (
                    <span aria-hidden className="absolute left-[0.9375rem] top-8 h-[calc(100%-1.5rem)] w-px bg-(--g-line-2)" />
                  )}
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[0.8125rem] font-bold ${
                      i === 0 ? "bg-(--g-blue) text-white" : "border border-(--g-line-2) bg-white text-(--g-ink-2)"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <div className="pt-1">
                    <p className="gv-head text-[0.9375rem] text-(--g-ink)">{p.t}</p>
                    <p className="gv-small mt-0.5 text-(--g-ink-2)">{p.d}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* ───── 사업 개요 ───── */}
      <section id="overview" className="gv-band scroll-mt-24">
        <div className="gv-wrap">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-16">
            <div>
              <h2 className="gv-h2 gv-bar">사업 개요</h2>
              <p className="gv-lead mt-5 text-(--g-ink)">TalentMe는 학력과 재능을 서로 다른 축으로 재는 재능 진단입니다.</p>
              <p className="gv-body mt-4 text-(--g-ink-2)">
                본 진단은 교과 성취와 별개로, 가정과 교실에서 관찰된 행동을 여덟 갈래 좌표로 기록하고 전문가단이 확정한
                소견과 함께 보호자에게 제공합니다. 결과는 학생을 규정하는 등급이 아니라 이번 회차에 관찰된 행동의
                기록입니다.
              </p>
              <p className="gv-body mt-4 text-(--g-ink-2)">
                2026년은 파일럿 회차로 초등학교 3~4학년을 대상으로 무료 운영하며, 여덟 갈래 중 국어·수학·과학으로 잴 수
                있는 세 갈래(언어, 수리·논리, 자연·탐구)를 먼저 측정합니다.
              </p>
              <Link href="/about" className="gv-btn gv-btn-line mt-7">
                GENIXX 소개
              </Link>
            </div>
            <GovPhoto
              name="promo-catalyst"
              alt="거실 바닥에 엎드려 자기가 만든 그림책을 소리 내어 읽고 있는 초등학생"
              ratio="aspect-[4/3]"
              preload
            />
          </div>

          <ul className="mt-14 grid grid-cols-2 border-t-2 border-(--g-navy) lg:grid-cols-4">
            {figures.map((f) => (
              <li key={f.l} className="border-b border-(--g-line) px-2 py-7 lg:border-r lg:px-6 lg:last:border-r-0">
                <p className="text-(--g-blue)">
                  <span className="gv-num">{f.n}</span>
                  {f.unit && <span className="gv-head ml-1 text-[1.125rem]">{f.unit}</span>}
                </p>
                <p className="gv-small mt-2 text-(--g-ink-2)">{f.l}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ───── 진단 체계 ───── */}
      <section id="system" className="gv-band scroll-mt-24 bg-(--g-bg)">
        <div className="gv-wrap">
          <h2 className="gv-h2 gv-bar">진단 체계</h2>
          <p className="gv-lead mt-5 max-w-3xl text-(--g-ink-2)">
            학력진단은 지금 아는 것을, 재능진단은 아직 드러나지 않은 것을 포함한 가능성을 봅니다. 한 번의 응시로 두
            축을 각각 얻고, 두 축은 리포트에 각각 표시됩니다.
          </p>

          <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-10">
            <div tabIndex={0} role="region" aria-label="학력진단과 재능진단 비교표" className="self-start overflow-x-auto bg-white">
              <table className="gv-table">
                <caption className="sr-only">학력진단과 재능진단 비교</caption>
                <thead>
                  <tr>
                    <th scope="col" className="w-[5.75rem] lg:w-[7.5rem]">
                      구분
                    </th>
                    <th scope="col">학력진단</th>
                    <th scope="col">재능진단</th>
                  </tr>
                </thead>
                <tbody>
                  {compare.map((r) => (
                    <tr key={r.k}>
                      <th scope="row">{r.k}</th>
                      <td className="text-(--g-ink-2)">{r.a}</td>
                      <td className="text-(--g-ink)">{r.b}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border border-(--g-line) bg-white p-6 lg:p-7">
              <h3 className="gv-h4">재능 좌표 여덟 갈래</h3>
              <p className="gv-small mt-1 text-(--g-ink-2)">
                파란 표지는 2026년 파일럿에서 측정하는 갈래입니다. 나머지는 리포트에 빈 자리로 그대로 둡니다.
              </p>
              <ul className="mt-4 divide-y divide-(--g-line) border-t border-(--g-line)">
                {axes.map((a) => (
                  <li key={a.id} className="flex items-start gap-3 py-2.5">
                    <span className={`gv-tag mt-0.5 w-[4.5rem] justify-center ${a.subject ? "gv-tag-blue" : "gv-tag-gray"}`}>
                      {a.subject ? "2026 측정" : "예정"}
                    </span>
                    <span className="gv-body leading-snug">
                      <span className="font-bold text-(--g-ink)">{a.label}</span>
                      <span className="gv-small block text-(--g-ink-2) sm:ml-2 sm:inline">{a.desc}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ───── 전문가단 ───── */}
      <section id="experts" className="gv-band scroll-mt-24">
        <div className="gv-wrap">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-start lg:gap-16">
            <div>
              <h2 className="gv-h2 gv-bar">전문가단 구성과 직무</h2>
              <p className="gv-lead mt-5 text-(--g-ink-2)">
                한국창의영재교육원의 전문가 40인이 문항을 쓰고, 서로의 문항을 검수하고, 답안을 평가하고, 필요한 학생을
                면담합니다. 출제 의도를 아는 사람이 검수와 판정까지 맡는 구성입니다.
              </p>
              <dl className="mt-7 border-t-2 border-(--g-navy)">
                {composition.map((c) => (
                  <div key={c.k} className="grid grid-cols-[6rem_1fr] border-b border-(--g-line)">
                    <dt className="gv-small bg-(--g-tint) px-3 py-3 font-bold">{c.k}</dt>
                    <dd className="gv-body px-3 py-3 leading-snug text-(--g-ink)">{c.v}</dd>
                  </div>
                ))}
              </dl>
              <Link href="/about/hitl" className="gv-btn gv-btn-line mt-7">
                진단 원리 보기
              </Link>
            </div>
            <GovPhoto
              name="promo-expert"
              alt="회의 탁자에서 학생 답안을 펼쳐 놓고 함께 검토하는 교육 전문가들"
              ratio="aspect-[4/3]"
            />
          </div>

          <div tabIndex={0} role="region" aria-label="전문가단 직무표" className="mt-12 overflow-x-auto">
            <table className="gv-table min-w-[40rem]">
              <caption className="sr-only">전문가단의 네 가지 직무</caption>
              <thead>
                <tr>
                  <th scope="col" className="w-[6rem]">
                    직무
                  </th>
                  <th scope="col">하는 일</th>
                  <th scope="col" className="w-[38%]">
                    지키는 원칙
                  </th>
                </tr>
              </thead>
              <tbody>
                {duties.map((d) => (
                  <tr key={d.t}>
                    <th scope="row" className="gv-head bg-white text-[1.0625rem] text-(--g-blue-2)">
                      {d.t}
                    </th>
                    <td className="text-(--g-ink)">{d.d}</td>
                    <td className="text-(--g-ink-2)">{d.rule}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ───── 절차 — AI의 자리 ───── */}
      <section id="process" className="gv-band scroll-mt-24 bg-(--g-bg)">
        <div className="gv-wrap">
          <h2 className="gv-h2 gv-bar">진단 절차</h2>
          <p className="gv-lead mt-5 text-(--g-ink)">AI는 제안하고, 사람이 확정합니다.</p>
          <p className="gv-body mt-3 max-w-3xl text-(--g-ink-2)">
            여섯 단계 가운데 AI가 값을 내는 것은 한 단계뿐입니다. 서술형 답안의 채점과 개방형 응답의 코딩을 먼저 읽어
            제안값과 확신도를 만들고, 그 값을 전문가단이 루브릭으로 확정합니다. 다른 단계에서는 규칙 대조·전사 같은
            보조만 하고 승인하지 않습니다. AI 단독으로 판정되는 결과는 없습니다.
          </p>

          <ol className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-6 lg:gap-0">
            {flow.map((s, i) => (
              <li key={s.n} className="relative flex">
                <div
                  className={`flex w-full flex-col border p-5 lg:min-h-[13.5rem] ${
                    s.ai ? "border-(--g-blue) bg-(--g-tint)" : "border-(--g-line) bg-white"
                  } ${i > 0 && !s.ai ? "lg:border-l-0" : ""} ${s.ai && i > 0 ? "lg:-ml-px" : ""}`}
                >
                  <span className={`text-[0.8125rem] font-bold ${s.ai ? "text-(--g-blue)" : "text-(--g-ink-3)"}`}>
                    {s.n}
                  </span>
                  <span className="gv-h4 mt-2 text-(--g-ink)">{s.t}</span>
                  <span className={`gv-tag mt-2 self-start whitespace-normal ${s.ai ? "gv-tag-blue" : "gv-tag-line"}`}>
                    {s.who}
                  </span>
                  <span className="gv-small mt-3 text-(--g-ink-2)">{s.d}</span>
                </div>
                {i < flow.length - 1 && (
                  <span
                    aria-hidden
                    className="absolute -right-2.5 top-1/2 z-10 hidden h-5 w-5 -translate-y-1/2 rotate-45 border-r border-t border-(--g-line-2) bg-white lg:block"
                  />
                )}
              </li>
            ))}
          </ol>

          <div className="mt-8 grid gap-4 border-t-2 border-(--g-navy) pt-6 sm:grid-cols-3">
            {[
              { t: "확신이 낮으면 사람에게", d: "AI 채점 확신도가 낮은 응답은 자동으로 전문가에게 넘어갑니다." },
              { t: "경계선은 확정하지 않습니다", d: "판정 컷 경계에 있는 사례는 다음 회차 재관찰로 넘깁니다." },
              { t: "제안값은 지우지 않습니다", d: "사람이 바꾼 값 옆에 AI 제안값이 남아, 둘이 얼마나 어긋났는지 추적합니다." },
            ].map((n) => (
              <div key={n.t} className="flex gap-3">
                <span aria-hidden className="mt-2 h-2 w-2 shrink-0 bg-(--g-blue)" />
                <div>
                  <h3 className="gv-head text-[0.9375rem] text-(--g-ink)">{n.t}</h3>
                  <p className="gv-small mt-1 text-(--g-ink-2)">{n.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── 응시 안내 ───── */}
      <section id="guide" className="gv-band scroll-mt-24">
        <div className="gv-wrap">
          <h2 className="gv-h2 gv-bar">응시 안내</h2>
          <p className="gv-lead mt-5 text-(--g-ink-2)">{assessment.round}</p>
          <div tabIndex={0} role="region" aria-label="응시 안내표" className="mt-8 overflow-x-auto bg-white">
            <table className="gv-table">
              <caption className="sr-only">응시 대상·과목·시간·방법·비용</caption>
              <tbody>
                {guide.map((g) => (
                  <tr key={g.k}>
                    <th scope="row" className="w-[7rem] lg:w-[11rem]">
                      {g.k}
                    </th>
                    <td className="text-(--g-ink)">{g.v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link href="/exam" className="gv-btn gv-btn-blue">
              접수 신청
            </Link>
            <Link href="/service" className="gv-btn gv-btn-line">
              진단 서비스 안내
            </Link>
          </div>
        </div>
      </section>

      {/* ───── 자료실 ───── */}
      <section id="archive" className="gv-band scroll-mt-24 bg-(--g-bg)">
        <div className="gv-wrap">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="gv-h2 gv-bar">자료실</h2>
            <Link href="/sample" className="gv-small font-medium text-(--g-ink-2) hover:text-(--g-blue) hover:underline">
              샘플 리포트 전체 →
            </Link>
          </div>
          <p className="gv-lead mt-5 text-(--g-ink-2)">가입하기 전에 전부 열람할 수 있습니다.</p>
          <div tabIndex={0} role="region" aria-label="자료 목록" className="mt-8 overflow-x-auto bg-white">
            <table className="gv-table min-w-[40rem]">
              <caption className="sr-only">가입 없이 열람할 수 있는 자료</caption>
              <thead>
                <tr>
                  <th scope="col" className="w-[6rem]">
                    구분
                  </th>
                  <th scope="col" className="w-[11rem]">
                    자료명
                  </th>
                  <th scope="col">내용</th>
                  <th scope="col" className="w-[8rem]">
                    열람
                  </th>
                </tr>
              </thead>
              <tbody>
                {archive.map((a) => (
                  <tr key={a.href}>
                    <td>
                      <span className="gv-tag gv-tag-gray">{a.kind}</span>
                    </td>
                    <th scope="row" className="bg-white text-(--g-ink)">
                      {a.t}
                    </th>
                    <td className="text-(--g-ink-2)">{a.d}</td>
                    <td>
                      <Link href={a.href} className="gv-btn gv-btn-line h-9 px-4 text-[0.8125rem]">
                        바로가기
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ───── FAQ ───── */}
      <section id="faq" className="gv-band scroll-mt-24">
        <div className="gv-wrap grid gap-8 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-12">
          <div>
            <h2 className="gv-h2 gv-bar">자주 묻는 질문</h2>
            <Link href="/support/faq" className="gv-btn gv-btn-line mt-7">
              FAQ 전체 보기
            </Link>
          </div>
          <ul className="border-t-2 border-(--g-navy) bg-white">
            {faqs.map((f) => (
              <li key={f.q} className="border-b border-(--g-line)">
                <details className="gv-faq">
                  <summary className="flex cursor-pointer items-center justify-between gap-4 px-6 py-5">
                    <span className="flex items-start gap-3">
                      <span className="gv-h4 shrink-0 text-(--g-blue)">Q</span>
                      <span className="gv-h4 text-(--g-ink)">{f.q}</span>
                    </span>
                  </summary>
                  <div className="flex items-start gap-3 bg-(--g-tint) px-6 py-5">
                    <span className="gv-h4 shrink-0 text-(--g-ink-2)">A</span>
                    <p className="gv-body text-(--g-ink-2)">{f.a}</p>
                  </div>
                </details>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ───── 기관 도입 ───── */}
      <section id="partner" className="gv-band scroll-mt-24 bg-(--g-bg)">
        <div className="gv-wrap">
          <h2 className="gv-h2 gv-bar">기관 도입 안내</h2>
          <div className="mt-8 grid gap-8 border border-(--g-line) bg-white p-6 lg:grid-cols-[minmax(0,8fr)_minmax(0,4fr)] lg:items-center lg:p-8">
            <dl className="border-t-2 border-(--g-navy)">
              {partner.map((r) => (
                <div key={r.k} className="grid grid-cols-[6rem_1fr] border-b border-(--g-line)">
                  <dt className="gv-small bg-(--g-tint) px-3 py-3 font-bold">{r.k}</dt>
                  <dd className="gv-body px-3 py-3 leading-snug text-(--g-ink)">{r.v}</dd>
                </div>
              ))}
            </dl>
            <div className="flex flex-col gap-3">
              <Link href="/partner/contact" className="gv-btn gv-btn-blue">
                기관 도입 문의
              </Link>
              <Link href="/partner/certification" className="gv-btn gv-btn-line">
                인증 해석 전문가 과정
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ───── 마지막 띠 ───── */}
      <section className="bg-(--g-blue) text-white">
        <div className="gv-wrap flex flex-col items-start gap-6 py-12 lg:flex-row lg:items-center lg:justify-between lg:py-14">
          <div>
            <p className="gv-small font-bold text-white/80">{assessment.round}</p>
            <p className="gv-h2 mt-2">지금 접수하면 이번 회차에 응시할 수 있습니다.</p>
            <p className="gv-body mt-2 text-white/85">
              응시 마감 {deadlineDot} · 문의 {company.tel}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/exam" className="gv-btn gv-btn-white">
              접수 신청
            </Link>
            <Link href="/support/inquiry" className="gv-btn gv-btn-ghost">
              1:1 문의
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
