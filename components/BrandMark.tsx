/**
 * GENIXX 심벌 — 오른쪽으로 날아가는 종이비행기(보냄) 형태의 외곽선.
 *
 * 원본이 래스터라 확대하면 뭉개지므로 좌표를 다시 잡아 벡터로 그렸다.
 * 선 색은 currentColor를 따르므로 남색 바탕에서도 흰색으로 그대로 쓴다.
 * 모서리는 round join으로 처리해 원본의 부드러운 꼭짓점을 살린다.
 */
export default function BrandMark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 128 104"
      fill="none"
      stroke="currentColor"
      strokeWidth={8}
      strokeLinejoin="round"
      strokeLinecap="round"
      aria-hidden
      focusable="false"
      className={className}
    >
      <path d="M120 46 10 8l31 45L18 96Z" />
    </svg>
  );
}
