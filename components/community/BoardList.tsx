"use client";

import Link from "next/link";
import PostTable from "./PostTable";
import { usePosts } from "@/lib/boardStore";
import { roleLabel } from "@/lib/authStore";

/** 자유게시판 목록 — 글쓰기 단추는 누구에게나 보이고, 막는 것은 글쓰기 화면이 한다 */
export default function BoardList() {
  const posts = usePosts();

  return (
    <PostTable
      withAuthor
      empty="아직 올라온 글이 없습니다. 첫 글을 남겨 주세요."
      actions={
        <Link
          href="/community/board/write"
          className="btn btn-sm bg-brand-900 text-white hover:bg-brand-800"
        >
          글쓰기
        </Link>
      }
      rows={posts.map((p) => ({
        key: p.id,
        href: `/community/board/${p.id}`,
        title: p.title,
        tag: p.role === "admin" ? { label: "안내", strong: true } : { label: roleLabel[p.role] },
        author: p.author,
        date: p.postedAt.slice(0, 10).replaceAll("-", "."),
        text: p.body,
      }))}
    />
  );
}
