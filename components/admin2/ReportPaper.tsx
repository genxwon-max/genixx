import { Tag } from "./ui";

/**
 * 회원이 받는 리포트의 지면 — 머리(누구의 무슨 리포트인가)와 문단.
 *
 * 리포트 승인의 「리포트 보기」 창(ReportPreview.tsx)과 조립 규칙의 「리포트 미리 보기」 창
 * (RuleBoard.tsx)이 같은 조각을 쓴다. 규칙을 고치는 사람이 미리 보는 것과 발행 전에 검토자가
 * 읽는 것이 같은 모양이어야, 한쪽에서 본 것을 다른 쪽에서 다시 확인할 필요가 없다.
 */

/** 지면의 머리 — 진단과 학년, 「○○ 님의 재능 리포트」, 재능 유형 */
export function PaperHead({
  line,
  name,
  typeName,
}: {
  /** 「2026 파일럿 3회차 · 초등 4학년」 */
  line: string;
  name: string;
  typeName: string;
}) {
  return (
    <>
      <p className="a2-t-sm text-(--a2-ink-3)">{line}</p>
      <h3 className="a2-title-lg mt-1">{name} 님의 재능 리포트</h3>
      <p className="mt-2 flex flex-wrap items-center gap-1.5">
        <Tag accent>{typeName}</Tag>
      </p>
    </>
  );
}

/** 읽기만 하는 문단 하나 — 절 이름 · 제목 · 문구 */
export function PaperBlock({
  section,
  title,
  text,
  mark,
}: {
  section: string;
  title: string;
  text: string;
  /** 제목 옆에 작게 붙는 말 — 「수정됨」 */
  mark?: string;
}) {
  return (
    <section>
      <p className="a2-label">{section}</p>
      <h4 className="a2-h mt-0.5">
        {title}
        {mark && <span className="ml-1.5 a2-t-xs font-normal text-(--a2-ink-4)">{mark}</span>}
      </h4>
      <p className="mt-1.5 a2-t-md leading-[1.9] text-(--a2-ink)">{text}</p>
    </section>
  );
}
