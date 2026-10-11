"use client";

import Link from "next/link";
import { dutyLabel, expertDuties, type ExpertDuty } from "@/lib/expertAccounts";
import { designLinks } from "@/lib/designScreens";
import DataTable, { type Col } from "@/components/admin2/DataTable";
import { Body, DescList, PageHead, Panel, Status, Tab, Tag } from "@/components/admin2/ui";
import type { Tone } from "@/lib/admin2";
import ConsoleFrame, { ConsoleDialog } from "../ConsoleFrame";

/**
 * 가입 승인 — 전문가 신청을 승인하며 권한을 준다
 * (실제 주소 /admin2/approvals · /admin2/approvals/[id]) — 디자인.
 *
 * 콘솔에서 일할 사람을 운영자가 등록하는 화면은 없다. 사이트에서 전문가로 가입한 사람의 신청이
 * 여기에 쌓이고, **최상위 관리자가 승인하면서 권한(출제자 · 검토자 · 진단 위원 · 상담사)을
 * 고른다.** 권한은 승인한 뒤에도 같은 화면에서 고친다.
 *
 * 목록 → 줄을 눌러 상세. 상세에는 신청 내용 · 전문가 권한 · (처리한 뒤) 처리 결과 · 기록이
 * 차례로 선다. 승인과 반려는 창에서 사유를 고르고 한 번 더 확인한다.
 *
 * 실제 화면(app/(admin2)/admin2/approvals)과 같은 모양이고, 값만 예시로 넣었다.
 */

const to = designLinks("approvals");
const AT = "/admin2/approvals";
const noop = () => {};

type RowState = "pending" | "approved" | "rejected";

type Row = {
  id: string;
  name: string;
  /** 가입 수단 — 간편가입이면 제공자, 아이디 가입이면 아이디 */
  via: string;
  loginId?: string;
  at: string;
  state: RowState;
  duties: ExpertDuty[];
};

const rows: Row[] = [
  { id: "EX-2610-004", name: "한지수", via: "아이디 가입", loginId: "jisu_han", at: "2026-10-11 09:40", state: "pending", duties: [] },
  { id: "EX-2610-003", name: "오세린", via: "카카오 간편가입", at: "2026-10-07 18:42", state: "pending", duties: [] },
  { id: "EX-2610-002", name: "송준영", via: "아이디 가입", loginId: "song_jy", at: "2026-10-07 11:05", state: "pending", duties: [] },
  { id: "EX-2609-005", name: "문가람", via: "네이버 간편가입", at: "2026-09-25 16:30", state: "rejected", duties: [] },
  { id: "EX-2609-004", name: "서민정", via: "아이디 가입", loginId: "seo_mj", at: "2026-09-22 10:12", state: "approved", duties: ["grader", "counselor"] },
  { id: "EX-2609-003", name: "윤대현", via: "아이디 가입", loginId: "yoon_dh", at: "2026-09-19 14:08", state: "approved", duties: ["reviewer"] },
  { id: "EX-2609-002", name: "최은비", via: "구글 간편가입", at: "2026-09-18 11:47", state: "approved", duties: ["author"] },
  { id: "EX-2609-001", name: "김지원", via: "아이디 가입", loginId: "expert_kim", at: "2026-09-18 10:20", state: "approved", duties: ["grader", "counselor"] },
];

const stateLabel: Record<RowState, string> = { pending: "대기", approved: "승인됨", rejected: "반려됨" };
const stateTone: Record<RowState, Tone> = { pending: "warn", approved: "ok", rejected: "danger" };

const cols: Col<Row>[] = [
  {
    key: "id",
    head: "신청 ID",
    width: "8.5rem",
    nowrap: true,
    value: (r) => r.id,
    cell: (r) => <span className="a2-mono">{r.id}</span>,
  },
  {
    key: "name",
    head: "신청자",
    width: "6rem",
    nowrap: true,
    value: (r) => r.name,
    /* 줄을 누르면 이 링크가 대신 눌린다 */
    cell: (r) => (
      <Link
        href={to(r.state === "approved" ? "EX-2610-004/approved" : r.state === "rejected" ? "EX-2610-004/rejected" : "EX-2610-004")}
        className="font-semibold text-(--a2-ink)"
      >
        {r.name}
      </Link>
    ),
  },
  {
    key: "via",
    head: "가입 수단",
    nowrap: true,
    value: (r) => `${r.via} ${r.loginId ?? ""}`,
    cell: (r) => (
      <span className="a2-t-sm text-(--a2-ink-2)">
        {r.via}
        {r.loginId && <span className="a2-mono"> · {r.loginId}</span>}
      </span>
    ),
  },
  {
    key: "duties",
    head: "권한",
    width: "11rem",
    nowrap: true,
    value: (r) => r.duties.map(dutyLabel).join(" "),
    cell: (r) =>
      r.duties.length ? (
        <span className="inline-flex items-center gap-2">
          {r.duties.map((d) => (
            <Tag key={d}>{dutyLabel(d)}</Tag>
          ))}
        </span>
      ) : (
        <span className="a2-t-sm text-(--a2-ink-4)">—</span>
      ),
  },
  {
    key: "at",
    head: "신청 시각",
    width: "9.5rem",
    nowrap: true,
    value: (r) => r.at,
    cell: (r) => <span className="a2-mono a2-t-sm">{r.at}</span>,
  },
  {
    key: "state",
    head: "처리 상태",
    width: "6rem",
    nowrap: true,
    value: (r) => stateLabel[r.state],
    cell: (r) => <Status tone={stateTone[r.state]}>{stateLabel[r.state]}</Status>,
  },
];

export default function Approvals({ state }: { state: string }) {
  if (state === "" || state === "empty" || state === "approved") return <List slug={state} />;
  return <Detail slug={state.replace(/^EX-2610-004\/?/, "")} />;
}

/* ───────────────────────── 목록 ───────────────────────── */

function List({ slug }: { slug: string }) {
  const empty = slug === "empty";
  const all = empty ? rows.filter((r) => r.state !== "pending") : rows;
  const tab: RowState = slug === "approved" ? "approved" : "pending";
  const shown = all.filter((r) => r.state === tab);
  const count = (s: RowState) => all.filter((r) => r.state === s).length;

  return (
    <ConsoleFrame at={AT}>
      <PageHead
        title="가입 승인"
        tabsLabel="처리 상태별 조회 조건"
        tabs={
          <>
            <Tab label="대기" count={count("pending")} active={tab === "pending"} onClick={noop} />
            <Tab label="승인됨" count={count("approved")} active={tab === "approved"} onClick={noop} />
            <Tab label="반려됨" count={count("rejected")} active={false} onClick={noop} />
            <Tab label="전체" count={all.length} active={false} onClick={noop} />
          </>
        }
      />
      <DataTable
        rows={shown}
        cols={tab === "pending" ? cols.filter((c) => c.key !== "duties") : cols}
        getKey={(r) => r.id}
        rowLink
        searchHint="신청자 · 신청 ID · 아이디"
        showCount={false}
        empty="대기 중인 신청이 없습니다. 들어온 신청을 모두 처리했습니다."
      />
    </ConsoleFrame>
  );
}

/* ───────────────────────── 상세 ───────────────────────── */

type DetailSlug = "" | "picked" | "conflict" | "approve" | "approved" | "edit" | "reject" | "rejected";

const granted: ExpertDuty[] = ["author", "counselor"];

function Detail({ slug }: { slug: string }) {
  const s = slug as DetailSlug;
  const row = rows[0];
  const approved = s === "approved" || s === "edit";
  const rejected = s === "rejected";
  const done = approved || rejected;

  const picked: ExpertDuty[] =
    s === "" || s === "reject"
      ? []
      : s === "conflict"
        ? ["author", "reviewer"]
        : s === "edit"
          ? ["author", "grader", "counselor"]
          : granted;
  const canApprove = picked.length > 0;
  const conflict = picked.includes("author") && picked.includes("reviewer");

  const log = approved
    ? [
        { at: "2026-10-12 10:05", what: "가입 승인", why: `전문가단 추천으로 경력 확인 완료 · 권한 ${granted.map(dutyLabel).join(" · ")}`, by: "박서준" },
      ]
    : rejected
      ? [{ at: "2026-10-12 14:20", what: "가입 반려", why: "경력이 확인되지 않음 — 적어 주신 소속에 확인했으나 재직 기록을 찾지 못했습니다.", by: "박서준" }]
      : [];

  return (
    <ConsoleFrame at={AT}>
      <PageHead
        title={row.name}
        back={
          <Link href={to()} className="a2-btn">
            ← 이전으로
          </Link>
        }
        actions={
          <>
            <span className="mr-1 flex items-center gap-1.5">
              <span className="a2-t-xs text-(--a2-ink-4)">처리 상태</span>
              <Status tone={stateTone[rejected ? "rejected" : approved ? "approved" : "pending"]}>
                {stateLabel[rejected ? "rejected" : approved ? "approved" : "pending"]}
              </Status>
            </span>
            {done ? (
              <span className="a2-t-xs text-(--a2-ink-4)">
                {approved ? "2026-10-12 10:05" : "2026-10-12 14:20"} · 박서준
              </span>
            ) : (
              <>
                {canApprove ? (
                  <Link href={to("EX-2610-004/approve")} className="a2-btn a2-btn-primary">
                    승인
                  </Link>
                ) : (
                  <button type="button" className="a2-btn a2-btn-primary" disabled title="전문가 권한을 하나 이상 골라 주세요">
                    승인
                  </button>
                )}
                <Link href={to("EX-2610-004/reject")} className="a2-btn a2-btn-danger">
                  반려
                </Link>
              </>
            )}
          </>
        }
      />

      <Body>
        <div className="grid gap-3">
          <Panel title="신청 내용" meta="전문가">
            <DescList
              rows={[
                { k: "신청 ID", v: <span className="a2-mono">{row.id}</span> },
                { k: "종류", v: <Tag>전문가</Tag> },
                { k: "신청자", v: <span className="font-semibold">{row.name}</span> },
                {
                  k: "가입 수단",
                  v: (
                    <>
                      아이디 가입 · <span className="a2-mono">{row.loginId}</span>
                    </>
                  ),
                },
                {
                  k: "본인인증",
                  v: (
                    <>
                      휴대폰 본인인증 완료 · <span className="a2-mono">010-****-2291</span> · 만 34세
                    </>
                  ),
                },
                { k: "신청 시각", v: <span className="a2-mono">{row.at}</span> },
              ]}
            />
            <p className="a2-hint mt-2">
              가입할 때는 계정 · 이름 · 휴대폰 본인인증만 받습니다. 소속과 경력은 운영진이 따로 확인하고,
              사진 · 연혁 · 소개는 승인된 뒤 본인이 「내 정보」에서 채웁니다.
            </p>
          </Panel>

          {!rejected && (
            <Panel
              title="전문가 권한"
              meta={approved ? "승인 뒤에도 고칠 수 있습니다" : "승인과 함께 부여됩니다"}
              actions={
                approved ? (
                  s === "edit" ? (
                    <Link href={to("EX-2610-004/approved")} className="a2-btn a2-btn-primary">
                      권한 저장
                    </Link>
                  ) : (
                    <button type="button" className="a2-btn a2-btn-primary" disabled>
                      권한 저장
                    </button>
                  )
                ) : undefined
              }
            >
              <ul className="grid gap-1.5 sm:grid-cols-2">
                {expertDuties.map((d) => {
                  const on = picked.includes(d.id);
                  return (
                    <li key={d.id}>
                      <label
                        className="flex h-full cursor-pointer items-start gap-2.5 rounded-[6px] border px-3 py-2.5"
                        style={{
                          borderColor: on ? "var(--a2-accent)" : "var(--a2-line)",
                          background: on ? "var(--a2-accent-soft)" : "transparent",
                        }}
                      >
                        <input type="checkbox" className="mt-[3px]" defaultChecked={on} />
                        <span className="min-w-0">
                          <span className="flex flex-wrap items-center gap-1.5 a2-t-sm font-semibold text-(--a2-ink)">
                            {d.label}
                            {s === "edit" && d.id === "grader" && (
                              <span className="a2-t-xs font-bold" style={{ color: "var(--a2-warn)" }}>
                                새로 추가
                              </span>
                            )}
                          </span>
                          <span className="mt-0.5 block a2-t-xs text-(--a2-ink-3)">{d.desc}</span>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>

              {picked.length === 0 && (
                <p className="a2-hint mt-2">
                  권한을 하나 이상 골라야 승인할 수 있습니다. 맡길 일이 없으면 반려합니다.
                </p>
              )}
              {conflict && (
                <p className="a2-note mt-2" style={{ borderLeftColor: "var(--a2-warn)" }}>
                  <span>
                    출제자와 검토자를 함께 주면 자기가 낸 문항을 자기가 검토할 수 있게 됩니다. 문항 배정에서
                    본인 출제분이 배정되지 않게 해 주세요.
                  </span>
                </p>
              )}
              {picked.includes("counselor") && (
                <p className="a2-hint mt-2">
                  상담사 권한을 주면 보호자의 면담 신청 목록에 이 전문가가 표시됩니다. 근무 요일·시간과 면담
                  비용은{" "}
                  <Link href="/admin2/counselors" className="underline">
                    상담사 관리
                  </Link>
                  에서 정합니다.
                </p>
              )}
              {s === "edit" && (
                <p className="a2-hint mt-2">
                  「권한 저장」을 누르면 바로 적용됩니다. 이 전문가가 로그인해 있으면 메뉴에 「진단 채점」이
                  곧바로 나타납니다.
                </p>
              )}
            </Panel>
          )}

          {done && (
            <Panel title="처리 결과" meta={`${approved ? "2026-10-12 10:05" : "2026-10-12 14:20"} · 박서준`}>
              <DescList
                rows={[
                  {
                    k: "결론",
                    v: (
                      <Status tone={stateTone[approved ? "approved" : "rejected"]}>
                        {stateLabel[approved ? "approved" : "rejected"]}
                      </Status>
                    ),
                  },
                  {
                    k: "사유",
                    v: approved
                      ? "전문가단 추천으로 경력 확인 완료"
                      : "경력이 확인되지 않음 — 적어 주신 소속에 확인했으나 재직 기록을 찾지 못했습니다.",
                  },
                  ...(approved ? [{ k: "지금 권한", v: granted.map(dutyLabel).join(" · ") }] : []),
                ]}
              />
              <p className="a2-hint mt-2">
                처리한 건은 되돌리지 않습니다. 잘못 눌렀다면 회원 상세에서 계정을 정지하거나, 신청자에게
                다시 신청을 받습니다.
              </p>
            </Panel>
          )}

          <Panel title="기록" meta={`${log.length}건`}>
            {log.length === 0 ? (
              <p className="a2-t-sm text-(--a2-ink-3)">아직 이 신청에 대한 기록이 없습니다.</p>
            ) : (
              <ul className="grid gap-1.5">
                {log.map((r) => (
                  <li
                    key={r.at}
                    className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 border-b border-(--a2-line) pb-1.5 last:border-b-0 last:pb-0"
                  >
                    <span className="a2-mono a2-t-xs text-(--a2-ink-4)">{r.at}</span>
                    <Tag accent>{r.what}</Tag>
                    <span className="a2-t-sm text-(--a2-ink-2)">{r.why}</span>
                    <span className="ml-auto a2-t-xs text-(--a2-ink-4)">{r.by}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </Body>

      {s === "approve" && (
        <ConsoleDialog
          title={`${row.name} · ${row.id} 신청을 승인합니다`}
          actions={
            <>
              <Link href={to("EX-2610-004/picked")} className="a2-btn">
                취소
              </Link>
              <Link href={to("EX-2610-004/approved")} className="a2-btn a2-btn-primary">
                네, 승인합니다
              </Link>
            </>
          }
        >
          <ul className="grid gap-0.5">
            <li>전문가 계정이 열리고 신청자에게 안내 메일이 나갑니다.</li>
            <li>승인한 사람과 시각, 사유가 기록에 남습니다.</li>
            <li>
              부여하는 권한 — <b className="text-(--a2-ink)">{granted.map(dutyLabel).join(" · ")}</b>
            </li>
          </ul>
          <div className="mt-3 grid gap-2">
            <label className="a2-field block">
              <span className="a2-label">사유 (기본값 그대로 두셔도 됩니다)</span>
              <select className="a2-select" defaultValue="전문가단 추천으로 경력 확인 완료">
                <option>전문가단 추천으로 경력 확인 완료</option>
                <option>유선으로 소속 확인 완료</option>
                <option>제출 증빙 확인 완료</option>
              </select>
            </label>
            <label className="a2-field block">
              <span className="a2-label">덧붙일 말 (선택)</span>
              <input className="a2-input" defaultValue="" placeholder="적지 않으셔도 됩니다" />
            </label>
          </div>
          <p className="a2-hint mt-2">
            기록에는 이렇게 남습니다 — <b className="text-(--a2-ink)">전문가단 추천으로 경력 확인 완료</b>
          </p>
        </ConsoleDialog>
      )}

      {s === "reject" && (
        <ConsoleDialog
          title={`${row.name} · ${row.id} 신청을 반려합니다`}
          actions={
            <>
              <Link href={to("EX-2610-004")} className="a2-btn">
                취소
              </Link>
              <Link href={to("EX-2610-004/rejected")} className="a2-btn a2-btn-danger">
                네, 반려합니다
              </Link>
            </>
          }
        >
          <ul className="grid gap-0.5">
            <li>계정이 열리지 않고 신청자에게 반려 사유가 나갑니다.</li>
            <li>반려한 사람과 시각, 사유가 기록에 남습니다.</li>
            <li>신청자는 다시 신청할 수 있습니다.</li>
          </ul>
          <div className="mt-3 grid gap-2">
            <label className="a2-field block">
              <span className="a2-label">사유</span>
              <select className="a2-select" defaultValue="경력이 확인되지 않음">
                <option>경력이 확인되지 않음</option>
                <option>신청 정보가 사실과 다름</option>
                <option>지금은 모집하지 않는 분야</option>
                <option>본인 확인 실패</option>
              </select>
            </label>
            <label className="a2-field block">
              <span className="a2-label">덧붙일 말 (선택)</span>
              <input
                className="a2-input"
                defaultValue="적어 주신 소속에 확인했으나 재직 기록을 찾지 못했습니다."
              />
            </label>
          </div>
          <p className="a2-hint mt-2">
            기록에는 이렇게 남습니다 —{" "}
            <b className="text-(--a2-ink)">
              경력이 확인되지 않음 — 적어 주신 소속에 확인했으나 재직 기록을 찾지 못했습니다.
            </b>
          </p>
        </ConsoleDialog>
      )}
    </ConsoleFrame>
  );
}
