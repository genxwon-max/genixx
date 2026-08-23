"use client";

import { useState } from "react";
import Link from "next/link";
import { can, rounds } from "@/lib/admin";
import { recordAction, useAdminPrefs } from "@/lib/adminStore";
import { LEVELS, gradeBands, talentOf, type GradeBand } from "@/lib/blueprint";
import {
  addFormItems,
  checkForm,
  confirmForm,
  createForm,
  deleteForm,
  formItems,
  formPoints,
  levelCount,
  levelLabel,
  moveFormItem,
  removeFormItem,
  reopenForm,
  setFormItems,
  suggestItems,
  useForms,
  type ExamForm,
} from "@/lib/formStore";
import { useItems, type ItemDraft } from "@/lib/itemStore";
import { Callout, TableCard } from "./Parts";
import * as a from "./ui";

/**
 * 검사지 조립 (ADM-04-3).
 *
 * 승인된 문항을 골라 한 회차의 검사지를 만든다. 이 화면이 지키는 것은 문항 은행과
 * 같은 전제다 — **기계가 조합을 제안하고 사람이 확정한다.** 제안 버튼은 초안만
 * 바꾸고, 확정은 언제나 사람이 누른다.
 *
 * 확정하면 잠근다. 응시가 시작된 뒤 문항이 갈리면 같은 회차 안에서 서로 다른
 * 검사지를 푼 아이들이 생기고, 그 점수는 견줄 수 없다. 풀 수는 있되 왜 풀었는지가
 * 기록에 남는다.
 */
const subjectList: ItemDraft["subject"][] = ["국어", "수학", "과학"];

export default function FormBuilder() {
  const forms = useForms();
  const items = useItems();
  const prefs = useAdminPrefs();

  const [openId, setOpenId] = useState<string | null>(null);
  const [round, setRound] = useState(rounds[0].id);
  const [subject, setSubject] = useState<ItemDraft["subject"]>("국어");
  const [band, setBand] = useState<GradeBand>("3-4");

  const by = prefs.staffName || "운영자";
  const mayBuild = can(prefs.role, "item.write") || can(prefs.role, "item.review");
  const mayConfirm = can(prefs.role, "item.review");

  const open = forms.find((f) => f.id === openId) ?? null;

  return (
    <>
      {/* 새로 만들기 */}
      {mayBuild && (
        <div className={`${a.panel} p-5`}>
          <p className={a.label}>검사지 새로 만들기</p>
          <p className={`${a.hint} mt-1`}>
            한 검사지는 한 회차 · 한 과목 · 한 학년군입니다. 학년군이 섞이면 성취기준이 달라 같은
            잣대로 볼 수 없습니다.
          </p>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <label className="block">
              <span className={a.label}>회차</span>
              <select
                value={round}
                onChange={(e) => setRound(e.target.value)}
                className={`${a.select} mt-1.5 w-56`}
              >
                {rounds.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className={a.label}>과목</span>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value as ItemDraft["subject"])}
                className={`${a.select} mt-1.5 w-32`}
              >
                {subjectList.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className={a.label}>학년군</span>
              <select
                value={band}
                onChange={(e) => setBand(e.target.value as GradeBand)}
                className={`${a.select} mt-1.5 w-44`}
              >
                {gradeBands.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => setOpenId(createForm(round, subject, band, by).id)}
              className={a.btnPrimary}
            >
              + 검사지 만들기
            </button>
          </div>
        </div>
      )}

      {/* 만들어 둔 검사지 */}
      <div className="mt-5">
        <TableCard
          title={`검사지 ${forms.length}건`}
          caption="확정된 검사지는 잠깁니다. 고치려면 잠금을 풀어야 하고, 푼 까닭이 기록에 남습니다."
        >
          {forms.length === 0 ? (
            <p className={`${a.bodyText} px-5 py-8`}>
              아직 만든 검사지가 없습니다. 위에서 회차와 과목을 고르고 만드세요.
            </p>
          ) : (
            <table className={a.table}>
              <thead>
                <tr>
                  <th className={a.th}>검사지</th>
                  <th className={a.th}>문항</th>
                  <th className={a.th}>배점</th>
                  <th className={a.th}>앵커</th>
                  <th className={a.th}>상태</th>
                  <th className={a.th}>만든 사람</th>
                  <th className={a.th}>할 일</th>
                </tr>
              </thead>
              <tbody>
                {forms.map((f) => {
                  const picked = formItems(f, items);
                  const anchors = picked.filter((i) => i.anchor).length;
                  return (
                    <tr key={f.id}>
                      <td className={a.tdStrongTight}>{f.title}</td>
                      {/* 몇 개여야 한다는 수가 없으므로 담긴 수만 적는다. 「0건」만
                          붉게 두는 것은 그것이 유일하게 확정을 막는 값이기 때문이다. */}
                      <td className={a.tdNum}>
                        <span className={picked.length === 0 ? "text-rose-700" : undefined}>
                          {picked.length}건
                        </span>
                      </td>
                      <td className={a.tdNum}>{formPoints(picked)}점</td>
                      <td className={a.tdNum}>{anchors}건</td>
                      <td className={a.td}>
                        <span
                          className={`${a.badge} ${
                            f.state === "confirmed" ? "text-emerald-700" : "text-exam-muted"
                          }`}
                        >
                          {f.state === "confirmed" ? "확정" : "초안"}
                        </span>
                      </td>
                      <td className={a.tdTight}>{f.createdBy}</td>
                      <td className={a.td}>
                        <button
                          type="button"
                          onClick={() => setOpenId(openId === f.id ? null : f.id)}
                          className={openId === f.id ? a.btnRow : a.btnRowGhost}
                        >
                          {openId === f.id ? "접기" : "열어 보기"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </TableCard>
      </div>

      {open && (
        <FormEditor
          form={open}
          items={items}
          by={by}
          mayConfirm={mayConfirm}
          onClose={() => setOpenId(null)}
        />
      )}
    </>
  );
}

/**
 * 한 검사지를 여는 판.
 *
 * 회차 편성(ADM-05-4)이 이것을 그대로 가져다 쓴다. 문항을 담고 빼고 순서를 바꾸고
 * 확정하는 일은 어느 길로 들어와도 같아야 하므로, 판을 두 벌 만들지 않는다.
 */
export function FormEditor({
  form,
  items,
  by,
  mayConfirm,
  onClose,
}: {
  form: ExamForm;
  items: ItemDraft[];
  by: string;
  mayConfirm: boolean;
  onClose: () => void;
}) {
  const [ask, setAsk] = useState<null | "confirm" | "reopen">(null);
  /* 목록에서 체크한 것 — 담는 순간 비운다 */
  const [sel, setSel] = useState<string[]>([]);
  const [q, setQ] = useState("");

  const picked = formItems(form, items);
  const findings = checkForm(form, picked);
  const blocks = findings.filter((f) => f.tone === "block");
  const warns = findings.filter((f) => f.tone === "warn");
  const byLevel = levelCount(picked);
  const locked = form.state === "confirmed";

  /* 담을 수 있는 것 — 같은 과목·학년군의 승인 문항 중 아직 안 담긴 것 */
  const pool = items.filter(
    (i) =>
      i.state === "approved" &&
      i.subject === form.subject &&
      i.band === form.band &&
      !form.itemIds.includes(i.id),
  );

  /* 찾기를 두는 까닭: 은행이 자라면 담을 수 있는 문항이 수백 건이 된다. 그때
     체크 상자만 있고 찾기가 없으면 스크롤로 문항을 뒤지게 된다. */
  const needle = q.trim().toLowerCase();
  const shown = needle
    ? pool.filter((i) =>
        [i.code, i.id, i.stem, i.unit, i.level].some((f) =>
          (f ?? "").toLowerCase().includes(needle),
        ),
      )
    : pool;
  const allOn = shown.length > 0 && shown.every((i) => sel.includes(i.id));
  const toggle = (id: string) =>
    setSel((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  const suggest = () => {
    const { itemIds, short } = suggestItems(form, items);
    setFormItems(
      form.id,
      itemIds,
      by,
      /* 「모자란다」고 적지 않는다. 채워야 할 정원이 없으므로 모자란 것이 아니라,
         제안이 밑그림만큼 뽑으려 했는데 은행에 그만큼이 없었던 것이다. */
      short.length === 0
        ? `조합 제안 ${itemIds.length}문항`
        : `조합 제안 ${itemIds.length}문항 (은행에 없어 못 채운 단계 ${short.join(" · ")})`,
    );
  };

  return (
    <section className={`${a.panel} mt-6 p-6`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className={a.cardTitle}>{form.title}</h3>
          <p className={`${a.hint} mt-1.5`}>
            {form.id} · 만든 사람 {form.createdBy} · {form.createdAt}
            {locked && ` · 확정 ${form.confirmedBy} ${form.confirmedAt}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!locked && (
            <button type="button" onClick={suggest} className={a.btnGhost}>
              AI로 조합 제안받기
            </button>
          )}
          {!locked && mayConfirm && (
            <button
              type="button"
              onClick={() => setAsk("confirm")}
              disabled={blocks.length > 0}
              className={blocks.length > 0 ? a.btnDisabled : a.btnPrimary}
            >
              검사지 확정하기
            </button>
          )}
          {locked && mayConfirm && (
            <button type="button" onClick={() => setAsk("reopen")} className={a.btnDanger}>
              잠금 풀기
            </button>
          )}
          <button type="button" onClick={onClose} className={a.btnGhost}>
            닫기
          </button>
        </div>
      </div>

      {locked && (
        <div className="mt-5">
          <Callout tone="good" title="확정된 검사지입니다">
            {form.confirmedBy} 님이 {form.confirmedAt}에 확정했습니다. 응시가 시작된 뒤 문항이
            갈리면 같은 회차 안에서 서로 다른 검사지를 푼 아이들이 생기므로 잠가 둡니다.
          </Callout>
        </div>
      )}

      {/* 배분 대조 */}
      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* 「3/3」처럼 목표치를 붙여 두지 않는다. 몇 개여야 하는 수가 없으므로
            그 분모는 지키지 않아도 되는 약속이 되고, 그러면 매번 무시하게 된다.
            비어 있는 층(0건)만 눈에 걸리게 둔다. */}
        {LEVELS.map((l) => (
          <div key={l} className="rounded-md border border-exam-line p-3.5">
            <p className={a.label}>{levelLabel(l)}</p>
            <p className={`${a.metric} mt-1 ${byLevel[l] === 0 ? "text-amber-700" : ""}`}>
              {byLevel[l]}건
            </p>
          </div>
        ))}
      </div>

      <p className={`${a.hint} mt-3`}>
        문항 {picked.length}건 · 배점 {formPoints(picked)}점 · 앵커{" "}
        {picked.filter((i) => i.anchor).length}건
      </p>

      {(blocks.length > 0 || warns.length > 0) && (
        <div className="mt-5 space-y-4">
          {blocks.length > 0 && (
            <Callout tone="warn" title={`확정할 수 없습니다 — ${blocks.length}건`}>
              <ul className="space-y-1">
                {blocks.map((f) => (
                  <li key={f.text}>· {f.text}</li>
                ))}
              </ul>
            </Callout>
          )}
          {warns.length > 0 && (
            <Callout tone="info" title={`짚고 넘어갈 것 — ${warns.length}건`}>
              <ul className="space-y-1">
                {warns.map((f) => (
                  <li key={f.text}>· {f.text}</li>
                ))}
              </ul>
              <p className={`${a.hint} mt-2`}>
                막지는 않습니다. 파일럿 회차처럼 은행이 얇을 때는 사람이 보고 그대로 갈 수 있어야
                합니다.
              </p>
            </Callout>
          )}
        </div>
      )}

      {/* 담긴 문항 */}
      <div className="mt-6">
        <p className={a.label}>담긴 문항 {picked.length}건</p>
        {picked.length === 0 ? (
          <p className={`${a.bodyText} mt-2`}>
            아직 비어 있습니다. 아래 목록에서 넣을 문항을 체크해 담으세요. 몇 개를 담아야
            한다는 수는 없습니다.
          </p>
        ) : (
          <ol className="mt-2 space-y-2">
            {picked.map((i, n) => (
              <li
                key={i.id}
                className="flex flex-wrap items-start gap-3 rounded-md border border-exam-line p-3.5"
              >
                <span className="w-6 shrink-0 text-right adm-t-md font-bold tabular-nums text-exam-muted">
                  {n + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <Link
                    href={`/admin/items/${i.id}`}
                    className="adm-t-md font-bold text-brand-700 underline underline-offset-4"
                  >
                    {i.code || i.id}
                  </Link>
                  <span className={`${a.hint} ml-2`}>
                    {i.level} · {talentOf(i.talent).name} · {i.points}점
                    {i.anchor && <span className="ml-1.5 font-bold text-brand-700">앵커</span>}
                    {i.disclosed && <span className="ml-1.5 font-bold text-rose-700">공개됨</span>}
                  </span>
                  <span className="mt-1 block adm-t-md text-exam-text">{i.stem}</span>
                </span>
                {!locked && (
                  <span className="flex shrink-0 flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => moveFormItem(form.id, i.id, -1)}
                      disabled={n === 0}
                      className={n === 0 ? `${a.btnRowGhost} opacity-40` : a.btnRowGhost}
                    >
                      위로
                    </button>
                    <button
                      type="button"
                      onClick={() => moveFormItem(form.id, i.id, 1)}
                      disabled={n === picked.length - 1}
                      className={
                        n === picked.length - 1 ? `${a.btnRowGhost} opacity-40` : a.btnRowGhost
                      }
                    >
                      아래로
                    </button>
                    <button
                      type="button"
                      onClick={() => removeFormItem(form.id, i.id, by, i.code || i.id)}
                      className={`${a.btnRowGhost} text-rose-700`}
                    >
                      빼기
                    </button>
                  </span>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* ── 담을 수 있는 문항 ──
          한 건씩 「담기」를 누르던 자리다. 열 문항을 넣으려면 열 번을 누르고 그때마다
          목록이 다시 그려져, 어디까지 골랐는지 눈이 매번 잃었다. 목록에서 체크해
          모아 담는 것이 실제로 하는 일이다. */}
      {!locked && (
        <div className="mt-6 border-t border-exam-line pt-5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <p className={a.label}>담을 수 있는 문항 {pool.length}건</p>
            <p className={a.hint}>
              {form.subject} · {form.band === "3-4" ? "초등 3~4학년군" : "초등 5~6학년군"}의 승인
              문항입니다. 몇 개를 담아야 한다는 수는 없습니다.
            </p>
          </div>

          {pool.length === 0 ? (
            <p className={`${a.bodyText} mt-2`}>
              더 담을 문항이 없습니다. 출제 워크벤치에서 만들어 검수를 지나야 여기 올라옵니다.
            </p>
          ) : (
            <>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <input
                  type="search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  aria-label="담을 문항 찾기"
                  placeholder="문항 번호 · 발문 · 단원 · 단계로 찾기"
                  className={`${a.input} w-full sm:w-80`}
                />
                <button
                  type="button"
                  onClick={() =>
                    setSel(allOn ? [] : [...new Set([...sel, ...shown.map((i) => i.id)])])
                  }
                  disabled={shown.length === 0}
                  className={shown.length === 0 ? a.btnDisabled : a.btnGhost}
                >
                  {allOn ? "고른 것 풀기" : `보이는 ${shown.length}건 모두 고르기`}
                </button>
                {/* 담는 단추는 고른 수를 제 이름에 넣는다 — 몇 건이 들어가는지
                    누르기 전에 보여야 한다 */}
                <button
                  type="button"
                  disabled={sel.length === 0}
                  onClick={() => {
                    const codes = pool
                      .filter((i) => sel.includes(i.id))
                      .map((i) => i.code || i.id);
                    addFormItems(
                      form.id,
                      sel,
                      by,
                      `${codes.length}건 넣음 — ${codes.join(", ")}`,
                    );
                    setSel([]);
                  }}
                  className={sel.length === 0 ? a.btnDisabled : a.btnPrimary}
                >
                  고른 {sel.length}건 담기
                </button>
              </div>

              {shown.length === 0 ? (
                <p className={`${a.bodyText} mt-3`}>찾는 조건에 맞는 문항이 없습니다.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {shown.map((i) => {
                    const on = sel.includes(i.id);
                    return (
                      <li key={i.id}>
                        {/* 줄 전체가 체크 상자다. 작은 네모만 누를 수 있으면 손이
                            떨리거나 화면이 작을 때 매번 빗나간다. */}
                        <label
                          className={`flex cursor-pointer flex-wrap items-start gap-3 rounded-md border p-3.5 transition-colors ${
                            on
                              ? "border-brand-900 bg-exam-raised"
                              : "border-exam-line hover:bg-exam-raised"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={on}
                            onChange={() => toggle(i.id)}
                            className="mt-1 h-4 w-4 shrink-0 accent-brand-900"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="adm-t-md font-bold text-exam-text">
                              {i.code || i.id}
                            </span>
                            <span className={`${a.hint} ml-2`}>
                              {i.level} · {talentOf(i.talent).name} · {i.points}점
                              {i.anchor && (
                                <span className="ml-1.5 font-bold text-brand-700">앵커</span>
                              )}
                              {i.disclosed && (
                                <span className="ml-1.5 font-bold text-rose-700">공개됨</span>
                              )}
                              {i.correctRate !== null && (
                                <span className="ml-1.5">정답률 {i.correctRate}%</span>
                              )}
                            </span>
                            <span className="mt-1 block adm-t-md text-exam-muted">{i.stem}</span>
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          )}
        </div>
      )}

      {/* 기록 */}
      <div className="mt-6 border-t border-exam-line pt-5">
        <p className={a.label}>이 검사지에 한 일 {form.log.length}건</p>
        <ul className="mt-2 space-y-1.5">
          {[...form.log].reverse().map((l, n) => (
            <li key={n} className="adm-t-md text-exam-text">
              <span className={a.hint}>
                {l.at} · {l.by}
              </span>{" "}
              {l.text}
            </li>
          ))}
        </ul>
        {form.state === "draft" && form.itemIds.length === 0 && (
          <button
            type="button"
            onClick={() => {
              deleteForm(form.id);
              onClose();
            }}
            className={`${a.btnGhost} mt-4`}
          >
            이 빈 검사지 지우기
          </button>
        )}
      </div>

      {ask && (
        <ConfirmBox
          mode={ask}
          form={form}
          warns={warns.map((w) => w.text)}
          onClose={() => setAsk(null)}
          onConfirm={(text) => {
            if (ask === "confirm") {
              confirmForm(form.id, by, text);
              recordAction(form.title, "검사지 확정", text, by);
            } else {
              reopenForm(form.id, by, text);
              recordAction(form.title, "검사지 잠금 해제", text, by);
            }
            setAsk(null);
          }}
        />
      )}
    </section>
  );
}

/**
 * 확정·잠금 해제 전에 한 번 묻는다.
 *
 * 확정은 이 화면의 관문이다. 기계가 고른 조합이라도 사람이 여기서 이름을 걸어야
 * 회차에 나간다 — 그 순서를 뒤집으면 사람이 한 번도 안 본 검사지가 아이들 앞에 갈 수 있다.
 */
function ConfirmBox({
  mode,
  form,
  warns,
  onConfirm,
  onClose,
}: {
  mode: "confirm" | "reopen";
  form: ExamForm;
  warns: string[];
  onConfirm: (text: string) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState("");
  const short = text.trim().length < 10;
  const confirm = mode === "confirm";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-brand-950/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="form-confirm-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-exam-line bg-white p-6 sm:p-8">
        <h2 id="form-confirm-title" className={a.pageTitle}>
          {confirm ? "이 검사지를 확정합니다" : "확정을 풀고 다시 고칩니다"}
        </h2>
        <p className={`${a.bodyText} mt-2.5`}>{form.title}</p>
        <p className={`${a.bodyText} mt-2`}>
          {confirm
            ? "확정하면 잠깁니다. 이 회차 응시자는 이 순서 그대로 풉니다."
            : "잠금을 풀면 문항을 다시 고칠 수 있습니다. 이미 응시가 시작되었다면 같은 회차 안에서 서로 다른 검사지를 푼 아이들이 생깁니다."}
        </p>

        {confirm && warns.length > 0 && (
          <div className="mt-5">
            <Callout tone="warn" title="짚고 넘어갈 것">
              <ul className="space-y-1">
                {warns.map((w) => (
                  <li key={w}>· {w}</li>
                ))}
              </ul>
            </Callout>
          </div>
        )}

        <div className="mt-5">
          <label htmlFor="form-confirm-text" className={a.label}>
            {confirm ? "확정 소견을 적어 주세요" : "왜 푸는지 적어 주세요"}
          </label>
          <p className={`${a.hint} mt-1`}>
            {confirm
              ? "예: 단계 배분과 앵커 비율을 확인했고, S4가 한 건 모자란 것은 다음 회차에 채우기로 함"
              : "예: 7번 문항 보기에 오탈자가 발견되어 교체합니다"}
          </p>
          <textarea
            id="form-confirm-text"
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
            className={short ? a.btnDisabled : confirm ? a.btnPrimary : a.btnDanger}
          >
            기록을 남기고 {confirm ? "확정" : "잠금 풀기"}
          </button>
          <button type="button" onClick={onClose} className={a.btnGhost}>
            그만두기
          </button>
        </div>
      </div>
    </div>
  );
}
