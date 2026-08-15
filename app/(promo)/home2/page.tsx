import type { Metadata } from "next";
import Link from "next/link";
import TalentMap from "@/components/promo/TalentMap";
import TypeTicker from "@/components/promo/TypeTicker";
import SectionHead from "@/components/site/SectionHead";
import TeamPreview from "@/components/site/TeamPreview";
import { ArrowRight, CheckIcon } from "@/components/Icons";
import { axes } from "@/lib/result";
import { subjectOf } from "@/lib/exam";
import { company } from "@/lib/site";

export const metadata: Metadata = {
  /* 루트 레이아웃의 template("%s | GENIXX")가 뒤를 붙이므로 여기서는 앞부분만 쓴다 */
  title: "우리 아이의 빛나는 재능은 어디에 있을까요",
  description:
    "글·말·그림·행동까지 읽어 여덟 갈래로 그리는 재능 지도. AI가 1차로 분석하고 교육전문가가 확정합니다. 2026 파일럿 학력진단은 무료입니다.",
};

/* ─────────────────────────────────────────────────────────────
   히어로 카피.

   ⚠ 원안에 있던 「13가지 재능」과 「지금까지 12,450명이 진단받았습니다」는
     쓰지 않았다. 이 서비스의 좌표계는 여덟 갈래(lib/result.ts의 axes)이고,
     2026 파일럿은 아직 접수 중이라 셀 실적이 없다. 없는 숫자를 걸면 첫 화면이
     통째로 거짓이 되고, 진단 윤리 헌장(PUB-02-4)과도 정면으로 부딪친다.
     기대감은 「무엇을 하는 서비스인가」로 만들고, 숫자는 진짜만 쓴다.
   ───────────────────────────────────────────────────────────── */

/** 가입 전에 확인하고 싶은 것들 — 히어로 버튼 아래 한 줄 */
const quickFacts = [
  "회원가입 즉시 이용",
  "국어·수학·과학 각 10문항",
  "교육전문가 협진으로 확정",
  "2026 파일럿 전면 무료",
];

/** 3초 요약 — 기존 진단과 무엇이 다른가 */
const contrast = {
  before: {
    label: "지금까지의 진단",
    lines: [
      "지필 한 번과 단편적인 설문",
      "그날의 컨디션과 문제 형식이 결과를 가른다",
      "점수 하나로 줄을 세우고 끝난다",
      "낮은 점수는 곧 '없는 재능'으로 읽힌다",
    ],
  },
  after: {
    label: "GENIXX의 다차원 진단",
    lines: [
      "글·말·그림·행동 네 갈래의 표현을 함께 본다",
      "학생 응답에 보호자·교사 관찰을 교차한다",
      "AI가 낸 제안을 교육전문가가 다시 확정한다",
      "재지 않은 축은 '미발현'으로 따로 표기한다",
    ],
  },
};

/**
 * 아이가 남기는 네 가지 흔적.
 * 2026년에 실제로 읽는 것과 2027 심화진단에서 열리는 것을 칸마다 밝혀 둔다.
 */
const traces = [
  {
    n: "글",
    t: "쓴 문장",
    d: "서술형 답안에서 결론만 보지 않고, 근거를 함께 적었는지와 문장을 어떤 순서로 세웠는지를 읽습니다.",
    when: "2026 측정",
    tone: "bg-surface-blue text-brand-700",
    live: true,
  },
  {
    n: "말",
    t: "말한 답",
    d: "같은 답이라도 설명하는 방식이 다릅니다. 음성 응답의 설명 구조와 되짚는 과정을 봅니다.",
    when: "2027 확대",
    tone: "bg-surface-violet text-accent-600",
    live: false,
  },
  {
    n: "손",
    t: "그리고 만든 것",
    d: "머릿속에서 형태를 돌려 보는 힘은 글로 재기 어렵습니다. 수행과제의 조작 과정 자체를 기록합니다.",
    when: "2027 확대",
    tone: "bg-surface-mint text-emerald-700",
    live: false,
  },
  {
    n: "행동",
    t: "집과 교실에서 보인 모습",
    d: "검사장에서 드러나지 않는 모습이 있습니다. 보호자와 지도교사가 실제로 본 행동을 설문으로 받습니다.",
    when: "2026 측정",
    tone: "bg-surface-amber text-amber-700",
    live: true,
  },
];

/**
 * 발현 조건 4요소.
 *
 * ⚠ 「영재성」이라고 쓰지 않는다. Gagné DMGT에서 gift(소질)와 talent(재능)는 다른
 *   말이고, 국내에서 「영재」는 영재교육진흥법상 판별·선발 용어다. 홍보 문구에
 *   영재성을 걸면 영재 판별 기관으로 읽히고, 무엇보다 진단 윤리 헌장 Article 7
 *   (라벨링 방지 — 명사형 라벨 대신 관찰된 행동을 서술한다)과 정면으로 부딪친다.
 *   같은 뜻을 이 서비스의 말로 쓰면 「재능」과 「발현」이다.
 *
 * 출처는 /insight/parenting(PUB-05-2)의 발현 조건 4요소. 홍보 문구와 본문이
 * 어긋나지 않도록 같은 넷을 같은 순서로 쓴다.
 */
const catalysts = [
  {
    t: "노출",
    q: "만날 기회가 있는가",
    d: "한 번도 해 본 적 없는 일에서 재능이 드러날 수는 없습니다. 아이가 그 영역을 얼마나 자주 만나는지가 출발점입니다.",
  },
  {
    t: "허용",
    q: "몰입할 여유가 있는가",
    d: "빠져들 시간과 실패해도 되는 여유가 함께 있어야 합니다. 시간표가 빽빽하면 깊이 들어갈 자리가 없습니다.",
  },
  {
    t: "반응",
    q: "시도했을 때 어떤 말이 돌아오는가",
    d: "결과가 아니라 시도에 반응이 돌아올 때 아이는 한 번 더 합니다. 이 항목이 가장 크게 갈립니다.",
  },
  {
    t: "도구",
    q: "필요한 것에 닿을 수 있는가",
    d: "재료·기기·공간처럼 손에 닿아야 하는 것들입니다. 없다고 재능이 없는 게 아니라, 아직 보일 자리가 없는 것입니다.",
  },
];

/**
 * 전문가가 개입하는 세 자리.
 *
 * `when`은 지금 되는 것과 정식 서비스에서 열리는 것을 가른다. 요금 안내
 * (PUB-03-5)가 해석 상담을 「패키지 · 정식 서비스 예정」으로 적어 두었으므로,
 * 홍보 화면에서 지금 되는 것처럼 쓰면 안 된다.
 */
const expertTiers = [
  {
    n: "01",
    t: "판정을 사람이 확정합니다",
    d: "AI가 낸 제안값을 교육과정 전문가와 계량심리 실무자가 케이스 회의에서 승인하거나 조정합니다. 승인 전에는 학부모 화면에 어떤 결과도 열리지 않습니다.",
    when: "2026 파일럿 포함",
    live: true,
    href: "/about/hitl",
  },
  {
    n: "02",
    t: "경계선은 면담으로 다시 봅니다",
    d: "판정 컷 경계에 걸린 아이는 억지로 확정하지 않습니다. 면담으로 근거를 확인하거나, 다음 회차 재관찰로 넘깁니다. 애매한 채로 이름표를 붙이지 않기 위해서입니다.",
    when: "2026 파일럿 포함",
    live: true,
    href: "/about/charter",
  },
  {
    n: "03",
    t: "인증 해석 전문가와 1:1 상담",
    d: "인증 과정을 수료한 전문가가 리포트를 함께 읽고, 이 아이에게 지금 무엇을 바꿔 볼지 정리합니다. 수료증이 곧 해석·상담 권한이라 아무나 상담하지 않습니다.",
    when: "정식 서비스 예정",
    live: false,
    href: "/partner/certification",
  },
];

/** 리포트에 실제로 담기는 것 — 점수표가 아니라는 걸 세 칸으로 보인다 */
const reportParts = [
  {
    k: "01",
    t: "재능 유형 한 줄",
    d: "「이야기 탐험가형 — 읽은 것을 자기 말로 다시 짜는 아이」처럼, 등급이 아니라 이름으로 받습니다.",
  },
  {
    k: "02",
    t: "드러나는 조건",
    d: "이 아이의 강점이 어떤 과제와 어떤 상황에서 나타났는지를 근거와 함께 적습니다. 발현 조건이 곧 다음 계획입니다.",
  },
  {
    k: "03",
    t: "내일 해 볼 것 세 가지",
    d: "학원을 더 다니라는 말 대신, 집에서 오늘 저녁에 시작할 수 있는 활동을 적어 드립니다.",
  },
];

/** 가벼운 첫걸음 */
const steps = [
  { t: "가입하고 아이 등록", d: "이름과 생년월일이면 됩니다. 8자리 접속코드가 바로 나옵니다." },
  { t: "세 과목 풀기", d: "국어·수학·과학 각 10문항. 과목당 40분이고 나눠서 봐도 됩니다." },
  {
    t: "관찰 설문 남기기",
    d: "보호자와 지도교사가 본 모습을 각 5분쯤 적습니다. 건너뛰어도 진단은 진행됩니다.",
  },
  { t: "전문가 확정 후 리포트", d: "AI 제안을 교육전문가가 검토해 확정한 뒤에야 결과가 열립니다." },
];

const btnFilled = "btn btn-lg bg-brand-900 text-white shadow-card hover:bg-brand-800";
const btnOutline =
  "btn btn-lg border border-brand-200 bg-white text-brand-800 hover:border-brand-400";

export default function PromoHome() {
  return (
    <>
      {/* ───── ① 히어로 ─────
          원안의 배치를 그대로 따른다 — 위 1/3은 카피, 가운데는 재능 지도,
          아래는 버튼과 유형 예시. 기존 홍보 히어로가 좌우 2단인 것과 달리
          가운데로 모아 세워, 두 시안을 나란히 놓았을 때 성격이 바로 갈린다. */}
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 via-[#f4f7ff] to-white">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 left-1/2 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-brand-200/30 blur-3xl"
        />

        <div className="container-x section-pt relative">
          <div className="mx-auto max-w-3xl text-center">
            <p className="type-eyebrow inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-brand-700 shadow-card">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
              2026년 1회차(26A) 접수 중 · 파일럿 전면 무료
            </p>

            <h1 className="type-display mt-5 font-black text-brand-950">
              남들과 다른 우리 아이,
              <br />
              진짜 <span className="text-brand-600">빛나는 재능</span>은
              <br />
              어디에 있을까요?
            </h1>

            <p className="type-lead mx-auto mt-5 max-w-2xl text-slate-600">
              글·말·그림·행동까지, 아이가 남기는 네 가지 흔적을 함께 읽습니다. 여덟 갈래로 그리는
              우리 아이만의 재능 지도 — 점수를 매기러 온 자리가 아니라, 아직 아무도 보지 못한 자리를
              찾으러 온 자리입니다.
            </p>
          </div>

          {/* 가운데 — 재능 지도 */}
          <div className="mt-10 md:mt-12">
            <TalentMap />
          </div>

          {/* 아래 — 버튼과 유형 예시 */}
          <div className="mx-auto mt-8 max-w-3xl md:mt-10">
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/exam" className={btnFilled}>
                AI 무료 재능 진단 체험하기
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/sample/report" className={btnOutline}>
                우리 아이 재능 지도 미리 보기
              </Link>
            </div>

            <ul className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2">
              {quickFacts.map((t) => (
                <li key={t} className="type-meta flex items-center gap-1.5 text-slate-600">
                  <CheckIcon className="h-4 w-4 shrink-0 text-emerald-500" />
                  {t}
                </li>
              ))}
            </ul>

            <div className="mt-7">
              <TypeTicker />
            </div>
          </div>
        </div>

        {/* 첫인상 한 줄 — 「평가받는 자리」라는 부담을 여기서 한 번 끊는다 */}
        <div className="container-x section-pb mt-10">
          <p className="type-body mx-auto max-w-2xl rounded-3xl border border-brand-100 bg-white/70 px-6 py-5 text-center text-slate-600">
            아이를 시험대에 세우는 시간이 아닙니다.{" "}
            <b className="font-bold text-brand-800">아이의 가능성을 함께 찾아보는 탐험</b>에
            가깝습니다. 낮게 나온 축은 &lsquo;없는 재능&rsquo;이 아니라 &lsquo;아직 보여줄 기회가
            없었던 자리&rsquo;로 적습니다.
          </p>
        </div>
      </section>

      {/* ───── ② 3초 요약 — 무엇이 다른가 ───── */}
      <section className="section-y bg-brand-50/50">
        <div className="container-x">
          <SectionHead
            align="center"
            eyebrow="왜 다른가"
            title="한 번의 시험지로는 담기지 않습니다"
            lead="아이가 자기를 드러내는 방식은 하나가 아닙니다. 표현 통로를 넷으로 늘리고, 그 넷을 교차해서 읽습니다."
          />

          <div className="mt-10 grid gap-4 md:gap-5 lg:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-white p-7 md:p-8">
              <p className="type-tag w-fit rounded-full bg-slate-100 px-3 py-1 text-slate-500">
                {contrast.before.label}
              </p>
              <ul className="mt-5 space-y-3">
                {contrast.before.lines.map((l) => (
                  <li key={l} className="type-body flex gap-3 text-slate-500">
                    <span aria-hidden className="mt-0.5 shrink-0 font-black text-slate-300">
                      ✕
                    </span>
                    {l}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-3xl bg-brand-950 p-7 text-white shadow-float md:p-8">
              <p className="type-tag w-fit rounded-full bg-white/15 px-3 py-1 text-brand-100">
                {contrast.after.label}
              </p>
              <ul className="mt-5 space-y-3">
                {contrast.after.lines.map((l) => (
                  <li key={l} className="type-body flex gap-3 text-brand-100">
                    <CheckIcon className="mt-1 h-4 w-4 shrink-0 text-brand-300" />
                    {l}
                  </li>
                ))}
              </ul>
              <Link
                href="/about/hitl"
                className="type-meta mt-6 inline-flex items-center gap-1.5 font-bold text-white hover:underline"
              >
                AI와 사람이 나누어 맡는 방식 보기
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ───── ③ 네 가지 흔적 ───── */}
      <section className="section-y">
        <div className="container-x">
          <SectionHead
            eyebrow="멀티모달 진단"
            title="아이가 남기는 네 가지 흔적"
            lead="글로 잘 드러나는 아이가 있고, 말이나 손으로 먼저 드러나는 아이가 있습니다. 어느 통로로 나타나든 놓치지 않으려고 네 갈래를 함께 봅니다."
          />

          <ul className="mt-10 grid gap-4 sm:grid-cols-2 md:gap-5 lg:grid-cols-4">
            {traces.map((t) => (
              <li
                key={t.t}
                className={`flex flex-col rounded-3xl border bg-white p-6 md:p-7 ${
                  t.live ? "border-brand-200 shadow-card" : "border-dashed border-brand-200"
                }`}
              >
                <span
                  aria-hidden
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl text-[15px] font-black ${t.tone}`}
                >
                  {t.n}
                </span>
                <h3 className="type-h3 mt-4 font-black text-brand-950">{t.t}</h3>
                <p className="type-body mt-2 flex-1 text-slate-600">{t.d}</p>
                <p className="type-meta mt-4 border-t border-brand-100 pt-3 font-bold text-slate-500">
                  {t.when}
                </p>
              </li>
            ))}
          </ul>

          {/* 흔적 → AI → 사람 */}
          <ol className="mt-6 grid gap-3 rounded-3xl bg-brand-50/70 p-6 md:grid-cols-3 md:p-7">
            {[
              {
                t: "네 갈래를 한꺼번에",
                d: "표현 통로마다 따로 채점하지 않고, 같은 아이의 자료로 묶어 봅니다.",
              },
              { t: "AI 1차 분석", d: "정량·정성 자료를 병렬로 읽어 여덟 축의 제안값을 냅니다." },
              {
                t: "교육전문가 확정",
                d: "케이스 회의에서 승인·조정하고, 경계선은 다음 회차로 유보합니다.",
              },
            ].map((s, i) => (
              <li key={s.t} className="flex gap-4">
                <span className="type-h4 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white font-black text-brand-700">
                  {i + 1}
                </span>
                <div>
                  <p className="type-h4 font-black text-brand-950">{s.t}</p>
                  <p className="type-meta mt-1 text-slate-600">{s.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ───── ④ 여덟 갈래 ───── */}
      <section className="section-y bg-brand-50/50">
        <div className="container-x">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <SectionHead
              eyebrow="재능 좌표"
              title="여덟 갈래로 나눠 봅니다"
              lead="2026 파일럿에서는 지필로 잴 수 있는 세 갈래를 먼저 재고, 나머지 다섯 갈래는 2027 심화진단의 멀티모달 수행과제에서 엽니다."
            />
            <Link
              href="/about/talent"
              className="btn btn-md border border-brand-200 bg-white text-brand-800 hover:border-brand-400"
            >
              재능을 어떻게 정의하는지 보기
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {axes.map((a) => {
              const subject = a.subject ? subjectOf(a.subject) : null;
              return (
                <li
                  key={a.id}
                  className={`flex flex-col rounded-3xl border p-5 ${
                    subject
                      ? "border-brand-200 bg-white shadow-card"
                      : "border-dashed border-brand-200 bg-white/50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      aria-hidden
                      className={`flex h-9 w-9 items-center justify-center rounded-full text-[13px] font-black ${
                        subject
                          ? "bg-brand-900 text-white"
                          : "border border-dashed border-brand-300 text-brand-500"
                      }`}
                    >
                      {a.short}
                    </span>
                    <span
                      className={`type-tag rounded-full px-2.5 py-0.5 ${
                        subject ? "bg-surface-blue text-brand-700" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {subject ? "2026 측정" : "2027 확대"}
                    </span>
                  </div>
                  <p className="type-h3 mt-3 font-black text-brand-950">{a.label}</p>
                  <p className="type-body mt-1.5 flex-1 text-slate-600">{a.desc}</p>
                  <p className="type-meta mt-4 border-t border-brand-100 pt-3 text-slate-500">
                    {subject
                      ? `${subject.name} 10문항 · ${subject.limitMin}분`
                      : "심화진단 수행과제"}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* ───── ⑤ 재능 발현 ───── */}
      <section className="section-y">
        <div className="container-x">
          <SectionHead
            align="center"
            eyebrow="재능 발현"
            title="재능은 조건이 맞아야 드러납니다"
            lead="타고난 소질이 저절로 재능이 되지는 않습니다. 그 사이에 발현 조건이 있습니다. 어떤 아이는 조건이 이미 맞아 일찍 드러나고, 어떤 아이는 조건이 어긋나 있어 아직 보이지 않을 뿐입니다."
          />

          {/* 소질 → 조건 → 재능. Gagné DMGT가 소질과 재능을 갈라 둔 자리를
              그림으로 옮긴 것이다. 가운데 칸이 이 서비스가 실제로 하는 일이다. */}
          <ol className="mt-10 grid items-stretch gap-3 md:grid-cols-[1fr_auto_1.2fr_auto_1fr] md:gap-2">
            <li className="rounded-3xl border border-brand-100 bg-white p-6 text-center">
              <p className="type-tag text-slate-400">타고난 것</p>
              <p className="type-h3 mt-2 font-black text-brand-950">소질</p>
              <p className="type-body mt-2 text-slate-600">
                아직 계발되지 않은 잠재력. 눈으로 볼 수 없어 그대로는 잴 수 없습니다.
              </p>
            </li>
            <li aria-hidden className="flex items-center justify-center text-brand-300 md:px-1">
              <span className="hidden md:inline">→</span>
              <span className="md:hidden">↓</span>
            </li>
            <li className="rounded-3xl bg-brand-900 p-6 text-center text-white shadow-float">
              <p className="type-tag text-brand-300">사이에 있는 것</p>
              <p className="type-h3 mt-2 font-black">발현 조건</p>
              <p className="type-body mt-2 text-brand-100">
                노출·허용·반응·도구 네 가지. 이 조건이 맞아떨어질 때 소질이 비로소 행동으로
                나타납니다.
              </p>
            </li>
            <li aria-hidden className="flex items-center justify-center text-brand-300 md:px-1">
              <span className="hidden md:inline">→</span>
              <span className="md:hidden">↓</span>
            </li>
            <li className="rounded-3xl border border-brand-100 bg-white p-6 text-center">
              <p className="type-tag text-slate-400">드러난 것</p>
              <p className="type-h3 mt-2 font-black text-brand-950">재능</p>
              <p className="type-body mt-2 text-slate-600">
                실제 수행으로 나타난 힘. 진단이 잴 수 있는 것은 여기까지입니다.
              </p>
            </li>
          </ol>

          <ul className="mt-6 grid gap-4 sm:grid-cols-2 md:gap-5 lg:grid-cols-4">
            {catalysts.map((c) => (
              <li
                key={c.t}
                className="rounded-3xl border border-brand-100 bg-white p-6 shadow-card md:p-7"
              >
                <h3 className="type-h3 font-black text-brand-950">{c.t}</h3>
                <p className="type-meta mt-1 font-bold text-brand-600">{c.q}</p>
                <p className="type-body mt-3 text-slate-600">{c.d}</p>
              </li>
            ))}
          </ul>

          {/* 과장 방지 — 우리가 하지 못하는 일을 먼저 적는다 */}
          <div className="mt-8 rounded-3xl bg-brand-50/70 px-6 py-6 md:px-8">
            <p className="type-lead mx-auto max-w-3xl text-center text-slate-600">
              <b className="font-bold text-brand-900">
                GENIXX가 아이의 재능을 만들어 드리지는 못합니다.
              </b>{" "}
              재능을 키우는 일은 집과 교실에서 매일 일어납니다. 우리가 하는 일은 그 앞에 지도를 놓아
              드리는 것입니다 — 지금 어느 축이 드러나 있고, 어느 축이 어떤 조건을 기다리고 있는지.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href="/insight/parenting"
                className="btn btn-md border border-brand-200 bg-white text-brand-800 hover:border-brand-400"
              >
                집에서 만드는 발현 조건 보기
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/about/theory"
                className="btn btn-md border border-brand-200 bg-white text-brand-800 hover:border-brand-400"
              >
                이론적 근거 보기
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ───── ⑥ 결과물 미리보기 ───── */}
      <section className="section-y">
        <div className="container-x grid items-center gap-10 lg:grid-cols-[1fr_1.05fr] lg:gap-14">
          <div>
            <SectionHead
              eyebrow="진단 결과물"
              title={
                <>
                  점수표가 아니라
                  <br />
                  아이를 설명하는 글입니다
                </>
              }
              lead="숫자만 적힌 표를 받으면 그다음에 무엇을 해야 할지 알 수 없습니다. 그래서 리포트는 유형·조건·다음 할 일 세 덩어리로 씁니다."
            />
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/sample/report" className={btnFilled}>
                샘플 리포트 전체 보기
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/sample/demo" className={btnOutline}>
                대시보드 데모 만져 보기
              </Link>
            </div>
            <p className="type-meta mt-4 text-slate-500">
              가입하지 않아도 전 페이지를 그대로 공개합니다.
            </p>
          </div>

          <ol className="grid gap-3">
            {reportParts.map((p) => (
              <li
                key={p.k}
                className="flex gap-5 rounded-3xl border border-brand-100 bg-white p-6 shadow-card md:p-7"
              >
                <span className="type-meta font-black tabular-nums text-brand-300">{p.k}</span>
                <div>
                  <p className="type-h3 font-black text-brand-950">{p.t}</p>
                  <p className="type-body mt-2 text-slate-600">{p.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ───── ⑦ 전문가 상담 ───── */}
      <section className="section-y bg-brand-50/50">
        <div className="container-x">
          <SectionHead
            align="center"
            eyebrow="전문가 협진"
            title="리포트를 혼자 읽게 두지 않습니다"
            lead="결과지를 받고 '그래서 무엇을 해야 하나요'에서 멈추면 진단은 아무 일도 하지 않은 셈입니다. 사람이 붙는 자리를 세 군데 두었습니다."
          />

          <ol className="mt-10 grid gap-4 md:gap-5 lg:grid-cols-3">
            {expertTiers.map((e) => (
              <li key={e.n}>
                <Link
                  href={e.href}
                  className={`group flex h-full flex-col rounded-3xl border bg-white p-6 transition-shadow hover:shadow-float md:p-7 ${
                    e.live ? "border-brand-200 shadow-card" : "border-dashed border-brand-200"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="type-meta font-black tabular-nums text-brand-300">{e.n}</span>
                    <span
                      className={`type-tag rounded-full px-2.5 py-0.5 ${
                        e.live ? "bg-surface-blue text-brand-700" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {e.when}
                    </span>
                  </div>
                  <h3 className="type-h3 mt-3 font-black text-brand-950">{e.t}</h3>
                  <p className="type-body mt-2 flex-1 text-slate-600">{e.d}</p>
                  <span className="type-meta mt-5 inline-flex items-center gap-1.5 font-bold text-brand-700">
                    자세히 보기
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              </li>
            ))}
          </ol>

          {/* 정식 서비스를 기다리지 않아도 지금 물어볼 수 있는 창구 */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-4 rounded-3xl border border-brand-100 bg-white px-6 py-6 md:px-8">
            <div className="min-w-0">
              <p className="type-h3 font-black text-brand-950">지금 바로 물어보셔도 됩니다</p>
              <p className="type-body mt-1.5 text-slate-600">
                진단을 신청하기 전에 궁금한 것은 설명회 영상과 1:1 문의로 먼저 확인하실 수 있습니다.
                전화 상담은 {company.hours}에 받습니다.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/support/orientation"
                className="btn btn-md bg-brand-900 text-white hover:bg-brand-800"
              >
                학부모 설명회 영상
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/support/inquiry"
                className="btn btn-md border border-brand-200 bg-white text-brand-800 hover:border-brand-400"
              >
                1:1 문의 남기기
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 누가 확정하고 누가 상담하는지 — 이름과 이력을 그대로 공개한다 */}
      <TeamPreview />

      {/* ───── ⑧ 가벼운 첫걸음 ───── */}
      <section className="section-y bg-brand-950 text-white">
        <div className="container-x">
          <SectionHead
            align="center"
            tone="dark"
            eyebrow="시작하기"
            title="12문항이면 첫걸음이 됩니다"
            lead="처음부터 큰 결정을 하지 않으셔도 됩니다. 무료 학력진단으로 지금 위치만 먼저 확인해 보세요."
          />

          <ol className="mt-10 grid gap-4 sm:grid-cols-2 md:gap-5 lg:grid-cols-4">
            {steps.map((s, i) => (
              <li key={s.t} className="rounded-3xl bg-white/10 p-6 md:p-7">
                <span className="type-h4 flex h-9 w-9 items-center justify-center rounded-full bg-white font-black text-brand-900">
                  {i + 1}
                </span>
                <h3 className="type-h3 mt-4 font-black">{s.t}</h3>
                <p className="type-body mt-2 text-brand-100">{s.d}</p>
              </li>
            ))}
          </ol>

          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link href="/exam" className="btn btn-lg bg-white text-brand-900 hover:bg-brand-50">
              AI 무료 재능 진단 체험하기
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/signup/type"
              className="btn btn-lg border border-white/30 text-white hover:bg-white/10"
            >
              학부모로 회원가입
            </Link>
          </div>

          <div className="mx-auto mt-10 flex max-w-xl flex-wrap items-center justify-center gap-x-6 gap-y-2 rounded-3xl bg-white/10 px-6 py-5 text-center">
            <a
              href={`tel:${company.tel.replace(/-/g, "")}`}
              className="type-h3 font-black text-white hover:underline"
            >
              {company.tel}
            </a>
            <span className="type-meta text-brand-200">{company.hours}</span>
            <Link
              href="/support/inquiry"
              className="type-meta font-bold text-brand-100 hover:underline"
            >
              1:1 문의 남기기
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
