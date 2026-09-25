"use client";

import Link from "next/link";
import {
  FREE_TOTAL,
  PAID_COUNT,
  SET_QUESTIONS,
  paidShort,
  questionCount,
  subjects,
  tiers,
} from "@/lib/exam";
import { trackRangeText } from "@/lib/examCatalog";
import { useExamConfig } from "@/lib/roundStore";
import { PageTitle } from "./Registrations";
import { examMenu } from "@/lib/examNav";

/**
 * 시험 안내 (/exam/info) — 시험 세 갈래, 응시 순서, 규정.
 *
 * 순서는 응시 메뉴(접수하기 → 응시하기 → 정답과 해설 → 결과보기)를 그대로 따른다. 안내에
 * 적힌 단계와 헤더 아래 메뉴가 같은 이름이어야 읽은 대로 누를 수 있다.
 *
 * 과목과 제한 시간은 회차 설정(lib/roundStore.ts)에서 읽는다 — 응시 화면이 실제로 주는
 * 시간과 안내가 어긋나면 안 된다.
 *
 * 문항 수는 **편성 수와 지금 준비된 수를 함께** 적는다. 편성만 적으면 20문항이라 읽고 10문항을
 * 받은 아이가 시험이 끊긴 줄 알고, 준비된 수만 적으면 절차에 적힌 것과 화면이 달라 보인다.
 */
const stepDesc: Record<string, string> = {
  "/exam/apply":
    "분기와 학년을 골라 무료시험 또는 유료시험으로 접수합니다. 로그인하지 않았다면 여기서 1셋트를 풀어 볼 수 있습니다.",
  "/exam": "접수한 평가를 과목마다 따로 응시하고, 마친 뒤 설문에 답합니다.",
  "/exam/answers": "응시를 마친 과목의 정답과 내 답을 비교합니다.",
  "/exam/report": "전문가 검토를 거친 결과 리포트를 확인합니다.",
};

export default function ExamInfo() {
  const config = useExamConfig();
  const on = subjects.filter((s) => config.enabled[s.id]);
  const sameLimit = on.every((s) => config.limits[s.id] === config.limits[on[0]?.id]);
  const limitText =
    sameLimit && on.length > 0
      ? `과목당 ${config.limits[on[0].id]}분`
      : on.map((s) => `${s.short} ${config.limits[s.id]}분`).join(" · ");
  /* 편성 문항 수에 못 미치는 과목 */
  const short = on.filter((s) => paidShort(s.id) > 0);

  return (
    <div>
      <PageTitle sub="접수부터 결과까지, 헤더 아래 메뉴 순서대로 진행합니다.">시험 안내</PageTitle>

      {/* 한눈에 */}
      <dl className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { t: "대상 학년", d: trackRangeText },
          { t: "과목", d: on.map((s) => s.short).join(" · ") || "-" },
          { t: "제한 시간", d: limitText || "-" },
          { t: "응시 횟수", d: "해마다 4회 (1~4분기)" },
        ].map((s) => (
          <div key={s.t} className="rounded-[10px] border border-soft-line bg-white px-5 py-4">
            <dt className="text-[12px] text-soft-muted">{s.t}</dt>
            <dd className="mt-1 text-[17px] font-bold text-soft-ink">{s.d}</dd>
          </div>
        ))}
      </dl>

      {/* 시험 세 갈래 */}
      <h2 className="mt-12 text-[20px] font-bold tracking-tight text-soft-ink">시험 세 갈래</h2>
      <p className="mt-2 text-[13px] leading-relaxed text-soft-muted">
        가입 전에 1셋트를 풀어 보고, 가입하면 무료시험, 접수하면 유료시험으로 이어집니다. 앞
        단계에서 푼 문항은 다음 단계로 이어지니 다시 풀지 않습니다.
      </p>
      <ol className="mt-4 grid gap-3 md:grid-cols-3">
        {tiers.map((t, i) => (
          <li
            key={t.id}
            className="flex h-full flex-col rounded-[10px] border border-soft-line bg-white p-5"
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
                  ? `세 과목 · 모두 ${FREE_TOTAL}문항`
                  : on.map((s) => `${s.short} ${PAID_COUNT[s.id]}`).join(" · ") + "문항"}
            </span>
            {t.id === "paid" && short.length > 0 && (
              /* 준비된 문항이 편성보다 적은 과목 — 적어 두지 않으면 아이가 시험이 끊긴 줄 안다 */
              <span className="mt-1 text-[12px] leading-relaxed text-amber-700">
                지금은 {short.map((s) => `${s.short} ${questionCount(s.id)}문항`).join(" · ")}까지
                준비되어 있습니다.
              </span>
            )}
          </li>
        ))}
      </ol>

      {/* 순서 — 응시 메뉴와 같은 이름 */}
      <h2 className="mt-12 text-[20px] font-bold tracking-tight text-soft-ink">응시 순서</h2>
      <ol className="mt-4 grid gap-3 md:grid-cols-4">
        {examMenu.map((m, i) => (
          <li key={m.href}>
            <Link
              href={m.href}
              className="flex h-full flex-col rounded-[10px] border border-soft-line bg-white p-5 transition-colors hover:border-soft-primary"
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

      {/* 규정 */}
      <div className="mt-12 grid gap-6 md:grid-cols-2">
        <section className="rounded-[10px] border border-soft-line bg-white p-6">
          <h2 className="text-[17px] font-bold text-soft-ink">응시 전에 확인해 주세요</h2>
          <ul className="mt-3 space-y-2 text-[14px] leading-relaxed text-soft-muted">
            <li>· 과목은 한 번에 몰아 보지 않고 과목마다 따로 응시합니다.</li>
            <li>· 한 과목을 모두 풀어야 그 과목을 제출할 수 있습니다.</li>
            <li>
              ·{" "}
              {config.autoSubmit
                ? "제한 시간이 다 되면 쓰던 답 그대로 자동으로 제출됩니다."
                : "제한 시간이 지나도 답을 쓸 수 있지만, 걸린 시간은 기록에 남습니다."}
            </li>
            <li>· 제출한 뒤에는 문제마다 왜 그렇게 답했는지 적는 단계가 이어집니다.</li>
            <li>· 응시를 마치면 학생 설문, 이어서 학부모 설문에 답합니다. 필수는 아닙니다.</li>
            <li>· 설문은 낸 뒤에도 다시 열어 고칠 수 있고, 아직 안 낸 분은 나중에 내도 됩니다.</li>
            <li>· 중간에 포기하면 해당 과목의 응시 기회가 사라집니다.</li>
          </ul>
        </section>
        <section className="rounded-[10px] border border-soft-line bg-white p-6">
          <h2 className="text-[17px] font-bold text-soft-ink">응시 환경과 규정</h2>
          <ul className="mt-3 space-y-2 text-[14px] leading-relaxed text-soft-muted">
            <li>
              · PC 브라우저를 권장합니다. 응시와 셋트 문항은 별도 창으로 열리므로 팝업을 허용해
              주세요.
            </li>
            <li>· 응시를 시작하면 전체화면으로 바뀝니다.</li>
            <li>· 응시 중 보호자는 문제 풀이에 개입할 수 없습니다.</li>
            <li>
              · 화면 캡처와 문항 복제는 금지되며, 이상 행동이 감지되면 응시가 중단될 수 있습니다.
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
