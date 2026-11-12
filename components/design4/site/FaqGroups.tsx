"use client";

import Faq, { type FaqItem } from "@/components/Faq";
import { Chapter } from "./Article";
import { renderDetail } from "@/lib/richText";
import { shownFaqGroups, useContent } from "@/lib/contentStore";

/**
 * /design4 자주 묻는 질문 — 공개 사이트 FaqGroups와 같은 저장소를 읽고, 주제마다 구간 하나.
 * 질문 목록은 둥근 테두리 상자 안에 둔다.
 */
export default function FaqGroups() {
  const content = useContent();
  const groups = shownFaqGroups(content);

  if (groups.length === 0) {
    return <p className="text-[15px] text-slate-500">아직 올라온 질문이 없습니다. 궁금한 것은 1:1 문의로 남겨 주세요.</p>;
  }

  return (
    <div>
      {groups.map((g) => (
        <Chapter key={g.name} id={g.name} title={g.name} lead={`질문 ${g.items.length}개`}>
          <div className="rounded-2xl border border-slate-200 bg-white px-5 md:px-6">
            <Faq
              plain
              items={g.items.map((f): FaqItem => ({
                q: f.q,
                a: f.a.mode === "text" ? f.a.body : "",
                html: f.a.mode === "text" ? undefined : renderDetail(f.a.mode, f.a.body, f.a.images),
              }))}
            />
          </div>
        </Chapter>
      ))}
    </div>
  );
}
