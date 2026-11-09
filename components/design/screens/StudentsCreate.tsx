"use client";

import Link from "next/link";
import { useState } from "react";
import { studentAccountTone } from "@/lib/admin2";
import { students, userStateLabel, type StudentRow } from "@/lib/adminUsers";
import { gradeValue } from "@/lib/childOptions";
import { designLinks } from "@/lib/designScreens";
import GradeOptions from "@/components/GradeOptions";
import DataTable, { type Col } from "@/components/admin2/DataTable";
import { PageHead, Status, Tab } from "@/components/admin2/ui";
import ConsoleFrame from "../ConsoleFrame";

/**
 * 학생·접속코드 (실제 주소 /admin2/students) — 관리자가 학생을 직접 만드는 길 둘을 얹은 시안
 * (/design3, 2026-11-09 사용자 요청).
 *
 * 지금은 학생을 보호자나 교사만 등록한다. 이번에는 설문에 응한 사람에 한해 학생 이름 · 생년월일 · 학교를
 * 받으므로, 관리자가 그 명단으로 학생을 만들고 접속코드를 내준다.
 *
 *   한 명씩      「학생 등록」 창 — 이름 · 생년월일 · 학교 · 학년 · 등록 경로. 접속코드는 저장할 때 자동으로 만든다
 *   명단 파일    「명단 파일로 등록」 — 양식 내려받기 → 파일 올리기 → 명단 확인(틀린 칸 · 이미 있는 학생 의심) →
 *                등록 → 접속코드 명단 내려받기
 *
 * 보호자 연결은 고르는 항목이다(연결 안 함 · 있는 보호자 찾기 · 새 보호자 만들기). 꼭 필요하면 설문으로 보호자
 * 하나를 만들어 잇는다는 사용자 말대로, 기본은 「연결 안 함」이다. 새 보호자를 만들면 그 보호자도 회원 명부에 선다.
 *
 * 저장소를 읽지 않는다. 목록은 운영 콘솔의 예시 명부(lib/adminUsers.ts students), 창 안의 값과 올린 명단은
 * 이 파일에 적은 값이다. 단추는 다음 상태의 주소로만 이어진다.
 */

const to = designLinks("admin-students-create");

/* ───────────────────────── 목록 ───────────────────────── */

const cols: Col<StudentRow>[] = [
  { key: "id", head: "학생 ID", width: "6rem", nowrap: true, value: (s) => s.id, cell: (s) => <span className="a2-mono">{s.id}</span> },
  {
    key: "name",
    head: "이름",
    width: "5rem",
    nowrap: true,
    value: (s) => s.name,
    cell: (s) => <span className="font-semibold text-(--a2-ink)">{s.name}</span>,
  },
  { key: "code", head: "접속코드", width: "6.5rem", nowrap: true, value: (s) => s.code, cell: (s) => <span className="a2-mono">{s.code}</span> },
  { key: "school", head: "학교", width: "11rem", clip: true, value: (s) => s.school, cell: (s) => s.school },
  { key: "grade", head: "학년", width: "4rem", nowrap: true, value: (s) => s.grade, cell: (s) => s.grade },
  {
    key: "guardian",
    head: "보호자",
    width: "10rem",
    nowrap: true,
    value: (s) => s.guardian,
    cell: (s) =>
      s.guardian ? (
        <span className="inline-flex items-baseline gap-1.5">
          {s.guardian}
          <span className="a2-mono a2-t-xs text-(--a2-ink-4)">{s.guardianId}</span>
        </span>
      ) : (
        <span className="text-(--a2-ink-4)">연결 안 함</span>
      ),
  },
  {
    key: "state",
    head: "계정 상태",
    width: "5.5rem",
    nowrap: true,
    value: (s) => userStateLabel[s.state].label,
    cell: (s) => <Status tone={studentAccountTone[s.state]}>{userStateLabel[s.state].label}</Status>,
  },
  { key: "joinedAt", head: "등록일", width: "6rem", nowrap: true, value: (s) => s.joinedAt, cell: (s) => <span className="a2-mono a2-t-sm">{s.joinedAt}</span> },
];

/**
 * 명단 파일로 방금 만든 학생 — 명단 확인 창(LINES)에서 등록 가능한 아홉 줄 그대로. 이수아만 보호자 칸이 있어 잇고,
 * 나머지는 보호자 없이 만든다. 최근에 만든 학생이 위에 선다
 */
const addedRows = (): StudentRow[] =>
  LINES.filter((l) => !l.error && !l.dup)
    .map((l, i) => ({
      id: `S-2090${String(i + 1).padStart(2, "0")}`,
      name: l.name,
      code: l.code.replace("-", ""),
      school: l.school,
      grade: l.grade,
      guardian: l.guardian ? l.guardian.split(" · ")[0] : "",
      guardianId: l.guardian ? "M-190402" : "",
      exam: "not-started" as const,
      attempts: 0,
      state: "active" as const,
      joinedAt: "2026-11-09",
    }))
    .reverse();

function List({ fresh = false }: { fresh?: boolean }) {
  const rows = fresh ? [...addedRows(), ...students] : students;
  return (
    <>
      <PageHead
        title="학생·접속코드"
        actions={
          <>
            <Link href={to("bulk")} className="a2-btn">
              명단 파일로 등록
            </Link>
            <Link href={to("new")} className="a2-btn a2-btn-primary">
              + 학생 등록
            </Link>
          </>
        }
        tabsLabel="응시 상태별 조회 조건"
        tabs={<Tab label="전체" count={String(rows.length)} active onClick={() => {}} />}
      />
      {fresh && (
        <p className="a2-note mx-3 mt-3" style={{ borderLeftColor: "var(--a2-ok)" }}>
          <span>
            명단 파일로 학생 9명을 등록했습니다. 맨 위 줄이 방금 만든 학생입니다 — 접속코드 명단은 등록 완료 창에서
            내려받았습니다.
          </span>
        </p>
      )}
      <DataTable
        rows={rows}
        cols={cols}
        getKey={(s) => s.id}
        searchHint="이름 · 접속코드 · 학교 · 보호자"
        csv={{ name: "학생_접속코드" }}
        empty="학생이 없습니다."
        showCount={false}
      />
    </>
  );
}

/* ───────────────────────── 창 껍데기 ───────────────────────── */

function Dialog({
  title,
  lead,
  wide = false,
  foot,
  children,
}: {
  title: string;
  lead?: React.ReactNode;
  wide?: boolean;
  foot: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="students-create-title"
        className={`a2-panel flex max-h-[calc(100vh-2rem)] w-full flex-col p-5 ${wide ? "max-w-5xl" : "max-w-xl"}`}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id="students-create-title" className="a2-title">
            {title}
          </h2>
          <Link href={to()} className="a2-btn" aria-label="창 닫기">
            ✕
          </Link>
        </div>
        {lead && <p className="mt-2 a2-t-sm text-(--a2-ink-2)">{lead}</p>}
        <div className="mt-4 min-h-0 flex-1 overflow-y-auto">{children}</div>
        <div className="mt-5 flex flex-wrap items-center justify-end gap-1.5">{foot}</div>
      </div>
    </div>
  );
}

/* ───────────────────────── 한 명씩 ───────────────────────── */

type Link3 = "none" | "find" | "new";

type OneView = {
  name: string;
  birth: string;
  school: string;
  grade: string;
  source: string;
  link: Link3;
  guardian?: { name: string; phone: string };
};

const blankOne: OneView = { name: "", birth: "", school: "", grade: "", source: "survey", link: "none" };
const filledOne: OneView = {
  name: "정하린",
  birth: "2016-05-14",
  school: "서울 목동초등학교",
  grade: "초4",
  source: "survey",
  link: "none",
};

/** 저장할 때 만들어 줄 접속코드 — 창에는 미리 보여 주고, 「다시 만들기」로 바꿀 수 있다 */
const NEXT_CODES = ["R7KD-M2QP", "H3VW-9NTB", "Q8ZE-4LKC"];

function OneForm({ view }: { view: OneView }) {
  const [v, setV] = useState(view);
  const [codeAt, setCodeAt] = useState(0);
  const set = <K extends keyof OneView>(k: K, val: OneView[K]) => setV((p) => ({ ...p, [k]: val }));
  const ready = v.name && v.birth && v.school && v.grade && (v.link !== "new" || (v.guardian?.name && v.guardian.phone));

  return (
    <Dialog
      title="학생 등록"
      lead="설문으로 받은 학생 정보로 학생을 만듭니다. 접속코드는 저장할 때 자동으로 만들어지고, 학생은 그 코드로 들어옵니다."
      foot={
        <>
          <Link href={to()} className="a2-btn">
            취소
          </Link>
          {ready ? (
            <Link href={to("new/done")} className="a2-btn a2-btn-primary">
              등록하고 접속코드 만들기
            </Link>
          ) : (
            <button type="button" className="a2-btn a2-btn-primary" disabled>
              등록하고 접속코드 만들기
            </button>
          )}
        </>
      }
    >
      <div className="grid gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1">
            <span className="a2-label">이름 *</span>
            <input className="a2-input" value={v.name} placeholder="예: 정하린" onChange={(e) => set("name", e.target.value)} />
          </label>
          <label className="grid gap-1">
            <span className="a2-label">생년월일 *</span>
            <input className="a2-input a2-num" type="date" value={v.birth} onChange={(e) => set("birth", e.target.value)} />
          </label>
          <label className="grid gap-1">
            <span className="a2-label">학교 *</span>
            <input className="a2-input" value={v.school} placeholder="예: 서울 목동초등학교" onChange={(e) => set("school", e.target.value)} />
          </label>
          <label className="grid gap-1">
            <span className="a2-label">학년 *</span>
            <select className="a2-select" value={v.grade} onChange={(e) => set("grade", e.target.value)}>
              <option value="">고르세요</option>
              <GradeOptions valueOf={gradeValue.short} />
            </select>
          </label>
        </div>

        <div className="grid gap-1">
          <span className="a2-label">등록 경로</span>
          <div role="radiogroup" className="flex flex-wrap gap-x-5 gap-y-1">
            {[
              ["survey", "설문 응답 — 2026 가을 학부모 설문"],
              ["direct", "직접 등록 — 전화 · 방문 문의"],
            ].map(([id, label]) => (
              <label key={id} className="a2-choice">
                <input type="radio" name="source" checked={v.source === id} onChange={() => set("source", id)} />
                {label}
              </label>
            ))}
          </div>
        </div>

        <div className="grid gap-1">
          <span className="a2-label">보호자 연결 — 고르는 항목</span>
          <div role="radiogroup" className="flex flex-wrap gap-x-5 gap-y-1">
            {(
              [
                ["none", "연결 안 함"],
                ["find", "있는 보호자 찾기"],
                ["new", "새 보호자 만들기"],
              ] as [Link3, string][]
            ).map(([id, label]) => (
              <label key={id} className="a2-choice">
                <input type="radio" name="link" checked={v.link === id} onChange={() => set("link", id)} />
                {label}
              </label>
            ))}
          </div>
          {v.link === "none" && (
            <p className="a2-hint">보호자 없이 만듭니다. 결과 리포트와 알림은 보호자를 이은 뒤부터 보호자에게 갑니다.</p>
          )}
          {v.link === "find" && (
            <input className="a2-input mt-1" placeholder="보호자 이름 · 휴대전화 · 회원 ID로 찾기" />
          )}
          {v.link === "new" && (
            <div className="mt-1 grid gap-3 rounded border border-(--a2-line) p-3 sm:grid-cols-2">
              <label className="grid gap-1">
                <span className="a2-label">보호자 이름 *</span>
                <input
                  className="a2-input"
                  value={v.guardian?.name ?? ""}
                  onChange={(e) => set("guardian", { name: e.target.value, phone: v.guardian?.phone ?? "" })}
                />
              </label>
              <label className="grid gap-1">
                <span className="a2-label">보호자 휴대전화 *</span>
                <input
                  className="a2-input a2-num"
                  inputMode="tel"
                  placeholder="010-0000-0000"
                  value={v.guardian?.phone ?? ""}
                  onChange={(e) => set("guardian", { name: v.guardian?.name ?? "", phone: e.target.value })}
                />
              </label>
              <p className="a2-hint sm:col-span-2">
                보호자 회원도 함께 만들어집니다. 보호자에게는 이 번호로 가입 완료 안내가 가고, 첫 로그인 때 비밀번호를 정합니다.
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded border border-dashed border-(--a2-line) px-3 py-2.5">
          <span className="a2-label">만들어질 접속코드</span>
          <span className="a2-mono text-[15px] font-bold tracking-wider text-(--a2-ink)">{NEXT_CODES[codeAt % NEXT_CODES.length]}</span>
          <button type="button" className="a2-btn" onClick={() => setCodeAt((n) => n + 1)}>
            다시 만들기
          </button>
          <span className="a2-hint">헷갈리는 글자(0 · O · 1 · I)는 쓰지 않습니다</span>
        </div>
      </div>
    </Dialog>
  );
}

function OneDone() {
  return (
    <Dialog
      title="학생을 등록했습니다"
      foot={
        <>
          <Link href={to()} className="a2-btn">
            닫기
          </Link>
          <Link href={to("new")} className="a2-btn a2-btn-primary">
            한 명 더 등록
          </Link>
        </>
      }
    >
      <div className="grid gap-3">
        <div className="rounded border border-(--a2-line) p-4 text-center">
          <p className="a2-t-sm text-(--a2-ink-3)">정하린 · 서울 목동초등학교 초4 · 2016-05-14</p>
          <p className="mt-2 a2-mono text-[28px] font-bold tracking-[0.12em] text-(--a2-ink)">R7KD-M2QP</p>
          <p className="mt-1 a2-t-xs text-(--a2-ink-3)">학생 ID S-209001 · 보호자 연결 안 함</p>
          <div className="mt-3 flex justify-center gap-1.5">
            <button type="button" className="a2-btn">
              코드 복사
            </button>
            <button type="button" className="a2-btn">
              안내문 인쇄
            </button>
          </div>
        </div>
        <p className="a2-hint">
          학생은 사이트의 「접속코드로 시작」에서 이 코드를 넣고 들어옵니다. 코드를 잃어버리면 학생 상세에서 다시 낼 수 있습니다.
        </p>
      </div>
    </Dialog>
  );
}

/* ───────────────────────── 명단 파일 ───────────────────────── */

/** 양식의 칸 — 앞의 넷이 필수, 보호자 둘은 이을 때만 */
const COLUMNS: [string, boolean][] = [
  ["이름", true],
  ["생년월일 (YYYY-MM-DD)", true],
  ["학교", true],
  ["학년 (초4 · 중1 …)", true],
  ["보호자 이름", false],
  ["보호자 휴대전화", false],
];

function BulkUpload() {
  return (
    <Dialog
      title="명단 파일로 학생 등록"
      lead="설문 응답자 명단을 양식에 맞춰 올리면 한 줄에 한 명씩 학생을 만들고 접속코드를 냅니다."
      foot={
        <>
          <Link href={to()} className="a2-btn">
            취소
          </Link>
          <button type="button" className="a2-btn a2-btn-primary" disabled>
            명단 확인
          </button>
        </>
      }
    >
      <div className="grid gap-4">
        <div>
          <p className="a2-label">1. 양식 내려받기</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <button type="button" className="a2-btn">
              양식 CSV
            </button>
            <button type="button" className="a2-btn">
              양식 엑셀
            </button>
            <span className="a2-hint">설문 응답 내보내기 파일을 그대로 올려도 칸 이름이 맞으면 읽습니다.</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {COLUMNS.map(([c, req]) => (
              <span key={c} className={`a2-tag ${req ? "a2-tag-accent" : ""}`}>
                {c}
                {req ? " *" : ""}
              </span>
            ))}
          </div>
        </div>

        <div>
          <p className="a2-label">2. 파일 올리기</p>
          <Link
            href={to("bulk/review")}
            className="mt-1.5 flex flex-col items-center justify-center gap-1 rounded border-2 border-dashed border-(--a2-line) px-4 py-8 text-center hover:border-(--a2-accent)"
          >
            <span className="a2-t-sm font-bold text-(--a2-ink)">여기에 파일을 끌어 놓거나 눌러서 고르세요</span>
            <span className="a2-t-xs text-(--a2-ink-3)">CSV · 엑셀(.xlsx) · 한 번에 500줄까지</span>
          </Link>
        </div>

        <p className="a2-hint">
          보호자 칸을 비우면 보호자 없이 만듭니다. 보호자 칸을 채운 줄은 같은 휴대전화의 보호자가 있으면 그 보호자에게 잇고,
          없으면 보호자 회원도 함께 만듭니다.
        </p>
      </div>
    </Dialog>
  );
}

type Line = {
  name: string;
  birth: string;
  school: string;
  grade: string;
  guardian?: string;
  code: string;
  /** 틀린 칸 — 등록에서 빠진다 */
  error?: string;
  /** 이미 있는 학생일 수 있음 — 사람이 고른다 */
  dup?: string;
};

const LINES: Line[] = [
  { name: "정하린", birth: "2016-05-14", school: "서울 목동초등학교", grade: "초4", code: "R7KD-M2QP" },
  { name: "오지후", birth: "2015-09-02", school: "서울 상암초등학교", grade: "초5", code: "T4XN-8HWA" },
  { name: "한서윤", birth: "2017-01-23", school: "경기 분당중앙초등학교", grade: "초3", code: "B9PL-3ZEC" },
  { name: "김도윤", birth: "2016.13.02", school: "서울 목동초등학교", grade: "초4", code: "—", error: "생년월일을 읽을 수 없습니다 (13월)" },
  { name: "이수아", birth: "2014-07-30", school: "인천 송도초등학교", grade: "초6", guardian: "이정민 · 010-2687-4530", code: "W2MF-7RJD" },
  { name: "박시우", birth: "2016-11-11", school: "서울 상암초등학교", grade: "초4", code: "K5HT-9QXB" },
  { name: "최유나", birth: "2015-03-08", school: "부산 해운대초등학교", grade: "초5", code: "N8CV-2PLE" },
  { name: "강민준", birth: "2016-06-19", school: "", grade: "초4", code: "—", error: "학교가 비었습니다" },
  { name: "윤채원", birth: "2017-04-04", school: "경기 분당중앙초등학교", grade: "초3", code: "D3WQ-6KZM" },
  { name: "이서준", birth: "2016-02-17", school: "서울 목동초등학교", grade: "초4", code: "F6YB-4TNH", dup: "같은 이름 · 생년월일의 학생이 있습니다 — 이서준 S-200412" },
  { name: "임지안", birth: "2014-12-01", school: "대전 둔산초등학교", grade: "초6", code: "P9LA-5EWC" },
  { name: "송하준", birth: "2015-08-27", school: "서울 상암초등학교", grade: "초5", code: "U7RK-3MDV" },
];

function BulkReview() {
  const [skipDup, setSkipDup] = useState(true);
  const errors = LINES.filter((l) => l.error).length;
  const dups = LINES.filter((l) => l.dup).length;
  const count = LINES.length - errors - (skipDup ? dups : 0);

  return (
    <Dialog
      wide
      title="명단 확인 — 설문응답_2026가을.xlsx"
      lead={
        <>
          {LINES.length}줄을 읽었습니다. 틀린 줄 <b className="text-(--a2-danger)">{errors}</b> · 이미 있는 학생일 수 있는 줄{" "}
          <b className="text-(--a2-warn)">{dups}</b>. 틀린 줄은 등록에서 빠집니다 — 파일을 고쳐 다시 올리면 그 줄만 더 만들 수 있습니다.
        </>
      }
      foot={
        <>
          <Link href={to("bulk")} className="a2-btn">
            다른 파일 올리기
          </Link>
          <Link href={to("bulk/done")} className="a2-btn a2-btn-primary">
            {count}명 등록하고 접속코드 만들기
          </Link>
        </>
      }
    >
      <div className="a2-table-wrap">
        <table className="a2-table">
          <thead>
            <tr>
              <th scope="col" style={{ width: "2.5rem" }}>
                줄
              </th>
              <th scope="col">이름</th>
              <th scope="col">생년월일</th>
              <th scope="col">학교</th>
              <th scope="col">학년</th>
              <th scope="col">보호자</th>
              <th scope="col">접속코드</th>
              <th scope="col">확인</th>
            </tr>
          </thead>
          <tbody>
            {LINES.map((l, i) => (
              <tr key={l.name + i} style={l.error ? { background: "#fdf2f1" } : l.dup ? { background: "#fff8eb" } : undefined}>
                <td className="a2-num a2-t-sm text-(--a2-ink-3)">{i + 2}</td>
                <td className="a2-nowrap a2-td-key">{l.name}</td>
                <td className="a2-mono a2-nowrap a2-t-sm" style={l.error?.includes("생년월일") ? { color: "var(--a2-danger)", fontWeight: 700 } : undefined}>
                  {l.birth}
                </td>
                <td className="a2-nowrap" style={l.error?.includes("학교") ? { color: "var(--a2-danger)" } : undefined}>
                  {l.school || "(비었음)"}
                </td>
                <td className="a2-nowrap">{l.grade}</td>
                <td className="a2-nowrap a2-t-sm">{l.guardian ?? <span className="text-(--a2-ink-4)">연결 안 함</span>}</td>
                <td className="a2-mono a2-nowrap">{l.code}</td>
                <td className="a2-t-sm">
                  {l.error ? (
                    <Status tone="danger">{l.error}</Status>
                  ) : l.dup ? (
                    <span className="grid gap-1">
                      <Status tone="warn">{l.dup}</Status>
                      <label className="a2-choice">
                        <input type="checkbox" checked={!skipDup} onChange={(e) => setSkipDup(!e.target.checked)} />
                        다른 학생이 맞음 — 그래도 등록
                      </label>
                    </span>
                  ) : (
                    <Status tone="ok">등록 가능</Status>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 a2-hint">
        줄 번호는 파일의 줄 번호입니다(1줄은 칸 이름). 이수아는 보호자 칸이 채워져 있어 보호자 이정민에게 잇습니다 — 같은 휴대전화의 보호자가
        없으면 보호자 회원을 함께 만듭니다.
      </p>
    </Dialog>
  );
}

function BulkDone() {
  return (
    <Dialog
      title="학생 9명을 등록했습니다"
      foot={
        <Link href={to("created")} className="a2-btn a2-btn-primary">
          목록에서 보기
        </Link>
      }
    >
      <div className="grid gap-3">
        <ul className="grid gap-1 a2-t-sm">
          <li>
            · 학생 <b>9명</b> 등록 · 접속코드 9개 발급
          </li>
          <li>· 보호자 연결 1명(이수아 → 이정민) · 나머지 8명은 보호자 없이</li>
          <li className="text-(--a2-ink-3)">· 빠진 줄 2줄(김도윤 생년월일 · 강민준 학교) · 이미 있는 학생 의심 1줄(이서준)은 건너뜀</li>
        </ul>
        <div className="rounded border border-(--a2-line) p-3">
          <p className="a2-label">접속코드 명단</p>
          <p className="mt-1 a2-hint">이름 · 생년월일 · 학교 · 학년 · 접속코드가 든 파일입니다. 설문 응답자에게 코드를 보낼 때 씁니다.</p>
          <div className="mt-2 flex gap-1.5">
            <button type="button" className="a2-btn">
              CSV 다운로드
            </button>
            <button type="button" className="a2-btn">
              엑셀 다운로드
            </button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}

/* ───────────────────────── 화면 ───────────────────────── */

export default function StudentsCreate({ state }: { state: string }) {
  return (
    <ConsoleFrame at="/admin2/students">
      <List fresh={state === "created"} />
      {state === "new" && <OneForm key="new" view={blankOne} />}
      {state === "new/filled" && <OneForm key="filled" view={filledOne} />}
      {state === "new/guardian" && (
        <OneForm key="guardian" view={{ ...filledOne, link: "new", guardian: { name: "정수민", phone: "010-4821-0937" } }} />
      )}
      {state === "new/done" && <OneDone />}
      {state === "bulk" && <BulkUpload />}
      {state === "bulk/review" && <BulkReview />}
      {state === "bulk/done" && <BulkDone />}
    </ConsoleFrame>
  );
}
