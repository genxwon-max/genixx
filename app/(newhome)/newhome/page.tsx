import type { Metadata } from "next";
import Link from "next/link";
import Rise from "@/components/newhome/Rise";
import TryBoard from "@/components/newhome/TryBoard";
import { ArrowRight, BotIcon, CheckIcon } from "@/components/Icons";
import { assessment, levels, subjects } from "@/lib/exam";
import { editions } from "@/lib/diagReport";
import { axes } from "@/lib/result";
import ClipWall from "@/components/newhome/ClipWall";

export const metadata: Metadata = {
  /* 루트 레이아웃의 template("%s | GENIXX")가 뒤를 붙인다 */
  title: "맞혔는지보다 어떻게 보았는지를 읽습니다",
  description:
    "문항 하나로 시작하는 첫 화면 시안. 5지 선다 한 문제를 풀면 정답 여부와 함께 자료에 밑줄이 그어지고, 그 자리에서 학력·창의성·재능 가운데 무엇이 보이는지 간단 진단서로 보여 줍니다.",
};

/* ─────────────────────────────────────────────────────────────
   여섯 번째 시안 — 「풀어 보고 시작하는」 첫 화면.

   기존 첫 화면(/)은 무엇을 하는 회사인지 문장으로 설명하고, 문항은 /sample/questions에
   따로 있다. 학부모가 가장 알고 싶어 하는 「우리 아이가 무슨 문제를 푸는가」와 「그래서
   무엇이 나오는가」가 두 번 클릭 뒤에 있는 셈이다. 이 시안은 그 둘을 첫 화면으로 끌어
   올린다 — 들어오면 문항이 올라오고, 답을 고르면 밑줄이 그어지고, 단추 하나로 진단서가
   오른쪽에서 밀려 나온다.

   ⚠ 체험 문항은 실제 문항 은행이 아니라 lib/tryItems.ts의 홍보용 문항이다. 실제 회차에
     나올 문항에 정답을 걸면 미리 풀어 보고 오는 자리가 된다(/sample/questions와 같은 규칙).

   회차·과목·문항 수·위계는 lib/exam에서, 재능 축은 lib/result에서, 보고서 이름과 값은
   lib/diagReport에서 읽는다. 여기에 손으로 적지 않는다 — 광고와 실물이 조용히 갈라진다.
   ───────────────────────────────────────────────────────────── */

const btnFilled = "btn btn-lg bg-brand-900 text-white shadow-card hover:bg-brand-800";
const btnOutline =
  "btn btn-lg border border-brand-200 bg-white text-brand-800 hover:border-brand-400";

/** 아이를 보는 창 넷 — 번호·이름·누가 답하는지를 한 줄로 세우고, 무엇을 보는지는 아래에 */
const sources = [
  {
    n: "01",
    kind: "지필 진단",
    who: "학생",
    what: "국어·수학·과학 객관식과 서술형. 글과 표, 사진 자료가 문항에 함께 붙습니다.",
  },
  {
    n: "02",
    kind: "상황판단",
    who: "학생",
    what: "정답이 없는 상황을 주고 무엇을 고를지, 왜 그렇게 골랐는지를 봅니다. 전문가들은 이것을 SJT라고 부릅니다.",
  },
  {
    n: "03",
    kind: "관찰 설문",
    who: "보호자 · 지도교사",
    what: "검사장에서는 보이지 않는 모습 — 집과 교실에서 실제로 본 행동을 어른이 적습니다.",
  },
  {
    n: "04",
    kind: "면담",
    who: "교육전문가",
    what: "판정이 갈리는 아이만 따로 만나 확인합니다. 숫자로 가르지 않고 사람이 직접 봅니다.",
  },
];

/** AI가 하는 몫과 사람이 하는 몫 — /about/hitl과 같은 경계로 적는다 */
const hitl = [
  {
    t: "AI · 1차 분석",
    d: "답안을 채점하고, 서술형에 드러난 생각에 유형을 붙입니다(이렇게 유형을 붙이는 일을 코딩이라고 합니다). 붙인 유형마다 스스로 얼마나 확신하는지까지 적어 사람에게 넘깁니다. 여기까지가 AI의 몫입니다.",
    ai: true,
  },
  {
    t: "전문가 · 확정",
    d: "한국창의영재교육원 전문가 40인이 출제·검수·진단·면담을 맡습니다. 판정은 협진 회의에서 사람이 확정합니다.",
  },
  {
    t: "발행",
    d: "승인이 난 뒤에야 진단서가 열립니다. 승인 전에는 보호자에게도 보이지 않습니다.",
  },
];

export default function NewHomePage() {
  return (
    <>
      {/* ───── ① 들어오자마자 한 문항 ─────
          문항 판은 한 단으로 세우고(자료 위, 발문 아래) 오른쪽에, 말은 왼쪽에 둔다. 문항을
          두 단으로 벌리면 화면을 가로로 다 먹어 버려서, 무엇을 하는 곳인지 적을 자리가
          문항 아래(= 한 번 굴려 내려야 보이는 곳)로 밀려난다.
          바탕은 그라데이션 없이 한 색으로 깐다. */}
      <section className="section-y bg-brand-50/50">
        <div className="container-x">
          <div className="grid items-start gap-8 lg:grid-cols-[1fr_minmax(0,36rem)] lg:gap-12">
            {/* 말 — 왼쪽. 문서에서도 앞이라 화면 낭독기가 제목부터 읽는다 */}
            <div className="lg:sticky lg:top-24 lg:col-start-1 lg:row-start-1">
              <h1 className="type-display font-black text-brand-950">
                맞혔는지보다
                <br />
                <span className="text-brand-600">어떻게 보았는지</span>를
                <br />
                읽습니다
              </h1>
              <p className="type-lead mt-5 text-slate-600">
                옆 문항에서 보기를 하나 고르면, 정답 여부와 함께 자료의 어느 자리에서 생각이
                움직였는지 밑줄로 표시됩니다. 교육전문가가 아이의 답안을 읽을 때 보는 자리가 바로
                거기입니다.
              </p>
              <ul className="mt-6 space-y-2">
                {[
                  "정답은 학력을, 밑줄 친 자리는 재능과 창의성을 봅니다",
                  "AI가 먼저 읽고, 교육전문가가 협진 회의에서 확정합니다",
                  `${assessment.round} 학력진단은 파일럿이라 무료입니다`,
                ].map((t) => (
                  <li key={t} className="type-meta flex gap-2 text-slate-600">
                    <CheckIcon className="mt-1 h-4 w-4 shrink-0 text-emerald-500" />
                    {t}
                  </li>
                ))}
              </ul>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link href="/exam" className={btnFilled}>
                  무료 학력진단 시작하기
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/sample/report" className={btnOutline}>
                  진단서 먼저 보기
                </Link>
              </div>
            </div>

            {/* 문항 판 — 오른쪽. 아래에서 올라온다.
                체험용이라는 말은 판 머리띠와 진단서 바닥에 이미 적혀 있어 여기서는 뺐다 */}
            <div className="lg:col-start-2 lg:row-start-1">
              <TryBoard />
            </div>
          </div>
        </div>
      </section>

      {/* ───── ② 어떤 문항이 나오나요 ───── */}
      <section className="section-y bg-white">
        <div className="container-x">
          <Rise>
            <h2 className="type-h2 font-black text-brand-950">어떤 문항이 나오나요</h2>
            <p className="type-lead mt-3 max-w-2xl text-slate-600">
              세 과목을 하루에 몰아 보지 않고 과목마다 따로 응시합니다. 자료 하나에 묻는 깊이가 다른
              문항을 여러 개 붙여, 같은 글을 읽고도 어디까지 갈 수 있는지를 봅니다.
            </p>
          </Rise>

          <Rise delay={80} className="mt-8 grid gap-3 sm:grid-cols-3">
            {subjects.map((s) => (
              <div key={s.id} className="rounded-xl border border-brand-100 bg-white p-5">
                <p className="type-h4 font-black text-brand-950">{s.name}</p>
                <p className="type-caption mt-2 text-slate-600">{s.hint}</p>
                <p className="type-caption mt-3 text-slate-500">과목당 {s.limitMin}분</p>
              </div>
            ))}
          </Rise>

          {/* 네 층위 — 진단의 뼈대라 네 칸을 그대로 보여 준다.
              S1~S4라는 부호는 내부에서 쓰는 이름이라 여기서는 떼고 뜻만 남긴다. */}
          <Rise delay={120} className="mt-4 overflow-hidden rounded-xl border border-brand-100">
            <div className="border-b border-brand-100 bg-brand-50/70 px-5 py-3">
              <p className="type-h4 font-black text-brand-900">
                자료 하나를 네 단계로 묻습니다 — 이 진단의 기본 구조입니다
              </p>
            </div>
            <ul className="grid sm:grid-cols-2 lg:grid-cols-4">
              {levels.map((l, i) => (
                <li
                  key={l.id}
                  className={`px-5 py-4 ${i > 0 ? "border-t border-brand-50 lg:border-t-0 lg:border-l" : ""}`}
                >
                  <p className="type-h4 font-black text-brand-950">{l.name}</p>
                  <p className="type-caption mt-1.5 text-slate-600">{l.desc}</p>
                </li>
              ))}
            </ul>
          </Rise>

          <Rise delay={160} className="mt-4">
            <Link
              href="/sample/questions"
              className="type-meta inline-flex items-center gap-1 font-bold text-brand-700 underline-offset-4 hover:underline"
            >
              문항 미리보기
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Rise>
        </div>
      </section>

      {/* ───── ③ 어떻게 분석하나요 ───── */}
      <section className="section-y bg-brand-50/40">
        <div className="container-x">
          <Rise>
            <h2 className="type-h2 font-black text-brand-950">어떻게 분석하나요</h2>
            <p className="type-lead mt-3 max-w-2xl text-slate-600">
              한 자리에서 본 것만으로 판정하지 않습니다. 아이를 보는 네 가지 창을 서로 비교해 보고, AI가
              먼저 정리한 뒤 판정은 사람이 확정합니다.
            </p>
          </Rise>

          <Rise delay={80} className="mt-8 grid gap-3 sm:grid-cols-2">
            {sources.map((s) => (
              <div key={s.n} className="rounded-xl border border-brand-100 bg-white p-5">
                {/* 번호 · 이름 · 누가 답하는가를 한 줄로 */}
                <p className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                  <span className="type-tag text-brand-400 tabular-nums">{s.n}</span>
                  <span className="type-h4 font-black text-brand-950">{s.kind}</span>
                  <span className="type-caption font-bold text-brand-600">{s.who}</span>
                </p>
                <p className="type-caption mt-2 text-slate-600">{s.what}</p>
              </div>
            ))}
          </Rise>

          <Rise delay={120} className="mt-4 grid gap-3 lg:grid-cols-3">
            {hitl.map((h) => (
              <div
                key={h.t}
                className={`rounded-xl border p-5 ${
                  h.ai ? "border-accent-300 bg-accent-100/50" : "border-brand-100 bg-white"
                }`}
              >
                <p className="type-h4 flex items-center gap-2 font-black text-brand-950">
                  {h.ai && <BotIcon className="h-4 w-4 text-accent-600" />}
                  {h.t}
                </p>
                <p className="type-body mt-2 text-slate-700">{h.d}</p>
              </div>
            ))}
          </Rise>

          <Rise delay={160} className="mt-4">
            <Link
              href="/about/hitl"
              className="type-meta inline-flex items-center gap-1 font-bold text-brand-700 underline-offset-4 hover:underline"
            >
              사람이 확정한다는 말의 뜻
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Rise>
        </div>
      </section>

      {/* ───── ④ 무엇을 받나요 ───── */}
      <section className="section-y bg-white">
        <div className="container-x">
          <Rise>
            <h2 className="type-h2 font-black text-brand-950">진단서에 무엇이 담기나요</h2>
            <p className="type-lead mt-3 max-w-2xl text-slate-600">
              등수가 아니라 좌표를 드립니다. 재능을 여덟 갈래로 나누어 보는데, 지금 재는 것은 그
              가운데 셋입니다. 나머지 다섯은 「없다」가 아니라 「아직 재지 않았다」로 적힙니다.
            </p>
          </Rise>

          <Rise delay={80} className="mt-8 flex flex-wrap gap-2">
            {axes.map((a) => (
              <span
                key={a.id}
                className={`type-meta rounded-full px-3.5 py-1.5 ${
                  a.subject
                    ? "bg-brand-900 font-bold text-white"
                    : "border border-dashed border-brand-200 text-slate-500"
                }`}
              >
                {a.label}
                {!a.subject && <span className="type-caption ml-1.5">2027</span>}
              </span>
            ))}
          </Rise>

          <Rise delay={120} className="mt-6 grid gap-3 md:grid-cols-2">
            {(["summary", "full"] as const).map((e) => (
              <div
                key={e}
                className={`rounded-xl border p-6 ${
                  e === "summary" ? "border-brand-200 bg-brand-50/50" : "border-brand-100 bg-white"
                }`}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <p className="type-h3 font-black text-brand-950">
                    진단 보고서 {editions[e].label}
                  </p>
                  <p className="type-h4 font-black text-brand-700">{editions[e].price}</p>
                </div>
                <ul className="mt-4 space-y-2">
                  {(e === "summary"
                    ? [
                        "2면 — 과목별 점수와 또래 대비 위치",
                        "잘한 영역 · 더 살펴볼 영역 한 줄씩",
                        "오늘 집에서 해 볼 것 세 가지",
                      ]
                    : [
                        "10면 — 영역별 세부 점수와 문항 유형별 정답률",
                        "재능 유형과 그 유형이 자라는 조건",
                        "틀린 문항 되짚기 · 전문가 소견",
                        "다음 회차까지의 실행 계획",
                      ]
                  ).map((t) => (
                    <li key={t} className="type-body flex gap-2 text-slate-700">
                      <CheckIcon className="mt-1 h-4 w-4 shrink-0 text-emerald-500" />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </Rise>

          <Rise delay={160} className="mt-4">
            <Link
              href="/sample/report"
              className="type-meta inline-flex items-center gap-1 font-bold text-brand-700 underline-offset-4 hover:underline"
            >
              샘플 진단서 전체 보기
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Rise>
        </div>
      </section>

      {/* ───── ⑤ 영상으로 보기 ─────
          목록이 관리자가 고치는 값이 되어(lib/clipStore.ts) 구간째 클라이언트 조각으로
          떼었다. 영상이 한 칸도 없으면 그 조각이 구간을 그리지 않는다 */}
      <ClipWall />

      {/* ───── ⑥ 시작하기 ───── */}
      <section className="section-y bg-white">
        <div className="container-x">
          <Rise className="rounded-2xl border border-brand-100 bg-brand-50/60 px-6 py-10 text-center sm:px-10">
            <h2 className="type-h2 font-black text-brand-950">
              한 문항으로 본 것을, 세 과목으로
            </h2>
            <p className="type-lead mt-3 text-slate-600">
              {assessment.round} 학력진단은 파일럿 회차라 무료입니다. 회원가입 뒤 바로 응시할 수
              있고, 아이는 따로 계정을 만들지 않습니다 — 보호자가 받은 여덟 자리 접속코드로
              들어갑니다.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link href="/exam" className={btnFilled}>
                무료 학력진단 시작하기
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/support/faq" className={btnOutline}>
                자주 묻는 질문
              </Link>
            </div>
          </Rise>
        </div>
      </section>
    </>
  );
}
