"use client";

import PostNav from "./PostNav";
import { renderDetail } from "@/lib/richText";
import { shownNotices, useContent } from "@/lib/contentStore";

/** 공지 한 편 — 이전·다음은 목록과 같은 차례(고정 먼저, 늦은 날짜 먼저)를 따른다 */
export default function NoticeView({ id }: { id: string }) {
  const notices = shownNotices(useContent());
  const at = notices.findIndex((n) => n.id === id);
  const notice = notices[at];

  if (!notice) {
    return (
      <div className="text-center">
        <p className="type-h3 font-black text-brand-950">찾을 수 없는 공지입니다</p>
        <p className="type-body mt-3 text-slate-600">내려졌거나 주소가 바뀌었을 수 있습니다.</p>
        <PostNav prev={null} next={null} listHref="/community/notice" />
      </div>
    );
  }

  const link = (i: number) =>
    notices[i] ? { href: `/community/notice/${notices[i].id}`, title: notices[i].title } : null;

  return (
    <article>
      <header className="border-b border-brand-100 border-t-2 border-t-brand-900 px-2 py-6">
        <p className="type-caption font-bold text-brand-600">{notice.pinned ? "중요 공지" : "공지"}</p>
        <h1 className="type-h3 mt-2 font-black text-brand-950">{notice.title}</h1>
        <p className="type-meta mt-3 text-slate-500">{notice.postedOn.replaceAll("-", ".")}</p>
      </header>
      <div
        className="type-body prose-faq px-2 py-10 text-slate-700"
        dangerouslySetInnerHTML={{
          __html: renderDetail(notice.body.mode, notice.body.body, notice.body.images),
        }}
      />
      {/* 목록 위쪽이 「다음 글」이 아니라 「이전 글」이다 — 목록에서 한 칸 위(더 새 글)가 이전 */}
      <PostNav prev={link(at - 1)} next={link(at + 1)} listHref="/community/notice" />
    </article>
  );
}
