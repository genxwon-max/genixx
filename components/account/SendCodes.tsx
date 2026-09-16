"use client";

import { useState } from "react";
import type { Student } from "@/lib/roster";
import { Button } from "@/components/ui/button";
import Toast from "@/components/exam/Toast";
import ConfirmDialog from "./ConfirmDialog";

/**
 * 목록에서 학생을 골라 접속코드를 한 번에 보내는 조각.
 *
 * 학부모 홈(/my)과 학생 프로필(/my/children)이 같은 일을 한다 — 표에서 체크하고,
 * 고른 사람의 보호자에게 코드를 문자로 보낸다. 두 화면에 같은 셈을 두 벌 두면 한쪽만
 * 고쳐질 것이 뻔해서 여기로 모았다.
 *
 * 보내는 버튼은 확인 창과 알림까지 통째로 들고 있다. 부르는 쪽은 **고른 사람**만
 * 넘기면 되고, 누구에게 보낼 수 있고 누구는 연락처가 없는지는 여기서 가른다.
 */

/** 「01012345678」 → 「010-1234-5678」 */
export function phoneText(p?: string) {
  const d = (p ?? "").replace(/\D/g, "");
  if (d.length === 11) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  return p ?? "";
}

/** 고른 사람을 담아 두는 상태 */
export function usePicked() {
  const [picked, setPicked] = useState<Set<string>>(new Set());

  return {
    has: (id: string) => picked.has(id),
    /** 한 명을 켜고 끈다 */
    toggle: (id: string) =>
      setPicked((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      }),
    /** 지금 보이는 줄 전체를 켜거나 끈다 — 머리 줄의 체크상자 */
    setMany: (ids: string[], on: boolean) =>
      setPicked((prev) => {
        const next = new Set(prev);
        for (const id of ids) {
          if (on) next.add(id);
          else next.delete(id);
        }
        return next;
      }),
    clear: () => setPicked(new Set()),
  };
}

/** 체크상자 — 표 안에서 쓰는 크기를 한곳에 둔다 */
export function PickBox({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      disabled={disabled}
      aria-label={label}
      className="h-[17px] w-[17px] align-middle"
    />
  );
}

export function SendCodesButton({
  chosen,
  onSent,
  className,
}: {
  /** 지금 체크해 둔 학생 */
  chosen: Student[];
  /** 보내고 난 뒤 — 보통 체크를 푼다 */
  onSent?: () => void;
  className?: string;
}) {
  const [ask, setAsk] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  /* 연락처가 없으면 보낼 곳이 없다. 등록할 때 선택 항목이라 비어 있는 아이가 섞인다. */
  const sendable = chosen.filter((c) => (c.guardianPhone ?? "").trim() !== "");
  const unreachable = chosen.filter((c) => (c.guardianPhone ?? "").trim() === "");

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setAsk(true)}
        disabled={chosen.length === 0}
        className={className}
      >
        문자로 코드 보내기
      </Button>

      {ask && (
        <ConfirmDialog
          title={`${sendable.length}명에게 접속코드를 문자로 보낼까요?`}
          confirmLabel="보내기"
          body={
            <>
              {sendable.length > 0 ? (
                <>
                  보호자 연락처로 아이 이름과 접속코드를 보냅니다.
                  <br />
                  <b className="text-soft-ink">
                    {sendable.map((c) => `${c.name}(${phoneText(c.guardianPhone)})`).join(" · ")}
                  </b>
                </>
              ) : (
                "고른 학생 가운데 보호자 연락처가 있는 학생이 없습니다."
              )}
              {unreachable.length > 0 && (
                <>
                  <br />
                  <br />
                  연락처가 없어 보내지 못하는 학생 —{" "}
                  <b className="text-soft-ink">{unreachable.map((c) => c.name).join(" · ")}</b>.
                  학생 상세에서 보호자 연락처를 채우면 함께 보낼 수 있습니다.
                </>
              )}
            </>
          }
          onCancel={() => setAsk(false)}
          onConfirm={() => {
            /* ⚠ 문자는 아직 나가지 않는다. 붙일 때 이 자리에서 발송 API를 부른다 —
               고른 사람과 보낼 내용이 정해지는 곳이 여기라, 화면을 고치지 않고
               호출만 갈아 끼울 수 있다. */
            setAsk(false);
            onSent?.();
            setToast(
              sendable.length > 0
                ? `${sendable.length}명의 보호자에게 접속코드를 보냈습니다.`
                : "보낼 수 있는 연락처가 없습니다.",
            );
          }}
        />
      )}

      <Toast message={toast} onClose={() => setToast(null)} />
    </>
  );
}
