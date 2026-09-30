"use client";

import { useEffect, useState } from "react";
import { pad } from "@/lib/calendar";
import type { GuardianCheck } from "@/lib/orderStore";
import type { Student } from "@/lib/roster";
import { themeOf, type Variant } from "@/lib/authVariant";
import SectionTitle from "@/components/exam/SectionTitle";
import { CheckIcon } from "@/components/Icons";
import { card, field } from "./ui";

/**
 * 보호자 휴대전화 인증 — 만 14세 이상 19세 미만 학생이 스스로 결제할 때 결제 앞에 선다
 * (/student/payments · /student/interviews/pay).
 *
 * ── 왜 체크상자가 아니라 인증인가 ──
 * 예전에는 학생이 「보호자에게 알리고 동의를 받았습니다」에 스스로 체크했다. 그 칸은 학생이
 * 혼자 누를 수 있어서 보호자가 알았다는 근거가 되지 못한다. 개인정보 동의는 만 14세부터 본인이
 * 하지만 돈이 드는 계약은 만 19세 미만이면 법정대리인이 취소할 수 있다(민법 제5조). 보호자
 * 휴대전화로 인증번호를 보내고 그 번호가 들어와야 결제가 열리게 해, 보호자가 곁에서 확인했다는
 * 사실을 주문에 남긴다(lib/orderStore.ts의 GuardianCheck).
 *
 * ── 어느 번호로 보내나 ──
 * 보호자가 학생을 등록할 때 적은 연락처가 있으면 **그 번호로만** 보낸다. 학생이 번호를 고쳐 쓸
 * 수 있으면 자기 다른 번호로 받아 넣을 수 있기 때문이다. 스스로 가입해 보호자 연락처가 없는
 * 학생만 보호자 이름과 번호를 적고, 이때도 학생 본인 번호는 받지 않는다.
 *
 * ⚠ 시연 화면이라 문자는 나가지 않는다. 보낸 인증번호를 화면에 적어 두고, 붙일 때는 이 자리에서
 *   문자 발송 API(또는 휴대폰 본인확인 서비스)를 부른다.
 */

/** 인증번호가 살아 있는 시간(초) */
const CODE_TTL = 180;
/** 틀려도 되는 횟수 — 넘기면 번호를 새로 받아야 한다 */
const MAX_TRIES = 5;

const digitsOf = (v?: string) => (v ?? "").replace(/\D/g, "");
const phoneOk = (d: string) => /^01[016789]\d{7,8}$/.test(d);
/** 「01012345678」 → 「010-****-5678」 */
const masked = (d: string) => (d.length >= 10 ? `${d.slice(0, 3)}-****-${d.slice(-4)}` : d);

function stamp() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function GuardianPhoneCheck({
  student,
  value,
  onChange,
  variant = 2,
}: {
  /** 결제하는 학생 본인 — 등록된 보호자 연락처를 여기서 읽는다 */
  student: Student;
  /** 끝난 확인. 없으면 아직이다 */
  value: GuardianCheck | null;
  onChange: (v: GuardianCheck | null) => void;
  variant?: Variant;
}) {
  const t = themeOf(variant);
  const registered = phoneOk(digitsOf(student.guardianPhone));
  const [name, setName] = useState(student.guardianName ?? "");
  const [phone, setPhone] = useState(registered ? digitsOf(student.guardianPhone) : "");
  const [sent, setSent] = useState<{ code: string; to: string; at: number } | null>(null);
  const [code, setCode] = useState("");
  const [tries, setTries] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(0);

  /* 남은 시간을 1초마다 다시 센다 — 번호를 보낸 뒤, 확인이 끝나기 전까지만 */
  useEffect(() => {
    if (!sent || value) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [sent, value]);

  const left = sent ? Math.max(0, CODE_TTL - Math.floor((now - sent.at) / 1000)) : 0;
  const to = digitsOf(phone);
  const self = digitsOf(student.phone);
  const canSend = name.trim().length >= 2 && phoneOk(to);

  function send() {
    if (!canSend) return;
    if (self && to === self) {
      setError("학생 본인 번호로는 보호자 확인을 받을 수 없습니다. 보호자 번호를 적어 주세요.");
      return;
    }
    const at = Date.now();
    setSent({ code: String(Math.floor(100000 + Math.random() * 900000)), to, at });
    setNow(at);
    setCode("");
    setTries(0);
    setError(null);
  }

  function confirm() {
    if (!sent) return;
    if (left === 0) {
      setError("인증 시간이 지났습니다. 인증번호를 다시 받아 주세요.");
      return;
    }
    if (code !== sent.code) {
      const n = tries + 1;
      setTries(n);
      if (n >= MAX_TRIES) {
        setSent(null);
        setError(`${MAX_TRIES}번 틀렸습니다. 인증번호를 다시 받아 주세요.`);
      } else {
        setError(`인증번호가 맞지 않습니다. (${n}/${MAX_TRIES})`);
      }
      return;
    }
    setError(null);
    onChange({ name: name.trim(), phone: masked(sent.to), at: stamp() });
  }

  return (
    <section className="mt-8">
      <SectionTitle note="만 19세 미만은 보호자가 휴대전화로 확인해야 결제할 수 있습니다.">
        보호자 확인
      </SectionTitle>

      <div className={`${card} p-5 sm:p-6`}>
        {value ? (
          <div className="flex flex-wrap items-start gap-3.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckIcon className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[14.5px] font-bold text-soft-ink">보호자 확인이 끝났습니다</p>
              <p className="mt-1 text-[13px] tabular-nums text-soft-muted">
                {value.name} · {value.phone} · {value.at}
              </p>
              <p className="mt-1.5 text-[12.5px] leading-[1.7] text-soft-muted">
                확정 안내와 취소 안내는 이 보호자 연락처로도 함께 갑니다.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setSent(null);
                setCode("");
              }}
              className="text-[13px] font-semibold text-soft-primary hover:underline"
            >
              다시 인증
            </button>
          </div>
        ) : (
          <>
            {registered ? (
              <p className="text-[13.5px] leading-[1.8] text-soft-ink">
                등록된 보호자{name && <b> {name}</b>} ·{" "}
                <span className="tabular-nums">{masked(to)}</span>
                <span className="block text-[12.5px] text-soft-muted">
                  이 번호로 인증번호를 보냅니다. 보호자가 곁에 있을 때 받아 주세요.
                </span>
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5">
                  <span className="text-[13px] font-semibold text-soft-ink">보호자 이름</span>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={!!sent}
                    autoComplete="off"
                    placeholder="예) 김보호"
                    className={field}
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[13px] font-semibold text-soft-ink">보호자 휴대전화</span>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/[^\d-]/g, ""))}
                    disabled={!!sent}
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="010-0000-0000"
                    className={`${field} tabular-nums`}
                  />
                </label>
              </div>
            )}

            <button
              type="button"
              onClick={send}
              disabled={!canSend}
              className={`${t.btnOutline} mt-4 disabled:cursor-not-allowed disabled:border-soft-line disabled:text-slate-400`}
            >
              {sent ? "인증번호 다시 받기" : "보호자 휴대전화로 인증번호 받기"}
            </button>

            {sent && (
              <div className="mt-5 border-t border-slate-100 pt-5">
                <p className="text-[13px] text-soft-ink">
                  <span className="tabular-nums">{masked(sent.to)}</span>로 인증번호를 보냈습니다.{" "}
                  <span
                    className={`font-semibold tabular-nums ${left > 30 ? "text-soft-primary" : "text-rose-600"}`}
                  >
                    {Math.floor(left / 60)}:{pad(left % 60)}
                  </span>
                </p>
                <div className="mt-2.5 flex gap-2">
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") confirm();
                    }}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    aria-label="인증번호 6자리"
                    placeholder="인증번호 6자리"
                    className={`${field} min-w-0 flex-1 tabular-nums tracking-[0.2em]`}
                  />
                  <button
                    type="button"
                    onClick={confirm}
                    disabled={code.length !== 6 || left === 0}
                    className={`${t.btnAction} h-[3.25rem] disabled:cursor-not-allowed disabled:bg-soft-line`}
                  >
                    확인
                  </button>
                </div>
                {/* 시연용 — 문자 발송을 붙이면 이 줄은 지운다 */}
                <p className="mt-3 rounded-[10px] bg-slate-50 px-3.5 py-2.5 text-[12px] text-soft-muted">
                  시연용 · 문자 대신 보낸 인증번호{" "}
                  <b className="tabular-nums tracking-[0.15em] text-soft-ink">{sent.code}</b>
                </p>
              </div>
            )}

            {error && (
              <p role="alert" className="mt-3 text-[12.5px] font-semibold text-rose-600">
                {error}
              </p>
            )}
          </>
        )}
      </div>
    </section>
  );
}
