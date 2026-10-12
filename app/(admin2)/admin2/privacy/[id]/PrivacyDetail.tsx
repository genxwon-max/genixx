"use client";

import Link from "next/link";
import { useMemo } from "react";
import { today, usePrivacy } from "@/lib/privacyStore";
import PrivacyRecord from "@/components/admin2/PrivacyRecord";
import { Body, PageHead, Panel } from "@/components/admin2/ui";

/**
 * ADM-10 개인정보 상세 — 이 회원이 무엇에 언제 동의했나.
 *
 * 화면은 components/admin2/PrivacyRecord.tsx가 그린다. 여기서는 주소의 회원을 명부에서 찾아
 * 넘긴다.
 *
 * 고치는 칸은 두지 않는다. 동의는 **정보주체가 누르는 것**이고, 운영자가 하는 일(파기)은
 * 개인정보 파기(ADM-10-1)가 맡는다 — 되돌릴 수 없는 일은 한 자리에서만 실행한다.
 */

const back = (
  <Link href="/admin2/privacy" className="a2-btn">
    ← 개인정보 관리
  </Link>
);

export default function PrivacyDetail({ id }: { id: string }) {
  const { rows } = usePrivacy();
  const row = useMemo(() => rows.find((v) => v.id === id) ?? null, [rows, id]);

  if (!row) {
    return (
      <>
        <PageHead title="찾지 못했습니다" back={back} />
        <Body>
          <Panel title="없는 회원">
            <p className="a2-t-sm text-(--a2-ink-2)">
              <span className="a2-mono">{id}</span> 회원이 명부에 없습니다.
            </p>
          </Panel>
        </Body>
      </>
    );
  }

  return (
    <PrivacyRecord
      row={row}
      now={today()}
      back={back}
      /* 명부 화면은 학부모와 학생이 갈려 있다 — 회원 유형으로 갈 곳을 고른다 */
      memberHref={row.kind === "학생" ? `/admin2/students/${row.id}` : `/admin2/members/${row.id}`}
    />
  );
}
