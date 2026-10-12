"use client";

import Link from "next/link";
import {
  FREE_COUNT,
  FREE_LIMIT_MIN,
  FREE_TOTAL,
  PAID_COUNT,
  SET_QUESTIONS,
  paidShort,
  questionCount,
  subjects,
  tiers,
} from "@/lib/exam";
import { tracks } from "@/lib/examCatalog";
import { examSteps } from "@/lib/examNav";
import { designLinks } from "@/lib/designScreens";
import ExamPaper from "@/components/exam/ExamPaper";
import { PageTitle } from "@/components/exam/Registrations";
import { btnGhost, btnPrimary } from "@/components/exam/ui";
import { ExamSiteFrame } from "../ExamFrame";

/**
 * 진단 안내의 「응시 전 마이크 점검」 (실제 주소 /exam/info · WBS Q.1.4) — 디자인.
 *
 * 단답형 · 서술형 답은 글로 쓰는 대신 말로 입력할 수 있다(음성 입력 — 말한 것을 받아 적어 답
 * 칸에 넣는다. 녹음을 내는 것이 아니다). 응시 창을 연 뒤에야 마이크가 안 되는 것을 알면 그
 * 시간은 제한 시간에서 빠져나간다. 그래서 **응시하기 전에** 이 기기의 마이크를 한 번 확인해
 * 보게 한다. 점검은 필수가 아니다 — 하지 않아도 응시할 수 있고, 음성 입력을 쓰지 않아도 된다.
 *
 * WBS는 주소를 /exam/guide로 적었지만 지금 그 주소는 샘플 문항을 견주는 「서비스 안내」다.
 * 응시 순서와 규정을 읽는 화면은 「진단 안내」(/exam/info)라서, 점검을 거기에 두었다.
 * 나머지 화면은 지금의 진단 안내(components/exam/ExamInfo.tsx)를 그대로 옮긴 것이다.
 *
 * 점검은 응시 화면의 음성 입력과 같은 방식으로 한다 — 문장을 소리 내어 읽으면 받아 적은 글이
 * 보인다. 안 될 때의 안내 글도 응시 화면이 쓰는 것과 같다(components/exam/AnswerMedia.tsx).
 */

const to = designLinks("exam-guide-mic");

type Mic = "idle" | "asking" | "listening" | "ok" | "denied" | "none" | "quiet" | "unsupported";

/** 점검할 때 읽는 문장 */
const SENTENCE = "나는 오늘 재능 진단을 봅니다.";

const stepDesc: Record<string, string> = {
  "/student/apply": "분기와 학년을 골라 무료 진단 또는 유료 진단으로 접수합니다.",
  "/student/exams":
    "무료 진단은 20문항을 한 번에, 유료 진단은 과목마다 따로 응시하고, 마친 뒤 설문에 답합니다.",
  "/student/answers": "최종 제출을 마친 진단의 정답과 내 답을 비교합니다.",
  "/student/results": "전문가 검토를 거친 결과 리포트를 확인합니다.",
};

export default function ExamGuideMic({ state }: { state: string }) {
  const mic: Mic = state.startsWith("mic/") ? (state.slice(4) as Mic) : "idle";
  /* 준비된 문항이 편성보다 적은 과목 */
  const short = subjects.filter((s) => paidShort(s.id) > 0);

  return (
    <ExamSiteFrame as={state === "guest" ? "guest" : "member"}>
      <ExamPaper>
        <PageTitle sub="접수부터 결과까지, 로그인한 뒤 「내 대시보드」의 메뉴 순서대로 진행합니다.">
          진단 안내
        </PageTitle>

        <dl className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { t: "대상 학년", d: tracks.map((t) => t.tag).join(" · ") },
            { t: "과목", d: subjects.map((s) => s.short).join(" · ") },
            {
              t: "제한 시간",
              d: `무료 진단 ${FREE_LIMIT_MIN}분 · 유료 진단 과목당 ${subjects[0].limitMin}분`,
            },
            { t: "응시 횟수", d: "해마다 4회 (1~4분기)" },
          ].map((s) => (
            <div key={s.t} className="rounded-[2px] border border-soft-line bg-white px-5 py-4">
              <dt className="text-[12px] text-soft-muted">{s.t}</dt>
              <dd className="mt-1 text-[17px] font-bold text-soft-ink">{s.d}</dd>
            </div>
          ))}
        </dl>

        <h2 className="mt-12 text-[20px] font-bold tracking-tight text-soft-ink">진단 세 가지</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-soft-muted">
          가입 전에 1셋트를 풀어 보고, 가입하면 무료 진단, 접수하면 유료 진단으로 이어집니다. 앞
          단계에서 푼 문항은 다음 단계로 이어지니 다시 풀지 않습니다.
        </p>
        <ol className="mt-4 grid gap-3 md:grid-cols-3">
          {tiers.map((t, i) => (
            <li
              key={t.id}
              className="flex h-full flex-col rounded-[2px] border border-soft-line bg-white p-5"
            >
              <span className="text-[12px] font-bold tabular-nums text-soft-primary">
                {i + 1}단계
              </span>
              <span className="mt-1 text-[17px] font-bold text-soft-ink">{t.label}</span>
              <span className="mt-2 text-[13px] leading-relaxed text-soft-muted">{t.desc}</span>
              <span className="mt-3 border-t border-soft-line pt-3 text-[13px] font-semibold text-soft-ink">
                {t.id === "set"
                  ? `교과 1개 · ${SET_QUESTIONS}문항`
                  : t.id === "free"
                    ? subjects.map((s) => `${s.short} ${FREE_COUNT[s.id]}`).join(" · ") +
                      `문항 · 모두 ${FREE_TOTAL}문항`
                    : subjects.map((s) => `${s.short} ${PAID_COUNT[s.id]}`).join(" · ") + "문항"}
              </span>
              {t.id === "paid" && short.length > 0 && (
                <span className="mt-1 text-[12px] leading-relaxed text-amber-700">
                  지금은 {short.map((s) => `${s.short} ${questionCount(s.id)}문항`).join(" · ")}까지
                  준비되어 있습니다.
                </span>
              )}
            </li>
          ))}
        </ol>

        <h2 className="mt-12 text-[20px] font-bold tracking-tight text-soft-ink">응시 순서</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-soft-muted">
          네 단계는 모두 「내 대시보드」에 있습니다. 아직 가입하지 않았다면{" "}
          <Link href="/design/exam" className="font-semibold text-soft-primary hover:underline">
            진단 둘러보기
          </Link>
          에서 1셋트를 먼저 풀어 볼 수 있습니다.
        </p>
        <ol className="mt-4 grid gap-3 md:grid-cols-4">
          {examSteps.map((m, i) => (
            <li key={m.href}>
              <Link
                /* 네 단계 모두 디자인 화면이 있다 — /design/student/apply · exams · answers · results */
                href={`/design${m.href}`}
                className="flex h-full flex-col rounded-[2px] border border-soft-line bg-white p-5 transition-colors hover:border-soft-primary"
              >
                <span className="text-[12px] font-bold tabular-nums text-soft-primary">
                  STEP {i + 1}
                </span>
                <span className="mt-1 text-[17px] font-bold text-soft-ink">{m.label}</span>
                <span className="mt-2 text-[13px] leading-relaxed text-soft-muted">
                  {stepDesc[m.href]}
                </span>
              </Link>
            </li>
          ))}
        </ol>

        {/* ── 새로 넣은 것 — 응시 전 마이크 점검 ── */}
        <MicCheck mic={mic} />

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <section className="rounded-[2px] border border-soft-line bg-white p-6">
            <h2 className="text-[17px] font-bold text-soft-ink">응시 전에 확인해 주세요</h2>
            <ul className="mt-3 space-y-2 text-[14px] leading-relaxed text-soft-muted">
              <li>
                · 무료 진단은 과목을 고르지 않고 {FREE_TOTAL}문항을 한 번에 이어서 풉니다. 제한
                시간은 {FREE_LIMIT_MIN}분입니다.
              </li>
              <li>
                · 유료 진단은 한 번에 몰아 보지 않고 과목마다 따로 응시합니다. 제한 시간은
                과목마다 따로 적용됩니다.
              </li>
              <li>· 답하지 않은 문항이 남아 있어도 제출할 수 있습니다.</li>
              <li>· 제한 시간이 다 되면 쓰던 답 그대로 자동으로 제출됩니다.</li>
              <li>· 제출한 뒤에는 문제마다 왜 그렇게 답했는지 적는 단계가 이어집니다.</li>
              <li>· 응시를 마치면 학생 설문, 이어서 학부모 설문에 답합니다. 필수는 아닙니다.</li>
              <li>· 설문은 낸 뒤에도 다시 열어 고칠 수 있고, 아직 안 낸 분은 나중에 내도 됩니다.</li>
              <li>· 중간에 나가면 그 과목(무료 진단은 전체)의 응시 기회가 사라집니다.</li>
            </ul>
          </section>
          <section className="rounded-[2px] border border-soft-line bg-white p-6">
            <h2 className="text-[17px] font-bold text-soft-ink">응시 환경과 규정</h2>
            <ul className="mt-3 space-y-2 text-[14px] leading-relaxed text-soft-muted">
              <li>
                · PC 브라우저를 권장합니다. 응시와 셋트 문항은 별도 창으로 열리므로 팝업을 허용해
                주세요.
              </li>
              <li>· 응시를 시작하면 전체화면으로 바뀝니다.</li>
              <li>
                · 말로 답을 입력하려면 마이크가 필요합니다. 위의 마이크 점검으로 미리 확인할 수
                있습니다.
              </li>
              <li>· 응시 중 보호자는 문제 풀이에 개입할 수 없습니다.</li>
              <li>
                · 화면 캡처와 문항 복제는 금지되며, 이상 행동이 감지되면 응시가 중단될 수 있습니다.
              </li>
            </ul>
          </section>
        </div>
      </ExamPaper>
    </ExamSiteFrame>
  );
}

/* ───────────────────────── 마이크 점검 ───────────────────────── */

/** 판 오른쪽 위의 점검 결과 */
const result: Partial<Record<Mic, { text: string; cls: string }>> = {
  ok: { text: "점검 통과", cls: "border-emerald-300 bg-emerald-50 text-emerald-700" },
  denied: { text: "마이크 차단됨", cls: "border-rose-300 bg-rose-50 text-rose-700" },
  none: { text: "마이크 없음", cls: "border-rose-300 bg-rose-50 text-rose-700" },
  quiet: { text: "소리 없음", cls: "border-amber-300 bg-amber-50 text-amber-800" },
  unsupported: { text: "사용할 수 없음", cls: "border-soft-line bg-slate-50 text-soft-muted" },
};

function MicCheck({ mic }: { mic: Mic }) {
  const badge = result[mic];

  return (
    <section
      aria-labelledby="mic-check"
      className="mt-12 rounded-[2px] border border-soft-line bg-white p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="mic-check" className="text-[17px] font-bold text-soft-ink">
            응시 전 마이크 점검
          </h2>
          <p className="mt-2 max-w-3xl text-[14px] leading-relaxed text-soft-muted">
            단답형 · 서술형 답은 글로 쓰는 대신 말로 입력할 수 있습니다. 응시하기 전에 이 기기의
            마이크가 잘 되는지 확인해 보세요. 점검하지 않아도 응시할 수 있고, 음성 입력을 쓰지
            않아도 됩니다.
          </p>
        </div>
        {badge && (
          <span className={`shrink-0 rounded-[2px] border px-2.5 py-1 text-[12px] font-bold ${badge.cls}`}>
            {badge.text}
          </span>
        )}
      </div>

      <div className="mt-5 border-t border-soft-line pt-5">
        {mic === "idle" && (
          <>
            <ol className="grid gap-3 md:grid-cols-3">
              {[
                ["「마이크 점검 시작」을 누릅니다", "브라우저가 마이크를 써도 되는지 물으면 「허용」을 누릅니다."],
                ["화면의 문장을 소리 내어 읽습니다", "평소 말하는 크기로, 기기에서 한 뼘쯤 떨어져 읽습니다."],
                ["받아 적은 글을 확인합니다", "읽은 문장이 글로 보이면 마이크가 잘 되는 것입니다."],
              ].map(([t, d], i) => (
                <li key={t} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-soft-line text-[12px] font-bold tabular-nums text-soft-muted">
                    {i + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[14px] font-bold text-soft-ink">{t}</span>
                    <span className="mt-1 block text-[13px] leading-relaxed text-soft-muted">{d}</span>
                  </span>
                </li>
              ))}
            </ol>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Link href={to("mic/asking")} className={btnPrimary}>
                <MicIcon className="h-4 w-4" />
                마이크 점검 시작
              </Link>
              <span className="text-[13px] text-soft-muted">1분이면 끝납니다. 점검한 소리는 저장하지 않습니다.</span>
            </div>
          </>
        )}

        {mic === "asking" && (
          <>
            <p role="status" className="flex items-center gap-2.5 text-[15px] font-bold text-soft-ink">
              <span aria-hidden className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-soft-primary" />
              마이크 사용 허용을 기다리고 있습니다
            </p>
            <p className="mt-3 rounded-[2px] border border-soft-line bg-slate-50 px-4 py-3 text-[14px] leading-relaxed text-soft-ink">
              브라우저 위쪽에 「마이크를 사용하도록 허용하시겠습니까?」 창이 보이면 <b>「허용」</b>을
              눌러 주세요. 허용하면 바로 점검이 시작됩니다.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Link href={to()} className={btnGhost}>
                점검 그만하기
              </Link>
              <span className="text-[13px] text-soft-muted">
                창이 보이지 않으면 주소창 왼쪽의 자물쇠를 눌러 마이크 권한을 확인해 주세요.
              </span>
            </div>
          </>
        )}

        {mic === "listening" && (
          <>
            <p className="text-[13px] font-semibold text-soft-muted">아래 문장을 소리 내어 읽어 보세요</p>
            <p className="font-myeongjo mt-2 rounded-[2px] border border-soft-line bg-slate-50 px-5 py-4 text-[20px] font-bold leading-relaxed text-soft-ink">
              {SENTENCE}
            </p>

            <div className="mt-4 grid gap-4 md:grid-cols-[14rem_minmax(0,1fr)]">
              <div>
                <p className="text-[12px] font-semibold text-soft-muted">소리 크기</p>
                <Meter level={7} />
              </div>
              <div className="min-w-0">
                <p className="text-[12px] font-semibold text-soft-muted">받아 적는 중</p>
                <p role="status" className="mt-2 flex min-w-0 items-center gap-2 text-[15px] text-soft-ink">
                  <span aria-hidden className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-rose-600" />
                  <span className="truncate">나는 오늘 재능</span>
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Link href={to("mic/ok")} className={btnPrimary}>
                <StopIcon className="h-4 w-4" />
                점검 끝내기
              </Link>
              <span className="text-[13px] text-soft-muted">듣고 있습니다. 말하면 글로 받아 적습니다.</span>
            </div>
          </>
        )}

        {mic === "ok" && (
          <>
            <p className="flex items-center gap-2.5 text-[15px] font-bold text-emerald-700">
              <span aria-hidden className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[12px] text-white">
                ✓
              </span>
              마이크가 잘 됩니다
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-[14rem_minmax(0,1fr)]">
              <div>
                <p className="text-[12px] font-semibold text-soft-muted">소리 크기</p>
                <p className="mt-2 text-[15px] font-bold text-soft-ink">적당합니다</p>
              </div>
              <div className="min-w-0">
                <p className="text-[12px] font-semibold text-soft-muted">받아 적은 글</p>
                <p className="font-myeongjo mt-2 rounded-[2px] border border-emerald-200 bg-emerald-50/60 px-4 py-3 text-[17px] font-bold text-soft-ink">
                  {SENTENCE}
                </p>
              </div>
            </div>
            <p className="mt-4 text-[13px] leading-relaxed text-soft-muted">
              응시 화면에서는 답 칸 아래의 「음성 입력」을 누르면 같은 방식으로 입력됩니다. 받아 적은
              글이 다르면 그 자리에서 고쳐 쓸 수 있습니다.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Link href="/design/student/exams" className={btnPrimary}>
                응시하러 가기
              </Link>
              <Link href={to("mic/asking")} className={btnGhost}>
                다시 점검
              </Link>
            </div>
          </>
        )}

        {mic === "denied" && (
          <Trouble
            title="마이크 사용이 차단되어 있습니다"
            lead="이 사이트에서 마이크를 쓰지 못하게 되어 있습니다. 아래 순서로 허용한 뒤 다시 점검해 주세요."
            steps={[
              "주소창 왼쪽의 자물쇠(또는 설정) 아이콘을 누릅니다.",
              "「마이크」를 「허용」으로 바꿉니다.",
              "화면을 새로 고친 뒤 「다시 점검」을 누릅니다.",
            ]}
          />
        )}

        {mic === "none" && (
          <Trouble
            title="마이크를 찾지 못했습니다"
            lead="이 기기에 연결된 마이크가 없습니다. 아래를 확인한 뒤 다시 점검해 주세요."
            steps={[
              "마이크나 이어폰(마이크 달린 것)이 제대로 꽂혀 있는지 확인합니다.",
              "노트북 · 태블릿이라면 기기 설정에서 마이크가 켜져 있는지 확인합니다.",
              "다른 프로그램(화상 회의 등)이 마이크를 쓰고 있으면 끕니다.",
            ]}
          />
        )}

        {mic === "quiet" && (
          <>
            <p className="flex items-center gap-2.5 text-[15px] font-bold text-amber-800">
              <span aria-hidden className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500 text-[12px] font-black text-white">
                !
              </span>
              소리가 들리지 않습니다
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-[14rem_minmax(0,1fr)]">
              <div>
                <p className="text-[12px] font-semibold text-soft-muted">소리 크기</p>
                <Meter level={0} />
              </div>
              <div className="min-w-0">
                <p className="text-[12px] font-semibold text-soft-muted">받아 적은 글</p>
                <p className="mt-2 text-[14px] text-soft-muted">10초 동안 들린 말이 없습니다.</p>
              </div>
            </div>
            <ul className="mt-4 space-y-1.5 text-[14px] leading-relaxed text-soft-muted">
              <li>· 마이크가 꺼져 있거나 소리가 0으로 되어 있지 않은지 확인합니다.</li>
              <li>· 마이크가 여러 개라면 주소창 왼쪽의 자물쇠에서 쓰려는 마이크를 고릅니다.</li>
              <li>· 기기에 조금 더 가까이에서 또박또박 말해 봅니다.</li>
            </ul>
            <Retry />
          </>
        )}

        {mic === "unsupported" && (
          <>
            <p className="text-[15px] font-bold text-soft-ink">이 브라우저에서는 음성 입력을 쓸 수 없습니다</p>
            <p className="mt-3 text-[14px] leading-relaxed text-soft-muted">
              음성 입력은 크롬 · 엣지 · 사파리에서 쓸 수 있습니다. 지금 브라우저에서는 응시 화면에
              「음성 입력」 버튼이 보이지 않습니다. 글로는 그대로 입력할 수 있어 응시에는 지장이
              없습니다.
            </p>
          </>
        )}
      </div>
    </section>
  );
}

/** 안 될 때 — 무엇이 문제인지와 푸는 순서 */
function Trouble({ title, lead, steps }: { title: string; lead: string; steps: string[] }) {
  return (
    <>
      <p role="alert" className="flex items-center gap-2.5 text-[15px] font-bold text-rose-700">
        <span aria-hidden className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-600 text-[12px] font-black text-white">
          !
        </span>
        {title}
      </p>
      <p className="mt-3 text-[14px] leading-relaxed text-soft-muted">{lead}</p>
      <ol className="mt-3 space-y-1.5 text-[14px] leading-relaxed text-soft-ink">
        {steps.map((s, i) => (
          <li key={s} className="flex gap-2.5">
            <span className="shrink-0 tabular-nums text-soft-muted">{i + 1}.</span>
            {s}
          </li>
        ))}
      </ol>
      <Retry />
    </>
  );
}

function Retry() {
  return (
    <div className="mt-5 flex flex-wrap items-center gap-3">
      <Link href={to("mic/asking")} className={btnPrimary}>
        <MicIcon className="h-4 w-4" />
        다시 점검
      </Link>
      <span className="text-[13px] text-soft-muted">
        마이크가 없어도 응시할 수 있습니다. 답은 글로 입력하면 됩니다.
      </span>
    </div>
  );
}

/** 소리 크기 막대 — 열두 칸 가운데 level칸이 찬다 */
function Meter({ level }: { level: number }) {
  return (
    <div
      role="img"
      aria-label={level > 0 ? `소리 크기 ${level}칸` : "소리가 들리지 않습니다"}
      className="mt-2 flex h-8 items-end gap-1"
    >
      {Array.from({ length: 12 }, (_, i) => (
        <span
          key={i}
          className={`w-2.5 rounded-[1px] ${i < level ? "bg-soft-primary" : "bg-slate-200"}`}
          style={{ height: `${30 + i * 6}%` }}
        />
      ))}
    </div>
  );
}

function MicIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7" />
    </svg>
  );
}

function StopIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" fill="currentColor" className={className}>
      <rect x="6.5" y="6.5" width="11" height="11" rx="1.5" />
    </svg>
  );
}
