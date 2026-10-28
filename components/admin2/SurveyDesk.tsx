"use client";

import { useState } from "react";
import { surveyBandOf } from "@/lib/surveyBands";
import {
  MAX_ITEMS,
  MAX_UPLOAD_BYTES,
  actionLabel,
  diffForms,
  draftChanges,
  isSurveyLink,
  modeOf,
  surveyModeLabel,
  type SurveyMode,
  parseSurveyFile,
  publishWarnings,
  uploadKindOf,
  type ParsedUpload,
  type SurveyChoice,
  type SurveyDoc,
  type SurveyForm,
  type SurveyItem,
  type SurveyLogEntry,
  type SurveyOpen,
} from "@/lib/surveyStore";
import ReasonDialog from "./ReasonDialog";
import TableBox from "./TableBox";
import { Body, PageHead, Panel, Status, Tab } from "./ui";

/**
 * ADM-14 설문 관리 — 한 벌(갈래 × 학년대)을 고치고 발행하는 자리.
 *
 * 옛 콘솔의 설문 원본(components/admin/SurveyEditor.tsx, 2026-09-27 걷어 냄)을 이 콘솔의 모양으로
 * 다시 세웠다(2026-10-28). 그사이 설문지가 v1.0으로 바뀌어 묻는 방식이 셋(5점 척도 · 모두 고르기 ·
 * 서술)이 되었으므로 문항 탭도 셋이다.
 *
 * ── 초안과 나가는 판 ──
 * 고치는 것은 모두 **초안**이고 고치는 즉시 저장된다. 응답자 화면은 「발행」을 눌러야 바뀐다 — 한 벌만
 * 두면 오타를 고치는 순간 답을 쓰고 있던 학부모의 화면이 바뀌고 그 회차 자료는 반쪽이 된다. 그래서
 * 이 화면에는 저장 단추가 없고 발행 단추만 있다. 발행 · 되돌리기는 사유(10자 이상)를 받고, 그때
 * 바뀌는 것을 한 줄씩 보여 준다.
 *
 * ── 권한 ──
 * 고치는 것은 문항 작성 권한(item.write), 발행 · 되돌리기는 검수 권한(item.review)이 한다 — 문항과
 * 같은 짝이다. 자기가 고친 설문을 자기가 내보내지 못하게.
 *
 * 읽는 쪽과 그리는 쪽을 갈랐다. 실제 화면(app/(admin2)/admin2/surveys/[id]/SurveyDetail.tsx)이 저장소의
 * 벌과 손잡이(act)를 넘기고, 디자인 보기(/design2/admin2/surveys/…)는 값과 다음 상태로 가는 손잡이를 넘긴다.
 */

export type SurveyTab = "items" | "choices" | "opens" | "texts" | "upload" | "log";

const tabs: { id: SurveyTab; label: string }[] = [
  { id: "items", label: "척도 문항" },
  { id: "choices", label: "고르기 문항" },
  { id: "opens", label: "서술 문항" },
  { id: "texts", label: "안내 문구" },
  { id: "upload", label: "파일로 올리기" },
  { id: "log", label: "변경 기록" },
];

/** 고치는 손잡이 — 실제 화면은 저장소(lib/surveyStore.ts)에, 디자인은 다음 상태로 잇는다 */
export type SurveyActs = {
  patch: (patch: Partial<SurveyForm>) => void;
  patchItem: (id: string, patch: Partial<Omit<SurveyItem, "id">>) => void;
  addItem: () => void;
  removeItem: (id: string) => void;
  moveItem: (id: string, dir: 1 | -1) => void;
  patchChoice: (id: string, patch: Partial<Omit<SurveyChoice, "id">>) => void;
  addChoice: () => void;
  removeChoice: (id: string) => void;
  patchOpen: (id: string, patch: Partial<Omit<SurveyOpen, "id">>) => void;
  addOpen: () => void;
  removeOpen: (id: string) => void;
  moveEntry: (list: "choices" | "opens", id: string, dir: 1 | -1) => void;
  /** 다른 학년대에도 이 문항 쓰기 — 맞춘 벌 수를 돌려준다 */
  copyToOtherBands: () => number;
  upload: (texts: string[], mode: "append" | "replace", fileName: string) => void;
  discard: () => void;
  publish: (reason: string) => void;
  revert: (entryId: string, reason: string) => void;
};

/** 열려 있는 확인 창 */
export type SurveyAsk = null | { mode: "publish" } | { mode: "revert"; entryId: string };

export default function SurveyDesk({
  doc,
  log,
  answered,
  mayEdit,
  mayPublish,
  by,
  back,
  acts,
  tab: startTab = "items",
  ask: startAsk = null,
  onTab,
}: {
  doc: SurveyDoc;
  /** 이 벌의 기록 — 늦은 것이 위 */
  log: SurveyLogEntry[];
  /** 이 갈래로 이미 들어온 응답 수 — 발행 전에 짚는다 */
  answered: number;
  mayEdit: boolean;
  mayPublish: boolean;
  by: string;
  back: React.ReactNode;
  acts: SurveyActs;
  /** 처음 연 탭 — 디자인 보기가 상태마다 정한다 */
  tab?: SurveyTab;
  /** 처음부터 열린 확인 창 — 디자인 보기만 넘긴다 */
  ask?: SurveyAsk;
  /** 탭을 옮겼을 때 — 디자인 보기는 그 탭의 주소로 간다. 넘기지 않으면 화면 안에서만 옮긴다 */
  onTab?: (tab: SurveyTab) => void;
}) {
  const [tabState, setTab] = useState<SurveyTab>(startTab);
  const [ask, setAsk] = useState<SurveyAsk>(startAsk);
  const changes = draftChanges(doc);
  const band = surveyBandOf(doc.band);
  const d = doc.draft;
  const mode = modeOf(d);

  /* 외부 설문 링크로 받을 때는 문항이 나가지 않는다 — 문항 탭을 걷고 안내 문구 · 기록만 남긴다.
     문항은 지우지 않으므로 직접 입력으로 되돌리면 그대로 다시 선다 */
  const shown = mode === "link" ? tabs.filter((t) => t.id === "texts" || t.id === "log") : tabs;
  const want = onTab ? startTab : tabState;
  const tab = shown.some((t) => t.id === want) ? want : shown[0].id;
  const goTab = (t: SurveyTab) => (onTab ? onTab(t) : setTab(t));
  const revertEntry = ask?.mode === "revert" ? log.find((e) => e.id === ask.entryId) : undefined;

  const counts: Record<SurveyTab, number | undefined> = {
    items: d.items.length,
    choices: d.choices.length,
    opens: d.opens.length,
    texts: undefined,
    upload: undefined,
    log: log.length,
  };

  return (
    <>
      <PageHead
        title={`${band.label} ${d.title || doc.live.title}`}
        back={back}
        actions={
          <>
            {mayEdit && changes.length > 0 && (
              <button type="button" className="a2-btn" onClick={acts.discard}>
                고친 것 버리기
              </button>
            )}
            <button
              type="button"
              className="a2-btn a2-btn-primary"
              disabled={!mayPublish || changes.length === 0}
              onClick={() => setAsk({ mode: "publish" })}
            >
              {changes.length === 0 ? "발행할 것 없음" : `v${doc.liveVersion + 1}로 발행`}
            </button>
          </>
        }
        tabs={shown.map((t) => (
          <Tab
            key={t.id}
            label={t.label}
            count={counts[t.id]}
            active={tab === t.id}
            onClick={() => goTab(t.id)}
          />
        ))}
        tabsLabel="설문 구역"
      />

      <Body className="grid gap-3">
        <ModePanel
          mode={mode}
          link={d.link ?? ""}
          mayEdit={mayEdit}
          onMode={(m) => acts.patch({ mode: m })}
          onLink={(v) => acts.patch({ link: v })}
        />

        <Panel
          title={tabs.find((t) => t.id === tab)!.label}
          meta={`${doc.code} · 지금 나가는 판 v${doc.liveVersion} · 발행 ${doc.publishedAt} · ${doc.publishedBy}`}
          actions={
            changes.length > 0 ? (
              <Status tone="warn">발행하지 않은 수정 {changes.length}곳</Status>
            ) : (
              <Status tone="muted">나가는 판과 같음</Status>
            )
          }
        >
          {!mayEdit && (
            <p className="a2-note mb-3">
              보기만 할 수 있습니다. 고치는 것은 문항 작성 권한이 있는 사람이 합니다.
            </p>
          )}
          {tab === "items" && <Items doc={doc} acts={acts} mayEdit={mayEdit} />}
          {tab === "choices" && <Choices doc={doc} acts={acts} mayEdit={mayEdit} />}
          {tab === "opens" && <Opens doc={doc} acts={acts} mayEdit={mayEdit} />}
          {tab === "texts" && <Texts doc={doc} acts={acts} mayEdit={mayEdit} />}
          {tab === "upload" && <Upload doc={doc} acts={acts} mayEdit={mayEdit} />}
          {tab === "log" && (
            <History
              entries={log}
              liveVersion={doc.liveVersion}
              mayPublish={mayPublish}
              onRevert={(entryId) => setAsk({ mode: "revert", entryId })}
            />
          )}
        </Panel>
      </Body>

      {ask?.mode === "publish" && (
        <ReasonDialog
          title={`${band.label} ${doc.live.title} — v${doc.liveVersion + 1}로 발행합니다`}
          lead={`누르는 즉시 이 학년대 응답자의 화면이 새 판으로 바뀝니다. 다른 학년대는 그대로입니다. ${by} 님의 이름과 사유가 변경 기록과 감사 로그에 남습니다.`}
          lines={changes}
          warnings={publishWarnings(doc, answered)}
          confirmLabel="기록을 남기고 발행"
          onClose={() => setAsk(null)}
          onConfirm={(reason) => {
            acts.publish(reason);
            setAsk(null);
          }}
        />
      )}

      {revertEntry && (
        <ReasonDialog
          title={`v${revertEntry.version} 내용으로 되돌립니다`}
          lead={`그 판의 문항을 그대로 다시 내보냅니다. 번호는 되쓰지 않고 v${doc.liveVersion + 1}로 나갑니다 — 같은 번호가 두 가지 설문을 가리키면 응답을 가릴 수 없기 때문입니다.`}
          /* 그때 무엇이 바뀌었는지가 아니라, 지금 되돌리면 무엇이 달라지는지를 보여 준다 */
          lines={revertEntry.snapshot ? diffForms(doc.live, revertEntry.snapshot) : []}
          warnings={
            answered > 0
              ? [
                  `이미 이 갈래로 들어온 응답이 ${answered}건 있습니다. 되돌린 뒤의 응답은 다른 판으로 집계됩니다.`,
                ]
              : []
          }
          confirmLabel="기록을 남기고 되돌리기"
          onClose={() => setAsk(null)}
          onConfirm={(reason) => {
            acts.revert(revertEntry.id, reason);
            setAsk(null);
          }}
        />
      )}
    </>
  );
}

/* ───────────────────────── 응답 방식 ───────────────────────── */

/**
 * 응답을 어디서 받는가 — 이 서비스의 설문지로 받거나(직접 입력), 구글 설문 같은 바깥 설문 주소를 넣는다
 * (2026-10-28 요청). 바꾼 것도 초안이라 발행해야 응답자에게 나간다.
 *
 * 링크로 받으면 답은 바깥 서비스에 쌓여 이 서비스로 들어오지 않는다. 응답자 창에는 그 설문을 여는 단추와
 * 「제출했어요」가 서고(components/exam/SurveyForm.tsx), 제출 여부만 남는다 — 그 차이를 판 안에 적어 둔다.
 */
function ModePanel({
  mode,
  link,
  mayEdit,
  onMode,
  onLink,
}: {
  mode: SurveyMode;
  link: string;
  mayEdit: boolean;
  onMode: (mode: SurveyMode) => void;
  onLink: (link: string) => void;
}) {
  const ok = isSurveyLink(link);
  return (
    <Panel title="응답 방식">
      <div role="radiogroup" aria-label="응답 방식" className="flex flex-wrap gap-1.5">
        {(["form", "link"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={mode === m}
            disabled={!mayEdit}
            onClick={() => onMode(m)}
            className={mode === m ? "a2-btn a2-btn-dark" : "a2-btn"}
          >
            {surveyModeLabel[m]}
          </button>
        ))}
      </div>
      {mode === "form" ? (
        <p className="a2-hint mt-2">
          이 서비스의 설문지로 받습니다. 아래 문항이 응답자에게 나가고, 답은 리포트의 설문 점수에
          들어갑니다.
        </p>
      ) : (
        <div className="mt-3 grid gap-2">
          <label className="grid gap-1">
            <span className="a2-label">외부 설문 주소 — 구글 설문의 「보내기 → 링크」</span>
            <div className="flex gap-1.5">
              <input
                className="a2-input"
                value={link}
                disabled={!mayEdit}
                onChange={(e) => onLink(e.target.value)}
                placeholder="https://forms.gle/…"
                inputMode="url"
              />
              {ok ? (
                <a
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="a2-btn shrink-0"
                >
                  열어 보기
                </a>
              ) : (
                <span className="a2-btn shrink-0" aria-disabled>
                  열어 보기
                </span>
              )}
            </div>
            {link.trim() && !ok && (
              <span className="a2-t-xs font-bold text-(--a2-danger)">
                https://로 시작하는 주소를 넣어 주세요.
              </span>
            )}
          </label>
          <p className="a2-note">
            <span>
              <b>답은 이 서비스로 들어오지 않습니다.</b> 응답자 창에는 이 설문을 여는 단추와
              「제출했어요」가 서고, 제출 여부만 남습니다. 답 내용은 바깥 설문에서 모아 보셔야 하고
              리포트의 설문 점수에는 들어가지 않습니다. 누구의 답인지 가리도록 바깥 설문에 학생
              이름과 접속코드를 묻는 칸을 두세요 — 응답자 창이 그 두 값을 보여 줍니다. 아래 문항은
              그대로 남아 있어 직접 입력으로 되돌리면 다시 나갑니다.
            </span>
          </p>
        </div>
      )}
    </Panel>
  );
}

/* ───────────────────────── 줄 손잡이 ───────────────────────── */

function RowTools({
  first,
  last,
  onUp,
  onDown,
  onRemove,
}: {
  first: boolean;
  last: boolean;
  onUp: () => void;
  onDown: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex shrink-0 gap-1">
      <button
        type="button"
        className="a2-btn a2-btn-sm"
        disabled={first}
        onClick={onUp}
        aria-label="위로"
      >
        ↑
      </button>
      <button
        type="button"
        className="a2-btn a2-btn-sm"
        disabled={last}
        onClick={onDown}
        aria-label="아래로"
      >
        ↓
      </button>
      <button type="button" className="a2-btn a2-btn-sm a2-btn-danger" onClick={onRemove}>
        삭제
      </button>
    </div>
  );
}

/** 칸 위의 작은 이름 */
function Small({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`grid gap-1 ${className}`}>
      <span className="a2-label">{label}</span>
      {children}
    </label>
  );
}

/* ───────────────────────── 척도 문항 ───────────────────────── */

function Items({ doc, acts, mayEdit }: { doc: SurveyDoc; acts: SurveyActs; mayEdit: boolean }) {
  const [askCopy, setAskCopy] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);
  const items = doc.draft.items;

  return (
    <div>
      <p className="a2-hint">
        5점 척도로 답합니다. 최대 {MAX_ITEMS}개 · 측정 역량이 빈 문항은 점수에 들어가지 않습니다.
      </p>

      <ol className="mt-3 grid gap-2">
        {items.map((item, n) => (
          <li key={item.id} className="rounded-[4px] border border-(--a2-line) p-3">
            <div className="flex flex-wrap items-end gap-2">
              <span className="a2-mono w-6 pb-1.5 text-right a2-t-sm font-bold text-(--a2-ink-3)">
                {n + 1}
              </span>
              <Small label="번호" className="w-20">
                <input
                  className="a2-input"
                  value={item.no}
                  disabled={!mayEdit}
                  onChange={(e) => acts.patchItem(item.id, { no: e.target.value })}
                  placeholder="P01"
                />
              </Small>
              <Small label="구역" className="min-w-[10rem] flex-1">
                <input
                  className="a2-input"
                  value={item.section}
                  disabled={!mayEdit}
                  onChange={(e) => acts.patchItem(item.id, { section: e.target.value })}
                />
              </Small>
              <Small label="측정 역량" className="min-w-[10rem] flex-1">
                <input
                  className="a2-input"
                  value={item.group}
                  disabled={!mayEdit}
                  onChange={(e) => acts.patchItem(item.id, { group: e.target.value })}
                  placeholder="C01 논리적 사고"
                />
              </Small>
              {mayEdit && (
                <RowTools
                  first={n === 0}
                  last={n === items.length - 1}
                  onUp={() => acts.moveItem(item.id, -1)}
                  onDown={() => acts.moveItem(item.id, 1)}
                  onRemove={() => acts.removeItem(item.id)}
                />
              )}
            </div>
            <textarea
              rows={2}
              className="a2-textarea mt-2"
              value={item.text}
              disabled={!mayEdit}
              onChange={(e) => acts.patchItem(item.id, { text: e.target.value })}
              placeholder="예) 아이는 관심 있는 주제를 만나면 시키지 않아도 오래 파고듭니다."
              aria-label={`${n + 1}번 문항`}
            />
          </li>
        ))}
      </ol>

      {items.length === 0 && (
        <p className="a2-hint py-6 text-center">문항이 없습니다. 아래에서 더하세요.</p>
      )}

      {mayEdit && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            className="a2-btn"
            disabled={items.length >= MAX_ITEMS}
            onClick={acts.addItem}
          >
            + 문항 추가
          </button>
          {askCopy ? (
            <button
              type="button"
              className="a2-btn a2-btn-danger"
              onClick={() => {
                setCopied(acts.copyToOtherBands());
                setAskCopy(false);
              }}
            >
              다른 학년대의 문항을 정말 이걸로 덮어쓰기
            </button>
          ) : (
            <button type="button" className="a2-btn" onClick={() => setAskCopy(true)}>
              다른 학년대에도 이 문항 쓰기
            </button>
          )}
        </div>
      )}
      {askCopy && (
        <p className="mt-2 a2-t-sm font-bold text-(--a2-danger)">
          다른 학년대 초안의 척도 · 고르기 · 서술 문항이 이 벌과 똑같이 바뀝니다. 나가는 판은
          그대로라, 학년대마다 따로 발행해야 응답자에게 나갑니다.
        </p>
      )}
      {copied !== null && (
        <p className="a2-note mt-2">
          다른 학년대 {copied}곳의 초안을 이 문항으로 맞췄습니다. 목록에서 그 학년대를 열어 확인한
          뒤 발행하세요.
        </p>
      )}
    </div>
  );
}

/* ───────────────────────── 고르기 문항 ───────────────────────── */

function Choices({ doc, acts, mayEdit }: { doc: SurveyDoc; acts: SurveyActs; mayEdit: boolean }) {
  const list = doc.draft.choices;
  return (
    <div>
      <p className="a2-hint">
        해당하는 것을 모두 고르는 문항입니다. 점수로 세지 않고 해석 · 면담의 참고 자료가 됩니다.
      </p>
      <ol className="mt-3 grid gap-2">
        {list.map((c, n) => (
          <li key={c.id} className="rounded-[4px] border border-(--a2-line) p-3">
            <div className="flex flex-wrap items-end gap-2">
              <span className="a2-mono w-6 pb-1.5 text-right a2-t-sm font-bold text-(--a2-ink-3)">
                {n + 1}
              </span>
              <Small label="번호" className="w-20">
                <input
                  className="a2-input"
                  value={c.no}
                  disabled={!mayEdit}
                  onChange={(e) => acts.patchChoice(c.id, { no: e.target.value })}
                />
              </Small>
              <Small label="구역" className="min-w-[10rem] flex-1">
                <input
                  className="a2-input"
                  value={c.section}
                  disabled={!mayEdit}
                  onChange={(e) => acts.patchChoice(c.id, { section: e.target.value })}
                />
              </Small>
              {mayEdit && (
                <RowTools
                  first={n === 0}
                  last={n === list.length - 1}
                  onUp={() => acts.moveEntry("choices", c.id, -1)}
                  onDown={() => acts.moveEntry("choices", c.id, 1)}
                  onRemove={() => acts.removeChoice(c.id)}
                />
              )}
            </div>
            <Small label="질문" className="mt-2">
              <input
                className="a2-input"
                value={c.label}
                disabled={!mayEdit}
                onChange={(e) => acts.patchChoice(c.id, { label: e.target.value })}
              />
            </Small>
            <Small
              label={`보기 — 한 줄에 하나 · ${c.options.filter((o) => o.trim()).length}개`}
              className="mt-2"
            >
              <textarea
                rows={Math.max(3, c.options.length)}
                className="a2-textarea"
                value={c.options.join("\n")}
                disabled={!mayEdit}
                onChange={(e) => acts.patchChoice(c.id, { options: e.target.value.split("\n") })}
              />
            </Small>
          </li>
        ))}
      </ol>
      {list.length === 0 && <p className="a2-hint py-6 text-center">고르기 문항이 없습니다.</p>}
      {mayEdit && (
        <button type="button" className="a2-btn mt-3" onClick={acts.addChoice}>
          + 고르기 문항 추가
        </button>
      )}
    </div>
  );
}

/* ───────────────────────── 서술 문항 ───────────────────────── */

function Opens({ doc, acts, mayEdit }: { doc: SurveyDoc; acts: SurveyActs; mayEdit: boolean }) {
  const list = doc.draft.opens;
  return (
    <div>
      <p className="a2-hint">
        글로 답하는 문항입니다. 점수로 세지 않고, 쓴 표현 그대로 리포트에 인용될 수 있습니다.
      </p>
      <ol className="mt-3 grid gap-2">
        {list.map((o, n) => (
          <li key={o.id} className="rounded-[4px] border border-(--a2-line) p-3">
            <div className="flex flex-wrap items-end gap-2">
              <span className="a2-mono w-6 pb-1.5 text-right a2-t-sm font-bold text-(--a2-ink-3)">
                {n + 1}
              </span>
              <Small label="번호" className="w-20">
                <input
                  className="a2-input"
                  value={o.no}
                  disabled={!mayEdit}
                  onChange={(e) => acts.patchOpen(o.id, { no: e.target.value })}
                />
              </Small>
              <Small label="구역" className="min-w-[10rem] flex-1">
                <input
                  className="a2-input"
                  value={o.section}
                  disabled={!mayEdit}
                  onChange={(e) => acts.patchOpen(o.id, { section: e.target.value })}
                />
              </Small>
              {mayEdit && (
                <RowTools
                  first={n === 0}
                  last={n === list.length - 1}
                  onUp={() => acts.moveEntry("opens", o.id, -1)}
                  onDown={() => acts.moveEntry("opens", o.id, 1)}
                  onRemove={() => acts.removeOpen(o.id)}
                />
              )}
            </div>
            <Small label="질문" className="mt-2">
              <input
                className="a2-input"
                value={o.label}
                disabled={!mayEdit}
                onChange={(e) => acts.patchOpen(o.id, { label: e.target.value })}
              />
            </Small>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <Small label="도움말">
                <input
                  className="a2-input"
                  value={o.hint}
                  disabled={!mayEdit}
                  onChange={(e) => acts.patchOpen(o.id, { hint: e.target.value })}
                />
              </Small>
              <Small label="예시글">
                <input
                  className="a2-input"
                  value={o.placeholder}
                  disabled={!mayEdit}
                  onChange={(e) => acts.patchOpen(o.id, { placeholder: e.target.value })}
                />
              </Small>
            </div>
          </li>
        ))}
      </ol>
      {list.length === 0 && <p className="a2-hint py-6 text-center">서술 문항이 없습니다.</p>}
      {mayEdit && (
        <button type="button" className="a2-btn mt-3" onClick={acts.addOpen}>
          + 서술 문항 추가
        </button>
      )}
    </div>
  );
}

/* ───────────────────────── 안내 문구 ───────────────────────── */

function Texts({ doc, acts, mayEdit }: { doc: SurveyDoc; acts: SurveyActs; mayEdit: boolean }) {
  const d = doc.draft;
  return (
    <div className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Small label="제목">
          <input
            className="a2-input"
            value={d.title}
            disabled={!mayEdit}
            onChange={(e) => acts.patch({ title: e.target.value })}
          />
        </Small>
        <Small label="응답자">
          <input
            className="a2-input"
            value={d.who}
            disabled={!mayEdit}
            onChange={(e) => acts.patch({ who: e.target.value })}
          />
        </Small>
      </div>
      <Small label="안내문">
        <textarea
          rows={3}
          className="a2-textarea"
          value={d.desc}
          disabled={!mayEdit}
          onChange={(e) => acts.patch({ desc: e.target.value })}
        />
      </Small>
      <Small label="고지 문구 — 개인정보 안내와 어긋나지 않게">
        <textarea
          rows={3}
          className="a2-textarea"
          value={d.note}
          disabled={!mayEdit}
          onChange={(e) => acts.patch({ note: e.target.value })}
        />
      </Small>
    </div>
  );
}

/* ───────────────────────── 파일로 올리기 ───────────────────────── */

/**
 * 올리자마자 초안에 밀어 넣지 않는다. 무엇이 읽혔는지 먼저 보여 주고, 붙일지 바꿀지를 그다음에
 * 고르게 한다. 「바꾸기」는 지금 척도 문항을 통째로 버리는 일이라 한 번 더 묻는다.
 */
function Upload({ doc, acts, mayEdit }: { doc: SurveyDoc; acts: SurveyActs; mayEdit: boolean }) {
  const [over, setOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [got, setGot] = useState<{ name: string; parsed: ParsedUpload } | null>(null);
  const [askReplace, setAskReplace] = useState(false);

  const take = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setAskReplace(false);
    if (!uploadKindOf(file)) {
      setGot(null);
      return setError(`${file.name} — CSV · TXT · TSV · JSON만 올릴 수 있습니다.`);
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setGot(null);
      return setError(`${file.name} — ${Math.round(MAX_UPLOAD_BYTES / 1024)}KB를 넘습니다.`);
    }
    const parsed = parseSurveyFile(file.name, await file.text());
    setError(parsed.error ?? null);
    setGot(parsed.error ? null : { name: file.name, parsed });
  };

  const put = (mode: "append" | "replace") => {
    if (!got) return;
    acts.upload(got.parsed.items, mode, got.name);
    setGot(null);
    setAskReplace(false);
  };

  if (!mayEdit)
    return <p className="a2-hint">파일로 올리는 것은 문항 작성 권한이 있는 사람이 합니다.</p>;

  const overMax = got ? got.parsed.items.length + doc.draft.items.length > MAX_ITEMS : false;

  return (
    <div>
      <p className="a2-hint">
        한 줄에 척도 문항 하나로 읽습니다. 줄 앞의 「1.」 「-」 같은 번호는 떼어 냅니다. CSV · TXT ·
        TSV · JSON, {Math.round(MAX_UPLOAD_BYTES / 1024)}KB까지. 이 학년대의 초안에만 들어갑니다.
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
        className={`mt-2.5 rounded-[4px] border border-dashed p-5 text-center ${
          over ? "border-(--a2-accent) bg-(--a2-accent-soft)" : "border-(--a2-line)"
        }`}
      >
        <p className="a2-t-sm font-bold">
          {over ? "여기에 놓으세요" : "여기에 파일을 끌어다 놓으세요"}
        </p>
        <label className="mt-2.5 inline-block">
          <span className="a2-btn cursor-pointer">파일 고르기</span>
          <input
            type="file"
            accept=".csv,.txt,.tsv,.json"
            className="sr-only"
            onChange={(e) => {
              void take(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
      </div>

      {error && (
        <p role="alert" className="mt-2 a2-t-sm font-bold text-(--a2-danger)">
          {error}
        </p>
      )}

      {got && (
        <div className="mt-3 rounded-[4px] border border-(--a2-line) p-3">
          <p className="a2-t-sm font-bold">
            {got.name} — {got.parsed.items.length}건을 읽었습니다
            {got.parsed.skipped > 0 && (
              <span className="ml-2 font-normal text-(--a2-ink-3)">
                빈 줄 {got.parsed.skipped}개는 건너뜀
              </span>
            )}
          </p>
          <ol className="mt-2 max-h-64 overflow-y-auto">
            {got.parsed.items.map((text, n) => (
              <li key={`${text}-${n}`} className="flex gap-2 py-0.5 a2-t-sm">
                <span className="a2-mono w-6 shrink-0 text-right text-(--a2-ink-4)">{n + 1}</span>
                <span className="min-w-0">{text}</span>
              </li>
            ))}
          </ol>
          {overMax && (
            <p className="mt-2 a2-t-sm font-bold text-(--a2-warn)">
              붙이면 {MAX_ITEMS}개를 넘습니다. 넘는 만큼은 잘립니다.
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-1.5">
            <button type="button" className="a2-btn" onClick={() => put("append")}>
              기존 문항 뒤에 붙이기
            </button>
            {askReplace ? (
              <button type="button" className="a2-btn a2-btn-danger" onClick={() => put("replace")}>
                기존 {doc.draft.items.length}개를 정말 버리고 바꾸기
              </button>
            ) : (
              <button type="button" className="a2-btn" onClick={() => setAskReplace(true)}>
                기존 문항을 모두 바꾸기
              </button>
            )}
            <button
              type="button"
              className="a2-btn"
              onClick={() => {
                setGot(null);
                setAskReplace(false);
              }}
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

const actionTone = { publish: "ok", revert: "warn", upload: "info", discard: "muted" } as const;

function History({
  entries,
  liveVersion,
  mayPublish,
  onRevert,
}: {
  entries: SurveyLogEntry[];
  liveVersion: number;
  mayPublish: boolean;
  onRevert: (entryId: string) => void;
}) {
  if (entries.length === 0) return <p className="a2-hint">아직 이 설문을 고친 기록이 없습니다.</p>;
  return (
    <div>
      <p className="a2-hint mb-2">
        발행한 판은 그때 내보낸 설문 전체를 함께 보관해, 언제든 그 판으로 되돌릴 수 있습니다.
      </p>
      <TableBox>
        <table className="a2-table">
          <thead>
            <tr>
              <th>시각</th>
              <th>사람</th>
              <th>한 일</th>
              <th>판</th>
              <th>사유</th>
              <th>달라진 것</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id}>
                <td className="a2-mono a2-nowrap">{e.at}</td>
                <td className="a2-nowrap">{e.by}</td>
                <td className="a2-nowrap">
                  <Status tone={actionTone[e.action]}>{actionLabel[e.action]}</Status>
                </td>
                <td className="a2-mono">{e.version ? `v${e.version}` : "초안"}</td>
                <td className="min-w-[12rem]">{e.reason}</td>
                <td className="min-w-[16rem]">
                  {e.lines.length === 0 ? (
                    "—"
                  ) : (
                    <ul>
                      {e.lines.map((line, n) => (
                        <li key={`${e.id}-${n}`}>· {line}</li>
                      ))}
                    </ul>
                  )}
                </td>
                <td className="a2-nowrap">
                  {e.snapshot && e.version !== liveVersion ? (
                    <button
                      type="button"
                      className="a2-btn a2-btn-sm"
                      disabled={!mayPublish}
                      onClick={() => onRevert(e.id)}
                    >
                      이 판으로 되돌리기
                    </button>
                  ) : e.version === liveVersion ? (
                    <span className="a2-t-xs text-(--a2-ink-4)">지금 나가는 판</span>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableBox>
    </div>
  );
}
