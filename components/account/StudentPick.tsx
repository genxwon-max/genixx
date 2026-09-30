"use client";

import type { Student } from "@/lib/roster";

/**
 * 결제·면담의 첫 걸음 — 누구 앞으로 하는지 고르는 학생 카드.
 *
 * 두 화면이 같은 카드를 쓴다. 모양이 다르면 보호자는 같은 아이를 두 번 배워야 한다. 다른
 * 것은 고르는 방식뿐이다 — 결제는 같은 학년의 형제를 함께 고를 수 있어 체크상자, 면담은
 * 한 아이의 결과지를 놓고 나누는 자리라 라디오다.
 */
export default function StudentPick({
  students,
  multiple = false,
  name,
  isOn,
  onPick,
  blockOf,
  noteOf,
}: {
  students: Student[];
  /** 여럿을 함께 고르는가 */
  multiple?: boolean;
  /** 라디오 묶음 이름 */
  name: string;
  isOn: (s: Student) => boolean;
  onPick: (s: Student) => void;
  /** 고를 수 없는 까닭 — 고를 수 있으면 null */
  blockOf?: (s: Student) => string | null;
  /** 이름 아래 한 줄 */
  noteOf?: (s: Student) => string;
}) {
  return (
    <ul className="grid gap-2.5 sm:grid-cols-2">
      {students.map((s) => {
        const on = isOn(s);
        const block = blockOf?.(s) ?? null;
        return (
          <li key={s.id}>
            <label
              className={`flex cursor-pointer items-start gap-3 rounded-[14px] border p-4 transition-colors ${
                on
                  ? "border-2 border-soft-primary bg-soft-primary-soft"
                  : block
                    ? "cursor-not-allowed border-soft-line bg-slate-50"
                    : "border-soft-line bg-white hover:border-soft-primary"
              }`}
            >
              <input
                type={multiple ? "checkbox" : "radio"}
                name={name}
                checked={on}
                disabled={!!block}
                onChange={() => onPick(s)}
                className="mt-0.5 h-4 w-4 accent-[#365eef]"
              />
              <span className="min-w-0 flex-1">
                <span
                  className={`block text-[15px] font-bold ${block ? "text-slate-400" : "text-soft-ink"}`}
                >
                  {s.name}
                  {s.grade && (
                    <span className="ml-1.5 text-[12.5px] font-semibold text-soft-muted">
                      {s.grade}
                    </span>
                  )}
                </span>
                <span className="mt-1 block text-[12.5px] leading-[1.7] text-soft-muted">
                  {block ?? noteOf?.(s) ?? ""}
                </span>
              </span>
            </label>
          </li>
        );
      })}
    </ul>
  );
}
