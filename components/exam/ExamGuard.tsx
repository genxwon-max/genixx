"use client";

import { useEffect } from "react";
import { useSession } from "@/lib/authStore";
import { useHydrated } from "@/lib/examStore";
import { useSecurity } from "@/lib/securityStore";

/**
 * 응시 화면 보호 — 관리자 화면(ADM-04-4)에서 켜 둔 것만 적용한다.
 *
 * 여기서 하는 일은 전부 「화면 안에서만」 막는 것이다. 스크린샷도, 옆에서 휴대폰으로
 * 찍는 것도 못 막는다. 그래서 관리자 화면에는 막는 것과 못 막는 것을 나란히 적어
 * 두었고, 진짜 대비책은 문항 회전이라고 밝혀 두었다.
 *
 * 학생이 자기가 쓴 답을 복사하는 것까지 막지는 않는다. 막아야 할 것은 문항이 밖으로
 * 나가는 일이지 아이가 자기 글을 다루는 일이 아니다.
 */
export default function ExamGuard() {
  const settings = useSecurity();
  const session = useSession();
  const hydrated = useHydrated();

  const { copy, contextmenu, watermark } = settings.guards;

  useEffect(() => {
    if (!copy && !contextmenu) return;

    /** 입력칸 안에서 일어난 일은 그대로 둔다 — 아이가 쓴 답은 아이 것이다 */
    const inField = (t: EventTarget | null) =>
      t instanceof HTMLElement && !!t.closest("input, textarea");

    const onCopy = (e: Event) => {
      if (copy && !inField(e.target)) e.preventDefault();
    };
    const onDrag = (e: Event) => {
      if (copy && !inField(e.target)) e.preventDefault();
    };
    const onMenu = (e: Event) => {
      if (contextmenu && !inField(e.target)) e.preventDefault();
    };

    document.addEventListener("copy", onCopy);
    document.addEventListener("cut", onCopy);
    document.addEventListener("dragstart", onDrag);
    document.addEventListener("contextmenu", onMenu);
    return () => {
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("cut", onCopy);
      document.removeEventListener("dragstart", onDrag);
      document.removeEventListener("contextmenu", onMenu);
    };
  }, [copy, contextmenu]);

  if (!hydrated) return null;

  return (
    <>
      {copy && (
        /* 입력칸은 예외로 둔다. body 전체를 잠그면 서술형 답을 고치지도 못한다. */
        <style>{`
          body { user-select: none; -webkit-user-select: none; }
          input, textarea { user-select: text; -webkit-user-select: text; }
        `}</style>
      )}

      {watermark && (
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-30 overflow-hidden select-none"
        >
          <div className="flex h-full w-full flex-wrap content-start gap-x-16 gap-y-20 opacity-[0.07] [transform:rotate(-24deg)_scale(1.4)]">
            {Array.from({ length: 40 }, (_, n) => (
              <span key={n} className="whitespace-nowrap text-[13px] font-bold text-exam-text">
                {session?.name ?? "응시자"} · {session?.studentId ?? "코드 미상"}
              </span>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
