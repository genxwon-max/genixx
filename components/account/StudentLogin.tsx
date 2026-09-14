"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { signIn } from "@/lib/authStore";
import {
  addStudents,
  canSitStudent,
  findByCode,
  formatCode,
  grantGuardianConsent,
  requestGuardianConsent,
  useRoster,
  type Student,
} from "@/lib/roster";
import { guardianConsentInfo } from "@/lib/account";
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
  /** 코드는 맞았지만 보호자 동의가 아직 끝나지 않은 학생 */
  const [held, setHeld] = useState<Student | null>(null);
  const [asked, setAsked] = useState(false);
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

  /**
   * 코드와 생년월일이 맞으면 응시 화면으로 보낸다.
   *
   * 다만 코드가 맞다고 곧바로 시험이 열리지는 않는다. **보호자 동의 상태를 먼저
   * 확인한다.** 기관이 임시등록만 해 둔 학생, 동의 요청을 보내 놓고 답을 기다리는
   * 학생은 아직 응시할 수 없다. 그럴 때는 문을 닫는 대신 지금 어디쯤 와 있는지와
   * 다음에 무엇을 하면 되는지를 보여 준다.
   *
   * 예전에는 여기서 「학생 본인입니까, 학부모입니까」를 한 번 더 물었다. 그 물음은
   * 이제 뜻이 없다 — 보호자 설문은 보호자 대시보드로 옮겼고, 이 입구로 들어오는
   * 사람은 시험을 보러 온 학생뿐이다.
   */
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
    if (!canSitStudent(found)) {
      setHeld(found);
      setAsked(false);
      setError(null);
      return;
    }
    signIn({
      role: "student",
      name: found.name,
      provider: "접속코드",
      studentId: found.id,
      asGuardian: false,
    });
    router.push("/exam");
  };

  /**
   * 명부가 비어 있을 때 시연용 학생을 만든다.
   *
   * 두 명을 만든다 — 보호자 동의가 끝난 학생과 아직 대기 중인 학생. 코드가 맞아도
   * 동의 상태에 따라 갈린다는 것이 이 화면의 핵심이라, 두 갈래를 다 눌러 볼 수 있게
   * 둔다. 코드 칸은 바로 응시할 수 있는 쪽으로 채운다.
   */
  const makeDemo = () => {
    const created = addStudents(
      [
        {
          name: "김하늘",
          birth: "20160312",
          school: "목동초등학교",
          grade: "초등 4학년",
          klass: "A반",
          guardianName: "김보호",
          guardianPhone: "01012345678",
        },
        {
          name: "박서준",
          birth: "20160925",
          school: "목동초등학교",
          grade: "초등 4학년",
          klass: "A반",
          guardianName: "박보호",
          guardianPhone: "01098761234",
        },
      ],
      "director",
      "제닉스 영재교육원",
    );
    // 첫째는 보호자 동의가 끝난 상태, 둘째는 동의 요청을 보내 놓고 기다리는 상태
    grantGuardianConsent(created[0].id, "휴대전화 본인인증");
    requestGuardianConsent(created[1].id);
    setDigits(created[0].code.split(""));
    setBirth(created[0].birth);
    setError(null);
  };

  if (held) {
    const info = guardianConsentInfo[held.consent];
    return (
      <div className="mx-auto w-full max-w-lg">
        <div className={`p-7 md:p-10 ${panel}`}>
          <p className={eyebrow}>보호자 동의 확인</p>
          <h1 className="mt-3 text-[22px] font-black tracking-tight text-exam-text">
            아직 응시를 시작할 수 없어요
          </h1>
          <p className="mt-3 text-[14px] leading-relaxed text-exam-muted">
            접속코드는 맞습니다. 다만 만 14세 미만 학생은 법정대리인의 동의가 확인되어야 응시할
            수 있어요. 지금 상태는 <b className="text-exam-text">{info.label}</b>입니다.
          </p>
          <p className="mt-2 text-[13px] leading-relaxed text-exam-muted">{info.meaning}</p>

          {held.guardianName && (
            <p className="mt-4 rounded-md bg-exam-raised px-4 py-3 text-[13px] text-exam-muted">
              동의를 요청드린 분 — <b className="text-exam-text">{held.guardianName}</b> 님
            </p>
          )}

          <div className="mt-6 flex flex-col gap-2.5">
            {(held.consent === "temp" || held.consent === "expired") && (
              <button
                type="button"
                onClick={() => {
                  requestGuardianConsent(held.id);
                  setAsked(true);
                }}
                className={btnPrimary}
              >
                {asked ? "요청을 보냈어요" : "보호자에게 동의 요청 보내기"}
              </button>
            )}
            {held.consent === "waiting" && (
              <p className="rounded-md bg-exam-raised px-4 py-3 text-[13px] leading-relaxed text-exam-muted">
                보호자께 보낸 동의 링크의 답을 기다리고 있어요. 동의가 확인되면 같은 코드로 바로
                들어올 수 있어요.
              </p>
            )}
            {(held.consent === "declined" || held.consent === "revoked") && (
              <p className="rounded-md bg-exam-raised px-4 py-3 text-[13px] leading-relaxed text-exam-muted">
                보호자께서 동의하지 않으셨거나 동의를 철회하셨어요. 등록해 주신 기관·보호자께
                문의해 주세요.
              </p>
            )}
            <button
              type="button"
              onClick={() => {
                setHeld(null);
                setDigits(Array(8).fill(""));
                setBirth("");
              }}
              className={btnGhost}
            >
              다른 코드로 다시 시도
            </button>
          </div>

          <p className="mt-5 text-[12px] leading-relaxed text-exam-muted">
            기관은 동의 요청을 보내 드릴 수는 있지만, 보호자를 대신해 동의할 수는 없어요.
            법정대리인 본인이 확인하셔야 합니다.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-lg">
      <div className={`p-7 text-center md:p-10 ${panel}`}>
        <p className={eyebrow}>학생 응시 로그인</p>
        <h1 className="mt-3 text-[24px] font-black tracking-tight text-exam-text">
          접속코드를 입력해 주세요
        </h1>
        <p className="mt-3 text-[14px] leading-relaxed text-exam-muted">
          기관 또는 보호자에게 받은 <b className="text-exam-text">8자리 코드</b>와 생년월일을
          입력하면 들어갈 수 있습니다. 만 14세 미만이면 보호자 동의가 확인된 뒤에 열려요.
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
                        <span className="ml-2 tracking-normal">
                          {guardianConsentInfo[s.consent].label}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
            </ul>
          </>
        ) : (
          <>
            <p className="mt-2 text-[12px] leading-relaxed text-exam-muted">
              아직 발급된 코드가 없습니다. 기관·보호자 계정에서 학생을 등록하면 코드가 발급되고,
              만 14세 미만이면 보호자 동의가 확인된 뒤에 응시가 열립니다.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={makeDemo} className={btnPrimary}>
                시연용 학생 2명 만들기 (동의 완료·대기)
              </button>
              <Link href="/login" className={btnGhost}>
                기관 담당자로 로그인
              </Link>
            </div>
          </>
        )}
      </div>

      <p className="mt-4 text-center text-[13px] text-exam-muted">
        학생 계정으로 가입하셨거나 보호자·기관이신가요?{" "}
        <Link href="/login" className="font-bold text-brand-700 hover:underline">
          일반 로그인
        </Link>
      </p>
    </div>
  );
}
