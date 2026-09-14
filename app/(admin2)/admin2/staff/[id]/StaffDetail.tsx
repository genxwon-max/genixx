"use client";

import Link from "next/link";
import { useState } from "react";
import { permissionIds, permissionLabel, type PermissionId } from "@/lib/admin";
import { accountTone } from "@/lib/admin2";
import { recordAction, useAdminPrefs } from "@/lib/adminStore";
import { userStateLabel } from "@/lib/adminUsers";
import { useHydrated } from "@/lib/examStore";
import {
  basePerms,
  permDiffText,
  roleOptions,
  saveStaffPerms,
  useStaffRow,
  useStaffRows,
  wouldLockOut,
  type StaffRow,
} from "@/lib/staffPermStore";
import {
  LeaveDialog,
  PageSaveBar,
  useEditDraft,
  useUnsavedGuard,
} from "@/components/admin2/EditGuard";
import { Body, DescList, FormRow, PageHead, Panel, Status } from "@/components/admin2/ui";

/**
 * ADM-03-1 운영자 상세 — 한 사람의 역할과 권한을 고치는 자리.
 *
 * 목록에서 「권한 보기」를 누르면 화면 아래 대조표로 뛰기만 했다. 대조표는 「출제자는
 * 무엇을 할 수 있나」에 답하지만 「이 사람에게 감사 로그를 열어 주자」에는 답하지 못한다.
 * 그래서 제 주소를 주고, 보는 자리를 고치는 자리로 바꿨다.
 *
 * ── 역할과 권한을 한 판에 둔다 ──
 * 권한의 출처는 역할이라, 둘을 따로 세우면 「역할을 바꿨는데 왜 칸이 그대로인가」를
 * 두 판을 오가며 맞춰 보게 된다. 한 판에 위아래로 둔다.
 *
 * ── 화면에는 고르는 것만 둔다 ──
 * 판 하나에 곁들이는 말을 여럿 세워 두었다가 걷어 냈다 — 권한 수, 역할마다의 개수,
 * 역할 기본값과 어긋난 칸의 「더함 / 뺌」, 겸직을 짚어 주는 줄, 까닭 칸, 명부에서
 * 무엇이 달라졌는지 적던 「고친 기록」 판. 열여덟 칸을 켜고 끄는 자리에서 그것들이
 * 전부 같은 무게로 서면, 정작 켜야 할 칸을 고르는 일이 곁들이는 말을 읽는 일에
 * 묻힌다. 지금 이 화면에는 계정, 고르는 것, 저장뿐이다.
 *
 * ⚠ 「고친 기록」과 함께 「명부 역할로 되돌리기」 단추도 빠졌다. 되돌리는 길은 그대로
 *   있다 — 명부의 역할을 다시 고르고 「역할 기본값으로」를 누른 뒤 저장하면 저장소가
 *   자국을 열쇠째 지운다(lib/staffPermStore.ts의 saveStaffPerms). 단추 하나가 줄었을
 *   뿐 할 수 있는 일이 줄지는 않았다.
 *
 * ⚠ 역할을 바꿔도 켜 둔 칸은 건드리지 않는다. 라디오 하나에 열여덟 칸이 통째로 갈리면,
 *   역할 이름만 고쳐 보려던 손이 조용히 권한을 지운다. 기본값으로 맞추고 싶을 때를 위해
 *   판 머리에 「역할 기본값으로」를 따로 두었다.
 *
 * ⚠ 이 화면은 **무엇을 보여 줄지**만 정한다. 실제로 막는 것은 서버다 — 콘솔이 단추를
 *   숨기는 것으로 권한을 지킬 수는 없다(lib/staffPermStore.ts 머리 주석).
 */
export default function StaffDetail({ id }: { id: string }) {
  const hydrated = useHydrated();
  const row = useStaffRow(id);

  const back = (
    <Link href="/admin2/staff" className="a2-btn">
      ← 운영자·권한
    </Link>
  );

  if (!row) {
    return (
      <>
        <PageHead title="찾지 못했습니다" back={back} />
        <Body>
          <Panel title="없는 계정">
            <p className="a2-t-sm text-(--a2-ink-2)">
              <span className="a2-mono">{id}</span> 은(는) 명부에 없는 계정입니다.
            </p>
          </Panel>
        </Body>
      </>
    );
  }

  /* 고친 권한은 브라우저에만 있다. 하이드레이션 전에 초안을 잡으면 명부 기본값이
     붙들려, 저장분이 들어와도 「고친 것이 있다」로 잘못 켜진다 */
  if (!hydrated) return <PageHead title={row.name} back={back} />;

  return <Desk key={row.id} row={row} back={back} />;
}

function Desk({ row, back }: { row: StaffRow; back: React.ReactNode }) {
  const by = useAdminPrefs().staffName || "운영자";
  const rows = useStaffRows();
  const draft = useEditDraft({ role: row.role, perms: row.perms });
  const [err, setErr] = useState<string | null>(null);

  const role = draft.value.role;
  const perms = draft.value.perms;
  const base = basePerms(role);
  const locked = wouldLockOut(rows, row.id, perms);
  const atBase = base.length === perms.length && base.every((p) => perms.includes(p));

  /* 켤 때도 permissionIds의 차례를 지킨다 — 나중에 켠 것이 뒤에 붙어 서면 두 계정을
     나란히 놓고 견줄 수 없다 */
  const toggle = (p: PermissionId) =>
    draft.set(
      "perms",
      perms.includes(p)
        ? perms.filter((v) => v !== p)
        : permissionIds.filter((v) => v === p || perms.includes(v)),
    );

  const save = () => {
    const res = saveStaffPerms(row, rows, { role, perms }, by);
    if (!res.ok) {
      setErr(res.why ?? null);
      return false;
    }
    /* 화면에서 까닭 칸은 걷어 냈지만, 감사 로그에는 무엇이 어떻게 바뀌었는지가 남는다 —
       「권한을 고쳤다」만 적어 두면 나중에 로그를 읽는 사람이 답할 것이 없다 */
    recordAction(
      `${row.name} (${row.id})`,
      "운영자 권한 변경",
      permDiffText(row, { role, perms }),
      by,
    );
    setErr(null);
    return true;
  };

  const guard = useUnsavedGuard(draft.dirty, save, draft.reset);

  return (
    <>
      <PageHead
        title={row.name}
        back={back}
        actions={
          <>
            <Status tone={accountTone[row.state]}>{userStateLabel[row.state].label}</Status>
            <Link href="/admin2/audit" className="a2-btn">
              감사 로그
            </Link>
          </>
        }
      />

      <Body className="grid gap-3">
        <Panel title="계정" meta={row.id} flush>
          <div className="px-3 py-2.5">
            <DescList
              rows={[
                { k: "로그인 아이디", v: <span className="a2-mono">{row.loginId}</span> },
                { k: "팀", v: row.team },
                { k: "최근 접속", v: <span className="a2-mono">{row.lastSeen}</span> },
                { k: "가입일", v: <span className="a2-mono">{row.joinedAt}</span> },
              ]}
            />
          </div>
        </Panel>

        <Panel
          title="역할·권한"
          lead
          actions={
            <button
              type="button"
              className="a2-btn a2-btn-sm"
              disabled={atBase}
              onClick={() => draft.set("perms", base)}
            >
              역할 기본값으로
            </button>
          }
          flush
        >
          <div className="a2-form">
            <FormRow label="역할">
              <span className="flex flex-wrap items-center gap-x-5 gap-y-1">
                {roleOptions.map((o) => (
                  <label key={o.id} className="a2-choice" title={o.desc}>
                    <input
                      type="radio"
                      name="staff-role"
                      checked={role === o.id}
                      onChange={() => draft.set("role", o.id)}
                    />
                    {o.short}
                  </label>
                ))}
              </span>
            </FormRow>

            {/* 칸 열여덟. 넓은 화면에서만 두 줄로 접는다 — 좁은 화면에서 두 줄로 두면
                뜻이 잘리고, 잘린 글자를 읽으려고 권한 하나마다 마우스를 올리게 된다 */}
            <FormRow label="권한">
              <div className="grid w-full gap-x-6 lg:grid-cols-2">
                {permissionIds.map((p) => {
                  const on = perms.includes(p);
                  return (
                    <label
                      key={p}
                      className="flex min-w-0 items-center gap-2 border-b border-(--a2-line) py-1.5"
                      title={p}
                    >
                      <input type="checkbox" checked={on} onChange={() => toggle(p)} />
                      <span
                        className={`truncate a2-t-sm ${on ? "font-semibold text-(--a2-ink)" : "text-(--a2-ink-4)"}`}
                      >
                        {permissionLabel[p]}
                      </span>
                      <span className="a2-mono truncate a2-t-xs text-(--a2-ink-4) max-sm:hidden">
                        {p}
                      </span>
                    </label>
                  );
                })}
              </div>
            </FormRow>
          </div>
        </Panel>

        {/* 걸러진 까닭은 저장 줄이 적는다. 칸이 없어진 화면에서 붉은 줄 하나를 따로
            세우면 그것이 다시 곁들이는 말이 되고, 무엇보다 저장을 누른 자리에서
            멀어진다 */}
        <PageSaveBar
          dirty={draft.dirty}
          onSave={save}
          onCancel={draft.reset}
          disabled={locked}
          note={
            err ??
            (locked ? "운영자 계정·권한 관리를 든 활성 계정이 이 하나뿐입니다." : undefined)
          }
        />
      </Body>

      <LeaveDialog guard={guard} />
    </>
  );
}
