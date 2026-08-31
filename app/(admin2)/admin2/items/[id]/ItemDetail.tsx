"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  LEVELS,
  formatLine,
  gradeBands,
  levelAllowed,
  levelSpecs,
  subskillOf,
  subskillsOf,
  submitChecklist,
  talents,
  type GradeBand,
  type Level,
  type TalentId,
} from "@/lib/blueprint";
import { itemTone, toneColor } from "@/lib/admin2";
import { useAdminPrefs } from "@/lib/adminStore";
import { roundsOf, useForms } from "@/lib/formStore";
import {
  addComment,
  missingFields,
  patchItem,
  rejectLabel,
  restoreItem,
  retireItem,
  reviseApproved,
  setAnchor,
  setLevel,
  standardIssue,
  stateLabel,
  submitItem,
  suggestCode,
  syncTags,
  typeLabel,
  useItems,
  withdrawItem,
  type ItemDraft,
} from "@/lib/itemStore";
import { Body, DescList, PageHead, Panel, SeedNote, Status, Tag } from "@/components/admin2/ui";
import ReviewPanel from "./ReviewPanel";

/**
 * ADM-04-1 문항 상세 — 등록 · 수정 · 검수를 한 장에서.
 *
 * 기존 콘솔은 이 셋을 세 화면으로 갈라 두었다(출제 워크벤치 · 문항 카드 · 검수
 * 워크벤치). 역할이 넷이라 서로의 화면을 안 보는 것이 옳았기 때문이다. 이 콘솔은
 * **슈퍼 관리자 한 사람**만 쓰므로 가릴 것이 없고, 오히려 「고쳐 놓고 바로 승인」이
 * 한 화면에서 끝나야 한다. 왼쪽이 문항, 오른쪽이 상태와 검수다.
 *
 * 고칠 수 있는 때를 상태가 정한다 — 작성 중 · 반려됨만 열린다. 검수 대기와 승인됨은
 * 잠근다. 제출한 뒤에 내용이 바뀌면 검수자가 본 것과 승인된 것이 달라지고, 승인 뒤에
 * 바뀌면 그 문항으로 이미 판정한 아이의 결과를 설명할 수 없다. 승인본을 고칠 때는
 * 원본을 두고 새 판을 뜬다.
 *
 * ⚠ 저장은 칸을 떠날 때가 아니라 글자를 칠 때마다 일어난다(patchItem). 저장 단추를
 *   두지 않은 까닭은 하나다 — 문항 하나를 채우는 데 십수 분이 걸리는데, 그 사이에
 *   다른 문항을 열어 보는 일이 실제로 잦다.
 */
export default function ItemDetail({ id }: { id: string }) {
  const items = useItems();
  const forms = useForms();
  const prefs = useAdminPrefs();
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [memo, setMemo] = useState("");

  const item = items.find((i) => i.id === id);

  if (!item) {
    return (
      <>
        <PageHead
          title="문항을 찾지 못했습니다"
          actions={
            <Link href="/admin2/items" className="a2-btn">
              문항 은행
            </Link>
          }
        />
        <Body>
          <Panel title="없는 문항">
            <p className="a2-t-sm text-(--a2-ink-2)">
              <span className="a2-mono">{id}</span> 문항이 이 브라우저의 저장소에 없습니다. 다른 기기에서 만든
              문항이거나 주소가 잘못되었습니다.
            </p>
          </Panel>
        </Body>
      </>
    );
  }

  const editable = item.state === "draft" || item.state === "rejected";
  const by = prefs.staffName || "운영자";
  const spec = levelSpecs[item.level];
  const std = standardIssue(item);
  const missing = missingFields(item);
  const ready = missing.length === 0;
  const shipped = roundsOf(item.id, forms);
  const talent = talents.find((t) => t.id === item.talent)!;

  /** 고친 값을 저장한다. 표시용 태그(tagA·tagB)는 값이 바뀔 때마다 다시 만든다 */
  const set = (patch: Partial<ItemDraft>) => {
    if (!editable) return;
    const next = { ...item, ...patch };
    patchItem(item.id, { ...patch, ...syncTags(next) });
  };

  const choiceType = item.type === "choice";
  const needsRubric = item.type === "descriptive" || item.type === "essay";

  return (
      <>
        <PageHead
          title={item.code || "문항 ID 미정"}
          meta={
            <>
              <Status tone={itemTone[item.state]}>{stateLabel[item.state]}</Status>
              <span aria-hidden>·</span>
              <span>
                {item.subject} · {item.band} · {item.level} {spec.name} · {typeLabel(item.type)}
              </span>
              <span aria-hidden>·</span>
              <span className="a2-mono">
                v{item.version} · {item.updatedAt}
              </span>
              {item.origin === "ai" && <Tag accent>AI 초안</Tag>}
            </>
          }
          actions={
            <>
              <Link href="/admin2/items" className="a2-btn">
                목록
              </Link>
              {editable && (
                <button
                  type="button"
                  className="a2-btn a2-btn-primary"
                  disabled={!ready}
                  title={ready ? undefined : `${missing.join(" · ")}이(가) 남았습니다`}
                  onClick={() => submitItem(item.id)}
                >
                  검수로 제출
                </button>
              )}
              {item.state === "submitted" && (
                <button type="button" className="a2-btn" onClick={() => withdrawItem(item.id)}>
                  제출 회수
                </button>
              )}
              {item.state === "approved" && (
                <button
                  type="button"
                  className="a2-btn"
                  onClick={() => {
                    const next = reviseApproved(item.id);
                    if (next) router.push(`/admin2/items/${next.id}`);
                  }}
                >
                  새 판으로 고치기
                </button>
              )}
            </>
          }
        />
        <Body>

          <div className="grid gap-3 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
            {/* ── 왼쪽: 문항 ── */}
            <div className="grid gap-3">
              <Panel title="분류" meta="발주서 §2 · §7">
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="a2-field">
                    <span className="a2-label">과목</span>
                    <select
                      className="a2-select"
                      value={item.subject}
                      disabled={!editable}
                      onChange={(e) => set({ subject: e.target.value as ItemDraft["subject"] })}
                    >
                      {["국어", "수학", "과학"].map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </label>

                  <label className="a2-field">
                    <span className="a2-label">학년군</span>
                    <select
                      className="a2-select"
                      value={item.band}
                      disabled={!editable}
                      onChange={(e) => {
                        const band = e.target.value as GradeBand;
                        set({
                          band,
                          grade: band === "3-4" ? "초등 3~4학년군" : "초등 5~6학년군",
                        });
                      }}
                    >
                      {gradeBands.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="a2-field">
                    <span className="a2-label">단원</span>
                    <input
                      className="a2-input"
                      value={item.unit}
                      disabled={!editable}
                      onChange={(e) => set({ unit: e.target.value })}
                      placeholder="낱말의 의미 관계"
                    />
                  </label>

                  <label className="a2-field">
                    <span className="a2-label">단원 번호</span>
                    <input
                      className="a2-input a2-mono"
                      value={item.unitNo}
                      disabled={!editable}
                      onChange={(e) => set({ unitNo: e.target.value })}
                      placeholder="02"
                    />
                    <span className="a2-hint">문항 ID 가운데 두 자리에 들어갑니다.</span>
                  </label>

                  {/* 단계를 고르면 형식·배점·b모수가 따라온다(§1 고정 매핑). 손으로 못 고친다 —
                      단계와 형식이 어긋나면 검수 2차 태깅에서 그대로 반려된다 */}
                  <label className="a2-field">
                    <span className="a2-label">인지단계</span>
                    <select
                      className="a2-select"
                      value={item.level}
                      disabled={!editable}
                      onChange={(e) => editable && setLevel(item.id, e.target.value as Level)}
                    >
                      {LEVELS.map((l) => (
                        <option key={l} value={l} disabled={!levelAllowed(item.talent, l)}>
                          {l} {levelSpecs[l].name}
                          {levelAllowed(item.talent, l) ? "" : " — 이 축은 출제 불가"}
                        </option>
                      ))}
                    </select>
                    <span className="a2-hint">{formatLine(item.level)}</span>
                  </label>

                  <div className="a2-field">
                    <span className="a2-label">문항 ID</span>
                    <div className="flex gap-1.5">
                      <input
                        className="a2-input a2-mono"
                        value={item.code}
                        disabled={!editable}
                        onChange={(e) => set({ code: e.target.value })}
                        placeholder="4K02-S1-001"
                      />
                      <button
                        type="button"
                        className="a2-btn shrink-0"
                        disabled={!editable}
                        onClick={() =>
                          set({
                            code: suggestCode(
                              item,
                              items.filter((i) => i.subject === item.subject && i.level === item.level).length + 1,
                            ),
                          })
                        }
                      >
                        다시 매기기
                      </button>
                    </div>
                    <span className="a2-hint">학년군 · 교과 · 단원 · 단계 · 일련번호</span>
                  </div>

                  <label className="a2-field">
                    <span className="a2-label">성취기준 코드 (Tag A)</span>
                    <input
                      className="a2-input a2-mono"
                      value={item.standardCode}
                      disabled={!editable}
                      onChange={(e) => set({ standardCode: e.target.value })}
                      placeholder="[4국04-02]"
                      aria-invalid={!std.ok}
                    />
                    <span className="a2-hint" style={std.ok ? undefined : { color: toneColor.danger }}>
                      {std.ok ? "형식·학년군 확인됨" : std.why}
                    </span>
                  </label>

                  <label className="a2-field sm:col-span-2">
                    <span className="a2-label">성취기준 내용</span>
                    <input
                      className="a2-input"
                      value={item.standardText}
                      disabled={!editable}
                      onChange={(e) => set({ standardText: e.target.value })}
                      placeholder="낱말과 낱말의 의미 관계를 파악한다."
                    />
                  </label>

                  <label className="a2-field sm:col-span-2">
                    <span className="a2-label">Tag A 세부 — 이 문항이 재는 학력을 한 줄로</span>
                    <input
                      className="a2-input"
                      value={item.tagADetail}
                      disabled={!editable}
                      onChange={(e) => set({ tagADetail: e.target.value })}
                      placeholder="비슷한 말 짝 식별"
                    />
                  </label>

                  <label className="a2-field">
                    <span className="a2-label">재능 축 (Tag B)</span>
                    <select
                      className="a2-select"
                      value={item.talent}
                      disabled={!editable}
                      onChange={(e) => {
                        /* 축을 바꾸면 하위요소는 그 축의 것으로 갈아 끼운다. 그대로 두면
                           LANG-01이 수리-논리 문항에 붙어 좌표가 통째로 어긋난다. */
                        const next = e.target.value as TalentId;
                        set({ talent: next, subskill: subskillsOf(next)[0].code });
                      }}
                    >
                      {talents.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                    {talent.scopeNote && <span className="a2-hint">{talent.scopeNote}</span>}
                  </label>

                  <label className="a2-field">
                    <span className="a2-label">하위요소</span>
                    <select
                      className="a2-select"
                      value={item.subskill}
                      disabled={!editable}
                      onChange={(e) => set({ subskill: e.target.value })}
                    >
                      {subskillsOf(item.talent).map((s) => (
                        <option key={s.code} value={s.code}>
                          {s.code} {s.name}
                        </option>
                      ))}
                    </select>
                    <span className="a2-hint">
                      {subskillOf(item.subskill)?.grid[item.level] ?? "—"}
                    </span>
                  </label>
                </div>
              </Panel>

              <Panel title="문항" meta="발주서 §3 문항 카드">
                <div className="grid gap-2">
                  <label className="a2-field">
                    <span className="a2-label">지문 · 자료 (없으면 비워 둡니다)</span>
                    <textarea
                      className="a2-textarea"
                      rows={3}
                      value={item.passage}
                      disabled={!editable}
                      onChange={(e) => set({ passage: e.target.value })}
                    />
                  </label>

                  <label className="a2-field">
                    <span className="a2-label">발문</span>
                    <textarea
                      className="a2-textarea"
                      rows={2}
                      value={item.stem}
                      disabled={!editable}
                      onChange={(e) => set({ stem: e.target.value })}
                      placeholder="다음 중 두 낱말의 뜻이 서로 비슷한 것은?"
                    />
                  </label>

                  {choiceType && (
                    <div className="a2-field">
                      <span className="a2-label">보기 · 정답 · 오답이 잡는 오개념</span>
                      <ul className="mt-1 space-y-1.5">
                        {item.choices.map((c, k) => (
                          <li key={k} className="grid grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)] items-center gap-1.5">
                            <label className="flex items-center gap-1.5 pl-0.5">
                              <input
                                type="radio"
                                name="answer"
                                checked={item.answer === k}
                                disabled={!editable}
                                onChange={() => set({ answer: k })}
                                aria-label={`${k + 1}번을 정답으로`}
                              />
                              <span className="a2-mono a2-t-sm text-(--a2-ink-3)">{k + 1}</span>
                            </label>
                            <input
                              className="a2-input"
                              value={c}
                              disabled={!editable}
                              onChange={(e) =>
                                set({ choices: item.choices.map((x, n) => (n === k ? e.target.value : x)) })
                              }
                              placeholder={`${k + 1}번 보기`}
                            />
                            <input
                              className="a2-input"
                              value={item.distractorIntent[k] ?? ""}
                              disabled={!editable || item.answer === k}
                              onChange={(e) => {
                                const next = [...item.distractorIntent];
                                while (next.length < item.choices.length) next.push("");
                                next[k] = e.target.value;
                                set({ distractorIntent: next });
                              }}
                              placeholder={item.answer === k ? "정답 — 적지 않습니다" : "이 오답이 잡는 오개념"}
                            />
                          </li>
                        ))}
                      </ul>
                      <span className="a2-hint">
                        오답마다 무엇을 잡는지 적지 않으면 변별이 죽습니다(§1.1). 정답 칸은 비워 둡니다.
                      </span>
                    </div>
                  )}

                  {item.type === "short" && (
                    <label className="a2-field">
                      <span className="a2-label">허용 답안 — 쉼표로 나눠 적습니다</span>
                      <input
                        className="a2-input"
                        value={item.shortAnswers}
                        disabled={!editable}
                        onChange={(e) => set({ shortAnswers: e.target.value })}
                        placeholder="늘어난다, 커진다, 증가한다"
                      />
                      <span className="a2-hint">표기 흔들림을 여기서 흡수해야 AI 자동채점이 같은 답을 잡습니다.</span>
                    </label>
                  )}

                  {needsRubric && (
                    <label className="a2-field">
                      <span className="a2-label">채점 루브릭 — 인정 예 · 불인정 예를 함께</span>
                      <textarea
                        className="a2-textarea"
                        rows={4}
                        value={item.rubric}
                        disabled={!editable}
                        onChange={(e) => set({ rubric: e.target.value })}
                        placeholder={"근거 1점 + 일반화 1점 + 정당화 1점\n인정 예: …\n불인정 예: …"}
                      />
                    </label>
                  )}

                  <label className="a2-field">
                    <span className="a2-label">정답 · 채점 해설</span>
                    <textarea
                      className="a2-textarea"
                      rows={3}
                      value={item.explain}
                      disabled={!editable}
                      onChange={(e) => set({ explain: e.target.value })}
                      placeholder="정답 ②. 까닭까지 함께 적습니다."
                    />
                  </label>

                  <label className="a2-field">
                    <span className="a2-label">출제자 유의사항</span>
                    <textarea
                      className="a2-textarea"
                      rows={3}
                      value={item.guidance}
                      disabled={!editable}
                      onChange={(e) => set({ guidance: e.target.value })}
                      placeholder="바꾸어 써도 뜻이 통하는지만 봅니다. 쓰임의 차이를 묻기 시작하면 S2로 이탈합니다."
                    />
                  </label>
                </div>
              </Panel>

              <Panel title="제출 전 체크리스트" meta="발주서 §9">
                <ul className="grid gap-1">
                  {submitChecklist.map((c) => {
                    /* 자동으로 보는 둘은 사람이 켜고 끄지 못한다. 켤 수 있게 두면 코드가
                       틀린 채로 체크만 켜고 제출하는 길이 열린다 */
                    const auto =
                      c.id === "code" ? std.ok : c.id === "tagb" ? levelAllowed(item.talent, item.level) : null;
                    const on = c.auto ? !!auto : item.checks.includes(c.id);
                    return (
                      <li key={c.id}>
                        <label className="flex items-start gap-2 py-0.5">
                          <input
                            type="checkbox"
                            className="mt-0.5"
                            checked={on}
                            readOnly={c.auto}
                            disabled={c.auto || !editable}
                            onChange={() => {
                              if (c.auto) return;
                              set({
                                checks: item.checks.includes(c.id)
                                  ? item.checks.filter((x) => x !== c.id)
                                  : [...item.checks, c.id],
                              });
                            }}
                          />
                          <span className="a2-t-sm text-(--a2-ink-2)">
                            {c.text}
                            {c.auto && (
                              <span className="ml-1.5 a2-t-xs text-(--a2-ink-4)">
                                자동 확인 · {on ? "통과" : "아직"}
                              </span>
                            )}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </Panel>
            </div>

            {/* ── 오른쪽: 상태 · 검수 · 이력 ── */}
            <div className="grid content-start gap-3">
              <Panel title="상태" meta={item.origin === "ai" ? "AI가 낸 초안" : "사람이 쓴 문항"}>
                <DescList
                  rows={[
                    { k: "상태", v: <Status tone={itemTone[item.state]}>{stateLabel[item.state]}</Status> },
                    { k: "출제자", v: `${item.authorName} (${item.author})` },
                    { k: "형식 · 배점", v: `${typeLabel(item.type)} · ${item.points}점 · b≈${item.b}` },
                    {
                      k: "Tag B 좌표",
                      v: <span className="a2-t-sm">{item.tagB || "—"}</span>,
                    },
                    {
                      k: "앵커",
                      v: item.anchor ? <Tag accent>앵커</Tag> : <span className="text-(--a2-ink-4)">아님</span>,
                    },
                    {
                      k: "정답률",
                      v:
                        item.correctRate == null ? (
                          <span className="text-(--a2-ink-4)">미출제</span>
                        ) : (
                          <span className="a2-num">{item.correctRate}%</span>
                        ),
                    },
                    {
                      k: "나간 회차",
                      v: shipped.length ? shipped.join(" · ") : <span className="text-(--a2-ink-4)">없음</span>,
                    },
                  ]}
                />

                {editable && missing.length > 0 && (
                  <p className="a2-note mt-2" style={{ borderLeftColor: "var(--a2-warn)" }}>
                    제출까지 남은 것 — {missing.join(" · ")}
                  </p>
                )}
                {item.state === "rejected" && (
                  <p className="a2-note mt-2" style={{ borderLeftColor: "var(--a2-danger)" }}>
                    반려된 문항입니다. 아래 검수 소견대로 고친 뒤 다시 제출하면 검수 목록으로 돌아갑니다.
                  </p>
                )}
                {item.state === "approved" && (
                  <p className="a2-note mt-2">
                    승인된 문항은 잠깁니다. 회차 편성에서 이 문항을 검사지에 담을 수 있습니다.
                  </p>
                )}
              </Panel>

              {/* key를 붙여 문항이 바뀌면 검수판을 새로 세운다. 붙이지 않으면 앞 문항에서
                  짚어 둔 3단 체크가 다음 문항에 그대로 남아 다른 문항을 승인하게 된다. */}
              {item.state === "submitted" && <ReviewPanel key={item.id} item={item} />}

              {(item.state === "approved" || item.state === "retired") && (
                <Panel title="승인 뒤 관리" meta="까닭이 기록에 남습니다">
                  <label className="a2-field">
                    <span className="a2-label">까닭</span>
                    <textarea
                      className="a2-textarea"
                      rows={2}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="예: 26A 회차 정답률 96% — 변별이 되지 않아 회차에서 뺍니다"
                    />
                  </label>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {item.state === "approved" && (
                      <>
                        <button
                          type="button"
                          className="a2-btn"
                          disabled={reason.trim().length < 5 || !!item.disclosed}
                          title={item.disclosed ? "밖에 공개된 적이 있는 문항은 앵커가 될 수 없습니다" : undefined}
                          onClick={() => {
                            setAnchor(item.id, !item.anchor, by, prefs.role, reason.trim());
                            setReason("");
                          }}
                        >
                          {item.anchor ? "앵커 해제" : "앵커로 지정"}
                        </button>
                        <button
                          type="button"
                          className="a2-btn a2-btn-danger"
                          disabled={reason.trim().length < 5}
                          onClick={() => {
                            retireItem(item.id, by, prefs.role, reason.trim());
                            setReason("");
                          }}
                        >
                          사용 중지
                        </button>
                      </>
                    )}
                    {item.state === "retired" && (
                      <button
                        type="button"
                        className="a2-btn"
                        disabled={reason.trim().length < 5}
                        onClick={() => {
                          restoreItem(item.id, by, prefs.role, reason.trim());
                          setReason("");
                        }}
                      >
                        다시 쓰기
                      </button>
                    )}
                  </div>
                  {item.retireReason && (
                    <p className="a2-note mt-2">
                      {item.retiredAt} · {item.retiredBy} — {item.retireReason}
                    </p>
                  )}
                </Panel>
              )}

              <Panel title="검수 이력" meta={`${item.reviews.length}회`} flush>
                {item.reviews.length === 0 ? (
                  <p className="p-3 a2-t-sm text-(--a2-ink-4)">아직 검수를 거치지 않았습니다.</p>
                ) : (
                  <ul className="divide-y divide-(--a2-line)">
                    {[...item.reviews].reverse().map((r) => (
                      <li key={`${r.at}-${r.round}`} className="p-2.5">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <Status tone={r.verdict === "approve" ? "ok" : "danger"}>
                            {r.verdict === "approve" ? "승인" : `반려 · ${r.code ? rejectLabel(r.code) : "사유 없음"}`}
                          </Status>
                          <span className="a2-t-sm text-(--a2-ink-2)">
                            {r.round}차 · {r.by}
                          </span>
                          <span className="a2-mono a2-t-xs text-(--a2-ink-4)">{r.at}</span>
                          {r.machine && <Tag>기계</Tag>}
                          {r.self && (
                            <span className="a2-t-xs font-bold" style={{ color: "var(--a2-danger)" }}>
                              자가 검수
                            </span>
                          )}
                        </div>
                        <ul className="mt-1 flex flex-wrap gap-x-2.5 gap-y-0.5">
                          {r.checks.map((c) => (
                            <li key={c.id} className="a2-t-xs" style={{ color: c.ok ? "var(--a2-ok)" : "var(--a2-danger)" }}>
                              {c.id === "content" ? "내용" : c.id === "tagging" ? "태깅" : "윤리"}{" "}
                              {c.ok === null ? "—" : c.ok ? "통과" : "걸림"}
                            </li>
                          ))}
                        </ul>
                        <p className="mt-1 whitespace-pre-line a2-t-sm text-(--a2-ink-2)">{r.text}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>

              <Panel title="메모" meta="상태를 바꾸지 않습니다">
                <textarea
                  className="a2-textarea"
                  rows={2}
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="반려까지는 아니지만 짚어 둘 것"
                />
                <div className="mt-1.5 flex justify-end">
                  <button
                    type="button"
                    className="a2-btn"
                    disabled={memo.trim().length < 2}
                    onClick={() => {
                      addComment(item.id, by, prefs.role, memo.trim());
                      setMemo("");
                    }}
                  >
                    메모 남기기
                  </button>
                </div>
                {item.comments.length > 0 && (
                  <ul className="mt-2 divide-y divide-(--a2-line) border-t border-(--a2-line)">
                    {[...item.comments].reverse().map((c, k) => (
                      <li key={`${c.at}-${k}`} className="py-1.5">
                        <p className="a2-t-xs text-(--a2-ink-4)">
                          <span className="a2-mono">{c.at}</span> · {c.by} ·{" "}
                          {c.kind === "reject" ? "반려" : c.kind === "approve" ? "승인" : "메모"}
                        </p>
                        <p className="whitespace-pre-line a2-t-sm text-(--a2-ink-2)">{c.text}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            </div>
          </div>

        </Body>
      <SeedNote>
        문항은 이 브라우저에만 저장됩니다(lib/itemStore.ts). 붙일 때는 문항 API로 갈아 끼웁니다. 형식 ·
        배점 · b모수는 인지단계에서 자동으로 따라오며 손으로 고칠 수 없습니다 — 발주서 §1 고정 매핑입니다.
      </SeedNote>
    </>
  );
}
