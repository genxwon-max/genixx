"use client";

import Link from "next/link";
import { useState } from "react";
import { userActions, type UserActionKind } from "@/lib/admin";
import type { Tone } from "@/lib/admin2";
import { userStateLabel, type UserState } from "@/lib/adminUsers";
import { Panel, Status } from "./ui";

/**
 * 계정을 막고 여는 판 — 회원 상세와 학생 상세가 같은 것을 쓴다.
 *
 * 말과 사유 목록을 기존 콘솔(components/admin/ActionDialog.tsx)과 한 벌로 쓴다
 * (lib/admin.ts userActions). 같은 콘솔에서 같은 일을 두 이름으로 부르지 않는다.
 * 다만 창을 띄우지 않고 판 안에서 펼친다 — 이 콘솔은 한 화면에 다 보이는 것이 규칙이고,
 * 무슨 일이 일어나는지(effects)를 확인 단추 바로 위에 세워 두는 편이 창보다 낫다.
 *
 * 사유는 강제하지 않는다. 흔한 사유를 미리 골라 두고 첫 항목을 눌러 둔다 — 강제하면
 * 사람은 아무 칸이나 눌러 넘기고, 남은 기록은 있으나 마나 한 글자가 된다.
 *
 * ⚠ 단추 이름은 「삭제」다. 처음에 「탈퇴 처리」로 적었더니 눌러서 펼친 확인 문구는
 *   「계정을 삭제합니다」, 감사 기록은 「계정 삭제」, 단추만 탈퇴가 되었다 — 한 동작이
 *   한 화면에서 두 이름으로 불렸다. 말은 userActions.verb 하나를 따른다. 「탈퇴」는 그
 *   동작의 **결과 상태** 이름이고(userStateLabel), 그 둘을 잇는 한 줄을 단추 밑에 적는다.
 *
 * ⚠ 삭제는 줄을 목록에서 지우지 않는다. 상태를 탈퇴로 바꾸고 그대로 세워 둔다.
 *   사유 문구가 「파기 절차로 넘어갑니다」이지 「지금 사라집니다」가 아니고, 무엇보다
 *   목록에서 사라지면 방금 무엇을 했는지 확인할 자리가 없어진다.
 */

/** 동작이 끝난 뒤의 상태 */
const RESULT: Record<UserActionKind, UserState> = {
  suspend: "suspended",
  restore: "active",
  delete: "withdrawn",
};

export default function AccountActions({
  name,
  id,
  state,
  tone,
  changed,
  at,
  by,
  onAct,
}: {
  name: string;
  id: string;
  state: UserState;
  tone: Tone;
  /** 이 브라우저에서 상태를 바꾼 적이 있는지 — 판 머리에 적는다 */
  changed: boolean;
  at?: string;
  by?: string;
  onAct: (next: UserState, verb: string, reason: string) => void;
}) {
  const [acting, setActing] = useState<UserActionKind | null>(null);
  const [picked, setPicked] = useState("");
  const [detail, setDetail] = useState("");

  /* 정지 중·휴면이면 다음 동작은 「해제」다. 기존 콘솔의 갈래를 그대로 따른다 */
  const off = state === "dormant" || state === "suspended";
  const gone = state === "withdrawn";

  const open = (kind: UserActionKind) => {
    setActing(kind);
    setPicked(userActions[kind].reasons[0]);
    setDetail("");
  };

  const spec = acting ? userActions[acting] : null;
  const reason = detail.trim() ? `${picked} — ${detail.trim()}` : picked;

  return (
    <Panel title="계정 상태" meta={changed ? "이 브라우저에서 바꾼 값" : "명부의 값"}>
      <div className="flex flex-wrap items-center gap-2">
        <Status tone={tone}>{userStateLabel[state].label}</Status>
        {changed && at && (
          <span className="a2-t-xs text-(--a2-ink-4)">
            {at} · {by}
          </span>
        )}
      </div>

      {state === "pending" && (
        <p className="a2-note mt-2" style={{ borderLeftColor: "var(--a2-warn)" }}>
          <span>
            가입 신청을 아직 처리하지 않은 계정입니다. 승인·반려는{" "}
            <Link href="/admin2/approvals" className="font-bold text-(--a2-accent-2) underline">
              가입 승인
            </Link>{" "}
            화면에서 합니다.
          </span>
        </p>
      )}

      {gone ? (
        <p className="a2-note mt-2" style={{ borderLeftColor: "var(--a2-danger)" }}>
          <span>삭제 처리되어 탈퇴 상태입니다. 되돌릴 수 없고, 이 화면에서 더 고칠 수 있는 칸도 없습니다.</span>
        </p>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <button type="button" className="a2-btn" onClick={() => open(off ? "restore" : "suspend")}>
              {off ? "정지 해제" : "정지"}
            </button>
            <button type="button" className="a2-btn a2-btn-danger" onClick={() => open("delete")}>
              삭제
            </button>
          </div>
          {/* 동작 이름(삭제)과 결과 상태 이름(탈퇴)을 잇는 한 줄. 이 줄이 없으면 「삭제」를
              누른 사람이 목록에서 「탈퇴」로 서 있는 줄을 보고 다른 일이 일어난 줄 안다 */}
          <p className="a2-hint">삭제하면 이 계정은 목록에 「탈퇴」 상태로 남습니다.</p>
        </>
      )}

      {/* 확인 — 창을 띄우지 않고 단추 바로 아래에서 펼친다 */}
      {spec && acting && (
        <div className="mt-3 border-t border-(--a2-line) pt-3">
          <p className="a2-h">
            {name} · <span className="a2-mono font-normal">{id}</span> 계정을 {spec.verb}합니다
          </p>
          <ul className="mt-1.5 grid gap-0.5 a2-t-sm text-(--a2-ink-2)">
            {spec.effects.map((e) => (
              <li key={e} className="flex gap-1.5">
                <span aria-hidden className="text-(--a2-ink-4)">
                  ·
                </span>
                {e}
              </li>
            ))}
          </ul>

          <div className="mt-3 grid gap-2">
            <label className="a2-field block">
              <span className="a2-label">사유 (그대로 두셔도 됩니다)</span>
              <select className="a2-select" value={picked} onChange={(e) => setPicked(e.target.value)}>
                {spec.reasons.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
            <label className="a2-field block">
              <span className="a2-label">덧붙일 말 (선택)</span>
              <input
                className="a2-input"
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                placeholder="적지 않으셔도 됩니다"
              />
            </label>
          </div>

          <p className="a2-hint mt-2">
            기록에는 이렇게 남습니다 — <b className="text-(--a2-ink)">{reason}</b>
          </p>

          {/* 위에 적은 effects 세 줄을 되풀이하지 않는다. 처음에 「되돌릴 수 없습니다.
              잠시 막아 두려는 것이라면 정지를 쓰세요」로 적었더니 같은 문장이 한 화면에
              두 번 서서, 두 번째 것이 새 경고가 아니라 메아리로 읽혔다 */}
          {spec.danger && (
            <p className="a2-note mt-2" style={{ borderLeftColor: "var(--a2-danger)" }}>
              <span>한 번 더 확인해 주세요.</span>
            </p>
          )}

          <div className="mt-3 flex flex-wrap gap-1.5">
            <button
              type="button"
              className={spec.danger ? "a2-btn a2-btn-danger" : "a2-btn a2-btn-primary"}
              onClick={() => {
                onAct(RESULT[acting], spec.verb, reason);
                setActing(null);
              }}
            >
              네, {spec.verb}합니다
            </button>
            <button type="button" className="a2-btn" onClick={() => setActing(null)}>
              취소
            </button>
          </div>
        </div>
      )}
    </Panel>
  );
}
