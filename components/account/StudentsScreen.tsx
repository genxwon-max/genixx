"use client";

import Link from "next/link";
import StudentRegistrar from "@/components/exam/StudentRegistrar";
import { useSession } from "@/lib/authStore";
import { useHydrated } from "@/lib/examStore";

/**
 * 학생 명부·등록 — 대시보드 안에서 연다.
 *
 * 예전에는 응시 존(/exam/roster)에 있어서 대시보드에서 나갔다가 다른 껍데기를 만났다.
 * 등록은 회원이 자기 자리에서 하는 일이라 회원 존으로 들여왔다.
 *
 * 역할에 따라 하는 일이 갈린다 —
 *  · 기관 담당자·교사 : 소속 학생을 등록하고 평가를 배정한다. 만 14세 미만 학생은
 *                       「임시등록」으로 올라가고, 법정대리인에게 동의 요청을 보낼 수는
 *                       있어도 **대신 동의할 수는 없다.** 동의 버튼은 법정대리인의
 *                       화면에만 있다.
 *  · 학부모·법정대리인 : 자기 아이를 등록한다. 이 계정은 동의권자이므로 등록한 뒤
 *                       아이마다 동의할 수 있다.
 *
 * ── 들어가기 전 동의 확인을 두지 않는다 ──
 *
 * 한동안 학부모에게 이 화면 앞에 관문을 하나 세웠다. 「나는 법정대리인이며 위 내용에
 * 동의합니다」에 체크해야 등록 도구가 열렸다. 걷어 냈다.
 *
 * 가입할 때 이미 받은 것을 한 번 더 물었기 때문이다. 학부모 계정은 휴대폰 본인인증으로
 * 법정대리인임을 확인하고 개인정보 수집·이용에 동의해야 만들어진다(lib/account.ts
 * purposeConsents). 같은 것을 아이를 올릴 때마다 다시 확인하면, 두 번째부터는 읽지 않고
 * 체크하는 칸이 된다 — 동의를 받는 화면이 그렇게 되면 안 받느니만 못하다.
 *
 * 걷어 내도 동의 기록은 달라지지 않는다. 그 관문은 무엇도 기록하지 않았다. 만 14세 미만
 * 아이는 이 화면을 지나든 말든 「임시등록」(consent "temp")으로 올라가고, 동의는 언제나
 * **아이마다** 받는다 — 한 명씩 등록(ChildNew)에서는 생년월일 뒤의 동의 칸이, 여럿을
 * 올렸을 때는 명부 표의 동의 칸이 그 자리다. 동의권자와 동의 시점을 아이 단위로 남기는
 * 것은 개인정보보호법 제22조의2가 요구하는 바이기도 하다.
 */
export default function StudentsScreen({ tab = "one" }: { tab?: "one" | "bulk" }) {
  const hydrated = useHydrated();
  const session = useSession();

  const isOrg = session?.role === "director" || session?.role === "teacher";

  if (!hydrated) {
    return <p className="py-16 text-center text-[13px] text-soft-muted">확인 중입니다…</p>;
  }

  if (isOrg) {
    return <StudentRegistrar mode="director" initialTab={tab} />;
  }

  return (
    <>
      {/* 등록 도구가 자기 제목을 이미 달고 있어서 여기서는 돌아가는 길만 둔다 */}
      <Link
        href="/my"
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-soft-muted hover:text-soft-ink"
      >
        ← 홈으로
      </Link>
      <StudentRegistrar mode="parent" initialTab={tab} surveyPrompt={false} />
    </>
  );
}
