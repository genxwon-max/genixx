import type { Metadata } from "next";
import Link from "next/link";
import GemMap from "@/components/home5/GemMap";
import Jempy from "@/components/home5/Jempy";
import Reveal from "@/components/home5/Reveal";
import { assessment, QUESTIONS_PER_SUBJECT, subjects } from "@/lib/exam";
import { axes, primaryTypes } from "@/lib/result";

export const metadata: Metadata = {
  /* 루트 레이아웃의 template("%s | GENIXX")가 뒤를 붙인다 */
  title: "잼 파인더 — 우리 아이의 보석을 찾는 새로운 이름",
  description:
    "초등 3~4학년 재능 진단 잼 파인더(Gem Finder). 캐릭터 잼피를 내세운 새 이름 제안. 국어·수학·과학 답안과 보호자·교사의 관찰을 별자리 재능 지도로 그리고, 한국창의영재교육원 전문가 40인이 확정합니다. 2026 파일럿 무료.",
};

/* ─────────────────────────────────────────────────────────────
   다섯 번째 시안 — 캐릭터 브랜드 「잼 파인더」.

   의뢰인이 2026-08-23 보여 준 네이밍 시안 두 장에서 가져온 것:
     · 이름 「잼 파인더(Gem Finder)」 — 식상한 「아이-」 접두를 빼고, 보석(Gem)과
       재미(Jam)를 찾는(Finder) 정체성.
     · 상징 캐릭터 「잼피(Jempy)」 — 남색 보석 몸, 별 무늬, 큰 눈, 망토, 확대경·지도.
     · 모티프 — 은하수와 별자리 재능 지도, 다차원 AI 재능 파인더, 보석을 찾는 아이들.
   그림 파일은 쓰지 않는다 — 캐릭터·지도·보석은 전부 SVG(components/home5)로 다시
   그렸다.

   ⚠ 「잼 파인더」는 이 시안의 이름 제안이다. 저장소의 평가 이름은 여전히 TalentMe
     (lib/exam.assessment.name)이고, 다른 화면은 손대지 않는다. 회차·마감·문항 수·
     시간은 lib/exam에서, 여덟 갈래와 유형 이름은 lib/result에서 읽는다.
   ⚠ 잼피의 자리는 하나로 — **AI 1차 분석의 얼굴.** 답안과 관찰을 먼저 읽어 제안값을
     만들 뿐 확정하지 않는다(/about/hitl과 같은 원리). 응시 화면의 길잡이 역할은 아직
     없는 기능이라 「제안」으로만 적는다. 어떤 문장에서도 잼피가 판정하지 않는다.
   ⚠ 말투는 해요체 — 아이와 보호자가 같이 읽는 화면. 그래도 「영재」는 기관 이름에만,
     등급·석차·상위 같은 말은 부정문에만 쓴다(윤리 헌장 제7조). 후기·인원·금액 없음.

   ───── 차례 ───── 보호자가 묻는 순서대로: 뭘 받나 → 어떻게 → 믿을 수 있나 → 이름
   첫 화면   잼피(확대경) + 「우리 아이의 보석을 찾는 새로운 이름」
   map       재능 지도는 별자리처럼 (GemMap)
   report    보석 리포트 — 잼피가 같이 읽는다
   how       세 걸음 — 풀어요 · 적어요 · 받아요
   who       누가 보석을 정하나 — 전문가 40인, 잼피는 돋보기
   name      잼피와 이름의 뜻 — 벤토 한 판
   faq       잼피한테 자주 묻는 것
   마지막    잼피가 손을 흔드는 띠
   ───────────────────────────────────────────────────────────── */

const BRAND = "잼 파인더";
const BRAND_EN = "Gem Finder";
const MASCOT = "잼피";

const [dy, dm, dd] = assessment.deadline.split("-").map(Number);
const deadlineKo = `${dy}년 ${dm}월 ${dd}일`;
const subjectNames = subjects.map((s) => s.short).join("·");
const limitMin = subjects[0].limitMin;
const totalItems = subjects.length * QUESTIONS_PER_SUBJECT;
const measuredAxes = axes.filter((a) => a.subject);
const measuredShort = measuredAxes.map((a) => a.short).join("·");
const sampleType = primaryTypes.language;

/** 여덟 갈래의 색 — 칩·보석 아이콘. 글자로 쓰는 셋(Gem·Jam·Finder)은 아래 meanings의 진한 색 */
const gemTone = ["#8b5cf6", "#38bdf8", "#34d399", "#fb7185", "#fbbf24", "#f97316", "#ec4899", "#6366f1"];

/** 리포트 — 결과 화면(components/exam/ResultView)의 실제 차례 다섯 */
const reportParts = [
  { t: "재능 유형", d: `예: ${sampleType.name}. 이번 회차에 보인 모습의 이름이라 다음 회차엔 바뀔 수 있어요.` },
  { t: "재능 지도", d: `여덟 갈래 가운데 올해 잰 ${measuredAxes.length}갈래는 별로, 안 잰 갈래는 빈 자리로.` },
  { t: "과목별 응시 결과", d: "객관식 정답과 서술형 답안, 환산 점수." },
  { t: "앞으로의 방향", d: "집에서 내일부터 해 볼 것 몇 가지. 분량이 아니라 매일 할 수 있는 크기로." },
  { t: "전문가 확정 코멘트", d: "누가, 언제, 무엇을 보고 확정했는지 같이 적혀요." },
];

/** 세 걸음 */
const steps = [
  {
    n: "1",
    t: "풀어요",
    pose: "hi" as const,
    d: `${subjectNames} 각 ${QUESTIONS_PER_SUBJECT}문항. 과목마다 따로 들어가니까 하루 한 과목씩 해도 돼요.`,
    meta: `과목당 ${limitMin}분`,
  },
  {
    n: "2",
    t: "적어요",
    pose: "map" as const,
    d: "보호자와 선생님이 집과 교실에서 본 모습을 적어요. 건너뛰어도 되지만, 적을수록 지도가 또렷해져요.",
    meta: "선택 · 짧은 설문",
  },
  {
    n: "3",
    t: "받아요",
    pose: "glass" as const,
    d: `${MASCOT}(AI)가 먼저 읽고 제안값을 만들면, 전문가 40인이 확정해요. 확정 전에는 아무것도 안 보여요.`,
    meta: "1차 분석 1~2일",
  },
];

/** 누가 정하나 — 셋. 색은 글자가 아니라 원 바탕에만 쓴다 */
const who = [
  {
    t: "전문가 40인이 정해요",
    d: "한국창의영재교육원의 전문가 40인 — 영재학교 교수진, 교장·교감을 지낸 교육자 — 이 문항을 쓰고, 검수하고, 평가하고, 면담해요.",
    tone: "#fbbf24",
  },
  {
    t: `${MASCOT}는 돋보기예요`,
    d: "서술형 답안과 관찰 응답을 먼저 읽어 제안값과 확신도를 만들어요. 확신이 낮으면 바로 사람에게 넘겨요. 혼자 확정하지 않아요.",
    tone: "#38bdf8",
  },
  {
    t: "애매하면 기다려요",
    d: "경계에 있는 자리는 확정하지 않고 다음 회차에 다시 봐요. 잘못 확정하는 것보다 늦게 확정하는 게 나으니까요.",
    tone: "#34d399",
  },
];

/** 이름의 뜻 셋 — 글자 색은 흰 바탕 4.5:1을 넘는 진한 값 */
const meanings = [
  { en: "Gem", ko: "보석", d: "모든 아이 안에 있는, 아직 드러나지 않은 재능. 점수로는 안 보이는 것을 보석이라고 불러요.", tone: "#7c3aed" },
  { en: "Jam", ko: "재미(잼)", d: "시간 가는 줄 모르고 하는 일. 재능은 재미있는 자리에서 먼저 드러나요.", tone: "#e11d48" },
  { en: "Finder", ko: "찾는 이", d: "답안과 관찰을 먼저 읽어 보석이 있을 만한 자리를 제안하는 역할. 확정은 하지 않아요.", tone: "#0284c7" },
];

/** 잼피 캐릭터 시트 */
const sheet = [
  { k: "이름", v: `${MASCOT} (Jempy)` },
  { k: "정체", v: "남색 보석. 머리에 별 하나, 어깨에 산호색 망토" },
  { k: "하는 일", v: "AI 1차 분석의 얼굴 — 답안과 관찰을 먼저 읽어 제안값 만들기" },
  { k: "안 하는 일", v: "확정. 보석을 정하는 건 전문가 40인이에요" },
  { k: "제안하는 일", v: "응시 화면에서 길 안내, 리포트를 같이 읽기 (이 시안의 제안)" },
];

const faqs = [
  {
    q: "영재를 가려내는 검사예요?",
    a: "아니에요. 잼 파인더는 고르는 검사가 아니라 찾는 검사예요. 등급이나 석차 대신 이번 회차에 보인 모습을 좌표로 적고, 아이를 규정하는 이름은 붙이지 않아요.",
  },
  {
    q: "잼피가 결과를 정하나요?",
    a: "아니에요. 잼피(AI)는 제안값만 만들고, 판정은 한국창의영재교육원 전문가 40인이 케이스 회의에서 확정해요. 확신도가 낮은 답은 바로 사람에게 넘어가요.",
  },
  {
    q: "정말 무료예요?",
    a: "2026 파일럿 회차는 전부 무료이고 결제 수단도 등록하지 않아요. 정식 요금은 파일럿이 끝난 뒤에 알려 드려요.",
  },
  {
    q: "세 과목을 하루에 다 해야 해요?",
    a: `아니에요. 과목마다 따로 들어가니까 하루 한 과목씩 해도 돼요. 과목당 ${limitMin}분이고, ${deadlineKo}까지 세 과목을 마치면 돼요.`,
  },
  {
    q: "보호자 설문은 꼭 해야 해요?",
    a: "선택이에요. 건너뛰어도 진단은 되지만 학생 답안만으로 보게 되어 리포트의 신뢰도 표시가 '참고'로 낮아져요. 관찰 설문이 1건이면 '보통', 2건 이상이면 '높음'이에요.",
  },
  {
    q: "잼 파인더와 TalentMe는 뭐가 달라요?",
    a: "같은 진단이에요. 잼 파인더는 2026년 8월에 제안된 새 이름이고, 지금 접수 화면과 리포트에는 TalentMe라는 이름이 그대로 있어요.",
  },
];

/** 보석 하나 — 칩·장식에 쓰는 작은 SVG */
function Gem({ tone, className = "" }: { tone: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      <path d="M7 3h10l5 6-10 13L2 9z" fill={tone} />
      <path d="M7 3l3 6h4l3-6M2 9h20M10 9l2 13 2-13" stroke="#fff" strokeOpacity={0.55} strokeWidth={1.2} fill="none" strokeLinejoin="round" />
    </svg>
  );
}

function Sparkle({ className = "", delay = 0 }: { className?: string; delay?: number }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={`jm-twinkle ${className}`} style={{ animationDelay: `${delay}s` }}>
      <path d="M12 1l2.6 8.4L23 12l-8.4 2.6L12 23l-2.6-8.4L1 12l8.4-2.6z" fill="currentColor" />
    </svg>
  );
}

/** 잼피의 말풍선 — 캐릭터 대사는 반말, 본문은 해요체. 꼬리는 왼쪽 아래.
    자리(absolute/relative)는 부르는 쪽이 준다 — 여기서 relative를 박으면 absolute를 이긴다 */
function Bubble({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`jm-small rounded-3xl bg-white px-4 py-3 font-bold text-(--j-ink) shadow-[var(--j-shadow)] ${className}`}>
      <span aria-hidden className="absolute -bottom-2 left-6 h-4 w-4 rotate-45 bg-white" />
      {children}
    </p>
  );
}

export default function Home5() {
  return (
    <>
      {/* ───── 첫 화면 ───── */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="jm-blob absolute -right-16 top-24 h-80 w-80 rounded-full bg-(--j-soft-2) blur-3xl" />
        </div>

        <div className="jm-wrap grid items-center gap-12 pb-16 pt-12 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-8 lg:pb-24 lg:pt-16">
          <div>
            <p className="jm-eyebrow">
              <Gem tone="#8b5cf6" className="h-4 w-4" />
              {assessment.round} · 2026 파일럿 무료
            </p>
            <h1 className="jm-display mt-6 text-(--j-ink)">
              우리 아이의 보석을 찾는
              <br />
              새로운 이름, <span className="text-(--j-primary)">{BRAND}</span>
            </h1>
            <p className="jm-lead mt-4 max-w-[34rem] text-(--j-ink-2)">
              국어·수학·과학 답안과 보호자·선생님의 관찰을 {MASCOT}(AI)가 먼저 읽고, 한국창의영재교육원 전문가
              40인이 확정해요. 점수표만이 아니라 별자리 같은 재능 지도와 내일 할 일을 받아요.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/exam" className="jm-btn jm-btn-primary jm-btn-lg">
                무료로 보석 찾기
              </Link>
              <Link href="/sample/report" className="jm-btn jm-btn-white jm-btn-lg">
                샘플 리포트 보기
              </Link>
            </div>
            <ul className="mt-8 flex flex-wrap gap-2">
              {["초등 3~4학년", `${totalItems}문항 · 과목당 ${limitMin}분`, `${deadlineKo}까지`, "결제 수단 등록 없음"].map((t) => (
                <li key={t} className="jm-chip text-(--j-ink-2)">
                  <Sparkle className="h-4 w-4 text-(--j-sun)" />
                  {t}
                </li>
              ))}
            </ul>
          </div>

          {/* 잼피 — 확대경을 들고, 말풍선 하나 */}
          <div className="relative mx-auto w-full max-w-[440px]">
            <div className="jm-float">
              <Jempy pose="glass" className="h-auto w-full [filter:var(--j-shadow-art)]" />
            </div>
            <Bubble className="jm-float-sm absolute left-0 top-4 sm:-left-4">
              <Gem tone="#8b5cf6" className="mr-1 inline h-5 w-5 align-[-4px]" />
              여기, 언어 쪽에 보석이 있어!
            </Bubble>
            <Sparkle className="absolute right-8 top-0 h-6 w-6 text-(--j-sun)" delay={0.5} />
            <Sparkle className="absolute bottom-12 left-8 h-4 w-4 text-(--j-gem)" delay={1.6} />
          </div>
        </div>
      </section>

      {/* ───── 재능 지도 ───── */}
      <section id="map" className="jm-band scroll-mt-24 bg-white">
        <div className="jm-wrap grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <Reveal className="order-2 lg:order-1">
            <p className="jm-eyebrow">재능 지도</p>
            <h2 className="jm-h2 mt-4">
              점수표가 아니라
              <br />
              별자리로 그려요.
            </h2>
            <p className="jm-lead mt-4 max-w-[34rem] text-(--j-ink-2)">
              재능은 {axes.length}갈래예요. 2026년에는 국어·수학·과학으로 잴 수 있는 {measuredShort} 세 갈래를
              먼저 밝히고, 나머지 다섯은 빈 별로 그대로 둬요. &lsquo;없다&rsquo;가 아니라 &lsquo;아직 안
              봤다&rsquo;니까요.
            </p>
            <ul className="mt-6 grid gap-2 sm:grid-cols-2">
              {axes.map((a, i) => (
                <li key={a.id} className="flex items-center gap-3 rounded-2xl border border-(--j-line) px-4 py-3">
                  <Gem tone={gemTone[i]} className="h-6 w-6 shrink-0" />
                  <span className="jm-small">
                    <span className="font-bold text-(--j-ink)">{a.label}</span>
                    <span className="jm-tiny block text-(--j-ink-3)">{a.desc}</span>
                  </span>
                  {a.subject && (
                    <span className="jm-tiny ml-auto shrink-0 rounded-full bg-(--j-soft) px-2 py-1 font-bold text-(--j-primary)">2026</span>
                  )}
                </li>
              ))}
            </ul>
          </Reveal>
          <div className="order-1 mx-auto w-full max-w-[480px] lg:order-2">
            <div className="jm-grain rounded-full">
              <GemMap className="h-auto w-full [filter:var(--j-shadow-art)]" />
            </div>
          </div>
        </div>
      </section>

      {/* ───── 보석 리포트 — 잼피가 같이 읽는다 ───── */}
      <section id="report" className="jm-band scroll-mt-24">
        <div className="jm-wrap">
          <Reveal className="mx-auto max-w-[34rem] text-center">
            <p className="jm-eyebrow">보석 리포트</p>
            <h2 className="jm-h2 mt-4">
              등급 대신,
              <br />
              내일 할 일이 적혀 있어요.
            </h2>
            <p className="jm-lead mt-4 text-(--j-ink-2)">
              리포트는 다섯 장이에요. {MASCOT}가 어려운 말을 아이 눈높이로 같이 읽어 주도록 제안해요.
            </p>
          </Reveal>

          <div className="mt-12 grid items-start gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
            {/* 샘플 카드 — 특정 아이의 결과가 아니다 */}
            <div className="relative mx-auto w-full max-w-[440px]">
              <div className="jm-card p-6 lg:p-8">
                <div className="flex items-center justify-between">
                  <span className="jm-tiny rounded-full bg-(--j-soft) px-3 py-1 font-bold text-(--j-primary)">
                    샘플 · {assessment.round}
                  </span>
                  <Jempy pose="hi" compact className="h-12 w-12" label="" />
                </div>
                <p className="jm-tiny mt-6 text-(--j-ink-3)">이번 회차에 보인 모습</p>
                <p className="jm-num mt-2 text-(--j-ink)">{sampleType.name}</p>
                <p className="jm-small mt-2 text-(--j-ink-2)">{sampleType.tagline}</p>
                <ul className="mt-6 grid grid-cols-3 gap-2">
                  {measuredAxes.map((a, i) => (
                    <li key={a.id} className="rounded-2xl bg-(--j-bg) p-3 text-center">
                      <Gem tone={gemTone[i]} className="mx-auto h-8 w-8" />
                      <p className="jm-tiny mt-2 font-bold text-(--j-ink)">{a.short}</p>
                      <p className="jm-tiny text-(--j-ink-3)">올해 잰 별</p>
                    </li>
                  ))}
                </ul>
                <div className="mt-6 rounded-2xl border border-dashed border-(--j-gem-2) p-4">
                  <p className="jm-tiny font-bold text-(--j-primary)">앞으로의 방향 · 내일 할 일</p>
                  {/* lib/result directionMap.language[0] — 내보내지 않는 값이라 글로 옮겨 적었다 */}
                  <p className="jm-small mt-1 text-(--j-ink-2)">읽은 뒤 한 문장으로 옮기기 — 분량보다 매일 하는 것이 중요해요.</p>
                </div>
                <p className="jm-tiny mt-4 text-(--j-ink-3)">전문가 확정 뒤에만 열려요 · 확정자와 시각이 함께 적혀요</p>
              </div>
              <Sparkle className="absolute -right-3 -top-3 h-8 w-8 text-(--j-sun)" delay={0.4} />
            </div>

            {/* 잼피가 한 장씩 짚는다 */}
            <ol className="grid gap-3">
              {reportParts.map((p, i) => (
                <Reveal key={p.t} as="li" delay={i * 80} className="jm-card flex items-start gap-4 p-4 lg:p-6">
                  <span className="jm-jua flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-(--j-sun) text-(--j-ink)">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="jm-h4 text-(--j-ink)">{p.t}</p>
                    <p className="jm-small mt-1 max-w-[34rem] text-(--j-ink-2)">{p.d}</p>
                  </div>
                </Reveal>
              ))}
            </ol>
          </div>
          <div className="mt-8 text-center">
            <Link href="/sample/report" className="jm-btn jm-btn-soft">
              샘플 리포트 보기
            </Link>
          </div>
        </div>
      </section>

      {/* ───── 세 걸음 ───── */}
      <section id="how" className="jm-band scroll-mt-24 bg-white">
        <div className="jm-wrap">
          <Reveal className="mx-auto max-w-[34rem] text-center">
            <p className="jm-eyebrow">진행 방법</p>
            <h2 className="jm-h2 mt-4">세 걸음이면 돼요.</h2>
            <p className="jm-lead mt-4 text-(--j-ink-2)">
              보호자 계정에 아이를 등록하면 8자리 접속코드가 나와요. 아이는 그 코드와 생년월일로 들어가요.
            </p>
          </Reveal>
          <ol className="mt-12 grid gap-6 md:grid-cols-3">
            {steps.map((s, i) => (
              <Reveal key={s.n} as="li" delay={i * 120} className="jm-card jm-card-lift relative flex flex-col p-6 pt-8 lg:p-8">
                <span className="jm-jua absolute left-6 top-0 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-(--j-sun) text-[1.5rem] text-(--j-ink) shadow-[var(--j-shadow)]">
                  {s.n}
                </span>
                <Jempy pose={s.pose} className="h-32 w-32 self-end" label="" />
                <h3 className="jm-h3 mt-2 text-(--j-ink)">{s.t}</h3>
                <p className="jm-small mt-2 text-(--j-ink-2)">{s.d}</p>
                <p className="jm-tiny mt-4 inline-flex w-fit rounded-full bg-(--j-soft) px-3 py-1 font-bold text-(--j-primary)">{s.meta}</p>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* ───── 누가 정하나 ───── */}
      <section id="who" className="jm-band scroll-mt-24">
        <div className="jm-wrap">
          <Reveal className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-end">
            <div>
              <p className="jm-eyebrow">누가 정하나</p>
              <h2 className="jm-h2 mt-4">
                보석은 사람이 정해요.
                <br />
                {MASCOT}는 돋보기를 들 뿐이에요.
              </h2>
            </div>
            <p className="jm-lead max-w-[34rem] text-(--j-ink-2)">
              AI가 먼저 읽고 사람이 확정하는 2단 구조예요. 귀여운 화면이지만 판정은 엄격하게 — 확정 전에는 보호자
              화면에 어떤 결과도 나오지 않아요.
            </p>
          </Reveal>
          <ul className="mt-12 grid gap-6 md:grid-cols-3">
            {who.map((w, i) => (
              <Reveal key={w.t} as="li" delay={i * 100} className="jm-card jm-card-lift p-6 lg:p-8">
                <span
                  aria-hidden
                  className="inline-flex h-12 w-12 items-center justify-center rounded-full"
                  style={{ background: `${w.tone}33`, color: w.tone }}
                >
                  <Sparkle className="h-6 w-6" delay={i * 0.7} />
                </span>
                <h3 className="jm-h3 mt-6 text-(--j-ink)">{w.t}</h3>
                <p className="jm-small mt-3 text-(--j-ink-2)">{w.d}</p>
              </Reveal>
            ))}
          </ul>
          <Reveal className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-[1.5rem] border border-(--j-line) bg-white px-6 py-4">
            <p className="jm-small text-(--j-ink-2)">
              <span className="jm-num text-(--j-primary)">40</span>
              <span className="ml-2 font-bold text-(--j-ink)">인의 전문가가 출제 · 검수 · 평가 · 면담</span> — 진단 원리는 여기에
              자세히 적어 두었어요.
            </p>
            <Link href="/about/hitl" className="jm-btn jm-btn-soft jm-btn-sm">
              진단 원리 보기
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ───── 잼피와 이름의 뜻 — 벤토 한 판 ───── */}
      <section id="name" className="jm-band scroll-mt-24 bg-white">
        <div className="jm-wrap">
          <Reveal className="mx-auto max-w-[34rem] text-center">
            <p className="jm-eyebrow">이름의 뜻</p>
            <h2 className="jm-h2 mt-4">
              보석(Gem)과 재미(잼)를
              <br />
              같이 찾는 사람들
            </h2>
            <p className="jm-lead mt-4 text-(--j-ink-2)">
              {BRAND}({BRAND_EN})는 아이 안의 보석과 그걸 찾는 재미를 한 이름에 담았어요.
            </p>
          </Reveal>

          <div className="mt-12 grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-stretch">
            {/* 큰 셀 — 잼피. 시트는 오른쪽 아래 칸으로 뺐다 — 여기 두면 판이 너무 길어져 옆 칸이 비어 보인다 */}
            <Reveal className="jm-grain relative flex flex-col overflow-hidden rounded-[var(--j-radius-panel)] bg-(--j-night) p-6 text-white lg:p-8">
              <p className="jm-eyebrow self-start bg-white/10 text-(--j-sun)">상징 캐릭터</p>
              <h3 className="jm-h3 mt-4">{MASCOT}가 보석이 있을 만한 자리를 먼저 짚어 줘요.</h3>
              <div className="relative mx-auto mt-auto w-full max-w-[300px] pt-8">
                <Bubble className="absolute left-0 top-0 z-10 text-(--j-ink)">
                  안녕, 나는 {MASCOT}야. 네 보석을 같이 찾을게.
                </Bubble>
                <div className="jm-float pt-10">
                  <Jempy pose="map" className="h-auto w-full" />
                </div>
              </div>
            </Reveal>

            {/* 오른쪽 — 작은 칸 넷과 시트 */}
            <div className="grid content-start gap-4 sm:grid-cols-2">
              {meanings.map((m, i) => (
                <Reveal key={m.en} delay={i * 100} className="jm-card jm-card-lift flex gap-4 p-6">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl" style={{ background: `${m.tone}1f` }}>
                    <Gem tone={m.tone} className="h-7 w-7" />
                  </span>
                  <div>
                    <p className="jm-num" style={{ color: m.tone }}>
                      {m.en} <span className="jm-h4 text-(--j-ink)">{m.ko}</span>
                    </p>
                    <p className="jm-small mt-2 text-(--j-ink-2)">{m.d}</p>
                  </div>
                </Reveal>
              ))}
              <Reveal delay={300} className="jm-card flex items-center gap-4 bg-(--j-bg) p-6">
                <Jempy pose="wave" compact className="h-12 w-12 shrink-0" label="" />
                <p className="jm-small text-(--j-ink-2)">
                  이름과 캐릭터는 2026년 8월의 제안이에요. 지금 접수 화면과 리포트에는{" "}
                  <span className="font-bold text-(--j-ink)">{assessment.name}</span>라는 이름이 그대로 있어요.
                </p>
              </Reveal>
              <Reveal delay={400} className="jm-card p-6 sm:col-span-2">
                <p className="jm-h4 text-(--j-ink)">{MASCOT} 캐릭터 시트</p>
                <dl className="mt-4 grid gap-2 sm:grid-cols-2">
                  {sheet.map((s) => (
                    <div key={s.k} className="grid grid-cols-[5.5rem_1fr] gap-2 rounded-2xl bg-(--j-soft) px-4 py-3">
                      <dt className="jm-tiny font-bold text-(--j-primary)">{s.k}</dt>
                      <dd className="jm-tiny text-(--j-ink)">{s.v}</dd>
                    </div>
                  ))}
                </dl>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* ───── FAQ ───── */}
      <section id="faq" className="jm-band scroll-mt-24">
        <div className="jm-wrap grid gap-8 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-16">
          <Reveal>
            <p className="jm-eyebrow">궁금한 점</p>
            <h2 className="jm-h2 mt-4">{MASCOT}한테 자주 묻는 것</h2>
            <Link href="/support/faq" className="jm-btn jm-btn-soft mt-6">
              FAQ 전체 보기
            </Link>
          </Reveal>
          <Reveal as="div" delay={100}>
            <ul className="grid gap-3">
              {faqs.map((f) => (
                <li key={f.q}>
                  <details className="jm-faq jm-card">
                    <summary className="flex cursor-pointer items-center justify-between gap-4 p-6">
                      <span className="jm-h4 text-(--j-ink)">{f.q}</span>
                    </summary>
                    <p className="jm-body max-w-[34rem] border-t border-(--j-line) px-6 py-4 text-(--j-ink-2)">{f.a}</p>
                  </details>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* ───── 마지막 띠 ───── */}
      <section className="jm-wrap pb-16 pt-4 lg:pb-24">
        <Reveal className="jm-grain relative overflow-hidden rounded-[var(--j-radius-panel)] bg-(--j-primary) px-6 py-12 text-white lg:px-16 lg:py-16">
          <div className="relative grid items-center gap-8 lg:grid-cols-[minmax(0,8fr)_minmax(0,4fr)]">
            <div>
              <p className="jm-small font-bold text-white/85">
                {assessment.round} · {deadlineKo}까지
              </p>
              <h2 className="jm-h2 mt-4">
                보석은 이미 있어요.
                <br />
                찾는 일만 남았어요.
              </h2>
              <p className="jm-body mt-4 max-w-[34rem] text-white/85">
                가입하고 아이를 등록하면 바로 시작해요. 무료이고, 결제 수단도 등록하지 않아요.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/exam" className="jm-btn jm-btn-white jm-btn-lg">
                  무료로 보석 찾기
                </Link>
                <Link href="/support/inquiry" className="jm-btn jm-btn-ghost jm-btn-lg">
                  1:1 문의
                </Link>
              </div>
            </div>
            <div className="mx-auto w-full max-w-[260px]">
              <div className="jm-float">
                <Jempy pose="wave" className="h-auto w-full" label={`손을 흔드는 ${MASCOT}`} />
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
