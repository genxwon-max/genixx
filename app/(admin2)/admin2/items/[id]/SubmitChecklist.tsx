"use client";

import { figureChecks, levelAllowed, submitChecklist } from "@/lib/blueprint";
import {
  answerIsLongest,
  checksLeft,
  exampleCount,
  formatIssue,
  hasChoices,
  now,
  type ItemDraft,
  type Question,
} from "@/lib/itemStore";
import { toneColor } from "@/lib/admin2";
import GrowTextarea from "@/components/admin2/GrowTextarea";
import { FormRowPair } from "@/components/admin2/ui";
import { Blue } from "@/components/admin2/Guide";
import { PaperChapter } from "./Paper";

/**
 * Ⅱ. 제출 전 자가 체크리스트 — 원안지의 마지막 쪽(2026-10-28 요청).
 *
 * 종이 원안지와 같은 표다 — 파란 「세트 문항 출제 후 자가 체크리스트를 체크하여 주세요.」, 「확인 |
 * 점검 항목」 머리의 열두 줄, 「제출 확인: 위 12항을 모두 확인하였음. 출제위원 서명: 2026. . .」,
 * 「[출제본부 접수: / 3중 검토 회부: ]」. 그 아래 출제자 유의 · 검토 요청은 원안지에 없는 이 콘솔의 칸이다.
 *
 * 열두 줄이 모두 켜지고 「위 12항을 모두 확인하였음」이 켜져야 검수로 낼 수 있다
 * (lib/itemStore.ts missingSubmit).
 *
 * ── 「위 12항을 모두 확인하였음」은 전체 확인이다 ──
 * 누르면 열두 줄이 한꺼번에 켜지고 확인한 때가 남는다(signedAt). 끄면 열두 줄도 함께 꺼진다.
 * 줄을 하나씩 켜 가다 마지막 줄을 켜도 확인이 켜진다 — 열두 줄이 다 켜졌는데 확인만 꺼져
 * 있으면 제출 단추가 왜 안 켜지는지 찾아다닌다.
 *
 * 출제위원 서명 칸에 이름을 치게 하지 않는다. 로그인한 운영자 이름을 대신 남긴다(signedBy).
 *
 * ── 기계가 보는 것은 짚지 않고 적기만 한다 ──
 * 배점 매핑 · 정답 보기 길이처럼 기계가 가릴 수 있는 어긋남은 그 줄 아래에 빨갛게 적는다.
 * 해당 없는 줄(단일 문항의 세트 노출 · 그림 없는 문항의 그림 조건)은 해당 없다고 적어 두어 왜 짚는지
 * 헤매지 않게 한다.
 *
 * ── 확인은 내용에 붙는다 ──
 * 확인한 뒤 문항을 고치면 확인이 풀린다(ItemDetail의 set). 줄은 켜 둔 채라 다시 확인하는 것은
 * 한 번 누르면 된다. 여기서 한 줄을 끄면 역시 풀린다 — 「12항을 모두 확인하였음」이 더는 참이 아니다.
 */

type Patch = Partial<
  Pick<ItemDraft, "checks" | "signedBy" | "signedAt" | "guidance" | "reviewRequest">
>;

/** 세트면 「(2 · 3번)」, 단일이면 빈 글자 */
function where(item: ItemDraft, hit: (q: Question) => boolean) {
  const ns = item.questions.flatMap((q, k) => (hit(q) ? [k + 1] : []));
  if (ns.length === 0) return null;
  return item.form === "set" ? ` (${ns.join(" · ")}번)` : "";
}

/** 줄마다 기계가 짚을 것 — 걸림(빨강) 또는 해당 없음(회색) */
type Note = { tone: "danger" | "muted"; text: string };

function machineNote(id: string, item: ItemDraft): Note | null {
  const qs = item.questions;
  const hit = (test: (q: Question) => boolean, text: string) => {
    const w = where(item, test);
    return w === null ? null : { tone: "danger" as const, text: `${text}${w}` };
  };
  const none = (text: string) => ({ tone: "muted" as const, text: `해당 없음 — ${text}` });

  switch (id) {
    case "c12-coord":
      return hit((q) => !levelAllowed(q.talent, q.level), "재능 축이 낼 수 없는 단계입니다");
    case "c12-format": {
      /* 문항마다 제 까닭을 적는다. 첫 문항의 까닭에 번호만 모아 붙이면 S4 문항 옆에 S1 규칙이 선다 */
      const bad = qs.flatMap((q, k) => {
        const why = formatIssue(q).replace(/\.$/, "");
        if (!why) return [];
        return [item.form === "set" ? `${k + 1}번 — ${why}` : why];
      });
      return bad.length > 0 ? { tone: "danger", text: bad.join(" / ") } : null;
    }
    case "c12-distractor":
      if (!qs.some((q) => q.type === "choice")) return none("객관식 문항이 없습니다");
      return (
        hit(
          (q) =>
            q.type === "choice" &&
            q.choices.some((c, k) => c.trim() && k !== q.answer && !q.distractorIntent[k]?.trim()),
          "오답 설계 의도가 빈 보기가 있습니다",
        ) ?? hit(answerIsLongest, "정답 보기가 가장 깁니다")
      );
    case "c12-rubric": {
      /* S3 · S4의 사람이 채점하는 문항만 — 선택형은 정오로 채점한다 */
      const written = (q: Question) =>
        (q.level === "S3" || q.level === "S4") && !hasChoices(q.type);
      if (!qs.some(written)) return none("S3 · S4 서술 문항이 없습니다");
      return (
        hit(
          (q) => written(q) && exampleCount(q.acceptExamples) < 2,
          "인정 예가 2개에 못 미칩니다",
        ) ?? hit((q) => written(q) && exampleCount(q.rejectExamples) < 1, "불인정 예가 없습니다")
      );
    }
    case "c12-set":
      return item.form === "single" ? none("독립 문항입니다") : null;
    case "c12-perspective":
      return hit(
        (q) => !q.perspectiveHierarchy.trim() || !q.perspectiveAbility.trim(),
        "재능 평가 관점이 빈 문항이 있습니다",
      );
    case "c12-figure":
      if (!qs.some((q) => q.figure === "has")) return none("그림이 있는 문항이 없습니다");
      return hit(
        (q) => q.figure === "has" && figureChecks.some((c) => !q.figureChecks.includes(c.id)),
        "⑧ 그림·삽화 사양의 확인 칸이 남았습니다",
      );
    default:
      return null;
  }
}

/** 「2026-10-28 14:05」 → 「2026. 10. 28.」 — 원안지의 서명 날짜 꼴 */
function paperDate(at: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(at);
  return m ? `${m[1]}. ${Number(m[2])}. ${Number(m[3])}.` : at;
}

export default function SubmitChecklist({
  item,
  signer,
  unsigned,
  disabled,
  reviewing = false,
  onChange,
}: {
  /** 화면에 그리는 값 — 고치는 중인 초안이 덮인 문항 */
  item: ItemDraft;
  /** 확인한 사람으로 남길 이름 — 로그인한 운영자 */
  signer: string;
  /**
   * 고친 내용 때문에 확인이 풀렸는가. 말없이 풀리면 제출 단추가 왜 다시 꺼졌는지 찾아다닌다.
   * 저장된 값과 견주지 않는 것은, 확인하고 저장하기 전에 고친 경우도 알려야 해서다
   */
  unsigned: boolean;
  disabled: boolean;
  /**
   * 검수 대기 중인가 — 체크리스트 · 제출 확인을 걷고 출제자 유의 · 검토 요청만 세운다. 검수자가
   * 읽을 것은 그 둘뿐이고, 둘 다 비었으면 판째 세우지 않는다.
   */
  reviewing?: boolean;
  onChange: (patch: Patch) => void;
}) {
  const left = checksLeft(item);
  const total = submitChecklist.length;
  const signed = item.signedAt !== "";
  const allIds = submitChecklist.map((c) => c.id);
  /* 기계가 보는 것은 저장될 문항만. 세트를 단일로 돌려 둔 채면 2번 이후는 화면에 없고 저장할 때
     떨어지는데, 그 문항의 빈칸을 번호 없이 짚으면 화면에 없는 잘못을 찾아다닌다 */
  const saved =
    item.form === "single" && item.questions.length > 1
      ? { ...item, questions: item.questions.slice(0, 1) }
      : item;

  const toggle = (id: string) => {
    const on = item.checks.includes(id);
    const checks = on ? item.checks.filter((x) => x !== id) : [...item.checks, id];
    const complete = allIds.every((x) => checks.includes(x));
    onChange({
      checks,
      ...(on && signed ? { signedAt: "" } : {}),
      ...(!on && complete && !signed ? { signedAt: now(), signedBy: signer } : {}),
    });
  };

  const toggleAll = () =>
    onChange(
      signed
        ? { checks: [], signedAt: "" }
        : { checks: allIds, signedAt: now(), signedBy: signer },
    );

  /* 문턱에 넣지 않는다(missingSubmit). 짚어 둘 것이 없는 문항도 있다 */
  const notes = (
    <FormRowPair
      left={{
        label: "출제자 유의",
        children: (
          <GrowTextarea
            className="a2-textarea a2-textarea-lg"
            rows={3}
            value={item.guidance}
            disabled={disabled}
            placeholder={
              reviewing ? undefined : "이 문항에서 반드시 지킬 지침 — 뜻풀이를 요구하면 S2로 이탈합니다"
            }
            onChange={(e) => onChange({ guidance: e.target.value })}
            aria-label="출제자 유의"
          />
        ),
      }}
      right={{
        label: "검토 요청",
        children: (
          <GrowTextarea
            className="a2-textarea a2-textarea-lg"
            rows={3}
            value={item.reviewRequest}
            disabled={disabled}
            placeholder={reviewing ? undefined : "검수자가 특히 봐 주었으면 하는 것"}
            onChange={(e) => onChange({ reviewRequest: e.target.value })}
            aria-label="검토 요청"
          />
        ),
      }}
    />
  );

  /* 검수 중에는 자리표시 글을 걷는다 — 빈 칸에 선 「검수자가 특히 봐 주었으면 하는 것」이
     출제위원이 적은 요청으로 읽힌다 */
  if (reviewing) {
    if (!item.guidance.trim() && !item.reviewRequest.trim()) return null;
    return <div className="a2-form a2-form-lg a2-card a2-paper-notes">{notes}</div>;
  }

  /* 출제본부가 채우는 자리 — 접수는 검수로 낸 뒤, 3중 검토 회부는 검수 기록이 생긴 뒤 */
  const received = item.state !== "draft";
  const rounds = item.reviews.length;

  return (
    <section className="a2-paper-check">
      <p className="a2-paper-check-lead">
        <Blue>세트 문항 출제 후 자가 체크리스트를 체크하여 주세요.</Blue>
      </p>
      <PaperChapter>
        Ⅱ. 제출 전 자가 체크리스트 (전 항목 ☑ 후 제출)
        <span className="a2-paper-chapter-meta">
          {total - left}/{total}
        </span>
      </PaperChapter>

      {/* 줄 전체가 누르는 자리다 — 작은 체크 상자 하나만 누르게 두면 열두 번 겨냥해야 한다.
          표의 칸은 label 하나로 묶이지 않아 두 칸 모두 같은 체크를 가리킨다(htmlFor) */}
      <table className="a2-paper-table">
        <thead>
          <tr>
            <th style={{ width: "4.5rem" }}>확인</th>
            <th>점검 항목</th>
          </tr>
        </thead>
        <tbody>
          {submitChecklist.map((c) => {
            const note = machineNote(c.id, saved);
            const box = `check-${c.id}`;
            return (
              <tr key={c.id}>
                <td className="a2-paper-table-box">
                  <input
                    id={box}
                    type="checkbox"
                    checked={item.checks.includes(c.id)}
                    disabled={disabled}
                    onChange={() => toggle(c.id)}
                  />
                </td>
                <td>
                  <label htmlFor={box}>
                    {c.text}
                    {note && (
                      <span
                        className="mt-0.5 block a2-t-xs"
                        style={{
                          color: note.tone === "danger" ? toneColor.danger : "var(--a2-ink-4)",
                        }}
                      >
                        {note.text}
                      </span>
                    )}
                  </label>
                </td>
              </tr>
            );
          })}
          <tr>
            <td colSpan={2} className="a2-paper-sign">
              <label>
                <input type="checkbox" checked={signed} disabled={disabled} onChange={toggleAll} />
                <b>제출 확인: 위 {total}항을 모두 확인하였음.</b>
              </label>
              <b>
                출제위원 서명:{" "}
                {signed
                  ? `${item.signedBy || signer} ${paperDate(item.signedAt)}`
                  : "2026.    .    ."}
              </b>
            </td>
          </tr>
          <tr>
            <td colSpan={2} className="a2-paper-office">
              [출제본부 접수: {received ? "접수" : ""} / 3중 검토 회부:{" "}
              {rounds > 0 ? `${rounds}회` : ""} ]
            </td>
          </tr>
        </tbody>
      </table>
      {unsigned && !signed && (
        <p className="a2-paper-warn">
          확인한 뒤 문항을 고쳐 제출 확인이 풀렸습니다. 다시 확인해 주세요.
        </p>
      )}

      <div className="a2-form a2-form-lg a2-card a2-paper-notes">{notes}</div>
    </section>
  );
}
