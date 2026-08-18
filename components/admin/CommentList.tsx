import { rejectLabel, type ItemComment } from "@/lib/itemStore";

/**
 * 문항에 오간 말 — 출제 워크벤치와 검수 워크벤치가 같은 모양으로 쓴다.
 *
 * 말풍선을 세우지 않는다. 면을 깔면 반려만 붉은 상자가 되어 다른 말보다 커 보이는데,
 * 여기서 중요한 것은 종류가 아니라 순서다. 누가 언제 무슨 말을 했는지 한 줄기로 읽혀야
 * 한다. 종류는 이름 옆에 글자로 적고 색은 글자에만 얹는다.
 */
export default function CommentList({ comments }: { comments: ItemComment[] }) {
  if (comments.length === 0) return null;

  return (
    <ul className="mt-3 border-t border-exam-line">
      {comments.map((c, i) => (
        <li key={i} className="border-b border-exam-line py-3.5">
          <p className="adm-t-sm font-bold text-exam-text">
            {c.by} · {c.at}
            {c.kind === "reject" && c.code && (
              <span className="ml-2 text-rose-700">반려 — {rejectLabel(c.code)}</span>
            )}
            {c.kind === "approve" && <span className="ml-2 text-emerald-700">승인</span>}
            {c.kind === "note" && <span className="ml-2 text-exam-muted">코멘트</span>}
            {/* 기계가 한 말인지 사람이 한 말인지는 이름만으로는 헷갈린다 */}
            {c.role === "ai" && <span className="ml-2 text-violet-800">기계 검수</span>}
          </p>
          <p className="mt-1.5 whitespace-pre-line adm-t-md leading-relaxed text-exam-muted">
            {c.text}
          </p>
        </li>
      ))}
    </ul>
  );
}
