import Link from "next/link";
import HeroVisual from "@/components/HeroVisual";
import StockPhoto from "@/components/StockPhoto";
import BrandMeaning from "@/components/site/BrandMeaning";
import SectionHead from "@/components/site/SectionHead";
import TeamPreview from "@/components/site/TeamPreview";
import HomeFaq from "@/components/site/HomeFaq";
import { menu } from "@/lib/nav";
import { company } from "@/lib/site";
import { axes } from "@/lib/result";
import { subjectOf } from "@/lib/exam";
import {
  ArrowRight,
  CheckIcon,
  InstitutionIcon,
  ParentIcon,
  StudentIcon,
  TeacherIcon,
} from "@/components/Icons";

const trustSignals = [
  { v: "5,000명", l: "2026 파일럿 목표 응시 규모" },
  { v: "40인", l: "연구·자문 전문가 네트워크" },
  { v: "8영역 × 4위계", l: "재능 좌표 체계" },
  { v: "ICC 0.80", l: "AI–인간 채점 일치도 목표" },
];

const ladder = [
  {
    step: "무료",
    title: "학력진단",
    desc: "국어(언어)·수학·과학 3과목을 각 10문항씩. 지금 어디까지 이해하고 있는지 확인합니다.",
    href: "/service/academic",
    tone: "bg-surface-blue text-brand-700",
    meta: ["초3 ~ 고1", "3과목 · 12문항", "과목당 40분", "파일럿 무료"],
  },
  {
    step: "1단계",
    title: "재능진단",
    desc: "지필·SJT·설문·면담 네 가지 정보원을 교차해 재능이 드러나는 조건을 확인합니다.",
    href: "/service/talent-base",
    tone: "bg-surface-violet text-accent-600",
    meta: ["초3 ~ 고1", "4개 정보원 교차", "약 90분", "학부모·교사 설문 포함"],
  },
  {
    step: "2단계",
    title: "심화진단",
    desc: "지필로 보기 어려운 청각·신체·사회관계 영역을 멀티모달 수행과제로 측정합니다.",
    href: "/service/talent-advanced",
    tone: "bg-surface-mint text-emerald-700",
    meta: ["1단계 응시자", "멀티모달 수행과제", "약 120분", "2027 오픈 예정"],
  },
  {
    step: "3단계",
    title: "성장추적",
    desc: "연 4회 같은 좌표를 다시 재어 변화 곡선을 그립니다.",
    href: "/service/tracking",
    tone: "bg-surface-amber text-amber-700",
    meta: ["기존 응시자", "연 4회 재측정", "회차당 40분", "회차 비교 리포트"],
  },
];

/** 학력 × 재능 4분면. 배열 순서가 그대로 좌표 위치(좌상 → 우상 → 좌하 → 우하)다 */
const quadrants = [
  {
    coord: "재능 높음 · 학력 낮음",
    t: "발현 기회",
    d: "성적에 가려져 있던 강점. 지금 기회를 주면 가장 크게 자랍니다.",
    soft: true,
  },
  {
    coord: "재능 높음 · 학력 높음",
    t: "강점 확증",
    d: "두 축이 함께 높습니다. 심화 과제로 상한을 올릴 시점입니다.",
    accent: true,
  },
  {
    coord: "재능 낮음 · 학력 낮음",
    t: "미발현",
    d: "'없다'가 아니라 '아직 관찰되지 않았다'로 읽습니다.",
  },
  {
    coord: "재능 낮음 · 학력 높음",
    t: "성장 CTA",
    d: "학습은 되는데 재능 축이 안 잡힙니다. 다른 조건을 만들어 봅니다.",
    soft: true,
  },
];

/** GED가 「학생자기진단 / 교사관찰진단」으로 나눠 두는 방식을 정보원 단위로 풀었다 */
const sources = [
  {
    n: "01",
    kind: "지필 평가",
    who: "학생",
    what: "국어(언어)·수학·과학 각 10문항, 객관식과 서술형",
    use: "학력 축 · 언어 / 수리·논리 / 자연·탐구 3개 재능 축",
  },
  {
    n: "02",
    kind: "상황판단(SJT)",
    who: "학생",
    what: "상황별로 무엇을 고를지, 왜 그렇게 골랐는지",
    use: "사회·관계, 자기이해처럼 정답이 없는 축",
  },
  {
    n: "03",
    kind: "관찰 설문",
    who: "학부모(어머니·아버지) · 지도교사",
    what: "가정과 수업에서 실제로 본 행동",
    use: "검사만으로 보이지 않는 발현 조건 보완",
  },
  {
    n: "04",
    kind: "면담·협진",
    who: "교육전문가",
    what: "경계선 사례 확인과 근거 기록",
    use: "최종 판정 확정 또는 다음 회차 유보",
  },
];

/** 투모라이즈의 활용사례 자리 — 후기 대신 실제 상황으로 적었다 */
const situations = [
  {
    q: "성적은 나쁘지 않은데 무엇을 좋아하는지 모르겠어요",
    a: "학력 축과 재능 축을 따로 재서, 성적에 가려진 강점 영역을 좌표로 보여드립니다.",
    href: "/about/talent",
  },
  {
    q: "학원을 여러 개 다니는데 방향이 맞는지 모르겠어요",
    a: "지금 어느 축이 강하고 어느 축이 아직 관찰되지 않았는지 확인한 뒤 우선순위를 정합니다.",
    href: "/sample/report",
  },
  {
    q: "성적표로는 설명되지 않는 면이 있어요",
    a: "학부모·교사 관찰 설문을 함께 넣어, 검사 상황에서 드러나지 않는 모습을 보완합니다.",
    href: "/service/talent-base",
  },
  {
    q: "영재원·특목고 준비 전에 객관적인 기준이 필요해요",
    a: "8개 영역 좌표와 전문가 소견을 리포트로 받아 근거 자료로 활용하실 수 있습니다.",
    href: "/service/talent-advanced",
  },
];

const process = [
  { t: "가입·동의", d: "회원 유형을 고르고 목적별로 분리된 동의를 확인합니다." },
  { t: "응시", d: "학생이 3과목을 풀고, 보호자와 교사가 관찰 설문을 입력합니다." },
  { t: "AI 1차 분석", d: "4개 정보원을 정량·정성으로 분석해 제안값을 만듭니다." },
  { t: "전문가 협진", d: "교육전문가가 케이스 회의에서 판정을 확정합니다." },
  { t: "리포트 발행", d: "승인된 뒤에야 결과가 공개됩니다." },
];

const audiences = [
  {
    role: "학부모",
    desc: "자녀 프로필을 등록하고 결과 리포트를 열람합니다. 계정은 학부모 중심으로 구성됩니다.",
    href: "/signup",
    cta: "학부모로 가입",
    bg: "bg-surface-blue",
    icon: ParentIcon,
    iconTone: "text-brand-600",
  },
  {
    role: "학생",
    desc: "별도 계정 없이 보호자가 발급한 8자리 접속코드로 응시합니다.",
    href: "/login/student",
    cta: "접속코드로 시작",
    bg: "bg-surface-mint",
    icon: StudentIcon,
    iconTone: "text-emerald-600",
  },
  {
    role: "교사",
    desc: "학급 학생의 관찰 설문을 입력합니다. 기관 관리자 승인 후 활성화됩니다.",
    href: "/signup",
    cta: "교사로 가입",
    bg: "bg-surface-violet",
    icon: TeacherIcon,
    iconTone: "text-accent-600",
  },
  {
    role: "기관",
    desc: "소속·응시권·정산을 관리하고 학급·학년 단위 집단 리포트를 받습니다.",
    href: "/partner/contact",
    cta: "도입 문의",
    bg: "bg-surface-amber",
    icon: InstitutionIcon,
    iconTone: "text-amber-700",
  },
];

/* 홍보 페이지 전역에서 쓰는 버튼 조합 — 크기는 btn-*, 색만 여기서 정한다 */
const btnFilled = "btn btn-lg bg-brand-900 text-white shadow-card hover:bg-brand-800";
const btnOutline = "btn btn-lg border border-brand-200 bg-white text-brand-800 hover:border-brand-400";

export default function HomePage() {
  return (
    <>
      {/* ───── ① 뭐 하는 곳인가 ───── */}
      {/* 히어로 */}
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 via-[#f2f6ff] to-white">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-32 -top-32 h-80 w-80 rounded-full bg-brand-200/35 blur-3xl"
        />
        {/* 한글 제목이 의도한 줄바꿈을 유지하려면 좌우 분할에 최소 1280px가 필요하다.
            xl부터는 텍스트 폭을 480px로 고정하고 남는 폭을 전부 사진에 준다. */}
        <div className="container-x section-y relative grid items-center gap-12 xl:hero-bleed xl:grid-cols-[480px_1fr]">
          <div className="max-w-xl">
            <p className="type-eyebrow inline-flex items-center rounded-full bg-white px-3.5 py-1.5 text-brand-700 shadow-card">
              2026년 1회차(26A) 응시 접수 중
            </p>
            <h1 className="type-display mt-5 font-black text-brand-950">
              성적으로 설명되지 않는
              <br />
              아이의 <span className="text-brand-600">가능성</span>을
              <br />
              좌표로 보여드립니다
            </h1>
            <p className="type-lead mt-5 text-slate-600">
              GENIXX는 학력과 재능을 서로 다른 축으로 나누어 진단합니다. AI가 1차로 분석하고
              교육전문가가 협진으로 확정하기 때문에, 결과는 등급이 아니라 &lsquo;지금 어떤 조건에서
              드러나는가&rsquo;에 대한 설명입니다.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/exam" className={btnFilled}>
                무료 학력진단 시작하기
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/sample" className={btnOutline}>
                샘플 리포트 먼저 보기
              </Link>
            </div>

            <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2">
              {["회원가입 즉시 이용", "3과목 × 10문항", "파일럿 회차 전면 무료"].map((t) => (
                <li key={t} className="type-meta flex items-center gap-1.5 text-slate-600">
                  <CheckIcon className="h-4 w-4 shrink-0 text-emerald-500" />
                  {t}
                </li>
              ))}
            </ul>
          </div>

          {/* 모바일에서는 문구와 버튼만 보이도록 사진을 숨긴다 */}
          <div className="hidden w-full max-w-3xl sm:block xl:max-w-[1000px]">
            <HeroVisual />
          </div>
        </div>
      </section>

      {/* 신뢰 신호 */}
      <section className="border-b border-brand-100 bg-white">
        <div className="container-x section-y-sm grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {trustSignals.map((s) => (
            <div key={s.l} className="text-center lg:text-left">
              <p className="type-stat font-black text-brand-900">{s.v}</p>
              <p className="type-meta mt-1 text-slate-500">{s.l}</p>
            </div>
          ))}
        </div>
      </section>


      {/* ───── ② 누구에게 왜 필요한가 ───── */}
      {/* 이런 경우에 도움이 됩니다 */}
      <section className="section-y bg-brand-50/50">
        <div className="container-x">
          <SectionHead
            eyebrow="이런 경우"
            title="이런 고민에서 시작하셨다면"
            lead="진단이 필요한 순간은 대체로 비슷합니다. 상황별로 어떤 답을 드릴 수 있는지 먼저 확인해 보세요."
          />

          <ul className="mt-10 grid gap-4 md:gap-5 lg:grid-cols-2">
            {situations.map((s) => (
              <li key={s.q}>
                <Link
                  href={s.href}
                  className="group flex h-full flex-col rounded-3xl border border-brand-100 bg-white p-6 shadow-card transition-shadow hover:shadow-float md:p-7"
                >
                  <p className="type-h3 font-black text-brand-950">
                    <span className="mr-2 text-brand-400">Q.</span>
                    {s.q}
                  </p>
                  <p className="type-body mt-3 flex-1 text-slate-600">{s.a}</p>
                  <span className="type-meta mt-4 inline-flex items-center gap-1.5 font-bold text-brand-700">
                    관련 내용 보기
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 대상별 */}
      <section className="section-y">
        <div className="container-x">
          <SectionHead
            eyebrow="이용 대상"
            title="누가 무엇을 하나요"
            lead="학부모 계정이 대표 회원이고, 학생은 그 아래 프로필로 응시합니다. 교사와 기관은 B2B 채널로 참여합니다."
          />

          <ul className="mt-10 grid gap-4 sm:grid-cols-2 md:gap-5 lg:grid-cols-4">
            {audiences.map((a) => (
              <li key={a.role} className={`flex flex-col rounded-3xl p-6 md:p-7 ${a.bg}`}>
                <span
                  aria-hidden
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-white/70 ${a.iconTone}`}
                >
                  <a.icon className="h-6 w-6" />
                </span>
                <h3 className="type-h3 mt-4 font-black text-brand-950">{a.role}</h3>
                <p className="type-body mt-2 flex-1 text-slate-600">{a.desc}</p>
                <Link
                  href={a.href}
                  className="btn btn-sm mt-6 w-fit bg-white text-brand-800 hover:bg-white/70"
                >
                  {a.cta}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>


      {/* ───── ③ 무엇을 어떻게 재는가 ───── */}
      {/* 진단 영역 8 — 커리어넷처럼 영역을 먼저 보여주고 각 항목에 메타를 붙인다 */}
      <section className="section-y bg-brand-50/50">
        <div className="container-x">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <SectionHead
              eyebrow="진단 영역"
              title="여덟 개 축으로 재능을 봅니다"
              lead="결과는 팔각형 좌표로 나옵니다. 2026 파일럿에서는 지필로 잴 수 있는 3개 축을 측정하고, 나머지 5개 축은 2027 심화진단에서 멀티모달 과제로 잽니다."
            />
            <Link
              href="/sample/report"
              className="btn btn-md border border-brand-200 bg-white text-brand-800 hover:border-brand-400"
            >
              결과 좌표 예시 보기
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {axes.map((a, i) => {
              const subject = a.subject ? subjectOf(a.subject) : null;
              return (
                <li
                  key={a.id}
                  className={`flex flex-col rounded-3xl border p-5 ${
                    subject ? "border-brand-200 bg-white shadow-card" : "border-dashed border-brand-200 bg-white/50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="type-meta font-black tabular-nums text-brand-300">
                      {String(i + 1).padStart(2, "0")}
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
                    {subject ? `${subject.name} 10문항 · ${subject.limitMin}분` : "심화진단 수행과제"}
                  </p>
                </li>
              );
            })}
          </ul>

          <p className="type-meta mt-5 text-slate-500">
            점수가 낮게 나온 영역은 &lsquo;없는 재능&rsquo;이 아니라{" "}
            <b className="font-bold text-brand-800">아직 발현되지 않은 영역</b>으로 표기합니다.
            아직 측정하지 않은 5개 축은 결과 좌표에서 점선으로 구분됩니다.
          </p>
        </div>
      </section>

      {/* 핵심 차별화 — 직교 매트릭스 */}
      <section className="section-y">
        <div className="container-x grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
          <div>
            <SectionHead
              eyebrow="핵심 차별화"
              title={
                <>
                  성적과 재능은
                  <br />
                  같은 축이 아닙니다
                </>
              }
              lead="성적이 좋으면 재능이 있고, 성적이 낮으면 재능이 없다는 전제는 데이터로 확인되지 않습니다. GENIXX는 두 축을 따로 재고 교차해서, 지금 무엇을 도와야 하는지를 4분면으로 보여줍니다."
            />
            <Link
              href="/about/talent"
              className="type-meta mt-7 inline-flex items-center gap-1.5 font-bold text-brand-700 hover:underline"
            >
              재능을 어떻게 정의하는지 보기
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* 파스텔 네 칸이 아니라 실제 좌표평면으로 — 칸의 위치가 곧 의미다 */}
          <figure className="rounded-3xl border border-brand-100 bg-white p-5 shadow-card md:p-6">
            <div className="flex items-stretch gap-3">
              <div className="flex w-5 shrink-0 flex-col items-center justify-between py-1">
                <span className="type-tag text-brand-500">높음</span>
                <span className="type-caption rotate-180 font-bold tracking-[0.08em] text-slate-400 [writing-mode:vertical-rl]">
                  재능 축
                </span>
                <span className="type-tag font-medium text-slate-400">낮음</span>
              </div>

              <div className="grid flex-1 grid-cols-2 gap-2">
                {quadrants.map((q) => (
                  <div
                    key={q.t}
                    className={`flex flex-col rounded-2xl p-4 md:p-5 ${
                      q.accent
                        ? "bg-brand-900 text-white"
                        : q.soft
                          ? "bg-brand-50"
                          : "border border-brand-100 bg-white"
                    }`}
                  >
                    <span
                      className={`type-tag ${q.accent ? "text-brand-300" : "text-slate-400"}`}
                    >
                      {q.coord}
                    </span>
                    <p
                      className={`type-h3 mt-2 font-black ${
                        q.accent ? "text-white" : "text-brand-950"
                      }`}
                    >
                      {q.t}
                    </p>
                    <p
                      className={`type-body mt-1.5 ${
                        q.accent ? "text-brand-100" : "text-slate-600"
                      }`}
                    >
                      {q.d}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <figcaption className="mt-3 flex items-center justify-between pl-8">
              <span className="type-tag font-medium text-slate-400">낮음</span>
              <span className="type-caption font-bold tracking-[0.08em] text-slate-400">
                학력 축
              </span>
              <span className="type-tag text-brand-500">높음</span>
            </figcaption>
          </figure>
        </div>
      </section>

      {/* HITL + 4개 정보원 */}
      <section className="section-y bg-brand-950 text-white">
        <div className="container-x grid gap-10 lg:grid-cols-[1fr_1.15fr] lg:items-center lg:gap-14">
          <div>
            <SectionHead
              tone="dark"
              eyebrow="진단 원리"
              title={
                <>
                  AI는 제안하고
                  <br />
                  사람이 확정합니다
                </>
              }
              lead="아이에 대한 판단을 알고리즘이 단독으로 내리지 않습니다. AI 1차 분석 결과를 교육전문가가 케이스 회의에서 검토하고, 승인 전에는 어떤 결과도 화면에 노출되지 않습니다."
            />
            <Link
              href="/about/hitl"
              className="btn btn-md mt-8 bg-white text-brand-900 hover:bg-brand-50"
            >
              진단 원리 자세히 보기
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <ol className="grid gap-4">
            {[
              { n: "01", t: "AI 1차 분석", d: "지필·SJT·설문·면담 4개 정보원 병렬 분석" },
              { n: "02", t: "전문가 협진 판정", d: "케이스 회의에서 제안값 승인·조정, 경계선은 유보" },
              { n: "03", t: "리포트 승인·발행", d: "확정자·시각·근거를 기록하고 발행" },
            ].map((s) => (
              <li key={s.n} className="flex gap-5 rounded-3xl bg-white/10 p-6 md:p-7">
                <span className="type-meta font-black text-brand-300">{s.n}</span>
                <div>
                  <p className="type-h3 font-black">{s.t}</p>
                  <p className="type-body mt-2 text-brand-100">{s.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* 누가 무엇을 넣는지 — 정보원 단위로 분해 */}
        <div className="container-x mt-12 lg:mt-16">
          <h3 className="type-eyebrow text-brand-300">AI가 보는 네 가지 정보원</h3>
          <div className="mt-4 overflow-x-auto rounded-lg bg-white/10">
            <table className="w-full min-w-[680px] text-left">
              <thead>
                <tr className="border-b border-white/15">
                  {["구분", "정보원", "누가 입력하나", "무엇을 담나", "어디에 반영되나"].map((h) => (
                    <th key={h} className="type-meta px-5 py-4 font-black text-brand-200">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sources.map((s) => (
                  <tr key={s.n} className="border-b border-white/10 last:border-0">
                    <td className="type-meta px-5 py-4 font-black tabular-nums text-brand-300">
                      {s.n}
                    </td>
                    <td className="type-body px-5 py-4 font-black text-white">{s.kind}</td>
                    <td className="type-body px-5 py-4 text-brand-100">{s.who}</td>
                    <td className="type-body px-5 py-4 text-brand-100">{s.what}</td>
                    <td className="type-body px-5 py-4 text-brand-100">{s.use}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="type-meta mt-4 text-brand-200">
            학부모·교사 설문이 빠져도 진단은 진행됩니다. 다만 관찰 기반 항목은 제공되지 않고, 결과
            신뢰도 표기가 낮아집니다.
          </p>
        </div>
      </section>


      {/* ───── ④ 어떻게 이용하는가 ───── */}
      {/* 서비스 사다리 */}
      <section className="section-y bg-brand-50/50">
        <div className="container-x">
          <SectionHead
            eyebrow="진단 서비스"
            title="무료 학력진단에서 시작합니다"
            lead="처음부터 큰 결정을 하지 않으셔도 됩니다. 3과목 12문항으로 현재 위치를 확인하고, 필요할 때 다음 단계로 넘어가면 됩니다."
          />

          <ul className="mt-10 grid gap-4 sm:grid-cols-2 md:gap-5 lg:grid-cols-4">
            {ladder.map((s) => (
              <li key={s.title}>
                <Link
                  href={s.href}
                  className="group flex h-full flex-col rounded-3xl border border-brand-100 bg-white p-6 shadow-card transition-shadow hover:shadow-float md:p-7"
                >
                  <span className={`type-tag w-fit rounded-full px-3 py-1 ${s.tone}`}>
                    {s.step}
                  </span>
                  <h3 className="type-h3 mt-4 font-black text-brand-950">{s.title}</h3>
                  <p className="type-body mt-2 flex-1 text-slate-600">{s.desc}</p>

                  {/* 커리어넷처럼 대상·분량·시간을 카드 안에서 바로 확인하게 한다 */}
                  <ul className="mt-4 space-y-1.5 border-t border-brand-100 pt-4">
                    {s.meta.map((m) => (
                      <li key={m} className="type-meta flex items-start gap-1.5 text-slate-500">
                        <CheckIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-300" />
                        {m}
                      </li>
                    ))}
                  </ul>

                  <span className="type-meta mt-5 inline-flex items-center gap-1.5 font-bold text-brand-700">
                    자세히 보기
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 진행 절차 */}
      <section className="section-y">
        <div className="container-x">
          <SectionHead
            eyebrow="진행 절차"
            title="가입에서 리포트까지 다섯 단계"
            lead="각 단계에서 누가 무엇을 하는지 미리 확인하실 수 있습니다."
          />
          <ol className="mt-10 grid gap-4 sm:grid-cols-2 md:gap-5 lg:grid-cols-5">
            {process.map((p, i) => (
              <li key={p.t} className="rounded-3xl border border-brand-100 bg-white p-6 shadow-card">
                <span className="type-h4 flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 font-black text-brand-700">
                  {i + 1}
                </span>
                <h3 className="type-h3 mt-4 font-black text-brand-950">{p.t}</h3>
                <p className="type-body mt-2 text-slate-600">{p.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>


      {/* ───── ⑤ 누가 만들고 누가 판정하는가 ───── */}
      {/* 브랜드 이름 풀이 */}
      <BrandMeaning tone="muted" />

      {/* 참여진 */}
      <TeamPreview />


      {/* ───── ⑥ 시작하기 ───── */}
      {/* 기관 배너 */}
      <section className="section-y">
        <div className="container-x">
          <div className="relative overflow-hidden rounded-3xl">
            <div className="absolute inset-0">
              <StockPhoto
                id="school-teacher"
                sizes="(max-width: 1240px) 100vw, 1200px"
                fallbackClass="bg-brand-900"
              />
            </div>
            <div className="relative bg-gradient-to-r from-brand-950/95 via-brand-950/80 to-brand-900/40 px-6 py-12 sm:px-10 md:px-14 md:py-16">
              <SectionHead
                tone="dark"
                eyebrow="학교·기관 도입"
                title={
                  <>
                    학급 단위로 운영하고
                    <br />
                    집단 리포트를 받아보세요
                  </>
                }
                lead="파일럿 참여 기관에는 학년·학급 분포 리포트를 무상 제공합니다. 개인 상세 데이터는 학부모 동의 범위 안에서만 열람합니다."
              />
              <Link
                href="/partner/contact"
                className="btn btn-lg mt-8 bg-white text-brand-900 hover:bg-brand-50"
              >
                기관 도입 문의하기
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 자주 묻는 질문 */}
      <HomeFaq />

      {/* 마지막 CTA */}
      <section className="section-y border-t border-brand-100 bg-brand-50/60">
        <div className="container-x">
          <SectionHead
            align="center"
            title="12문항이면 시작할 수 있습니다"
            lead="국어·수학·과학 각 10문항. 세 과목을 모두 마치면 제출되고, 전문가 검토를 거쳐 결과가 발행됩니다."
          />
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/exam" className={btnFilled}>
              평가 시작하기
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/signup" className={btnOutline}>
              회원가입
            </Link>
          </div>

          {/* 투모라이즈처럼 전화 상담 창구를 마지막에 한 번 더 노출 */}
          <div className="mx-auto mt-10 flex max-w-xl flex-wrap items-center justify-center gap-x-6 gap-y-2 rounded-3xl border border-brand-100 bg-white px-6 py-5 text-center">
            <a
              href={`tel:${company.tel.replace(/-/g, "")}`}
              className="type-h3 font-black text-brand-900 hover:underline"
            >
              {company.tel}
            </a>
            <span className="type-meta text-slate-500">{company.hours}</span>
            <Link
              href="/support/inquiry"
              className="type-meta font-bold text-brand-700 hover:underline"
            >
              1:1 문의 남기기
            </Link>
          </div>

          <ul className="type-meta mt-12 flex flex-wrap justify-center gap-x-6 gap-y-2 text-slate-500">
            {menu.map((g) => (
              <li key={g.id}>
                <Link href={g.href} className="hover:text-brand-700">
                  {g.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
