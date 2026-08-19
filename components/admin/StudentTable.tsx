"use client";

import { useMemo, useState } from "react";
import { formatCode } from "@/lib/roster";
import DataList, { Picker, type Column } from "./DataList";
import { Badge, Callout, CountStrip } from "./Parts";
import ReasonDialog from "./ReasonDialog";
import * as a from "./ui";

/**
 * 학생·접속코드 (ADM-03).
 *
 * 목록에서는 이름 뒷글자와 생년월일을 가려 둔다. 운영자가 하루에도 수십 번 여는
 * 화면이라, 아무 조작 없이 개인정보가 화면에 떠 있으면 어깨너머 노출이 그대로 발생한다.
 * '가림 해제'를 누르면 사유를 물은 뒤 그 행만 열고, 열람 기록을 남긴다.
 *
 * 표는 콘솔의 다른 목록과 같은 것을 쓴다(DataList) — 찾기·거르기·쪽 넘김이 화면마다
 * 다르면 매일 오가는 사람이 그때마다 눈을 다시 맞춰야 한다.
 */

type Row = {
  id: string;
  name: string;
  birth: string;
  grade: string;
  klass: string;
  org: string;
  code: string;
  guardian: string;
  state: "미응시" | "응시중" | "제출완료" | "발행완료";
};

const rows: Row[] = [
  {
    id: "S-30118",
    name: "김서준",
    birth: "20150312",
    grade: "초5",
    klass: "A반",
    org: "서울 강서 위드학원",
    code: "H4KQ7RXM",
    guardian: "010-2***-**41",
    state: "제출완료",
  },
  {
    id: "S-30119",
    name: "박지우",
    birth: "20140825",
    grade: "초6",
    klass: "A반",
    org: "서울 강서 위드학원",
    code: "T9BDN2VP",
    guardian: "010-3***-**07",
    state: "응시중",
  },
  {
    id: "S-30124",
    name: "이하윤",
    birth: "20160204",
    grade: "초4",
    klass: "B반",
    org: "서울 강서 위드학원",
    code: "M6XCJ5WQ",
    guardian: "010-5***-**88",
    state: "미응시",
  },
  {
    id: "S-30140",
    name: "정도현",
    birth: "20130917",
    grade: "중1",
    klass: "—",
    org: "개인 신청",
    code: "K2VRT8HN",
    guardian: "010-7***-**23",
    state: "발행완료",
  },
  {
    id: "S-30155",
    name: "최나린",
    birth: "20150630",
    grade: "초5",
    klass: "1기",
    org: "인천 미추홀 영재교육원",
    code: "P3WGF9DC",
    guardian: "010-4***-**16",
    state: "제출완료",
  },
  {
    id: "S-30161",
    name: "한소율",
    birth: "20141119",
    grade: "초6",
    klass: "2기",
    org: "경기 성남 한빛교육원",
    code: "R7NHQ4BJ",
    guardian: "010-8***-**52",
    state: "응시중",
  },
];


const stateTone: Record<Row["state"], string> = {
  미응시: "text-exam-muted",
  응시중: "text-amber-700",
  제출완료: "text-brand-700",
  발행완료: "text-emerald-700",
};

const states: Row["state"][] = ["미응시", "응시중", "제출완료", "발행완료"];

function maskName(name: string) {
  return `${name[0]}${"○".repeat(name.length - 1)}`;
}
function maskBirth(birth: string) {
  return `${birth.slice(0, 4)}년 ○○월 ○○일`;
}
function showBirth(birth: string) {
  return `${birth.slice(0, 4)}년 ${Number(birth.slice(4, 6))}월 ${Number(birth.slice(6, 8))}일`;
}

export default function StudentTable() {
  const [asking, setAsking] = useState<Row | null>(null);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [notice, setNotice] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [org, setOrg] = useState("all");
  const [state, setState] = useState("all");

  const orgOptions = useMemo(
    () => [...new Set(rows.map((r) => r.org))].map((v) => ({ value: v, label: v })),
    [],
  );

  /* 가려 둔 값으로도 찾을 수 있어야 한다. 이름을 치면 가림을 풀지 않고도 걸리도록
     원래 이름을 함께 본다 — 찾는 것과 보는 것은 다른 일이다. */
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (org === "all" || r.org === org) &&
        (state === "all" || r.state === state) &&
        (!needle ||
          [r.id, r.name, r.grade, r.klass, r.org, r.code].some((f) =>
            f.toLowerCase().includes(needle),
          )),
    );
  }, [q, org, state]);

  const filtering = q.trim() !== "" || org !== "all" || state !== "all";
  const reset = () => {
    setQ("");
    setOrg("all");
    setState("all");
  };

  const hide = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });

  const columns: Column<Row>[] = [
    {
      key: "who",
      head: "학생",
      cell: (r) => {
        const on = open.has(r.id);
        return (
          /* 학생번호와 생년월일은 쪼개지면 뜻이 상하는 통짜 값이라 접지 않는다.
             가린 생년월일(2015년 ○○월 ○○일)이 가장 길어 그 너비를 바닥으로 잡는다. */
          <span className="block min-w-[13rem]">
            <span className="adm-t-md font-bold text-exam-text">
              {on ? r.name : maskName(r.name)}
            </span>
            <span className="mt-0.5 block whitespace-nowrap adm-t-sm tabular-nums text-exam-muted">
              {r.id} · {on ? showBirth(r.birth) : maskBirth(r.birth)}
            </span>
          </span>
        );
      },
    },
    {
      key: "grade",
      head: "학년 · 반",
      nowrap: true,
      cell: (r) => [r.grade, r.klass].filter(Boolean).join(" · ") || "—",
    },
    { key: "org", head: "소속", hide: "lg", nowrap: true, cell: (r) => r.org },
    {
      key: "code",
      head: "접속코드",
      nowrap: true,
      cell: (r) => (
        <span className="font-bold tracking-wider tabular-nums text-exam-text">
          {formatCode(r.code)}
        </span>
      ),
    },
    {
      key: "guardian",
      head: "보호자 연락처",
      hide: "xl",
      nowrap: true,
      cell: (r) => <span className="tabular-nums">{r.guardian}</span>,
    },
    {
      key: "state",
      head: "응시 상태",
      nowrap: true,
      cell: (r) => <Badge label={r.state} className={stateTone[r.state]} />,
    },
    {
      key: "act",
      head: "할 일",
      nowrap: true,
      /* 둘을 한 줄에 — 줄바꿈을 허용하면 행 높이가 줄마다 달라진다 */
      cell: (r) => (
        <span className="flex flex-nowrap gap-2">
          {open.has(r.id) ? (
            <button type="button" onClick={() => hide(r.id)} className={a.btnRowGhost}>
              다시 가리기
            </button>
          ) : (
            <button type="button" onClick={() => setAsking(r)} className={a.btnRow}>
              가림 해제
            </button>
          )}
          <button
            type="button"
            onClick={() =>
              setNotice(
                `${r.id} 학생의 접속코드를 새로 발급했습니다. 이전 코드는 즉시 사용할 수 없습니다.`,
              )
            }
            className={a.btnRowGhost}
          >
            코드 재발급
          </button>
        </span>
      ),
    },
  ];

  return (
    <>
      <div className="mb-5">
        <CountStrip
          rows={[
            { label: "등록 학생", value: rows.length, unit: "명" },
            {
              label: "응시중",
              value: rows.filter((r) => r.state === "응시중").length,
              unit: "명",
            },
            {
              label: "제출완료",
              value: rows.filter((r) => r.state === "제출완료").length,
              unit: "명",
            },
            {
              label: "발행완료",
              value: rows.filter((r) => r.state === "발행완료").length,
              unit: "명",
            },
          ]}
        />
      </div>

      {notice && (
        <div className="mb-5">
          <Callout tone="good">{notice}</Callout>
        </div>
      )}

      <DataList
        rows={shown}
        totalCount={rows.length}
        columns={columns}
        rowKey={(r) => r.id}
        unit="명"
        searchPlaceholder="학생번호 · 이름 · 학년 · 소속 · 접속코드로 찾기"
        query={q}
        onQuery={setQ}
        filtering={filtering}
        onReset={reset}
        emptyText="조건에 맞는 학생이 없습니다."
        filters={
          <>
            <Picker
              label="소속 전체"
              options={orgOptions}
              value={org}
              onChange={setOrg}
              className="w-full sm:w-52"
            />
            <Picker
              label="응시 상태 전체"
              options={states.map((s) => ({ value: s, label: s }))}
              value={state}
              onChange={setState}
              className="w-full sm:w-40"
            />
          </>
        }
      />

      <p className={`${a.hint} mt-3`}>
        이름과 생년월일은 가려서 보여 드립니다. 확인이 꼭 필요할 때만 「가림 해제」를 누르시고 사유를
        적어 주세요 — 누가 언제 무엇을 봤는지 전부 기록됩니다. 접속코드는 코드만으로 들어갈 수 없고
        생년월일과 함께 맞아야 통과합니다.
      </p>

      {asking && (
        <ReasonDialog
          target={`${asking.id} · ${maskName(asking.name)} (${asking.org})`}
          onClose={() => setAsking(null)}
          onConfirm={() => {
            setOpen((prev) => new Set(prev).add(asking.id));
            setNotice(
              `${asking.id} 학생의 개인정보를 열었습니다. 확인이 끝나면 '다시 가리기'를 눌러 주세요.`,
            );
            setAsking(null);
          }}
        />
      )}
    </>
  );
}
