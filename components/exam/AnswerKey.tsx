"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import {
  answerCsv,
  answerCsvHead,
  answerSubjects,
  linesOf,
  tally,
  type Line,
} from "@/lib/answerKey";
import { useMediaUrl } from "@/lib/answerMedia";
import { saveAnswerSheetPdf } from "@/lib/answerSheetPdf";
import { downloadCsv } from "@/lib/csv";
import {
  answerKind,
  answerParts,
  assessment,
  autoGraded,
  keyText,
  markLabel,
  pointText,
  shortAnswer,
  splitUpload,
  subjects,
  type AnswerPart,
  type Grades,
  type Mark,
  type SubjectId,
} from "@/lib/exam";
import { evalName } from "@/lib/examCatalog";
import type { ExamRecord } from "@/lib/examStore";
import AnswerReview, { type ReviewAt } from "./AnswerReview";
import type { Registration } from "./Registrations";
import { btnPrimary, btnSmGhost } from "./ui";

export { answerSubjects, answerTotals } from "@/lib/answerKey";
export type { ReviewAt } from "./AnswerReview";

/**
 * 정답과 해설 — 정오표.
 *
 * 학생 대시보드의 「정답과 해설」이 이 조각으로 진단 한 건의 답을 편다
 * (/student/answers/2026-3/e4 — components/student/StudentAnswers.tsx). 머리(제목)는 그
 * 화면이 세운다.
 *
 * **최종 제출을 마친 진단만** 정답을 연다. 풀기 전에 정답이 보이면 진단이 되지 않는다. 최종
 * 제출한 그날부터 열린다 — 결과 발행을 기다리지 않는다.
 *
 * 이 화면에는 **정오표만** 선다. 예전에는 표 아래에 문항별 풀이를 죽 늘어놓았다. 문제를 다시
 * 보는 일은 「답안 풀이 보기」 창이 맡는다 — 응시 화면과 같은 틀에 채점한 표시를 얹은 창이다
 * (./AnswerReview.tsx).
 *
 *   정오표      문항마다 정답 · 내 답 · 정오를 한 줄씩
 *   답안 풀이   단추나 문항 번호를 누르면 열리는 창
 *   내려받기    PDF · CSV · 인쇄 — 본 과목을 모두 담는다
 *
 * ── 정오는 다섯 가지다 ──
 *   정답 ○ · 오답 ✕  기계로 채점하는 문항(객관식 · 단답형)은 최종 제출하면 바로 난다
 *   미응답 ✕         답하지 않았다
 *   채점 중          서술형 · 논술형 · 사진 — 정답이 하나로 정해지지 않아 전문가가 채점한다
 *   부분 정답 △      전문가가 만점보다 적은 점수를 준 문항. 받은 점수를 함께 적는다
 * 전문가의 채점이 끝난 문항은 「채점 중」 대신 그 점수를 따라 정답 · 부분 정답 · 오답으로 바뀐다.
 * 채점 결과(grades)는 부르는 쪽이 넘긴다 — 운영 콘솔의 「회원 채점」이 매기는 값이다.
 *
 * ── 쓴 답은 줄이지 않는다 ──
 * 서술형 · 논술형은 쓴 글을 **모두** 적는다. 줄 수를 자르거나 칸 안에서 스크롤하게 두면
 * 아이는 자기가 쓴 글을 다 보려고 칸마다 손을 대야 한다. 사진으로 낸 답은 그 사진을, 그림
 * 칸에 그린 답은 그 그림을 표 안에 그대로 보인다.
 */

/* ───────────────────────── 정오 모양 ───────────────────────── */

const MARK: Record<Mark, { sign: string; tone: string }> = {
  right: { sign: "○", tone: "text-emerald-700" },
  partial: { sign: "△", tone: "text-amber-600" },
  wrong: { sign: "✕", tone: "text-rose-600" },
  empty: { sign: "✕", tone: "text-rose-600" },
  pending: { sign: "", tone: "text-soft-muted" },
};

const subjectName = (id: SubjectId) => subjects.find((s) => s.id === id)?.short ?? "";

/* ───────────────────────── 진단 한 건의 정오표 ───────────────────────── */

export function AnswerSheet({
  row,
  record,
  grades,
  student,
  submitted,
  initialSubject,
  coach: coachFrom,
  review: reviewFrom,
}: {
  row: Registration;
  record: ExamRecord;
  /**
   * 전문가가 매긴 점수 — 채점이 끝난 문항만 들어 있다. 넘기면 그 문항은 「채점 중」 대신
   * 점수를 따라 정답 · 부분 정답 · 오답으로 적힌다.
   */
  grades?: Grades;
  /** 내려받는 파일과 종이 머리에 적는 이름 */
  student: string;
  /** 최종 제출한 날 — 「2026.09.12」 */
  submitted: string;
  /** 처음 펴 둘 과목 — 넘기지 않으면 첫 과목이다 */
  initialSubject?: SubjectId;
  /**
   * 「맞춤 학습」 창을 밖에서 여닫을 때. 디자인 보기는 창이 열린 화면과 닫힌 화면을 주소로
   * 가른다(/design/student/answers/…/coach). 넘기지 않으면 이 조각이 스스로 여닫는다.
   */
  coach?: { open: boolean; onOpen: () => void; onClose: () => void };
  /**
   * 「답안 풀이 보기」 창을 밖에서 여닫을 때 — 디자인 보기가 같은 까닭으로 쓴다
   * (/design/student/answers/…/review). at이 있으면 그 문항을 편 채로 창이 떠 있다.
   */
  review?: { at: ReviewAt | null; onOpen: (at: ReviewAt) => void; onClose: () => void };
}) {
  const available = answerSubjects(row);
  const [subject, setSubject] = useState<SubjectId>(
    reviewFrom?.at?.subject ?? initialSubject ?? available[0]?.id ?? "korean",
  );
  const [coachOwn, setCoachOwn] = useState(false);
  const [reviewOwn, setReviewOwn] = useState<ReviewAt | null>(null);
  const coach = coachFrom ? coachFrom.open : coachOwn;
  const openCoach = coachFrom ? coachFrom.onOpen : () => setCoachOwn(true);
  const closeCoach = coachFrom ? coachFrom.onClose : () => setCoachOwn(false);
  const reviewAt = reviewFrom ? reviewFrom.at : reviewOwn;
  const openReview = reviewFrom ? reviewFrom.onOpen : setReviewOwn;
  const closeReview = reviewFrom ? reviewFrom.onClose : () => setReviewOwn(null);
  const lines = linesOf(subject, record, grades);
  const count = tally(lines);

  return (
    <section className="mt-7 pb-24" aria-label="정답과 해설">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div role="group" aria-label="과목" className="flex flex-wrap gap-2">
          {available.map((s) => {
            const on = s.id === subject;
            return (
              <button
                key={s.id}
                type="button"
                aria-pressed={on}
                onClick={() => setSubject(s.id)}
                className={`rounded-full border px-5 py-2 text-[14px] transition-colors ${
                  on
                    ? "border-soft-primary bg-soft-primary font-semibold text-white"
                    : "border-soft-line bg-white text-soft-ink hover:bg-slate-50"
                }`}
              >
                {s.short}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => openReview({ subject, no: 1 })}
          className={`no-print ${btnPrimary}`}
        >
          답안 풀이 보기
        </button>
      </div>

      {/* ── 정오표 ── */}
      <div className="mt-7">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <h2 className="text-[17px] font-bold text-soft-ink">{subjectName(subject)} 정오표</h2>
          <AnswerDownloads
            row={row}
            record={record}
            grades={grades}
            student={student}
            submitted={submitted}
          />
        </div>
        <Tally count={count} total={lines.length} className="mt-3" />
        <MarkTable
          lines={lines}
          onOpen={(no) => openReview({ subject, no })}
          className="mt-3"
        />
        <p className="mt-3 text-[13px] leading-[1.75] text-soft-muted">
          문항 번호를 누르면 그 문항의 답안 풀이가 열립니다. 서술형 · 논술형 · 사진 답안은 전문가가
          채점하며, 채점이 끝나기 전에는 「채점 중」으로 적습니다. 만점보다 적게 받은 문항은 「부분
          정답」(△)으로 적고 받은 점수를 함께 보여 줍니다.
        </p>
      </div>

      {/* ── 맞춤 학습 — 오른쪽 아래에 떠 있다. 좁은 화면에서는 아래 메뉴 줄 위로 올린다 ── */}
      <button
        type="button"
        onClick={openCoach}
        className="no-print fixed bottom-[5.25rem] right-5 z-10 inline-flex items-center gap-2 rounded-full bg-soft-primary px-6 py-3.5 text-[15px] font-bold text-white shadow-float transition-colors hover:bg-soft-primary-dark md:right-8 lg:bottom-8"
      >
        <svg aria-hidden viewBox="0 0 20 20" className="h-[18px] w-[18px]" fill="none">
          <path
            d="M3 6.5 10 3l7 3.5-7 3.5-7-3.5Zm2.5 1.8v4.2c0 1.2 2 2.5 4.5 2.5s4.5-1.3 4.5-2.5V8.3M17 6.5v5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        맞춤 학습
      </button>
      {coach && (
        <CoachDialog
          record={record}
          grades={grades}
          subjects={available.map((s) => s.id)}
          onGo={(s, no) => {
            /* 창을 주소로 여닫는 디자인 보기에서는 답안 풀이 주소로 가는 것이 곧 이 창을 닫는 일이다 */
            if (!reviewFrom) closeCoach();
            setSubject(s);
            openReview({ subject: s, no });
          }}
          onClose={closeCoach}
        />
      )}
      {reviewAt && (
        <AnswerReview
          key={`${reviewAt.subject}-${reviewAt.no}`}
          row={row}
          record={record}
          grades={grades}
          at={reviewAt}
          onClose={closeReview}
        />
      )}
    </section>
  );
}

/* ───────────────────────── 정오표 ───────────────────────── */

function Tally({
  count,
  total,
  className = "",
}: {
  count: ReturnType<typeof tally>;
  /** 이 과목의 문항 수 */
  total: number;
  className?: string;
}) {
  return (
    <p
      className={`flex flex-wrap gap-x-5 gap-y-1 rounded-[12px] border border-soft-line bg-white px-4 py-3 text-[14px] text-soft-ink ${className}`}
    >
      <span>
        채점한 {total - count.pending}문항 중{" "}
        <b className="tabular-nums text-emerald-700">정답 {count.right}문항</b>
      </span>
      {count.partial > 0 && (
        <span className="text-amber-600">
          부분 정답 <b className="tabular-nums">{count.partial}</b>
        </span>
      )}
      <span className="text-rose-600">
        오답 <b className="tabular-nums">{count.wrong}</b>
      </span>
      <span className="text-rose-600">
        미응답 <b className="tabular-nums">{count.empty}</b>
      </span>
      {count.pending > 0 && (
        <span className="text-soft-muted">
          채점 중 <b className="tabular-nums">{count.pending}</b>
        </span>
      )}
    </p>
  );
}

/**
 * 정오표 — 화면과 종이(인쇄 · PDF)가 같은 표를 쓴다.
 *
 * 폭은 칸마다 정해 둔다(table-fixed). 「내 답」에 긴 글과 사진이 들어가도 표가 옆으로 밀리지
 * 않고 그 칸 안에서 줄이 바뀐다 — 좁은 화면에서도 표를 옆으로 미는 일이 없다.
 */
function MarkTable({
  lines,
  onOpen,
  paper = false,
  className = "",
}: {
  lines: Line[];
  /** 문항 번호를 눌렀을 때 — 그 문항의 답안 풀이를 연다. 종이에는 없다 */
  onOpen?: (no: number) => void;
  /** 인쇄 · PDF용 — 색을 줄이고 줄이 쪽 사이에서 갈리지 않게 한다 */
  paper?: boolean;
  className?: string;
}) {
  const th =
    "border border-soft-line bg-slate-50 px-2 py-2.5 text-center font-semibold text-soft-ink sm:px-3";
  const td = "border border-soft-line px-2 py-2.5 text-center align-middle sm:px-3";
  return (
    /* relative — 정오 칸의 읽기 전용 글(sr-only)은 absolute라, 기준이 이 틀이 아니면 문서 맨 위를
       기준으로 놓여 페이지 전체에 스크롤을 만든다 */
    <div className={`relative ${className}`}>
      <table className="w-full table-fixed border-collapse bg-white text-[14px]">
        <caption className="sr-only">정오표</caption>
        <colgroup>
          <col className="w-[13%] sm:w-[10%]" />
          <col className="w-[24%] sm:w-[20%]" />
          <col />
          <col className="w-[19%] sm:w-[15%]" />
        </colgroup>
        <thead>
          <tr>
            <th scope="col" className={th}>
              문항
            </th>
            <th scope="col" className={th}>
              정답
            </th>
            <th scope="col" className={th}>
              내 답
            </th>
            <th scope="col" className={th}>
              정오
            </th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => {
            const { q, no, mark, points, max } = line;
            const m = MARK[mark];
            const key = keyText(q);
            return (
              <tr key={q.id} className={paper ? "break-inside-avoid" : undefined}>
                <th scope="row" className={`${td} font-bold tabular-nums text-soft-ink`}>
                  {onOpen ? (
                    <button
                      type="button"
                      onClick={() => onOpen(no)}
                      aria-label={`문항 ${no} 답안 풀이 보기`}
                      className="rounded px-1.5 py-0.5 underline decoration-slate-300 underline-offset-4 transition-colors hover:text-soft-primary hover:decoration-soft-primary"
                    >
                      {no}
                    </button>
                  ) : (
                    no
                  )}
                </th>
                <td className={`${td} tabular-nums text-soft-ink`}>
                  {key || (
                    /* 정답이 하나로 정해지지 않는 문항 — 유형과 누가 채점하는지를 적는다 */
                    <span className="block text-[12.5px] leading-[1.5] text-soft-muted">
                      {answerKind(q)}
                      <br />
                      전문가 채점
                    </span>
                  )}
                </td>
                <td className={`${td} text-soft-ink`}>
                  <AnswerCell q={q} value={line.value} />
                </td>
                <td className={`${td} font-bold ${m.tone}`}>
                  <span className="inline-flex flex-col items-center gap-0.5 sm:flex-row sm:gap-1.5">
                    {m.sign && (
                      <span aria-hidden className="text-[16px] leading-none">
                        {m.sign}
                      </span>
                    )}
                    <span className="whitespace-nowrap text-[13px]">{markLabel[mark]}</span>
                  </span>
                  {/* 부분 정답은 몇 점을 받았는지 함께 적는다 — 세모만으로는 얼마나 모자란지 모른다 */}
                  {mark === "partial" && points !== null && (
                    <span className="mt-0.5 block whitespace-nowrap text-[12px] font-semibold tabular-nums">
                      {pointText(points)} / {max}점
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const dash = <span className="text-soft-muted">-</span>;

/**
 * 「내 답」 칸.
 *
 * 기계로 채점하는 문항은 짧은 답(②, 12개)을 가운데에, 전문가가 채점하는 문항은 쓴 글을 왼쪽에
 * 맞춰 **모두** 적는다. 사진과 그림은 그대로 보인다.
 *
 * 운영 콘솔의 채점 화면도 「제출한 답」 칸에 이것을 쓴다 — 채점자가 보는 답과 아이가 정오표에서
 * 보는 답이 같은 모양이어야 한다.
 */
export function AnswerCell({
  q,
  value,
}: {
  q: Line["q"];
  value: number | string | undefined;
}) {
  if (q.upload) return <PhotoAnswer value={value} />;
  if (autoGraded(q)) {
    const mine = shortAnswer(q, value);
    return mine ? <span className="tabular-nums">{mine}</span> : dash;
  }
  const parts = answerParts(q, value).filter((p) => p.text || p.drawing || !p.optional);
  return parts.length > 0 ? <WrittenAnswer parts={parts} /> : dash;
}

/** 쓴 글 — 칸 이름이 있으면 이름을 위에 적고, 줄 수를 자르지 않는다 */
function WrittenAnswer({ parts }: { parts: AnswerPart[] }) {
  return (
    <div className="space-y-2.5 text-left text-[13.5px] leading-[1.75] [overflow-wrap:anywhere]">
      {parts.map((p, i) => (
        <div key={i}>
          {p.label && <p className="text-[12px] font-bold text-soft-muted">{p.label}</p>}
          {p.drawing ? (
            <div
              className="relative mt-1 aspect-square w-full max-w-[11rem] overflow-hidden rounded-[8px] border border-soft-line bg-white bg-cover bg-center"
              style={
                p.drawing.background
                  ? { backgroundImage: `url(${p.drawing.background})` }
                  : undefined
              }
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.drawing.strokes}
                alt={`${p.label || "그림 칸"}에 그린 그림`}
                className="absolute inset-0 h-full w-full"
              />
            </div>
          ) : p.text ? (
            <p className="whitespace-pre-line">{p.text}</p>
          ) : (
            <p className="text-soft-muted">쓰지 않았습니다</p>
          )}
        </div>
      ))}
    </div>
  );
}

/** 사진으로 낸 답 — 올린 사진을 표 안에 그대로 보인다 */
function PhotoAnswer({ value }: { value: number | string | undefined }) {
  const saved = splitUpload(value);
  const { url, missing } = useMediaUrl(saved?.key ?? null);
  if (!saved) return dash;
  if (!url) {
    return (
      <span className="text-[12.5px] leading-[1.5] text-soft-muted">
        {missing ? "올린 사진을 이 기기에서 찾을 수 없습니다" : "사진을 불러오는 중입니다"}
      </span>
    );
  }
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={url}
      alt="올린 사진"
      className="mx-auto max-h-64 w-auto max-w-full rounded-[8px] border border-soft-line"
    />
  );
}

/* ───────────────────────── 내려받기 · 인쇄 ───────────────────────── */

const subscribeNothing = () => () => {};

/**
 * 정오표 내려받기 — PDF · CSV · 인쇄. 과목 단추와 상관없이 **본 과목을 모두** 담는다.
 *
 *   PDF   누르면 바로 파일이 내려받아진다. 과목마다 새 쪽에서 시작한다(lib/answerSheetPdf)
 *   CSV   표 프로그램에서 여는 파일. 사진과 그림은 담지 못해 제출했다는 말만 적는다
 *   인쇄  브라우저 인쇄 창
 *
 * 화면의 정오표는 과목 단추와 안내 글 사이에 끼어 있어 그대로 찍으면 종이가 지저분해진다.
 * 그래서 body 바로 밑에 **종이 전용 정오표**를 세워 두고 PDF와 인쇄가 그것을 쓴다. 평소에는
 * 감춰 두고(globals.css의 `.answer-sheet-print`), 인쇄할 때는 그것만 남기고 모두 감춘다.
 */
function AnswerDownloads({
  row,
  record,
  grades,
  student,
  submitted,
}: {
  row: Registration;
  record: ExamRecord;
  grades?: Grades;
  student: string;
  submitted: string;
}) {
  const ids = answerSubjects(row).map((s) => s.id);
  const paper = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);
  const mounted = useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false,
  );
  /* 「TalentMe_정오표_2026 3분기 초4 진단_이서준」 */
  const fileName = [
    assessment.name,
    "정오표",
    evalName(row.round, row.track, row.info?.label),
    student,
  ]
    .filter(Boolean)
    .join("_");

  useEffect(() => {
    const done = () => document.body.classList.remove("printing-answer-sheet");
    window.addEventListener("afterprint", done);
    return () => window.removeEventListener("afterprint", done);
  }, []);

  const print = () => {
    /* 인쇄 창에서 「PDF로 저장」을 고르면 문서 제목이 파일 이름이 된다 */
    const before = document.title;
    document.title = fileName;
    const restore = () => {
      document.title = before;
      window.removeEventListener("afterprint", restore);
    };
    window.addEventListener("afterprint", restore);
    document.body.classList.add("printing-answer-sheet");
    window.print();
  };

  const savePdf = async () => {
    const root = paper.current;
    if (!root) return;
    setSaving(true);
    /* 감춰 둔 종이를 화면 밖에 펴서 줄 높이를 잰다 */
    root.classList.add("is-capturing");
    try {
      await Promise.all(
        Array.from(root.querySelectorAll("img")).map((img) => img.decode().catch(() => {})),
      );
      await saveAnswerSheetPdf(
        Array.from(root.querySelectorAll<HTMLElement>("[data-sheet]")),
        fileName,
      );
    } catch {
      window.alert("PDF를 만들지 못했습니다. 「인쇄」에서 「PDF로 저장」을 골라 주세요.");
    } finally {
      root.classList.remove("is-capturing");
      setSaving(false);
    }
  };

  return (
    <>
      <div className="no-print flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-[12.5px] text-soft-muted">정오표 내려받기</span>
        <button
          type="button"
          onClick={savePdf}
          disabled={saving}
          className={`${btnSmGhost} disabled:cursor-wait disabled:opacity-60`}
        >
          {saving ? "PDF 만드는 중…" : "PDF"}
        </button>
        <button
          type="button"
          onClick={() => downloadCsv(fileName, answerCsvHead, answerCsv(row, record, grades))}
          className={btnSmGhost}
        >
          CSV
        </button>
        <button type="button" onClick={print} className={btnSmGhost}>
          <svg aria-hidden viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none">
            <path
              d="M5.5 7V3h9v4M5.5 14h-2V8.5A1.5 1.5 0 0 1 5 7h10a1.5 1.5 0 0 1 1.5 1.5V14h-2M5.5 11.5h9V17h-9v-5.5Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
          인쇄
        </button>
      </div>
      {mounted &&
        createPortal(
          <div ref={paper} className="answer-sheet-print text-black">
            {ids.map((id, i) => {
              const lines = linesOf(id, record, grades);
              const count = tally(lines);
              return (
                <div key={id} data-sheet className={i > 0 ? "break-before-page" : ""}>
                  <p className="text-[11px] text-slate-500">{row.title}</p>
                  <h1 className="mt-1 text-[22px] font-bold">정오표 · {subjectName(id)}</h1>
                  <p className="mt-2 text-[12px] leading-relaxed">
                    {student && <>이름 {student} · </>}최종 제출 {submitted} · 채점한{" "}
                    {lines.length - count.pending}문항 중 정답 {count.right}문항
                    {count.partial > 0 && ` · 부분 정답 ${count.partial}`} · 오답 {count.wrong} · 미응답{" "}
                    {count.empty}
                    {count.pending > 0 && ` · 채점 중 ${count.pending}`}
                  </p>
                  <MarkTable lines={lines} paper className="mt-4" />
                  {count.pending > 0 && (
                    <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
                      서술형 · 논술형 · 사진 답안은 전문가가 채점하며, 채점이 끝나기 전에는 「채점
                      중」으로 적습니다.
                    </p>
                  )}
                </div>
              );
            })}
          </div>,
          document.body,
        )}
    </>
  );
}

/* ───────────────────────── 맞춤 학습 ───────────────────────── */

/**
 * 맞춤 학습 — 오답 · 부분 정답이거나 답하지 않은 문항을 과목별로 모아 다시 보게 한다.
 *
 * 학습 콘텐츠는 아직 없다. 지금은 「무엇을 다시 볼까」를 정오표에서 뽑아 그 문항의 답안
 * 풀이로 바로 데려가는 데까지만 한다. 전문가가 채점하는 문항은 채점이 끝나야 더해진다.
 */
function CoachDialog({
  record,
  grades,
  subjects: ids,
  onGo,
  onClose,
}: {
  record: ExamRecord;
  grades?: Grades;
  subjects: SubjectId[];
  onGo: (subject: SubjectId, no: number) => void;
  onClose: () => void;
}) {
  const groups = ids.map((id) => ({
    id,
    name: subjectName(id),
    lines: linesOf(id, record, grades),
  }));
  const misses = groups.map((g) => ({
    ...g,
    miss: g.lines.filter(
      (l) => l.mark === "wrong" || l.mark === "empty" || l.mark === "partial",
    ),
  }));
  const total = misses.reduce((n, g) => n + g.miss.length, 0);
  const pending = groups.reduce((n, g) => n + tally(g.lines).pending, 0);
  /* 창이 열린 채로 처음 그려질 수 있다(디자인 보기의 …/coach 주소) — 서버에는 붙일 body가 없다 */
  const mounted = useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false,
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!mounted) return null;

  /* body 바로 밑에 띄운다 — 본문 안에 두면 위 상태바와 아래 메뉴 줄이 덮개 위로 올라온다 */
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="coach-title"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="no-print fixed inset-0 z-50 flex items-center justify-center bg-soft-ink/40 p-5"
    >
      <div className="max-h-full w-full max-w-md overflow-y-auto rounded-[16px] bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.25)] sm:p-7">
        <h2 id="coach-title" className="text-[18px] font-bold text-soft-ink">
          맞춤 학습
        </h2>
        <p className="mt-2 text-[13px] leading-relaxed text-soft-muted">
          {total > 0
            ? `만점을 받지 못한 ${total}문항부터 다시 살펴봅니다. 번호를 누르면 그 문항의 답안 풀이가 열립니다.`
            : "채점한 문항은 모두 정답입니다."}
        </p>

        {total > 0 && (
          <ul className="mt-5 space-y-3">
            {misses
              .filter((g) => g.miss.length > 0)
              .map((g) => (
                <li key={g.id} className="rounded-[12px] border border-soft-line px-4 py-3">
                  <p className="text-[13px] font-bold text-soft-ink">
                    {g.name}{" "}
                    <span className="font-semibold text-rose-600">{g.miss.length}문항</span>
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {g.miss.map((l) => (
                      <button
                        key={l.q.id}
                        type="button"
                        onClick={() => onGo(g.id, l.no)}
                        aria-label={`${g.name} 문항 ${l.no} ${markLabel[l.mark]}`}
                        className="min-w-9 rounded-[8px] border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-[13px] font-bold tabular-nums text-rose-700 transition-colors hover:bg-rose-100"
                      >
                        {l.no}
                      </button>
                    ))}
                  </div>
                </li>
              ))}
          </ul>
        )}

        {pending > 0 && (
          <p className="mt-4 text-[12px] leading-relaxed text-soft-muted">
            채점 중인 {pending}문항은 전문가 채점이 끝나면 함께 더해집니다.
          </p>
        )}

        <div className="mt-7">
          <button type="button" onClick={onClose} className={`w-full ${btnPrimary}`}>
            닫기
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
