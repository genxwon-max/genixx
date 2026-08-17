import type { Metadata } from "next";
import Link from "next/link";
import TalentMap from "@/components/promo/TalentMap";
import TypeTicker from "@/components/promo/TypeTicker";
import PromoImage from "@/components/promo/PromoImage";
import SectionHead from "@/components/site/SectionHead";
import TeamPreview from "@/components/site/TeamPreview";
import { ArrowRight, CheckIcon, ChevronDown } from "@/components/Icons";
import { axes } from "@/lib/result";
import { company } from "@/lib/site";

export const metadata: Metadata = {
  /* 루트 레이아웃의 template("%s | GENIXX")가 뒤를 붙이므로 여기서는 앞부분만 쓴다 */
  title: "우리 아이의 빛나는 재능은 어디에 있을까요",
  description:
    "글·말·그림·행동까지 읽어 여덟 갈래로 그리는 재능 지도. AI가 1차로 분석하고 교육전문가가 확정합니다. 2026 파일럿 학력진단은 무료입니다.",
};

/* ─────────────────────────────────────────────────────────────
   글의 양에 대하여.

   초안은 칸마다 서너 문장을 넣었는데, 첫 화면부터 끝까지 읽을 것투성이라
   아무것도 눈에 안 들어왔다. 그래서 규칙을 하나 정했다 —
   **한 칸에 한 문장, 40자 안팎.** 더 할 말은 그 칸이 걸어 나가는 본문 페이지에
   있고, 홍보 화면이 할 일은 거기까지 데려다주는 것까지다.

   설명 대신 사진이 할 수 있는 자리는 사진에 맡겼다. 필요한 사진의 이름과
   지시문은 docs/home2-images.md에 있고, public/에 파일을 넣으면 자리표가
   저절로 사진으로 바뀐다(components/promo/PromoImage.tsx).

   ⚠ 원안에 있던 「13가지 재능」과 「지금까지 12,450명이 진단받았습니다」는
     쓰지 않았다. 좌표계는 여덟 갈래(lib/result.ts)이고, 2026 파일럿은 아직
     접수 중이라 셀 실적이 없다.
   ───────────────────────────────────────────────────────────── */

/** 가입 전에 확인하고 싶은 것들 — 히어로 버튼 아래 한 줄 */
const quickFacts = [
  "회원가입 즉시 이용",
  "국어·수학·과학 각 10문항",
  "교육전문가 협진으로 확정",
  "2026 파일럿 전면 무료",
];

/** 「무슨 서비스인가」 — 학부모가 실제로 던지는 세 질문 순서로 세운다 */
const whatWeDo = [
  {
    q: "무엇을 재나",
    t: "학력과 재능을 따로 잽니다",
    d: "성적이 좋아서 재능이 있는 것도, 낮아서 없는 것도 아니니까요.",
    cta: "여덟 갈래 보기",
    href: "/about/talent",
  },
  {
    q: "어떻게 재나",
    t: "시험지 한 장으로 정하지 않습니다",
    d: "쓴 글·말한 답·만든 것·보인 행동을 함께 읽습니다.",
    cta: "진단 원리 보기",
    href: "/about/hitl",
  },
  {
    q: "무엇을 받나",
    t: "등급표가 아니라 다음 할 일",
    d: "내일 무엇을 바꿔 볼지가 문장으로 적혀 옵니다.",
    cta: "샘플 리포트 보기",
    href: "/sample/report",
  },
];

/**
 * 「어떤 도움이 되는가」 — 기능이 아니라 학부모가 실제로 하는 말에서 시작한다.
 * 질문은 기존 홍보 첫 화면(app/(site)/page.tsx)과 같은 넷이다. 두 시안이 같은
 * 약속을 하고 있어야 어느 쪽을 골라도 말이 바뀌지 않는다.
 */
const situations = [
  {
    q: "무엇을 좋아하는지 모르겠어요",
    a: "성적에 가려진 강점 영역을 좌표로 짚어 드립니다.",
    href: "/about/talent",
  },
  {
    q: "학원 방향이 맞는지 모르겠어요",
    a: "어느 축이 강하고 어느 축이 아직인지 보고 순서를 정합니다.",
    href: "/sample/report",
  },
  {
    q: "성적표로 설명 안 되는 면이 있어요",
    a: "집과 교실에서 본 모습을 관찰 설문으로 함께 넣습니다.",
    href: "/service/talent-base",
  },
  {
    q: "영재원 준비 전 기준이 필요해요",
    a: "여덟 영역 좌표와 전문가 소견을 근거 자료로 쓰실 수 있습니다.",
    href: "/service/talent-advanced",
  },
];

/**
 * 아이가 남기는 네 가지 흔적.
 * 사진이 설명을 대신하는 자리라 글은 한 줄만 남겼다. 2026년에 실제로 읽는 것과
 * 2027 심화진단에서 열리는 것은 칸마다 밝혀 둔다.
 */
const traces = [
  {
    n: "글",
    t: "쓴 문장",
    d: "결론만이 아니라 근거를 함께 적었는지를 봅니다.",
    when: "2026 측정",
    live: true,
    image: "promo-trace-write",
    alt: "책상에서 공책에 연필로 문장을 쓰고 있는 초등학생의 손과 공책",
  },
  {
    n: "말",
    t: "말한 답",
    d: "같은 답이라도 설명하는 방식이 다릅니다.",
    when: "2027 확대",
    live: false,
    image: "promo-trace-speak",
    alt: "노트북 앞에서 두 손을 벌려 크기를 나타내며 신나게 설명하고 있는 초등학생",
  },
  {
    n: "손",
    t: "그리고 만든 것",
    d: "머릿속에서 형태를 돌려 보는 힘은 글로 재기 어렵습니다.",
    when: "2027 확대",
    live: false,
    image: "promo-trace-make",
    alt: "블록과 색종이로 입체 구조물을 만들고 있는 초등학생의 손",
  },
  {
    n: "행동",
    t: "보인 모습",
    d: "검사장에서 드러나지 않는 모습이 있습니다.",
    when: "2026 측정",
    live: true,
    image: "promo-trace-observe",
    alt: "교실에서 모둠 활동을 하는 아이들을 지켜보며 수첩에 메모하는 교사",
  },
];

/** 기존 진단과의 대비 — 두 줄로 줄였다. 길게 쓰면 남 흉보는 글이 된다 */
const contrast = [
  { label: "지금까지", text: "지필 한 번과 단편 설문으로 점수 하나를 냅니다.", on: false },
  {
    label: "GENIXX",
    text: "네 갈래 표현에 보호자·교사 관찰을 교차하고, 사람이 확정합니다.",
    on: true,
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
  { t: "노출", q: "만날 기회가 있는가" },
  { t: "허용", q: "몰입할 여유가 있는가" },
  { t: "반응", q: "시도에 어떤 말이 돌아오는가" },
  { t: "도구", q: "필요한 것에 닿을 수 있는가" },
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
    d: "AI 제안값을 케이스 회의에서 승인하거나 조정합니다.",
    when: "2026 파일럿 포함",
    live: true,
    href: "/about/hitl",
  },
  {
    n: "02",
    t: "경계선은 면담으로 다시 봅니다",
    d: "애매하면 확정하지 않고 다음 회차 재관찰로 넘깁니다.",
    when: "2026 파일럿 포함",
    live: true,
    href: "/about/charter",
  },
  {
    n: "03",
    t: "인증 전문가와 1:1 상담",
    d: "리포트를 함께 읽고 무엇을 바꿔 볼지 정리합니다.",
    when: "정식 서비스 예정",
    live: false,
    href: "/partner/certification",
  },
];

/** 가벼운 첫걸음 */
const steps = [
  { t: "가입하고 아이 등록", d: "이름과 생년월일이면 접속코드가 나옵니다." },
  { t: "세 과목 풀기", d: "각 10문항, 과목당 40분. 나눠서 봐도 됩니다." },
  { t: "관찰 설문 남기기", d: "보호자·지도교사가 각 5분. 건너뛰어도 됩니다." },
  { t: "전문가 확정 후 리포트", d: "사람이 확정한 뒤에야 결과가 열립니다." },
];

const btnFilled = "btn btn-lg bg-brand-900 text-white shadow-card hover:bg-brand-800";
const btnOutline =
  "btn btn-lg border border-brand-200 bg-white text-brand-800 hover:border-brand-400";

export default function PromoHome() {
  return (
    <>
      {/* ───── ① 히어로 ─────
          위는 카피, 가운데는 받게 될 리포트의 첫 장, 아래는 유형 예시.
          버튼은 그림 위에 둔다 — 카드가 세로로 길어 1440×900에서 접히는 선
          아래로 내려가기 때문이다. 대신 카드를 일부러 그 선에 걸치게 두어
          반쯤 잘린 카드가 스크롤을 부르게 하고, 끝에 내려가는 문을 하나 단다. */}
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

            <p className="type-lead mx-auto mt-5 max-w-xl text-slate-600">
              글·말·손·행동까지 함께 읽어 여덟 갈래로 그리는 재능 지도. 점수를 매기러 온 자리가
              아니라, 아직 아무도 보지 못한 자리를 찾으러 온 자리입니다.
            </p>
          </div>

          <div className="mx-auto mt-8 max-w-3xl">
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/exam" className={btnFilled}>
                AI 무료 재능 진단 체험하기
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/sample/report" className={btnOutline}>
                우리 아이 재능 지도 미리 보기
              </Link>
            </div>

            <ul className="mt-5 flex flex-wrap justify-center gap-x-5 gap-y-2">
              {quickFacts.map((t) => (
                <li key={t} className="type-meta flex items-center gap-1.5 text-slate-600">
                  <CheckIcon className="h-4 w-4 shrink-0 text-emerald-500" />
                  {t}
                </li>
              ))}
            </ul>
          </div>

          {/* 받게 될 리포트의 첫 장 */}
          <div className="mt-9 md:mt-11">
            <TalentMap />
          </div>

          <div className="mx-auto mt-7 max-w-3xl">
            <TypeTicker />
          </div>
        </div>

        {/* 다음 구간으로 내려가는 문 */}
        <div className="container-x pb-12 text-center md:pb-14">
          <a
            href="#what"
            className="type-meta inline-flex flex-col items-center gap-1.5 rounded-2xl px-4 py-2 font-bold text-brand-700 transition-colors hover:bg-white/70"
          >
            그래서 무엇을 해 주는 서비스인가요
            <ChevronDown aria-hidden className="h-5 w-5 animate-bounce" />
          </a>
        </div>
      </section>

      {/* ───── ② 한눈에 ───── */}
      <section id="what" className="section-y scroll-mt-24">
        <div className="container-x">
          <SectionHead
            align="center"
            eyebrow="한눈에"
            title="GENIXX는 이런 서비스입니다"
            lead="아이가 남긴 글·말·행동을 AI가 읽고 교육전문가가 확정해서, 여덟 갈래 재능 좌표와 다음에 할 일을 리포트로 드립니다."
          />

          <ol className="mt-10 grid gap-4 md:gap-5 lg:grid-cols-3">
            {whatWeDo.map((w) => (
              <li
                key={w.q}
                className="flex flex-col rounded-3xl border border-brand-100 bg-white p-7 shadow-card"
              >
                <span className="type-tag w-fit rounded-full bg-surface-blue px-3 py-1 text-brand-700">
                  {w.q}
                </span>
                <p className="type-h3 mt-4 font-black text-brand-950">{w.t}</p>
                <p className="type-body mt-2 flex-1 text-slate-600">{w.d}</p>
                <Link
                  href={w.href}
                  className="type-meta mt-5 inline-flex items-center gap-1.5 font-bold text-brand-700 hover:underline"
                >
                  {w.cta}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ───── ③ 어떤 도움이 되는가 ───── */}
      <section className="section-y bg-brand-50/50">
        <div className="container-x grid gap-8 lg:grid-cols-[minmax(0,420px)_1fr] lg:items-center lg:gap-12">
          {/* 제목이 사진보다 먼저 온다. 사진만 먼저 보이면 무슨 이야기가 시작되는지
              모르는 채로 큰 그림 한 장을 지나치게 된다. */}
          <div>
            <SectionHead
              eyebrow="이런 경우"
              title="이런 고민에서 시작하셨다면"
              lead="진단이 필요해지는 순간은 대체로 비슷합니다."
            />
            <PromoImage
              name="promo-parent-worry"
              alt="식탁에 마주 앉아 아이의 공책을 함께 들여다보며 이야기하는 학부모와 초등학생"
              ratio="aspect-[4/3]"
              sizes="(max-width: 1024px) 100vw, 420px"
              className="mt-7 shadow-card"
            />
          </div>

          <ul className="grid gap-3 sm:grid-cols-2">
            {situations.map((s) => (
              <li key={s.q}>
                <Link
                  href={s.href}
                  className="group flex h-full flex-col rounded-3xl border border-brand-100 bg-white p-6 shadow-card transition-shadow hover:shadow-float"
                >
                  <p className="type-h3 font-black text-brand-950">
                    <span aria-hidden className="mr-1.5 text-brand-400">
                      Q.
                    </span>
                    {s.q}
                  </p>
                  <p className="type-body mt-2.5 flex-1 text-slate-600">{s.a}</p>
                  <span className="type-meta mt-4 inline-flex items-center gap-1.5 font-bold text-brand-700">
                    보러 가기
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ───── ④ 네 가지 흔적 ─────
          사진이 설명을 대신하는 자리다. 「아이가 쓴 글을 봅니다」를 문장으로 세
          줄 쓰는 것보다, 연필을 쥔 손 사진 한 장이 빠르다. */}
      <section className="section-y">
        <div className="container-x">
          <SectionHead
            align="center"
            eyebrow="멀티모달 진단"
            title="아이가 남기는 네 가지 흔적"
            lead="글로 먼저 드러나는 아이가 있고, 말이나 손으로 드러나는 아이가 있습니다."
          />

          <ul className="mt-10 grid gap-4 sm:grid-cols-2 md:gap-5 lg:grid-cols-4">
            {traces.map((t) => (
              <li
                key={t.t}
                className={`flex flex-col overflow-hidden rounded-3xl border bg-white ${
                  t.live ? "border-brand-200 shadow-card" : "border-dashed border-brand-200"
                }`}
              >
                <PromoImage
                  name={t.image}
                  alt={t.alt}
                  ratio="aspect-[4/3]"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 280px"
                  className="rounded-none"
                />
                <div className="flex flex-1 flex-col p-6">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="type-h3 font-black text-brand-950">{t.t}</h3>
                    <span
                      className={`type-tag rounded-full px-2.5 py-0.5 ${
                        t.live ? "bg-surface-blue text-brand-700" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {t.when}
                    </span>
                  </div>
                  <p className="type-body mt-2 flex-1 text-slate-600">{t.d}</p>
                </div>
              </li>
            ))}
          </ul>

          {/* 기존 진단과의 대비 — 두 줄이면 충분하다 */}
          <dl className="mt-6 grid gap-3 sm:grid-cols-2">
            {contrast.map((c) => (
              <div
                key={c.label}
                className={`flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-3xl px-6 py-5 ${
                  c.on ? "bg-brand-950 text-white" : "border border-slate-200 bg-white"
                }`}
              >
                <dt
                  className={`type-tag rounded-full px-2.5 py-1 ${
                    c.on ? "bg-white/15 text-brand-100" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {c.label}
                </dt>
                <dd className={`type-body flex-1 ${c.on ? "text-brand-100" : "text-slate-500"}`}>
                  {c.text}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ───── ⑤ 여덟 갈래 ─────
          축마다 설명을 붙이면 여덟 문단이 된다. 여기서는 이름과 측정 시점만
          보이고, 뜻풀이는 /about/talent에 맡긴다. */}
      <section className="section-y bg-brand-50/50">
        <div className="container-x">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <SectionHead
              eyebrow="재능 좌표"
              title="여덟 갈래로 나눠 봅니다"
              lead="2026년에는 지필로 잴 수 있는 세 갈래를 먼저 재고, 다섯 갈래는 2027년 수행과제에서 엽니다."
            />
            <Link
              href="/about/talent"
              className="btn btn-md border border-brand-200 bg-white text-brand-800 hover:border-brand-400"
            >
              여덟 갈래 자세히 보기
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <ul className="mt-8 flex flex-wrap gap-2.5">
            {axes.map((a) => (
              <li
                key={a.id}
                className={`flex items-center gap-2.5 rounded-full py-2.5 pr-5 pl-2.5 ${
                  a.subject
                    ? "bg-brand-900 text-white shadow-card"
                    : "border border-dashed border-brand-300 bg-white text-brand-600"
                }`}
              >
                <span
                  aria-hidden
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-black ${
                    a.subject ? "bg-white/15 text-white" : "bg-brand-50 text-brand-500"
                  }`}
                >
                  {a.short}
                </span>
                <span className="type-h4 font-bold">{a.label}</span>
                <span className={`type-tag ${a.subject ? "text-brand-300" : "text-slate-400"}`}>
                  {a.subject ? "2026" : "2027"}
                </span>
              </li>
            ))}
          </ul>

          <p className="type-meta mt-5 text-slate-500">
            점수가 낮은 축은 &lsquo;없는 재능&rsquo;이 아니라{" "}
            <b className="font-bold text-brand-800">아직 발현되지 않은 영역</b>으로 표기합니다.
          </p>
        </div>
      </section>

      {/* ───── ⑥ 재능 발현 ───── */}
      <section className="section-y">
        <div className="container-x">
          <SectionHead
            align="center"
            eyebrow="재능 발현"
            title="재능은 조건이 맞아야 드러납니다"
            lead="타고난 소질이 저절로 재능이 되지는 않습니다. 그 사이에 발현 조건이 있습니다."
          />

          <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,460px)_1fr] lg:items-center lg:gap-12">
            <PromoImage
              name="promo-catalyst"
              alt="거실 바닥에 엎드려 자기가 만든 그림책을 소리 내어 읽으며 완전히 몰입해 있는 초등학생"
              ratio="aspect-[3/2]"
              sizes="(max-width: 1024px) 100vw, 460px"
              className="shadow-card"
            />

            <div>
              {/* 소질 → 조건 → 재능. Gagné DMGT가 소질과 재능을 갈라 둔 자리다 */}
              <ol className="grid gap-2 sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-stretch">
                <li className="rounded-2xl border border-brand-100 bg-white p-4 text-center">
                  <p className="type-tag text-slate-400">타고난 것</p>
                  <p className="type-h3 mt-1 font-black text-brand-950">소질</p>
                </li>
                <li aria-hidden className="flex items-center justify-center text-brand-300">
                  <span className="hidden sm:inline">→</span>
                  <span className="sm:hidden">↓</span>
                </li>
                <li className="rounded-2xl bg-brand-900 p-4 text-center text-white shadow-card">
                  <p className="type-tag text-brand-300">사이에 있는 것</p>
                  <p className="type-h3 mt-1 font-black">발현 조건</p>
                </li>
                <li aria-hidden className="flex items-center justify-center text-brand-300">
                  <span className="hidden sm:inline">→</span>
                  <span className="sm:hidden">↓</span>
                </li>
                <li className="rounded-2xl border border-brand-100 bg-white p-4 text-center">
                  <p className="type-tag text-slate-400">드러난 것</p>
                  <p className="type-h3 mt-1 font-black text-brand-950">재능</p>
                </li>
              </ol>

              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {catalysts.map((c) => (
                  <li
                    key={c.t}
                    className="flex items-baseline gap-2.5 rounded-2xl bg-brand-50/80 px-4 py-3"
                  >
                    <span className="type-h4 shrink-0 font-black text-brand-900">{c.t}</span>
                    <span className="type-meta text-slate-600">{c.q}</span>
                  </li>
                ))}
              </ul>

              {/* 과장 방지 — 우리가 하지 못하는 일을 먼저 적는다 */}
              <p className="type-body mt-5 text-slate-600">
                <b className="font-bold text-brand-900">재능을 만들어 드리지는 못합니다.</b> 그 일은
                집과 교실에서 매일 일어납니다. 우리가 하는 일은 그 앞에 지도를 놓아 드리는 것입니다.
              </p>
              <Link
                href="/insight/parenting"
                className="type-meta mt-4 inline-flex items-center gap-1.5 font-bold text-brand-700 hover:underline"
              >
                집에서 만드는 발현 조건 보기
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ───── ⑦ 전문가 협진 ───── */}
      <section className="section-y bg-brand-50/50">
        <div className="container-x">
          <div className="grid gap-8 lg:grid-cols-[1fr_minmax(0,440px)] lg:items-center lg:gap-12">
            <SectionHead
              eyebrow="전문가 협진"
              title="리포트를 혼자 읽게 두지 않습니다"
              lead="결과지를 받고 '그래서 무엇을 해야 하나요'에서 멈추면 진단은 아무 일도 하지 않은 셈입니다. 사람이 붙는 자리를 세 군데 두었습니다."
            />
            <PromoImage
              name="promo-expert"
              alt="회의실 테이블에 둘러앉아 출력된 진단 결과 자료의 한 줄을 짚어 가며 논의하는 교육 전문가 세 명"
              ratio="aspect-[3/2]"
              sizes="(max-width: 1024px) 100vw, 440px"
              className="shadow-card"
            />
          </div>

          <ol className="mt-9 grid gap-4 md:gap-5 lg:grid-cols-3">
            {expertTiers.map((e) => (
              <li key={e.n}>
                <Link
                  href={e.href}
                  className={`group flex h-full flex-col rounded-3xl border bg-white p-6 transition-shadow hover:shadow-float ${
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
          <div className="mt-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-4 rounded-3xl border border-brand-100 bg-white px-6 py-5 md:px-8">
            <div className="min-w-0">
              <p className="type-h3 font-black text-brand-950">지금 바로 물어보셔도 됩니다</p>
              <p className="type-meta mt-1 text-slate-600">전화 상담 {company.hours}</p>
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
            lead="처음부터 큰 결정을 하지 않으셔도 됩니다. 지금 위치만 먼저 확인해 보세요."
          />

          <ol className="mt-10 grid gap-4 sm:grid-cols-2 md:gap-5 lg:grid-cols-4">
            {steps.map((s, i) => (
              <li key={s.t} className="rounded-3xl bg-white/10 p-6">
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

          <p className="type-meta mt-8 text-center text-brand-200">
            <a
              href={`tel:${company.tel.replace(/-/g, "")}`}
              className="type-h3 font-black text-white hover:underline"
            >
              {company.tel}
            </a>
            <span className="mx-3">{company.hours}</span>
          </p>
        </div>
      </section>
    </>
  );
}
