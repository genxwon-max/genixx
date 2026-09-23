"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ageFromBirth } from "@/lib/account";
import { assessment, subjects } from "@/lib/exam";
import {
  allSubmitted,
  finalize,
  missingSurveys,
  surveyKeys,
  surveyMeta,
  useExamRecord,
  useHydrated,
} from "@/lib/examStore";
import { progressOf, phaseTone, subjectTone } from "@/lib/progress";
import { ensureReport } from "@/lib/reportStore";
import { formatCode, reissueCode, useRoster } from "@/lib/roster";
import { ticketsLeft, useWallet } from "@/lib/ticketStore";
import { ArrowRight } from "@/components/Icons";
import { Button } from "@/components/ui/button";
import { CopyCode } from "./ChildList";
import ConfirmDialog from "./ConfirmDialog";
import { AccHead, btnPrimary, card, DefTable } from "./ui";

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
 */
export default function ChildDetail({ id }: { id: string }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const roster = useRoster();
  const record = useExamRecord(id);
  const wallet = useWallet(id);
  const [ask, setAsk] = useState<"reissue" | "final" | null>(null);

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
  const progress = progressOf(student);
  const tone = phaseTone[progress.phase];
  const left = ticketsLeft(wallet);
  const surveysDone = surveyKeys.filter((k) => record.surveys[k] === "done").length;
  const missing = missingSurveys(record);
  // 세 과목 모두 제출 + 문항별 해석까지 끝나야 최종 제출할 수 있다 (응시 현황 화면과 같은 기준)
  const examDone =
    allSubmitted(record) && subjects.every((s) => record.subjects[s.id].reflectionAt !== null);

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
    { k: "거주 지역", v: p?.region },
    { k: "관심 분야", v: listed(p?.interests) },
    { k: "학교 유형", v: p?.schoolType },
    { k: "가정에서 쓰는 언어", v: p?.language },
    { k: "집에서 쓰는 기기", v: listed(p?.devices) },
    { k: "하루 기기 이용 시간", v: p?.screenTime },
    { k: "학습 경험", v: listed(p?.learning) ?? p?.learningNote },
    { k: "보호자가 관찰한 특성", v: p?.observation },
  ].flatMap((r) => (r.v ? [{ k: r.k, v: r.v }] : []));

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <AccHead
            id="ACC-03-1"
            title={`${student.name} 학생`}
            back={{ href: "/my/children", label: "학생 목록으로" }}
          />
        </div>
        <div className="mt-8 flex shrink-0 flex-wrap items-center gap-2.5">
          <span className={`inline-flex items-center gap-1.5 text-[13px] font-semibold ${tone.text}`}>
            <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
            {progress.phase}
          </span>
        </div>
      </div>

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
              onClick={() => setAsk("reissue")}
              className="rounded-full text-[13px] font-semibold"
            >
              코드 재발급
            </Button>
          </div>
        </div>
      </section>

      {/* 응시권 — 없으면 접수 자체가 안 된다 */}
      <section className={`${card} mt-4 flex flex-wrap items-center justify-between gap-4 p-6`}>
        <div>
          <p className="text-[13px] font-semibold text-soft-muted">응시권</p>
          <p className="mt-1.5 text-[15px] text-soft-ink">
            남은 <b className="tabular-nums">{left}</b>매 · 지금까지 {wallet.used.length}회 접수
          </p>
          <p className="mt-1 text-[13px] text-soft-muted">
            평가 한 벌(회차 × 학년)에 한 매를 씁니다. 과목마다 드는 것이 아닙니다.
          </p>
        </div>
        <Link
          href={`/my/payments?students=${student.id}`}
          className="rounded-full bg-soft-primary px-6 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-soft-primary-dark"
        >
          응시권 결제
        </Link>
      </section>

      {/* 진행 상황 */}
      <section className={`${card} mt-4 p-6`}>
        <p className="text-[15px] font-black text-soft-ink">진행 상황</p>
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-[14px]">
          {progress.subjects.map((s) => (
            <span key={s.id}>
              <span className="text-soft-muted">{s.short}</span>{" "}
              <span className={`font-semibold ${subjectTone[s.state]}`}>{s.state}</span>
            </span>
          ))}
          <span>
            <span className="text-soft-muted">설문</span>{" "}
            <span
              className={`font-semibold ${
                surveysDone === surveyKeys.length ? "text-emerald-600" : "text-slate-400"
              }`}
            >
              {surveysDone}/{surveyKeys.length}
            </span>
          </span>
        </div>
        <p className="mt-3 text-[13px] leading-relaxed text-soft-muted">{progress.nextAction}</p>

        <div className="mt-5 flex flex-wrap gap-2.5">
          {record.finalized ? (
            <Button
              nativeButton={false}
              render={<Link href={`/exam/result?student=${student.id}`} />}
              className="rounded-full text-[13px] font-semibold"
            >
              결과 보기
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          ) : (
            /* 세 과목의 답안과 해석이 모두 끝나야 열린다. 왜 안 열리는지는 바로 위의
               과목 줄이 이미 말해 주므로 따로 덧붙이지 않는다. 못 누르는 동안은 채움을
               걷는다 — 파란 면을 반투명으로만 낮추면 「지금 누를 수 있는데 흐린 것」으로
               읽힌다. */
            <Button
              variant={examDone ? "default" : "outline"}
              onClick={() => setAsk("final")}
              disabled={!examDone}
              className="rounded-full text-[13px] font-semibold"
            >
              제출 완료
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          )}
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

      {ask === "reissue" && (
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

      {ask === "final" && (
        <ConfirmDialog
          title="결과를 받기 위해 최종 제출할까요?"
          body={
            <>
              세 과목의 답안과 해석이 모두 제출되었습니다. 최종 제출하면 결과 분석이 시작되고,
              <b className="text-soft-ink"> 이후에는 답안을 고칠 수 없습니다.</b>
              {missing.length > 0 && (
                <>
                  <br />
                  <br />
                  아직 받지 않은 설문이 있습니다 —{" "}
                  <b className="text-soft-ink">
                    {missing.map((k) => surveyMeta[k].label).join(" · ")}
                  </b>
                  . 이대로 제출해도 되지만, 설문이 있으면 해석이 더 촘촘해집니다.
                </>
              )}
            </>
          }
          onCancel={() => setAsk(null)}
          onConfirm={() => {
            finalize(student.id);
            ensureReport(student.id, student.name, student.grade ?? "", assessment.round, record);
            setAsk(null);
            router.push(`/exam/result?student=${student.id}`);
          }}
        />
      )}
    </>
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
