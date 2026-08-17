import type { Metadata } from "next";
import Link from "next/link";
import TalentMap from "@/components/promo/TalentMap";
import TypeTicker from "@/components/promo/TypeTicker";
import PromoImage from "@/components/promo/PromoImage";
import SectionHead from "@/components/site/SectionHead";
import TeamPreview from "@/components/site/TeamPreview";
import { ArrowRight, ChevronDown } from "@/components/Icons";
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

   ⚠ 원안에 있던 「13가지 재능」과 「지금까지 12,450명이 진단받았습니다」는
     쓰지 않았다. 좌표계는 여덟 갈래(lib/result.ts)이고, 2026 파일럿은 아직
     접수 중이라 셀 실적이 없다.

   ───── 모양에 대하여 ─────

   한 번 갈아엎었다. 처음에는 구간마다 똑같이 「둥근 상자 + 제목 + 한 줄 +
   자세히 보기 →」를 놓았는데, 여덟 구간이 전부 같은 문장을 말하니 화면 전체가
   기계가 찍어낸 것처럼 보였다. 세 가지를 바꿨다.

   1) 모서리를 죽였다. rounded-3xl(24px)·알약을 rounded-md(6px)와 각진 태그로
      내렸다. 많이 둥글수록 가벼워 보이는데, 이 서비스가 파는 것은 사람이
      확정한 판정이라 가벼우면 곤란하다.
   2) 그림자를 실선으로 바꿨다. 떠 있는 카드를 줄이고 실선으로 칸을 나눈다.
      떠 있는 것이 많으면 광고지, 선으로 나뉘면 문서로 읽힌다.
   3) 사진 위에 말을 얹었다. 사진만 놓으면 장식으로 읽고 지나간다. 「소질 →
      발현 조건 → 재능」처럼 그 구간이 할 말을 사진 위에 올려 한 덩어리로 읽게
      했다. ⚠ 그 말은 사진이 없어도 나온다 — PromoImage 주석 참조.

   구간마다 형태를 일부러 다르게 뒀다(사진 타일 / 나눔선 목록 / 세 칸 / 격자).
   다만 역할이 같으면 형태도 같다 — ②와 ⑦은 둘 다 「셋으로 나눠 설명」이라
   같은 세 칸 문법을 쓴다. 아무렇게나 다른 것과 이유가 있어 다른 것은 보면
   구분이 된다.
   ───────────────────────────────────────────────────────────── */

/** 가입 전에 확인하고 싶은 것들 — 히어로 아래 규격표처럼 놓는다 */
const quickFacts = [
  "회원가입 즉시 이용",
  "국어·수학·과학 각 10문항",
  "교육전문가 협진으로 확정",
  "2026 파일럿 전면 무료",
];

/** 「무슨 서비스인가」 — 학부모가 실제로 던지는 세 질문 순서로 세운다 */
const whatWeDo = [
  {
    n: "01",
    label: "무엇을 재나",
    t: "학력과 재능을 따로 잽니다",
    d: "성적이 좋아서 재능이 있는 것도, 낮아서 없는 것도 아니니까요.",
    cta: "여덟 갈래 보기",
    href: "/about/talent",
  },
  {
    n: "02",
    label: "어떻게 재나",
    t: "시험지 한 장으로 정하지 않습니다",
    d: "쓴 글·말한 답·만든 것·보인 행동을 함께 읽습니다.",
    cta: "진단 원리 보기",
    href: "/about/hitl",
  },
  {
    n: "03",
    label: "무엇을 받나",
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
 * `tag`는 지금 되는 것과 정식 서비스에서 열리는 것을 가른다. 요금 안내
 * (PUB-03-5)가 해석 상담을 「패키지 · 정식 서비스 예정」으로 적어 두었으므로,
 * 홍보 화면에서 지금 되는 것처럼 쓰면 안 된다.
 */
const expertTiers = [
  {
    n: "01",
    t: "판정을 사람이 확정합니다",
    d: "AI 제안값을 케이스 회의에서 승인하거나 조정합니다.",
    tag: "2026 파일럿 포함",
    live: true,
    cta: "협진 절차 보기",
    href: "/about/hitl",
  },
  {
    n: "02",
    t: "경계선은 면담으로 다시 봅니다",
    d: "애매하면 확정하지 않고 다음 회차 재관찰로 넘깁니다.",
    tag: "2026 파일럿 포함",
    live: true,
    cta: "윤리 헌장 보기",
    href: "/about/charter",
  },
  {
    n: "03",
    t: "인증 전문가와 1:1 상담",
    d: "리포트를 함께 읽고 무엇을 바꿔 볼지 정리합니다.",
    tag: "정식 서비스 예정",
    live: false,
    cta: "전문가 인증 보기",
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

const btnFilled = "btn-flat btn-lg bg-brand-900 text-white hover:bg-brand-800";
const btnOutline =
  "btn-flat btn-lg border border-brand-300 bg-white text-brand-800 hover:border-brand-500";

/**
 * 지금 되는 것과 나중에 열리는 것을 가르는 꼬리표.
 *
 * 바탕에 따라 색을 갈라야 한다. 흰 바탕용으로만 만들었더니 사진 위에 얹은
 * 「2027 확대」가 어두운 그러데이션에 묻혀 거의 안 보였다. 뜻이 색으로만
 * 실려 있지는 않지만(글자가 곧 뜻이다) 읽히지 않으면 없는 것과 같다.
 */
function WhenTag({
  text,
  live,
  on = "light",
}: {
  text: string;
  live: boolean;
  on?: "light" | "dark";
}) {
  const tone =
    on === "dark"
      ? live
        ? "bg-white text-brand-900"
        : "border border-white/70 text-white"
      : live
        ? "bg-surface-blue text-brand-700"
        : "border border-slate-300 text-slate-500";

  return <span className={`type-tag rounded-sm px-2 py-0.5 ${tone}`}>{text}</span>;
}

/**
 * 세 칸으로 나눠 설명하는 묶음.
 *
 * ②(무슨 서비스인가)와 ⑦(전문가가 붙는 자리)이 같은 문법을 쓴다. 상자를 만들지
 * 않고 실선으로만 나눈다 — 세 덩어리가 한 표의 세 칸처럼 읽혀야 비교가 된다.
 */
function ColumnSet({
  items,
}: {
  items: {
    n: string;
    label?: string;
    tag?: string;
    live?: boolean;
    t: string;
    d: string;
    cta: string;
    href: string;
  }[];
}) {
  const last = items.length - 1;

  return (
    <ol className="mt-9 grid border-t border-brand-200 lg:grid-cols-3">
      {items.map((it, i) => (
        <li key={it.href} className={`border-b border-brand-200 ${i < last ? "lg:border-r" : ""}`}>
          <Link
            href={it.href}
            className={`group flex h-full flex-col py-6 lg:py-8 ${
              i === 0 ? "lg:pr-8" : i === last ? "lg:pl-8" : "lg:px-8"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="type-tag tabular-nums text-brand-400">{it.n}</span>
              {it.tag && <WhenTag text={it.tag} live={it.live ?? true} />}
            </div>

            {it.label && <p className="type-eyebrow mt-4 text-brand-600">{it.label}</p>}
            <h3 className="type-h3 mt-2 font-black text-brand-950 group-hover:text-brand-700">
              {it.t}
            </h3>
            <p className="type-body mt-2 flex-1 text-slate-600">{it.d}</p>

            <span className="type-meta mt-6 inline-flex items-center gap-1.5 font-bold text-brand-700 underline decoration-brand-200 underline-offset-4 group-hover:decoration-brand-600">
              {it.cta}
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}

export default function PromoHome() {
  return (
    <>
      {/* ───── ① 히어로 ─────
          위는 카피, 가운데는 받게 될 리포트의 첫 장, 아래는 유형 예시.
          버튼은 그림 위에 둔다 — 카드가 세로로 길어 1440×900에서 접히는 선
          아래로 내려가기 때문이다. 대신 카드를 일부러 그 선에 걸치게 두어
          반쯤 잘린 카드가 스크롤을 부르게 하고, 끝에 내려가는 문을 하나 단다.

          배경에 깔았던 번진 원(blur-3xl)은 걷어냈다. 그 장식 하나가 화면 전체를
          템플릿처럼 보이게 만들고 있었다. */}
      <section className="border-b border-brand-200 bg-[#f5f7fd]">
        <div className="container-x section-pt">
          <div className="mx-auto max-w-3xl text-center">
            <p className="type-eyebrow inline-flex items-center gap-2 rounded-sm border border-brand-200 bg-white px-3 py-1.5 text-brand-700">
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

            {/* 체크 표시를 네 번 반복하는 대신 규격표처럼 칸을 나눴다 */}
            <ul className="mt-7 grid grid-cols-2 gap-px border border-brand-200 bg-brand-200 sm:grid-cols-4">
              {quickFacts.map((t) => (
                <li
                  key={t}
                  className="type-meta flex items-center justify-center bg-white px-3 py-3 text-center font-bold text-slate-600"
                >
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
        <div className="container-x pb-12 md:pb-14">
          <a
            href="#what"
            className="group mx-auto flex w-fit flex-col items-center gap-1.5 px-4 py-2 text-brand-700"
          >
            <span className="type-meta font-bold">그래서 무엇을 해 주는 서비스인가요</span>
            <ChevronDown
              aria-hidden
              className="h-5 w-5 transition-transform group-hover:translate-y-1"
            />
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
          <ColumnSet items={whatWeDo} />
        </div>
      </section>

      {/* ───── ③ 어떤 도움이 되는가 ─────
          제목이 사진보다 먼저 온다. 사진만 먼저 보이면 무슨 이야기가 시작되는지
          모르는 채로 큰 그림 한 장을 지나치게 된다. */}
      <section className="section-y bg-brand-50/60">
        <div className="container-x">
          <SectionHead
            eyebrow="이런 경우"
            title="이런 고민에서 시작하셨다면"
            lead="진단이 필요해지는 순간은 대체로 비슷합니다."
          />

          <div className="mt-9 grid gap-8 lg:grid-cols-[minmax(0,380px)_1fr] lg:gap-12">
            <PromoImage
              name="promo-parent-worry"
              alt="식탁에 마주 앉아 아이의 공책을 함께 들여다보며 이야기하는 학부모와 초등학생"
              ratio="aspect-[4/3]"
              sizes="(max-width: 1024px) 100vw, 380px"
              overlay={
                <>
                  <p className="type-tag text-white/70">집에서</p>
                  <p className="type-body mt-1 font-bold">
                    아이가 왜 그렇게 썼는지 설명하는 5분 — 검사장에서는 볼 수 없는 자리입니다.
                  </p>
                </>
              }
            />

            {/* 상자 넷 대신 나눔선 넷. 질문이 왼쪽, 답이 오른쪽으로 갈리면
                네 줄을 세로로 훑기만 해도 자기 것이 걸린다. */}
            <ul className="border-t border-brand-200">
              {situations.map((s) => (
                <li key={s.q} className="border-b border-brand-200">
                  <Link
                    href={s.href}
                    className="group grid items-baseline gap-x-6 gap-y-1.5 py-5 sm:grid-cols-[minmax(0,15rem)_1fr] sm:py-6"
                  >
                    <p className="type-h3 font-black text-brand-950 group-hover:text-brand-700">
                      {s.q}
                    </p>
                    <p className="type-body text-slate-600">
                      {s.a}
                      <ArrowRight
                        aria-hidden
                        className="ml-1.5 inline h-3.5 w-3.5 shrink-0 align-[-0.1em] text-brand-400 transition-transform group-hover:translate-x-0.5"
                      />
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ───── ④ 네 가지 흔적 ─────
          사진이 설명을 대신하는 자리다. 「아이가 쓴 글을 봅니다」를 문장으로 세
          줄 쓰는 것보다, 연필을 쥔 손 사진 한 장이 빠르다. 그래서 카드 껍데기를
          없애고 사진을 통째로 타일로 쓴다 — 글·말·손·행동은 사진 위에 얹는다. */}
      <section className="section-y">
        <div className="container-x">
          <SectionHead
            align="center"
            eyebrow="멀티모달 진단"
            title="아이가 남기는 네 가지 흔적"
            lead="글로 먼저 드러나는 아이가 있고, 말이나 손으로 드러나는 아이가 있습니다."
          />

          <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {traces.map((t) => (
              <li key={t.t}>
                <PromoImage
                  name={t.image}
                  alt={t.alt}
                  ratio="aspect-[4/3]"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 300px"
                  overlay={
                    <div className="flex items-end justify-between gap-2">
                      <span className="text-[1.75rem] leading-none font-black">{t.n}</span>
                      <WhenTag text={t.when} live={t.live} on="dark" />
                    </div>
                  }
                />
                <h3 className="type-h3 mt-4 font-black text-brand-950">{t.t}</h3>
                <p className="type-body mt-1.5 text-slate-600">{t.d}</p>
              </li>
            ))}
          </ul>

          {/* 기존 진단과의 대비 — 두 줄이면 충분하다 */}
          <dl className="mt-9 grid gap-px border border-brand-200 bg-brand-200 sm:grid-cols-2">
            {contrast.map((c) => (
              <div key={c.label} className={`px-6 py-5 ${c.on ? "bg-brand-950" : "bg-white"}`}>
                <dt className={`type-tag ${c.on ? "text-brand-300" : "text-slate-400"}`}>
                  {c.label}
                </dt>
                <dd className={`type-body mt-1.5 ${c.on ? "text-white" : "text-slate-500"}`}>
                  {c.text}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ───── ⑤ 여덟 갈래 ─────
          축마다 설명을 붙이면 여덟 문단이 된다. 여기서는 이름과 측정 시점만
          보이고, 뜻풀이는 /about/talent에 맡긴다.

          알약을 흩뿌리던 것을 실선 격자로 바꿨다. 이건 태그 구름이 아니라
          좌표계라서, 여덟 칸이 같은 크기로 놓여야 좌표처럼 읽힌다. */}
      <section className="section-y bg-brand-50/60">
        <div className="container-x">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <SectionHead
              eyebrow="재능 좌표"
              title="여덟 갈래로 나눠 봅니다"
              lead="2026년에는 지필로 잴 수 있는 세 갈래를 먼저 재고, 다섯 갈래는 2027년 수행과제에서 엽니다."
            />
            <Link
              href="/about/talent"
              className="btn-flat btn-md border border-brand-300 bg-white text-brand-800 hover:border-brand-500"
            >
              여덟 갈래 자세히 보기
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <ul className="mt-8 grid gap-px border border-brand-200 bg-brand-200 sm:grid-cols-2 lg:grid-cols-4">
            {axes.map((a) => (
              <li
                key={a.id}
                className={`flex items-center gap-3 px-4 py-4 ${
                  a.subject ? "bg-brand-900 text-white" : "bg-white text-brand-700"
                }`}
              >
                <span
                  aria-hidden
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-sm text-[12px] font-black ${
                    a.subject ? "bg-white/15 text-white" : "bg-brand-50 text-brand-500"
                  }`}
                >
                  {a.short}
                </span>
                <span className="type-h4 min-w-0 flex-1 font-bold">{a.label}</span>
                <span
                  className={`type-tag tabular-nums ${a.subject ? "text-brand-300" : "text-slate-400"}`}
                >
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

      {/* ───── ⑥ 재능 발현 ─────
          소질 → 발현 조건 → 재능을 사진 위에 얹었다. 옆에 따로 놓았을 때는
          도식과 사진이 따로 놀았는데, 겹치면 「이 아이가 지금 저 가운데 칸을
          지나는 중」으로 읽힌다. */}
      <section className="section-y">
        <div className="container-x">
          <SectionHead
            align="center"
            eyebrow="재능 발현"
            title="재능은 조건이 맞아야 드러납니다"
            lead="타고난 소질이 저절로 재능이 되지는 않습니다. 그 사이에 발현 조건이 있습니다."
          />

          <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,540px)_1fr] lg:items-center lg:gap-12">
            <PromoImage
              name="promo-catalyst"
              alt="거실 바닥에 엎드려 자기가 만든 그림책을 소리 내어 읽으며 완전히 몰입해 있는 초등학생"
              ratio="aspect-[3/2]"
              sizes="(max-width: 1024px) 100vw, 540px"
              overlay={
                /* Gagné DMGT가 소질과 재능을 갈라 둔 자리. 가운데 칸만 흰 상자로
                   띄워서 「우리가 다루는 것은 여기」를 표시한다. */
                <ol className="grid grid-cols-3 items-center gap-x-2 sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:gap-x-3">
                  <li>
                    <p className="type-tag text-white/70">타고난 것</p>
                    <p className="type-body mt-0.5 font-black">소질</p>
                  </li>
                  <li aria-hidden className="hidden justify-center text-white/50 sm:flex">
                    →
                  </li>
                  <li className="rounded-sm bg-white px-2.5 py-1.5 text-brand-950">
                    <p className="type-tag text-brand-500">사이에 있는 것</p>
                    <p className="type-body mt-0.5 font-black">발현 조건</p>
                  </li>
                  <li aria-hidden className="hidden justify-center text-white/50 sm:flex">
                    →
                  </li>
                  <li className="text-right sm:text-left">
                    <p className="type-tag text-white/70">드러난 것</p>
                    <p className="type-body mt-0.5 font-black">재능</p>
                  </li>
                </ol>
              }
            />

            <div>
              <p className="type-eyebrow text-brand-600">발현 조건 네 가지</p>
              <ul className="mt-4 border-t border-brand-200">
                {catalysts.map((c) => (
                  <li
                    key={c.t}
                    className="flex flex-wrap items-baseline gap-x-4 gap-y-0.5 border-b border-brand-200 py-3.5"
                  >
                    <span className="type-h4 w-12 shrink-0 font-black text-brand-900">{c.t}</span>
                    <span className="type-body text-slate-600">{c.q}</span>
                  </li>
                ))}
              </ul>

              {/* 과장 방지 — 우리가 하지 못하는 일을 먼저 적는다 */}
              <p className="type-body mt-6 border-l-2 border-brand-900 pl-4 text-slate-600">
                <b className="font-bold text-brand-900">재능을 만들어 드리지는 못합니다.</b> 그 일은
                집과 교실에서 매일 일어납니다. 우리가 하는 일은 그 앞에 지도를 놓아 드리는 것입니다.
              </p>
              <Link
                href="/insight/parenting"
                className="type-meta mt-5 inline-flex items-center gap-1.5 font-bold text-brand-700 underline decoration-brand-200 underline-offset-4 hover:decoration-brand-600"
              >
                집에서 만드는 발현 조건 보기
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ───── ⑦ 전문가 협진 ───── */}
      <section className="section-y bg-brand-50/60">
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
              overlay={
                <>
                  <p className="type-tag text-white/70">케이스 회의</p>
                  <p className="type-body mt-1 font-bold">
                    AI가 낸 값을 그대로 내보내지 않고, 여기서 승인하거나 되돌립니다.
                  </p>
                </>
              }
            />
          </div>

          <ColumnSet items={expertTiers} />

          {/* 정식 서비스를 기다리지 않아도 지금 물어볼 수 있는 창구 */}
          <div className="mt-8 flex flex-wrap items-center justify-between gap-x-6 gap-y-4 border border-brand-200 bg-white px-6 py-5 md:px-8">
            <div className="min-w-0">
              <p className="type-h3 font-black text-brand-950">지금 바로 물어보셔도 됩니다</p>
              <p className="type-meta mt-1 text-slate-600">전화 상담 {company.hours}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/support/orientation"
                className="btn-flat btn-md bg-brand-900 text-white hover:bg-brand-800"
              >
                학부모 설명회 영상
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/support/inquiry"
                className="btn-flat btn-md border border-brand-300 bg-white text-brand-800 hover:border-brand-500"
              >
                1:1 문의 남기기
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 누가 확정하고 누가 상담하는지 — 이름과 이력을 그대로 공개한다 */}
      <TeamPreview flat />

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

          <ol className="mt-10 grid gap-px bg-white/20 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, i) => (
              <li key={s.t} className="bg-brand-950 p-6">
                <span className="type-h1 block font-black tabular-nums text-white/30">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="type-h3 mt-3 font-black">{s.t}</h3>
                <p className="type-body mt-2 text-brand-100">{s.d}</p>
              </li>
            ))}
          </ol>

          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link
              href="/exam"
              className="btn-flat btn-lg bg-white text-brand-900 hover:bg-brand-50"
            >
              AI 무료 재능 진단 체험하기
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/signup/type"
              className="btn-flat btn-lg border border-white/30 text-white hover:bg-white/10"
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
