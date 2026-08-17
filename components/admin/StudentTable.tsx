"use client";

import { useState } from "react";
import { formatCode } from "@/lib/roster";
import { Badge, Callout, TableCard } from "./Parts";
import ReasonDialog from "./ReasonDialog";
import * as a from "./ui";

/**
 * 학생·접속코드 (ADM-03).
 *
 * 목록에서는 이름 뒷글자와 생년월일을 가려 둔다. 운영자가 하루에도 수십 번 여는
 * 화면이라, 아무 조작 없이 개인정보가 화면에 떠 있으면 어깨너머 노출이 그대로 발생한다.
 * '가림 해제'를 누르면 사유를 물은 뒤 그 행만 열고, 열람 기록을 남긴다.
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

  return (
    <>
      <div className="mb-5">
        <Callout title="이름과 생년월일은 가려서 보여 드립니다">
          확인이 꼭 필요할 때만 해당 학생의 <b>가림 해제</b>를 누르시고, 사유를 적어 주세요. 누가
          언제 무엇을 봤는지 전부 기록됩니다.
        </Callout>
      </div>

      {notice && (
        <div className="mb-5">
          <Callout tone="good">{notice}</Callout>
        </div>
      )}

      <TableCard
        title={`학생 ${rows.length}명`}
        caption="접속코드는 코드만으로는 들어갈 수 없고, 생년월일과 함께 맞아야 통과합니다."
      >
        <table className={a.table}>
          <thead>
            <tr>
              <th className={a.th}>학생번호</th>
              <th className={a.th}>이름</th>
              <th className={a.th}>생년월일</th>
              <th className={a.th}>학년 · 반</th>
              <th className={a.th}>소속</th>
              <th className={a.th}>접속코드</th>
              <th className={a.th}>보호자 연락처</th>
              <th className={a.th}>응시 상태</th>
              <th className={a.th}>할 일</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => {
              const shown = open.has(s.id);
              return (
                <tr key={s.id}>
                  <td className={a.td}>{s.id}</td>
                  <td className={a.tdStrong}>{shown ? s.name : maskName(s.name)}</td>
                  <td className={a.td}>
                    <span className="tabular-nums">
                      {shown ? showBirth(s.birth) : maskBirth(s.birth)}
                    </span>
                  </td>
                  <td className={a.td}>{[s.grade, s.klass].filter(Boolean).join(" · ") || "—"}</td>
                  <td className={a.td}>{s.org}</td>
                  <td className={a.td}>
                    <span className="font-bold tracking-wider tabular-nums text-exam-text">
                      {formatCode(s.code)}
                    </span>
                  </td>
                  <td className={a.td}>
                    <span className="tabular-nums">{s.guardian}</span>
                  </td>
                  <td className={a.td}>
                    <Badge label={s.state} className={stateTone[s.state]} />
                  </td>
                  <td className={a.td}>
                    <div className="flex flex-wrap gap-2">
                      {shown ? (
                        <button
                          type="button"
                          className={a.btnRowGhost}
                          onClick={() =>
                            setOpen((prev) => {
                              const next = new Set(prev);
                              next.delete(s.id);
                              return next;
                            })
                          }
                        >
                          다시 가리기
                        </button>
                      ) : (
                        <button type="button" className={a.btnRow} onClick={() => setAsking(s)}>
                          가림 해제
                        </button>
                      )}
                      <button
                        type="button"
                        className={a.btnRowGhost}
                        onClick={() =>
                          setNotice(
                            `${s.id} 학생의 접속코드를 새로 발급했습니다. 이전 코드는 즉시 사용할 수 없습니다.`,
                          )
                        }
                      >
                        코드 재발급
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </TableCard>

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
