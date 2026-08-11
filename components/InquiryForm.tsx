"use client";

import { useState, type FormEvent } from "react";
import { CheckIcon } from "./Icons";

type Props = {
  categories: string[];
  orgLabel?: string;
  submitLabel?: string;
};

type Errors = Record<string, string>;

const inputClass =
  "mt-2 w-full rounded-xl border border-brand-200 px-4 py-3 text-[15px] outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

export default function InquiryForm({
  categories,
  orgLabel = "소속 (학교 / 기관명)",
  submitLabel = "문의 접수하기",
}: Props) {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    org: "",
    category: categories[0],
    message: "",
    agree: false,
  });
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [ticket, setTicket] = useState("");

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => {
      if (!e[key as string]) return e;
      const next = { ...e };
      delete next[key as string];
      return next;
    });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("sending");
    try {
      const res = await fetch("/api/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setErrors(data.errors ?? { message: data.message ?? "접수에 실패했습니다." });
        setStatus("idle");
        return;
      }
      setTicket(data.ticket);
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <div className="rounded-3xl border border-brand-100 bg-white p-8 text-center shadow-card md:p-12">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-surface-mint text-emerald-600">
          <CheckIcon className="h-8 w-8" strokeWidth={2.4} />
        </span>
        <h3 className="mt-6 text-xl font-black text-brand-950">문의가 접수되었습니다</h3>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          접수번호 <b className="text-brand-800">{ticket}</b>
          <br />
          담당자가 확인 후 영업일 기준 1~2일 내에 연락드리겠습니다.
        </p>
        <button
          type="button"
          onClick={() => {
            setForm({
              name: "",
              phone: "",
              email: "",
              org: "",
              category: categories[0],
              message: "",
              agree: false,
            });
            setStatus("idle");
          }}
          className="mt-7 rounded-full border border-brand-200 px-6 py-3 text-sm font-bold text-brand-800 transition-colors hover:border-brand-400"
        >
          새 문의 작성하기
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="rounded-3xl border border-brand-100 bg-white p-6 shadow-card md:p-9"
    >
      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label htmlFor="name" className="text-sm font-bold text-slate-800">
            이름 <span className="text-rose-500">*</span>
          </label>
          <input
            id="name"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="홍길동"
            className={inputClass}
          />
          {errors.name && <p className="mt-1.5 text-xs font-medium text-rose-600">{errors.name}</p>}
        </div>

        <div>
          <label htmlFor="phone" className="text-sm font-bold text-slate-800">
            연락처 <span className="text-rose-500">*</span>
          </label>
          <input
            id="phone"
            inputMode="tel"
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
            placeholder="010-1234-5678"
            className={inputClass}
          />
          {errors.phone && (
            <p className="mt-1.5 text-xs font-medium text-rose-600">{errors.phone}</p>
          )}
        </div>

        <div>
          <label htmlFor="email" className="text-sm font-bold text-slate-800">
            이메일
          </label>
          <input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder="you@example.com"
            className={inputClass}
          />
          {errors.email && (
            <p className="mt-1.5 text-xs font-medium text-rose-600">{errors.email}</p>
          )}
        </div>

        <div>
          <label htmlFor="org" className="text-sm font-bold text-slate-800">
            {orgLabel}
          </label>
          <input
            id="org"
            value={form.org}
            onChange={(e) => set("org", e.target.value)}
            placeholder="예) 제닉스초등학교"
            className={inputClass}
          />
        </div>

        <div className="md:col-span-2">
          <label htmlFor="category" className="text-sm font-bold text-slate-800">
            문의 유형
          </label>
          <select
            id="category"
            value={form.category}
            onChange={(e) => set("category", e.target.value)}
            className={inputClass}
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2">
          <label htmlFor="message" className="text-sm font-bold text-slate-800">
            문의 내용 <span className="text-rose-500">*</span>
          </label>
          <textarea
            id="message"
            rows={6}
            value={form.message}
            onChange={(e) => set("message", e.target.value)}
            placeholder="도입 규모, 희망 일정 등 구체적으로 남겨주시면 더 빠르게 안내드릴 수 있습니다."
            className={`${inputClass} resize-y`}
          />
          {errors.message && (
            <p className="mt-1.5 text-xs font-medium text-rose-600">{errors.message}</p>
          )}
        </div>
      </div>

      <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-xl bg-brand-50/70 p-4">
        <input
          type="checkbox"
          checked={form.agree}
          onChange={(e) => set("agree", e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-[#313c96]"
        />
        <span className="text-[13px] leading-relaxed text-slate-600">
          <b className="text-slate-800">개인정보 수집 및 이용에 동의합니다.</b>
          <br />
          수집 항목: 이름, 연락처, 이메일, 소속 · 이용 목적: 문의 응대 · 보유 기간: 문의 처리 후
          3개월
        </span>
      </label>
      {errors.agree && <p className="mt-2 text-xs font-medium text-rose-600">{errors.agree}</p>}

      {status === "error" && (
        <p className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
          일시적인 오류로 접수하지 못했습니다. 잠시 후 다시 시도해주세요.
        </p>
      )}

      <button
        type="submit"
        disabled={status === "sending"}
        className="mt-6 w-full rounded-full bg-brand-900 px-6 py-4 text-[15px] font-bold text-white transition-colors hover:bg-brand-800 disabled:bg-slate-300"
      >
        {status === "sending" ? "접수 중…" : submitLabel}
      </button>
    </form>
  );
}
