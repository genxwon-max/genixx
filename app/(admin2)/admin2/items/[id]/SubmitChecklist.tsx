"use client";

import { levelAllowed, submitChecklist } from "@/lib/blueprint";
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
import { FormRow, FormRowPair, Panel } from "@/components/admin2/ui";

/**
 * Ⅲ. 제출 전 자가 체크리스트 — 문항 상세의 맨 아래 판.
 *
 * 열네 줄이 모두 켜지고 「위 14항을 모두 확인하였음」이 켜져야 검수로 낼 수 있다
 * (lib/itemStore.ts missingSubmit). 종이 문항 카드의 마지막 쪽과 같은 차례로 선다 —
 * 체크리스트 → 제출 확인 → 출제자 유의 · 검토 요청.
 *
 * ── 「위 14항을 모두 확인하였음」은 전체 확인이다 ──
 * 누르면 열네 줄이 한꺼번에 켜지고 확인한 때가 남는다(signedAt). 끄면 열네 줄도 함께 꺼진다.
 * 줄을 하나씩 켜 가다 마지막 줄을 켜도 확인이 켜진다 — 열네 줄이 다 켜졌는데 확인만 꺼져
 * 있으면 제출 단추가 왜 안 켜지는지 찾아다닌다.
 *
 * 한동안 출제위원 (서명) 칸에 이름을 치게 했다. 로그인한 운영자 이름을 대신 남긴다(signedBy).
 *
 * ── 기계가 보는 것은 짚지 않고 적기만 한다 ──
 * 배점 매핑 · 정답 보기 길이처럼 기계가 가릴 수 있는 어긋남은 그 줄 아래에 빨갛게 적는다.
 * 비어 있는 칸을 다시 짚는 줄(성취기준 코드 · 재능 평가 관점)은 걷었다 — 칸마다 필수 표시가
 * 있고, 남은 것은 제출 단추의 풍선 도움말이 말한다.
 *
 * 해당 없는 줄(단일 문항의 세트 노출 · 자연-생태가 아닌 문항의 탐색적 표기)은 해당 없다고
 * 적어 두어 왜 짚는지 헤매지 않게 한다.
 *
 * ── 확인은 내용에 붙는다 ──
 * 확인한 뒤 문항을 고치면 확인이 풀린다(ItemDetail의 set). 줄은 켜 둔 채라 다시 확인하는 것은
 * 한 번 누르면 된다. 여기서 한 줄을 끄면 역시 풀린다 — 「14항을 모두 확인하였음」이 더는 참이 아니다.
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
    case "chk-tag-b":
      return hit((q) => !levelAllowed(q.talent, q.level), "재능 축이 낼 수 없는 단계입니다");
    case "chk-format": {
      /* 문항마다 제 까닭을 적는다. 첫 문항의 까닭에 번호만 모아 붙이면 S4 문항 옆에 S1 규칙이 선다 */
      const bad = qs.flatMap((q, k) => {
        const why = formatIssue(q).replace(/\.$/, "");
        if (!why) return [];
        return [item.form === "set" ? `${k + 1}번 — ${why}` : why];
      });
      return bad.length > 0 ? { tone: "danger", text: bad.join(" / ") } : null;
    }
    case "chk-distractor":
      if (!qs.some((q) => q.type === "choice")) return none("객관식 문항이 없습니다");
      return (
        hit(
          (q) =>
            q.type === "choice" &&
            q.choices.some((c, k) => c.trim() && k !== q.answer && !q.distractorIntent[k]?.trim()),
          "오답 설계 의도가 빈 보기가 있습니다",
        ) ?? hit(answerIsLongest, "정답 보기가 가장 깁니다")
      );
    case "chk-examples":
      /* 선택형은 칸이 열려 있어도 개수를 따지지 않는다 — 정오로 채점한다 */
      return hit(
        (q) =>
          !hasChoices(q.type) && exampleCount(q.acceptExamples) < 2,
        "인정 예가 2개에 못 미칩니다",
      );
    case "chk-set":
      return item.form === "single" ? none("단일 문항입니다") : null;
    case "chk-natu":
      return qs.some((q) => q.talent === "NATU") ? null : none("자연-생태 문항이 아닙니다");
    default:
      return null;
  }
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
    return (
      <Panel flush>
        <div className="a2-form a2-form-lg a2-card">{notes}</div>
      </Panel>
    );
  }

  return (
    <Panel
      title="Ⅲ. 제출 전 자가 체크리스트"
      meta={`${total - left}/${total} · 전 항목 ☑ 후 제출`}
      flush
    >
      <ol className="a2-checklist border-b border-(--a2-line)">
        {submitChecklist.map((c, k) => {
          const note = machineNote(c.id, saved);
          return (
            <li key={c.id}>
              <label>
                <input
                  type="checkbox"
                  checked={item.checks.includes(c.id)}
                  disabled={disabled}
                  onChange={() => toggle(c.id)}
                />
                <span className="a2-checklist-no">{String(k + 1).padStart(2, "0")}</span>
                <span>
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
                </span>
              </label>
            </li>
          );
        })}
      </ol>

      <div className="a2-form a2-form-lg a2-card" style={{ borderTop: 0 }}>
        <FormRow
          label="제출 확인"
          req
          hint={
            unsigned && !signed ? (
              <span style={{ color: toneColor.warn }}>
                확인한 뒤 문항을 고쳐 제출 확인이 풀렸습니다. 다시 확인해 주세요.
              </span>
            ) : undefined
          }
        >
          <label className="a2-cell-pad flex items-center gap-2 a2-t-md text-(--a2-ink)">
            <input type="checkbox" checked={signed} disabled={disabled} onChange={toggleAll} />
            위 {total}항을 모두 확인하였음.
          </label>
        </FormRow>

        {notes}
      </div>
    </Panel>
  );
}
