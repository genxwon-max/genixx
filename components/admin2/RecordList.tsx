"use client";

import type { AuditRow } from "@/lib/admin";
import type { LocalAudit } from "@/lib/adminStore";
import { n } from "@/lib/admin2";
import { Panel } from "./ui";

/**
 * 한 줄(회원·학생·기관)에 대한 기록.
 *
 * 서버 감사 로그와 이 브라우저의 기록을 한 목록으로 **섞지 않는다.** 출처가 다르고,
 * 섞어 두면 시연에서 방금 누른 조치가 서버에 남은 것처럼 읽힌다 — 감사 로그 화면도
 * 같은 이유로 판을 둘로 나눠 두었다(admin2/audit/LocalActions.tsx).
 *
 * 서버 쪽은 target이 번호로 **시작**하는 줄만 고른다(「M-100461 (동의 철회 요청)」).
 * 브라우저 쪽은 「학부모 임지민 · M-100128」처럼 이름이 앞에 붙으므로 포함으로 찾는다.
 */
export default function RecordList({
  id,
  server,
  local,
  empty,
}: {
  id: string;
  server: AuditRow[];
  local: LocalAudit[];
  empty: string;
}) {
  const serverRows = server.filter((l) => l.target.startsWith(id));
  const localRows = local.filter((l) => l.target.includes(id));

  return (
    <Panel title="기록" meta={`${n(serverRows.length + localRows.length)}건`}>
      {localRows.length === 0 && serverRows.length === 0 ? (
        <p className="a2-t-sm text-(--a2-ink-3)">{empty}</p>
      ) : (
        <div className="grid gap-3">
          {localRows.length > 0 && (
            <div>
              <p className="a2-label mb-1.5">이 브라우저에서 한 조치</p>
              <ul className="grid gap-1.5">
                {localRows.map((l) => (
                  <li key={l.id} className="border-l-2 border-(--a2-accent-line) pl-2">
                    <p className="a2-t-sm">
                      <b>{l.action ?? "개인정보 열람"}</b>{" "}
                      <span className="a2-mono a2-t-xs text-(--a2-ink-4)">
                        {l.at} · {l.actor}
                      </span>
                    </p>
                    <p className="a2-t-sm text-(--a2-ink-2)">{l.reason}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {serverRows.length > 0 && (
            <div>
              <p className="a2-label mb-1.5">감사 로그 (서버)</p>
              <ul className="grid gap-1.5">
                {serverRows.map((l) => (
                  <li key={l.id} className="border-l-2 border-(--a2-line-2) pl-2">
                    <p className="a2-t-sm">
                      <b>{l.action}</b>{" "}
                      <span className="a2-mono a2-t-xs text-(--a2-ink-4)">
                        {l.at} · {l.actor}
                      </span>
                    </p>
                    <p className="a2-t-sm text-(--a2-ink-2)">{l.reason ?? "사유 없음"}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}
