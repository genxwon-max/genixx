"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { ageFromBirth } from "@/lib/account";
import { formatCode, reissueCode, useRoster, type Student } from "@/lib/roster";
import { subjects } from "@/lib/exam";
import {
  allSubmitted,
  finalize,
  missingSurveys,
  surveyKeys,
  surveyMeta,
  useExamRecord,
  useExamStore,
  useHydrated,
} from "@/lib/examStore";
import { progressOf, type Phase } from "@/lib/progress";
import { ArrowRight } from "@/components/Icons";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ConfirmDialog from "./ConfirmDialog";
import { AccHead, btnPrimary, card, cardPad } from "./ui";

/** 한 쪽에 담는 학생 수. 25명을 넘으면 쪽을 나눈다. */
const PER_PAGE = 25;

/** 상태로 걸러내기. 값은 lib/progress.ts의 Phase를 그대로 쓴다. */
const phaseOptions: { value: "all" | Phase; label: string }[] = [
  { value: "all", label: "상태 전체" },
  { value: "미응시", label: "미응시" },
  { value: "응시중", label: "응시중" },
  { value: "제출완료", label: "제출완료" },
  { value: "검사완료", label: "검사완료" },
];

type SortKey = "recent" | "name" | "grade";

const sortOptions: { value: SortKey; label: string }[] = [
  { value: "recent", label: "최근 등록순" },
  { value: "name", label: "이름순" },
  { value: "grade", label: "학년순" },
];

/* 목록 줄 안에서 쓰는 작은 알약 버튼. 손가락으로 누를 수 있도록 44px 이상은 지킨다. */
const rowBtn =
  "inline-flex min-h-[2.75rem] items-center justify-center rounded-full border border-soft-line bg-white px-4 text-[13px] font-semibold text-soft-ink transition-colors hover:bg-slate-50";
const rowBtnPrimary =
  "inline-flex min-h-[2.75rem] items-center justify-center gap-1.5 rounded-full bg-soft-primary px-5 text-[13px] font-semibold text-white transition-colors hover:bg-soft-primary-dark";
const rowBtnMuted =
  "inline-flex min-h-[2.75rem] cursor-not-allowed items-center justify-center rounded-full border border-soft-line bg-slate-50 px-5 text-[13px] font-semibold text-slate-400";

/**
 * ACC-03 학생(자녀) 프로필 관리.
 *
 * 여러 명을 지원하고, 프로필 단위로 응시·리포트 이력이 귀속된다. 한 명씩 큰 카드로
 * 세우면 네 명만 넘어도 화면이 끝없이 길어지므로 목록 한 줄에 한 명을 담고,
 * 25명이 넘으면 쪽을 나눈다.
 */
export default function ChildList() {
  const hydrated = useHydrated();
  const all = useRoster();
  // 상태로 거르려면 응시 기록이 바뀔 때도 다시 그려야 한다. 값 자체는 progressOf가 읽는다.
  const store = useExamStore();

  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [phase, setPhase] = useState<"all" | Phase>("all");
  const [sort, setSort] = useState<SortKey>("recent");

  const children = useMemo(() => all.filter((s) => s.owner === "parent"), [all]);

  /**
   * 아이별 진행 단계.
   *
   * progressOf는 응시 기록을 스토어에서 직접 읽는다(React 밖). 그래서 store 자체는
   * 여기서 쓰이지 않지만, 기록이 바뀌었을 때 다시 계산하게 하려면 의존성에 있어야
   * 한다. 빼면 설문을 내고 돌아와도 「응시중」에 그대로 남는다.
   */
  const phaseById = useMemo(
    () => new Map(children.map((c) => [c.id, progressOf(c).phase])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [children, store],
  );

  const rows = useMemo(() => {
    // 접속코드는 화면에 1234-ABCD로 보이지만 저장은 붙여서 한다. 어느 쪽으로 쳐도 찾히게 한다.
    const needle = query.trim().toLowerCase().replace(/-/g, "");
    let list = children;

    if (needle) {
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(needle) ||
          c.code.toLowerCase().includes(needle) ||
          c.grade.toLowerCase().includes(needle),
      );
    }
    if (phase !== "all") {
      list = list.filter((c) => phaseById.get(c.id) === phase);
    }

    const sorted = [...list];
    if (sort === "name") sorted.sort((a, b) => a.name.localeCompare(b.name, "ko"));
    else if (sort === "grade")
      sorted.sort(
        (a, b) => a.grade.localeCompare(b.grade, "ko") || a.name.localeCompare(b.name, "ko"),
      );
    else sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return sorted;
  }, [children, query, phase, sort, phaseById]);

  if (!hydrated) {
    return <p className="py-16 text-center text-[13px] text-soft-muted">확인 중입니다…</p>;
  }

  // 아이를 지우거나 검색으로 줄어들면 마지막 쪽이 사라진다. 상태를 고치지 않고 그릴 때 눌러 둔다.
  const pages = Math.max(1, Math.ceil(rows.length / PER_PAGE));
  const current = Math.min(page, pages);
  const start = (current - 1) * PER_PAGE;
  const shown = rows.slice(start, start + PER_PAGE);
  const filtering = query.trim() !== "" || phase !== "all";

  return (
    <>
      {/* 등록 버튼은 학부모 홈과 같은 자리(제목 오른쪽)에 둔다 */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <AccHead
            id="ACC-03"
            title="학생 프로필"
            lead="아이마다 프로필을 따로 둡니다. 응시 기록과 리포트는 프로필 단위로 쌓입니다."
            back={{ href: "/my", label: "홈으로" }}
          />
        </div>
        {children.length > 0 && (
          <Link href="/my/children/consent" className={`${btnPrimary} mt-8 shrink-0`}>
            + 학생 등록
          </Link>
        )}
      </div>

      {children.length === 0 ? (
        <div className={`${card} ${cardPad} text-center`}>
          <p className="text-[16px] font-black text-soft-ink">아직 등록된 학생이 없습니다</p>
          <p className="mt-2.5 text-[14px] leading-relaxed text-soft-muted">
            등록은 <b>법정대리인 동의</b>부터 시작합니다. 아이 생년월일에 따라 누가 동의해야 하는지
            안내해 드립니다.
          </p>
          <Link href="/my/children/consent" className={`${btnPrimary} mt-6`}>
            학생 등록 시작하기
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <>
          {/* 찾기와 분류. 어느 것을 바꾸든 1쪽으로 돌아간다 — 3쪽을 보던 중에
              검색하면 결과가 있는데도 빈 쪽이 나오기 때문이다. */}
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search
                aria-hidden
                className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-soft-muted"
              />
              <Input
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="이름 · 접속코드 · 학년으로 찾기"
                aria-label="학생 찾기"
                className="rounded-full pl-10 text-[14px]"
              />
            </div>

            {/* 좁은 화면에서 둘이 각자 한 줄을 먹지 않도록 묶어 둔다 */}
            <div className="flex gap-2">
              <Select
                items={phaseOptions}
                value={phase}
                onValueChange={(v) => {
                  setPhase(v as "all" | Phase);
                  setPage(1);
                }}
              >
                <SelectTrigger
                  aria-label="진행 상태로 거르기"
                  className="flex-1 rounded-full sm:w-40 sm:flex-none"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {phaseOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                items={sortOptions}
                value={sort}
                onValueChange={(v) => {
                  setSort(v as SortKey);
                  setPage(1);
                }}
              >
                <SelectTrigger
                  aria-label="정렬"
                  className="flex-1 rounded-full sm:w-36 sm:flex-none"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sortOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <p className="mb-2.5 text-[13px] text-soft-muted">
            {filtering ? `${children.length}명 중 ${rows.length}명` : `총 ${rows.length}명`}
            {pages > 1 && ` · ${start + 1}–${start + shown.length}번째`}
          </p>

          {shown.length === 0 ? (
            <div className={`${card} p-10 text-center`}>
              <p className="text-[14px] font-bold text-soft-ink">찾는 학생이 없습니다</p>
              <p className="mt-1.5 text-[13px] text-soft-muted">
                검색어나 상태를 바꿔 보세요. 등록된 학생은 {children.length}
                명입니다.
              </p>
            </div>
          ) : (
            <ul className={card}>
              {shown.map((c) => (
                <ChildRow key={c.id} student={c} />
              ))}
            </ul>
          )}

          {pages > 1 && <Pager page={current} pages={pages} onGo={setPage} />}
        </>
      )}

      <div className={`${card} mt-4 p-5`}>
        <p className="text-[14px] font-black text-soft-ink">아이는 따로 가입하지 않습니다</p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-soft-muted">
          만 14세 이상이어도 마찬가지입니다. 동의의 주체만 아이 본인으로 바뀔 뿐, 계정은 이 보호자
          계정 하나입니다. 아이 화면에서는 결제 정보나 형제자매의 결과가 보이지 않습니다.
        </p>
      </div>
    </>
  );
}

/* ───────────────────────── 목록 한 줄 ───────────────────────── */

/**
 * 학생 한 명.
 *
 * 진행 상황은 아이마다 따로 저장되므로(lib/examStore.ts) 줄마다 자기 기록을 읽는다.
 * 목록에서 바로 할 수 있는 일은 셋이다 — 코드를 아이에게 넘기고, 코드가 새면 다시
 * 발급하고, 다 끝났으면 결과를 받기 위해 최종 제출한다.
 */
function ChildRow({ student }: { student: Student }) {
  const router = useRouter();
  const record = useExamRecord(student.id);
  const [ask, setAsk] = useState<"reissue" | "final" | null>(null);

  const age = ageFromBirth(student.birth);

  // 세 과목 모두 제출 + 문항별 해석까지 끝나야 최종 제출할 수 있다 (응시 현황 화면과 같은 기준)
  const examDone =
    allSubmitted(record) && subjects.every((s) => record.subjects[s.id].reflectionAt !== null);
  const submitted = subjects.filter((s) => record.subjects[s.id].status === "submitted").length;
  const surveysDone = surveyKeys.filter((k) => record.surveys[k] === "done").length;
  const missing = missingSurveys(record);

  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-slate-100 px-5 py-2.5 first:border-t-0 sm:px-6">
      <p className="text-[15px] font-black text-soft-ink">{student.name}</p>
      <p className="text-[13px] text-soft-muted">
        {student.grade} · 만 {age ?? "—"}세
      </p>

      {/* 코드와 복사 버튼은 붙여 둔다. 코드를 보는 이유가 곧 아이에게 넘기는 것이다. */}
      <span className="rounded-md bg-slate-50 px-2.5 py-1 text-[14px] font-black tracking-[0.08em] tabular-nums text-soft-ink">
        {formatCode(student.code)}
      </span>
      <CopyCode code={student.code} />

      <span
        className={`text-[13px] font-semibold ${examDone ? "text-emerald-600" : "text-soft-muted"}`}
      >
        시험 {submitted}/{subjects.length}
        {examDone ? " 완료" : ""}
      </span>
      <span
        className={`text-[13px] font-semibold ${
          surveysDone === surveyKeys.length ? "text-emerald-600" : "text-soft-muted"
        }`}
      >
        설문 {surveysDone}/{surveyKeys.length}
        {surveysDone === surveyKeys.length ? " 완료" : ""}
      </span>

      <div className="ml-auto flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setAsk("reissue")} className={rowBtn}>
          코드 재발급
        </button>
        {record.finalized ? (
          <Link href={`/exam/result?student=${student.id}`} className={rowBtnPrimary}>
            결과 보기
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        ) : examDone ? (
          <button type="button" onClick={() => setAsk("final")} className={rowBtnPrimary}>
            제출 완료
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        ) : (
          <span className={rowBtnMuted} title="세 과목의 답안과 해석을 모두 제출해야 열립니다">
            제출 완료
          </span>
        )}
      </div>

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
            setAsk(null);
            router.push(`/exam/result?student=${student.id}`);
          }}
        />
      )}
    </li>
  );
}

/* ───────────────────────── 쪽 넘김 ───────────────────────── */

function Pager({ page, pages, onGo }: { page: number; pages: number; onGo: (p: number) => void }) {
  // 쪽이 많아도 번호를 다 늘어놓지 않는다. 지금 쪽 둘레로 최대 다섯 개만 보인다.
  const from = Math.max(1, Math.min(page - 2, pages - 4));
  const to = Math.min(pages, from + 4);
  const nums = [];
  for (let i = from; i <= to; i += 1) nums.push(i);

  const step =
    "inline-flex h-10 min-w-10 items-center justify-center rounded-full border border-soft-line bg-white px-3 text-[13px] font-semibold text-soft-ink transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-white";

  return (
    <nav aria-label="쪽 넘김" className="mt-4 flex flex-wrap items-center justify-center gap-1.5">
      <button type="button" onClick={() => onGo(page - 1)} disabled={page === 1} className={step}>
        이전
      </button>
      {nums.map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onGo(n)}
          aria-current={n === page ? "page" : undefined}
          className={
            n === page
              ? "inline-flex h-10 min-w-10 items-center justify-center rounded-full bg-soft-primary px-3 text-[13px] font-bold text-white"
              : step
          }
        >
          {n}
        </button>
      ))}
      <button
        type="button"
        onClick={() => onGo(page + 1)}
        disabled={page === pages}
        className={step}
      >
        다음
      </button>
    </nav>
  );
}

/* ───────────────────────── 코드 복사 ───────────────────────── */

/**
 * 접속코드 복사 버튼.
 *
 * 코드를 받은 보호자가 바로 할 일은 아이에게 전달하는 것이다. 손으로 옮겨 적게
 * 두면 혼동하기 쉬운 글자(0·O 같은)를 빼 둔 뜻이 없어진다.
 */
function CopyCode({ code }: { code: string }) {
  const [state, setState] = useState<"idle" | "done" | "failed">("idle");

  const copy = async () => {
    const text = formatCode(code);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // 보안 컨텍스트가 아니거나 권한이 없으면 clipboard가 거절한다. 예전 방식으로 한 번 더 시도한다.
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      if (!ok) {
        // 되지 않았으면 됐다고 하지 않는다. 손으로 옮겨 적어야 한다는 뜻이다.
        setState("failed");
        window.setTimeout(() => setState("idle"), 3000);
        return;
      }
    }
    setState("done");
    window.setTimeout(() => setState("idle"), 2000);
  };

  return (
    <button type="button" onClick={() => void copy()} className={rowBtn}>
      {state === "done" ? "복사했습니다" : state === "failed" ? "직접 입력해 주세요" : "코드 복사"}
    </button>
  );
}
