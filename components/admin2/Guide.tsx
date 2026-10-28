/**
 * 원안지의 안내 글 — 빈 칸에만 서고, 값을 넣으면 사라진다(2026-10-28 요청).
 *
 * 종이 원안지(Genixx 지필 진단 문항 출제 원안지 양식, 2026-10-22 최종)는 칸마다 빨간 글씨로
 * 「(지우고 사용)」 · 「(수정 사용)」 같은 쓰는 법을 적어 두었다. 출제위원은 그것을 지우고 제 글을
 * 적는다. 화면에서는 지우는 수고 없이 — 칸이 비어 있는 동안만 서고, 한 글자라도 적으면 걷힌다.
 *
 * 자리표시 글(placeholder)로 두지 않은 것은 한 칸 안에 색이 둘이라서다. 회색 예시(「예) …」)
 * 뒤에 빨간 안내가 붙고, 출제 의도 칸은 양식대로 파란 글씨다. 자리표시 글은 한 색만 받는다.
 *
 * 안내 글은 칸과 같은 자리에 겹쳐 그린다(admin2.css .a2-guided). 글 칸이 안내 글보다 낮으면 칸이
 * 안내 글 높이까지 자란다 — 겹쳐 그리기만 하면 긴 안내가 아래 줄을 덮는다. 누르면 칸이 눌린다.
 */
export function Guided({
  show,
  guide,
  children,
}: {
  /** 칸이 비었는가 — 비었을 때만 안내 글을 그린다 */
  show: boolean;
  guide: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="a2-guided">
      {children}
      {show && (
        <div className="a2-guide" aria-hidden>
          {guide}
        </div>
      )}
    </div>
  );
}

/** 빨간 안내 — 원안지의 쓰는 법 */
export const Red = ({ children }: { children: React.ReactNode }) => (
  <span className="a2-guide-red">{children}</span>
);

/** 파란 글 — 원안지에서 파랗게 적힌 것(머리의 학년 · 과목 · 단원, 출제 의도의 「반드시 기록하여 주세요.」) */
export const Blue = ({ children }: { children: React.ReactNode }) => (
  <span className="a2-guide-blue">{children}</span>
);
