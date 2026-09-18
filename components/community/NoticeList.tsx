"use client";

import PostTable from "./PostTable";
import { shownNotices, useContent } from "@/lib/contentStore";

/**
 * 공지 목록 — 콘솔의 「공지」(ADM-15)가 고치는 글을 그대로 읽는다(lib/contentStore.ts).
 * 내려 둔 공지는 빠지고, 고정한 공지가 「중요」 알약을 달고 맨 위에 선다.
 */
export default function NoticeList() {
  const notices = shownNotices(useContent());

  return (
    <PostTable
      empty="올라온 공지가 없습니다."
      rows={notices.map((n) => ({
        key: n.id,
        href: `/community/notice/${n.id}`,
        title: n.title,
        tag: n.pinned ? { label: "중요", strong: true } : { label: "공지" },
        date: n.postedOn.replaceAll("-", "."),
        text: n.body.body,
      }))}
    />
  );
}
