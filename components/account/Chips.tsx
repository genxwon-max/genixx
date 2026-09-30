"use client";

/**
 * 눌러서 켜고 끄는 알약. 여러 개 고르는 항목과, 다시 누르면 풀리는 성별에 쓴다.
 *
 * 한 명씩 등록(ChildNew)과 여럿 등록(BulkRegister)이 함께 쓴다 — 같은 항목이 두 화면에서
 * 다른 모양으로 서면 보호자는 같은 것을 두 번 배운다.
 */
export default function Chips({
  options,
  picked,
  onToggle,
  labelledBy,
}: {
  options: string[];
  picked: string[];
  onToggle: (v: string) => void;
  labelledBy: string;
}) {
  return (
    <div role="group" aria-labelledby={labelledBy} className="mt-2 flex flex-wrap gap-2">
      {options.map((o) => {
        const on = picked.includes(o);
        return (
          <button
            key={o}
            type="button"
            aria-pressed={on}
            onClick={() => onToggle(o)}
            className={`h-10 rounded-full border px-4 text-[14px] font-semibold transition-colors ${
              on
                ? "border-soft-primary bg-soft-primary-soft text-soft-primary"
                : "border-soft-line bg-white text-soft-muted hover:bg-slate-50"
            }`}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

/** 목록에서 하나를 넣고 빼기 — 여러 개 고르는 알약이 함께 쓴다 */
export const flip = (list: string[], v: string) =>
  list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
