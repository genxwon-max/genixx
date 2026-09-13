"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useAdminPrefs } from "@/lib/adminStore";
import { useForms } from "@/lib/formStore";
import { useItems } from "@/lib/itemStore";
import { planOf, slotsFor, slotsOf, usePlans, useRounds } from "@/lib/roundPlanStore";
import FormSlot from "@/components/admin2/FormSlot";
import { Body, PageHead, Panel } from "@/components/admin2/ui";

/**
 * ADM-04-3 상세 — **한 회차, 과목 탭 하나에 검사지 한 벌**.
 *
 * 목록이 「어느 회차부터 손대야 하나」에 답하고, 여기서 실제로 담는다. 회차 안에서 옮겨
 * 다니는 것은 과목뿐이므로 판을 셋 쌓지 않고 탭으로 가른다 — 국어를 짜는 동안 수학·과학
 * 검사지가 화면 아래에 함께 서 있으면 스크롤이 세 배가 되고, 정작 지금 짜는 벌의 요약
 * 한 줄(문항·배점·앵커·단계)이 눈에서 밀린다.
 *
 * 탭 이름 옆에 담긴 문항 수를 늘 세워 둔다. 눌러 봐야 몇 문항인지 아는 구조면 「어느
 * 과목이 덜 찼나」를 알려고 탭을 세 번 눌러야 한다.
 *
 * ── 이 화면에서 하지 않는 것 ──
 * 과목·학년군을 정하는 일과 회차를 열고 닫는 일은 평가 회차 화면(ADM-05-4)에 있다. 탭이
 * 곧 그 편성의 결과이므로, 여기서 과목을 넣고 빼면 같은 것을 두 화면에서 정하게 된다.
 * 대신 그리로 가는 문을 머리에 둔다.
 */
export default function RoundFormsView({ id, subject }: { id: string; subject?: string }) {
  const forms = useForms();
  const items = useItems();
  const plans = usePlans();
  const rounds = useRounds();
  const prefs = useAdminPrefs();

  /* 처음 열 과목은 주소가 정한다. 그 뒤로는 사람이 누른 탭을 따라간다 — 주소를 계속
     따라가게 두면 탭을 눌러도 되돌아온다 */
  const [tab, setTab] = useState<string | null>(subject ?? null);

  /* 탭을 옮기면 아래 편집기가 통째로 새로 선다(key). 담다 만 것이 있으면 그대로
     사라지므로, 옮기기 전에 편집기에게 물어보게 한다 — 그 물음은 편집기가 들고 있고
     여기서는 「가려는 일」만 넘긴다(FormSlot의 onGuard) */
  const askRef = useRef<((run: () => void) => void) | null>(null);
  const goTab = (next: string) => (askRef.current ?? ((run: () => void) => run()))(() => setTab(next));

  const round = rounds.find((r) => r.id === id);

  if (!round) {
    return (
      <>
        <PageHead
          title="회차를 찾지 못했습니다"
          actions={
            <Link href="/admin2/forms" className="a2-btn">
              평가별 문항관리
            </Link>
          }
        />
        <Body>
          <Panel title="없는 회차">
            <p className="a2-t-sm text-(--a2-ink-2)">
              <span className="a2-mono">{id}</span> 회차가 목록에 없습니다. 주소가 잘못되었거나, 다른 브라우저에서
              만든 회차일 수 있습니다(회차는 이 브라우저에만 저장됩니다).
            </p>
          </Panel>
        </Body>
      </>
    );
  }

  const plan = planOf(plans, round.id);
  const slots = slotsOf(round.id, forms, items, slotsFor(plan));

  /* 고른 탭이 편성에서 빠졌을 수 있다(다른 화면에서 과목을 뺀 뒤). 없으면 첫 과목으로
     물러선다 — 빈 화면을 내놓고 「왜 아무것도 없지」를 묻게 하지 않는다 */
  const slot = slots.find((s) => s.subject === tab) ?? slots[0] ?? null;

  const by = prefs.staffName || "운영자";

  return (
    <>
      <PageHead
        title={round.label}
        actions={
          <>
            <Link href="/admin2/forms" className="a2-btn">
              회차 목록
            </Link>
            <Link href="/admin2/items" className="a2-btn">
              문항 은행
            </Link>
            <Link href={`/admin2/rounds/${round.id}`} className="a2-btn">
              회차 편성 · 개폐
            </Link>
          </>
        }
      />

      {/* 밑줄 탭 — 과목 하나가 검사지 한 벌.
          role="tab"을 붙이지 않았다. 진짜 탭 묶음은 화살표 키로 옮겨 다니는 초점 관리까지
          있어야 약속을 지키는 것이고, 그 없이 이름만 tab을 달면 화살표를 눌러도 안 움직이는
          탭이 된다. 여기서도 회원 명부와 같이 누름 상태를 가진 단추로 정직하게 적는다 */}
      <div
        role="group"
        aria-label="평가 과목"
        className="flex flex-wrap items-center gap-5 border-b border-(--a2-line) px-3"
      >
        {slots.map((s) => {
          const on = slot?.key === s.key;
          const state = !s.form ? "none" : s.form.state === "confirmed" ? "confirmed" : "draft";
          const tone =
            state === "confirmed"
              ? "var(--a2-ok)"
              : state === "draft"
                ? "var(--a2-warn)"
                : "var(--a2-ink-4)";
          return (
            <button
              key={s.key}
              type="button"
              aria-pressed={on}
              onClick={() => goTab(s.subject)}
              className={`-mb-px flex h-9 items-center gap-1.5 border-b-2 a2-t-sm font-bold ${
                on ? "border-(--a2-accent) text-(--a2-ink)" : "border-transparent text-(--a2-ink-3) hover:text-(--a2-ink)"
              }`}
              title={
                state === "none"
                  ? `${s.subject} — 검사지 없음 · 담을 수 있는 승인 문항 ${s.pool}건`
                  : `${s.subject} — ${state === "confirmed" ? "확정" : "초안"} · 문항 ${s.picked.length}건`
              }
            >
              {/* 점 색만으로 가르지 않는다 — 초안은 글자로도 적고, 없는 것은 「—」로 적는다 */}
              <span aria-hidden className="a2-dot" style={{ color: tone }} />
              {s.subject}
              {state === "none" ? (
                <span className="a2-tag text-(--a2-ink-4)">—</span>
              ) : (
                <span className={`a2-tag a2-num ${on ? "a2-tag-accent" : ""}`}>{s.picked.length}</span>
              )}
              {state === "draft" && (
                <span className="a2-t-xs font-bold" style={{ color: "var(--a2-warn)" }}>
                  초안
                </span>
              )}
            </button>
          );
        })}
      </div>

      <Body>
        {slot ? (
          /* key를 칸 열쇠로 준다. 없으면 국어 탭에서 체크해 둔 문항 목록을 든 채로 수학
             탭이 열려, 담기를 누르면 다른 과목 문항이 들어간다(확정 대조에서 걸리기는
             하지만 그 전에 담기는 것 자체를 막는 편이 낫다) */
          <FormSlot
            key={slot.key}
            roundId={round.id}
            slot={slot}
            items={items}
            by={by}
            onGuard={(ask) => {
              askRef.current = ask;
            }}
          />
        ) : (
          <Panel title="넣은 과목이 없습니다">
            <p className="a2-t-sm text-(--a2-ink-2)">
              이 회차에 넣은 평가 과목이 하나도 없습니다. 과목을 넣어야 담을 검사지가 생깁니다.
            </p>
            <div className="mt-2">
              <Link href={`/admin2/rounds/${round.id}`} className="a2-btn a2-btn-primary">
                회차 편성으로
              </Link>
            </div>
          </Panel>
        )}
      </Body>
    </>
  );
}
