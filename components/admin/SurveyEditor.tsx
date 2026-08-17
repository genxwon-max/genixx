"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { can } from "@/lib/admin";
import { recordAction, useAdminPrefs } from "@/lib/adminStore";
import { surveyKeys, useExamStore, type SurveyKey } from "@/lib/examStore";
import {
  actionLabel,
  addDraftItem,
  diffForms,
  discardDraft,
  draftChanges,
  MAX_ITEMS,
  MAX_UPLOAD_BYTES,
  moveDraftItem,
  parseSurveyFile,
  patchDraft,
  patchDraftItem,
  publishDraft,
  publishWarnings,
  removeDraftItem,
  revertTo,
  uploadDraftItems,
  uploadKindOf,
  useSurveyDocs,
  useSurveyLog,
  type ParsedUpload,
  type SurveyDoc,
  type SurveyForm,
  type SurveyLogEntry,
} from "@/lib/surveyStore";
import { Callout, Foldable, PageHead, TableCard } from "./Parts";
import * as a from "./ui";

/**
 * ADM-14 설문 원본.
 *
 * 이 화면이 지키는 것은 하나다 — **고치는 것과 내보내는 것을 갈라 둔다.**
 * 왼쪽에서 아무리 고쳐도 학부모 화면은 그대로이고, 「발행」을 눌러야 바뀐다.
 * 그래야 설문이 도는 중에 문항이 갈리는 일이 없고, 언제 무엇이 바뀌었는지가
 * 판 번호 하나로 정리된다.
 *
 * 권한도 문항과 같은 방식으로 맞물린다. 고치는 것은 출제 권한(item.write),
 * 내보내는 것은 검수 권한(item.review)이다. 쓴 사람이 스스로 내보내지 못하게
 * 갈라 두는 것이 이 콘솔의 전제다(정의서 9장).
 */
export default function SurveyEditor() {
  const prefs = useAdminPrefs();
  const docs = useSurveyDocs();
  const log = useSurveyLog();
  const records = useExamStore();

  const [key, setKey] = useState<SurveyKey>("mother");
  const [ask, setAsk] = useState<null | { mode: "publish" } | { mode: "revert"; entry: SurveyLogEntry }>(
    null,
  );

  const doc = docs[key];
  const by = prefs.staffName || "운영자";
  const mayEdit = can(prefs.role, "item.write");
  const mayPublish = can(prefs.role, "item.review");
  const changes = draftChanges(doc);

  /* 어느 판에 대한 응답이 몇 건 들어와 있는지. 판 번호가 없는 옛 응답은 v1로 본다. */
  const collected = useMemo(() => {
    const map = new Map<number, number>();
    for (const rec of Object.values(records)) {
      if (rec?.surveys?.[key] !== "done") continue;
      const v = rec.surveyVersion?.[key] ?? 1;
      map.set(v, (map.get(v) ?? 0) + 1);
    }
    return [...map.entries()].sort((x, y) => y[0] - x[0]);
  }, [records, key]);
  const answered = collected.reduce((n, [, c]) => n + c, 0);

  const warnings = publishWarnings(doc, answered);
  const mine = log.filter((e) => e.key === key);

  return (
    <>
      <PageHead
        id="ADM-14 · ASM-05 · ASM-06"
        title="설문 원본"
        lead="학부모·교사 설문의 문항과 안내 문구를 고칩니다. 고친 것은 초안에만 담기고, 발행해야 응답자 화면이 바뀝니다. 발행·되돌리기는 사유와 함께 기록에 남습니다."
      />

      {/* 어느 설문을 보고 있는지. 셋을 한 줄에 두고 각각의 상태를 함께 적는다. */}
      <div className="grid gap-2 sm:grid-cols-3">
        {surveyKeys.map((k) => {
          const d = docs[k];
          const waiting = draftChanges(d).length;
          const on = k === key;
          return (
            <button
              key={k}
              type="button"
              onClick={() => setKey(k)}
              aria-pressed={on}
              className={`rounded-lg border px-4 py-3.5 text-left transition-colors ${
                on ? "border-brand-900 bg-brand-50" : "border-exam-line bg-white hover:bg-exam-raised"
              }`}
            >
              <span className="block adm-t-md font-bold text-exam-text">{d.live.title}</span>
              <span className="mt-1 block adm-t-sm text-exam-muted">
                {d.code} · 문항 {d.live.items.length}개 · 지금 나가는 판 v{d.liveVersion}
              </span>
              <span
                className={`mt-1 block adm-t-sm font-bold ${
                  waiting > 0 ? "text-amber-700" : "text-emerald-700"
                }`}
              >
                {waiting > 0 ? `발행 대기 ${waiting}곳` : "발행된 판과 같음"}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── 지금 상태와 발행 (ADM-14-2) ── */}
      <section id="ADM-14-2" className={`${a.panel} mt-5 scroll-mt-28 p-6`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className={a.cardTitle}>{doc.live.title}</h2>
            <p className={`${a.hint} mt-1.5`}>
              지금 나가는 판 <b className="text-exam-text">v{doc.liveVersion}</b> · 발행{" "}
              {doc.publishedAt} · {doc.publishedBy}
            </p>
            <p className={`${a.hint} mt-0.5`}>
              초안 마지막 수정 {doc.draftAt} · {doc.draftBy}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setAsk({ mode: "publish" })}
              disabled={changes.length === 0 || !mayPublish}
              className={changes.length > 0 && mayPublish ? a.btnPrimary : a.btnDisabled}
            >
              v{doc.liveVersion + 1}로 발행하기
            </button>
            {changes.length > 0 && mayEdit && (
              <button type="button" onClick={() => discardDraft(key, by)} className={a.btnGhost}>
                초안 버리기
              </button>
            )}
          </div>
        </div>

        <div className="mt-5">
          {changes.length === 0 ? (
            <Callout tone="good" title="초안과 나가는 판이 같습니다">
              지금 학부모·교사에게 보이는 설문이 아래 초안 그대로입니다.
            </Callout>
          ) : (
            <Callout tone="warn" title={`아직 발행하지 않은 수정 ${changes.length}곳`}>
              <ul className="space-y-1">
                {changes.slice(0, 8).map((line) => (
                  <li key={line}>· {line}</li>
                ))}
                {changes.length > 8 && <li>· 외 {changes.length - 8}곳</li>}
              </ul>
              <p className="mt-2 adm-t-sm text-exam-muted">
                발행하기 전까지 응답자 화면은 v{doc.liveVersion} 그대로입니다.
              </p>
            </Callout>
          )}
        </div>

        {!mayPublish && (
          <p className={`${a.hint} mt-4`}>
            발행은 검수 권한이 있는 사람이 누릅니다. 고쳐 두시면 검수자가 확인하고 내보냅니다.
          </p>
        )}

        {/* 판별 응답 수 — 문항을 바꾸기 전에 「이미 몇 건이 이 판에 답했는지」를 본다 */}
        <div className="mt-5 border-t border-exam-line pt-4">
          <p className={a.label}>들어온 응답</p>
          {answered === 0 ? (
            <p className={`${a.hint} mt-1.5`}>아직 이 설문에 들어온 응답이 없습니다.</p>
          ) : (
            <ul className="mt-1.5 flex flex-wrap gap-x-5 gap-y-1">
              {collected.map(([v, n]) => (
                <li key={v} className="adm-t-md text-exam-text">
                  <b>v{v}</b> <span className="tabular-nums">{n}</span>건
                  {v !== doc.liveVersion && <span className={`${a.hint} ml-1`}>(지난 판)</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_26rem]">
        <div>
          {mayEdit ? (
            <Draft doc={doc} surveyKey={key} by={by} />
          ) : (
            <section id="ADM-14-1" className={`${a.panel} scroll-mt-28 p-6`}>
              <h2 className={a.cardTitle}>초안 (읽기만)</h2>
              <p className={`${a.bodyText} mt-2`}>
                지금 역할에는 문항을 고칠 권한(출제)이 없습니다. 아래 미리보기로 내용은 확인하실 수
                있고, 발행 여부만 판단하시면 됩니다.
              </p>
            </section>
          )}
        </div>

        <Preview form={doc.draft} dirty={changes.length > 0} />
      </div>

      {/* ── 기록 (ADM-14-3) ── */}
      <div id="ADM-14-3" className="mt-6 scroll-mt-28">
        <TableCard
          title={`변경 기록 ${mine.length}건`}
          caption="발행·되돌리기·파일 올리기가 남습니다. 발행 건은 그때 내보낸 판 전체를 함께 보관해, 언제든 그 판으로 되돌릴 수 있습니다."
        >
          {mine.length === 0 ? (
            <p className={`${a.bodyText} px-5 py-8`}>아직 이 설문을 고친 기록이 없습니다.</p>
          ) : (
            <table className={a.table}>
              <thead>
                <tr>
                  <th className={a.th}>시각</th>
                  <th className={a.th}>사람</th>
                  <th className={a.th}>한 일</th>
                  <th className={a.th}>판</th>
                  <th className={a.th}>사유</th>
                  <th className={a.th}>달라진 것</th>
                  <th className={a.th}>할 일</th>
                </tr>
              </thead>
              <tbody>
                {mine.map((e) => (
                  <tr key={e.id}>
                    <td className={`${a.td} whitespace-nowrap`}>{e.at}</td>
                    <td className={a.tdStrong}>{e.by}</td>
                    <td className={a.td}>
                      <span
                        className={`${a.badge} ${
                          e.action === "publish"
                            ? "text-emerald-700"
                            : e.action === "revert"
                              ? "text-amber-700"
                              : "text-exam-muted"
                        }`}
                      >
                        {actionLabel[e.action]}
                      </span>
                    </td>
                    <td className={a.td}>{e.version ? `v${e.version}` : "초안"}</td>
                    <td className={`${a.td} min-w-[14rem]`}>{e.reason}</td>
                    <td className={`${a.td} min-w-[18rem]`}>
                      {e.lines.length === 0 ? (
                        "—"
                      ) : (
                        <ul className="space-y-0.5">
                          {e.lines.map((line, n) => (
                            <li key={`${e.id}-${n}`}>· {line}</li>
                          ))}
                        </ul>
                      )}
                    </td>
                    <td className={a.td}>
                      {e.snapshot && e.version !== doc.liveVersion ? (
                        <button
                          type="button"
                          onClick={() => setAsk({ mode: "revert", entry: e })}
                          disabled={!mayPublish}
                          className={mayPublish ? a.btnRowGhost : `${a.btnRowGhost} opacity-50`}
                        >
                          이 판으로 되돌리기
                        </button>
                      ) : e.version === doc.liveVersion ? (
                        <span className={a.hint}>지금 나가는 판</span>
                      ) : (
                        <span className={a.hint}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </TableCard>
      </div>

      {ask?.mode === "publish" && (
        <ReasonBox
          title={`v${doc.liveVersion + 1}로 발행합니다`}
          lead={`누르는 즉시 학부모·교사 화면이 새 판으로 바뀝니다. 이미 답을 쓰고 있던 분은 다음에 열 때부터 새 문항을 봅니다. ${by} 님의 이름과 사유가 기록과 감사 로그에 남습니다.`}
          lines={changes}
          warnings={warnings}
          confirmLabel="기록을 남기고 발행"
          onClose={() => setAsk(null)}
          onConfirm={(reason) => {
            const entry = publishDraft(key, by, reason);
            recordAction(`${doc.live.title} v${entry.version}`, "설문 발행", reason, by);
            setAsk(null);
          }}
        />
      )}

      {ask?.mode === "revert" && (
        <ReasonBox
          title={`v${ask.entry.version} 내용으로 되돌립니다`}
          lead={`그 판의 문항을 그대로 다시 내보냅니다. 번호는 되쓰지 않고 v${doc.liveVersion + 1}로 나갑니다 — 같은 번호가 두 가지 설문을 가리키면 응답을 판별할 수 없기 때문입니다.`}
          /* 그때 무엇이 바뀌었는지(entry.lines)가 아니라, 지금 되돌리면 무엇이
             달라지는지를 보여 준다. 사람이 눌러야 할지 판단하는 값은 이쪽이다. */
          lines={ask.entry.snapshot ? diffForms(doc.live, ask.entry.snapshot) : []}
          warnings={
            answered > 0
              ? [`이미 v${doc.liveVersion}로 들어온 응답이 있습니다. 되돌린 뒤의 응답은 다른 판으로 집계됩니다.`]
              : []
          }
          confirmLabel="기록을 남기고 되돌리기"
          onClose={() => setAsk(null)}
          onConfirm={(reason) => {
            const entry = revertTo(key, ask.entry.id, by, reason);
            if (entry) {
              recordAction(`${doc.live.title} v${entry.version}`, "설문 되돌리기", reason, by);
            }
            setAsk(null);
          }}
        />
      )}
    </>
  );
}

/* ───────────────────────── 초안 편집 ───────────────────────── */

function Draft({ doc, surveyKey, by }: { doc: SurveyDoc; surveyKey: SurveyKey; by: string }) {
  const d = doc.draft;
  const set = (patch: Partial<SurveyForm>) => patchDraft(surveyKey, patch, by);

  return (
    <section id="ADM-14-1" className={`${a.panel} scroll-mt-28 p-6`}>
      <h2 className={a.cardTitle}>초안 고치기</h2>
      <p className={`${a.hint} mt-1.5`}>
        여기서 고친 것은 곧바로 저장되지만, 발행 전까지는 응답자에게 나가지 않습니다.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field label="제목" value={d.title} onChange={(v) => set({ title: v })} />
        <Field
          label="응답자"
          hint="화면에 「응답자 어머니」처럼 적힙니다"
          value={d.who}
          onChange={(v) => set({ who: v })}
        />
      </div>

      <div className="mt-4">
        <Field
          label="안내문"
          hint="설문 첫머리에 나가는 설명입니다"
          value={d.desc}
          onChange={(v) => set({ desc: v })}
          rows={3}
        />
      </div>

      <div className="mt-4">
        <Field
          label="고지 문구"
          hint="응답이 어디에 쓰이는지 알리는 줄입니다. 개인정보 안내와 어긋나지 않게 적어 주세요."
          value={d.note}
          onChange={(v) => set({ note: v })}
          rows={3}
        />
      </div>

      {/* ── 문항 ── */}
      <div className="mt-7 border-t border-exam-line pt-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className={a.label}>
            문항 <span className="tabular-nums">{d.items.length}</span>개
          </p>
          <p className={a.hint}>최대 {MAX_ITEMS}개 · 5점 척도로 답합니다</p>
        </div>

        <ol className="mt-3 space-y-2.5">
          {d.items.map((item, n) => (
            <li key={item.id} className="rounded-md border border-exam-line p-3.5">
              <div className="flex items-start gap-3">
                <span className="mt-2.5 w-6 shrink-0 text-right adm-t-md font-bold tabular-nums text-exam-muted">
                  {n + 1}
                </span>
                <textarea
                  rows={2}
                  value={item.text}
                  onChange={(e) => patchDraftItem(surveyKey, item.id, e.target.value, by)}
                  placeholder="예) 아이는 관심 있는 주제를 만나면 시키지 않아도 오래 파고듭니다."
                  className={`${a.input} resize-y`}
                  aria-label={`${n + 1}번 문항`}
                />
              </div>
              <div className="mt-2 flex flex-wrap gap-2 pl-9">
                <button
                  type="button"
                  onClick={() => moveDraftItem(surveyKey, item.id, -1, by)}
                  disabled={n === 0}
                  className={n === 0 ? `${a.btnRowGhost} opacity-40` : a.btnRowGhost}
                >
                  위로
                </button>
                <button
                  type="button"
                  onClick={() => moveDraftItem(surveyKey, item.id, 1, by)}
                  disabled={n === d.items.length - 1}
                  className={
                    n === d.items.length - 1 ? `${a.btnRowGhost} opacity-40` : a.btnRowGhost
                  }
                >
                  아래로
                </button>
                <button
                  type="button"
                  onClick={() => removeDraftItem(surveyKey, item.id, by)}
                  className={`${a.btnRowGhost} text-rose-700`}
                >
                  삭제
                </button>
              </div>
            </li>
          ))}
        </ol>

        {d.items.length === 0 && (
          <p className={`${a.bodyText} py-6 text-center`}>문항이 없습니다. 아래에서 더하세요.</p>
        )}

        <button
          type="button"
          onClick={() => addDraftItem(surveyKey, by)}
          disabled={d.items.length >= MAX_ITEMS}
          className={`${d.items.length >= MAX_ITEMS ? a.btnDisabled : a.btnGhost} mt-3`}
        >
          + 문항 추가
        </button>
      </div>

      {/* ── 파일로 올리기 ── */}
      <UploadBox surveyKey={surveyKey} doc={doc} by={by} />

      {/* ── 자유서술 칸 ── */}
      <div className="mt-7 border-t border-exam-line pt-5">
        <p className={a.label}>자유서술 칸</p>
        <p className={`${a.hint} mt-1`}>
          점수로 세지 않는 칸입니다. 리포트의 「발견의 순간」에 표현 그대로 인용됩니다.
        </p>
        <div className="mt-3 grid gap-4">
          <Field label="이름표" value={d.openLabel} onChange={(v) => set({ openLabel: v })} />
          <Field label="도움말" value={d.openHint} onChange={(v) => set({ openHint: v })} rows={2} />
          <Field
            label="예시글 (빈 칸에 흐리게 뜨는 글)"
            value={d.placeholder}
            onChange={(v) => set({ placeholder: v })}
            rows={2}
          />
        </div>
      </div>
    </section>
  );
}

function Field({
  label,
  hint,
  value,
  onChange,
  rows,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <label className="block">
      <span className={a.label}>{label}</span>
      {hint && <span className={`${a.hint} mt-0.5 block`}>{hint}</span>}
      {rows ? (
        <textarea
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${a.input} mt-1.5 resize-y`}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${a.input} mt-1.5`}
        />
      )}
    </label>
  );
}

/**
 * 파일로 문항 올리기.
 *
 * 올리자마자 초안에 밀어 넣지 않는다. 무엇이 읽혔는지 먼저 보여 주고, 붙일지 바꿀지를
 * 그다음에 고르게 한다. 「바꾸기」는 지금 문항을 통째로 버리는 일이라 한 번 더 묻는다.
 */
function UploadBox({ surveyKey, doc, by }: { surveyKey: SurveyKey; doc: SurveyDoc; by: string }) {
  const [over, setOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [got, setGot] = useState<{ name: string; parsed: ParsedUpload } | null>(null);
  const [askReplace, setAskReplace] = useState(false);

  const take = async (files: FileList | File[] | null) => {
    const file = files && Array.from(files)[0];
    if (!file) return;
    setAskReplace(false);
    if (!uploadKindOf(file)) {
      setGot(null);
      return setError(`${file.name} — CSV·TXT·TSV·JSON만 올릴 수 있습니다.`);
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setGot(null);
      return setError(`${file.name} — ${Math.round(MAX_UPLOAD_BYTES / 1024)}KB를 넘습니다.`);
    }
    const text = await file.text();
    const parsed = parseSurveyFile(file.name, text);
    setError(parsed.error ?? null);
    setGot(parsed.error ? null : { name: file.name, parsed });
  };

  const put = (mode: "append" | "replace") => {
    if (!got) return;
    uploadDraftItems(surveyKey, got.parsed.items, mode, got.name, by);
    setGot(null);
    setAskReplace(false);
  };

  const over30 = got ? got.parsed.items.length + doc.draft.items.length > MAX_ITEMS : false;

  return (
    <div className="mt-7 border-t border-exam-line pt-5">
      <p className={a.label}>파일로 문항 올리기</p>
      <p className={`${a.hint} mt-1 leading-relaxed`}>
        <b className="font-bold text-exam-text">한 줄에 한 문항</b>으로 읽습니다. 줄 앞의 「1.」
        「-」 같은 번호는 떼어 냅니다. 쉼표로 칸을 나누지 않으므로 문항 안의 쉼표는 그대로
        남습니다. CSV·TXT·TSV·JSON, {Math.round(MAX_UPLOAD_BYTES / 1024)}KB까지.
      </p>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          void take(e.dataTransfer.files);
        }}
        className={`mt-2.5 rounded-md border border-dashed p-4 text-center transition-colors ${
          over ? "border-brand-700 bg-brand-50" : "border-exam-line bg-exam-raised"
        }`}
      >
        <p className="adm-t-sm font-bold text-exam-text">
          {over ? "여기에 놓으세요" : "여기에 파일을 끌어다 놓으세요"}
        </p>
        <label className="mt-2.5 inline-block">
          <span className={`${a.btnGhost} cursor-pointer`}>파일 고르기</span>
          <input
            type="file"
            accept=".csv,.txt,.tsv,.json"
            onChange={(e) => {
              void take(e.target.files);
              e.target.value = "";
            }}
            className="sr-only"
          />
        </label>
      </div>

      {error && (
        <p role="alert" className="mt-2 adm-t-sm font-bold text-rose-700">
          {error}
        </p>
      )}

      {got && (
        <div className="mt-3 rounded-md border border-exam-line p-4">
          <p className={a.strongText}>
            {got.name} — {got.parsed.items.length}건을 읽었습니다
          </p>
          {got.parsed.skipped > 0 && (
            <p className={`${a.hint} mt-1`}>빈 줄 {got.parsed.skipped}개는 건너뛰었습니다.</p>
          )}

          <ol className="mt-3 max-h-64 space-y-1 overflow-y-auto">
            {got.parsed.items.map((text, n) => (
              <li key={`${text}-${n}`} className="flex gap-2 adm-t-md text-exam-text">
                <span className="w-5 shrink-0 text-right tabular-nums text-exam-muted">{n + 1}</span>
                <span className="min-w-0">{text}</span>
              </li>
            ))}
          </ol>

          {over30 && (
            <p className="mt-3 adm-t-sm font-bold text-amber-700">
              붙이면 {MAX_ITEMS}개를 넘습니다. 넘는 만큼은 잘립니다.
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={() => put("append")} className={a.btnGhost}>
              기존 문항 뒤에 붙이기
            </button>
            {askReplace ? (
              <button type="button" onClick={() => put("replace")} className={a.btnDanger}>
                기존 {doc.draft.items.length}개를 정말 버리고 바꾸기
              </button>
            ) : (
              <button type="button" onClick={() => setAskReplace(true)} className={a.btnGhost}>
                기존 문항을 모두 바꾸기
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setGot(null);
                setAskReplace(false);
              }}
              className={a.btnGhost}
            >
              취소
            </button>
          </div>
          {askReplace && (
            <p className="mt-2 adm-t-sm font-bold text-rose-700">
              지금 초안의 문항 {doc.draft.items.length}개가 사라집니다. 되돌릴 수 없습니다.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── 미리보기 ───────────────────────── */

const scale = ["전혀 아니다", "아니다", "보통이다", "그렇다", "매우 그렇다"];

/** 응답자가 보게 될 화면. 누를 수 없는 그림이라 입력 요소를 쓰지 않는다. */
function Preview({ form, dirty }: { form: SurveyForm; dirty: boolean }) {
  return (
    <section className={`${a.panel} p-5 xl:sticky xl:top-6 xl:self-start`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className={a.cardTitle}>미리보기</h2>
        <span className={`${a.badge} ${dirty ? "text-amber-700" : "text-emerald-700"}`}>
          {dirty ? "발행 전 초안" : "지금 나가는 판"}
        </span>
      </div>
      <p className={`${a.hint} mt-1`}>학부모·교사에게 이렇게 보입니다.</p>

      <div className="mt-4 max-h-[38rem] overflow-y-auto rounded-md border border-exam-line bg-exam-panel p-4">
        <p className="adm-t-md font-black text-exam-text">{form.title}</p>
        <p className={`${a.hint} mt-1`}>응답자 {form.who}</p>
        <p className="mt-2 adm-t-sm leading-relaxed text-exam-muted">{form.desc}</p>
        <p className="mt-3 rounded border border-exam-line bg-white px-3 py-2.5 adm-t-sm leading-relaxed text-exam-muted">
          {form.note}
        </p>

        <ol className="mt-3 space-y-2">
          {form.items.map((item, n) => (
            <li key={item.id} className="rounded border border-exam-line bg-white p-3">
              <p className="adm-t-sm font-medium leading-relaxed text-exam-text">
                <span className="mr-1.5 font-bold tabular-nums text-exam-muted">{n + 1}.</span>
                {item.text || <span className="text-rose-700">(빈 문항)</span>}
              </p>
              <div className="mt-2 grid grid-cols-5 gap-1" aria-hidden>
                {scale.map((s, v) => (
                  <span
                    key={s}
                    className="flex flex-col items-center gap-1 rounded border border-exam-line px-1 py-1.5 text-center adm-t-xs leading-tight text-exam-muted"
                  >
                    <span className="flex h-4 w-4 items-center justify-center rounded border border-exam-line tabular-nums">
                      {v + 1}
                    </span>
                    {s}
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-2 rounded border border-exam-line bg-white p-3">
          <p className="adm-t-sm font-bold text-exam-text">
            {form.openLabel}
            <span className="ml-1.5 rounded border border-exam-line px-1.5 py-0.5 adm-t-xs font-medium text-exam-muted">
              선택
            </span>
          </p>
          <p className={`${a.hint} mt-1`}>{form.openHint}</p>
          <p className="mt-2 rounded border border-exam-line px-3 py-3 adm-t-sm text-exam-muted">
            {form.placeholder}
          </p>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── 사유 받기 ───────────────────────── */

/**
 * 발행·되돌리기 전에 사유를 받는다.
 *
 * 이 콘솔은 개인정보를 열 때도 사유를 받는다. 설문은 아이 한 명이 아니라 그 회차
 * 전체가 답하는 도구라, 왜 바꿨는지가 남지 않으면 뒤에 자료를 읽는 사람이 판 사이의
 * 차이를 해석할 수 없다.
 */
function ReasonBox({
  title,
  lead,
  lines,
  warnings,
  confirmLabel,
  onConfirm,
  onClose,
}: {
  title: string;
  lead: string;
  lines: string[];
  warnings: string[];
  confirmLabel: string;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const boxRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    boxRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const short = reason.trim().length < 10;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-brand-950/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="survey-reason-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-exam-line bg-white p-6 sm:p-8">
        <h2 id="survey-reason-title" className={a.pageTitle}>
          {title}
        </h2>
        <p className={`${a.bodyText} mt-2.5`}>{lead}</p>

        {warnings.length > 0 && (
          <div className="mt-5">
            <Callout tone="warn" title="짚고 넘어갈 것">
              <ul className="space-y-1">
                {warnings.map((w) => (
                  <li key={w}>· {w}</li>
                ))}
              </ul>
            </Callout>
          </div>
        )}

        <div className="mt-5">
          <Foldable title={`달라지는 것 ${lines.length}곳`} open={lines.length <= 8}>
            {lines.length === 0 ? (
              <p className={a.bodyText}>달라지는 것이 없습니다.</p>
            ) : (
              <ul className="space-y-1">
                {lines.map((line, n) => (
                  <li key={`${line}-${n}`} className="adm-t-md text-exam-text">
                    · {line}
                  </li>
                ))}
              </ul>
            )}
          </Foldable>
        </div>

        <div className="mt-5">
          <label htmlFor="survey-reason" className={a.label}>
            왜 바꾸는지 적어 주세요
          </label>
          <p className={`${a.hint} mt-1`}>
            예: 3~4학년 보호자가 「파고듭니다」를 어려워한다는 문의가 반복되어 문장을 고침
          </p>
          <textarea
            id="survey-reason"
            ref={boxRef}
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="10자 이상 적어 주세요"
            className={`${a.input} mt-2 resize-none`}
          />
          <p className={`mt-1.5 adm-t-sm font-bold ${short ? "text-rose-700" : "text-emerald-700"}`}>
            {short ? `${10 - reason.trim().length}자 더 적어 주세요` : "충분히 입력되었습니다"}
          </p>
        </div>

        <div className="mt-7 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={short}
            onClick={() => onConfirm(reason.trim())}
            className={short ? a.btnDisabled : a.btnPrimary}
          >
            {confirmLabel}
          </button>
          <button type="button" onClick={onClose} className={a.btnGhost}>
            그만두기
          </button>
        </div>
      </div>
    </div>
  );
}
