"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { can } from "@/lib/admin";
import { useAdminPrefs } from "@/lib/adminStore";
import { useHydrated } from "@/lib/examStore";
import {
  addComment,
  assetKindOf,
  attachAsset,
  itemReady,
  itemTypes,
  MAX_ASSET_BYTES,
  missingFields,
  patchItem,
  removeAsset,
  reviseApproved,
  setLevel,
  standardIssue,
  stateLabel,
  stateTone,
  submitItem,
  suggestCode,
  syncTags,
  useItems,
  withdrawItem,
  type ItemDraft,
} from "@/lib/itemStore";
import {
  boundaryRules,
  codeSamples,
  decisionTree,
  decisiveRule,
  formatLine,
  gradeBands,
  LEVELS,
  levelAllowed,
  levelSpecs,
  submitChecklist,
  subskillOf,
  subskillsOf,
  talents,
  type GradeBand,
  type TalentId,
} from "@/lib/blueprint";
import { Button } from "@/components/ui/button";
import CommentList from "./CommentList";
import { Callout, Foldable } from "./Parts";
import * as a from "./ui";

const subjects = ["국어", "수학", "과학"] as const;

/**
 * EXP-02-1 문항 카드 — 발주서 §3의 7개 항목을 그 순서·명칭대로 세운 폼.
 *
 * 발주서가 「항목 순서·명칭을 지켜 주시기 바랍니다」라고 못 박았으므로 화면도
 * ①~⑦을 그대로 번호를 달아 나눈다. 종이 발주서를 옆에 놓고 대조할 수 있어야
 * 출제자가 자기가 어디를 쓰고 있는지 잃지 않는다.
 *
 * 규칙 중 화면이 대신 지킬 수 있는 것은 화면이 지킨다 —
 *  · 단계를 고르면 형식·배점·b모수가 따라온다(§1 고정 매핑). 형식을 먼저 고르고
 *    단계를 끼워 맞추는 길은 열지 않는다 — 발주서가 「판별 → 형식」 순서를 못 박았다.
 *  · 성취기준 코드는 학년군 접두까지 본다. 코드가 없거나 학년군을 벗어나면
 *    접수 반려되므로(§7.2) 제출을 막는다.
 *  · 자기-성찰 S4처럼 그 재능이 출제할 수 없는 단계는 고를 수 없다(§2 출제 범위).
 *
 * 쓰는 동안은 임시저장이다. 칸을 떠날 때가 아니라 글자를 칠 때마다 저장된다.
 */
export default function ItemCard({ id }: { id: string }) {
  const router = useRouter();
  const prefs = useAdminPrefs();
  const hydrated = useHydrated();
  const items = useItems();
  const [reply, setReply] = useState("");
  const [preview, setPreview] = useState(false);

  const item = items.find((i) => i.id === id);

  if (!hydrated) {
    return <p className="py-16 text-center adm-t-sm text-exam-muted">확인 중입니다…</p>;
  }

  if (!item) {
    return (
      <div className="py-10">
        <Callout tone="warn" title="문항을 찾을 수 없습니다">
          지워졌거나 주소가 잘못되었습니다.{" "}
          <Link href="/admin/authoring" className="font-bold underline underline-offset-4">
            목록으로 돌아가기
          </Link>
        </Callout>
      </div>
    );
  }

  const mayWrite = can(prefs.role, "item.write");
  /** 남이 쓴 문항은 관리자만 고친다 — 출제자끼리 서로의 문항을 덮어쓰지 않게 한다 */
  const mine = item.author === prefs.loginId || prefs.role === "super";
  const locked = item.state === "submitted" || item.state === "approved";
  const editable = mayWrite && mine && !locked;

  const set = (patch: Partial<ItemDraft>) => {
    if (!editable) return;
    const next = { ...item, ...patch };
    patchItem(item.id, { ...patch, ...syncTags(next) });
  };

  const missing = missingFields(item);
  const ready = itemReady(item);
  const spec = levelSpecs[item.level];
  const talent = talents.find((t) => t.id === item.talent)!;
  const sub = subskillOf(item.subskill);
  const std = standardIssue(item);
  const serial = items.filter((i) => i.level === item.level).length;

  return (
    <div className="pb-16">
      {/* 머리 */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4 border-b border-exam-line pb-5">
        <div className="min-w-0">
          <Link
            href="/admin/authoring"
            className="adm-t-sm font-bold text-exam-muted hover:text-exam-text"
          >
            ← 문항 목록
          </Link>
          <h1 className={`${a.pageTitle} mt-2`}>{item.code || "문항 ID 미정"}</h1>
          <p className="mt-1.5 adm-t-sm text-exam-muted">
            {item.authorName} · 마지막 저장 {item.updatedAt} · v{item.version}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className={`adm-t-sm font-bold ${stateTone[item.state]}`}>
            {stateLabel[item.state]}
          </span>
          {editable && (
            <Button
              onClick={() => submitItem(item.id)}
              disabled={!ready}
              title={ready ? undefined : `${missing.join(" · ")}이(가) 남았습니다`}
            >
              검수로 제출
            </Button>
          )}
          {item.state === "submitted" && mayWrite && mine && (
            <Button variant="outline" onClick={() => withdrawItem(item.id)}>
              제출 회수
            </Button>
          )}
          <Button variant="outline" onClick={() => setPreview((v) => !v)}>
            {preview ? "미리보기 닫기" : "미리보기"}
          </Button>
          {item.state === "approved" && mayWrite && (
            <Button
              variant="outline"
              onClick={() => {
                const next = reviseApproved(item.id);
                if (next) router.push(`/admin/authoring/${next.id}`);
              }}
            >
              새 버전으로 고치기
            </Button>
          )}
        </div>
      </div>

      {/* 왜 못 고치는지 · 무엇이 남았는지 */}
      {mayWrite && !mine && (
        <div className="mb-5">
          <Callout tone="info" title="다른 출제자의 문항입니다">
            {item.authorName} 위원이 쓴 문항이라 읽기만 됩니다. 고쳐야 한다면 검수 코멘트로 남기거나
            관리자에게 요청하세요.
          </Callout>
        </div>
      )}
      {editable && !ready && (
        <div className="mb-5">
          <Callout tone="warn" title={`제출까지 ${missing.length}칸 남았습니다`}>
            {missing.join(" · ")}
          </Callout>
        </div>
      )}
      {item.state === "submitted" && (
        <div className="mb-5">
          <Callout tone="info" title="검수 중이라 잠겼습니다">
            검수자가 본 것과 승인되는 것이 달라지면 안 되므로 제출 후에는 고칠 수 없습니다. 고쳐야
            하면 제출을 회수하세요.
          </Callout>
        </div>
      )}

      {item.comments.length > 0 && (
        <section className="mb-6">
          <h2 className={a.cardTitle}>검수 의견</h2>
          <CommentList comments={item.comments} />
          {mayWrite && mine && (
            <div className="mt-3 flex flex-wrap gap-2">
              <input
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="반려 사유에 대한 답을 적습니다"
                className={`${a.input} flex-1`}
              />
              <Button
                variant="outline"
                onClick={() => {
                  if (!reply.trim()) return;
                  addComment(item.id, prefs.staffName || "출제자", prefs.role, reply.trim());
                  setReply("");
                }}
              >
                코멘트 남기기
              </Button>
            </div>
          )}
        </section>
      )}

      {preview && <Preview item={item} />}

      <div className="grid gap-6">
        {/* ① 문항 ID */}
        <Section
          no="①"
          title="문항 ID"
          note="학년 + 교과 + 단원 - 단계 - 일련번호 (예: 4K02-S2-001)"
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="학년군">
              <select
                value={item.band}
                onChange={(e) => set({ band: e.target.value as GradeBand })}
                disabled={!editable}
                className={a.input}
              >
                {gradeBands.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="교과">
              <select
                value={item.subject}
                onChange={(e) => set({ subject: e.target.value as ItemDraft["subject"] })}
                disabled={!editable}
                className={a.input}
              >
                {subjects.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field label="단원 번호" hint="두 자리">
              <input
                value={item.unitNo}
                onChange={(e) => set({ unitNo: e.target.value.replace(/\D/g, "").slice(0, 2) })}
                disabled={!editable}
                placeholder="02"
                className={`${a.input} tabular-nums`}
              />
            </Field>
            <Field label="단원명">
              <input
                value={item.unit}
                onChange={(e) => set({ unit: e.target.value })}
                disabled={!editable}
                placeholder="낱말의 의미 관계"
                className={a.input}
              />
            </Field>
          </div>

          <div className="mt-4 flex flex-wrap items-end gap-3">
            <Field label="문항 ID" className="flex-1 basis-56">
              <input
                value={item.code}
                onChange={(e) => set({ code: e.target.value })}
                disabled={!editable}
                placeholder="4K02-S2-001"
                className={`${a.input} font-black tabular-nums`}
              />
            </Field>
            {editable && (
              <Button
                variant="outline"
                onClick={() => set({ code: suggestCode(item, serial) })}
                title="지금 학년군·교과·단원·단계로 다시 매깁니다"
              >
                자동으로 매기기
              </Button>
            )}
            <label className="flex min-h-11 items-center gap-2.5 adm-t-sm text-exam-text">
              <input
                type="checkbox"
                checked={item.anchor}
                onChange={(e) => set({ anchor: e.target.checked })}
                disabled={!editable}
                className="h-5 w-5 accent-[#1b2a6b]"
              />
              앵커 문항 <span className="text-exam-muted">(전체의 30% · 미공개 재사용)</span>
            </label>
          </div>
        </Section>

        {/* ② 인지단계 */}
        <Section
          no="②"
          title="인지단계"
          note="S1~S4 중 하나. 단계를 고르면 형식·배점·b모수가 따라옵니다."
        >
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {LEVELS.map((l) => {
              const ok = levelAllowed(item.talent, l);
              const on = item.level === l;
              return (
                <button
                  key={l}
                  type="button"
                  onClick={() => editable && ok && setLevel(item.id, l)}
                  disabled={!editable || !ok}
                  aria-pressed={on}
                  className={`rounded-md border px-4 py-3 text-left transition-colors ${
                    on
                      ? "border-brand-900 bg-brand-900 text-white"
                      : ok
                        ? "border-exam-line bg-white text-exam-text hover:bg-slate-50"
                        : "cursor-not-allowed border-exam-line bg-slate-50 text-slate-400"
                  }`}
                >
                  <span className="block adm-t-md font-black">
                    {l} {levelSpecs[l].name}
                  </span>
                  <span
                    className={`mt-0.5 block adm-t-xs ${on ? "text-brand-100" : "text-exam-muted"}`}
                  >
                    {ok ? levelSpecs[l].verb : `${talent.name}은 출제 불가`}
                  </span>
                </button>
              );
            })}
          </div>

          <p className="mt-3 adm-t-sm text-exam-text">
            <b>{spec.define}</b> — {spec.rule}
          </p>
          {talent.scopeNote && <p className="mt-2 adm-t-sm text-exam-muted">{talent.scopeNote}</p>}

          <div className="mt-4">
            <Foldable title="단계를 어떻게 정하는가 — 3문 판별 절차 (§1.2)">
              <p className="adm-t-md leading-relaxed text-exam-muted">
                동사 해석이 아니라 판별 절차로 정합니다. 소재·난이도·형식은 보지 않고 「학생이
                무엇을 하는가」만 봅니다.
              </p>
              <ol className="mt-3 space-y-3">
                {decisionTree.map((q) => (
                  <li key={q.q}>
                    <p className="adm-t-sm font-bold text-exam-text">
                      {q.q}. {q.ask}
                    </p>
                    <p className="mt-1 adm-t-sm text-exam-muted">
                      {q.options.map((o) => `${o.label} → ${o.next}`).join("  ·  ")}
                    </p>
                  </li>
                ))}
              </ol>
              <p className="mt-3 adm-t-md leading-relaxed text-exam-muted">{decisiveRule}</p>
              <dl className="mt-4 space-y-2 border-t border-exam-line pt-3">
                <Def k="허용 조작" v={spec.allow} />
                <Def k="금지 조작" v={spec.deny} />
                <Def k="리트머스 1문" v={spec.litmus} />
              </dl>
            </Foldable>
          </div>
        </Section>

        {/* ③ 성취기준 (Tag A) */}
        <Section
          no="③"
          title="성취기준 (Tag A)"
          note="2022 개정 성취기준 코드 + 내용. 코드가 없으면 접수 반려됩니다."
        >
          <div className="grid gap-4 sm:grid-cols-[14rem_1fr]">
            <Field
              label="코드"
              hint={`예: ${codeSamples[item.band].join(" · ")}`}
              error={item.standardCode.trim() && !std.ok ? std.why : undefined}
            >
              <input
                value={item.standardCode}
                onChange={(e) => set({ standardCode: e.target.value })}
                disabled={!editable}
                placeholder={codeSamples[item.band][0]}
                className={`${a.input} font-bold`}
              />
            </Field>
            <Field label="내용">
              <input
                value={item.standardText}
                onChange={(e) => set({ standardText: e.target.value })}
                disabled={!editable}
                placeholder="낱말과 낱말의 의미 관계를 파악한다."
                className={a.input}
              />
            </Field>
          </div>
          <p className="mt-2 adm-t-sm text-exam-muted">
            코드·내용은 교육부 고시 원문(NCIC 국가교육과정정보센터) 또는 검정 교과서로 대조하세요.
            2015 개정 코드 혼용에 주의합니다.
          </p>
        </Section>

        {/* ④ 이중태그 */}
        <Section
          no="④"
          title="이중태그"
          note="Tag A(학력) 세부 + Tag B(재능 · 하위요소 · 단계) 3원 좌표"
        >
          <Field label="Tag A 세부 — 이 문항이 재는 학력">
            <input
              value={item.tagADetail}
              onChange={(e) => set({ tagADetail: e.target.value })}
              disabled={!editable}
              placeholder="반대말 짝 식별"
              className={a.input}
            />
          </Field>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Tag B 재능 (주태그)">
              <select
                value={item.talent}
                onChange={(e) => {
                  const t = e.target.value as TalentId;
                  const first = subskillsOf(t)[0].code;
                  // 새 재능이 지금 단계를 못 쓰면 쓸 수 있는 가장 높은 단계로 내린다
                  const scope = talents.find((x) => x.id === t)!.scope;
                  const lv = scope.includes(item.level) ? item.level : scope[scope.length - 1];
                  set({ talent: t, subskill: first });
                  if (lv !== item.level) setLevel(item.id, lv);
                }}
                disabled={!editable}
                className={a.input}
              >
                {talents.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.id})
                  </option>
                ))}
              </select>
            </Field>
            <Field label="하위요소">
              <select
                value={item.subskill}
                onChange={(e) => set({ subskill: e.target.value })}
                disabled={!editable}
                className={a.input}
              >
                {subskillsOf(item.talent).map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.code} {s.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {sub && (
            <p className="mt-3 border-l-4 border-brand-700 pl-4 adm-t-md leading-relaxed text-exam-text">
              <b>
                {item.level}에서의 {sub.name}
              </b>{" "}
              — {sub.grid[item.level]}
              <span className="mt-1 block text-exam-muted">{sub.define}</span>
            </p>
          )}

          <p className="mt-4 adm-t-sm font-bold text-exam-text">
            Tag B 좌표 <span className="font-black">{item.tagB || "—"}</span>
          </p>

          <div className="mt-4">
            <Foldable title="부태그 — 두 영역을 불가피하게 걸칠 때만">
              <p className="adm-t-md leading-relaxed text-exam-muted">
                점수는 주태그에만 귀속됩니다. 판별표로도 결정되지 않으면 임의로 태깅하지 말고
                출제본부에 질의하세요.
              </p>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <Field label="부태그 재능">
                  <select
                    value={item.subTalent ?? ""}
                    onChange={(e) => {
                      const t = e.target.value as TalentId | "";
                      set(
                        t
                          ? { subTalent: t, subSubskill: subskillsOf(t)[0].code }
                          : { subTalent: undefined, subSubskill: undefined },
                      );
                    }}
                    disabled={!editable}
                    className={a.input}
                  >
                    <option value="">없음</option>
                    {talents
                      .filter((t) => t.id !== item.talent)
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                  </select>
                </Field>
                {item.subTalent && (
                  <Field label="부태그 하위요소">
                    <select
                      value={item.subSubskill ?? ""}
                      onChange={(e) => set({ subSubskill: e.target.value })}
                      disabled={!editable}
                      className={a.input}
                    >
                      {subskillsOf(item.subTalent).map((s) => (
                        <option key={s.code} value={s.code}>
                          {s.code} {s.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                )}
              </div>

              <table className={`${a.table} mt-4`}>
                <thead>
                  <tr>
                    <th className={a.th}>경계</th>
                    <th className={a.th}>판별 질문</th>
                    <th className={a.th}>판정 규칙</th>
                  </tr>
                </thead>
                <tbody>
                  {boundaryRules.map((b) => (
                    <tr key={b.pair}>
                      <td className={a.tdStrong}>{b.pair}</td>
                      <td className={a.td}>{b.ask}</td>
                      <td className={a.td}>
                        {b.rule}
                        <span className="mt-1 block text-exam-muted">{b.example}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Foldable>
          </div>
        </Section>

        {/* ⑤ 문항형식 · 배점 · b모수 */}
        <Section no="⑤" title="문항형식 · 배점 · b모수" note="단계별 고정 매핑 + 예상 난이도">
          <p className="adm-t-md font-bold text-exam-text">{formatLine(item.level)}</p>
          <p className="mt-1.5 adm-t-sm text-exam-muted">
            형식과 배점은 단계에서 따라옵니다. 형식을 먼저 정하고 단계를 끼워 맞추지 않습니다 —
            판별이 먼저, 형식은 그 결과입니다.
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Field label="문제 유형" hint="채점 방식이 갈립니다">
              <select
                value={item.type}
                onChange={(e) => set({ type: e.target.value as ItemDraft["type"] })}
                disabled={!editable}
                className={a.input}
              >
                {itemTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label} — {t.scoring}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="배점">
              <input
                type="number"
                value={item.points}
                onChange={(e) => set({ points: Number(e.target.value) })}
                disabled={!editable}
                className={`${a.input} tabular-nums`}
              />
            </Field>
            <Field label="예상 난이도 b" hint={`${item.level} 앵커 ${spec.b}`}>
              <input
                type="number"
                step="0.1"
                value={item.b}
                onChange={(e) => set({ b: Number(e.target.value) })}
                disabled={!editable}
                className={`${a.input} tabular-nums`}
              />
            </Field>
          </div>
        </Section>

        {/* ⑥ 문항 / 정답 · 채점 */}
        <Section no="⑥" title="문항 · 정답 · 채점" note="실제 발문·보기 + 정답·부분점수/루브릭">
          <Field label="지문 · 자료" hint="없으면 비워 둡니다">
            <textarea
              value={item.passage}
              onChange={(e) => set({ passage: e.target.value })}
              disabled={!editable}
              rows={3}
              className={a.input}
            />
          </Field>

          <div className="mt-4">
            <Field label="발문">
              <textarea
                value={item.stem}
                onChange={(e) => set({ stem: e.target.value })}
                disabled={!editable}
                rows={3}
                placeholder="다음 중 두 낱말의 관계가 '크다 — 작다'와 같은 것은?"
                className={a.input}
              />
            </Field>
          </div>

          {item.type === "choice" && (
            <div className="mt-4">
              <p className="adm-t-sm font-bold text-exam-text">
                보기 <span className="font-normal text-exam-muted">· 정답에 표시하세요</span>
              </p>
              <ul className="mt-2 space-y-2.5">
                {item.choices.map((c, n) => (
                  <li key={n} className="flex flex-wrap items-start gap-2.5">
                    <label className="flex min-h-11 shrink-0 items-center gap-2 adm-t-sm text-exam-muted">
                      <input
                        type="radio"
                        name="answer"
                        checked={item.answer === n}
                        onChange={() => set({ answer: n })}
                        disabled={!editable}
                        className="h-5 w-5 accent-[#1b2a6b]"
                      />
                      {n + 1}
                    </label>
                    <input
                      value={c}
                      onChange={(e) => {
                        const next = [...item.choices];
                        next[n] = e.target.value;
                        set({ choices: next });
                      }}
                      disabled={!editable}
                      placeholder={`보기 ${n + 1}`}
                      className={`${a.input} min-w-0 flex-1 basis-48`}
                    />
                    <input
                      value={item.distractorIntent[n] ?? ""}
                      onChange={(e) => {
                        const next = [...item.distractorIntent];
                        while (next.length < item.choices.length) next.push("");
                        next[n] = e.target.value;
                        set({ distractorIntent: next });
                      }}
                      disabled={!editable || item.answer === n}
                      placeholder={item.answer === n ? "정답입니다" : "이 오답이 잡는 오개념"}
                      className={`${a.input} min-w-0 flex-1 basis-48`}
                    />
                  </li>
                ))}
              </ul>
              <p className="mt-2 adm-t-sm text-exam-muted">
                매력적 오답(흔한 오개념)이 없으면 변별도가 죽습니다. 오답마다 어떤 오개념을 잡는지
                적어 주세요.
              </p>
            </div>
          )}

          {item.type === "short" && (
            <div className="mt-4">
              <Field
                label="허용 답안"
                hint="쉼표로 구분합니다. AI 자동채점 대비 표기 변이를 모두 등록하세요."
              >
                <input
                  value={item.shortAnswers}
                  onChange={(e) => set({ shortAnswers: e.target.value })}
                  disabled={!editable}
                  placeholder="가볍다, 가벼워, 가벼운"
                  className={a.input}
                />
              </Field>
            </div>
          )}

          {(item.type === "descriptive" || item.type === "essay") && (
            <div className="mt-4">
              <Field
                label="루브릭"
                hint="배점 항목마다 「인정 예 / 불인정 예」를 함께 적습니다(§9)."
              >
                <textarea
                  value={item.rubric}
                  onChange={(e) => set({ rubric: e.target.value })}
                  disabled={!editable}
                  rows={5}
                  placeholder={"판단 1점 + 예시 제시 1점 + 까닭 설명 1점\n인정 예: …\n불인정 예: …"}
                  className={a.input}
                />
              </Field>
            </div>
          )}

          <div className="mt-4">
            <Field label="정답 · 채점 설명">
              <textarea
                value={item.explain}
                onChange={(e) => set({ explain: e.target.value })}
                disabled={!editable}
                rows={3}
                placeholder="정답 ②(반대말 관계). ①④는 상하위어, ③은 나열입니다."
                className={a.input}
              />
            </Field>
          </div>

          <div className="mt-4">
            <AssetBox item={item} disabled={!editable} />
          </div>
        </Section>

        {/* ⑦ 출제자 유의사항 */}
        <Section
          no="⑦"
          title="출제자 유의사항"
          note="이 문항에서 반드시 지킬 지침 + 매력적 오답 설계 의도"
        >
          <textarea
            value={item.guidance}
            onChange={(e) => set({ guidance: e.target.value })}
            disabled={!editable}
            rows={4}
            placeholder="낱말 짝의 '관계 모양'을 보고 식별만 합니다. 뜻풀이·활용을 요구하면 S2로 이탈합니다."
            className={a.input}
          />
        </Section>

        {/* 제출 전 체크리스트 */}
        <Section no="✓" title="제출 전 최종 체크리스트" note="발주서 §9">
          <ul className="border-t border-exam-line">
            {submitChecklist.map((c) => {
              const auto =
                c.id === "code"
                  ? std.ok
                  : c.id === "tagb"
                    ? levelAllowed(item.talent, item.level)
                    : null;
              const on = c.auto ? !!auto : item.checks.includes(c.id);
              return (
                <li key={c.id} className="border-b border-exam-line">
                  <label
                    className={`flex gap-3 py-3 ${c.auto ? "" : "cursor-pointer"}`}
                    aria-disabled={c.auto}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      readOnly={c.auto}
                      onChange={() => {
                        if (c.auto || !editable) return;
                        set({
                          checks: item.checks.includes(c.id)
                            ? item.checks.filter((x) => x !== c.id)
                            : [...item.checks, c.id],
                        });
                      }}
                      disabled={!editable && !c.auto}
                      className="mt-0.5 h-5 w-5 shrink-0 accent-[#1b2a6b]"
                    />
                    <span className="adm-t-md leading-relaxed text-exam-text">
                      {c.text}
                      {c.auto && (
                        <span className="ml-2 adm-t-xs text-exam-muted">
                          자동 확인 {on ? "· 통과" : "· 아직"}
                        </span>
                      )}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </Section>
      </div>

      {/* 아래에도 제출을 둔다 — 폼이 길어서 위로 올라가야 하면 번거롭다 */}
      {editable && (
        <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-exam-line pt-6">
          <Button onClick={() => submitItem(item.id)} disabled={!ready}>
            검수로 제출
          </Button>
          <Link href="/admin/authoring" className={a.btnGhost}>
            목록으로
          </Link>
          <span className="adm-t-sm text-exam-muted">
            {ready ? "모두 채워졌습니다." : `${missing.join(" · ")} 남음`}
          </span>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── 조각 ───────────────────────── */

/**
 * 학생 화면 미리보기.
 *
 * 출제자가 보는 폼에는 정답·해설·태그·채점 기준이 함께 있다. 그 화면만 보고 있으면
 * 아이가 실제로 무엇을 받는지 알기 어렵다 — 지문 없이 발문만 읽히는지, 보기가 너무
 * 긴지는 이 화면에서만 보인다.
 */
function Preview({ item }: { item: ItemDraft }) {
  return (
    <section className="mt-5 rounded-lg border border-exam-line p-5">
      <p className="adm-t-sm font-bold text-exam-muted">
        학생 화면 미리보기 — 정답 · 해설 · 태그 · 채점 기준은 보이지 않습니다
      </p>

      <div className="mt-4 border-t border-exam-line pt-4">
        {item.passage && (
          <p className="mb-4 whitespace-pre-line adm-t-md leading-relaxed text-exam-text">
            {item.passage}
          </p>
        )}

        {/* 지문 그림만 보여 준다. 원본 시험지 PDF나 엑셀은 아이에게 나가지 않는다. */}
        {item.assets.filter((f) => f.kind === "image" && f.dataUrl).length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {item.assets
              .filter((f) => f.kind === "image" && f.dataUrl)
              .map((f) => (
                // 사람이 올린 자료라 빌드 시점에 알 수 없다
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={f.id}
                  src={f.dataUrl}
                  alt={f.name}
                  className="h-36 w-auto rounded border border-exam-line"
                />
              ))}
          </div>
        )}

        <p className="adm-t-lg font-bold leading-relaxed text-exam-text">
          {item.stem || "발문을 아직 쓰지 않았습니다."}
        </p>

        {item.type === "choice" && (
          <ol className="mt-4 space-y-2">
            {item.choices.map((c, i) => (
              <li key={i}>
                <span className="flex items-center gap-3 rounded-md border border-exam-line px-4 py-3">
                  <span
                    aria-hidden
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-exam-line adm-t-sm font-bold text-exam-muted"
                  >
                    {i + 1}
                  </span>
                  <span className="adm-t-md text-exam-text">
                    {c || <span className="text-exam-muted">보기를 아직 쓰지 않았습니다</span>}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        )}

        {item.type === "short" && (
          <p className="mt-4 rounded-md border border-exam-line px-4 py-3 adm-t-md text-exam-muted">
            답을 적는 한 줄 칸이 나옵니다.
          </p>
        )}

        {(item.type === "descriptive" || item.type === "essay") && (
          <p className="mt-4 rounded-md border border-exam-line px-4 py-8 adm-t-md text-exam-muted">
            글을 쓰는 넓은 칸이 나옵니다.
            {item.type === "essay" && " 논술형은 더 길게 열립니다."}
          </p>
        )}
      </div>
    </section>
  );
}

function Section({
  no,
  title,
  note,
  children,
}: {
  no: string;
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-exam-line pt-5">
      <h2 className="adm-t-lg font-black text-exam-text">
        <span className="mr-2 text-exam-muted">{no}</span>
        {title}
      </h2>
      {note && <p className="mt-1 mb-4 adm-t-sm text-exam-muted">{note}</p>}
      {children}
    </section>
  );
}

function Field({
  label,
  hint,
  error,
  className = "",
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label className="block adm-t-sm font-bold text-exam-text">{label}</label>
      <div className="mt-1.5">{children}</div>
      {error ? (
        <p role="alert" className="mt-1.5 adm-t-xs font-bold text-rose-600">
          {error}
        </p>
      ) : (
        hint && <p className="mt-1.5 adm-t-xs text-exam-muted">{hint}</p>
      )}
    </div>
  );
}

function Def({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex flex-wrap gap-x-3">
      <dt className="w-24 shrink-0 adm-t-sm font-bold text-exam-text">{k}</dt>
      <dd className="min-w-0 flex-1 adm-t-md leading-relaxed text-exam-muted">{v}</dd>
    </div>
  );
}

/** 지문·보기에 딸린 파일 */
function AssetBox({ item, disabled }: { item: ItemDraft; disabled: boolean }) {
  const [error, setError] = useState<string | null>(null);

  const take = async (files: FileList | null) => {
    if (!files) return;
    for (const file of Array.from(files)) {
      const kind = assetKindOf(file);
      if (!kind) {
        setError(`${file.name} — 이미지·PDF·표 파일만 올릴 수 있습니다.`);
        continue;
      }
      if (file.size > MAX_ASSET_BYTES) {
        setError(`${file.name} — 2MB를 넘습니다.`);
        continue;
      }
      const dataUrl =
        kind === "image"
          ? await new Promise<string>((res) => {
              const r = new FileReader();
              r.onload = () => res(String(r.result));
              r.readAsDataURL(file);
            })
          : undefined;
      attachAsset(item.id, {
        id: `${Date.now()}-${file.name}`,
        name: file.name,
        kind,
        size: file.size,
        dataUrl,
        at: new Date().toISOString(),
      });
      setError(null);
    }
  };

  return (
    <div>
      <p className="adm-t-sm font-bold text-exam-text">붙임 파일</p>
      <p className="mt-1 adm-t-xs text-exam-muted">
        삽화·그림은 색맹·저시력 학생도 풀 수 있게 설계합니다. 색 외에 빗금·형태로도 구별되어야
        합니다. 한 파일 2MB까지.
      </p>
      {!disabled && (
        <input
          type="file"
          multiple
          onChange={(e) => void take(e.target.files)}
          className="mt-2 block adm-t-sm text-exam-muted file:mr-3 file:rounded-md file:border file:border-exam-line file:bg-white file:px-4 file:py-2 file:adm-t-sm file:font-bold file:text-exam-text"
        />
      )}
      {error && (
        <p role="alert" className="mt-2 adm-t-xs font-bold text-rose-600">
          {error}
        </p>
      )}
      {item.assets.length > 0 && (
        <ul className="mt-3 border-t border-exam-line">
          {item.assets.map((f) => (
            <li key={f.id} className="flex items-center gap-3 border-b border-exam-line py-2.5">
              {f.dataUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={f.dataUrl} alt="" className="h-10 w-10 shrink-0 object-cover" />
              )}
              <span className="min-w-0 flex-1 truncate adm-t-sm text-exam-text">{f.name}</span>
              <span className="shrink-0 adm-t-xs text-exam-muted">
                {Math.round(f.size / 1024)}KB
              </span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeAsset(item.id, f.id)}
                  className="shrink-0 adm-t-xs font-bold text-rose-600 underline underline-offset-4"
                >
                  빼기
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
