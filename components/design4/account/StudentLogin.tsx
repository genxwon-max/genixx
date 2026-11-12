"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { signIn } from "@/lib/authStore";
import { findByCode } from "@/lib/roster";
import AuthCard from "./AuthCard";

/**
 * /design4 학생 응시 로그인 — 계정 존 StudentLogin과 같은 일을 한다(접속코드 8자리 + 생년월일 →
 * 학생 대시보드). 2026-11-12 요청으로 「시연용 안내」(최근 발급 코드 · 시연용 학생 만들기)를 걷고
 * design4 모양으로 다시 짰다.
 *
 *   왼쪽  옅은 파랑 판 — 무엇을 하면 들어가는지 세 줄
 *   오른쪽 흰 판 — 코드 여덟 칸 · 생년월일 · 들어가기
 *
 * 판 모양은 회원 로그인과 함께 쓴다(AuthCard).
 */
const steps = [
  { t: "접속코드 확인", d: "기관이나 보호자에게 받은 8자리 코드를 준비합니다." },
  { t: "코드와 생년월일 입력", d: "코드 여덟 칸과 생년월일 8자리를 적습니다." },
  { t: "내 진단에서 응시 시작", d: "들어가면 지금 볼 수 있는 진단이 먼저 보입니다." },
];

export default function StudentLogin() {
  const router = useRouter();
  const [digits, setDigits] = useState<string[]>(Array(8).fill(""));
  const [birth, setBirth] = useState("");
  const [error, setError] = useState<string | null>(null);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const code = digits.join("");
  const ready = code.length === 8 && birth.length === 8;

  const setDigit = (i: number, v: string) => {
    const only = v
      .toUpperCase()
      .replace(/[^0-9A-Z]/g, "")
      .slice(-1);
    setDigits((d) => {
      const next = [...d];
      next[i] = only;
      return next;
    });
    setError(null);
    if (only && i < 7) refs.current[i + 1]?.focus();
  };

  /** 코드와 생년월일이 맞으면 학생 대시보드로. 동의는 코드를 만들 때 받으므로 여기서 다시 묻지 않는다 */
  const check = () => {
    if (!ready) {
      setError("접속코드 8자리와 생년월일 8자리를 모두 입력해 주세요.");
      return;
    }
    const found = findByCode(code, birth);
    if (!found) {
      setError("일치하는 접속코드가 없습니다. 코드와 생년월일을 다시 확인해 주세요.");
      return;
    }
    signIn({
      role: "student",
      name: found.name,
      provider: "접속코드",
      studentId: found.id,
      asGuardian: false,
    });
    router.push("/student");
  };

  const box =
    "h-12 w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 text-center text-[20px] font-bold uppercase text-slate-900 outline-none transition-colors focus:border-[var(--d4-blue)] focus:bg-white sm:h-14";

  return (
    <AuthCard
      tag="학생 전용"
      title={
        <>
          접속코드로
          <br />
          진단을 시작해요
        </>
      }
      lead="학생은 따로 가입하지 않아도 됩니다. 받은 코드와 생년월일만 있으면 들어갈 수 있어요."
      steps={steps}
      note="코드를 잃어버렸다면 코드를 받은 기관이나 보호자에게 다시 알려 달라고 하세요."
    >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            check();
          }}
        >
          <h2 className="text-[20px] font-bold tracking-[-0.03em] text-slate-900">학생 응시 로그인</h2>

          <fieldset className="mt-7">
            <legend className="text-[14px] font-bold text-slate-800">접속코드 8자리</legend>
            <div className="mt-2.5 grid grid-cols-[repeat(4,minmax(0,1fr))_auto_repeat(4,minmax(0,1fr))] items-center gap-1.5 sm:gap-2">
              {digits.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    refs.current[i] = el;
                  }}
                  inputMode="text"
                  autoComplete="off"
                  maxLength={1}
                  value={d}
                  aria-label={`접속코드 ${i + 1}번째 자리`}
                  onChange={(e) => setDigit(i, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Backspace" && !digits[i] && i > 0) refs.current[i - 1]?.focus();
                  }}
                  onPaste={(e) => {
                    const t = e.clipboardData
                      .getData("text")
                      .toUpperCase()
                      .replace(/[^0-9A-Z]/g, "")
                      .slice(0, 8);
                    if (t.length > 1) {
                      e.preventDefault();
                      setDigits(Array.from({ length: 8 }, (_, k) => t[k] ?? ""));
                      setError(null);
                    }
                  }}
                  className={box}
                  style={{ gridColumn: i < 4 ? i + 1 : i + 2 }}
                />
              ))}
              <span aria-hidden className="col-start-5 row-start-1 px-0.5 text-slate-300">
                –
              </span>
            </div>
          </fieldset>

          <div className="mt-6">
            <label htmlFor="d4-birth" className="text-[14px] font-bold text-slate-800">
              생년월일 8자리
            </label>
            <input
              id="d4-birth"
              inputMode="numeric"
              autoComplete="off"
              value={birth}
              maxLength={8}
              onChange={(e) => {
                setBirth(e.target.value.replace(/\D/g, ""));
                setError(null);
              }}
              placeholder="20160312"
              className="mt-2.5 h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-center text-[17px] tabular-nums tracking-[0.2em] text-slate-900 outline-none transition-colors placeholder:text-slate-300 focus:border-[var(--d4-blue)] focus:bg-white sm:h-14"
            />
            <p className="mt-2 text-[12.5px] text-slate-500">예) 2016년 3월 12일생 → 20160312</p>
          </div>

          {error && (
            <p role="alert" className="mt-5 rounded-xl bg-rose-50 px-4 py-3 text-[13.5px] font-medium text-rose-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            className={`mt-7 flex h-13 w-full items-center justify-center gap-2 rounded-xl text-[16px] font-bold transition-colors sm:h-14 ${
              ready ? "bg-[var(--d4-blue)] text-white hover:bg-[#1c45c4]" : "bg-slate-200 text-slate-500"
            }`}
          >
            진단 화면으로 들어가기
            {ready && <ArrowRight className="h-5 w-5" />}
          </button>

          <p className="mt-8 border-t border-slate-100 pt-5 text-center text-[13.5px] text-slate-500">
            학생 계정으로 가입했거나 보호자·기관이신가요?{" "}
            <Link href="/design4/login" className="font-bold text-[var(--d4-blue)] hover:underline">
              일반 로그인
            </Link>
          </p>
        </form>
    </AuthCard>
  );
}
