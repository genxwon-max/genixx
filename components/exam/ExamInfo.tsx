"use client";

import Link from "next/link";
import { FREE_QUESTIONS, questionCount, subjects } from "@/lib/exam";
import { useExamConfig } from "@/lib/roundStore";
import { PageTitle } from "./Registrations";
import { examMenu } from "@/lib/examNav";

/**
 * 시험 안내 (/exam/info) — 응시 순서와 규정.
 *
 * 순서는 응시 메뉴(접수하기 → 응시하기 → 정답과 해설 → 결과보기)를 그대로 따른다. 안내에
 * 적힌 단계와 헤더 아래 메뉴가 같은 이름이어야 읽은 대로 누를 수 있다.
 *
 * 과목과 제한 시간은 회차 설정(lib/roundStore.ts)에서 읽는다 — 응시 화면이 실제로 주는
 * 시간과 안내가 어긋나면 안 된다.
 */
const stepDesc: Record<string, string> = {
  "/exam/apply":
    "회차와 학년을 골라 평가를 접수합니다. 로그인하지 않았다면 여기서 무료 체험을 열 수 있습니다.",
  "/exam": "접수한 평가를 과목마다 따로 응시합니다. 응시는 별도 창에서 열립니다.",
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

  return (
    <div>
      <PageTitle sub="접수부터 결과까지, 헤더 아래 메뉴 순서대로 진행합니다.">시험 안내</PageTitle>

      {/* 한눈에 */}
      <dl className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { t: "과목", d: on.map((s) => s.short).join(" · ") || "-" },
          {
            t: "문항 수",
            d: on.map((s) => `${s.short} ${questionCount(s.id)}`).join(" · ") || "-",
          },
          { t: "제한 시간", d: limitText || "-" },
          { t: "무료 체험", d: `과목당 문제 1~${FREE_QUESTIONS}` },
        ].map((s) => (
          <div key={s.t} className="rounded-[10px] border border-soft-line bg-white px-5 py-4">
            <dt className="text-[12px] text-soft-muted">{s.t}</dt>
            <dd className="mt-1 text-[17px] font-bold text-soft-ink">{s.d}</dd>
          </div>
        ))}
      </dl>

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
            <li>· 중간에 포기하면 해당 과목의 응시 기회가 사라집니다.</li>
          </ul>
        </section>
        <section className="rounded-[10px] border border-soft-line bg-white p-6">
          <h2 className="text-[17px] font-bold text-soft-ink">응시 환경과 규정</h2>
          <ul className="mt-3 space-y-2 text-[14px] leading-relaxed text-soft-muted">
            <li>
              · PC 브라우저를 권장합니다. 응시와 무료 체험은 별도 창으로 열리므로 팝업을 허용해
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
