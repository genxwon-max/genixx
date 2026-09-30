"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ageFromBirth } from "@/lib/account";
import { assessment } from "@/lib/exam";
import { dotDate, evalName } from "@/lib/examCatalog";
import {
  allSubmitted,
  finalize,
  getRecord,
  missingSurveys,
  regId,
  surveyKeys,
  surveyMeta,
  useExamVersion,
  useHydrated,
  type RegRef,
} from "@/lib/examStore";
import { progressOf, phaseTone, subjectTone } from "@/lib/progress";
import { ensureReport, reportFor, useReports } from "@/lib/reportStore";
import { useExamConfig } from "@/lib/roundStore";
import { formatCode, reissueCode, useRoster } from "@/lib/roster";
import { ticketsLeft, useWallet, type UseTier } from "@/lib/ticketStore";
import { useRegistrations } from "@/components/exam/Registrations";
import { ArrowRight } from "@/components/Icons";
import { Button } from "@/components/ui/button";
import { CopyCode } from "./ChildList";
import ConfirmDialog from "./ConfirmDialog";
import { AccHead, btnPrimary, card, DefTable, listTd, listTh } from "./ui";

/** 진단 진행 상황 표의 한 줄 — 접수한 평가 하나 */
type ExamRow = {
  key: string;
  /** 접수 기록 없이 남은 응시 기록이면 null */
  reg: RegRef | null;
  /** 「2026 3분기 초4 평가」 */
  name: string;
  tier: UseTier | null;
  /** 접수 시각 (ISO) */
  at: string | null;
  opensOn: string | null;
  closesOn: string | null;
  /** 응시 기간이 끝난 평가 */
  ended: boolean;
};

/**
 * ACC-03-1 학생 상세 — 목록에서 이름을 눌러 들어오는 자리.
 *
 * 목록은 여러 명을 견주는 표라, 한 명에 대해 알아야 할 것을 다 담을 수 없다. 등록할 때
 * 받아 둔 값(학교·보호자 연락처·관심 분야·가정 언어 …)은 결과를 읽을 때 쓰이는데,
 * 그것을 어디서도 다시 볼 수 없으면 「내가 무엇을 적었더라」가 된다. 여기서 편다.
 *
 * 되돌릴 수 없는 일도 여기로 내렸다 — **접속코드 재발급**과 **최종 제출**. 목록에서
 * 옆줄과 한 칸 차이로 붙어 있으면 잘못 누르고, 잘못 누르면 아이에게 이미 알려 준
 * 코드가 그 자리에서 죽는다. 한 사람을 열어 놓고 그 사람에 대해서만 누르게 한다.
 *
 * ── 평가는 여럿이다 ──
 * 한 아이가 지난해 평가를 마쳤고, 올해 두 평가를 함께 보고 있을 수 있다. 과목 칸 한 줄만
 * 세우면 그것이 어느 평가의 것인지 알 수 없다. 진행 상황은 **평가마다 한 줄**인 표로
 * 세운다 — 줄마다 평가 이름(해 · 분기 · 학년)과 응시 기간, 그 평가의 과목 · 설문 · 단계 ·
 * 결과가 선다. 최종 제출과 결과 보기도 줄마다 그 평가에 대해 누른다.
 */
export default function ChildDetail({ id }: { id: string }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const roster = useRoster();
  const wallet = useWallet(id);
  const regs = useRegistrations(id);
  const reports = useReports();
  const config = useExamConfig();
  /* 줄마다 getRecord · progressOf로 읽는다 — 기록이 바뀌면 다시 그리도록 구독만 건다 */
  useExamVersion();
  const [ask, setAsk] = useState<{ kind: "reissue" } | { kind: "final"; row: ExamRow } | null>(
    null,
  );

  const student = roster.find((s) => s.id === id) ?? null;

  if (!hydrated) {
    return <p className="py-16 text-center text-[13px] text-soft-muted">확인 중입니다…</p>;
  }

  if (!student) {
    return (
      <>
        <AccHead
          id="ACC-03-1"
          title="학생을 찾을 수 없습니다"
          back={{ href: "/my/children", label: "학생 목록으로" }}
        />
        <div className={`${card} p-10 text-center`}>
          <p className="text-[14px] leading-relaxed text-soft-muted">
            지워졌거나 이 계정의 학생이 아닙니다. 목록에서 다시 골라 주세요.
          </p>
          <Link href="/my/children" className={`${btnPrimary} mt-6`}>
            학생 목록으로
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </>
    );
  }

  const age = ageFromBirth(student.birth);
  const left = ticketsLeft(wallet);

  /* 평가마다 한 줄 — 최근 시기가 위로. 같은 시기면 나중에 접수한 것이 위 */
  const rows: ExamRow[] = regs
    .map((r) => ({
      key: `${r.round}-${r.track}`,
      reg: { round: r.round, track: r.track },
      name: evalName(r.round, r.track, r.info?.label),
      tier: r.tier,
      at: r.at,
      opensOn: r.info?.opensOn ?? null,
      closesOn: r.info?.closesOn ?? null,
      ended: r.info?.availability === "ended",
    }))
    .sort(
      (a, b) =>
        (b.opensOn ?? "").localeCompare(a.opensOn ?? "") || (b.at ?? "").localeCompare(a.at ?? ""),
    );
  /* 접수 기록이 없는데 응시한 흔적만 남은 아이(시연용 씨앗 · 예전 저장분)는 지금 회차 이름으로
     한 줄을 세운다 — 흔적이 있는데 표가 비면 「기록이 없어졌다」로 읽힌다 */
  if (rows.length === 0) {
    const trace = progressOf(student);
    if (trace.phase !== "미응시" || trace.surveys > 0) {
      rows.push({
        key: "legacy",
        reg: null,
        name: config.roundLabel,
        tier: null,
        at: null,
        opensOn: null,
        closesOn: null,
        ended: false,
      });
    }
  }

  /* 줄의 기록 · 진행을 읽는다. reg가 null이면 접수 없이 남은 기록이다 */
  const regArg = (row: ExamRow) => row.reg ?? undefined;
  const resultHref = (row: ExamRow) =>
    `/exam/result?student=${student.id}${row.reg ? `&reg=${encodeURIComponent(regId(row.reg))}` : ""}`;

  const p = student.profile;
  const listed = (v?: string[]) => (v && v.length > 0 ? v.join(" · ") : null);

  /* 적지 않은 칸은 줄째로 뺀다 — 「—」만 늘어선 표는 읽을 것이 없다 */
  const basics = [
    { k: "이름", v: student.name },
    {
      k: "생년월일",
      v: `${birthText(student.birth)} (만 ${age ?? "—"}세)`,
    },
    { k: "학교", v: student.school },
    { k: "학년", v: student.grade },
    { k: "반", v: student.klass },
    { k: "아이 휴대전화", v: student.phone ? phoneText(student.phone) : "없음" },
    { k: "보호자 성명", v: student.guardianName },
    { k: "보호자 연락처", v: student.guardianPhone && phoneText(student.guardianPhone) },
    { k: "등록일", v: new Date(student.createdAt).toLocaleDateString("ko-KR") },
    { k: "등록한 사람", v: student.ownerName },
  ].flatMap((r) => (r.v ? [{ k: r.k, v: r.v }] : []));

  const extras = [
    { k: "성별", v: p?.gender },
    /* 주소를 적은 집은 주소로 보여 준다. 시·도 칸(region)은 지역별로 셀 때 쓰는 값이라
       주소와 나란히 세우면 같은 것을 두 번 읽는다. 예전 저장분에는 주소 없이 권역만
       있으므로 그때는 그 값을 「거주 지역」으로 세운다 */
    {
      k: "거주지 주소",
      v: p?.address ? [p.zonecode && `(${p.zonecode})`, p.address, p.addressDetail].filter(Boolean).join(" ") : undefined,
    },
    { k: "거주 지역", v: p?.address ? undefined : p?.region },
    { k: "관심 분야", v: listed(p?.interests) },
    { k: "학교 유형", v: p?.schoolType },
    { k: "가정에서 쓰는 언어", v: p?.language },
    { k: "집에서 쓰는 기기", v: listed(p?.devices) },
    { k: "하루 기기 이용 시간", v: p?.screenTime },
    { k: "학습 경험", v: listed(p?.learning) ?? p?.learningNote },
    { k: "보호자가 관찰한 특성", v: p?.observation },
  ].flatMap((r) => (r.v ? [{ k: r.k, v: r.v }] : []));

  const finalRow = ask?.kind === "final" ? ask.row : null;
  const finalMissing = finalRow ? missingSurveys(getRecord(student.id, regArg(finalRow))) : [];

  return (
    <>
      <AccHead
        id="ACC-03-1"
        title={`${student.name} 학생`}
        back={{ href: "/my/children", label: "학생 목록으로" }}
      />

      {/* 접속코드 — 상세에 들어온 가장 잦은 까닭이 이것이라 맨 위에 둔다 */}
      <section className={`${card} p-6`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[13px] font-semibold text-soft-muted">접속코드</p>
            <p className="mt-1.5 text-[26px] font-black tracking-[0.08em] tabular-nums text-soft-ink">
              {formatCode(student.code)}
            </p>
            <p className="mt-1 text-[13px] text-soft-muted">
              이 코드와 생년월일({birthText(student.birth)})로 아이가 응시 화면에 들어갑니다.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <CopyCode code={student.code} />
            <Button
              variant="outline"
              onClick={() => setAsk({ kind: "reissue" })}
              className="rounded-full text-[13px] font-semibold"
            >
              코드 재발급
            </Button>
          </div>
        </div>
      </section>

      {/* 응시권 — 없으면 접수 자체가 안 된다. 결제 단추는 두지 않는다 — 결제는 결제
          메뉴(/my/payments)에서 학생을 골라 하는 한 길로 모았다 */}
      <section className={`${card} mt-4 p-6`}>
        <p className="text-[13px] font-semibold text-soft-muted">응시권</p>
        <p className="mt-1.5 text-[15px] text-soft-ink">
          남은 <b className="tabular-nums">{left}</b>매 · 지금까지 {wallet.used.length}회 접수
        </p>
        <p className="mt-1 text-[13px] text-soft-muted">
          진단 한 벌(회차 × 학년)에 한 매를 씁니다. 과목마다 드는 것이 아닙니다.
        </p>
      </section>

      {/* 진단 진행 상황 — 평가마다 한 줄 */}
      <section className={`${card} mt-4 overflow-hidden`}>
        <div className="flex flex-wrap items-baseline justify-between gap-2 px-6 pt-6">
          <p className="text-[15px] font-black text-soft-ink">진단 진행 상황</p>
          <p className="text-[13px] text-soft-muted">
            {rows.length > 0 ? `진단 ${rows.length}건 · 최근 시기가 위` : "진단마다 한 줄씩 섭니다"}
          </p>
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[780px] border-collapse">
            <caption className="sr-only">접수한 진단과 진단별 진행 상황</caption>
            <colgroup>
              <col className="w-[24%]" />
              <col className="w-[15%]" />
              <col className="w-[8%]" />
              <col className="w-[8%]" />
              <col className="w-[8%]" />
              <col className="w-[8%]" />
              <col className="w-[12%]" />
              <col className="w-[17%]" />
            </colgroup>
            <thead>
              <tr>
                <th className={`${listTh} pl-6 text-left`}>진단</th>
                <th className={listTh}>응시 기간</th>
                <th className={listTh}>국어</th>
                <th className={listTh}>수학</th>
                <th className={listTh}>과학</th>
                <th className={listTh}>설문</th>
                <th className={listTh}>상태</th>
                <th className={`${listTh} pr-6`}>결과</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className={`${listTd} py-12`}>
                    <p className="text-[14px] font-bold text-soft-ink">아직 접수한 진단이 없습니다</p>
                    <p className="mt-1.5 text-[13px] text-soft-muted">
                      진단을 접수하면 진단마다 한 줄씩 이름(연도 · 분기 · 학년)과 과목별 진행이
                      섭니다.
                    </p>
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const record = getRecord(student.id, regArg(row));
                  const prog = progressOf(student, regArg(row));
                  const tone = phaseTone[prog.phase];
                  const published =
                    record.finalized &&
                    reportFor(reports, student.id, row.reg)?.state === "published";
                  return (
                    <tr key={row.key}>
                      <td className={`${listTd} pl-6 text-left`}>
                        <span className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[14px] font-bold text-soft-ink">{row.name}</span>
                          {row.tier && <TierChip tier={row.tier} />}
                        </span>
                        {row.at && (
                          <span className="mt-0.5 block text-[12px] tabular-nums">
                            접수 {dayText(row.at)}
                          </span>
                        )}
                      </td>

                      <td className={`${listTd} tabular-nums`}>
                        {row.opensOn && row.closesOn ? (
                          <>
                            <span className="block">{dotDate(row.opensOn)}</span>
                            <span className="block">~ {dotDate(row.closesOn)}</span>
                          </>
                        ) : (
                          "—"
                        )}
                        {row.ended && <span className="mt-0.5 block text-[12px] text-slate-400">마감</span>}
                      </td>

                      {prog.subjects.map((s) => (
                        <td key={s.id} className={`${listTd} font-semibold ${subjectTone[s.state]}`}>
                          {s.state}
                        </td>
                      ))}

                      <td
                        className={`${listTd} tabular-nums ${
                          prog.surveys === surveyKeys.length ? "font-semibold text-emerald-600" : ""
                        }`}
                      >
                        {prog.surveys}/{surveyKeys.length}
                      </td>

                      <td className={listTd}>
                        <span className={`inline-flex items-center gap-1.5 font-semibold ${tone.text}`}>
                          <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
                          {prog.phase}
                        </span>
                      </td>

                      {/* 결과 칸은 넷으로 갈린다 — 발행되면 결과 보기, 사람이 확인 중이면 그 말,
                          세 과목을 다 냈는데 최종 제출 전이면 그 평가를 제출하는 단추, 그 밖은 비운다 */}
                      <td className={`${listTd} pr-6`}>
                        {published ? (
                          <Link
                            href={resultHref(row)}
                            className="font-semibold text-soft-primary hover:underline"
                          >
                            결과 보기
                          </Link>
                        ) : record.finalized ? (
                          "전문가 확인 중"
                        ) : allSubmitted(record) ? (
                          <button
                            type="button"
                            onClick={() => setAsk({ kind: "final", row })}
                            className="inline-flex items-center rounded-full bg-soft-primary px-3.5 py-1.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-soft-primary-dark"
                          >
                            제출 완료
                          </button>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
          <p className="text-[12.5px] text-soft-muted">
            진단마다 과목 · 설문 · 결과가 따로 쌓입니다. 두 진단을 함께 보고 있으면 두 줄이 함께
            진행됩니다.
          </p>
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={`/my/surveys/${student.id}`} />}
            className="rounded-full text-[13px] font-semibold"
          >
            설문 관리
          </Button>
        </div>
      </section>

      {/* 등록할 때 받아 둔 값 */}
      <section className={`${card} mt-4 overflow-hidden`}>
        <p className="px-6 pt-6 text-[15px] font-black text-soft-ink">학생 정보</p>
        <div className="mt-3">
          <DefTable rows={basics} />
        </div>
      </section>

      {extras.length > 0 && (
        <section className={`${card} mt-4 overflow-hidden`}>
          <p className="px-6 pt-6 text-[15px] font-black text-soft-ink">결과를 읽을 때 쓰는 값</p>
          <p className="mt-1.5 px-6 text-[13px] leading-relaxed text-soft-muted">
            등록할 때 적어 주신 선택 항목입니다. 점수를 매기는 데는 쓰지 않고, 결과를 해석할
            때만 씁니다.
          </p>
          <div className="mt-3">
            <DefTable rows={extras} />
          </div>
        </section>
      )}

      {ask?.kind === "reissue" && (
        <ConfirmDialog
          title="접속코드를 다시 발급할까요?"
          tone="danger"
          body={
            <>
              <b className="text-soft-ink">{student.name}</b>의 지금 코드{" "}
              <b className="tabular-nums text-soft-ink">{formatCode(student.code)}</b>
              는 바로 쓸 수 없게 됩니다. 아이에게 이미 알려 주셨다면 새 코드를 다시 전해 주셔야
              합니다.
              <br />
              지금까지의 응시 기록과 결과는 그대로 남습니다.
            </>
          }
          onCancel={() => setAsk(null)}
          onConfirm={() => {
            reissueCode(student.id);
            setAsk(null);
          }}
        />
      )}

      {/* 최종 제출은 그 평가 하나에 대해 한다 — 세 과목의 답안이 다 나오면 열린다(해석은 선택,
          평가 판과 같은 기준) */}
      {finalRow && (
        <ConfirmDialog
          title="결과를 받기 위해 최종 제출할까요?"
          body={
            <>
              <b className="text-soft-ink">{finalRow.name}</b>의 세 과목 답안이 모두
              제출되었습니다. 최종 제출하면 결과 분석이 시작되고,
              <b className="text-soft-ink"> 이후에는 답안을 고칠 수 없습니다.</b>
              {finalMissing.length > 0 && (
                <>
                  <br />
                  <br />
                  아직 받지 않은 설문이 있습니다 —{" "}
                  <b className="text-soft-ink">
                    {finalMissing.map((k) => surveyMeta[k].label).join(" · ")}
                  </b>
                  . 이대로 제출해도 되지만, 설문이 있으면 해석이 더 촘촘해집니다.
                </>
              )}
            </>
          }
          onCancel={() => setAsk(null)}
          onConfirm={() => {
            const reg = regArg(finalRow);
            const record = getRecord(student.id, reg);
            finalize(student.id, reg);
            ensureReport(
              student.id,
              student.name,
              student.grade ?? "",
              finalRow.reg ? finalRow.name : assessment.round,
              record,
              finalRow.reg,
            );
            setAsk(null);
            router.push(resultHref(finalRow));
          }}
        />
      )}
    </>
  );
}

/** 「2026-07-28T…」 → 「2026.07.28」 */
function dayText(iso: string) {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}`;
}

/** 무료 진단 · 유료 진단 — 무료로 본 아이는 문항 수가 적다. 이름 옆에 두어 까닭이 읽히게 한다 */
function TierChip({ tier }: { tier: UseTier }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
        tier === "free" ? "bg-slate-100 text-slate-500" : "bg-soft-primary-soft text-soft-primary"
      }`}
    >
      {tier === "free" ? "무료 진단" : "유료 진단"}
    </span>
  );
}

/** 「20150311」 → 「2015.03.11」 */
function birthText(b: string) {
  return b.length === 8 ? `${b.slice(0, 4)}.${b.slice(4, 6)}.${b.slice(6)}` : b;
}

/** 「01012345678」 → 「010-1234-5678」 */
function phoneText(p: string) {
  const d = p.replace(/\D/g, "");
  if (d.length === 11) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  return p;
}
