"use client";

import Faq, { type FaqItem } from "@/components/Faq";
import { Chapter } from "./Article";
import { renderDetail } from "@/lib/richText";
import { shownFaqGroups, useContent } from "@/lib/contentStore";

/**
 * 고객지원의 자주 묻는 질문 목록 (PUB-06-1).
 *
 * 질문과 답을 화면 파일에 박아 두었던 것을 콘솔이 고칠 수 있는 저장소로 옮겼다
 * (lib/contentStore.ts · ADM-15-1). 여기서는 그 값을 읽어 분류별로 편다.
 *
 * ⚠ 저장소가 브라우저에 있어 이 조각은 클라이언트에서 돈다. 서버가 그리는 첫 화면에는
 *   씨앗(= 옮겨 오기 전 글)이 그대로 나가므로, 콘솔에서 고치지 않은 방문자에게는 글이
 *   한 글자도 달라지지 않는다. 붙일 때는 서버가 콘텐츠 API를 읽어 그리도록 옮긴다.
 *
 * 답은 갈래를 가진 글이다(글·마크다운·HTML·그림). renderDetail이 소독까지 끝낸 HTML을
 * 내주고, 글 갈래는 서식이 없으므로 그대로 넘겨 원래대로 <p> 한 덩이로 그린다.
 */
export default function FaqGroups() {
  const content = useContent();
  const groups = shownFaqGroups(content);

  if (groups.length === 0) {
    return (
      <p className="type-body text-slate-500">
        아직 올라온 질문이 없습니다. 궁금한 것은 1:1 문의로 남겨 주세요.
      </p>
    );
  }

  /* 주제 하나가 한 구간 — 왼쪽에 주제 이름, 오른쪽에 질문 목록(상자 없이 줄만) */
  return (
    <div>
      {groups.map((g, i) => (
        <Chapter
          key={g.name}
          id={g.name}
          no={String(i + 1).padStart(2, "0")}
          title={g.name}
          lead={`질문 ${g.items.length}개`}
        >
          <Faq
            plain
            items={g.items.map((f): FaqItem => ({
              q: f.q,
              a: f.a.mode === "text" ? f.a.body : "",
              html: f.a.mode === "text" ? undefined : renderDetail(f.a.mode, f.a.body, f.a.images),
            }))}
          />
        </Chapter>
      ))}
    </div>
  );
}
