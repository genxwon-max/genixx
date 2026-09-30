"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useSession } from "@/lib/authStore";
import { themeOf } from "@/lib/authVariant";
import {
  EXTRA_TOTAL,
  blankRow,
  checkRows,
  extraFilled,
  readTableFile,
  rowsFromText,
  sampleText,
  templateCsv,
  toNewStudent,
  type BulkRow,
  type RowCheck,
  type RowField,
} from "@/lib/bulkRegister";
import {
  OBSERVATION_MAX,
  genders,
  interestAreas,
  learningKinds,
  levelOf,
  schoolLevels,
  sidoList,
} from "@/lib/childOptions";
import { useHydrated } from "@/lib/examStore";
import { patchBulkDraft } from "@/lib/flowDraft";
import { addStudents, bulkColumnsFor, useRoster } from "@/lib/roster";
import Toast from "@/components/exam/Toast";
import Chips, { flip } from "./Chips";
import { StepBar, type Step } from "./StepFlow";
import { AccHead } from "./ui";

const t = themeOf(2);

/** 일괄 등록의 두 걸음 — 걸음마다 주소가 따로다(lib/flowDraft.ts) */
export const bulkSteps: Step[] = [
  { label: "명단 입력", href: "/my/children/bulk" },
  { label: "접속코드 받기", href: "/my/children/bulk/done" },
];

/* 명단 칸은 한 줄에 넷이 서야 해서 등록 폼(52px)보다 한 칸 낮다. 누르는 자리는 44px 아래로
   내리지 않는다(components/ui/button.tsx) */
const box =
  "h-11 w-full rounded-[10px] border bg-white px-3 text-[14px] text-soft-ink outline-none transition-colors placeholder:text-slate-400 focus:border-soft-primary focus:ring-2 focus:ring-soft-primary-soft disabled:cursor-not-allowed disabled:bg-slate-50";
const ctl = (bad: boolean) => `${box} ${bad ? "border-[#e5484d]" : "border-soft-line"}`;
const lbl = "text-[13px] font-semibold text-soft-ink";

/**
 * ACC-03 학생 일괄 등록 ① 명단 입력 (/my/children/bulk).
 *
 * 예전 화면(/my/students?tab=bulk)은 학원용 명부 도구를 보호자에게 그대로 열어 준 것이었다 —
 * 한 명씩 추가 · 여럿 추가 탭, 가로로 밀리는 열 안내표, 탭으로 갈린 글을 붙이는 칸, 그 아래
 * 기관용 명부 표와 접속코드 발급 규칙까지 한 화면에 섰다. 붙인 글이 무엇으로 읽혔는지는
 * 「인식된 학생 3명 · 오류 1줄」 한 줄로만 보였고, 틀린 줄은 명단에서 빠진 채 이유만 남았다.
 *
 * 지금은 세 덩이다.
 *   항목 안내   필수 다섯과 선택 여섯을 나눠 적고, 필수 값이 **어디에 쓰이는지**를 붙인다
 *   학생 명단   한 명이 한 줄. 직접 적든 엑셀·CSV로 불러오든 같은 표에 서고, 틀린 칸은 그
 *               자리에서 빨갛게 보인다. 선택 항목은 줄마다 접어 두었다가 펼친다
 *   등록 단추   아래에 붙어 있다 — 스무 명을 불러온 뒤에도 몇 명이 등록되는지가 보인다
 *
 * 등록하면 ② 접속코드 받기(/my/children/bulk/done)로 넘어간다. 법정대리인 동의는 학부모
 * 회원가입 때 받았으므로 여기서 다시 묻지 않는다(ChildNew와 같은 까닭).
 *
 * 기관 회원은 동의 요청 · 반 · 법정대리인 연락처가 더 필요해 기관 명부(/my/students)로 보낸다.
 */
export default function BulkRegister() {
  const router = useRouter();
  const hydrated = useHydrated();
  const session = useSession();
  const roster = useRoster();
  const [rows, setRows] = useState<BulkRow[]>(() => [blankRow(), blankRow()]);
  /** 선택 정보를 펼친 줄 */
  const [extraOpen, setExtraOpen] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  /** 등록을 한 번 눌렀다 — 그때부터 빈 필수 칸도 빨갛게 보인다 */
  const [tried, setTried] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const isOrg = session?.role === "director" || session?.role === "teacher";
  useEffect(() => {
    if (hydrated && isOrg) router.replace("/my/students?tab=bulk");
  }, [hydrated, isOrg, router]);

  if (!hydrated || isOrg) {
    return <p className="py-16 text-center text-[13px] text-soft-muted">확인 중입니다…</p>;
  }

  const mine = roster.filter((s) => s.owner === "parent");
  const checks = checkRows(rows, mine);
  const count = checks.filter((c) => !c.blank).length;
  const bad = checks.filter((c) => !c.blank && !c.ok).length;
  /** 빨간 칸이 **보이는** 줄 — 아직 적는 중인 줄은 세지 않는다 */
  const reveal = (r: BulkRow) => tried || !!r.imported;
  const shownBad = rows.filter((r, i) => {
    const c = checks[i];
    return !c.blank && !c.ok && Object.keys(reveal(r) ? c.errors : c.wrong).length > 0;
  }).length;

  const patch = (key: string, p: Partial<BulkRow>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...p } : r)));
  const remove = (key: string) =>
    setRows((rs) => {
      const next = rs.filter((r) => r.key !== key);
      return next.length > 0 ? next : [blankRow()];
    });
  const toggleExtra = (key: string) =>
    setExtraOpen((o) => (o.includes(key) ? o.filter((k) => k !== key) : [...o, key]));

  /* 불러온 줄은 빈 줄을 밀어내고 뒤에 붙는다 — 적어 둔 줄은 그대로 둔다 */
  const importRows = (incoming: BulkRow[]) => {
    if (incoming.length === 0) return;
    const kept = rows.filter((_, i) => !checks[i].blank);
    const next = [...kept, ...incoming];
    setRows(next);
    setImporting(false);
    const need = checkRows(next, mine)
      .slice(kept.length)
      .filter((c) => !c.blank && !c.ok).length;
    setToast(
      need > 0
        ? `${incoming.length}명을 불러왔습니다. ${need}명은 빨간 칸을 확인해 주세요.`
        : `${incoming.length}명을 불러왔습니다.`,
    );
  };

  const submit = () => {
    setTried(true);
    if (count === 0) return;
    if (bad > 0) {
      const first = rows.find((_, i) => !checks[i].blank && !checks[i].ok);
      document
        .getElementById(`bulk-row-${first?.key}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    const created = addStudents(
      rows.filter((_, i) => !checks[i].blank).map(toNewStudent),
      "parent",
      session?.name ?? "보호자",
    );
    patchBulkDraft({ issued: created.map((c) => c.id) });
    router.push("/my/children/bulk/done");
  };

  const footNote =
    count === 0 ? (
      "이름부터 적어 주세요. 비워 둔 줄은 건너뜁니다."
    ) : shownBad > 0 ? (
      <span className="font-semibold text-[#d93a3f]">
        {shownBad}명은 빨간 칸을 고쳐야 등록됩니다.
      </span>
    ) : bad > 0 ? (
      `${count}명 입력 중`
    ) : (
      <span className="font-semibold text-emerald-700">{count}명 모두 등록할 수 있습니다.</span>
    );

  return (
    <>
      <AccHead
        id="ACC-03"
        title="학생 일괄 등록"
        lead="여러 아이를 한 번에 등록하고, 아이마다 접속코드를 받습니다."
        back={{ href: "/my", label: "홈으로" }}
      />

      <StepBar steps={bulkSteps} current={0} />

      <FieldGuide />

      <section aria-labelledby="bulk-list-title" className={`${t.card} mt-4 overflow-hidden`}>
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-soft-line px-5 py-4 sm:px-6">
          <div>
            <h2 id="bulk-list-title" className="text-[17px] font-bold text-soft-ink">
              학생 명단
            </h2>
            <p className="mt-0.5 text-[13px] text-soft-muted">
              {count === 0 ? "한 줄에 한 명씩 적습니다." : `${count}명`}
              {shownBad > 0 && (
                <span className="font-semibold text-[#d93a3f]"> · 확인 필요 {shownBad}명</span>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setImporting((v) => !v)}
            aria-expanded={importing}
            aria-controls="bulk-import"
            className={t.btnQuiet}
          >
            {importing ? "불러오기 닫기" : "엑셀·CSV로 불러오기"}
          </button>
        </header>

        {importing && <ImportPanel onImport={importRows} onClose={() => setImporting(false)} />}

        <ol className="divide-y divide-slate-100">
          {rows.map((row, i) => (
            <RowCard
              key={row.key}
              no={i + 1}
              row={row}
              check={checks[i]}
              reveal={reveal(row)}
              extraOpen={extraOpen.includes(row.key)}
              onToggleExtra={() => toggleExtra(row.key)}
              onChange={(p) => patch(row.key, p)}
              onRemove={rows.length > 1 ? () => remove(row.key) : undefined}
            />
          ))}
        </ol>

        <div className="border-t border-soft-line px-5 py-3 sm:px-6">
          <button
            type="button"
            onClick={() => setRows((rs) => [...rs, blankRow()])}
            className="inline-flex h-11 items-center gap-1.5 rounded-full px-1 text-[14px] font-semibold text-soft-primary hover:underline"
          >
            + 학생 한 명 더
          </button>
        </div>
      </section>

      {/* 등록하고 나서 벌어지는 일 — 누르기 전에 알아야 할 것만 */}
      <section className="mt-4 rounded-[14px] border border-soft-line bg-white p-5 sm:p-6">
        <h2 className="text-[15px] font-bold text-soft-ink">등록하면</h2>
        <ul className="mt-2.5 space-y-1.5 text-[13.5px] leading-[1.75] text-soft-muted">
          <li>
            · 아이마다 8자리 <b className="font-semibold text-soft-ink">접속코드</b>가 발급됩니다.
            아이는 이 코드와 생년월일로 학생 화면에 들어옵니다.
          </li>
          <li>· 법정대리인 동의는 회원가입 때 받았으므로 아이마다 다시 받지 않습니다.</li>
          <li>· 재능 진단 접수는 등록을 마친 뒤 「결제」 메뉴에서 아이를 골라 합니다.</li>
        </ul>
      </section>

      {/* 등록 단추 — 화면 아래에 붙여 둔다(StepNav와 같은 자리) */}
      <div className="sticky bottom-[3.75rem] z-10 -mx-4 mt-4 px-4 pb-3 pt-8 sm:-mx-6 sm:px-6 lg:bottom-0 lg:pb-6">
        <span
          aria-hidden
          className="absolute inset-0 -z-10 bg-[#f4f6fb] [mask-image:linear-gradient(to_top,#000_65%,transparent)]"
        />
        <p role="status" className="mb-2.5 text-center text-[13px] text-soft-muted">
          {footNote}
        </p>
        <div className="mx-auto max-w-[24rem]">
          <button type="button" onClick={submit} disabled={count === 0} className={t.btnPrimary}>
            {count > 0 ? `${count}명 등록하고 접속코드 받기` : "등록하고 접속코드 받기"}
          </button>
        </div>
      </div>

      <Toast message={toast} onClose={() => setToast(null)} />
    </>
  );
}

/* ───────────────────────── 항목 안내 ───────────────────────── */

/** 필수 값마다 어디에 쓰이는지 — 왜 적어야 하는지를 알면 틀리게 적는 일이 준다 */
const requiredFields = [
  { k: "이름", v: "결과지에 적히는 이름" },
  { k: "생년월일", v: "8자리 · 아이가 접속코드와 함께 넣어 로그인합니다" },
  { k: "학교급 · 학년", v: "어느 학년 진단을 받을지 정합니다" },
  { k: "아이 휴대전화", v: "접속코드를 아이에게 바로 보낼 때 씁니다 · 없으면 「없음」" },
];

/**
 * 필수 · 선택을 두 칸으로 나눈다.
 *
 * 예전에는 열 안내표의 한 줄(「구분」)에 필수 · 선택 딱지를 늘어놓았다. 열이 열한 개라 표가
 * 가로로 밀렸고, 오른쪽 끝의 선택 항목은 밀어 보지 않으면 있는 줄도 몰랐다. 나눠 적으면
 * 「이것만 있으면 된다」가 먼저 읽힌다.
 */
function FieldGuide() {
  return (
    <section
      aria-label="입력 항목 안내"
      className={`${t.card} grid gap-5 p-5 sm:p-6 md:grid-cols-2 md:gap-0`}
    >
      <div className="md:pr-6">
        <p className="flex items-center gap-2 text-[15px] font-bold text-soft-ink">
          <span className="rounded-full bg-[#fdecec] px-2.5 py-0.5 text-[12px] font-bold text-[#d93a3f]">
            필수
          </span>
          다섯 가지는 꼭 적어 주세요
        </p>
        <dl className="mt-3.5 space-y-2.5">
          {requiredFields.map((f) => (
            <div key={f.k} className="flex flex-wrap gap-x-3 gap-y-0.5 text-[14px] leading-[1.6]">
              <dt className="w-[6.75rem] shrink-0 font-semibold text-soft-ink">{f.k}</dt>
              <dd className="min-w-0 flex-1 text-soft-muted">{f.v}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="border-t border-soft-line pt-5 md:border-l md:border-t-0 md:pl-6 md:pt-0">
        <p className="flex items-center gap-2 text-[15px] font-bold text-soft-ink">
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[12px] font-bold text-slate-500">
            선택
          </span>
          비워 두어도 등록됩니다
        </p>
        <p className="mt-3.5 text-[14px] leading-[1.75] text-soft-ink">
          성별 · 거주 지역 · 학교명 · 관심 분야 · 학습 경험 · 보호자가 관찰한 특성
        </p>
        <p className="mt-2 text-[13px] leading-[1.7] text-soft-muted">
          점수를 매기는 데는 쓰지 않고 결과를 해석할 때만 씁니다. 줄마다 「선택 정보」를 펼쳐
          적습니다.
        </p>
      </div>
    </section>
  );
}

/* ───────────────────────── 명단 한 줄 ───────────────────────── */

type RowState = "blank" | "typing" | "bad" | "ok";

const rowStateView: Record<RowState, { text: string; tone: string; dot: string }> = {
  blank: { text: "비어 있음", tone: "text-slate-400", dot: "bg-slate-300" },
  typing: { text: "입력 중", tone: "text-soft-muted", dot: "bg-slate-300" },
  bad: { text: "확인 필요", tone: "text-[#d93a3f]", dot: "bg-[#e5484d]" },
  ok: { text: "등록 가능", tone: "text-emerald-700", dot: "bg-emerald-500" },
};

/** 칸 하나 — 이름표 · 입력 · 그 아래 한 줄(틀린 까닭이 있으면 그것, 없으면 도움말) */
function Cell({
  htmlFor,
  label,
  required,
  error,
  hint,
  children,
}: {
  htmlFor: string;
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <label htmlFor={htmlFor} className={lbl}>
        {label}
        {required && (
          <>
            <span aria-hidden className="ml-0.5 text-[#e5484d]">
              *
            </span>
            <span className="sr-only">(필수)</span>
          </>
        )}
      </label>
      <div className="mt-1.5">{children}</div>
      {error ? (
        <p role="alert" className="mt-1 text-[12px] font-semibold leading-snug text-[#d93a3f]">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1 text-[12px] leading-snug text-soft-muted">{hint}</p>
      ) : null}
    </div>
  );
}

/**
 * 학생 한 명.
 *
 * 필수 넷(학교급 · 학년은 한 칸)은 넓은 화면에서 한 줄에 선다. 선택 여섯은 접어 두고 줄 머리의
 * 「선택 정보 2/6」으로 몇 개를 채웠는지만 보인다 — 여섯 칸을 줄마다 펴 두면 스무 명을 불러온
 * 명단이 필수 칸을 찾기 어려울 만큼 길어진다.
 *
 * 빈 필수 칸은 등록을 누른 뒤에 빨갛게 한다. 적는 도중에 「이름을 적어 주세요」가 줄마다
 * 떠 있으면 아직 손대지 않은 줄까지 틀린 것처럼 보인다. 이미 틀린 값(없는 날짜 · 같은 학생
 * 두 번)은 바로 알린다. 파일에서 불러온 줄은 처음부터 다 보여 준다.
 */
function RowCard({
  no,
  row,
  check,
  reveal,
  extraOpen,
  onToggleExtra,
  onChange,
  onRemove,
}: {
  no: number;
  row: BulkRow;
  check: RowCheck;
  /** 빈 필수 칸까지 빨갛게 보일 때인가 */
  reveal: boolean;
  extraOpen: boolean;
  onToggleExtra: () => void;
  onChange: (p: Partial<BulkRow>) => void;
  /** 한 줄만 남았으면 지우지 않는다 — 비워 두면 건너뛴다 */
  onRemove?: () => void;
}) {
  const shown = reveal ? check.errors : check.wrong;
  const err = (f: RowField) => shown[f];
  const id = (f: string) => `${row.key}-${f}`;
  const lv = levelOf(row.level);
  const state: RowState = check.blank
    ? "blank"
    : check.ok
      ? "ok"
      : Object.keys(shown).length > 0
        ? "bad"
        : "typing";
  const view = rowStateView[state];
  const filled = extraFilled(row);

  return (
    <li
      id={`bulk-row-${row.key}`}
      className={`scroll-mt-24 px-5 py-5 sm:px-6 ${state === "bad" ? "bg-[#fff8f8]" : ""}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <p className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[12.5px] font-bold tabular-nums text-soft-muted">
            {no}
          </span>
          <span className="truncate text-[15px] font-bold text-soft-ink">
            {row.name.trim() || `학생 ${no}`}
          </span>
          <span className={`inline-flex shrink-0 items-center gap-1.5 text-[12.5px] font-semibold ${view.tone}`}>
            <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${view.dot}`} />
            {view.text}
          </span>
        </p>
        <div className="-mr-2 flex items-center">
          <button
            type="button"
            onClick={onToggleExtra}
            aria-expanded={extraOpen}
            aria-controls={id("extra")}
            className="inline-flex h-11 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold text-soft-primary transition-colors hover:bg-soft-primary-soft"
          >
            선택 정보
            <span className="tabular-nums text-soft-muted">
              {filled}/{EXTRA_TOTAL}
            </span>
            <span aria-hidden className={`transition-transform ${extraOpen ? "rotate-180" : ""}`}>
              ▾
            </span>
          </button>
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              aria-label={`${no}번 줄 지우기`}
              className="inline-flex h-11 items-center rounded-full px-3 text-[13px] font-semibold text-soft-muted transition-colors hover:bg-slate-100 hover:text-soft-ink"
            >
              지우기
            </button>
          )}
        </div>
      </div>

      <div className="mt-3 grid gap-x-3 gap-y-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.15fr)_minmax(0,1.35fr)]">
        <Cell htmlFor={id("name")} label="이름" required error={err("name")}>
          <input
            id={id("name")}
            value={row.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="김하늘"
            autoComplete="off"
            aria-invalid={!!err("name")}
            className={ctl(!!err("name"))}
          />
        </Cell>

        <Cell
          htmlFor={id("birth")}
          label="생년월일"
          required
          error={err("birth")}
          hint={check.age !== null ? `만 ${check.age}세` : "8자리 숫자"}
        >
          <input
            id={id("birth")}
            inputMode="numeric"
            value={row.birth}
            onChange={(e) => onChange({ birth: e.target.value.replace(/\D/g, "").slice(0, 8) })}
            placeholder="20160312"
            autoComplete="off"
            aria-invalid={!!err("birth")}
            className={`${ctl(!!err("birth"))} tabular-nums`}
          />
        </Cell>

        <Cell
          htmlFor={id("level")}
          label="학교급 · 학년"
          required
          error={err("level") ?? err("grade")}
        >
          <div className="flex gap-2">
            <select
              id={id("level")}
              value={row.level}
              onChange={(e) => onChange({ level: e.target.value as BulkRow["level"], grade: "" })}
              aria-invalid={!!err("level")}
              className={`${ctl(!!err("level"))} min-w-0 flex-[1.15]`}
            >
              <option value="">학교급</option>
              {schoolLevels.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.id}
                </option>
              ))}
            </select>
            <select
              aria-label={`${no}번 학생 학년`}
              value={row.grade}
              disabled={!lv}
              onChange={(e) => onChange({ grade: e.target.value })}
              aria-invalid={!!err("grade")}
              className={`${ctl(!!err("grade"))} min-w-0 flex-1`}
            >
              <option value="">학년</option>
              {lv?.grades.map((g) => (
                <option key={g} value={String(g)}>
                  {g}학년
                </option>
              ))}
              {/* 불러온 값이 학교급 범위 밖이면 그대로 보여 주고 빨갛게 둔다 — 지우면
                  무엇이 틀렸는지 알 수 없다 */}
              {lv && row.grade && !lv.grades.includes(Number(row.grade)) && (
                <option value={row.grade}>{row.grade}학년</option>
              )}
            </select>
          </div>
        </Cell>

        <Cell
          htmlFor={id("phone")}
          label="아이 휴대전화"
          required
          error={err("phone")}
          hint={row.noPhone ? "없어도 됩니다. 안내는 보호자에게 갑니다." : undefined}
        >
          <div className="flex gap-2">
            <input
              id={id("phone")}
              type="tel"
              inputMode="numeric"
              value={row.noPhone ? "" : row.phone}
              disabled={row.noPhone}
              onChange={(e) =>
                onChange({ phone: e.target.value.replace(/[^\d-]/g, "").slice(0, 13) })
              }
              placeholder={row.noPhone ? "휴대전화 없음" : "010-1234-5678"}
              autoComplete="off"
              aria-invalid={!!err("phone")}
              className={`${ctl(!!err("phone"))} min-w-0 flex-1 tabular-nums`}
            />
            {/* 빈 칸과 「없음」은 다르다 — 빈 칸은 아직 안 적은 것이라 막는다(ChildNew와 같다) */}
            <button
              type="button"
              aria-pressed={row.noPhone}
              onClick={() => onChange({ noPhone: !row.noPhone, phone: "" })}
              className={`h-11 shrink-0 rounded-[10px] border px-3.5 text-[13px] font-semibold transition-colors ${
                row.noPhone
                  ? "border-soft-primary bg-soft-primary-soft text-soft-primary"
                  : "border-soft-line bg-white text-soft-muted hover:bg-slate-50"
              }`}
            >
              없음
            </button>
          </div>
        </Cell>
      </div>

      {check.notes.length > 0 && (
        <ul className="mt-3 space-y-1">
          {check.notes.map((n) => (
            <li key={n} className="text-[12.5px] leading-[1.6] text-soft-muted">
              · {n}
            </li>
          ))}
        </ul>
      )}

      {extraOpen && <ExtraFields id={id("extra")} row={row} onChange={onChange} />}
    </li>
  );
}

/** 명단 파일에서 온 값이 고르개에 없으면 알약으로 덧붙인다 — 버리면 적은 값이 사라진다 */
const withPicked = (base: string[], picked: string[]) => [
  ...base,
  ...picked.filter((p) => !base.includes(p)),
];

/** 선택 정보 여섯 — 한 명씩 등록(ChildNew)과 같은 고르개를 쓴다 */
function ExtraFields({
  id,
  row,
  onChange,
}: {
  id: string;
  row: BulkRow;
  onChange: (p: Partial<BulkRow>) => void;
}) {
  return (
    <div id={id} className="mt-4 rounded-[12px] border border-soft-line bg-slate-50/70 p-4 sm:p-5">
      <p className="text-[13px] font-semibold text-soft-muted">선택 정보 · 비워 두어도 등록됩니다</p>

      <div className="mt-3 grid gap-4 sm:grid-cols-3">
        <div>
          <p id={`${id}-gender`} className={lbl}>
            성별
          </p>
          <Chips
            labelledBy={`${id}-gender`}
            options={genders}
            picked={row.gender ? [row.gender] : []}
            onToggle={(v) => onChange({ gender: row.gender === v ? "" : v })}
          />
        </div>
        <Cell htmlFor={`${id}-region`} label="거주 지역">
          <select
            id={`${id}-region`}
            value={row.region}
            onChange={(e) => onChange({ region: e.target.value })}
            className={ctl(false)}
          >
            <option value="">시·도 고르기</option>
            {sidoList.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
            {row.region && !sidoList.includes(row.region) && (
              <option value={row.region}>{row.region}</option>
            )}
          </select>
        </Cell>
        <Cell htmlFor={`${id}-school`} label="학교명">
          <input
            id={`${id}-school`}
            value={row.school}
            onChange={(e) => onChange({ school: e.target.value })}
            placeholder="목동초등학교"
            autoComplete="off"
            className={ctl(false)}
          />
        </Cell>
      </div>

      <div className="mt-4">
        <p id={`${id}-interest`} className={lbl}>
          관심 분야 <span className="font-normal text-soft-muted">(여러 개 고를 수 있어요)</span>
        </p>
        <Chips
          labelledBy={`${id}-interest`}
          options={withPicked(interestAreas, row.interests)}
          picked={row.interests}
          onToggle={(v) => onChange({ interests: flip(row.interests, v) })}
        />
      </div>

      <div className="mt-4">
        <p id={`${id}-learning`} className={lbl}>
          학습 경험 <span className="font-normal text-soft-muted">(여러 개 고를 수 있어요)</span>
        </p>
        <Chips
          labelledBy={`${id}-learning`}
          options={withPicked(learningKinds, row.learning)}
          picked={row.learning}
          onToggle={(v) => onChange({ learning: flip(row.learning, v) })}
        />
      </div>

      <div className="mt-4">
        <label htmlFor={`${id}-observe`} className={lbl}>
          보호자가 관찰한 특성
        </label>
        <textarea
          id={`${id}-observe`}
          value={row.observation}
          maxLength={OBSERVATION_MAX}
          rows={3}
          onChange={(e) => onChange({ observation: e.target.value })}
          placeholder="예) 궁금한 게 생기면 답을 찾을 때까지 계속 물어봐요."
          className={`${ctl(false).replace("h-11 ", "")} mt-1.5 py-2.5 leading-relaxed`}
        />
        <p className="mt-1 text-right text-[12px] tabular-nums text-soft-muted">
          {row.observation.length}/{OBSERVATION_MAX}
        </p>
      </div>
    </div>
  );
}

/* ───────────────────────── 엑셀 · CSV 불러오기 ───────────────────────── */

/**
 * 명단 파일을 받는 자리 — 명단 표 머리에서 펼친다.
 *
 * 파일을 고르거나 붙여넣으면 곧바로 등록하지 않고 **몇 명으로 읽혔는지**를 단추에 적는다.
 * 「명단에 넣기」를 누르면 아래 명단 표에 줄로 들어가고, 거기서 틀린 칸을 고친다.
 */
function ImportPanel({
  onImport,
  onClose,
}: {
  onImport: (rows: BulkRow[]) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const found = text.trim() ? rowsFromText(text).length : 0;
  const heads = bulkColumnsFor(false).map((c) => c.label);

  const downloadTemplate = () => {
    const blob = new Blob([`﻿${templateCsv()}`], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "학생_일괄등록_양식.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div id="bulk-import" className="border-b border-soft-line bg-slate-50/70 px-5 py-5 sm:px-6">
      <h3 className="text-[15px] font-bold text-soft-ink">엑셀·CSV로 불러오기</h3>
      <ol className="mt-2 space-y-1 text-[13px] leading-[1.7] text-soft-muted">
        <li>1. 양식을 내려받아 채우거나, 쓰던 명단의 첫 줄(머리글)을 양식과 같게 맞춥니다.</li>
        <li>2. CSV 파일을 올리거나, 엑셀에서 표를 복사해 아래 칸에 붙여넣습니다.</li>
        <li>3. 「명단에 넣기」를 누르면 아래 명단에 들어갑니다. 빨간 칸만 고치면 됩니다.</li>
      </ol>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => fileRef.current?.click()} className={t.btnQuiet}>
          CSV 파일 올리기
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.tsv,.txt,text/csv,text/plain"
          className="sr-only"
          tabIndex={-1}
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            setText(await readTableFile(f));
            setFileName(f.name);
          }}
        />
        <button type="button" onClick={downloadTemplate} className={t.btnQuiet}>
          양식 내려받기
        </button>
        <button
          type="button"
          onClick={() => {
            setText(sampleText());
            setFileName(null);
          }}
          className="inline-flex h-11 items-center px-2 text-[13px] font-semibold text-soft-muted underline-offset-2 hover:text-soft-ink hover:underline"
        >
          예시 명단으로 채워 보기
        </button>
      </div>

      <label htmlFor="bulk-paste" className={`mt-4 block ${lbl}`}>
        {fileName ? `올린 파일 — ${fileName}` : "붙여넣기 칸"}
      </label>
      <textarea
        id="bulk-paste"
        rows={5}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setFileName(null);
        }}
        placeholder={`${heads.slice(0, 5).join("\t")}\n김하늘\t20160312\t초등\t4\t01012345678`}
        className="mt-1.5 w-full rounded-[12px] border border-soft-line bg-white px-4 py-3 font-mono text-[13px] leading-relaxed text-soft-ink outline-none placeholder:text-slate-400 focus:border-soft-primary focus:ring-2 focus:ring-soft-primary-soft"
      />
      <p className="mt-2 text-[12.5px] leading-[1.7] text-soft-muted">
        머리글 — {heads.join(" · ")}. 머리글이 있으면 열 순서가 달라도 됩니다. 관심 분야 · 학습
        경험처럼 여러 개 적는 칸은 「/」로 나눕니다. 엑셀 파일(.xlsx)은 CSV로 저장해 올리거나 표를
        복사해 붙여 주세요.
      </p>

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <button type="button" onClick={onClose} className={t.btnQuiet}>
          닫기
        </button>
        <button
          type="button"
          onClick={() => onImport(rowsFromText(text))}
          disabled={found === 0}
          className={`${t.btnAction} disabled:cursor-not-allowed disabled:bg-soft-line`}
        >
          {found > 0 ? `${found}명 명단에 넣기` : "명단에 넣기"}
        </button>
      </div>
    </div>
  );
}
