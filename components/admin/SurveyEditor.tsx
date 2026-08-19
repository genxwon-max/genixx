"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { can } from "@/lib/admin";
import { recordAction, useAdminPrefs } from "@/lib/adminStore";
import { surveyKeys, useExamStore } from "@/lib/examStore";
import type { SurveyKey } from "@/lib/examStore";
import { surveyBands, type SurveyBand } from "@/lib/surveyBands";
import {
  MAX_ITEMS,
  MAX_UPLOAD_BYTES,
  actionLabel,
  addDraftItem,
  copyItemsToOtherBands,
  diffForms,
  discardDraft,
  docIdOf,
  draftChanges,
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
  type SurveyDocId,
  type SurveyForm,
  type SurveyLogEntry,
} from "@/lib/surveyStore";
import { fieldShape } from "./DataList";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Callout, Foldable, PageHead, TableCard } from "./Parts";
import * as a from "./ui";

/**
 * 설문 원본 (ADM-14).
 *
 * 한 설문은 **갈래 × 학년대**로 한 벌씩 있다. 어머니·아버지·지도교사 셋에 초3~4 ·
 * 초5~6 · 중1 · 중2~3 넷이니 열두 벌이다. 초3에게 묻는 말과 중3에게 묻는 말이 같을
 * 수 없어서인데, 열두 벌을 늘어놓으면 아무도 관리하지 못한다. 그래서 화면은 언제나
 * **한 벌만** 보여 준다 — 위에서 갈래와 학년대를 고르면 그 한 벌이 아래에 열린다.
 *
 * ── 화면을 줄인 규칙 ──
 *
 * 1) 한 번에 한 구역만 연다. 문항 · 안내 문구 · 파일로 올리기 · 변경 기록을 접이식
 *    으로 세로로 이어 두었더니, 하나를 펼칠 때마다 아래 것이 통째로 밀려 내려가
 *    무엇을 보다 말았는지 잊게 되었다.
 *
 *    다만 **모양을 갈래 단추와 같게 두지 않는다.** 알약 단추 세 줄을 위아래로
 *    포개 두었더니 어느 줄이 무엇을 묻는지 읽히지 않았다. 묻는 것이 둘이므로
 *    모양도 둘이다 —
 *
 *      어느 설문인가   고르는 상자 둘(갈래 · 학년대). 열두 벌을 두 번에 좁힌다.
 *      무엇을 보는가   밑줄 탭 넷. 고른 설문 안에서 자리를 옮기는 것뿐이라 가볍게.
 *
 *    콘솔의 다른 화면은 갈래가 한 겹뿐이라 알약 단추를 쓴다. 여기만 두 겹이라
 *    윗겹을 상자로 내린 것이지, 모양을 마음대로 바꾼 것이 아니다.
 * 2) 설명은 적지 않는다. 「발행해야 응답자 화면이 바뀝니다」는 발행 단추를 누를 때
 *    대화상자가 말한다 — 정작 필요한 자리에서 한 번 말하는 편이 낫다.
 * 3) 학년대마다 문항이 갈릴 이유가 없을 때가 많으므로 「다른 학년대에도 이 문항
 *    쓰기」를 둔다. 없으면 「초3~4만 고치고 나머지를 잊는」 일이 반드시 생긴다.
 *
 * 초안과 나가는 판을 갈라 두는 것은 그대로다. 한 벌만 두면 오타를 고치는 순간
 * 답을 쓰고 있던 학부모의 화면이 바뀌고, 그 회차 자료는 반쪽이 된다.
 */
/** 한 설문에서 볼 수 있는 구역. 한 번에 하나만 연다. */
type ViewId = "items" | "texts" | "upload" | "log";

const views: { id: ViewId; label: string }[] = [
  { id: "items", label: "문항" },
  { id: "texts", label: "안내 문구" },
  { id: "upload", label: "파일로 올리기" },
  { id: "log", label: "변경 기록" },
];

export default function SurveyEditor() {
  const prefs = useAdminPrefs();
  const docs = useSurveyDocs();
  const log = useSurveyLog();
  const records = useExamStore();

  const [key, setKey] = useState<SurveyKey>("mother");
  const [band, setBand] = useState<SurveyBand>("e34");
  const [view, setView] = useState<ViewId>("items");
  const [ask, setAsk] = useState<
    null | { mode: "publish" } | { mode: "revert"; entry: SurveyLogEntry }
  >(null);

  const docId = docIdOf(key, band);
  const doc = docs[docId];
  const by = prefs.staffName || "운영자";
  const mayEdit = can(prefs.role, "item.write");
  const mayPublish = can(prefs.role, "item.review");
  const changes = draftChanges(doc);

  /* 이 갈래로 들어온 응답 수. 학년대까지 갈라 세지 않는다 — 응시 기록에는 학년대가
     없고, 발행 전에 짚어야 할 것은 「이미 답이 들어와 있다」는 사실 하나다. */
  const answered = useMemo(
    () => Object.values(records).filter((r) => r?.surveys?.[key] === "done").length,
    [records, key],
  );

  const warnings = publishWarnings(doc, answered);
  const mine = log.filter((e) => e.docId === docId);
  const bandLabel = surveyBands.find((b) => b.id === band)!.label;

  return (
    <>
      <PageHead
        title="설문 원본"
        action={
          <>
            {mayEdit && changes.length > 0 && (
              <button
                type="button"
                onClick={() => discardDraft(docId, by)}
                className={a.btnGhost}
              >
                고친 것 버리기
              </button>
            )}
            <button
              type="button"
              disabled={!mayPublish || changes.length === 0}
              onClick={() => setAsk({ mode: "publish" })}
              className={!mayPublish || changes.length === 0 ? a.btnDisabled : a.btnPrimary}
            >
              {changes.length === 0 ? "발행할 것 없음" : `v${doc.liveVersion + 1}로 발행하기`}
            </button>
          </>
        }
      />

      {/* ── 어느 한 벌인가 ── */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className={a.label}>고른 설문</span>
        <Choose
          label="설문 갈래"
          value={key}
          onChange={(v) => setKey(v as SurveyKey)}
          width="w-40"
          options={surveyKeys.map((k) => ({
            value: k,
            label: docs[docIdOf(k, band)].live.who,
          }))}
        />
        <Choose
          label="학년대"
          value={band}
          onChange={(v) => setBand(v as SurveyBand)}
          width="w-48"
          /* 어느 학년대에 손댄 것이 남아 있는지 열기 전에 보여야 한다 */
          options={surveyBands.map((b) => {
            const waiting = draftChanges(docs[docIdOf(key, b.id)]).length;
            return {
              value: b.id,
              label: waiting > 0 ? `${b.label} · 수정 ${waiting}곳` : b.label,
            };
          })}
        />
      </div>

      {/* ── 그 설문의 무엇을 보는가 ──
          알약이 아니라 밑줄 탭이다. 위가 「무엇을 고르는가」이고 여기는 「고른 것
          안에서 어디를 보는가」라, 같은 모양으로 포개면 두 줄이 한 덩어리로 읽힌다. */}
      <nav aria-label="설문 구역" className="mt-5 flex flex-wrap border-b border-exam-line">
        {views.map((v) => {
          const on = v.id === view;
          const n = v.id === "items" ? doc.draft.items.length : v.id === "log" ? mine.length : null;
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => setView(v.id)}
              aria-current={on ? "page" : undefined}
              className={`-mb-px min-h-[2.75rem] border-b-2 px-4 py-2.5 adm-t-md transition-colors ${
                on
                  ? "border-brand-900 font-black text-brand-800"
                  : "border-transparent font-bold text-exam-muted hover:text-exam-text"
              }`}
            >
              {v.label}
              {n !== null && <span className="ml-1.5 tabular-nums">{n}</span>}
            </button>
          );
        })}
      </nav>

      {!mayEdit && (
        <div className="mt-4">
          <Callout tone="info">보기만 할 수 있습니다. 고치는 것은 출제 권한이 있는 사람이 합니다.</Callout>
        </div>
      )}

      <div className="mt-6">
        {/* 한 벌을 옮기면 문항 구역을 새로 세운다(key). 「다른 학년대에도 쓰기」를
            물어보던 중에 학년대를 바꾸면, 엉뚱한 벌의 문항이 넷으로 퍼진다. */}
        {view === "items" && (
          <Items key={docId} doc={doc} docId={docId} by={by} mayEdit={mayEdit} />
        )}
        {view === "texts" && <Texts doc={doc} docId={docId} by={by} />}
        {view === "upload" && <UploadBox key={docId} docId={docId} doc={doc} by={by} />}
        {view === "log" && (
          <History
            entries={mine}
            liveVersion={doc.liveVersion}
            mayPublish={mayPublish}
            onRevert={(entry) => setAsk({ mode: "revert", entry })}
          />
        )}
      </div>

      {/* 판 정보는 맨 아래다. 매번 읽을 값이 아니라 「지금 무엇이 나가고 있더라」를
          한 번 확인하는 값이라, 일하는 자리 위를 차지할 까닭이 없다. */}
      <p className={`${a.hint} mt-8 border-t border-exam-line pt-4`}>
        {doc.code} · {bandLabel} · 지금 나가는 판{" "}
        <b className="text-exam-text">v{doc.liveVersion}</b> · 발행 {doc.publishedAt} ·{" "}
        {doc.publishedBy}
        {changes.length > 0 && (
          <b className="ml-2 font-bold text-amber-700">발행하지 않은 수정 {changes.length}곳</b>
        )}
      </p>

      {ask?.mode === "publish" && (
        <ReasonBox
          title={`${bandLabel} ${doc.live.who} 설문을 v${doc.liveVersion + 1}로 발행합니다`}
          lead={`누르는 즉시 이 학년대 응답자의 화면이 새 판으로 바뀝니다. 다른 학년대는 그대로입니다. ${by} 님의 이름과 사유가 기록과 감사 로그에 남습니다.`}
          lines={changes}
          warnings={warnings}
          confirmLabel="기록을 남기고 발행"
          onClose={() => setAsk(null)}
          onConfirm={(reason) => {
            const entry = publishDraft(docId, by, reason);
            recordAction(`${bandLabel} ${doc.live.title} v${entry.version}`, "설문 발행", reason, by);
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
              ? [`이미 이 갈래로 들어온 응답이 ${answered}건 있습니다. 되돌린 뒤의 응답은 다른 판으로 집계됩니다.`]
              : []
          }
          confirmLabel="기록을 남기고 되돌리기"
          onClose={() => setAsk(null)}
          onConfirm={(reason) => {
            const entry = revertTo(docId, ask.entry.id, by, reason);
            if (entry) {
              recordAction(`${bandLabel} ${doc.live.title} v${entry.version}`, "설문 되돌리기", reason, by);
            }
            setAsk(null);
          }}
        />
      )}
    </>
  );
}

/**
 * 열두 벌 중 한 벌을 고르는 상자.
 *
 * 단추로 늘어놓으면 갈래 셋 + 학년대 넷으로 일곱 개가 두 줄을 차지하고, 아래
 * 구역 탭까지 세 줄이 포개진다. 고르는 일은 하루에 몇 번뿐이라 상자로 접어 둔다.
 */
function Choose({
  label,
  value,
  options,
  onChange,
  width,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  width: string;
}) {
  return (
    <Select items={options} value={value} onValueChange={(v) => onChange(String(v ?? value))}>
      <SelectTrigger aria-label={label} className={`${fieldShape} ${width} bg-white`}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value} className="adm-field">
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/* ───────────────────────── 문항 ───────────────────────── */

function Items({
  doc,
  docId,
  by,
  mayEdit,
}: {
  doc: SurveyDoc;
  docId: SurveyDocId;
  by: string;
  mayEdit: boolean;
}) {
  const [askCopy, setAskCopy] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);
  const items = doc.draft.items;

  return (
    <section>
      <p className={`${a.hint} text-right`}>최대 {MAX_ITEMS}개 · 5점 척도로 답합니다</p>

      <ol className="mt-2 space-y-2.5">
        {items.map((item, n) => (
          <li key={item.id} className="rounded-md border border-exam-line bg-white p-3.5">
            <div className="flex items-start gap-3">
              <span className="mt-2.5 w-6 shrink-0 text-right adm-t-md font-bold tabular-nums text-exam-muted">
                {n + 1}
              </span>
              <textarea
                rows={2}
                value={item.text}
                disabled={!mayEdit}
                onChange={(e) => patchDraftItem(docId, item.id, e.target.value, by)}
                placeholder="예) 아이는 관심 있는 주제를 만나면 시키지 않아도 오래 파고듭니다."
                className={`${a.input} resize-y`}
                aria-label={`${n + 1}번 문항`}
              />
            </div>
            {mayEdit && (
              <div className="mt-2 flex flex-wrap gap-2 pl-9">
                <button
                  type="button"
                  onClick={() => moveDraftItem(docId, item.id, -1, by)}
                  disabled={n === 0}
                  className={n === 0 ? `${a.btnRowGhost} opacity-40` : a.btnRowGhost}
                >
                  위로
                </button>
                <button
                  type="button"
                  onClick={() => moveDraftItem(docId, item.id, 1, by)}
                  disabled={n === items.length - 1}
                  className={n === items.length - 1 ? `${a.btnRowGhost} opacity-40` : a.btnRowGhost}
                >
                  아래로
                </button>
                <button
                  type="button"
                  onClick={() => removeDraftItem(docId, item.id, by)}
                  className={`${a.btnRowGhost} text-rose-700`}
                >
                  삭제
                </button>
              </div>
            )}
          </li>
        ))}
      </ol>

      {items.length === 0 && (
        <p className={`${a.bodyText} py-6 text-center`}>문항이 없습니다. 아래에서 더하세요.</p>
      )}

      {mayEdit && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => addDraftItem(docId, by)}
            disabled={items.length >= MAX_ITEMS}
            className={items.length >= MAX_ITEMS ? a.btnDisabled : a.btnGhost}
          >
            + 문항 추가
          </button>

          {askCopy ? (
            <button
              type="button"
              onClick={() => {
                setCopied(copyItemsToOtherBands(docId, by));
                setAskCopy(false);
              }}
              className={a.btnDanger}
            >
              다른 세 학년대의 문항을 정말 이걸로 덮어쓰기
            </button>
          ) : (
            <button type="button" onClick={() => setAskCopy(true)} className={a.btnGhost}>
              다른 학년대에도 이 문항 쓰기
            </button>
          )}
        </div>
      )}

      {askCopy && (
        <p className="mt-2 adm-t-sm font-bold text-rose-700">
          다른 세 학년대의 초안 문항이 사라지고 이 {items.length}개로 바뀝니다. 나가는 판은 그대로라,
          학년대마다 따로 발행해야 응답자에게 나갑니다.
        </p>
      )}

      {copied !== null && (
        <div className="mt-3">
          <Callout tone="good">
            다른 학년대 {copied}곳의 초안을 이 문항으로 맞췄습니다. 학년대를 골라 확인한 뒤 각각
            발행하세요.
          </Callout>
        </div>
      )}
    </section>
  );
}

/* ───────────────────────── 안내 문구 ───────────────────────── */

function Texts({ doc, docId, by }: { doc: SurveyDoc; docId: SurveyDocId; by: string }) {
  const d = doc.draft;
  const set = (patch: Partial<SurveyForm>) => patchDraft(docId, patch, by);

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="제목" value={d.title} onChange={(v) => set({ title: v })} />
        <Field label="응답자" value={d.who} onChange={(v) => set({ who: v })} />
      </div>
      <Field label="안내문" value={d.desc} onChange={(v) => set({ desc: v })} rows={3} />
      <Field
        label="고지 문구"
        hint="개인정보 안내와 어긋나지 않게 적어 주세요"
        value={d.note}
        onChange={(v) => set({ note: v })}
        rows={3}
      />
      <div className="border-t border-exam-line pt-4">
        <p className={a.label}>자유서술 칸</p>
        <p className={`${a.hint} mt-1`}>점수로 세지 않고 리포트에 표현 그대로 인용됩니다.</p>
        <div className="mt-3 grid gap-4">
          <Field label="이름표" value={d.openLabel} onChange={(v) => set({ openLabel: v })} />
          <Field label="도움말" value={d.openHint} onChange={(v) => set({ openHint: v })} rows={2} />
          <Field
            label="예시글"
            value={d.placeholder}
            onChange={(v) => set({ placeholder: v })}
            rows={2}
          />
        </div>
      </div>
    </div>
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

/* ───────────────────────── 파일 올리기 ───────────────────────── */

/**
 * 올리자마자 초안에 밀어 넣지 않는다. 무엇이 읽혔는지 먼저 보여 주고, 붙일지 바꿀지를
 * 그다음에 고르게 한다. 「바꾸기」는 지금 문항을 통째로 버리는 일이라 한 번 더 묻는다.
 */
function UploadBox({ docId, doc, by }: { docId: SurveyDocId; doc: SurveyDoc; by: string }) {
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
    uploadDraftItems(docId, got.parsed.items, mode, got.name, by);
    setGot(null);
    setAskReplace(false);
  };

  const over30 = got ? got.parsed.items.length + doc.draft.items.length > MAX_ITEMS : false;

  return (
    <div>
      <p className={`${a.hint} leading-relaxed`}>
        <b className="font-bold text-exam-text">한 줄에 한 문항</b>으로 읽습니다. 줄 앞의 「1.」
        「-」 같은 번호는 떼어 냅니다. CSV·TXT·TSV·JSON,{" "}
        {Math.round(MAX_UPLOAD_BYTES / 1024)}KB까지. 지금 고르고 있는 학년대의 초안에만 들어갑니다.
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
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── 변경 기록 ───────────────────────── */

function History({
  entries,
  liveVersion,
  mayPublish,
  onRevert,
}: {
  entries: SurveyLogEntry[];
  liveVersion: number;
  mayPublish: boolean;
  onRevert: (entry: SurveyLogEntry) => void;
}) {
  if (entries.length === 0) {
    return <p className={a.bodyText}>아직 이 설문을 고친 기록이 없습니다.</p>;
  }

  return (
    <TableCard
      title={`판 ${entries.length}건`}
      caption="발행 건은 그때 내보낸 판 전체를 함께 보관해, 언제든 그 판으로 되돌릴 수 있습니다."
    >
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
          {entries.map((e) => (
            <tr key={e.id}>
              <td className={a.tdTight}>{e.at}</td>
              <td className={a.tdStrongTight}>{e.by}</td>
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
              <td className={a.tdTight}>{e.version ? `v${e.version}` : "초안"}</td>
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
                {e.snapshot && e.version !== liveVersion ? (
                  <button
                    type="button"
                    onClick={() => onRevert(e)}
                    disabled={!mayPublish}
                    className={mayPublish ? a.btnRowGhost : `${a.btnRowGhost} opacity-50`}
                  >
                    이 판으로 되돌리기
                  </button>
                ) : e.version === liveVersion ? (
                  <span className={a.hint}>지금 나가는 판</span>
                ) : (
                  <span className={a.hint}>—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableCard>
  );
}

/* ───────────────────────── 사유 받기 ───────────────────────── */

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
