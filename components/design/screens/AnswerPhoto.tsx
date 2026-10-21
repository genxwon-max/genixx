"use client";

import { useId } from "react";

/**
 * 아이가 올린 사진의 예시 — 공책에 봉지 열두 개와 식을 적은 종이(수학 3번 · 구슬 84개를 7개씩).
 * 실제로는 올린 사진이 그대로 보인다. 시안에 쓸 사진이 없어 그림으로 대신한다.
 *
 * 채점 상세 디자인에만 있던 그림을 사진 다시 받기 디자인(운영자 확인 · 다시 올리는 화면)이 함께
 * 쓰려고 떼어 냈다. 「알아볼 수 없는」 사진을 몇 가지 꼴로 보여 주어야 해서 꼴을 고른다 —
 *
 *   clear    또렷한 사진 — 처음부터 잘 찍은 사진, 다시 올린 사진
 *   blurred  흐려서 글씨를 읽을 수 없는 사진
 *   glare    어둡고, 형광등 빛이 비쳐 가운데가 하얗게 날아간 사진
 *   blank    아무것도 쓰지 않은 공책 면을 찍은 사진
 */
export type PhotoLook = "clear" | "blurred" | "glare" | "blank";

const label: Record<PhotoLook, string> = {
  clear: "학생이 올린 사진 — 공책에 구슬 봉지 열두 개를 그리고 84 ÷ 7 = 12 라고 적었습니다",
  blurred: "학생이 올린 사진 — 흐려서 알아볼 수 없습니다",
  glare: "학생이 올린 사진 — 어둡고 빛이 비쳐 글씨가 보이지 않습니다",
  blank: "학생이 올린 사진 — 아무것도 쓰지 않은 공책 면입니다",
};

export default function AnswerPhoto({
  look = "clear",
  className = "block h-auto w-full",
}: {
  look?: PhotoLook;
  className?: string;
}) {
  const id = useId();
  const glareId = `${id}-glare`;

  return (
    <svg
      viewBox="0 0 400 300"
      role="img"
      aria-label={label[look]}
      className={className}
      style={look === "blurred" ? { filter: "blur(5px) brightness(0.72)" } : undefined}
    >
      <rect width="400" height="300" fill="#8c8377" />
      <g transform="rotate(-2.5 200 150)">
        <rect x="26" y="20" width="348" height="262" rx="3" fill="#fbf9f2" />
        {Array.from({ length: 10 }, (_, i) => (
          <line key={i} x1="26" x2="374" y1={52 + i * 24} y2={52 + i * 24} stroke="#cfd9e6" strokeWidth="1" />
        ))}
        <line x1="62" x2="62" y1="20" y2="282" stroke="#f0b4b4" strokeWidth="1" />
        {look !== "blank" && (
          <>
            {/* 봉지 열두 개 — 여섯 개씩 두 줄 */}
            {Array.from({ length: 12 }, (_, i) => {
              const x = 84 + (i % 6) * 46;
              const y = 62 + Math.floor(i / 6) * 64;
              return (
                <g key={i} stroke="#2b3550" strokeWidth="1.6" fill="none" strokeLinecap="round">
                  <path d={`M${x} ${y + 8} q-4 18 2 34 q14 6 28 0 q6 -16 2 -34 z`} />
                  <path d={`M${x + 4} ${y + 8} q12 -9 24 0`} />
                  {[0, 1, 2, 3, 4, 5, 6].map((k) => (
                    <circle
                      key={k}
                      cx={x + 7 + (k % 3) * 9}
                      cy={y + 19 + Math.floor(k / 3) * 8}
                      r="2.6"
                      fill="#2b3550"
                      stroke="none"
                    />
                  ))}
                </g>
              );
            })}
            <text x="84" y="222" fontSize="26" fontStyle="italic" fill="#2b3550" fontFamily="var(--font-noto-kr), sans-serif">
              84 ÷ 7 = 12
            </text>
            <text x="84" y="256" fontSize="17" fontStyle="italic" fill="#2b3550" fontFamily="var(--font-noto-kr), sans-serif">
              7개씩 12봉지, 남는 구슬 없음
            </text>
          </>
        )}
      </g>

      {/* 어두운 방에서 찍어 전체가 가라앉고, 형광등이 종이에 비쳐 가운데가 하얗게 날아갔다 */}
      {look === "glare" && (
        <>
          <defs>
            <radialGradient id={glareId} cx="0.5" cy="0.5" r="0.5">
              <stop offset="0" stopColor="#ffffff" stopOpacity="0.96" />
              <stop offset="0.55" stopColor="#ffffff" stopOpacity="0.7" />
              <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="400" height="300" fill="#0b0d14" opacity="0.58" />
          <ellipse cx="196" cy="200" rx="185" ry="110" fill={`url(#${glareId})`} />
        </>
      )}
    </svg>
  );
}
