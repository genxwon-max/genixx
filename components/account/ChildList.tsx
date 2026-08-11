"use client";

import Link from "next/link";
import { useState } from "react";
import { ageFromBirth, consentRouteFor, consentRouteInfo } from "@/lib/account";
import { formatCode, reissueCode, useRoster } from "@/lib/roster";
import { useHydrated } from "@/lib/examStore";
import { ArrowRight } from "@/components/Icons";
import { AccHead, btnGhost, btnPrimary, card, cardPad } from "./ui";

/**
 * ACC-03 학생(학생) 프로필 관리.
 * 여러 명을 지원하고, 프로필 단위로 응시·리포트 이력이 귀속된다.
 * 아이마다 만 14세 기준이 다를 수 있으므로 목록에서 동의 주체를 함께 보여 준다.
 */
export default function ChildList() {
  const hydrated = useHydrated();
  const all = useRoster();
  const children = all.filter((s) => s.owner === "parent");

  if (!hydrated) {
    return <p className="py-16 text-center text-[13px] text-soft-muted">확인 중입니다…</p>;
  }

  return (
    <>
      {/* 등록 버튼은 학부모 홈과 같은 자리(제목 오른쪽)에 둔다 */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <AccHead
            id="ACC-03"
            title="학생 프로필"
            lead="아이마다 프로필을 따로 둡니다. 응시 기록과 리포트는 프로필 단위로 쌓입니다."
            back={{ href: "/my", label: "홈으로" }}
          />
        </div>
        {children.length > 0 && (
          <Link href="/my/children/consent" className={`${btnPrimary} mt-8 shrink-0`}>
            + 학생 등록
          </Link>
        )}
      </div>

      {children.length === 0 ? (
        <div className={`${card} ${cardPad} text-center`}>
          <p className="text-[16px] font-black text-soft-ink">아직 등록된 학생이 없습니다</p>
          <p className="mt-2.5 text-[14px] leading-relaxed text-soft-muted">
            등록은 <b>법정대리인 동의</b>부터 시작합니다. 아이 생년월일에 따라 누가 동의해야 하는지
            안내해 드립니다.
          </p>
          <Link href="/my/children/consent" className={`${btnPrimary} mt-6`}>
            학생 등록 시작하기
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {children.map((c) => {
            const age = ageFromBirth(c.birth);
            const route = consentRouteFor(age);
            const info = route ? consentRouteInfo[route] : null;
            return (
              <li key={c.id} className={`${card} p-5 sm:p-6`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[18px] font-black text-soft-ink">{c.name}</p>
                    <p className="mt-1 text-[13px] text-soft-muted">
                      {c.grade} · 만 {age ?? "—"}세
                    </p>
                  </div>
                  {info && (
                    <span
                      className={`rounded-full border px-3 py-1 text-[12px] font-bold ${
                        route === "guardian"
                          ? "border-amber-300 bg-amber-50 text-amber-800"
                          : "border-emerald-300 bg-emerald-50 text-emerald-800"
                      }`}
                    >
                      {info.label} · {info.who} 동의
                    </span>
                  )}
                </div>

                <div className="mt-4 rounded-lg bg-slate-50 px-4 py-3.5">
                  <span className="text-[12px] font-bold text-soft-muted">접속코드</span>
                  <span className="mt-1 block text-[20px] font-black tracking-[0.1em] tabular-nums text-soft-ink">
                    {formatCode(c.code)}
                  </span>
                  <span className="mt-1 block text-[12px] text-soft-muted">
                    생년월일과 함께 입력해야 들어갑니다.
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <CopyCode code={c.code} className="flex-1 text-[14px]" />
                  <button
                    type="button"
                    onClick={() => reissueCode(c.id)}
                    className={`${btnGhost} flex-1 text-[14px]`}
                  >
                    코드 다시 발급
                  </button>
                  <Link
                    href="/my/children/consent-stages"
                    className={`${btnGhost} flex-1 text-[14px]`}
                  >
                    동의 관리
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className={`${card} mt-4 p-5`}>
        <p className="text-[14px] font-black text-soft-ink">아이는 따로 가입하지 않습니다</p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-soft-muted">
          만 14세 이상이어도 마찬가지입니다. 동의의 주체만 아이 본인으로 바뀔 뿐, 계정은 이 보호자
          계정 하나입니다. 아이 화면에서는 결제 정보나 형제자매의 결과가 보이지 않습니다.
        </p>
      </div>
    </>
  );
}

/**
 * 접속코드 복사 버튼.
 *
 * 코드를 받은 보호자가 바로 할 일은 아이에게 전달하는 것이다. 손으로 옮겨 적게
 * 두면 혼동하기 쉬운 글자(0·O 같은)를 빼 둔 뜻이 없어진다.
 */
function CopyCode({ code, className = "" }: { code: string; className?: string }) {
  const [state, setState] = useState<"idle" | "done" | "failed">("idle");

  const copy = async () => {
    const text = formatCode(code);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // 보안 컨텍스트가 아니거나 권한이 없으면 clipboard가 거절한다. 예전 방식으로 한 번 더 시도한다.
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      if (!ok) {
        // 되지 않았으면 됐다고 하지 않는다. 손으로 옮겨 적어야 한다는 뜻이다.
        setState("failed");
        window.setTimeout(() => setState("idle"), 3000);
        return;
      }
    }
    setState("done");
    window.setTimeout(() => setState("idle"), 2000);
  };

  return (
    <button type="button" onClick={() => void copy()} className={`${btnGhost} ${className}`}>
      {state === "done" ? "복사했습니다" : state === "failed" ? "직접 입력해 주세요" : "코드 복사"}
    </button>
  );
}
