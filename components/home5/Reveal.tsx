"use client";

import { useEffect, useRef, useState } from "react";

/**
 * 스크롤 등장. 화면에 들어오면 is-in을 붙이고 끝 — 한 번만, 되돌리지 않는다.
 * 움직임 자체는 home5.css의 .jm-reveal이 맡고, 줄이기 설정이면 거기서 꺼진다.
 *
 * 켜짐은 state로 들고 className에 섞어 그린다. classList.add로 붙이면 React가 뒤에
 * className을 다시 칠할 때(해시로 들어온 첫 화면에서 그랬다) 지워져 영영 투명해진다.
 */
export default function Reveal({
  children,
  className = "",
  delay = 0,
  as: Tag = "div",
}: {
  children: React.ReactNode;
  className?: string;
  /** ms — 같은 줄의 카드를 차례로 띄울 때 */
  delay?: number;
  as?: "div" | "li" | "section" | "article";
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [on, setOn] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) {
      // 관찰자가 없는 옛 브라우저 — 다음 틱에 그냥 켠다(효과 안에서 바로 setState하지 않으려고)
      const t = setTimeout(() => setOn(true), 0);
      return () => clearTimeout(t);
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setOn(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.1 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ref={ref as any}
      className={`jm-reveal ${on ? "is-in" : ""} ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}
