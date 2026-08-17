import * as a from "./ui";

/**
 * 대시보드 그래프.
 *
 * SVG로 그리지 않는다. 이 콘솔은 --adm-zoom으로 글자를 1.6배까지 키우는데 SVG
 * 안에 넣은 <text>는 viewBox 비율로만 커져서 축 이름만 작게 남는다. 막대는 div
 * 높이로 그리고 글자는 전부 바깥 HTML에 둔다 — 확대가 그대로 먹는다.
 *
 * 그림 옆에는 반드시 숫자를 붙인다. 색과 길이만으로는 값을 못 읽고, 화면낭독기와
 * 색약 사용자에게는 막대가 아무것도 아니다.
 */

export type Column = {
  key: string;
  /** 축에 적는 짧은 이름 */
  label: string;
  /** 툴팁과 표에 적는 긴 이름 */
  full: string;
  total: number;
  /** 전체 안에 포함된 몫 (예: 가입 중 유료 전환) */
  sub?: number;
};

export function ColumnChart({
  data,
  totalName,
  subName,
  unit,
  caption,
  height = "h-44",
  numbers = true,
}: {
  data: Column[];
  totalName: string;
  subName?: string;
  unit: string;
  caption: string;
  /** 막대 높이. 대시보드 첫 화면에 놓는 것은 낮게 잡는다. */
  height?: string;
  /** 아래 「숫자로 보기」 표를 붙일지 — 이미 표가 딸린 자리에서는 끈다 */
  numbers?: boolean;
}) {
  const max = Math.max(1, ...data.map((d) => d.total));
  /** 서넛뿐이면 자리가 넉넉하니 막대마다 값을 늘 적는다 */
  const few = data.length <= 4;

  return (
    <figure>
      {/* 범례 — 색 이름을 말하지 않고 무엇이 어느 쪽인지 글자로 적는다 */}
      <figcaption className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <span className="flex items-center gap-2 adm-t-sm text-exam-text">
          <span aria-hidden className="h-3 w-3 shrink-0 rounded-sm bg-brand-200" />
          {totalName}
        </span>
        {subName && (
          <span className="flex items-center gap-2 adm-t-sm text-exam-text">
            <span aria-hidden className="h-3 w-3 shrink-0 rounded-sm bg-brand-900" />
            {subName}
          </span>
        )}
      </figcaption>

      <div
        role="img"
        aria-label={`${caption} 자세한 수치는 아래 「숫자로 보기」 표에 있습니다.`}
        className="mt-4"
      >
        {/* 막대 */}
        <div className={`flex ${height} items-end ${few ? "gap-3" : "gap-1 sm:gap-1.5"}`}>
          {data.map((d) => {
            const h = (d.total / max) * 100;
            const sh = d.total ? ((d.sub ?? 0) / d.total) * 100 : 0;
            return (
              <div key={d.key} className="flex h-full min-w-0 flex-1 flex-col justify-end">
                <span
                  className={`mb-1 text-center adm-t-xs tabular-nums text-exam-muted ${
                    few ? "" : "hidden lg:block"
                  }`}
                >
                  {d.total.toLocaleString("ko-KR")}
                </span>
                <div
                  className="relative w-full rounded-t-sm bg-brand-200"
                  style={{ height: `${h}%` }}
                  title={`${d.full} · ${totalName} ${d.total.toLocaleString("ko-KR")}${unit}${
                    d.sub === undefined
                      ? ""
                      : ` · ${subName} ${d.sub.toLocaleString("ko-KR")}${unit}`
                  }`}
                >
                  {d.sub !== undefined && (
                    <span
                      aria-hidden
                      className="absolute inset-x-0 bottom-0 rounded-t-sm bg-brand-900"
                      style={{ height: `${sh}%` }}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* 축 — 막대와 같은 flex 규칙이라 칸이 어긋나지 않는다 */}
        <div
          className={`mt-2 flex border-t border-exam-line pt-2 ${few ? "gap-3" : "gap-1 sm:gap-1.5"}`}
        >
          {data.map((d, i) => (
            <span
              key={d.key}
              className={`min-w-0 flex-1 truncate text-center adm-t-xs ${
                i === data.length - 1 ? "font-bold text-exam-text" : "text-exam-muted"
              }`}
            >
              {d.label}
            </span>
          ))}
        </div>
      </div>

      {numbers && <Numbers data={data} totalName={totalName} subName={subName} unit={unit} />}
    </figure>
  );
}

/** 그림 아래 접어 둔 표 — 화면낭독기와 「정확한 값이 궁금할 때」를 함께 받는다 */
function Numbers({
  data,
  totalName,
  subName,
  unit,
}: {
  data: Column[];
  totalName: string;
  subName?: string;
  unit: string;
}) {
  return (
    <details className="mt-3">
      <summary className="cursor-pointer adm-t-sm font-bold text-brand-700">숫자로 보기</summary>
      <div className="mt-2 overflow-x-auto">
        <table className={a.table}>
          <thead>
            <tr>
              <th className={a.th}>기간</th>
              <th className={`${a.th} text-right`}>
                {totalName} ({unit})
              </th>
              {subName && (
                <th className={`${a.th} text-right`}>
                  {subName} ({unit})
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.key}>
                <td className={a.tdStrong}>{d.full}</td>
                <td className={a.tdNum}>{d.total.toLocaleString("ko-KR")}</td>
                {subName && <td className={a.tdNum}>{(d.sub ?? 0).toLocaleString("ko-KR")}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

/**
 * 가로 막대 — 항목이 서넛이고 이름이 긴 것(과목·상태)에 쓴다.
 * 세로 막대에 「국어·수학·과학」을 넣으면 축 글자가 눕거나 잘린다.
 */
export function BarRows({
  rows,
  unit,
  emptyText = "아직 없습니다.",
}: {
  rows: { key: string; label: string; value: number; note?: string }[];
  unit: string;
  emptyText?: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  const sum = rows.reduce((s, r) => s + r.value, 0);

  if (sum === 0) {
    return <p className={`${a.bodyText} py-4`}>{emptyText}</p>;
  }

  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.key} className="flex items-center gap-3">
          <span className="w-16 shrink-0 adm-t-sm font-bold text-exam-text">{r.label}</span>
          <span className="min-w-0 flex-1">
            {/* 0은 막대를 그리지 않는다. 최소 폭을 주면 0이 「조금 있음」으로 읽힌다. */}
            <span
              aria-hidden
              className="block h-5 rounded-sm bg-brand-800"
              style={{ width: r.value === 0 ? 0 : `${Math.max(2, (r.value / max) * 100)}%` }}
            />
          </span>
          <span className="w-24 shrink-0 text-right adm-t-sm font-bold tabular-nums text-exam-text">
            {r.value.toLocaleString("ko-KR")}
            {unit}
          </span>
          {r.note && (
            <span className="hidden w-20 shrink-0 text-right adm-t-xs text-exam-muted sm:block">
              {r.note}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
