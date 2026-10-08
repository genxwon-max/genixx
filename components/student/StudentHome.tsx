"use client";

import Link from "next/link";
import { currentRegOf, useExamVersion } from "@/lib/examStore";
import { progressOf, phaseTone, subjectTone, type StudentProgress } from "@/lib/progress";
import { useRegistrations } from "@/components/exam/Registrations";
import { examPath, resultPath } from "./diag";
import { Head, WhoNote, btnGo, btnQuiet, cardBox, useSelf } from "./self";

/**
 * 학생 홈 (/student) — 접속코드로 들어온 아이가 처음 닿는 자리.
 *
 * 보호자 홈(/my)과 같은 껍데기를 쓰되 보는 것이 다르다. 저쪽은 **아이들이 줄로** 서고
 * 여기는 **내 과목이 칸으로** 선다. 아이에게 목록은 필요 없다 — 자기 하나뿐이다.
 *
 * 두 덩이로 둔다.
 *   지금 할 일   한 줄과 단추 하나. 아이가 이 화면에서 찾는 것은 사실 이것뿐이다
 *   내 진행      과목 셋 · 설문 · 단계. 어디까지 왔는지
 *
 * 예전에는 그 아래에 바로가기 카드(진단 보기 · 결과 · 정답과 해설 · 진단 안내 …)를 깔았다.
 * 모두 왼쪽 레일에 있는 자리이거나 「내 진단」 안에서 진단마다 여는 것이라 걷었다 —
 * 같은 곳으로 가는 길이 두 벌이면 아이는 어느 쪽을 눌러야 하는지부터 고른다.
 *
 * 만 14세 이상이면 레일에 **결제와 면담 신청**이 더 선다(DashShell의 studentTeenMenu).
 * 미만인 아이 화면에는 그 자리가 없으므로, 어디에 있는지만 아래 한 줄로 적는다.
 *
 * 문항은 「내 진단」에서 연다. 여기서 문항을 열지 않는 까닭은 시험지 창이 따로 있어서다 —
 * 남은 시간과 과목만 남기고 메뉴를 감추는 그 틀이 대시보드 레일과 함께 설 수 없다. 그래서
 * 이 화면은 그 자리로 **건너가는 단추**를 가장 크게 둔다.
 */
/**
 * 「지금 할 일」 한 줄 — 아이에게 하는 말.
 *
 * 보호자 화면이 쓰는 문장(progressOf의 nextAction)을 그대로 가져오지 않는다. 저쪽은
 * 「접속코드로 응시 화면에 들어가면 시작됩니다」처럼 **코드를 아이에게 넘길 사람**에게
 * 하는 말이다. 이미 로그인해 단추 앞에 앉은 아이가 그 문장을 읽으면 자기가 어디로 또
 * 들어가야 하는 줄 알게 된다 — 갈 곳은 바로 옆의 단추다.
 */
function todoLine(p: StudentProgress) {
  if (p.phase === "미응시") return "아직 시작하지 않았습니다. 「내 진단」에서 첫 과목을 열면 시작됩니다.";
  if (p.phase === "응시중") return `${p.total - p.submitted}과목이 남았습니다.`;
  if (p.phase === "제출완료")
    return p.surveys === 0
      ? "과목을 모두 냈습니다. 설문을 채우거나 그대로 최종 제출할 수 있습니다."
      : "과목을 모두 냈습니다. 최종 제출하면 결과 분석이 시작됩니다.";
  return "최종 제출을 마쳤습니다. 결과는 「진단 결과」에서 봅니다.";
}

export default function StudentHome() {
  const self = useSelf();
  /* 과목 상태가 바뀌면 다시 센다. 값 자체는 progressOf가 스토어에서 직접 읽는다 */
  useExamVersion();
  const rows = useRegistrations(self.id);
  /* 지금 보고 있는 진단 — 아이가 마지막으로 연 진단, 없으면 가장 최근에 접수한 진단.
     아래 「내 진행」도 같은 진단의 기록을 읽는다(useExamRecord · progressOf) */
  const at = self.hydrated ? currentRegOf(self.id) : null;
  const latest =
    (at && rows.find((r) => r.round === at.round && r.track === at.track)) || rows[0];

  const progress = self.student ? progressOf(self.student) : null;
  const tone = progress ? phaseTone[progress.phase] : null;

  /* 접수한 진단이 있으면 그 진단으로 바로 들어간다 — 최종 제출을 마쳤으면 결과지, 아니면
     과목을 응시하는 판. 없으면 접수하러 보낸다 */
  const ref = latest ? { round: latest.round, track: latest.track } : null;
  const finished = progress?.phase === "최종제출";
  const goHref = !ref ? "/exam/apply" : finished ? resultPath(ref) : examPath(ref);
  const goLabel = !ref ? "진단 접수하기" : finished ? "결과 보기" : "진단 보기";

  return (
    <>
      <WhoNote self={self} />

      <Head
        title={`${self.name}님, 안녕하세요`}
        right={
          latest ? (
            <Link href="/exam/apply" className={btnQuiet}>
              진단 접수하기
            </Link>
          ) : undefined
        }
      />

      {/* ── 지금 할 일 ── */}
      <section className={`mt-7 p-6 sm:p-7 ${cardBox}`}>
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="min-w-[15rem] flex-1">
            <p className="text-[12.5px] font-semibold text-soft-muted">지금 할 일</p>
            <p className="mt-2 text-[17px] font-bold leading-[1.6] text-soft-ink sm:text-[18px]">
              {!self.hydrated
                ? "확인 중입니다…"
                : !latest
                  ? "아직 접수한 진단이 없습니다"
                  : progress
                    ? todoLine(progress)
                    : "「내 진단」에서 이어서 응시하세요."}
            </p>
            {self.hydrated && latest && (
              <p className="mt-2 text-[13px] text-soft-muted">{latest.title}</p>
            )}
            {self.hydrated && !latest && (
              <p className="mt-2 text-[13px] leading-[1.75] text-soft-muted">
                진단 접수에서 분기와 학년을 고르면 여기에 내 진단이 뜹니다. 무료 진단은
                20문항을 한 번에 바로 응시할 수 있습니다.
              </p>
            )}
          </div>
          <Link href={goHref} className={btnGo}>
            {goLabel} →
          </Link>
        </div>
      </section>

      {/* ── 내 진행 ── */}
      <section className="mt-8">
        <div className="mb-3 flex items-end justify-between gap-3">
          <h2 className="text-[17px] font-bold tracking-tight text-soft-ink">내 진행 상황</h2>
          {tone && (
            <span className={`inline-flex items-center gap-1.5 text-[13px] font-semibold ${tone.text}`}>
              <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
              {progress?.phase}
            </span>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(progress?.subjects ?? []).map((sub) => (
            <div key={sub.id} className={`${cardBox} p-5`}>
              <p className="text-[13px] font-semibold text-soft-muted">{sub.short}</p>
              <p className={`mt-1.5 text-[19px] font-bold ${subjectTone[sub.state]}`}>{sub.state}</p>
            </div>
          ))}

          {/* 설문 칸 — 과목과 나란히 둔다. 아이가 자기 설문을 냈는지 여기서 알게 된다 */}
          <Link href="/student/surveys" className={`${cardBox} p-5 transition-colors hover:border-soft-primary`}>
            <p className="text-[13px] font-semibold text-soft-muted">설문</p>
            <p className="mt-1.5 text-[19px] font-bold text-soft-ink tabular-nums">
              {self.hydrated ? `${progress?.surveys ?? 0}/3` : "—"}
              <span className="ml-1.5 align-[2px] text-[12px] font-semibold text-soft-primary">
                보기
              </span>
            </p>
          </Link>
        </div>

        {!self.student && self.hydrated && (
          <p className={`${cardBox} mt-3 p-6 text-center text-[13px] leading-[1.8] text-soft-muted`}>
            명부에 아직 이름이 없어 진행 상황을 확인할 수 없습니다. 접속코드로 들어오면 과목별 상태가
            여기에 뜹니다.
          </p>
        )}
      </section>

      {/* 결제·면담이 레일에 없는 아이에게 그 까닭을 한 줄로 적는다 — 없는 것을 찾다가
          문의로 오는 일이 여기서 끊긴다 */}
      {self.hydrated && self.student && !self.teen && (
        <p className="mt-6 text-[13px] leading-[1.8] text-soft-muted">
          응시권 결제와 면담 신청은 보호자 화면에 있습니다. 만 14세 미만은 돈이 드는 일을 직접
          하지 않도록 법이 정해 두었기 때문입니다. 볼 진단이 아직 없으면 보호자에게 말해 주세요.
        </p>
      )}
    </>
  );
}
