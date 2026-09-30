"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import StudentRegistrar from "@/components/exam/StudentRegistrar";
import { useSession } from "@/lib/authStore";
import { useHydrated } from "@/lib/examStore";

/**
 * 기관 학생 명부·등록 (/my/students) — 대시보드 안에서 연다.
 *
 * 예전에는 응시 존(/exam/roster)에 있어서 대시보드에서 나갔다가 다른 껍데기를 만났다.
 * 등록은 회원이 자기 자리에서 하는 일이라 회원 존으로 들여왔다.
 *
 * 기관 담당자·교사가 소속 학생을 등록하고 진단을 배정하는 자리다. 만 14세 미만 학생은
 * 「임시등록」으로 올라가고, 법정대리인에게 동의 요청을 보낼 수는 있어도 **대신 동의할
 * 수는 없다.** 동의 버튼은 법정대리인의 화면에만 있다.
 *
 * ── 학부모는 여기 오지 않는다 ──
 *
 * 한동안 학부모도 이 명부 도구를 그대로 썼다(대시보드의 「학생 일괄 등록」이 ?tab=bulk로
 * 여기 닿았다). 반 · 법정대리인 연락처 · 동의 요청 · 접속코드 발급 규칙처럼 기관에만 필요한
 * 것이 함께 서서, 보호자가 아이 둘을 올리려고 들어와 읽을 것이 너무 많았다. 학부모는 이제
 * 한 명씩 등록(/my/children/new)과 일괄 등록(/my/children/bulk)을 쓴다. 옛 주소로 들어오면
 * 그리로 넘긴다.
 *
 * 들어가기 전 동의 확인도 두지 않는다. 학부모 계정은 휴대폰 본인인증으로 법정대리인임을
 * 확인하고 개인정보 수집·이용에 동의해야 만들어진다(lib/account.ts purposeConsents). 같은
 * 것을 아이를 올릴 때마다 다시 확인하면, 두 번째부터는 읽지 않고 체크하는 칸이 된다.
 * 동의권자와 동의 시점은 아이 단위로 남는다(개인정보보호법 제22조의2).
 */
export default function StudentsScreen({ tab = "one" }: { tab?: "one" | "bulk" }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const session = useSession();

  const isOrg = session?.role === "director" || session?.role === "teacher";
  const isParent = hydrated && !isOrg;

  useEffect(() => {
    if (isParent) router.replace(tab === "bulk" ? "/my/children/bulk" : "/my/children/new");
  }, [isParent, tab, router]);

  if (!hydrated || !isOrg) {
    return <p className="py-16 text-center text-[13px] text-soft-muted">확인 중입니다…</p>;
  }

  return <StudentRegistrar mode="director" initialTab={tab} />;
}
