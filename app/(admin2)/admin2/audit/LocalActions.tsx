"use client";

import { useLocalAudit } from "@/lib/adminStore";
import { Panel } from "@/components/admin2/ui";
import TableBox from "@/components/admin2/TableBox";

/**
 * 이 브라우저에서 실제로 누른 동작.
 *
 * 위 표(감사 로그)는 서버가 들고 있을 기록의 예시라 손으로 적어 둔 값이고, 여기서 회차를
 * 열거나 기간을 고쳐도 그 표는 움직이지 않는다. 그러면 「회차를 열었는데 감사 로그에 안
 * 남는다」로 읽힌다 — 감사 화면에서 그 오해는 그냥 두면 안 되는 종류다.
 *
 * 그래서 브라우저에 쌓이는 기록(lib/adminStore.ts)을 표 아래에 따로 낸다. 위 표와 섞지
 * 않는 것은 출처가 다르기 때문이다. 붙일 때는 둘이 한 저장소로 합쳐진다.
 *
 * 아무것도 안 눌렀으면 판 자체를 그리지 않는다 — 늘 서 있는 「기록 0건」은 며칠이면
 * 눈에서 사라진다.
 */
export default function LocalActions() {
  const log = useLocalAudit();
  if (log.length === 0) return null;

  return (
    <Panel
      title="이 브라우저에서 한 동작"
      meta={`${log.length}건 · 회차 개폐 · 기간 변경 · 계정 조치`}
      flush
      className="mt-3"
    >
      <TableBox>
        <table className="a2-table">
          <thead>
            <tr>
              <th scope="col" className="a2-th-num" style={{ width: "3rem" }}>
                No
              </th>
              <th scope="col" style={{ width: "10.5rem" }}>
                시각
              </th>
              <th scope="col" style={{ width: "5.5rem" }}>
                행위자
              </th>
              <th scope="col" style={{ width: "9rem" }}>
                동작
              </th>
              <th scope="col" style={{ width: "12rem" }}>
                대상
              </th>
              <th scope="col">사유</th>
            </tr>
          </thead>
          <tbody>
            {log.map((l, i) => (
              <tr key={l.id}>
                <td className="a2-td-num a2-nowrap a2-t-sm text-(--a2-ink-3)">{log.length - i}</td>
                <td className="a2-mono a2-nowrap a2-t-xs">{l.at}</td>
                <td className="a2-td-key a2-nowrap">{l.actor}</td>
                <td className="a2-nowrap">{l.action ?? "개인정보 열람"}</td>
                {/* a2-clip을 붙이지 않는다. 그 클래스는 max-width를 0으로 눌러 남는 자리를
                    다른 칸에 내주는 것이라, 고정폭 칸에 붙이면 글자가 한 자로 줄어든다 */}
                <td className="a2-nowrap">{l.target}</td>
                <td className="a2-clip a2-t-sm" style={{ width: "100%" }} title={l.reason}>
                  {l.reason}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableBox>
      <p className="border-t border-(--a2-line) px-2.5 py-1.5 a2-t-xs text-(--a2-ink-4)">
        이 목록은 이 브라우저에만 있고 최근 50건까지 남습니다. 실제 감사 로그는 서버의 추가만 되는 저장소에 쌓입니다.
      </p>
    </Panel>
  );
}
