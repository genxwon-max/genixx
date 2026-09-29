"use client";

import Link from "next/link";
import { useState } from "react";
import { recordAction, useAdminPrefs } from "@/lib/adminStore";
import { useHydrated } from "@/lib/examStore";
import {
  allScreens,
  removeScreenRole,
  saveScreenRole,
  screenGroups,
  setScreenPreview,
  useScreenAccess,
  type ScreenRole,
} from "@/lib/screenAccessStore";
import { Body, FormRow, PageHead, Panel } from "@/components/admin2/ui";

/**
 * ADM-03-2 화면 권한.
 *
 * 왼쪽(넓은 화면에서는 위)에 만든 묶음 목록, 오른쪽에 고르는 판. 「새 권한」을 누르면 빈 판이,
 * 목록의 줄을 누르면 그 묶음이 판에 펴진다. 판은 콘솔 기둥을 그대로 옮겨 그룹째 체크한다 —
 * 기둥에서 보던 이름 그대로여야 「어느 화면을 열어 줄지」를 바로 고른다.
 *
 * 「이 권한으로 보기」를 누르면 지금 콘솔이 그 묶음을 받은 사람의 콘솔로 바뀐다(기둥이
 * 좁아지고, 고르지 않은 화면은 열리지 않는다). 위 띠의 「미리보기 끝내기」로 돌아온다.
 */
export default function ScreenRolesView() {
  const hydrated = useHydrated();
  const { roles, assign, preview } = useScreenAccess();
  const by = useAdminPrefs().staffName || "운영자";

  /* 판에 편 묶음 — "new"면 새로 만드는 중 */
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const current = editing && editing !== "new" ? roles.find((r) => r.id === editing) : undefined;

  const holders = (id: string) => Object.values(assign).filter((v) => v === id).length;

  return (
    <>
      <PageHead
        title="화면 권한"
        back={
          <Link href="/admin2/staff" className="a2-btn">
            ← 운영자·권한
          </Link>
        }
        actions={
          <button type="button" className="a2-btn a2-btn-primary" onClick={() => setEditing("new")}>
            새 권한 만들기
          </button>
        }
      />

      <Body className="grid gap-3 xl:grid-cols-[minmax(0,17rem)_1fr]">
        <Panel title="만든 권한" meta={hydrated ? `${roles.length}개` : undefined} flush>
          {!hydrated ? null : roles.length === 0 ? (
            <p className="px-3 py-6 text-center a2-t-sm text-(--a2-ink-4)">
              아직 만든 권한이 없습니다. 「새 권한 만들기」로 시작하세요.
            </p>
          ) : (
            <ul className="divide-y divide-(--a2-line)">
              {roles.map((r) => {
                const on = editing === r.id;
                return (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => setEditing(r.id)}
                      className={`flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors ${
                        on ? "bg-(--a2-accent-soft)" : "hover:bg-(--a2-hover)"
                      }`}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate a2-t-sm font-semibold text-(--a2-ink)">
                          {r.name}
                        </span>
                        <span className="a2-t-xs text-(--a2-ink-4)">
                          화면 {r.screens.length}개 · 받은 운영자 {holders(r.id)}명
                        </span>
                      </span>
                      {preview === r.id && (
                        <span className="a2-t-xs font-semibold text-(--a2-accent)">미리보는 중</span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        {editing ? (
          <Editor
            key={editing}
            role={current}
            preview={preview}
            onSaved={(r) => {
              recordAction(r.name, editing === "new" ? "화면 권한 생성" : "화면 권한 변경", `화면 ${r.screens.length}개`, by);
              setEditing(r.id);
            }}
            onRemoved={(r) => {
              recordAction(r.name, "화면 권한 삭제", "", by);
              setEditing(null);
            }}
          />
        ) : (
          <Panel title="권한 편집">
            <p className="a2-t-sm text-(--a2-ink-3)">
              왼쪽에서 권한을 고르거나 「새 권한 만들기」를 누르세요. 만든 권한은{" "}
              <Link href="/admin2/staff" className="text-(--a2-accent) hover:underline">
                운영자 상세
              </Link>
              에서 운영자에게 줍니다.
            </p>
          </Panel>
        )}
      </Body>
    </>
  );
}

function Editor({
  role,
  preview,
  onSaved,
  onRemoved,
}: {
  role?: ScreenRole;
  preview: string | null;
  onSaved: (r: ScreenRole) => void;
  onRemoved: (r: ScreenRole) => void;
}) {
  const [name, setName] = useState(role?.name ?? "");
  /* 새 권한은 대시보드 하나만 켠 채로 연다 — 빈 채로 두면 받은 사람이 들어와 설 자리가 없다 */
  const [screens, setScreens] = useState<string[]>(role?.screens ?? ["/admin2"]);
  const [err, setErr] = useState<string | null>(null);

  const flip = (href: string) =>
    setScreens((v) => (v.includes(href) ? v.filter((x) => x !== href) : [...v, href]));

  const save = () => {
    if (!name.trim()) return setErr("권한 이름을 적어 주세요.");
    if (screens.length === 0) return setErr("화면을 하나 이상 골라 주세요.");
    setErr(null);
    onSaved(saveScreenRole({ id: role?.id, name, screens }));
  };

  const dirty =
    !role ||
    role.name !== name.trim() ||
    role.screens.length !== screens.length ||
    role.screens.some((s) => !screens.includes(s));

  return (
    <Panel
      title={role ? role.name : "새 권한"}
      actions={
        role && (
          <>
            <button
              type="button"
              className="a2-btn a2-btn-sm"
              onClick={() => setScreenPreview(preview === role.id ? null : role.id)}
            >
              {preview === role.id ? "미리보기 끝내기" : "이 권한으로 보기"}
            </button>
            <button
              type="button"
              className="a2-btn a2-btn-sm a2-btn-danger"
              onClick={() => {
                if (!confirm(`「${role.name}」 권한을 지웁니다. 받은 운영자는 콘솔에 들어오지 못합니다.`)) return;
                removeScreenRole(role.id);
                onRemoved(role);
              }}
            >
              삭제
            </button>
          </>
        )
      }
      flush
    >
      <div className="a2-form">
        <FormRow label="권한 이름" req>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예) 고객지원팀"
            className="a2-input w-full max-w-sm"
          />
        </FormRow>

        <FormRow
          label="들어갈 수 있는 화면"
          req
          hint="고른 화면만 콘솔 왼쪽 메뉴에 보이고, 고르지 않은 화면은 주소로도 열리지 않습니다."
        >
          <div className="grid w-full gap-x-6 gap-y-4 sm:grid-cols-2 2xl:grid-cols-3">
            {screenGroups.map((g) => {
              const hrefs = g.items.map((it) => it.href);
              const all = hrefs.every((h) => screens.includes(h));
              const some = !all && hrefs.some((h) => screens.includes(h));
              return (
                <fieldset key={g.label} className="min-w-0">
                  <legend className="w-full border-b border-(--a2-line) pb-1">
                    <label className="flex items-center gap-2 a2-t-sm font-bold text-(--a2-ink)">
                      <input
                        type="checkbox"
                        checked={all}
                        ref={(el) => {
                          if (el) el.indeterminate = some;
                        }}
                        onChange={() =>
                          setScreens((v) =>
                            all ? v.filter((x) => !hrefs.includes(x)) : [...new Set([...v, ...hrefs])],
                          )
                        }
                      />
                      {g.label}
                    </label>
                  </legend>
                  <ul className="mt-1">
                    {g.items.map((it) => (
                      <li key={it.href}>
                        <label className="flex items-center gap-2 whitespace-nowrap py-1 pl-5 a2-t-sm">
                          <input
                            type="checkbox"
                            checked={screens.includes(it.href)}
                            onChange={() => flip(it.href)}
                          />
                          <span
                            className={
                              screens.includes(it.href) ? "text-(--a2-ink)" : "text-(--a2-ink-4)"
                            }
                          >
                            {it.label}
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </fieldset>
              );
            })}
          </div>
        </FormRow>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-(--a2-line) px-3 py-2.5">
        {err && <span className="mr-auto a2-t-sm text-(--a2-danger)">{err}</span>}
        <span className="a2-t-xs text-(--a2-ink-4)">
          {screens.length} / {allScreens.length}개 화면
        </span>
        <button
          type="button"
          className="a2-btn a2-btn-sm"
          onClick={() => setScreens(screens.length === allScreens.length ? [] : allScreens)}
        >
          {screens.length === allScreens.length ? "모두 해제" : "모두 선택"}
        </button>
        <button type="button" className="a2-btn a2-btn-primary" disabled={!dirty} onClick={save}>
          {role ? "저장" : "권한 만들기"}
        </button>
      </div>
    </Panel>
  );
}
