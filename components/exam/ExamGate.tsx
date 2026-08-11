"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useSession } from "@/lib/authStore";
import { useHydrated } from "@/lib/examStore";
import { ArrowRight } from "@/components/Icons";
import { btnGhost, btnPrimary, eyebrow, panel, panelRaised } from "./ui";

const entries = [
  {
    href: "/login",
    title: "로그인",
    desc: "이미 계정이 있다면 카카오·네이버·구글 또는 이메일로 로그인합니다.",
    primary: true,
  },
  {
    href: "/signup",
    title: "회원가입",
    desc: "학부모·교사·기관 중 유형을 고르고 가입합니다. 학생은 별도 가입이 없습니다.",
    primary: false,
  },
  {
    href: "/login/student",
    title: "학생 접속코드",
    desc: "보호자·학원장이 발급한 8자리 코드와 생년월일로 바로 응시 화면에 들어갑니다.",
    primary: false,
  },
];

/** 로그인하지 않았으면 응시 존 입구(로그인·가입)를 대신 보여준다. */
export default function ExamGate({ children }: { children: ReactNode }) {
  const hydrated = useHydrated();
  const session = useSession();

  if (!hydrated) {
    return (
      <div className="container-x py-24 text-center text-[13px] text-exam-muted">
        확인 중입니다…
      </div>
    );
  }

  if (session) return <>{children}</>;

  return (
    <div className="container-x py-12 md:py-20">
      <div className="mx-auto max-w-2xl">
        <p className={eyebrow}>Assessment Center · 인증 필요</p>
        <h1 className="mt-3 text-[26px] font-black tracking-tight text-exam-text md:text-[32px]">
          응시하려면 먼저 로그인해 주세요
        </h1>
        <p className="mt-3 text-[14px] leading-relaxed text-exam-muted">
          응시 이력과 결과 리포트는 계정에 귀속됩니다. 회차·문항·응답 기록이 남기 때문에 인증 없이는
          응시할 수 없습니다.
        </p>

        <ul className="mt-8 space-y-3">
          {entries.map((e) => (
            <li key={e.href}>
              <Link
                href={e.href}
                className={`group flex items-center justify-between gap-4 px-6 py-5 ${
                  e.primary ? panelRaised : panel
                } transition-colors hover:border-brand-400`}
              >
                <span>
                  <span className="block text-[17px] font-black text-exam-text">{e.title}</span>
                  <span className="mt-1.5 block text-[13px] leading-relaxed text-exam-muted">
                    {e.desc}
                  </span>
                </span>
                <ArrowRight className="h-5 w-5 shrink-0 text-exam-muted transition-colors group-hover:text-exam-text" />
              </Link>
            </li>
          ))}
        </ul>

        <div className={`mt-8 px-6 py-5 ${panel}`}>
          <p className="text-[13px] font-bold text-exam-text">응시 전에 확인해 주세요</p>
          <ul className="mt-3 space-y-1.5 text-[13px] leading-relaxed text-exam-muted">
            <li>· 국어(언어)·수학·과학을 <b className="text-exam-text">과목별로 따로</b> 응시합니다.</li>
            <li>· 한 과목은 4문항이며 제한 시간은 40분입니다.</li>
            <li>· 한 과목을 모두 풀어야 그 과목을 제출할 수 있습니다.</li>
            <li>· 중간에 포기하면 해당 과목의 응시 기회가 사라집니다.</li>
          </ul>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/login" className={btnPrimary}>
              로그인하고 시작
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/service/academic" className={btnGhost}>
              진단 안내 먼저 보기
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
