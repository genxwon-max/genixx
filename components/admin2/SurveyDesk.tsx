"use client";

import { useState } from "react";
import { surveyBandOf } from "@/lib/surveyBands";
import {
  MAX_ITEMS,
  MAX_UPLOAD_BYTES,
  actionLabel,
  blocksOf,
  diffForms,
  draftChanges,
  isSurveyLink,
  modeOf,
  sectionsOf,
  surveyKeyShort,
  surveyKindLabel,
  surveyKinds,
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
  type SurveyKind,
  type SurveyLogEntry,
  type NewSurvey,
  type SurveyDocs,
  type SurveyOpen,
  type SurveySection,
} from "@/lib/surveyStore";
import { SurveyPreview, surveyScale } from "@/components/exam/SurveyForm";
import ReasonDialog from "./ReasonDialog";
import SurveyCreateDialog from "./SurveyCreateDialog";
import TableBox from "./TableBox";
import { Body, PageHead, Panel, Status, Tab } from "./ui";

/**
 * ADM-14 설문지 한 벌을 고치고 발행하는 자리.
 *
 * 옛 콘솔의 설문 원본(components/admin/SurveyEditor.tsx, 2026-09-27 걷어 냄)을 이 콘솔의 모양으로
 * 다시 세웠다(2026-10-28).
 *
 * ── 응답자 창의 차례대로 고친다 (2026-10-28 사용자 요청) ──
 * 처음에는 묻는 방식마다 탭을 갈라(척도 · 고르기 · 서술) 문항을 한 줄씩 적었다. 그러면 응답자가 받는 설문
 * (/survey/[갈래] — 표지 → 응답 방법 → 구역마다 문항 카드)과 고치는 화면의 모양이 따로 놀아, 새로 만든
 * 설문지가 어떤 설문이 되는지 알 수 없었다. 그래서 탭을 응답자 창의 차례로 다시 짰다.
 *
 *   설문 양식   응답 방식 · 표지(제목 · 응답자 · 안내문) · 응답 방법과 고지 문구 · 구역 구성
 *   상세 설문   구역마다 그 방식의 문항 카드 — 구역 안에서 더하고 옮기고 지운다
 *   미리보기    응답자 창과 같은 조각(components/exam/SurveyForm.tsx SurveyPreview)으로 초안 · 나가는 판
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

export type SurveyTab = "form" | "detail" | "preview" | "upload" | "log";

const tabs: { id: SurveyTab; label: string }[] = [
  { id: "form", label: "설문 양식" },
  { id: "detail", label: "상세 설문" },
  { id: "preview", label: "미리보기" },
  { id: "upload", label: "파일로 올리기" },
  { id: "log", label: "변경 기록" },
];

/** 고치는 손잡이 — 실제 화면은 저장소(lib/surveyStore.ts)에, 디자인은 다음 상태로 잇는다 */
export type SurveyActs = {
  patch: (patch: Partial<SurveyForm>) => void;
  patchItem: (id: string, patch: Partial<Omit<SurveyItem, "id">>) => void;
  /** 그 구역(이름)에 문항을 더한다 */
  addItem: (section: string) => void;
  removeItem: (id: string) => void;
  moveItem: (id: string, dir: 1 | -1) => void;
  patchChoice: (id: string, patch: Partial<Omit<SurveyChoice, "id">>) => void;
  addChoice: (section: string) => void;
  removeChoice: (id: string) => void;
  patchOpen: (id: string, patch: Partial<Omit<SurveyOpen, "id">>) => void;
  addOpen: (section: string) => void;
  removeOpen: (id: string) => void;
  moveEntry: (list: "choices" | "opens", id: string, dir: 1 | -1) => void;
  addSection: (kind: SurveyKind) => void;
  /** 구역 이름 · 도움말 — 같은 방식의 다른 구역과 이름이 겹치면 고치지 않고 false */
  patchSection: (id: string, patch: Partial<Pick<SurveySection, "title" | "hint">>) => boolean;
  moveSection: (id: string, dir: 1 | -1) => void;
  removeSection: (id: string) => void;
  /** 다른 학년대에도 이 문항 쓰기 — 맞춘 벌 수를 돌려준다 */
  copyToOtherBands: () => number;
  upload: (texts: string[], mode: "append" | "replace", fileName: string) => void;
  discard: () => void;
  publish: (reason: string) => void;
  revert: (entryId: string, reason: string) => void;
  /** 관리용 이름 고치기 */
  rename: (name: string) => void;
  /** 이 설문지를 응답자에게 내보낸다 — 같은 응답자 · 학년대에서 쓰던 것은 보관으로 */
  activate: (reason: string) => void;
  /** 복사해 새로 만들기 — 만들지 못했으면 까닭을 돌려준다(만든 뒤 옮겨 가는 일은 부르는 쪽이 한다) */
  create: (spec: NewSurvey) => string | null;
};

/** 열려 있는 확인 창 */
export type SurveyAsk =
  | null
  | { mode: "publish" }
  | { mode: "revert"; entryId: string }
  | { mode: "activate" }
  | { mode: "copy" };

export default function SurveyDesk({
  doc,
  docs,
  log,
  answered,
  mayEdit,
  mayPublish,
  by,
  back,
  acts,
  tab: startTab = "form",
  ask: startAsk = null,
  onTab,
}: {
  doc: SurveyDoc;
  /** 모든 설문지 — 「복사해 새로 만들기」 창과 「사용하기」 창이 지금 쓰는 설문지를 찾는다 */
  docs: SurveyDocs;
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

  /* 외부 설문 링크로 받을 때는 문항이 나가지 않는다 — 상세 설문 · 파일 탭을 걷는다. 문항은 지우지 않으므로
     직접 입력으로 되돌리면 그대로 다시 선다 */
  const shown =
    mode === "link" ? tabs.filter((t) => t.id !== "detail" && t.id !== "upload") : tabs;
  const want = onTab ? startTab : tabState;
  const tab = shown.some((t) => t.id === want) ? want : shown[0].id;
  const goTab = (t: SurveyTab) => (onTab ? onTab(t) : setTab(t));
  const revertEntry = ask?.mode === "revert" ? log.find((e) => e.id === ask.entryId) : undefined;
  /* 같은 응답자 · 학년대에서 지금 쓰는 설문지 — 이 설문지를 사용하면 보관으로 돌아간다 */
  const inUse = Object.values(docs).find(
    (x) => x.key === doc.key && x.band === doc.band && x.active,
  );

  const counts: Partial<Record<SurveyTab, number>> = {
    detail: d.items.length + d.choices.length + d.opens.length,
    log: log.length,
  };

  return (
    <>
      <PageHead
        title={doc.name}
        back={back}
        actions={
          <>
            {doc.active ? <Status tone="ok">사용 중</Status> : <Status tone="muted">보관</Status>}
            {mayEdit && (
              <button type="button" className="a2-btn" onClick={() => setAsk({ mode: "copy" })}>
                복사해 새로 만들기
              </button>
            )}
            {!doc.active && (
              <button
                type="button"
                className="a2-btn"
                disabled={!mayPublish}
                onClick={() => setAsk({ mode: "activate" })}
              >
                이 설문지 사용하기
              </button>
            )}
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
        {tab === "form" && (
          <ModePanel
            mode={mode}
            link={d.link ?? ""}
            mayEdit={mayEdit}
            onMode={(m) => acts.patch({ mode: m })}
            onLink={(v) => acts.patch({ link: v })}
          />
        )}

        <Panel
          title={tabs.find((t) => t.id === tab)!.label}
          meta={`${surveyKeyShort[doc.key]} · ${band.label} · ${doc.code} · 판 v${doc.liveVersion} · 발행 ${doc.publishedAt} · ${doc.publishedBy}`}
          actions={
            changes.length > 0 ? (
              <Status tone="warn">발행하지 않은 수정 {changes.length}곳</Status>
            ) : (
              <Status tone="muted">나가는 판과 같음</Status>
            )
          }
        >
          {!mayEdit && tab !== "preview" && (
            <p className="a2-note mb-3">
              보기만 할 수 있습니다. 고치는 것은 문항 작성 권한이 있는 사람이 합니다.
            </p>
          )}
          {tab === "form" && (
            <FormTab doc={doc} acts={acts} mayEdit={mayEdit} onDetail={() => goTab("detail")} />
          )}
          {tab === "detail" && (
            <DetailTab doc={doc} acts={acts} mayEdit={mayEdit} onForm={() => goTab("form")} />
          )}
          {tab === "preview" && <PreviewTab doc={doc} changed={changes.length > 0} />}
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

      {ask?.mode === "activate" && (
        <ReasonDialog
          title={`「${doc.name}」을 사용합니다`}
          lead={`누르는 즉시 ${surveyKeyShort[doc.key]} · ${band.label} 응답자에게 이 설문지의 v${doc.liveVersion}이 나갑니다. 지금 쓰는 설문지는 보관으로 돌아가고 지우지 않습니다. 발행하지 않은 수정은 나가지 않습니다.`}
          lines={
            inUse && inUse.id !== doc.id ? [`사용 중 — 「${inUse.name}」 → 「${doc.name}」`] : []
          }
          warnings={
            changes.length > 0
              ? [
                  `발행하지 않은 수정이 ${changes.length}곳 있습니다. 먼저 발행해야 응답자에게 나갑니다.`,
                ]
              : []
          }
          confirmLabel="기록을 남기고 사용하기"
          onClose={() => setAsk(null)}
          onConfirm={(reason) => {
            acts.activate(reason);
            setAsk(null);
          }}
        />
      )}

      {ask?.mode === "copy" && (
        <SurveyCreateDialog
          docs={docs}
          start={{ key: doc.key, band: doc.band, from: doc.id, name: `${doc.name} 복사` }}
          onClose={() => setAsk(null)}
          onCreate={acts.create}
        />
      )}

      {ask?.mode === "publish" && (
        <ReasonDialog
          title={`${doc.name} — v${doc.liveVersion + 1}로 발행합니다`}
          lead={
            doc.active
              ? `누르는 즉시 이 학년대 응답자의 화면이 새 판으로 바뀝니다. 다른 학년대는 그대로입니다. ${by} 님의 이름과 사유가 변경 기록과 감사 로그에 남습니다.`
              : `이 설문지는 보관 중이라 응답자 화면은 바뀌지 않습니다. 「이 설문지 사용하기」를 눌러야 나갑니다. ${by} 님의 이름과 사유가 변경 기록과 감사 로그에 남습니다.`
          }
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
          이 서비스의 설문지로 받습니다. 아래 양식과 상세 설문의 문항이 응답자에게 나가고, 답은
          리포트의 설문 점수에 들어갑니다.
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
              이름과 접속코드를 묻는 칸을 두세요 — 응답자 창이 그 두 값을 보여 줍니다. 상세 설문의
              문항은 그대로 남아 있어 직접 입력으로 되돌리면 다시 나갑니다.
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
  removeLabel = "삭제",
}: {
  first: boolean;
  last: boolean;
  onUp: () => void;
  onDown: () => void;
  onRemove: () => void;
  removeLabel?: string;
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
        {removeLabel}
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

/** 설문 양식 안의 한 덩이 — 응답자 창의 카드 한 장에 맞선다 */
function Part({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[4px] border border-(--a2-line)">
      <header className="border-b border-(--a2-line) px-3 py-2">
        <h3 className="a2-t-sm font-bold">{title}</h3>
        {hint && <p className="a2-t-xs mt-0.5 text-(--a2-ink-3)">{hint}</p>}
      </header>
      <div className="p-3">{children}</div>
    </section>
  );
}

/* ───────────────────────── 설문 양식 ───────────────────────── */

/**
 * 응답자 창의 틀 — 맨 위 표지 카드, 응답 방법 카드, 그리고 구역 머리들의 차례. 문항 글은 상세 설문에서
 * 적는다. 구역 이름은 응답자 창의 구역 머리에 그대로 서고, 문항이 없는 구역은 응답자에게 보이지 않는다.
 */
function FormTab({
  doc,
  acts,
  mayEdit,
  onDetail,
}: {
  doc: SurveyDoc;
  acts: SurveyActs;
  mayEdit: boolean;
  onDetail: () => void;
}) {
  const d = doc.draft;
  const blocks = blocksOf(d);
  const [askDrop, setAskDrop] = useState<string | null>(null);

  return (
    <div className="grid gap-3">
      <Small label="설문지 이름 — 관리용 · 응답자에게는 아래 제목이 보입니다 · 고치는 즉시 저장">
        <input
          className="a2-input"
          value={doc.name}
          disabled={!mayEdit}
          onChange={(e) => acts.rename(e.target.value)}
        />
      </Small>

      <Part title="1. 표지" hint="응답자 창 맨 위 카드 — 제목 · 안내문 · 대상 학생과 응답자">
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
                placeholder="보호자"
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
        </div>
      </Part>

      <Part
        title="2. 응답 방법"
        hint="5점 척도 문항이 있을 때 표지 아래에 섭니다 — 눈금 글은 설문지 v1.0에 적힌 그대로라 고치지 않습니다"
      >
        <ol className="flex flex-wrap gap-x-4 gap-y-1">
          {surveyScale.map((label, v) => (
            <li key={label} className="flex items-center gap-1.5 a2-t-sm">
              <span className="a2-mono grid h-5 w-5 place-items-center rounded-full border border-(--a2-line) a2-t-xs">
                {v + 1}
              </span>
              {label}
            </li>
          ))}
        </ol>
        <Small label="고지 문구 — 눈금 아래에 붙습니다 · 개인정보 안내와 어긋나지 않게" className="mt-3">
          <textarea
            rows={3}
            className="a2-textarea"
            value={d.note}
            disabled={!mayEdit}
            onChange={(e) => acts.patch({ note: e.target.value })}
          />
        </Small>
      </Part>

      <Part
        title="3. 구역 구성"
        hint="응답자 창은 이 차례대로 구역을 쌓습니다. 구역 하나는 한 가지 방식으로 묻고, 문항은 상세 설문에서 구역마다 넣습니다"
      >
        {blocks.length === 0 ? (
          <p className="a2-hint py-4 text-center">구역이 없습니다. 아래에서 더하세요.</p>
        ) : (
          <ol className="grid gap-2">
            {blocks.map((b, n) => (
              <li key={b.section.id} className="rounded-[4px] border-l-4 border-(--a2-accent) bg-(--a2-row) p-2.5">
                <div className="flex flex-wrap items-end gap-2">
                  <span className="a2-mono w-6 pb-1.5 text-right a2-t-sm font-bold text-(--a2-ink-3)">
                    {n + 1}
                  </span>
                  <Small label="구역 이름" className="min-w-[12rem] flex-1">
                    <SectionTitle
                      key={`${b.section.id}|${b.section.title}`}
                      section={b.section}
                      disabled={!mayEdit}
                      onCommit={(title) => acts.patchSection(b.section.id, { title })}
                    />
                  </Small>
                  <div className="grid gap-1">
                    <span className="a2-label">묻는 방식</span>
                    <span className="flex h-[2.125rem] items-center gap-2">
                      <Status tone="info">{surveyKindLabel[b.kind]}</Status>
                      <span className="a2-t-xs tabular-nums text-(--a2-ink-3)">
                        문항 {b.rows.length}
                      </span>
                    </span>
                  </div>
                  {mayEdit && (
                    <RowTools
                      first={n === 0}
                      last={n === blocks.length - 1}
                      onUp={() => acts.moveSection(b.section.id, -1)}
                      onDown={() => acts.moveSection(b.section.id, 1)}
                      onRemove={() =>
                        b.rows.length > 0 ? setAskDrop(b.section.id) : acts.removeSection(b.section.id)
                      }
                    />
                  )}
                </div>
                <Small label="구역 도움말 — 구역 이름 아래 한 줄 · 비워 두어도 됩니다" className="mt-2 pl-8">
                  <input
                    className="a2-input"
                    value={b.section.hint}
                    disabled={!mayEdit}
                    onChange={(e) => acts.patchSection(b.section.id, { hint: e.target.value })}
                  />
                </Small>
                {askDrop === b.section.id && (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-8">
                    <span className="a2-t-sm font-bold text-(--a2-danger)">
                      이 구역의 문항 {b.rows.length}개도 함께 지워집니다.
                    </span>
                    <button
                      type="button"
                      className="a2-btn a2-btn-sm a2-btn-danger"
                      onClick={() => {
                        acts.removeSection(b.section.id);
                        setAskDrop(null);
                      }}
                    >
                      구역과 문항 지우기
                    </button>
                    <button type="button" className="a2-btn a2-btn-sm" onClick={() => setAskDrop(null)}>
                      그만두기
                    </button>
                  </div>
                )}
                {b.rows.length === 0 && (
                  <p className="a2-t-xs mt-1.5 pl-8 text-(--a2-warn)">
                    문항이 없어 응답자에게 보이지 않습니다 —{" "}
                    <button type="button" className="underline" onClick={onDetail}>
                      상세 설문에서 문항 넣기
                    </button>
                  </p>
                )}
              </li>
            ))}
          </ol>
        )}
        {mayEdit && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {surveyKinds.map((k) => (
              <button key={k} type="button" className="a2-btn" onClick={() => acts.addSection(k)}>
                + {surveyKindLabel[k]} 구역
              </button>
            ))}
          </div>
        )}
      </Part>
    </div>
  );
}

/**
 * 구역 이름 칸 — 다 적고 칸을 떠날 때(또는 Enter) 고친다. 한 글자마다 고치면 「새 구역 2」를 「새 구역」으로
 * 지우는 사이에 이웃 구역과 이름이 겹쳐 두 구역의 문항이 섞인다. 겹치면 고치지 않고 알린다.
 */
function SectionTitle({
  section,
  disabled,
  onCommit,
}: {
  section: SurveySection;
  disabled: boolean;
  onCommit: (title: string) => boolean;
}) {
  const [text, setText] = useState(section.title);
  const [error, setError] = useState<string | null>(null);
  const commit = () => {
    const t = text.trim();
    if (t === section.title) return setText(t);
    if (!t) return setError("구역 이름을 적어 주세요.");
    if (!onCommit(t)) setError(`같은 ${surveyKindLabel[section.kind]} 구역에 이미 있는 이름입니다.`);
  };
  return (
    <>
      <input
        className="a2-input"
        value={text}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        onChange={(e) => {
          setText(e.target.value);
          setError(null);
        }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        placeholder="예) 자녀의 재능·역량 관찰"
      />
      {error && <span className="a2-t-xs font-bold text-(--a2-danger)">{error}</span>}
    </>
  );
}

/* ───────────────────────── 상세 설문 ───────────────────────── */

/**
 * 구역마다 그 방식의 문항 카드. 응답자 창과 같은 차례로 서고, 문항은 제 구역 안에서만 옮긴다. 다른 구역으로
 * 보내려면 문항의 「구역」을 바꾼다.
 */
function DetailTab({
  doc,
  acts,
  mayEdit,
  onForm,
}: {
  doc: SurveyDoc;
  acts: SurveyActs;
  mayEdit: boolean;
  onForm: () => void;
}) {
  const [askCopy, setAskCopy] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);
  const d = doc.draft;
  const blocks = blocksOf(d);
  const sections = sectionsOf(d);
  const titlesOf = (kind: SurveyKind) => sections.filter((s) => s.kind === kind).map((s) => s.title);

  if (blocks.length === 0) {
    return (
      <div className="py-6 text-center">
        <p className="a2-hint">구역이 없습니다. 설문 양식에서 구역을 먼저 더하세요.</p>
        <button type="button" className="a2-btn mt-3" onClick={onForm}>
          설문 양식으로
        </button>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <p className="a2-hint">
        5점 척도는 다 답해야 제출되고 역량 점수가 됩니다(최대 {MAX_ITEMS}개 · 측정 역량이 빈 문항은
        점수에 들어가지 않음). 모두 고르기 · 서술은 비워 두어도 제출되는 참고 자료입니다. 구역을
        더하거나 이름을 바꾸는 것은 설문 양식에서 합니다.
      </p>

      {blocks.map((b, n) => (
        <section key={b.section.id} className="rounded-[4px] border border-(--a2-line)">
          <header className="flex flex-wrap items-center gap-2 border-b border-l-4 border-(--a2-line) border-l-(--a2-accent) px-3 py-2">
            <span className="a2-mono a2-t-xs text-(--a2-ink-3)">구역 {n + 1}</span>
            <h3 className="a2-t-sm font-bold">{b.section.title || "(이름 없는 구역)"}</h3>
            <Status tone="info">{surveyKindLabel[b.kind]}</Status>
            <span className="a2-t-xs tabular-nums text-(--a2-ink-3)">문항 {b.rows.length}</span>
            {b.section.hint && (
              <span className="a2-t-xs basis-full text-(--a2-ink-3)">{b.section.hint}</span>
            )}
          </header>
          <div className="p-3">
            {b.rows.length === 0 && (
              <p className="a2-hint pb-2">
                이 구역에 문항이 없습니다 — 응답자에게는 보이지 않습니다.
              </p>
            )}
            <ol className="grid gap-2">
              {b.kind === "scale" &&
                b.rows.map((item, i) => (
                  <ScaleRow
                    key={item.id}
                    item={item}
                    n={i}
                    last={i === b.rows.length - 1}
                    sections={titlesOf("scale")}
                    acts={acts}
                    mayEdit={mayEdit}
                  />
                ))}
              {b.kind === "choice" &&
                b.rows.map((c, i) => (
                  <ChoiceRow
                    key={c.id}
                    choice={c}
                    n={i}
                    last={i === b.rows.length - 1}
                    sections={titlesOf("choice")}
                    acts={acts}
                    mayEdit={mayEdit}
                  />
                ))}
              {b.kind === "open" &&
                b.rows.map((o, i) => (
                  <OpenRow
                    key={o.id}
                    open={o}
                    n={i}
                    last={i === b.rows.length - 1}
                    sections={titlesOf("open")}
                    acts={acts}
                    mayEdit={mayEdit}
                  />
                ))}
            </ol>
            {mayEdit && (
              <button
                type="button"
                className="a2-btn mt-2"
                disabled={b.kind === "scale" && d.items.length >= MAX_ITEMS}
                onClick={() =>
                  b.kind === "scale"
                    ? acts.addItem(b.section.title)
                    : b.kind === "choice"
                      ? acts.addChoice(b.section.title)
                      : acts.addOpen(b.section.title)
                }
              >
                + 이 구역에 {surveyKindLabel[b.kind]} 문항 추가
              </button>
            )}
          </div>
        </section>
      ))}

      {mayEdit && (
        <div className="flex flex-wrap items-center gap-1.5">
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
        <p className="a2-t-sm font-bold text-(--a2-danger)">
          다른 학년대에서 사용 중인 설문지 초안의 구역과 문항이 이 설문지와 똑같이 바뀝니다. 나가는
          판은 그대로라, 학년대마다 따로 발행해야 응답자에게 나갑니다.
        </p>
      )}
      {copied !== null && (
        <p className="a2-note">
          다른 학년대 {copied}곳의 초안을 이 문항으로 맞췄습니다. 목록에서 그 학년대를 열어 확인한
          뒤 발행하세요.
        </p>
      )}
    </div>
  );
}

/** 문항 카드의 머리 줄 — 차례 · 번호 · (척도면 측정 역량) · 구역 · 손잡이 */
function RowHead({
  n,
  last,
  no,
  section,
  sections,
  mayEdit,
  onNo,
  onSection,
  onMove,
  onRemove,
  children,
}: {
  n: number;
  last: boolean;
  no: string;
  section: string;
  sections: string[];
  mayEdit: boolean;
  onNo: (v: string) => void;
  onSection: (v: string) => void;
  onMove: (dir: 1 | -1) => void;
  onRemove: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end gap-2">
      <span className="a2-mono w-6 pb-1.5 text-right a2-t-sm font-bold text-(--a2-ink-3)">
        {n + 1}
      </span>
      <Small label="번호" className="w-20">
        <input
          className="a2-input"
          value={no}
          disabled={!mayEdit}
          onChange={(e) => onNo(e.target.value)}
          placeholder="P01"
        />
      </Small>
      {children}
      {sections.length > 1 && (
        <Small label="구역" className="min-w-[10rem] flex-1">
          <select
            className="a2-select"
            value={section}
            disabled={!mayEdit}
            onChange={(e) => onSection(e.target.value)}
          >
            {sections.map((t) => (
              <option key={t} value={t}>
                {t || "(이름 없는 구역)"}
              </option>
            ))}
          </select>
        </Small>
      )}
      {mayEdit && (
        <div className="ml-auto">
          <RowTools
            first={n === 0}
            last={last}
            onUp={() => onMove(-1)}
            onDown={() => onMove(1)}
            onRemove={onRemove}
          />
        </div>
      )}
    </div>
  );
}

type RowProps = {
  n: number;
  last: boolean;
  sections: string[];
  acts: SurveyActs;
  mayEdit: boolean;
};

function ScaleRow({ item, n, last, sections, acts, mayEdit }: RowProps & { item: SurveyItem }) {
  return (
    <li className="rounded-[4px] border border-(--a2-line) p-3">
      <RowHead
        n={n}
        last={last}
        no={item.no}
        section={item.section}
        sections={sections}
        mayEdit={mayEdit}
        onNo={(no) => acts.patchItem(item.id, { no })}
        onSection={(section) => acts.patchItem(item.id, { section })}
        onMove={(dir) => acts.moveItem(item.id, dir)}
        onRemove={() => acts.removeItem(item.id)}
      >
        <Small label="측정 역량" className="min-w-[10rem] flex-1">
          <input
            className="a2-input"
            value={item.group}
            disabled={!mayEdit}
            onChange={(e) => acts.patchItem(item.id, { group: e.target.value })}
            placeholder="C01 논리적 사고"
          />
        </Small>
      </RowHead>
      <textarea
        rows={2}
        className="a2-textarea mt-2"
        value={item.text}
        disabled={!mayEdit}
        onChange={(e) => acts.patchItem(item.id, { text: e.target.value })}
        placeholder="예) 아이는 관심 있는 주제를 만나면 시키지 않아도 오래 파고듭니다."
        aria-label={`${n + 1}번 문항`}
      />
      {/* 응답자가 받는 눈금 — 고치는 칸이 아니라 이 문항이 어떻게 답해지는지 보여 준다 */}
      <div aria-hidden className="mt-2 flex items-center gap-2 a2-t-xs text-(--a2-ink-4)">
        <span>{surveyScale[0]}</span>
        {surveyScale.map((l, v) => (
          <span
            key={l}
            className="a2-mono grid h-5 w-5 place-items-center rounded-full border border-(--a2-line)"
          >
            {v + 1}
          </span>
        ))}
        <span>{surveyScale[surveyScale.length - 1]}</span>
      </div>
    </li>
  );
}

function ChoiceRow({ choice: c, n, last, sections, acts, mayEdit }: RowProps & { choice: SurveyChoice }) {
  const setOption = (i: number, v: string) =>
    acts.patchChoice(c.id, { options: c.options.map((o, k) => (k === i ? v : o)) });
  return (
    <li className="rounded-[4px] border border-(--a2-line) p-3">
      <RowHead
        n={n}
        last={last}
        no={c.no}
        section={c.section}
        sections={sections}
        mayEdit={mayEdit}
        onNo={(no) => acts.patchChoice(c.id, { no })}
        onSection={(section) => acts.patchChoice(c.id, { section })}
        onMove={(dir) => acts.moveEntry("choices", c.id, dir)}
        onRemove={() => acts.removeChoice(c.id)}
      />
      <Small label="질문" className="mt-2">
        <input
          className="a2-input"
          value={c.label}
          disabled={!mayEdit}
          onChange={(e) => acts.patchChoice(c.id, { label: e.target.value })}
          placeholder="예) 나는 다음 활동을 좋아한다."
        />
      </Small>
      <div className="mt-2 grid gap-1">
        <span className="a2-label">보기 — 응답자는 해당되는 것을 모두 고릅니다 · {c.options.filter((o) => o.trim()).length}개</span>
        <ul className="grid gap-1 sm:grid-cols-2">
          {c.options.map((o, i) => (
            <li key={i} className="flex items-center gap-1.5">
              <span aria-hidden className="h-3.5 w-3.5 shrink-0 rounded-[2px] border-2 border-(--a2-ink-4)" />
              <input
                className="a2-input"
                value={o}
                disabled={!mayEdit}
                onChange={(e) => setOption(i, e.target.value)}
                placeholder={`보기 ${i + 1}`}
                aria-label={`보기 ${i + 1}`}
              />
              {mayEdit && (
                <button
                  type="button"
                  className="a2-btn a2-btn-sm"
                  aria-label={`보기 ${i + 1} 지우기`}
                  onClick={() => acts.patchChoice(c.id, { options: c.options.filter((_, k) => k !== i) })}
                >
                  ×
                </button>
              )}
            </li>
          ))}
        </ul>
        {mayEdit && (
          <button
            type="button"
            className="a2-btn a2-btn-sm justify-self-start"
            onClick={() => acts.patchChoice(c.id, { options: [...c.options, ""] })}
          >
            + 보기 추가
          </button>
        )}
      </div>
    </li>
  );
}

function OpenRow({ open: o, n, last, sections, acts, mayEdit }: RowProps & { open: SurveyOpen }) {
  return (
    <li className="rounded-[4px] border border-(--a2-line) p-3">
      <RowHead
        n={n}
        last={last}
        no={o.no}
        section={o.section}
        sections={sections}
        mayEdit={mayEdit}
        onNo={(no) => acts.patchOpen(o.id, { no })}
        onSection={(section) => acts.patchOpen(o.id, { section })}
        onMove={(dir) => acts.moveEntry("opens", o.id, dir)}
        onRemove={() => acts.removeOpen(o.id)}
      />
      <Small label="질문" className="mt-2">
        <input
          className="a2-input"
          value={o.label}
          disabled={!mayEdit}
          onChange={(e) => acts.patchOpen(o.id, { label: e.target.value })}
          placeholder="예) 자녀가 유난히 오래 몰입하는 활동은 무엇입니까?"
        />
      </Small>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <Small label="도움말 — 질문 아래 한 줄">
          <input
            className="a2-input"
            value={o.hint}
            disabled={!mayEdit}
            onChange={(e) => acts.patchOpen(o.id, { hint: e.target.value })}
          />
        </Small>
        <Small label="예시글 — 빈 답 칸에 흐리게">
          <input
            className="a2-input"
            value={o.placeholder}
            disabled={!mayEdit}
            onChange={(e) => acts.patchOpen(o.id, { placeholder: e.target.value })}
            placeholder="내 답변"
          />
        </Small>
      </div>
    </li>
  );
}

/* ───────────────────────── 미리보기 ───────────────────────── */

/**
 * 응답자 창을 그대로 띄운다 — 같은 조각이라 여기서 보이는 것이 응답자가 받는 것이다. 발행하지 않은 수정이
 * 있으면 초안과 지금 나가는 판을 바꿔 볼 수 있다. 눌러 보고 적어 볼 수 있지만 저장되지 않는다.
 */
function PreviewTab({ doc, changed }: { doc: SurveyDoc; changed: boolean }) {
  const [which, setWhich] = useState<"draft" | "live">("draft");
  const form = which === "draft" ? doc.draft : doc.live;
  const version = which === "draft" && changed ? doc.liveVersion + 1 : doc.liveVersion;
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {changed ? (
          <div role="radiogroup" aria-label="미리 볼 판" className="flex gap-1.5">
            <button
              type="button"
              role="radio"
              aria-checked={which === "draft"}
              onClick={() => setWhich("draft")}
              className={which === "draft" ? "a2-btn a2-btn-dark" : "a2-btn"}
            >
              고치는 중인 초안 · 발행하면 v{doc.liveVersion + 1}
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={which === "live"}
              onClick={() => setWhich("live")}
              className={which === "live" ? "a2-btn a2-btn-dark" : "a2-btn"}
            >
              지금 나가는 판 v{doc.liveVersion}
            </button>
          </div>
        ) : (
          <Status tone="muted">초안과 나가는 판 v{doc.liveVersion}이 같습니다</Status>
        )}
        <span className="a2-hint">
          응답자 창 그대로입니다. 눌러 보고 적어 볼 수 있지만 저장되지 않습니다.
          {!doc.active && " 이 설문지는 보관 중이라 지금은 응답자에게 나가지 않습니다."}
        </span>
      </div>

      <div className="mt-3 overflow-hidden rounded-[4px] border border-(--a2-line)">
        <div className="flex items-center gap-2 border-b border-(--a2-line) px-3 py-1.5 a2-t-xs text-(--a2-ink-3)">
          <span aria-hidden className="flex gap-1">
            <span className="h-2 w-2 rounded-full bg-(--a2-line)" />
            <span className="h-2 w-2 rounded-full bg-(--a2-line)" />
            <span className="h-2 w-2 rounded-full bg-(--a2-line)" />
          </span>
          응답자 창 · /survey/{doc.key}
        </div>
        <div
          key={which}
          className="h-[70vh] min-h-[520px] overflow-y-auto bg-exam-bg text-exam-text"
        >
          <SurveyPreview form={form} version={version} studentName="(예시 학생)" />
        </div>
      </div>
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
        한 줄에 5점 척도 문항 하나로 읽습니다. 줄 앞의 「1.」 「-」 같은 번호는 떼어 냅니다. CSV · TXT ·
        TSV · JSON, {Math.round(MAX_UPLOAD_BYTES / 1024)}KB까지. 이 설문지의 초안에만 들어가고, 붙이면 마지막
        척도 문항의 구역에, 바꾸면 첫 척도 구역에 들어갑니다.
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

const actionTone = {
  publish: "ok",
  revert: "warn",
  upload: "info",
  discard: "muted",
  create: "info",
  activate: "ok",
} as const;

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
      <TableBox download={"설문지 변경 기록"}>
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
