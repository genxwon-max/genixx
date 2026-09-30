"use client";

import PaymentHub, { type PayTab } from "@/components/account/PaymentHub";
import { Checking, GateNote, WhoNote, cardBox, useSelf } from "./self";

/**
 * 내 결제 (/student/payments) — **만 14세 이상** 학생이 자기 응시권과 면담을 사는 자리.
 *
 * ── 왜 나이로 자리를 가르는가 ──
 * 만 14세부터는 개인정보 수집·이용에 본인이 동의할 수 있고(개인정보보호법 제22조의2)
 * 그때부터 학생에게 자기 계정과 자기 연락처가 있다. 중·고등학생이 자기 회차를 스스로
 * 접수하는 일은 실제로 일어난다. 만 14세 미만 아이의 돈은 보호자가 다루므로 그 레일에는
 * 이 자리를 세우지 않고, 주소로 들어와도 까닭을 적어 돌려보낸다(GateNote).
 *
 * ── 판은 보호자 것과 같은 것을 쓴다 ──
 * 응시권 값·회차·분기·환불 규정은 보호자 화면과 한 글자도 다를 데가 없다. 학생용으로
 * 따로 한 벌 짜 두면 값을 올릴 때 두 곳을 고쳐야 하고, 한쪽을 잊으면 같은 평가가 두 값에
 * 팔린다. 그래서 보호자 결제 판(PaymentHub)에 **내 학생 ID만 넘겨** 명부 대신 나 하나를
 * 세우고 내 주문만 쌓는다.
 *
 * ── 열려 있다고 혼자 되는 것은 아니다 ──
 * 만 19세 미만은 민법상 미성년이라 재산상 의무가 붙는 계약은 취소될 수 있다(제5조).
 * 그래서 결제 단추 앞에 보호자 휴대전화 인증을 받는다 — 그 칸은 결제 판 안에 있고,
 * 이 화면은 위에 그 사실을 미리 적어 둔다.
 */
export default function StudentPayments({
  view = "hub",
  tab = "exam",
  orderId,
}: {
  /** 결제 첫 화면(/student/payments) · 결제 완료(/student/payments/done) */
  view?: "hub" | "done";
  tab?: PayTab;
  orderId?: string;
}) {
  const self = useSelf();

  /* 나이는 명부에서 읽는다 — 읽기 전에는 결제창을 펴지 않는다 */
  if (!self.hydrated) return <Checking title="결제" />;

  if (!self.student) {
    return (
      <GateNote
        title="결제를 열 수 없습니다"
        head="명부에서 내 이름을 찾지 못했습니다"
        body="응시권은 학생 한 사람 앞으로 발급됩니다. 접속코드로 다시 들어오면 이 자리에서 결제할 수 있습니다."
      />
    );
  }

  if (!self.teen) {
    return (
      <GateNote
        title="결제는 보호자가 합니다"
        head="여기는 내 자리가 아닙니다"
        body="만 14세 미만은 응시권을 직접 결제할 수 없습니다. 돈이 드는 일은 법정대리인이 정하도록 법이 정해 두었기 때문입니다. 보호자에게 말하면 보호자 화면에서 결제할 수 있습니다."
      />
    );
  }

  return (
    <>
      <WhoNote self={self} />

      {/* 결제 판을 펴기 전에 미성년 갈래를 먼저 적는다 — 카드번호를 넣기 직전이 아니라
          화면에 들어선 자리에서 알아야, 보호자에게 말하고 다시 올 수 있다. 결제를 마친
          영수증에는 세우지 않는다 */}
      {self.minor && view === "hub" && (
        <p
          className={`${cardBox} mb-5 border-soft-primary bg-soft-primary-soft px-5 py-4 text-[13px] leading-[1.8] text-soft-ink`}
        >
          <b>만 19세 미만은 보호자 확인을 받아야 결제할 수 있습니다.</b> 개인정보에 대한 동의는
          만 14세부터 내가 하지만, 돈이 드는 계약은 만 19세부터 혼자 할 수 있습니다(민법 제5조).
          결제하기 전에 보호자 휴대전화로 인증번호를 보내 보호자가 직접 확인하니, 보호자가 곁에
          있을 때 결제해 주세요. 보호자가 자기 계정에서 바로 결제해도 됩니다.
        </p>
      )}

      <PaymentHub view={view} tab={tab} orderId={orderId} selfId={self.id} />
    </>
  );
}
