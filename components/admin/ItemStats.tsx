"use client";

import Link from "next/link";
import { useHydrated } from "@/lib/examStore";
import { stateLabel, useItems, type ItemState } from "@/lib/itemStore";
import { BarRows } from "./Charts";
import * as a from "./ui";

/**
 * ADM-01 문항 은행 현황.
 *
 * 여기 숫자는 지어내지 않는다. 출제·검수 워크벤치가 쓰는 문항 저장소를 그대로
 * 읽는다 — 대시보드에 「47개」라고 적어 두고 문항 목록에 들어가면 11개인 화면을
 * 만들면, 그다음부터는 어느 숫자도 믿지 않게 된다.
 *
 * 그래서 서버에서 그릴 수 없다. 저장소가 브라우저에 있어서 클라이언트로 둔다.
 */

const SUBJECTS = ["국어", "수학", "과학"] as const;

/** 손볼 것이 먼저 — 반려 → 작성 중 → 검수 대기 → 승인 */
const STATE_ORDER: ItemState[] = ["rejected", "draft", "submitted", "approved"];

export default function ItemStats() {
  const hydrated = useHydrated();
  const items = useItems();

  if (!hydrated) {
    return <p className="py-8 adm-t-sm text-exam-muted">확인 중입니다…</p>;
  }

  const total = items.length;
  const approved = items.filter((i) => i.state === "approved").length;

  const bySubject = SUBJECTS.map((s) => {
    const rows = items.filter((i) => i.subject === s);
    const ok = rows.filter((i) => i.state === "approved").length;
    return {
      key: s,
      label: s,
      value: rows.length,
      note: `승인 ${ok}`,
    };
  });

  const byState = STATE_ORDER.map((s) => ({
    key: s,
    label: stateLabel[s],
    value: items.filter((i) => i.state === s).length,
  }));

  return (
    <section className="mt-7">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className={a.cardTitle}>문항 은행</h2>
        <Link href="/admin/authoring" className="adm-t-sm font-bold text-brand-700 hover:underline">
          출제 워크벤치로 →
        </Link>
      </div>

      <p className={`${a.bodyText} mt-1.5`}>
        지금 등록된 문항은 모두 <b className="font-bold text-exam-text">{total}개</b>이고, 이 중
        검수를 통과해 검사지에 넣을 수 있는 것은{" "}
        <b className="font-bold text-exam-text">{approved}개</b>입니다.
      </p>

      <div className="mt-5 grid gap-x-10 gap-y-6 lg:grid-cols-2">
        <div>
          <h3 className={a.label}>과목별</h3>
          <div className="mt-3">
            <BarRows rows={bySubject} unit="개" emptyText="아직 등록된 문항이 없습니다." />
          </div>
        </div>

        <div>
          <h3 className={a.label}>상태별</h3>
          <div className="mt-3">
            <BarRows rows={byState} unit="개" emptyText="아직 등록된 문항이 없습니다." />
          </div>
        </div>
      </div>
    </section>
  );
}
