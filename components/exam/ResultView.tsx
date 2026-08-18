"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { assessment, subjects } from "@/lib/exam";
import { surveyKeys, surveyMeta, useExamRecord, useHydrated } from "@/lib/examStore";
import { useSession } from "@/lib/authStore";
import { findById, formatCode, useRoster } from "@/lib/roster";
import { confidenceOf, decideType, scoreAxes, scoreSubject } from "@/lib/result";
import { blockText, useReportOf } from "@/lib/reportStore";
import OctagonChart from "./OctagonChart";
import SectionTitle from "./SectionTitle";
import { ArrowRight } from "@/components/Icons";
import { btnGhost, btnPrimary, eyebrow, govTable, panel, td, tdStrong, th } from "./ui";

const CHART_ID = "genixx-octagon";

function downloadPng(studentName: string) {
  const svg = document.getElementById(CHART_ID);
  if (!(svg instanceof SVGSVGElement)) return;

  const source = new XMLSerializer().serializeToString(svg);
  const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const img = new Image();
  img.onload = () => {
    const scale = 2;
    const canvas = document.createElement("canvas");
    canvas.width = 420 * scale;
    canvas.height = 420 * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);

    canvas.toBlob((out) => {
      if (!out) return;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(out);
      a.download = `TalentMe_결과_${studentName}.png`;
      a.click();
      URL.revokeObjectURL(a.href);
    }, "image/png");
  };
  img.src = url;
}

export default function ResultView() {
  const hydrated = useHydrated();
  const session = useSession();
  const params = useSearchParams();
  const roster = useRoster();

  /**
   * 볼 대상을 정한다.
   *
   * 학생 세션이면 자기 것이다. 학부모·기관은 아이가 여럿이라 세션만으로는 누구의
   * 결과인지 알 수 없어서 ?student= 로 지정받는다. 다만 넘어온 값을 그대로 믿지
   * 않고 내 명부에 있는 아이인지 확인한 뒤에 연다 — 주소창의 id를 고쳐 아무 결과나
   * 열 수 있으면 안 된다. (실제 서비스에서는 이 확인이 서버에서 한 번 더 이뤄져야 한다.)
   */
  const asked = params.get("student");
  const mine = asked ? roster.find((s) => s.id === asked) : null;
  const studentId = mine?.id ?? session?.studentId ?? "demo";
  const record = useExamRecord(studentId);
  const report = useReportOf(studentId);
  const student = hydrated ? findById(studentId) : null;
  const name = student?.name ?? session?.name ?? "응시자";

  if (!hydrated) {
    return (
      <div className="container-x py-20 text-center text-[13px] text-soft-muted">
        결과를 불러오는 중입니다…
      </div>
    );
  }

  if (!record.finalized) {
    return (
      <div className="container-x py-16">
        <div className={`mx-auto max-w-lg p-8 text-center ${panel}`}>
          <p className={eyebrow}>결과 미발행</p>
          <h1 className="mt-3 text-[20px] font-bold text-soft-ink">아직 최종 제출 전입니다</h1>
          <p className="mt-3 text-[13px] leading-relaxed text-soft-muted">
            세 과목을 모두 제출한 뒤 응시 현황 화면에서 &lsquo;제출 완료&rsquo;를 눌러야 결과가
            산출됩니다.
          </p>
          <Link href="/exam" className={`mt-7 ${btnPrimary}`}>
            응시 현황으로
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  /**
   * 발행 전에는 결과를 보여 주지 않는다.
   *
   * 이 서비스가 파는 것은 「사람이 확정한 판정」이다. 조립된 해석을 그대로 흘려
   * 보내면 그 약속이 거짓이 되므로, 담당자가 리포트 승인(EXP-08)에서 발행을 누른
   * 뒤에만 이 화면이 열린다.
   */
  if (!report || report.state !== "published") {
    return (
      <div className="container-x py-16">
        <div className={`mx-auto max-w-lg p-8 text-center ${panel}`}>
          <p className={eyebrow}>확인 중</p>
          <h1 className="mt-3 text-[20px] font-bold text-soft-ink">
            전문가가 결과를 확인하고 있습니다
          </h1>
          <p className="mt-3 text-[13px] leading-relaxed text-soft-muted">
            제출한 답안으로 해석이 조립되었고, 지금은 교육전문가가 그 해석을 한 줄씩 보고 있습니다.
            확인이 끝나면 이 화면에서 바로 열립니다.
          </p>
          <p className="mt-3 text-[13px] leading-relaxed text-soft-muted">
            AI가 만든 해석을 그대로 내보내지 않습니다. 사람이 확인하고 확정한 것만 보여 드립니다.
          </p>
          {report?.state === "hold" && (
            <p className="mt-4 rounded border border-soft-line bg-slate-50 px-4 py-3 text-[12.5px] leading-relaxed text-soft-muted">
              이 리포트는 담당자가 한 번 더 보기로 하여 시간이 조금 더 걸립니다. 확인이 끝나면
              알려 드립니다.
            </p>
          )}
          <Link href="/my" className={`mt-7 ${btnPrimary}`}>
            내 아이 현황으로
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  const scores = scoreAxes(record);
  const type = decideType(scores);
  const confidence = confidenceOf(record);
  const measured = scores.filter((s) => s.measured);
  const doneSurveys = surveyKeys.filter((k) => record.surveys[k] === "done");

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-soft-line pb-5">
        <div>
          <p className={eyebrow}>RPT-01 · 결과 리포트</p>
          <h1 className="mt-2.5 text-[24px] font-bold tracking-tight text-soft-ink md:text-[28px]">
            {name} 학생 진단 결과
          </h1>
          <p className="mt-2 text-[12px] text-soft-muted">
            {assessment.name} {assessment.round} · 접속코드{" "}
            {student ? formatCode(student.code) : "-"} · 발행{" "}
            {record.finalizedAt ? new Date(record.finalizedAt).toLocaleDateString("ko-KR") : "-"}
          </p>
        </div>
        <div className="no-print flex gap-2">
          <button type="button" onClick={() => window.print()} className={btnGhost}>
            PDF로 저장
          </button>
          <button type="button" onClick={() => downloadPng(name)} className={btnGhost}>
            이미지 저장
          </button>
        </div>
      </div>

      {/* 유형 */}
      {type && (
        <section className="mt-7">
          <div className={`grid gap-6 p-7 md:grid-cols-[300px_1fr] md:p-9 ${panel}`}>
            <div className="border-b border-soft-line pb-6 md:border-b-0 md:border-r md:pb-0 md:pr-8">
              <p className={eyebrow}>재능 유형</p>
              <p className="mt-3 text-[40px] font-bold leading-none tracking-tight text-soft-primary-dark">
                {type.code}
              </p>
              <p className="mt-3 text-[22px] font-bold text-soft-ink">{type.name}</p>
              <p className="mt-1.5 text-[13px] text-soft-muted">{type.tagline}</p>
              <p className="mt-4 inline-flex items-center gap-2 rounded border border-soft-line bg-slate-50 px-3 py-1.5 text-[12px]">
                리포트 신뢰도
                <b className="text-soft-ink">{confidence.label}</b>
              </p>
              <p className="mt-1.5 text-[11px] leading-relaxed text-soft-muted">
                {confidence.desc}
              </p>
            </div>
            <div>
              <p className="text-[15px] leading-[1.9] text-soft-ink">{type.summary}</p>
              <p className="mt-4 rounded border border-amber-300 bg-amber-50 px-4 py-3 text-[12px] leading-relaxed text-amber-800">
                이 유형 표기는 아이를 규정하는 이름이 아니라, <b>이번 회차에 관찰된 행동의 요약</b>
                입니다. 회차가 바뀌면 유형도 바뀔 수 있습니다.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* 팔각형 */}
      <section className="mt-8">
        <SectionTitle note="2026 파일럿은 8축 가운데 3축을 측정합니다. 나머지 5축은 2027 심화진단에서 측정 예정이며, 빈 축은 '없음'이 아니라 '아직 측정하지 않음'입니다.">
          8재능 프로파일
        </SectionTitle>

        <div className={`grid gap-6 p-6 lg:grid-cols-[420px_1fr] lg:p-8 ${panel}`}>
          <div className="mx-auto w-full max-w-[440px]">
            <OctagonChart scores={scores} id={CHART_ID} />
          </div>

          <div className="overflow-x-auto">
            <table className={govTable}>
              <colgroup>
                <col className="w-[120px]" />
                <col className="w-[90px]" />
                <col />
              </colgroup>
              <thead>
                <tr>
                  <th className={th}>재능 축</th>
                  <th className={th}>점수</th>
                  <th className={th}>설명</th>
                </tr>
              </thead>
              <tbody>
                {scores.map((s) => (
                  <tr key={s.axis.id}>
                    <td className={`${tdStrong} text-left`}>{s.axis.label}</td>
                    <td className={`${td} tabular-nums`}>
                      {s.measured ? (
                        <b className="text-soft-ink">{s.score}</b>
                      ) : (
                        <span className="text-soft-muted">미측정</span>
                      )}
                    </td>
                    <td className={`${td} text-left`}>
                      {s.measured ? s.axis.desc : `${s.axis.desc} · 2027 심화진단에서 측정`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 과목별 채점 */}
      <section className="mt-8">
        <SectionTitle note="객관식 정답률 70% + 서술형 30%로 환산했습니다. 서술형은 전문가 채점으로 확정됩니다.">
          과목별 응시 결과
        </SectionTitle>
        <div className="overflow-x-auto">
          <table className={govTable}>
            <thead>
              <tr>
                <th className={th}>과목</th>
                <th className={th}>객관식 정답</th>
                <th className={th}>서술형</th>
                <th className={th}>환산 점수</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((s) => {
                const r = scoreSubject(record, s.id);
                const submitted = record.subjects[s.id].status === "submitted";
                return (
                  <tr key={s.id}>
                    <td className={`${tdStrong} text-left`}>{s.name}</td>
                    <td className={`${td} tabular-nums`}>
                      {submitted ? `${r.correct} / ${r.total}` : "-"}
                    </td>
                    <td className={td}>{submitted ? "제출 (전문가 검토 예정)" : "-"}</td>
                    <td className={`${td} tabular-nums`}>
                      {submitted ? <b className="text-soft-ink">{r.score}</b> : "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* 성장 방향 */}
      {type && type.directions.length > 0 && (
        <section className="mt-8">
          <SectionTitle note="지금 강하게 나타난 축을 더 키우는 방향으로 제안합니다.">
            앞으로의 방향
          </SectionTitle>
          <ol className="grid gap-3 sm:grid-cols-2">
            {type.directions.map((d, i) => (
              <li key={d.t} className={`flex gap-4 p-5 ${panel}`}>
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-soft-primary bg-soft-primary text-[12px] font-bold text-white">
                  {i + 1}
                </span>
                <div>
                  <p className="text-[15px] font-bold text-soft-ink">{d.t}</p>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-soft-muted">{d.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* 전문가 평가 */}
      <section className="mt-8">
        <SectionTitle
          note="AI 1차 분석 결과를 교육전문가가 검토해 확정한 코멘트입니다."
          right={
            <span className="rounded border border-soft-line bg-slate-50 px-3 py-1.5 text-[12px] text-soft-muted">
              반영 정보원 {1 + doneSurveys.length}종
            </span>
          }
        >
          전문가 평가
        </SectionTitle>

        {/* 승인 화면(EXP-08)에서 확정된 문구를 그대로 싣는다. 담당자가 고친 문장이
            있으면 고친 쪽이 나간다 — 승인 화면에서 고쳤는데 여기 옛 문장이 남으면
            「사람이 확정한 판정」이라는 말이 무색해진다. */}
        <div className="grid gap-3 md:grid-cols-2">
          {report.blocks.map((blk) => (
            <div key={blk.id} className={`p-5 ${panel}`}>
              <p className="text-[14px] font-bold text-soft-ink">{blk.title}</p>
              <p className="mt-2 text-[13px] leading-relaxed text-soft-muted">{blockText(blk)}</p>
            </div>
          ))}
        </div>

        <div className={`mt-3 flex flex-wrap items-center justify-between gap-3 p-5 ${panel}`}>
          <p className="text-[12px] leading-relaxed text-soft-muted">
            참여 설문:{" "}
            {doneSurveys.length === 0
              ? "없음 (학생 응답만 반영)"
              : doneSurveys.map((k) => surveyMeta[k].who).join(" · ")}
            {" · "}측정 축 {measured.length} / {scores.length}
          </p>
          <span className="text-[12px] font-bold text-soft-ink">
            판정 확정 · {report.publishedBy ?? "GENIXX 평가운영팀"} · {report.publishedAt ?? ""}
          </span>
        </div>
      </section>

      <div className="no-print mt-9 flex flex-wrap items-center justify-between gap-3 border-t border-soft-line pt-6">
        <p className="text-[12px] leading-relaxed text-soft-muted">
          결과지는 브라우저 인쇄 기능으로 PDF 저장할 수 있고, 팔각형 차트는 이미지로 내려받을 수
          있습니다.
        </p>
        <div className="flex gap-2">
          <Link href="/exam" className={btnGhost}>
            응시 현황으로
          </Link>
          <button type="button" onClick={() => window.print()} className={btnPrimary}>
            결과지 다운로드 (PDF)
          </button>
        </div>
      </div>
    </div>
  );
}
