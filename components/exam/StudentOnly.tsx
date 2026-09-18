"use client";

import Link from "next/link";
import type { Role } from "@/lib/authStore";
import { ArrowRight } from "@/components/Icons";
import { btnGhost, btnPrimary, eyebrow, panel } from "./ui";

/** 학생 세션이 아니면 응시할 대상이 없다 — 학생 관리로 돌려보낸다 */
export default function StudentOnly({ role }: { role: Role }) {
  const home = role === "director" ? "/my/students" : "/my/children";
  return (
    <div className="py-10">
      <div className={`mx-auto max-w-lg p-8 text-center ${panel}`}>
        <p className={eyebrow}>학생 화면</p>
        <h1 className="mt-3 text-[20px] font-bold text-soft-ink">
          응시는 학생 계정에서 진행합니다
        </h1>
        <p className="mt-3 text-[13px] leading-relaxed text-soft-muted">
          학생에게 발급한 접속코드로 들어가면 이 화면이 열립니다. 보호자도 같은 코드로 들어와
          설문만 진행할 수 있습니다.
        </p>
        <div className="mt-7 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link href={home} className={btnPrimary}>
            학생 관리로
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/login/student" className={btnGhost}>
            학생 코드로 접속
          </Link>
        </div>
      </div>
    </div>
  );
}
