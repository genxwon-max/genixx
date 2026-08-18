"use client";

import { useState } from "react";
import { can } from "@/lib/admin";
import { recordAction, useAdminPrefs } from "@/lib/adminStore";
import {
  blockText,
  clearOverride,
  holdReport,
  labelCheck,
  overrideBlock,
  publishReport,
  reopenReport,
  reportCheck,
  reportStateLabel,
  reportStateTone,
  useReports,
  type ReportBlock,
  type ReportDoc,
} from "@/lib/reportStore";
import { Callout, PageHead, TableCard } from "./Parts";
import * as a from "./ui";

/**
 * 리포트 승인 (EXP-08).
 *
 * 이 화면이 이 서비스의 관문이다. **여기서 발행을 누르기 전까지 보호자 화면에는
 * 결과가 보이지 않는다.** 조립은 규칙이 하고, 내보내는 것은 사람이 한다.
 *
 * 그래서 문구만 보여 주지 않는다. 블록마다 「어떤 규칙으로 뽑혔고 근거 수치가
 * 무엇인지」를 함께 편다. 근거가 없으면 검토자는 읽기 좋은 글인지만 보게 되고,
 * 정작 이 아이 자료에서 나온 말인지는 확인할 수 없다.
 *
 * 라벨링 점검은 기계가 먼저 훑는다. 등급·서열·이름표는 막고(헌장 7조), 단정·비교
 * 표현은 짚기만 한다 — 맥락에 따라 괜찮을 수 있고, 그 판단은 사람이 한다.
 */
export default function ReportApproval() {
  const reports = useReports();
  const prefs = useAdminPrefs();
  const [openId, setOpenId] = useState<string | null>(null);

  const may = can(prefs.role, "report.publish");
  const open = reports.find((r) => r.id === openId) ?? null;

  const waiting = reports.filter((r) => r.state === "review");
  const held = reports.filter((r) => r.state === "hold");
  const done = reports.filter((r) => r.state === "published");

  return (
    <>
      <PageHead
        id="EXP-08"
        title="리포트 승인"
        lead="조립된 리포트를 확인하고 발행합니다. 발행하기 전까지 보호자 화면에는 결과가 보이지 않습니다 — 이 화면이 그 관문입니다."
      />

      <Callout tone="info" title="조립은 규칙이 하고, 내보내는 것은 사람이 합니다">
        블록마다 어떤 규칙으로 뽑혔는지와 그 규칙이 본 수치를 함께 적어 두었습니다. 문장이 매끄러운지가
        아니라 <b>이 아이 자료에서 나온 말인지</b>를 보셔야 합니다.
      </Callout>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Stat label="검토 대기" value={`${waiting.length}건`} note="보호자 화면은 닫혀 있습니다" />
        <Stat label="보류" value={`${held.length}건`} note="판정을 다시 보기로 한 건" />
        <Stat label="발행됨" value={`${done.length}건`} note="보호자가 열어 볼 수 있습니다" />
      </div>

      <div className="mt-5">
        <TableCard
          title={`리포트 ${reports.length}건`}
          caption="라벨링 점검에 걸린 건은 고치기 전에는 발행되지 않습니다."
        >
          <table className={a.table}>
            <thead>
              <tr>
                <th className={a.th}>리포트</th>
                <th className={a.th}>학생</th>
                <th className={a.th}>회차</th>
                <th className={a.th}>유형</th>
                <th className={a.th}>신뢰도</th>
                <th className={a.th}>점검</th>
                <th className={a.th}>상태</th>
                <th className={a.th}>할 일</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => {
                const found = reportCheck(r);
                const blocks = found.filter((f) => f.tone === "block").length;
                const warns = found.length - blocks;
                return (
                  <tr key={r.id}>
                    <td className={a.tdStrongTight}>{r.id}</td>
                    <td className={a.td}>
                      {r.student} · {r.grade}
                    </td>
                    <td className={a.tdTight}>{r.round}</td>
                    <td className={a.td}>
                      {r.typeCode} {r.typeName}
                    </td>
                    <td className={a.tdTight}>{r.confidence}</td>
                    <td className={a.td}>
                      {blocks > 0 ? (
                        <span className="font-bold text-rose-700">막힘 {blocks}건</span>
                      ) : warns > 0 ? (
                        <span className="font-bold text-amber-700">짚을 것 {warns}건</span>
                      ) : (
                        <span className="text-emerald-700">깨끗함</span>
                      )}
                    </td>
                    <td className={a.td}>
                      <span className={`${a.badge} ${reportStateTone[r.state]}`}>
                        {reportStateLabel[r.state]}
                      </span>
                    </td>
                    <td className={a.td}>
                      <button
                        type="button"
                        onClick={() => setOpenId(openId === r.id ? null : r.id)}
                        className={openId === r.id ? a.btnRow : a.btnRowGhost}
                      >
                        {openId === r.id ? "접기" : "열어 보기"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableCard>
      </div>

      {open && (
        <ReportPanel
          doc={open}
          by={prefs.staffName || "운영자"}
          may={may}
          onClose={() => setOpenId(null)}
        />
      )}

      {!may && (
        <p className={`${a.hint} mt-4`}>
          발행은 리포트 발행 권한이 있는 사람(마스터)이 누릅니다. 지금은 읽기만 할 수 있습니다.
        </p>
      )}
    </>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className={`${a.panel} p-4`}>
      <p className={a.label}>{label}</p>
      <p className={`${a.metric} mt-1`}>{value}</p>
      <p className={`${a.hint} mt-0.5`}>{note}</p>
    </div>
  );
}

function ReportPanel({
  doc,
  by,
  may,
  onClose,
}: {
  doc: ReportDoc;
  by: string;
  may: boolean;
  onClose: () => void;
}) {
  const [ask, setAsk] = useState<null | "publish" | "hold">(null);
  const found = reportCheck(doc);
  const blocked = found.filter((f) => f.tone === "block");
  const locked = doc.state === "published";

  return (
    <section className={`${a.panel} mt-6 p-6`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className={a.cardTitle}>
            {doc.student} · {doc.typeCode} {doc.typeName}
          </h2>
          <p className={`${a.hint} mt-1.5`}>
            {doc.id} · {doc.round} · 조립 {doc.assembledAt} · 신뢰도 {doc.confidence}
            {locked && ` · 발행 ${doc.publishedBy} ${doc.publishedAt}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {may && !locked && (
            <>
              <button
                type="button"
                onClick={() => setAsk("publish")}
                disabled={blocked.length > 0}
                className={blocked.length > 0 ? a.btnDisabled : a.btnPrimary}
              >
                발행 승인
              </button>
              <button type="button" onClick={() => setAsk("hold")} className={a.btnDanger}>
                보류하기
              </button>
            </>
          )}
          {may && doc.state === "hold" && (
            <button
              type="button"
              onClick={() => reopenReport(doc.id, by)}
              className={a.btnGhost}
            >
              보류 풀기
            </button>
          )}
          <button type="button" onClick={onClose} className={a.btnGhost}>
            닫기
          </button>
        </div>
      </div>

      {locked ? (
        <div className="mt-5">
          <Callout tone="good" title="발행된 리포트입니다">
            {doc.publishedBy} 님이 {doc.publishedAt}에 발행했습니다. 보호자 화면에서 열어 볼 수
            있습니다. 발행된 리포트의 문구는 여기서 고치지 않습니다 — 이미 나간 글을 조용히
            바꾸면 보호자가 본 것과 기록이 달라집니다.
          </Callout>
        </div>
      ) : (
        <div className="mt-5">
          <Callout tone="warn" title="아직 보호자에게 보이지 않습니다">
            {doc.state === "hold"
              ? `보류 중입니다 — ${doc.holdReason}`
              : "발행을 누르기 전까지 보호자 화면은 「전문가 확인 중」으로 남습니다."}
          </Callout>
        </div>
      )}

      {/* 라벨링 점검 */}
      <div className="mt-5">
        <p className={a.label}>라벨링 점검 (진단 윤리 헌장 7조)</p>
        {found.length === 0 ? (
          <p className={`${a.bodyText} mt-1.5`}>걸린 표현이 없습니다.</p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {found.map((f, n) => (
              <li key={n} className="adm-t-md text-exam-text">
                <span className={`font-bold ${f.tone === "block" ? "text-rose-700" : "text-amber-700"}`}>
                  {f.tone === "block" ? "막힘" : "짚을 것"}
                </span>{" "}
                「{f.word}」 — {f.title} · {f.why}
              </li>
            ))}
          </ul>
        )}
        {blocked.length > 0 && (
          <p className="mt-2 adm-t-md font-bold text-rose-700">
            막힌 표현이 남아 있어 발행할 수 없습니다. 아래에서 고쳐 주세요.
          </p>
        )}
      </div>

      {/* 블록 */}
      <div className="mt-6 space-y-3">
        {doc.blocks.map((blk) => (
          <Block key={blk.id} doc={doc} blk={blk} by={by} may={may && !locked} />
        ))}
      </div>

      {/* 기록 */}
      <div className="mt-6 border-t border-exam-line pt-5">
        <p className={a.label}>이 리포트에 한 일 {doc.log.length}건</p>
        <ul className="mt-2 space-y-1.5">
          {[...doc.log].reverse().map((l, n) => (
            <li key={n} className="adm-t-md text-exam-text">
              <span className={a.hint}>
                {l.at} · {l.by}
              </span>{" "}
              {l.text}
            </li>
          ))}
        </ul>
      </div>

      {ask && (
        <ReasonBox
          mode={ask}
          doc={doc}
          onClose={() => setAsk(null)}
          onConfirm={(text) => {
            if (ask === "publish") {
              publishReport(doc.id, by, text);
              recordAction(`${doc.student} 리포트 ${doc.id}`, "리포트 발행", text, by);
            } else {
              holdReport(doc.id, by, text);
              recordAction(`${doc.student} 리포트 ${doc.id}`, "리포트 보류", text, by);
            }
            setAsk(null);
          }}
        />
      )}
    </section>
  );
}

/** 블록 하나 — 문구와 그 문구가 나온 근거를 나란히 둔다 */
function Block({
  doc,
  blk,
  by,
  may,
}: {
  doc: ReportDoc;
  blk: ReportBlock;
  by: string;
  may: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(blockText(blk));
  const [why, setWhy] = useState("");

  const found = labelCheck(blockText(blk));
  const bad = found.some((f) => f.tone === "block");
  const short = why.trim().length < 10;

  return (
    <div className={`rounded-md border p-4 ${bad ? "border-rose-300" : "border-exam-line"}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="adm-t-md font-bold text-exam-text">
          {blk.title}
          <span className={`${a.hint} ml-2`}>{blk.section}</span>
          {blk.override && <span className="ml-2 adm-t-sm font-bold text-brand-700">수정됨</span>}
        </p>
        {may && !editing && (
          <button
            type="button"
            onClick={() => {
              setText(blockText(blk));
              setEditing(true);
            }}
            className={a.btnRowGhost}
          >
            문구 고치기
          </button>
        )}
      </div>

      {/* 근거 — 문구보다 먼저 읽혀야 한다 */}
      <div className="mt-2 border-l-4 border-exam-line pl-3">
        <p className={a.hint}>{blk.rule}</p>
        <p className="adm-t-sm font-bold text-exam-text">근거 — {blk.evidence}</p>
      </div>

      {editing ? (
        <div className="mt-3">
          <textarea
            rows={4}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className={`${a.input} resize-y`}
            aria-label={`${blk.title} 문구`}
          />
          {labelCheck(text).length > 0 && (
            <ul className="mt-2 space-y-1">
              {labelCheck(text).map((f, n) => (
                <li
                  key={n}
                  className={`adm-t-sm font-bold ${f.tone === "block" ? "text-rose-700" : "text-amber-700"}`}
                >
                  「{f.word}」 {f.why}
                </li>
              ))}
            </ul>
          )}
          <label className="mt-3 block">
            <span className={a.label}>왜 고치는지</span>
            <textarea
              rows={2}
              value={why}
              onChange={(e) => setWhy(e.target.value)}
              placeholder="10자 이상 — 같은 템플릿이 다음 아이에게도 같은 문제를 일으키는지 보려면 남아야 합니다"
              className={`${a.input} mt-1.5 resize-none`}
            />
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={short || !text.trim()}
              onClick={() => {
                overrideBlock(doc.id, blk.id, text.trim(), by, why.trim());
                setWhy("");
                setEditing(false);
              }}
              className={short || !text.trim() ? a.btnDisabled : a.btnPrimary}
            >
              고친 문구로 바꾸기
            </button>
            <button type="button" onClick={() => setEditing(false)} className={a.btnGhost}>
              그만두기
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-3 whitespace-pre-wrap adm-t-md leading-relaxed text-exam-text">
          {blockText(blk)}
        </p>
      )}

      {blk.override && !editing && (
        <div className="mt-3 border-t border-exam-line pt-3">
          <p className={a.hint}>
            {blk.overrideBy} · {blk.overrideAt} · {blk.overrideWhy}
          </p>
          <p className={`${a.hint} mt-1.5`}>템플릿 원문 — {blk.text}</p>
          {may && (
            <button
              type="button"
              onClick={() => clearOverride(doc.id, blk.id, by)}
              className={`${a.btnRowGhost} mt-2`}
            >
              원문으로 되돌리기
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** 발행·보류 전에 소견을 받는다 — 이 판정에 이름을 거는 자리다 */
function ReasonBox({
  mode,
  doc,
  onConfirm,
  onClose,
}: {
  mode: "publish" | "hold";
  doc: ReportDoc;
  onConfirm: (text: string) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState("");
  const short = text.trim().length < 10;
  const publish = mode === "publish";
  const warns = reportCheck(doc).filter((f) => f.tone === "warn");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-brand-950/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-ask-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-exam-line bg-white p-6 sm:p-8">
        <h2 id="report-ask-title" className={a.pageTitle}>
          {publish ? `${doc.student} 학생 리포트를 발행합니다` : "이 리포트를 보류합니다"}
        </h2>
        <p className={`${a.bodyText} mt-2.5`}>
          {publish
            ? "누르는 즉시 보호자 화면이 열립니다. 발행한 사람의 이름이 리포트 이력에 남고, 보호자가 요청하면 그대로 보여 드립니다."
            : "보호자 화면은 계속 닫혀 있습니다. 무엇을 다시 봐야 하는지 적어 주세요."}
        </p>

        {publish && warns.length > 0 && (
          <div className="mt-5">
            <Callout tone="warn" title="짚어 둔 표현이 남아 있습니다">
              <ul className="space-y-1">
                {warns.map((w, n) => (
                  <li key={n}>
                    · 「{w.word}」 {w.title}
                  </li>
                ))}
              </ul>
              <p className={`${a.hint} mt-2`}>
                막지는 않습니다. 맥락에 따라 괜찮을 수 있고, 그 판단은 사람이 합니다.
              </p>
            </Callout>
          </div>
        )}

        <div className="mt-5">
          <label htmlFor="report-ask-text" className={a.label}>
            {publish ? "확정 소견" : "보류 사유"}
          </label>
          <p className={`${a.hint} mt-1`}>
            {publish
              ? "예: 근거 수치와 문구가 맞고, 낮게 나온 축 서술이 능력 부족으로 읽히지 않는 것을 확인함"
              : "예: 서술형 답안을 다시 읽어야 함 — 관찰 축 점수와 응답 내용이 어긋남"}
          </p>
          <textarea
            id="report-ask-text"
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="10자 이상 적어 주세요"
            className={`${a.input} mt-2 resize-none`}
          />
          <p className={`mt-1.5 adm-t-sm font-bold ${short ? "text-rose-700" : "text-emerald-700"}`}>
            {short ? `${10 - text.trim().length}자 더 적어 주세요` : "충분히 입력되었습니다"}
          </p>
        </div>

        <div className="mt-7 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={short}
            onClick={() => onConfirm(text.trim())}
            className={short ? a.btnDisabled : publish ? a.btnPrimary : a.btnDanger}
          >
            기록을 남기고 {publish ? "발행" : "보류"}
          </button>
          <button type="button" onClick={onClose} className={a.btnGhost}>
            그만두기
          </button>
        </div>
      </div>
    </div>
  );
}
