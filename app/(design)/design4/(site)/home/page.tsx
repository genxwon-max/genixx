import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ChevronRight, Phone } from "lucide-react";
import BoardTabs from "@/components/design4/BoardTabs";
import HeroCarousel, { type HeroSlide } from "@/components/design4/HeroCarousel";
import ImageSlot from "@/components/design4/ImageSlot";
import PersonAvatar from "@/components/site/PersonAvatar";
import { company } from "@/lib/site";
import { people, peopleGroups } from "@/lib/people";

export const metadata: Metadata = {
  title: "홈페이지 시안 4",
  robots: { index: false, follow: false },
};

/**
 * 홈페이지 시안 4 (/design4/home) — 2026-11-12 요청. 공개 사이트 첫 화면(/)을 간단하게 다시 짠 시안.
 *
 * 지금 첫 화면은 섹션이 열세 개라 길고 무겁다. 「찾아갈 곳으로 바로 보내는 화면」으로 줄이고
 * 설명은 하위 화면이 맡는다.
 *
 *   ① 큰 안내 판(왼쪽) — 전문가 참여(참여진 얼굴 + 40인) · 회차 접수 안내 · 샘플 리포트.
 *      판 이름 탭의 밑줄이 차오르면 넘어간다. 로그인 상자는 오른쪽(처음 시안처럼)
 *   ② 판 아래에 걸친 흰 띠 — 바로가기 셋(무료 학력진단 · 진단 서비스 · 샘플 리포트)
 *   ③ 알림판(공지사항 | 자주 묻는 질문 탭) + 진단 진행 절차
 *   ④ 남색 판 — 더 알아보기 셋 + 고객센터
 *
 * 처음 시안은 참고한 공공 교육 포털과 배치가 거의 같았다(큰 판 옆 로그인 상자 · 홈을 판 색 카드 셋 ·
 * 공지와 질문 두 칸 · 색 카드 셋과 전화 상자). 2026-11-12 「너무 똑같다」는 말에 배치를 바꿨다 —
 * 담는 내용과 링크는 그대로다.
 *
 * 화면을 내려도 따라오는 것은 두지 않는다. 그림은 아직 없다 — 자리마다 파일 이름을 적어 두었고,
 * 그릴 그림은 docs/design4-image-prompts.md에 있다. public/design4/에 그 이름으로 넣으면 바로 들어간다.
 *
 * 값은 이 파일에 적어 둔다(디자인 보기 원칙 — 저장소를 읽지 않는다). 공지와 질문은
 * lib/contentStore.ts의 씨앗 글에서 옮겼다.
 */

const yellow = "text-[#ffd34d]";

/**
 * 큰 판 「전문가 참여」의 오른쪽 — 참여진 얼굴을 늘어놓고 마지막 칸에 남은 인원을 적는다.
 * 얼굴 아홉 + 「+31」 = 40인(공개 사이트 첫 화면의 「연구·자문 전문가 네트워크 40인」).
 * 참여진은 lib/people.ts의 예시 인물이다 — 확정 명단이 들어오면 그대로 바뀐다.
 */
const EXPERT_TOTAL = 40;
function ExpertWall() {
  const shown = people.slice(0, 9);
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center">
      <ul className="grid grid-cols-5 gap-3">
        {shown.map((p) => (
          <li key={p.id} title={`${p.name} · ${p.role}`}>
            <PersonAvatar person={p} size={58} className="ring-4 ring-white/25" />
          </li>
        ))}
        <li className="flex h-[58px] w-[58px] flex-col items-center justify-center rounded-full bg-white text-[var(--d4-ink)] ring-4 ring-white/25">
          <span className="text-[15px] font-black leading-none">+{EXPERT_TOTAL - shown.length}</span>
          <span className="mt-0.5 text-[10px] font-bold leading-none text-slate-500">명</span>
        </li>
      </ul>
      <ul className="mt-6 flex flex-wrap justify-center gap-1.5">
        {peopleGroups.map((g) => (
          <li key={g.id} className="rounded-full bg-white/15 px-3 py-1 text-[12px] font-bold text-white">
            {g.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

const slides: HeroSlide[] = [
  {
    key: "experts",
    label: "전문가 참여",
    bg: "linear-gradient(120deg,#6d55e0 0%,#4936c2 100%)",
    tag: "전문가 참여",
    title: (
      <>
        <span className={yellow}>40인의 전문가</span>가
        <br />
        진단을 함께 만듭니다
      </>
    ),
    sub: "연구·자문, AI 개발, 문항 출제·검수, 진단·채점 전문가가 참여합니다.",
    link: { href: "/design4/about/team", label: "참여진 소개 보기" },
    image: <ExpertWall />,
  },
  {
    key: "notice",
    label: "회차 접수 안내",
    bg: "linear-gradient(120deg,#3f72f2 0%,#2547d6 100%)",
    tag: "NOTICE",
    title: (
      <>
        <span className={yellow}>2026 파일럿 회차</span> 응시를
        <br />
        지금 접수하고 있습니다
      </>
    ),
    sub: "국어·수학·과학 학력진단은 파일럿 기간 동안 무료입니다.",
    link: { href: "/design4/community/notice", label: "회차 일정 공지 보기" },
    image: <ImageSlot file="hero-notice.png" label="달력과 연필을 든 손" sizes="440px" tone="dark" />,
  },
  {
    key: "sample",
    label: "샘플 리포트",
    bg: "linear-gradient(120deg,#ffe27f 0%,#ffcf4a 100%)",
    light: true,
    tag: "샘플 리포트",
    title: (
      <>
        받게 될 결과지를
        <br />
        가입 전에 미리 보세요
      </>
    ),
    sub: "AI 1차 분석과 전문가 협진을 거친 리포트 예시입니다.",
    link: { href: "/design4/sample/report", label: "샘플 리포트 보기" },
    image: <ImageSlot file="hero-report.png" label="리포트 책자와 돋보기" sizes="440px" />,
  },
];

const quick = [
  {
    title: "무료 학력진단",
    desc: "국어·수학·과학 · 무료",
    href: "/exam",
    file: "quick-test.png",
    label: "시험지와 체크",
  },
  {
    title: "진단 서비스",
    desc: "네 단계 진단 과정 안내",
    href: "/design4/service",
    file: "quick-service.png",
    label: "클립보드와 연필",
  },
  {
    title: "샘플 리포트",
    desc: "결과지 미리 보기",
    href: "/design4/sample",
    file: "quick-sample.png",
    label: "펼친 리포트 책",
  },
];

/* 고정 공지를 앞에 — 공개 사이트 공지 목록과 같은 차례 */
const notices = [
  { title: "2026 파일럿 3회차 응시 안내", date: "2026.07.28", pinned: true, href: "/design4/community/notice/NT-001" },
  { title: "파일럿 회차는 전면 무료입니다", date: "2026.07.20", pinned: true, href: "/design4/community/notice/NT-002" },
  { title: "8월 12일 오전 시스템 점검", date: "2026.08.05", href: "/design4/community/notice/NT-003" },
];

const faqs = [
  "학력진단과 재능진단은 뭐가 다른가요?",
  "결과에 등급이나 순위가 나오나요?",
  "AI가 아이를 판정하는 건가요?",
  "부모가 옆에서 도와줘도 되나요?",
].map((q) => ({ q, href: "/design4/support/faq" }));

/* 진행 절차 — 공개 사이트 첫 화면의 다섯 단계를 한 줄씩 줄였다 */
const process = [
  { t: "가입 · 동의", d: "회원 유형을 고르고 목적별 동의를 확인합니다." },
  { t: "과목별 응시", d: "학생이 국어·수학·과학을 과목마다 따로 풉니다." },
  { t: "AI 1차 분석", d: "답안과 관찰 설문을 분석해 제안값을 만듭니다." },
  { t: "전문가 협진", d: "교육전문가가 케이스 회의에서 판정을 확정합니다." },
  { t: "리포트 발행", d: "승인된 뒤에야 보호자 화면에 결과가 열립니다." },
];

const more = [
  {
    badge: "모두의재능 소개",
    title: "우리가 보는 재능이란?",
    href: "/design4/about/talent",
    file: "more-talent.png",
    label: "퍼즐 조각을 맞추는 손",
  },
  {
    badge: "진단 원리",
    title: "AI와 전문가의 협진",
    href: "/design4/about/hitl",
    file: "more-hitl.png",
    label: "보고서에 도장을 찍는 두 손",
  },
  {
    badge: "기관 도입",
    title: "학교·학원 도입 문의",
    href: "/design4/partner/contact",
    file: "more-partner.png",
    label: "작은 학교 건물",
  },
];

export default function Design4HomePage() {
  return (
    <>
      {/* ① 큰 안내 판(왼쪽) + 그 아래 걸친 바로가기 띠 · 로그인 상자(오른쪽) */}
      <section className="d4-container mt-4 grid gap-5 lg:mt-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          <HeroCarousel slides={slides} />

          {/* 판 아래에 걸친 띠 — 바로가기 셋 */}
          <nav
            aria-label="바로가기"
            className="relative z-10 mx-3 -mt-10 grid overflow-hidden rounded-[22px] bg-white shadow-[0_24px_48px_-24px_rgba(15,31,75,0.4)] ring-1 ring-slate-100 sm:mx-6 sm:grid-cols-3"
          >
            {quick.map((q) => (
              <Link
                key={q.href}
                href={q.href}
                className="group flex items-center gap-3 border-t border-slate-100 px-5 py-5 lg:px-4 xl:px-5 transition-colors first:border-t-0 hover:bg-[var(--d4-tint)] sm:border-l sm:border-t-0 sm:first:border-l-0"
              >
                <span className="relative h-14 w-14 shrink-0 lg:h-12 lg:w-12 xl:h-14 xl:w-14">
                  <ImageSlot file={q.file} label={q.label} sizes="56px" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15.5px] font-bold tracking-[-0.02em] text-slate-900 group-hover:text-[var(--d4-blue)]">
                    {q.title}
                  </span>
                  <span className="mt-0.5 block text-[12.5px] leading-snug text-slate-500">{q.desc}</span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--d4-blue)] lg:hidden xl:block" />
              </Link>
            ))}
          </nav>
        </div>

        {/* 로그인 상자 — 처음 시안처럼 큰 판 오른쪽에 세운다 */}
        <aside className="flex flex-col items-center justify-center rounded-[28px] bg-[#f3f4f6] px-6 py-8 text-center">
          <p className="text-[15px] text-slate-600">진단을 시작하려면</p>
          <p className="mt-1 text-[24px] font-bold tracking-[-0.03em] text-slate-900">로그인해 주세요!</p>
          {/* 얼굴 — 그림 파일 없이 선으로 그린다 */}
          <svg
            aria-hidden
            viewBox="0 0 96 96"
            className="my-6 hidden h-24 w-24 rounded-full border border-dashed border-slate-300 bg-white p-1 lg:block"
          >
            <circle cx="48" cy="48" r="44" fill="#fff" />
            <circle cx="36" cy="44" r="2.6" fill="#334155" />
            <circle cx="60" cy="44" r="2.6" fill="#334155" />
            <path d="M40 58c4 4 12 4 16 0" stroke="#334155" strokeWidth="2.4" fill="none" strokeLinecap="round" />
            <circle cx="31" cy="54" r="4" fill="#fecaca" />
            <circle cx="65" cy="54" r="4" fill="#fecaca" />
          </svg>
          <Link
            href="/design4/login"
            className="mt-5 block w-full rounded-lg bg-slate-900 py-3.5 text-[14px] font-bold text-white hover:bg-slate-700 lg:mt-0"
          >
            로그인
          </Link>
          <Link
            href="/design4/signup/type"
            className="mt-2.5 block w-full rounded-lg border border-slate-300 bg-white py-3.5 text-[14px] font-medium text-slate-800 hover:border-slate-400"
          >
            회원가입
          </Link>
          <Link
            href="/design4/login/student"
            className="mt-4 inline-flex items-center gap-0.5 text-[13px] text-slate-500 hover:text-slate-900"
          >
            학생은 접속코드로 들어갑니다
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </aside>
      </section>

      {/* ③ 알림판 + 진행 절차 */}
      <section className="d4-container mt-14 grid gap-6 lg:mt-20 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <BoardTabs notices={notices} faqs={faqs} />

        <div className="rounded-[28px] bg-[var(--d4-tint)] p-6 sm:p-8">
          <h2 className="text-[20px] font-bold tracking-[-0.03em] text-slate-900 sm:text-[22px]">진단은 이렇게 진행됩니다</h2>
          <ol className="mt-6">
            {process.map((p, k) => (
              <li key={p.t} className="relative flex gap-4 pb-5 last:pb-0">
                {k < process.length - 1 && (
                  <span aria-hidden className="absolute bottom-0 left-[13px] top-7 w-px bg-[var(--d4-blue)]/25" />
                )}
                <span className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-[var(--d4-blue)] bg-white text-[12px] font-bold tabular-nums text-[var(--d4-blue)]">
                  {k + 1}
                </span>
                <div className="pt-0.5">
                  <p className="text-[15px] font-bold text-slate-900">{p.t}</p>
                  <p className="mt-0.5 text-[13.5px] leading-relaxed text-slate-600">{p.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ④ 더 알아보기 + 고객센터 */}
      <section className="d4-container mb-16 mt-14 lg:mb-20 lg:mt-20">
        <div className="rounded-[32px] bg-[var(--d4-ink)] px-6 py-10 text-white sm:px-10 lg:px-14 lg:py-14">
          <div className="grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-12">
            <div>
              <p className="text-[12px] font-bold tracking-[0.18em] text-white/50">MORE</p>
              <h2 className="mt-2 text-[26px] font-bold tracking-[-0.03em] sm:text-[30px]">더 알아보기</h2>
              <p className="mt-3 text-[14.5px] leading-relaxed text-white/70">
                무엇을 재능이라 부르는지, 누가 어떻게 판정하는지, 학교·학원은 어떻게 함께하는지 확인해 보세요.
              </p>
            </div>

            <ul className="grid gap-4 sm:grid-cols-3">
              {more.map((m) => (
                <li key={m.href}>
                  <Link
                    href={m.href}
                    className="group flex h-full flex-col rounded-[22px] bg-white/[0.06] p-5 ring-1 ring-white/10 transition-colors hover:bg-white/[0.11]"
                  >
                    <span className="relative h-24 w-full">
                      <ImageSlot file={m.file} label={m.label} sizes="200px" tone="dark" />
                    </span>
                    <span className="mt-4 text-[12.5px] font-bold text-white/55">{m.badge}</span>
                    <span className="mt-1 flex items-center justify-between gap-2 text-[17px] font-bold tracking-[-0.02em]">
                      {m.title}
                      <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-10 flex flex-col gap-5 border-t border-white/10 pt-8 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10">
                <Phone className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[13px] text-white/60">고객센터</p>
                <a
                  href={`tel:${company.tel.replace(/-/g, "")}`}
                  className="text-[26px] font-bold tabular-nums tracking-[-0.02em] hover:underline"
                >
                  {company.tel}
                </a>
              </div>
            </div>
            <p className="text-[13.5px] text-white/70">{company.hours}</p>
            <Link
              href="/design4/support/inquiry"
              className="inline-flex items-center justify-center gap-1.5 rounded-full bg-white px-5 py-3 text-[14px] font-bold text-[var(--d4-ink)] hover:bg-slate-100"
            >
              1:1 문의 남기기
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
