"use client";

import { useRouter } from "next/navigation";
import PostNav from "./PostNav";
import { canRemove, removePost, usePosts } from "@/lib/boardStore";
import { useSession } from "@/lib/authStore";

export default function BoardView({ id }: { id: string }) {
  const router = useRouter();
  const session = useSession();
  const posts = usePosts();
  const at = posts.findIndex((p) => p.id === id);
  const post = posts[at];

  if (!post) {
    return (
      <div className="text-center">
        <p className="type-h3 font-black text-brand-950">찾을 수 없는 글입니다</p>
        <p className="type-body mt-3 text-slate-600">지워졌거나 주소가 바뀌었을 수 있습니다.</p>
        <PostNav prev={null} next={null} listHref="/community/board" />
      </div>
    );
  }

  const link = (i: number) =>
    posts[i] ? { href: `/community/board/${posts[i].id}`, title: posts[i].title } : null;

  return (
    <article>
      <header className="border-b border-t-2 border-b-brand-100 border-t-brand-900 px-2 py-6">
        <h1 className="type-h3 font-black text-brand-950">{post.title}</h1>
        <div className="type-meta mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-500">
          <span className="font-bold text-slate-700">{post.author}</span>
          <span aria-hidden>·</span>
          <span>{post.postedAt.replaceAll("-", ".")}</span>
          {canRemove(post, session) && (
            <button
              type="button"
              onClick={() => {
                if (!window.confirm("이 글을 지울까요? 지운 글은 되돌릴 수 없습니다.")) return;
                removePost(post.id);
                router.push("/community/board");
              }}
              className="ml-auto font-bold text-rose-600 hover:underline"
            >
              삭제
            </button>
          )}
        </div>
      </header>
      {/* 서식 없는 글만 받으므로 HTML로 넣지 않는다 — 줄바꿈만 살린다 */}
      <div className="type-body whitespace-pre-wrap break-words px-2 py-10 text-slate-700">
        {post.body}
      </div>
      <PostNav prev={link(at - 1)} next={link(at + 1)} listHref="/community/board" />
    </article>
  );
}
