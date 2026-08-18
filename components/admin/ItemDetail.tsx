"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { can } from "@/lib/admin";
import { recordAction, useAdminPrefs } from "@/lib/adminStore";
import { gradeBands, levelSpecs, subskillsOf, talentOf } from "@/lib/blueprint";
import {
  reasonText,
  restoreItem,
  retireItem,
  reviewChecks,
  stateLabel,
  stateTone,
  typeLabel,
  useItems,
  type ItemDraft,
} from "@/lib/itemStore";
import AssetView from "./AssetView";
import CommentList from "./CommentList";
import { Callout, PageHead } from "./Parts";
import * as a from "./ui";

/**
 * 문항 상세 (ADM-04-1).
 *
 * 은행에서 문항 하나를 열어 보는 자리다. **읽는 화면이다** — 고치는 길은 출제
 * 워크벤치 하나여야 하므로 여기에는 입력칸을 두지 않는다.
 *
 * 다만 한 가지 동작은 여기 둔다. 승인된 문항을 회차에서 빼는 「사용 중지」다.
 * 정답률이 한쪽으로 치우쳤는지는 이 화면에서 보이고, 그것을 보고 판단하는 사람과
 * 빼는 사람이 같기 때문이다. 지우지 않고 상태만 바꾸며 까닭을 받는다.
 *
 * 검수 이력을 함께 싣는다. 「이 문항이 왜 이렇게 생겼는가」의 답이 거기 있고,
 * 승인 뒤에 문제가 생겼을 때 무엇을 놓쳤는지 되짚을 수 있어야 한다.
 */
export default function ItemDetail({ id }: { id: string }) {
  const items = useItems();
  const prefs = useAdminPrefs();
  const [ask, setAsk] = useState<null | "retire" | "restore">(null);

  const item = items.find((i) => i.id === id);

  if (!item) {
    return (
      <>
        <PageHead
          title="문항을 찾을 수 없습니다"
          lead={`${id} 번호로 저장된 문항이 없습니다. 주소가 바뀌었거나 폐기된 문항일 수 있습니다.`}
        />
        <Link href="/admin/items" className={a.btnGhost}>
          문항 은행으로 돌아가기
        </Link>
      </>
    );
  }

  const by = prefs.staffName || "운영자";
  const mayRetire = can(prefs.role, "item.review");
  const band = gradeBands.find((b) => b.id === item.band);
  const sub = subskillsOf(item.talent).find((s) => s.code === item.subskill);
  const odd = item.correctRate !== null && (item.correctRate > 90 || item.correctRate < 40);

  return (
    <>
      <PageHead
        title={item.code || "번호가 아직 없는 문항"}
        lead={`${item.subject} · ${item.grade} · ${typeLabel(item.type)} · ${item.level} ${levelSpecs[item.level].name} · ${item.points}점`}
        action={
          <>
            <Link href="/admin/items" className={a.btnGhost}>
              ← 문항 은행
            </Link>
            {item.state === "approved" && mayRetire && (
              <button type="button" onClick={() => setAsk("retire")} className={a.btnDanger}>
                사용 중지하기
              </button>
            )}
            {item.state === "retired" && mayRetire && (
              <button type="button" onClick={() => setAsk("restore")} className={a.btnPrimary}>
                다시 쓰기
              </button>
            )}
          </>
        }
      />

      {/* 상태 줄 — 지금 이 문항이 어떤 상태인지가 먼저다 */}
      <section className={`${a.panel} p-5`}>
        <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2">
          <span className={`${a.badge} ${stateTone[item.state]}`}>{stateLabel[item.state]}</span>
          <span className={a.strongText}>판 v{item.version}</span>
          <span className={a.hint}>
            작성 {item.authorName} · 마지막 수정 {item.updatedAt}
          </span>
          {item.anchor && <span className="adm-t-sm font-bold text-brand-700">앵커 문항</span>}
          {item.origin === "ai" && (
            <span className="adm-t-sm font-bold text-amber-700">AI 초안</span>
          )}
          {item.revisionOf && <span className={a.hint}>{item.revisionOf}을(를) 고친 판</span>}
        </div>

        <div className="mt-4 border-t border-exam-line pt-4">
          <p className={a.label}>지난 회차 정답률</p>
          {item.correctRate === null ? (
            <p className={`${a.bodyText} mt-1`}>아직 회차에 나가지 않았습니다.</p>
          ) : (
            <p className={`mt-1 adm-t-md ${odd ? "font-bold text-rose-700" : "text-exam-text"}`}>
              {item.correctRate}%
              {odd && " — 한쪽으로 치우쳐 변별이 되지 않습니다. 다시 볼 것."}
            </p>
          )}
        </div>
      </section>

      {item.state === "retired" && (
        <div className="mt-5">
          <Callout tone="warn" title="회차에서 빠져 있는 문항입니다">
            {item.retiredAt} · {item.retiredBy}
            <p className="mt-1.5">{item.retireReason}</p>
            <p className={`${a.hint} mt-2`}>
              지우지 않고 남겨 둡니다. 이 문항으로 이미 판정한 결과를 설명할 수 있어야 합니다.
            </p>
          </Callout>
        </div>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        {/* ── 문항 본문 ── */}
        <section className={`${a.panel} p-6`}>
          <h2 className={a.cardTitle}>문항</h2>

          {item.passage && (
            <div className="mt-4">
              <p className={a.label}>지문 · 자료</p>
              <p className="mt-1.5 whitespace-pre-wrap rounded-md border border-exam-line bg-exam-panel p-4 adm-t-md leading-relaxed text-exam-text">
                {item.passage}
              </p>
            </div>
          )}

          <div className="mt-5">
            <p className={a.label}>발문</p>
            <p className="mt-1.5 adm-t-md font-bold leading-relaxed text-exam-text">{item.stem}</p>
          </div>

          {item.type === "choice" && (
            <ol className="mt-4 space-y-2">
              {item.choices.map((c, n) => {
                const right = n === item.answer;
                return (
                  <li
                    key={n}
                    className={`rounded-md border p-3.5 ${
                      right ? "border-emerald-400 bg-emerald-50" : "border-exam-line"
                    }`}
                  >
                    <p className="adm-t-md text-exam-text">
                      <span className="mr-2 font-bold tabular-nums">{n + 1}</span>
                      {c}
                      {right && <span className="ml-2 font-bold text-emerald-700">정답</span>}
                    </p>
                    {!right && item.distractorIntent[n] && (
                      <p className={`${a.hint} mt-1.5`}>오답 의도 — {item.distractorIntent[n]}</p>
                    )}
                  </li>
                );
              })}
            </ol>
          )}

          {item.type === "short" && (
            <div className="mt-4">
              <p className={a.label}>허용 답안</p>
              <p className={`${a.bodyText} mt-1.5`}>{item.shortAnswers || "적히지 않았습니다"}</p>
            </div>
          )}

          {(item.type === "descriptive" || item.type === "essay") && (
            <div className="mt-4">
              <p className={a.label}>채점 기준</p>
              <p className={`${a.bodyText} mt-1.5 whitespace-pre-wrap leading-relaxed`}>
                {item.rubric || "적히지 않았습니다"}
              </p>
            </div>
          )}

          <div className="mt-5 border-t border-exam-line pt-4">
            <p className={a.label}>해설</p>
            <p className={`${a.bodyText} mt-1.5 whitespace-pre-wrap leading-relaxed`}>
              {item.explain || "적히지 않았습니다"}
            </p>
          </div>

          {item.guidance && (
            <div className="mt-4">
              <p className={a.label}>출제자 유의사항</p>
              <p className={`${a.bodyText} mt-1.5 whitespace-pre-wrap leading-relaxed`}>
                {item.guidance}
              </p>
            </div>
          )}

          {item.assets.length > 0 && (
            <div className="mt-5 border-t border-exam-line pt-4">
              <p className={a.label}>붙임 파일</p>
              <AssetView assets={item.assets} />
            </div>
          )}
        </section>

        {/* ── 좌표 ── */}
        <section className={`${a.panel} p-5 xl:sticky xl:top-6 xl:self-start`}>
          <h2 className={a.cardTitle}>좌표 · 태그</h2>
          <dl className="mt-3 space-y-3">
            <Row k="학년군" v={band ? `${band.label} (${band.prefix})` : item.band} />
            <Row k="단원" v={[item.unitNo, item.unit].filter(Boolean).join(" ") || "적히지 않음"} />
            <Row k="성취기준" v={item.standardCode || "비어 있음"} />
            <Row k="성취기준 내용" v={item.standardText || "비어 있음"} />
            <Row k="Tag A" v={item.tagADetail || "적히지 않음"} />
            <Row
              k="Tag B"
              v={`${talentOf(item.talent).name} · ${sub ? `${sub.code} ${sub.name}` : item.subskill} · ${item.level}`}
            />
            {item.subTalent && item.subSubskill && (
              <Row
                k="Tag B 부태그"
                v={`${talentOf(item.subTalent).name} · ${item.subSubskill} — 점수는 주태그에만 붙습니다`}
              />
            )}
            <Row
              k="단계"
              v={`${item.level} ${levelSpecs[item.level].name} · ${typeLabel(item.type)}`}
            />
            <Row k="배점 · 난이도" v={`${item.points}점 · b ${item.b}`} />
            <Row k="앵커" v={item.anchor ? "예 — 회차 간 등화 기준" : "아니오"} />
          </dl>
        </section>
      </div>

      {/* ── 검수 이력 ── */}
      <section className={`${a.panel} mt-6 p-6`}>
        <h2 className={a.cardTitle}>검수 이력 {item.reviews.length}회</h2>
        <p className={`${a.hint} mt-1.5`}>
          이 문항이 왜 이렇게 생겼는지가 여기 있습니다. 승인 뒤에 문제가 생기면 무엇을 놓쳤는지 이
          기록으로 되짚습니다.
        </p>

        {item.reviews.length === 0 ? (
          <p className={`${a.bodyText} mt-4`}>아직 검수를 받지 않았습니다.</p>
        ) : (
          <ol className="mt-4 space-y-4">
            {item.reviews.map((r, n) => (
              <li key={n} className="rounded-md border border-exam-line p-4">
                <p className="adm-t-md font-bold text-exam-text">
                  {r.round}회차 검수 · {r.by} · {r.at}
                  <span
                    className={`ml-2 ${
                      r.verdict === "approve" ? "text-emerald-700" : "text-rose-700"
                    }`}
                  >
                    {r.verdict === "approve" ? "승인" : "반려"}
                  </span>
                </p>
                <ul className="mt-2.5 space-y-1.5">
                  {r.checks.map((c) => {
                    const label = reviewChecks.find((x) => x.id === c.id)?.label ?? c.id;
                    const said = reasonText(c.id, c.ok, c.reason);
                    return (
                      <li key={c.id} className="adm-t-md text-exam-text">
                        <span className={`font-bold ${c.ok ? "text-emerald-700" : "text-rose-700"}`}>
                          {c.ok === null ? "—" : c.ok ? "통과" : "걸림"}
                        </span>{" "}
                        {label}
                        {said && <span className="text-exam-muted"> · {said}</span>}
                        {c.note && <span className="text-exam-muted"> · {c.note}</span>}
                      </li>
                    );
                  })}
                </ul>
                {r.text && <p className={`${a.bodyText} mt-2.5 leading-relaxed`}>{r.text}</p>}
              </li>
            ))}
          </ol>
        )}

        <div className="mt-6">
          <h3 className={a.label}>오간 말</h3>
          {item.comments.length === 0 ? (
            <p className={`${a.bodyText} mt-1.5`}>아직 없습니다.</p>
          ) : (
            <CommentList comments={item.comments} />
          )}
        </div>
      </section>

      {ask && (
        <RetireBox
          mode={ask}
          item={item}
          onClose={() => setAsk(null)}
          onConfirm={(reason) => {
            if (ask === "retire") {
              retireItem(item.id, by, prefs.role, reason);
              recordAction(`${item.code || item.id} 문항`, "문항 사용 중지", reason, by);
            } else {
              restoreItem(item.id, by, prefs.role, reason);
              recordAction(`${item.code || item.id} 문항`, "문항 다시 씀", reason, by);
            }
            setAsk(null);
          }}
        />
      )}
    </>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex flex-wrap gap-x-3">
      <dt className="w-24 shrink-0 adm-t-sm font-bold text-exam-text">{k}</dt>
      <dd className="min-w-0 flex-1 adm-t-md leading-relaxed text-exam-muted">{v}</dd>
    </div>
  );
}

/**
 * 사용 중지·되돌리기 전에 까닭을 받는다.
 *
 * 문항 하나가 빠지면 그 문항으로 재던 축이 얇아진다. 왜 뺐는지가 남지 않으면 다음
 * 회차를 짜는 사람은 그 자리를 어떻게 메워야 할지 알 수 없다.
 */
function RetireBox({
  mode,
  item,
  onConfirm,
  onClose,
}: {
  mode: "retire" | "restore";
  item: ItemDraft;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const short = reason.trim().length < 10;
  const retire = mode === "retire";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-brand-950/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="retire-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-lg border border-exam-line bg-white p-6 sm:p-8">
        <h2 id="retire-title" className={a.pageTitle}>
          {retire ? "이 문항을 회차에서 뺍니다" : "이 문항을 다시 씁니다"}
        </h2>
        <p className={`${a.bodyText} mt-2.5`}>
          {item.code || item.id} · {item.stem}
        </p>
        <p className={`${a.bodyText} mt-2`}>
          {retire
            ? "문항은 지워지지 않고 은행에 남습니다. 다음 검사지 조립부터 후보에서 빠지며, 이미 나간 회차의 판정은 그대로입니다."
            : "다시 승인 상태가 되어 검사지 조립 후보에 오릅니다."}
        </p>

        <div className="mt-5">
          <label htmlFor="retire-reason" className={a.label}>
            까닭을 적어 주세요
          </label>
          <p className={`${a.hint} mt-1`}>
            {retire
              ? "예: 26A 회차 정답률 96% — 변별이 되지 않아 뺍니다. 문항 자체에 오류는 없습니다."
              : "예: 학년군을 5~6학년으로 바꿔 다시 쓰기로 함"}
          </p>
          <textarea
            id="retire-reason"
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
            className={short ? a.btnDisabled : retire ? a.btnDanger : a.btnPrimary}
          >
            기록을 남기고 {retire ? "사용 중지" : "다시 쓰기"}
          </button>
          <button type="button" onClick={onClose} className={a.btnGhost}>
            그만두기
          </button>
        </div>
      </div>
    </div>
  );
}
