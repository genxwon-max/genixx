"use client";

import Faq, { type FaqItem } from "@/components/Faq";
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
      <p className="type-body rounded-2xl border border-brand-100 bg-white px-6 py-8 text-center text-slate-500">
        아직 올라온 질문이 없습니다. 궁금한 것은 1:1 문의로 남겨 주세요.
      </p>
    );
  }

  /* 넓은 화면에서는 주제를 두 칸으로 편다. items-start — 한쪽 답을 열어도 옆 칸이 같이
     늘어나지 않는다. 칸(columns)으로 흘리지 않는 까닭도 같다: 답을 열 때마다 질문이
     옆 칸으로 넘어가 버린다 */
  return (
    <div className="grid items-start gap-x-8 gap-y-10 lg:grid-cols-2">
      {groups.map((g) => (
        <div key={g.name} id={g.name} className="scroll-mt-24">
          <h2 className="type-h3 font-black text-brand-950">{g.name}</h2>
          <div className="mt-4">
            <Faq
              items={g.items.map((f): FaqItem => ({
                q: f.q,
                a: f.a.mode === "text" ? f.a.body : "",
                html: f.a.mode === "text" ? undefined : renderDetail(f.a.mode, f.a.body, f.a.images),
              }))}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
