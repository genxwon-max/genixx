"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { addPost, cannotWrite, maskName } from "@/lib/boardStore";
import { useSession } from "@/lib/authStore";

const inputClass =
  "mt-2 w-full rounded-xl border border-brand-200 px-4 py-3 text-[15px] outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

const TITLE_MAX = 80;
const BODY_MAX = 3000;

export default function BoardWrite() {
  const router = useRouter();
  const session = useSession();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!session || cannotWrite.includes(session.role)) {
    return (
      <div className="rounded-xl border border-brand-100 bg-white p-8 text-center md:p-12">
        <p className="type-h3 font-black text-brand-950">
          {session ? "학생 계정은 글을 쓸 수 없습니다" : "로그인하면 글을 쓸 수 있습니다"}
        </p>
        <p className="type-body mt-3 text-slate-600">
          자유게시판은 보호자·기관 회원이 쓰는 자리입니다. 글은 누구나 읽을 수 있습니다.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          {!session && (
            <Link href="/login" className="btn btn-md bg-brand-900 text-white hover:bg-brand-800">
              로그인
            </Link>
          )}
          <Link
            href="/community/board"
            className="btn btn-md border border-brand-200 bg-white text-brand-800 hover:border-brand-400"
          >
            목록으로
          </Link>
        </div>
      </div>
    );
  }

  const author = session.role === "director" && session.org ? session.org : maskName(session.name);

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return setError("제목을 적어 주세요.");
        if (!body.trim()) return setError("내용을 적어 주세요.");
        const id = addPost(session, title, body);
        router.push(`/community/board/${id}`);
      }}
      className="rounded-xl border border-brand-100 bg-white p-6 md:p-8"
    >
      <p className="type-meta rounded-xl bg-brand-50/70 px-4 py-3 text-slate-600">
        <b className="text-brand-800">{author}</b> 이름으로 올라갑니다. 아이의
        실명·학교·사진·연락처는 적지 말아 주세요.
      </p>

      <div className="mt-6">
        <label htmlFor="post-title" className="text-sm font-bold text-slate-800">
          제목 <span className="text-rose-500">*</span>
        </label>
        <input
          id="post-title"
          value={title}
          maxLength={TITLE_MAX}
          onChange={(e) => {
            setTitle(e.target.value);
            setError(null);
          }}
          className={inputClass}
        />
      </div>

      <div className="mt-5">
        <label htmlFor="post-body" className="text-sm font-bold text-slate-800">
          내용 <span className="text-rose-500">*</span>
        </label>
        <textarea
          id="post-body"
          value={body}
          rows={12}
          maxLength={BODY_MAX}
          onChange={(e) => {
            setBody(e.target.value);
            setError(null);
          }}
          className={`${inputClass} resize-y leading-relaxed`}
        />
        <p className="mt-1.5 text-right text-xs text-slate-400">
          {body.length.toLocaleString()} / {BODY_MAX.toLocaleString()}자
        </p>
      </div>

      {error && (
        <p role="alert" className="mt-3 text-sm font-medium text-rose-600">
          {error}
        </p>
      )}

      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <Link
          href="/community/board"
          className="btn btn-md border border-brand-200 bg-white text-brand-800 hover:border-brand-400"
        >
          취소
        </Link>
        <button type="submit" className="btn btn-md bg-brand-900 text-white hover:bg-brand-800">
          올리기
        </button>
      </div>
    </form>
  );
}
