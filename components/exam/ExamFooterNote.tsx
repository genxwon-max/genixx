"use client";

import { usePathname } from "next/navigation";

/** 응시 화면에서는 페이지 스크롤이 생기지 않도록 하단 안내를 감춘다. */
export default function ExamFooterNote() {
  const pathname = usePathname();
  if (pathname.startsWith("/exam/session/")) return null;

  return (
    <footer className="border-t border-exam-line">
      <div className="container-x flex flex-col gap-1.5 py-5 text-[12px] leading-relaxed text-exam-muted">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-exam-muted/80">
          응시 규정
        </p>
        <p>
          응시 중 보호자는 문제 풀이에 개입할 수 없습니다. 화면 캡처와 문항 복제는 금지되며, 이상
          행동이 감지되면 응시가 중단될 수 있습니다. 이 화면은 검색엔진에 색인되지 않습니다.
        </p>
      </div>
    </footer>
  );
}
