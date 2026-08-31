"use client";

import { useEffect, useRef } from "react";

/**
 * 표를 감싸는 상자 — 콘솔의 표 아홉 장이 전부 이것을 쓴다.
 *
 * 하는 일은 하나다. **표가 상자보다 넓을 때만 가로 스크롤을 켠다.**
 *
 * 왜 껐다 켜야 하나 — CSS는 한 축만 스크롤로 둘 수 없다. overflow-x를 auto로 두면
 * 브라우저가 overflow-y도 auto로 끌어올리고, 그 순간 이 상자가 스크롤 컨테이너가 된다.
 * 그러면 머리 행(.a2-table th)의 sticky가 붙을 기준이 화면이 아니라 이 상자가 되는데,
 * 이 상자는 세로로 굴러가지 않으므로 머리 행은 그냥 표 꼭대기에 얹혀 화면과 함께 흘러간다.
 * 곧 「200줄을 내려도 무슨 칸인지 안 잊는다」는 약속이 조용히 깨진다.
 *
 * 그래서 넓지 않을 때는 꺼서 머리 행을 화면에 돌려준다. 넓을 때는 켜야 오른쪽 칸에
 * 닿을 수 있으므로, 그때는 sticky를 내주고 가로 스크롤을 얻는다 — 둘 다 가질 수는 없다.
 *
 * ⚠ 잰 값으로 상태(useState)를 바꾸지 않는다. 그리고 나서 한 번 더 그리게 되고, 이
 *   저장소의 규칙(react-hooks/set-state-in-effect)도 막는다. 클래스를 직접 붙였다 뗀다.
 * ⚠ 재는 대상은 <table>의 너비다. 상자 자신의 scrollWidth는 overflow를 껐다 켤 때마다
 *   뜻이 달라져 껐다 켰다를 되풀이할 수 있다.
 */
export default function TableBox({
  label,
  className = "",
  children,
}: {
  /** 스크롤이 켜졌을 때 이 상자가 무엇의 목록인지 — 없으면 region으로 알리지 않는다 */
  label?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const box = ref.current;
    const table = box?.firstElementChild;
    if (!box || !table) return;

    const check = () => {
      const fits = table.scrollWidth <= box.clientWidth;
      box.classList.toggle("a2-table-fits", fits);
      /* 굴러가지 않는 상자는 Tab 순서에서 뺀다. 굴러갈 때만 초점을 받아야 한다 —
         줄에 링크가 하나도 없는 표(기관)는 이것이 없으면 좁은 화면에서 오른쪽 칸에
         키보드로 영영 닿지 못하고, 반대로 늘 켜 두면 아무 데도 안 가는 정거장이 된다 */
      if (fits) box.removeAttribute("tabindex");
      else box.setAttribute("tabindex", "0");
    };

    check();
    const ro = new ResizeObserver(check);
    ro.observe(box);
    ro.observe(table);
    return () => ro.disconnect();
  });

  return (
    <div
      ref={ref}
      role={label ? "region" : undefined}
      aria-label={label}
      className={`a2-table-wrap ${className}`}
    >
      {children}
    </div>
  );
}
