"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { signIn } from "@/lib/authStore";
import { addStudents, findByCode, formatCode, useRoster, type Student } from "@/lib/roster";
import { useHydrated } from "@/lib/examStore";
import { ArrowRight } from "@/components/Icons";
import {
  btnDisabled,
  btnGhost,
  btnPrimary,
  eyebrow,
  fieldLabel,
  input,
  panel,
} from "@/components/exam/ui";

export default function StudentLogin() {
  const router = useRouter();
  const hydrated = useHydrated();
  const roster = useRoster();
  const [digits, setDigits] = useState<string[]>(Array(8).fill(""));
  const [birth, setBirth] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [matched, setMatched] = useState<Student | null>(null);
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
    setMatched(found);
  };

  const enter = (asGuardian: boolean) => {
    if (!matched) return;
    signIn({
      role: "student",
      name: matched.name,
      provider: "접속코드",
      studentId: matched.id,
      asGuardian,
    });
    router.push("/exam");
  };

  /** 명부가 비어 있을 때 시연용 학생 한 명을 즉시 만든다 */
  const makeDemo = () => {
    const [created] = addStudents(
      [{ name: "김하늘", birth: "20160312", grade: "초등 4학년", klass: "A반" }],
      "director",
      "제닉스 영재교육원",
    );
    setDigits(created.code.split(""));
    setBirth(created.birth);
    setError(null);
  };

  if (matched) {
    return (
      <div className="mx-auto w-full max-w-lg">
        <div className={`p-7 text-center md:p-10 ${panel}`}>
          <p className={eyebrow}>본인 확인</p>
          <h1 className="mt-3 text-[22px] font-black tracking-tight text-exam-text">
            {matched.name} 학생으로 확인되었습니다
          </h1>
          <p className="mt-3 text-[14px] leading-relaxed text-exam-muted">
            지금 접속하신 분은 누구신가요? 선택에 따라 들어갈 수 있는 화면이 달라집니다.
          </p>

          <div className="mt-7 grid gap-2.5">
            <button
              type="button"
              onClick={() => enter(false)}
              className="flex items-center gap-4 rounded-md border border-exam-line bg-exam-panel px-5 py-4 text-left transition-colors hover:border-brand-500 hover:bg-brand-50"
            >
              <span className="flex-1">
                <span className="block text-[16px] font-black text-exam-text">학생 본인입니다</span>
                <span className="mt-1 block text-[12px] text-exam-muted">
                  국어·수학·과학 평가에 응시합니다.
                </span>
              </span>
              <ArrowRight className="h-5 w-5 shrink-0 text-exam-muted" />
            </button>

            <button
              type="button"
              onClick={() => enter(true)}
              className="flex items-center gap-4 rounded-md border border-exam-line bg-exam-panel px-5 py-4 text-left transition-colors hover:border-brand-500 hover:bg-brand-50"
            >
              <span className="flex-1">
                <span className="block text-[16px] font-black text-exam-text">학부모입니다</span>
                <span className="mt-1 block text-[12px] text-exam-muted">
                  자녀의 답안은 볼 수 없고, 학부모 설문만 진행합니다.
                </span>
              </span>
              <ArrowRight className="h-5 w-5 shrink-0 text-exam-muted" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setMatched(null)}
            className="mt-5 text-[13px] text-exam-muted hover:text-exam-text"
          >
            다른 코드로 다시 입력
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-lg">
      <div className={`p-7 text-center md:p-10 ${panel}`}>
        <p className={eyebrow}>ACC-02-1 · 학생 응시 로그인</p>
        <h1 className="mt-3 text-[24px] font-black tracking-tight text-exam-text">
          접속코드를 입력해 주세요
        </h1>
        <p className="mt-3 text-[14px] leading-relaxed text-exam-muted">
          학원 또는 보호자에게 받은 <b className="text-exam-text">8자리 코드</b>와 생년월일을
          입력하면 들어갈 수 있습니다.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-1.5">
          {digits.map((d, i) => (
            <span key={i} className="flex items-center gap-1.5">
              <input
                ref={(el) => {
                  refs.current[i] = el;
                }}
                inputMode="text"
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
                  }
                }}
                className="h-13 w-10 rounded-md border border-exam-line bg-exam-panel text-center text-xl font-black uppercase text-exam-text outline-none transition-colors focus:border-brand-500 sm:h-14 sm:w-11"
              />
              {i === 3 && <span className="text-exam-muted">-</span>}
            </span>
          ))}
        </div>

        <div className="mx-auto mt-6 max-w-xs text-left">
          <label htmlFor="birth" className={fieldLabel}>
            생년월일 8자리
          </label>
          <input
            id="birth"
            inputMode="numeric"
            value={birth}
            maxLength={8}
            onChange={(e) => {
              setBirth(e.target.value.replace(/\D/g, ""));
              setError(null);
            }}
            placeholder="20160312"
            className={`mt-2 text-center tracking-[0.2em] tabular-nums ${input}`}
          />
        </div>

        {error && (
          <p role="alert" className="mt-4 text-[13px] font-medium text-rose-600">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={check}
          className={`mt-7 w-full py-4 text-[16px] ${ready ? btnPrimary : btnDisabled}`}
        >
          확인
          {ready && <ArrowRight className="h-5 w-5" />}
        </button>

        <p className="mt-5 text-[13px] leading-relaxed text-exam-muted">
          여기서는 내 시험만 볼 수 있어요. 결제 정보나 형제자매의 결과는 보이지 않아요.
        </p>
      </div>

      {/* 시연 보조 */}
      <div className={`mt-3 p-5 ${panel}`}>
        <p className="text-[13px] font-bold text-exam-text">시연용 안내</p>
        {hydrated && roster.length > 0 ? (
          <>
            <p className="mt-2 text-[12px] leading-relaxed text-exam-muted">
              현재 발급된 코드 {roster.length}건 중 최근 3건입니다. 눌러서 바로 채울 수 있습니다.
            </p>
            <ul className="mt-3 space-y-1.5">
              {roster
                .slice(-3)
                .reverse()
                .map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setDigits(s.code.split(""));
                        setBirth(s.birth);
                        setError(null);
                      }}
                      className="flex w-full items-center justify-between gap-3 rounded border border-exam-line px-3.5 py-2.5 text-left transition-colors hover:bg-exam-raised"
                    >
                      <span className="text-[13px] font-bold text-exam-text">{s.name}</span>
                      <span className="text-[12px] tabular-nums text-exam-muted">
                        {formatCode(s.code)} · {s.birth}
                      </span>
                    </button>
                  </li>
                ))}
            </ul>
          </>
        ) : (
          <>
            <p className="mt-2 text-[12px] leading-relaxed text-exam-muted">
              아직 발급된 코드가 없습니다. 학원장·학부모 계정에서 학생을 등록하면 코드가 발급됩니다.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={makeDemo} className={btnPrimary}>
                시연용 학생 1명 만들기
              </button>
              <Link href="/login" className={btnGhost}>
                학원장으로 로그인
              </Link>
            </div>
          </>
        )}
      </div>

      <p className="mt-4 text-center text-[13px] text-exam-muted">
        보호자·학원장이신가요?{" "}
        <Link href="/login" className="font-bold text-brand-700 hover:underline">
          일반 로그인
        </Link>
      </p>
    </div>
  );
}
