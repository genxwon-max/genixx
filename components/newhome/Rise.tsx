"use client";

import { useEffect, useRef, useState } from "react";

/**
 * 아래에서 위로 떠오르는 등장. 한 번만 하고 되돌리지 않는다.
 *
 * 움직임 자체는 app/(newhome)/newhome.css의 .nh-rise가 맡고, 줄이기 설정이면 거기서 꺼진다.
 * 여기서는 언제 켤지만 정한다.
 *
 * now를 주면 화면에 들어왔는지 보지 않고 마운트 직후 바로 켠다 — 첫 화면의 문항 판처럼
 * 이미 눈앞에 있는 것을 관찰자에게 맡기면, 스크롤 위치에 따라 켜지지 않는 일이 생긴다.
 *
 * 켜짐을 state로 들고 className에 섞어 그린다. classList.add로 붙이면 React가 뒤에
 * className을 다시 칠할 때 지워져 영영 투명해진다(components/home5/Reveal.tsx와 같은 이유).
 */
export default function Rise({
  children,
  className = "",
  delay = 0,
  lg,
  now,
  as: Tag = "div",
}: {
  children: React.ReactNode;
  className?: string;
  /** ms — 같은 줄의 카드를 차례로 띄울 때 */
  delay?: number;
  /** 더 멀리서 올라온다 — 첫 화면의 큰 판에만 */
  lg?: boolean;
  /** 화면에 들어오길 기다리지 않고 바로 */
  now?: boolean;
  as?: "div" | "li" | "section" | "article";
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [on, setOn] = useState(false);

  useEffect(() => {
    if (now) {
      /* 효과 안에서 바로 setState하면 첫 그림에 이미 켜진 채로 나와 움직임이 없다.
         한 프레임 뒤에 켜야 아래에서 올라오는 것이 보인다. */
      const id = requestAnimationFrame(() => setOn(true));
      return () => cancelAnimationFrame(id);
    }
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) {
      const t = setTimeout(() => setOn(true), 0);
      return () => clearTimeout(t);
    }
    const io = new IntersectionObserver(
      (entries) => {
        /* 이미 화면 위로 지나간 것(bottom < 0)도 켠다.
           빠르게 굴려 내리면 한 줄짜리 칸은 관찰자가 한 번도 「들어왔다」를 받지 못한 채
           위로 사라지고, 그 자리만 영영 비어 있게 된다. 되돌아 올라와야 나타나는 글은
           없는 글과 같다. */
        if (entries.some((e) => e.isIntersecting || e.boundingClientRect.bottom < 0)) {
          setOn(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [now]);

  return (
    <Tag
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ref={ref as any}
      className={`nh-rise ${lg ? "nh-rise-lg" : ""} ${on ? "is-in" : ""} ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}
