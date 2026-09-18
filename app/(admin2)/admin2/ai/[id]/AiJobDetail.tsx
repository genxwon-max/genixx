"use client";

import Link from "next/link";
import { Fragment, useMemo, useRef, useState } from "react";
import { n } from "@/lib/admin2";
import { useAdminPrefs } from "@/lib/adminStore";
import { useHydrated } from "@/lib/examStore";
import { aiModels, modelLabel } from "@/lib/aiModels";
import { promptConsts } from "@/lib/aiPromptConsts";
import {
  bySubject,
  fill,
  jobOf,
  promptSubjects,
  sampleVars,
  splitAtSlot,
  subjectSection,
  withSubject,
  type AiJob,
  type PromptSubject,
} from "@/lib/aiPrompts";
import {
  MAX_FILE_CHARS,
  blankStep,
  checkFlow,
  resetFlow,
  saveFlow,
  seedFlow,
  uid,
  useFlow,
  withExtra,
  type AiFile,
  type FlowStep,
} from "@/lib/aiFlowStore";
import {
  LeaveDialog,
  PageSaveBar,
  useEditDraft,
  useUnsavedGuard,
} from "@/components/admin2/EditGuard";
import { Body, PageHead, Panel, Tab } from "@/components/admin2/ui";

/**
 * ADM-13-1 AI 프롬프트 상세 — 이 업무의 AI 흐름을 짜는 자리.
 *
 * 한 판에 AI 하나. 위에서 아래로 도는 차례가 곧 화면의 차례이고, 앞 AI가 낸 것이 다음 AI의
 * 맨 앞에 붙는다. 그래서 자리를 옮기는 단추가 곧 흐름을 바꾸는 단추다.
 *
 * ── 설명을 붙이지 않는다 ──
 * 칸 이름이 제 일을 하면 설명이 필요 없고, 필요하다면 설명이 아니라 이름을 고쳐야 한다. 여기서
 * 하는 일은 넷뿐이다 — 이름 짓기, 프롬프트 쓰기, 파일 붙이기, AI 더하기.
 *
 * ── 과목 탭 ──
 * {{과목}}을 받는 업무에는 기본 · 국어 · 수학 · 과학 탭이 선다. 기본 탭이 흐름을 짜는 자리이고,
 * 과목 탭은 같은 흐름을 두고 AI마다 그 과목에만 붙일 요구사항을 적는 자리다(lib/aiPrompts.ts의
 * withSubject). 과목 탭에서는 AI를 더하거나 옮기지 않는다 — 흐름은 한 벌이다.
 *
 * 초안은 탭을 가로질러 하나다. 국어에 적고 과학으로 옮겨도 적은 것이 남고, 저장 한 번이
 * 네 탭을 함께 담는다. 그래서 탭을 옮길 때 붙잡지 않는다.
 *
 * ⚠ 출력 형식·윤리 규칙·연결 키는 이 화면에 없다. 서버가 호출할 때 붙인다 — 보여 주지 않으면
 *   고칠 수도, 새어 나갈 수도 없다.
 */
export default function AiJobDetail({ id }: { id: string }) {
  const job = jobOf(id);
  const hydrated = useHydrated();

  const back = (
    <Link href="/admin2/ai" className="a2-btn">
      ← AI 프롬프트
    </Link>
  );

  if (!job) {
    return (
      <>
        <PageHead title="찾지 못했습니다" back={back} />
        <Body>
          <Panel title="없는 업무">
            <p className="a2-t-sm text-(--a2-ink-2)">
              <span className="a2-mono">{id}</span> 은(는) 목록에 없는 업무입니다.
            </p>
          </Panel>
        </Body>
      </>
    );
  }

  /* 저장분은 브라우저에만 있다. 하이드레이션 전에 초안을 잡으면 씨앗 값이 붙들려,
     저장분이 들어와도 고친 것이 있다고 잘못 켜진다 */
  if (!hydrated) return <PageHead title={job.label} back={back} />;

  return <Desk job={job} back={back} />;
}

function Desk({ job, back }: { job: AiJob; back: React.ReactNode }) {
  const by = useAdminPrefs().staffName || "운영자";
  const flow = useFlow(job);

  const draft = useEditDraft({ steps: flow.steps });
  const steps = draft.value.steps;

  const [run, setRun] = useState<RunLine[] | null>(null);

  const tabbed = bySubject(job);
  /** null이 기본 탭 */
  const [subject, setSubject] = useState<PromptSubject | null>(null);
  /* 예시 실행은 한 과목으로 조립한 것이라 탭을 옮기면 걷는다 — 남겨 두면 과학 탭 아래에
     국어로 조립한 입력이 서 있다 */
  const pickTab = (s: PromptSubject | null) => {
    setSubject(s);
    setRun(null);
  };

  const findings = useMemo(() => checkFlow(job, steps), [job, steps]);
  const bad = findings.length > 0;

  const set = (next: FlowStep[]) => draft.set("steps", next);
  const patch = (id: string, p: Partial<FlowStep>) =>
    set(steps.map((s) => (s.id === id ? { ...s, ...p } : s)));

  const add = () => set([...steps, blankStep(steps.length + 1)]);
  const remove = (id: string) => set(steps.filter((s) => s.id !== id));
  const move = (at: number, dir: -1 | 1) => {
    const to = at + dir;
    if (to < 0 || to >= steps.length) return;
    const next = [...steps];
    [next[at], next[to]] = [next[to], next[at]];
    set(next);
  };

  const save = () => {
    if (bad) return false;
    return saveFlow(job, steps, by);
  };
  const guard = useUnsavedGuard(draft.dirty, save, draft.reset);

  /* 초안을 씨앗으로 직접 맞춘다. reset()은 이 렌더가 붙들고 있는 저장분으로 되돌리는 것이라,
     방금 지운 저장분이 아니라 **지우기 전 값**으로 돌아간다 — 화면에는 지운 단계가 그대로
     남고 「저장하지 않은 변경」이 켜진다 */
  const toSeed = () => {
    const what = tabbed ? "AI 흐름과 과목 요구사항" : "AI 흐름";
    if (!window.confirm(`${job.label}의 ${what}을 기본값으로 되돌립니다.\n\n되돌릴까요?`)) return;
    resetFlow(job, by);
    draft.set("steps", seedFlow(job).steps);
    setRun(null);
  };

  return (
    <>
      <PageHead
        title={job.label}
        back={back}
        actions={
          <>
            <button type="button" className="a2-btn" onClick={toSeed}>
              기본값으로
            </button>
            <button
              type="button"
              className="a2-btn"
              disabled={bad}
              onClick={() => setRun(makeRun(job, steps, subject))}
            >
              예시로 돌려보기
            </button>
            {subject === null && (
              <button type="button" className="a2-btn a2-btn-primary" onClick={add}>
                + AI 추가
              </button>
            )}
          </>
        }
        tabsLabel="과목별 프롬프트"
        tabs={
          tabbed
            ? [null, ...promptSubjects].map((s) => (
                <Tab
                  key={s ?? "base"}
                  label={s ?? "기본"}
                  active={subject === s}
                  onClick={() => pickTab(s)}
                />
              ))
            : undefined
        }
      />

      <Body className="grid gap-3">
        {subject === null ? (
          <>
            {steps.map((s, i) => (
              <StepCard
                key={s.id}
                job={job}
                step={s}
                at={i}
                last={i === steps.length - 1}
                only={steps.length === 1}
                onPatch={(p) => patch(s.id, p)}
                onMove={(dir) => move(i, dir)}
                onRemove={() => remove(s.id)}
              />
            ))}

            <div className="flex justify-center">
              <button type="button" className="a2-btn" onClick={add}>
                + AI 추가
              </button>
            </div>
          </>
        ) : (
          steps.map((s, i) => (
            <SubjectCard
              key={`${subject}-${s.id}`}
              step={s}
              at={i}
              subject={subject}
              onChange={(text) => set(steps.map((x) => (x.id === s.id ? withExtra(x, subject, text) : x)))}
              onEditBase={() => pickTab(null)}
            />
          ))
        )}

        {findings.length > 0 && (
          <div className="grid gap-1">
            {findings.map((f, i) => (
              <p key={i} className="a2-note" style={{ borderLeftColor: "var(--a2-danger)" }}>
                <span>{f.text}</span>
              </p>
            ))}
          </div>
        )}

        {run && (
          <RunPanel job={job} steps={steps} subject={subject} lines={run} onClose={() => setRun(null)} />
        )}

        {/* 저장 줄은 Body 안에 둔다. -mx-3으로 본문 여백을 되무는 조각이라 밖에 세우면
            그 음수 여백이 되물 것이 없어 판 밖으로 삐져나간다 */}
        <PageSaveBar dirty={draft.dirty} onSave={save} onCancel={draft.reset} disabled={bad} />
      </Body>

      <LeaveDialog guard={guard} />
    </>
  );
}

/* ── AI 한 칸 ── */
function StepCard({
  job,
  step,
  at,
  last,
  only,
  onPatch,
  onMove,
  onRemove,
}: {
  job: AiJob;
  step: FlowStep;
  at: number;
  last: boolean;
  only: boolean;
  onPatch: (p: Partial<FlowStep>) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}) {
  const pick = useRef<HTMLInputElement>(null);
  const box = useRef<HTMLTextAreaElement>(null);

  /* 자리표를 커서 자리에 끼운다. 목록에서 읽고 손으로 옮겨 적게 두면 {{학년}}처럼
     한 글자가 어긋나고, 어긋난 자리표는 채워지지 않은 채 글자 그대로 나간다 */
  const put = (key: string) => {
    const el = box.current;
    if (!el) return onPatch({ prompt: `${step.prompt}${key}` });
    const a = el.selectionStart ?? step.prompt.length;
    const b = el.selectionEnd ?? a;
    onPatch({ prompt: step.prompt.slice(0, a) + key + step.prompt.slice(b) });
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(a + key.length, a + key.length);
    });
  };

  /* 필수는 1번 AI에서만 본다 — 2번부터는 앞 AI가 낸 것을 받는다 */
  const must = at === 0 ? job.vars.filter((v) => v.must) : [];
  const gone = must.filter((v) => !step.prompt.includes(v.key));

  const addFiles = async (list: FileList | null) => {
    if (!list) return;
    const made: AiFile[] = [];
    for (const f of Array.from(list)) {
      const readable =
        /^text\//.test(f.type) ||
        /json|csv|xml|markdown/.test(f.type) ||
        /\.(txt|md|csv|tsv|json|xml)$/i.test(f.name);
      let body: string | undefined;
      if (readable) {
        const raw = await f.text();
        body = raw.length > MAX_FILE_CHARS ? raw.slice(0, MAX_FILE_CHARS) : raw;
      }
      made.push({
        id: uid("f"),
        name: f.name,
        size: f.size,
        text: body != null,
        body,
      });
    }
    onPatch({ files: [...step.files, ...made] });
    if (pick.current) pick.current.value = "";
  };

  return (
    <Panel
      title={`${at + 1}번 AI`}
      meta={at > 0 ? `${at}번 AI의 결과를 받습니다` : undefined}
      actions={
        <>
          <button type="button" className="a2-btn a2-btn-sm" disabled={at === 0} onClick={() => onMove(-1)}>
            ↑
          </button>
          <button type="button" className="a2-btn a2-btn-sm" disabled={last} onClick={() => onMove(1)}>
            ↓
          </button>
          <button
            type="button"
            className="a2-btn a2-btn-sm a2-btn-danger"
            disabled={only}
            onClick={onRemove}
          >
            지우기
          </button>
        </>
      }
    >
      <div className="grid gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <input
            className="a2-input"
            style={{ maxWidth: "16rem" }}
            value={step.name}
            onChange={(e) => onPatch({ name: e.target.value })}
            placeholder="이름"
            aria-label={`${at + 1}번 AI 이름`}
          />
          <select
            className="a2-select w-auto"
            value={step.model}
            onChange={(e) => onPatch({ model: e.target.value })}
            aria-label={`${at + 1}번 AI 모델`}
          >
            {aiModels.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        <textarea
          ref={box}
          className="a2-textarea"
          rows={Math.min(20, Math.max(6, step.prompt.split("\n").length + 1))}
          value={step.prompt}
          onChange={(e) => onPatch({ prompt: e.target.value })}
          placeholder="프롬프트"
          aria-label={`${at + 1}번 AI 프롬프트`}
        />

        {/* 자리표는 접어 둔다. 프롬프트를 쓸 때만 필요한 목록이라 늘 펴 두면 판이 두 배가 된다.
            빠진 필수가 있을 때만 요약 줄이 붉어진다 — 접힌 채로도 무엇이 잘못됐는지 보인다 */}
        <details className="a2-note" style={{ borderLeftColor: gone.length > 0 ? "var(--a2-danger)" : "var(--a2-line-2)" }}>
          <summary className="cursor-pointer select-none">
            자리표 {job.vars.length}개
            {must.length > 0 && <> · 필수 {must.length}개</>}
            {gone.length > 0 && (
              <b className="text-(--a2-danger)"> — {gone.map((v) => v.key).join(" ")} 빠짐</b>
            )}
          </summary>
          <ul className="mt-2 grid gap-1">
            {job.vars.map((v) => {
              const on = step.prompt.includes(v.key);
              return (
                <li key={v.key} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <button
                    type="button"
                    onClick={() => put(v.key)}
                    className="a2-mono shrink-0 text-(--a2-accent) hover:underline"
                    aria-label={`${v.key} 넣기`}
                  >
                    {v.key}
                  </button>
                  {v.must && (
                    <span
                      className="shrink-0"
                      style={{ color: on ? "var(--a2-ok)" : "var(--a2-danger)" }}
                    >
                      필수{on ? "" : " · 빠짐"}
                    </span>
                  )}
                  <span className="min-w-0 text-(--a2-ink-3)">{v.desc}</span>
                </li>
              );
            })}
          </ul>
        </details>

        <div className="flex flex-wrap items-center gap-1.5">
          {step.files.map((f) => (
            <span key={f.id} className="a2-tag inline-flex items-center gap-1.5">
              {f.name}
              <span className="a2-num text-(--a2-ink-4)">{kb(f.size)}</span>
              {!f.text && <span className="text-(--a2-ink-4)">이름만</span>}
              <button
                type="button"
                aria-label={`${f.name} 지우기`}
                className="text-(--a2-ink-4) hover:text-(--a2-danger)"
                onClick={() => onPatch({ files: step.files.filter((x) => x.id !== f.id) })}
              >
                ×
              </button>
            </span>
          ))}
          <button type="button" className="a2-btn a2-btn-sm" onClick={() => pick.current?.click()}>
            파일 붙이기
          </button>
          <input
            ref={pick}
            type="file"
            multiple
            hidden
            onChange={(e) => addFiles(e.target.files)}
          />
        </div>
      </div>
    </Panel>
  );
}

/* ── 과목 탭의 AI 한 칸 ──
   기본 프롬프트는 읽기만 한다. 여기서 고치게 두면 세 과목이 저마다 다른 기본을 들게 되고,
   기본의 한 줄을 고칠 때 세 번 고쳐야 한다. 고칠 것은 기본 탭에서, 여기서는 이 과목에만
   붙일 것을 적는다.

   요구사항이 들어갈 자리를 프롬프트 안에 칠해 보여 준다. 「맨 끝에 붙습니다」를 글로
   적는 것보다 실제로 들어간 모습이 빨리 읽힌다 — 이 판이 곧 이 과목의 프롬프트다. */
function SubjectCard({
  step,
  at,
  subject,
  onChange,
  onEditBase,
}: {
  step: FlowStep;
  at: number;
  subject: PromptSubject;
  onChange: (text: string) => void;
  onEditBase: () => void;
}) {
  const text = step.extra?.[subject] ?? "";
  const section = subjectSection(subject, step.extra);
  const parts = splitAtSlot(step.prompt);

  const mark = section ? (
    <mark className="rounded-sm bg-(--a2-accent-soft) px-0.5 font-semibold text-(--a2-accent-2)">
      {section}
    </mark>
  ) : (
    <mark className="bg-transparent text-(--a2-ink-4)">({subject} 요구사항 없음)</mark>
  );

  return (
    <Panel
      title={`${at + 1}번 AI`}
      meta={`${step.name} · ${modelLabel(step.model)}`}
      actions={
        <button type="button" className="a2-btn a2-btn-sm" onClick={onEditBase}>
          기본 프롬프트 고치기
        </button>
      }
    >
      <div className="grid gap-2.5">
        <label className="grid gap-1">
          <span className="a2-label">{subject} 요구사항</span>
          <textarea
            className="a2-textarea"
            rows={Math.min(12, Math.max(3, text.split("\n").length + 1))}
            value={text}
            onChange={(e) => onChange(e.target.value)}
            placeholder={`${subject} 문항에만 붙일 것`}
            aria-label={`${at + 1}번 AI ${subject} 요구사항`}
          />
        </label>

        <div>
          <p className="a2-label">{subject} 프롬프트</p>
          <pre className="mt-1 overflow-x-auto rounded-(--a2-radius) border border-(--a2-line) bg-(--a2-raised) p-2.5 a2-t-xs leading-[1.7] whitespace-pre-wrap text-(--a2-ink-3)">
            {/* withSubject와 같은 모양으로 그린다 — 자리표가 없으면 끝을 다듬고 한 줄 띄워 붙인다 */}
            {parts.length === 1 ? (
              <>
                {step.prompt.trimEnd()}
                {"\n\n"}
                {mark}
              </>
            ) : (
              parts.map((p, i) => (
                <Fragment key={i}>
                  {i > 0 && mark}
                  {p}
                </Fragment>
              ))
            )}
          </pre>
        </div>
      </div>
    </Panel>
  );
}

/* ── 예시 실행 ──
   모델을 부르지 않는다. 들어가는 것은 실제로 조립한 값이고(프롬프트 + 과목 요구사항 + 앞
   결과 + 붙인 파일), 나오는 것은 씨앗에 써 둔 예시다. 흐름이 어떻게 이어지는지를 눈으로
   보는 자리다.

   예시는 한 벌(국어)뿐이다. 과목 탭에서 돌리면 그 국어 예시에 이 탭의 요구사항만 붙인다.
   {{과목}}만 과학으로 바꿔 두면 성취기준·하위요소·예시 입력·나온 것은 여전히 국어라, 과학
   예시처럼 보이는 국어 예시가 된다 — 바꾸지 않고 판 머리에 무엇을 붙였는지 적는다. */
type RunLine = { name: string; model: string; input: string; output: string };

function makeRun(job: AiJob, steps: FlowStep[], subject: PromptSubject | null): RunLine[] {
  const out: RunLine[] = [];
  let prev = "";
  steps.forEach((s, i) => {
    const parts: string[] = [];
    if (i === 0) parts.push(job.sampleIn);
    else parts.push(`[${steps[i - 1].name}의 결과]\n${prev}`);
    parts.push(fill(withSubject(s.prompt, subject, s.extra), promptConsts, true));
    for (const f of s.files) {
      parts.push(f.text && f.body ? `[붙인 파일 ${f.name}]\n${f.body.slice(0, 1200)}` : `[붙인 파일 ${f.name}]`);
    }
    const output = job.sampleOut[Math.min(i, job.sampleOut.length - 1)] ?? "";
    out.push({ name: s.name, model: s.model, input: parts.join("\n\n"), output });
    prev = output;
  });
  return out;
}

function RunPanel({
  job,
  steps,
  subject,
  lines,
  onClose,
}: {
  job: AiJob;
  steps: FlowStep[];
  subject: PromptSubject | null;
  lines: RunLine[];
  onClose: () => void;
}) {
  const sample = sampleVars["{{과목}}"];
  const meta = !bySubject(job)
    ? "예시입니다"
    : subject === null
      ? "예시입니다 · 과목 요구사항 없이"
      : subject === sample
        ? `예시입니다 · ${subject}`
        : `예시입니다 · ${sample} 예시에 ${subject} 요구사항을 붙였습니다`;

  return (
    <Panel
      title="예시 실행"
      meta={meta}
      actions={
        <button type="button" className="a2-btn a2-btn-sm" onClick={onClose}>
          닫기
        </button>
      }
      flush
    >
      {/* 흐름 한 줄 — 무엇이 무엇으로 이어지는지 */}
      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 border-b border-(--a2-line) bg-(--a2-raised) px-3 py-2">
        <span className="a2-t-sm text-(--a2-ink-3)">{job.label}</span>
        {steps.map((s, i) => (
          <span key={s.id} className="inline-flex items-baseline gap-1.5">
            <span aria-hidden className="a2-t-xs text-(--a2-ink-4)">
              ›
            </span>
            <span className="a2-t-sm font-semibold text-(--a2-ink)">
              {i + 1}. {s.name}
            </span>
            {s.files.length > 0 && (
              <span className="a2-t-xs text-(--a2-ink-4)">📎{s.files.length}</span>
            )}
          </span>
        ))}
        <span aria-hidden className="a2-t-xs text-(--a2-ink-4)">
          ›
        </span>
        <span className="a2-t-sm text-(--a2-ink-3)">결과</span>
      </div>

      <ul className="divide-y divide-(--a2-line)">
        {lines.map((l, i) => (
          <li key={i} className="grid gap-2 p-3 lg:grid-cols-2">
            <div>
              <p className="a2-label">
                {i + 1}. {l.name} — 들어간 것
              </p>
              <pre className="mt-1 max-h-72 overflow-auto rounded-(--a2-radius) border border-(--a2-line) bg-(--a2-raised) p-2.5 a2-t-xs leading-[1.7] whitespace-pre-wrap text-(--a2-ink-2)">
                {l.input}
              </pre>
            </div>
            <div>
              <p className="a2-label">나온 것</p>
              <pre className="mt-1 max-h-72 overflow-auto rounded-(--a2-radius) border border-(--a2-accent-line) bg-(--a2-accent-soft) p-2.5 a2-t-xs leading-[1.7] whitespace-pre-wrap text-(--a2-ink)">
                {l.output}
              </pre>
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

const kb = (size: number) => (size < 1024 ? `${size}B` : `${n(Math.round(size / 1024))}KB`);
