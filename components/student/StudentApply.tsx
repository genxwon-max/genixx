"use client";

import { usePathname, useRouter } from "next/navigation";
import { Suspense } from "react";
import { useSession } from "@/lib/authStore";
import { trackFromGrade } from "@/lib/examCatalog";
import { resetStudent } from "@/lib/examStore";
import { useClaimSet } from "@/lib/setStore";
import { resetWallet, useWallet } from "@/lib/ticketStore";
import { ApplyDialog, applyAction, applyHref } from "@/components/exam/ApplyFlow";
import { CatalogBrowser } from "@/components/exam/ExamCatalog";
import { Head, WhoNote, cardBox, useSelf } from "./self";

/**
 * 진단 접수 (/student/apply) — 분기와 학년을 골라 접수한다.
 *
 * 예전에는 응시 존의 「접수하기」 탭(/exam/apply)이었다. 접수 · 응시 · 정답과 해설 · 결과가
 * 응시 존의 탭과 학생 대시보드에 나뉘어 있어, 같은 일을 하러 두 자리를 오가야 했다 — 넷을
 * 모두 대시보드로 모았다. 응시 존에는 문항을 푸는 창과 가입 전 사람이 보는 화면만 남는다.
 *
 * 목록 자체는 응시 존의 「진단 둘러보기」와 같은 것을 쓴다(CatalogBrowser). 줄 끝의 단추만
 * 다르다 — 여기서는 응시권과 접수 기록을 보고 「접수하기 · 접수 마감 · 이미 접수」를 가른다
 * (applyAction). 접수하면 그 진단이 「내 진단」에 올라온다.
 *
 * 누구의 접수인지는 이 화면이 정해 둔 학생이다(useSelf) — 보호자가 아이 화면을 확인하러
 * 들어왔을 때도 같은 목록이 서고, 접수하면 그 아이의 기록에 남는다.
 */
export default function StudentApply() {
  const self = useSelf();
  const session = useSession();
  const wallet = useWallet(self.id);
  /* 접수 창은 화면 안의 상태가 아니라 주소의 상태다 — 누르면 주소를 바꾼다(ApplyFlow) */
  const router = useRouter();
  const pathname = usePathname();
  /* 셋트를 풀고 가입한 학생이 이 화면에 먼저 닿을 수 있다 — 그 진단을 무료로 접수해 둔다 */
  useClaimSet(self.own ? self.id : null);

  /* 보호자가 아이의 접속코드로 들어와 설문만 하는 세션 — 접수는 학생이 한다 */
  const asGuardian = session?.asGuardian === true;

  return (
    <>
      <WhoNote self={self} />

      <Head
        title="진단 접수"
        lead="분기와 학년을 골라 접수합니다. 응시권이 있으면 유료 진단으로, 없으면 무료 진단으로 접수되고, 접수한 진단은 「내 진단」에서 응시합니다."
      />

      {!self.hydrated ? (
        <p className={`${cardBox} mt-7 p-10 text-center text-[13px] text-soft-muted`}>
          확인 중입니다…
        </p>
      ) : (
        <>
          <CatalogBrowser
            skin="dash"
            mine={trackFromGrade(self.student?.grade)}
            actionOf={(round, track) => applyAction(round, track, wallet, asGuardian)}
            onApply={(round, track) => router.replace(applyHref(pathname, round.id, track))}
          />

          <div className="mt-10 flex justify-end border-t border-soft-line pt-5">
            <button
              type="button"
              onClick={() => {
                resetWallet(self.id);
                resetStudent(self.id);
              }}
              className="rounded-full border border-soft-line bg-white px-4 py-2 text-[12px] font-semibold text-soft-muted transition-colors hover:bg-slate-50"
            >
              시연용 초기화
            </button>
          </div>
        </>
      )}

      {/* 경계는 여기서 두른다 — 창이 주소를 읽으므로(useSearchParams) 없으면 이 화면이
          정적으로 그려지지 않는다. 창은 떠 있을 때만 무언가를 그린다 */}
      <Suspense fallback={null}>
        <ApplyDialog studentId={self.id} />
      </Suspense>
    </>
  );
}
