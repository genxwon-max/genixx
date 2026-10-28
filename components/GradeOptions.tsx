import { gradeGroups, type SchoolLevel } from "@/lib/childOptions";

/**
 * 학년 고르개의 선택지 — 학교급 아래에 학년을 묶는다(2026-10-28 사용자 요청).
 *
 *   초등학교
 *     1학년 … 6학년
 *   중학교
 *     1학년 … 3학년
 *   고등학교
 *     1학년 … 3학년
 *
 * 어느 고르개든 <select> 안에 이것만 넣는다. 값의 꼴은 valueOf로 받는다(lib/childOptions.ts gradeValue).
 */
export default function GradeOptions({
  valueOf,
}: {
  valueOf: (level: SchoolLevel, n: number) => string | number;
}) {
  return (
    <>
      {gradeGroups(valueOf).map((g) => (
        <optgroup key={g.label} label={g.label}>
          {g.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </optgroup>
      ))}
    </>
  );
}
