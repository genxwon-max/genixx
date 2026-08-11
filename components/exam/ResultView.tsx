"use client";

import Link from "next/link";
import { assessment, subjects } from "@/lib/exam";
import { surveyKeys, surveyMeta, useExamRecord, useHydrated } from "@/lib/examStore";
import { useSession } from "@/lib/authStore";
import { findById, formatCode } from "@/lib/roster";
import { confidenceOf, decideType, expertNotes, scoreAxes, scoreSubject } from "@/lib/result";
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
  const studentId = session?.studentId ?? "demo";
  const record = useExamRecord(studentId);
  const student = hydrated ? findById(studentId) : null;
  const name = student?.name ?? session?.name ?? "응시자";

  if (!hydrated) {
    return (
      <div className="container-x py-20 text-center text-[13px] text-exam-muted">
        결과를 불러오는 중입니다…
      </div>
    );
  }

  if (!record.finalized) {
    return (
      <div className="container-x py-16">
        <div className={`mx-auto max-w-lg p-8 text-center ${panel}`}>
          <p className={eyebrow}>결과 미발행</p>
          <h1 className="mt-3 text-[20px] font-black text-exam-text">아직 최종 제출 전입니다</h1>
          <p className="mt-3 text-[13px] leading-relaxed text-exam-muted">
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

  const scores = scoreAxes(record);
  const type = decideType(scores);
  const notes = expertNotes(scores, record);
  const confidence = confidenceOf(record);
  const measured = scores.filter((s) => s.measured);
  const doneSurveys = surveyKeys.filter((k) => record.surveys[k] === "done");

  return (
    <div className="container-x py-8 md:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-exam-text/80 pb-5">
        <div>
          <p className={eyebrow}>RPT-01 · 결과 리포트</p>
          <h1 className="mt-2.5 text-[24px] font-black tracking-tight text-exam-text md:text-[28px]">
            {name} 학생 진단 결과
          </h1>
          <p className="mt-2 text-[12px] text-exam-muted">
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
            <div className="border-b border-exam-line pb-6 md:border-b-0 md:border-r md:pb-0 md:pr-8">
              <p className={eyebrow}>재능 유형</p>
              <p className="mt-3 text-[40px] font-black leading-none tracking-tight text-brand-800">
                {type.code}
              </p>
              <p className="mt-3 text-[22px] font-black text-exam-text">{type.name}</p>
              <p className="mt-1.5 text-[13px] text-exam-muted">{type.tagline}</p>
              <p className="mt-4 inline-flex items-center gap-2 rounded border border-exam-line bg-exam-raised px-3 py-1.5 text-[12px]">
                리포트 신뢰도
                <b className="text-exam-text">{confidence.label}</b>
              </p>
              <p className="mt-1.5 text-[11px] leading-relaxed text-exam-muted">
                {confidence.desc}
              </p>
            </div>
            <div>
              <p className="text-[15px] leading-[1.9] text-exam-text">{type.summary}</p>
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
                        <b className="text-exam-text">{s.score}</b>
                      ) : (
                        <span className="text-exam-muted">미측정</span>
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
                      {submitted ? <b className="text-exam-text">{r.score}</b> : "-"}
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
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-brand-700 bg-brand-900 text-[12px] font-bold text-white">
                  {i + 1}
                </span>
                <div>
                  <p className="text-[15px] font-black text-exam-text">{d.t}</p>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-exam-muted">{d.d}</p>
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
            <span className="rounded border border-exam-line bg-exam-raised px-3 py-1.5 text-[12px] text-exam-muted">
              반영 정보원 {1 + doneSurveys.length}종
            </span>
          }
        >
          전문가 평가
        </SectionTitle>

        <div className="grid gap-3 md:grid-cols-2">
          {notes.map((n) => (
            <div key={n.title} className={`p-5 ${panel}`}>
              <p className="text-[14px] font-black text-exam-text">{n.title}</p>
              <p className="mt-2 text-[13px] leading-relaxed text-exam-muted">{n.body}</p>
            </div>
          ))}
        </div>

        <div className={`mt-3 flex flex-wrap items-center justify-between gap-3 p-5 ${panel}`}>
          <p className="text-[12px] leading-relaxed text-exam-muted">
            참여 설문:{" "}
            {doneSurveys.length === 0
              ? "없음 (학생 응답만 반영)"
              : doneSurveys.map((k) => surveyMeta[k].who).join(" · ")}
            {" · "}측정 축 {measured.length} / {scores.length}
          </p>
          <span className="text-[12px] font-bold text-exam-text">
            판정 확정 · GENIXX 평가운영팀
          </span>
        </div>
      </section>

      <div className="no-print mt-9 flex flex-wrap items-center justify-between gap-3 border-t-2 border-exam-text/80 pt-6">
        <p className="text-[12px] leading-relaxed text-exam-muted">
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
