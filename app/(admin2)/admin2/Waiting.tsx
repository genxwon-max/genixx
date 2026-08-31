"use client";

import Link from "next/link";
import { queueCounts } from "@/lib/admin2";
import { useItems } from "@/lib/itemStore";
import { Panel } from "@/components/admin2/ui";

/**
 * 대시보드 ③ 「지금 사람 손이 필요한 건 몇 건인가」.
 *
 * 이 판만 클라이언트다. 다섯 줄 중 문항 검수 한 줄이 브라우저 저장소에서만 셀 수 있는
 * 값이기 때문이다(lib/itemStore.ts). 서버에서 센 값을 박아 두었더니 왼쪽 기둥의 배지와
 * 문항 은행의 줄 수와 이 판이 서로 다른 숫자를 말했다 — 대시보드에서 그것이 가장 나쁜
 * 고장이다. 나머지 넷은 서버에서 세는 예시 목록이라 그대로 가져다 쓴다.
 */
export default function Waiting() {
  const itemsWaiting = useItems().filter((i) => i.state === "submitted").length;

  const rows = [
    { label: "판정 대기", value: queueCounts.cases, href: "/admin2/queue", note: "AI 분석 완료 · 검토중 · 회의" },
    { label: "가입 승인", value: queueCounts.approvals, href: "/admin2/approvals", note: "교사·기관 증빙 확인" },
    { label: "문항 검수", value: itemsWaiting, href: "/admin2/items", note: "검수 대기 — 이 브라우저 기준" },
    { label: "답변 대기", value: queueCounts.inquiries, href: "/admin2/inquiries", note: "접수·처리중" },
    { label: "리포트 발행", value: queueCounts.reports, href: "/admin2/queue", note: "마스터 승인 대기" },
  ];

  return (
    <Panel title="처리 대기" flush meta="사람 손이 필요한 것">
      <table className="a2-table">
        <tbody>
          {rows.map((w) => (
            <tr key={w.label}>
              <td className="a2-td-key a2-nowrap" style={{ width: "6.5rem" }}>
                <Link href={w.href} className="hover:text-(--a2-accent) hover:underline">
                  {w.label}
                </Link>
              </td>
              <td className="a2-t-xs text-(--a2-ink-4)">{w.note}</td>
              <td className="a2-td-num" style={{ width: "3.5rem" }}>
                <span className={w.value ? "font-semibold text-(--a2-ink)" : "text-(--a2-ink-4)"}>{w.value}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}
