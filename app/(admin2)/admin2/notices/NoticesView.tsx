"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useContent, type Notice } from "@/lib/contentStore";
import DataTable, { type Col, type Filter } from "@/components/admin2/DataTable";
import { Body, PageHead, Panel, Status } from "@/components/admin2/ui";

/**
 * ADM-15 공지 — 사이트에 내보내는 안내의 목록.
 *
 * 여태 공지는 화면 파일에 박혀 있어 운영자가 손댈 수 없었다. 회차 공지는 회차마다 고칠
 * 수 있는데(ADM-05-4) 사이트 공지만 코드에 있는 것은 앞뒤가 안 맞는다.
 *
 * ── 목록과 고치는 자리를 가른다 ──
 * 목록 아래에서 펴서 고치게 두었었다. 공지는 본문이 길고 그림도 붙는 글이라 그 판이
 * 목록보다 몇 배 길어졌고, 고치다가 다른 줄을 보려면 화면 끝까지 올라와야 했다.
 * 무엇보다 주소가 없어 「이 공지 좀 봐 달라」고 링크를 건넬 수가 없었다. 상세는 제
 * 주소로 간다(/admin2/notices/[id]).
 */

const dash = <span className="text-(--a2-ink-4)">—</span>;

export default function NoticesView() {
  const content = useContent();

  const cols: Col<Notice>[] = useMemo(
    () => [
      {
        key: "title",
        head: "제목",
        width: "100%",
        clip: true,
        value: (r) => r.title,
        cell: (r) => (
          <Link
            href={`/admin2/notices/${r.id}`}
            className="font-semibold text-(--a2-ink) hover:text-(--a2-accent) hover:underline"
            title={r.title}
          >
            {r.title || <span className="text-(--a2-ink-4)">제목 없음</span>}
          </Link>
        ),
      },
      {
        key: "postedOn",
        head: "게시일",
        width: "7.5rem",
        nowrap: true,
        value: (r) => r.postedOn,
        cell: (r) => <span className="a2-mono a2-t-sm">{r.postedOn}</span>,
      },
      {
        key: "shown",
        head: "노출",
        width: "6rem",
        nowrap: true,
        value: (r) => (r.shown ? "노출" : "내림"),
        cell: (r) => <Status tone={r.shown ? "ok" : "muted"}>{r.shown ? "노출" : "내림"}</Status>,
      },
      {
        /* 띄우는 것과 올려 두는 것은 다른 일이라 칸을 따로 세운다 */
        key: "popup",
        head: "팝업",
        width: "4.5rem",
        nowrap: true,
        value: (r) => (r.popup ? "팝업" : ""),
        cell: (r) => (r.popup ? <span className="a2-t-sm">띄움</span> : dash),
      },
      {
        key: "pinned",
        head: "고정",
        width: "4.5rem",
        nowrap: true,
        value: (r) => (r.pinned ? "고정" : ""),
        cell: (r) => (r.pinned ? <span className="a2-t-sm">고정</span> : dash),
      },
      {
        key: "act",
        head: "관리",
        width: "5.5rem",
        nowrap: true,
        cell: (r) => (
          <Link
            href={`/admin2/notices/${r.id}`}
            className="a2-btn a2-btn-sm"
            aria-label={`${r.title || r.id} 수정하기`}
          >
            수정하기
          </Link>
        ),
      },
    ],
    [],
  );

  const filters: Filter<Notice>[] = useMemo(
    () => [
      {
        id: "shown",
        label: "노출",
        options: [
          { value: "y", label: "노출" },
          { value: "n", label: "내림" },
        ],
        match: (r, v) => (v === "y" ? r.shown : !r.shown),
      },
      {
        id: "popup",
        label: "팝업",
        options: [
          { value: "y", label: "띄움" },
          { value: "n", label: "안 띄움" },
        ],
        match: (r, v) => (v === "y" ? r.popup : !r.popup),
      },
    ],
    [],
  );

  /* 늦게 올린 것이 위로 — 목록에서 찾는 것은 대개 방금 쓴 공지다 */
  const rows = useMemo(
    () =>
      [...content.notices].sort(
        (a, b) => b.postedOn.localeCompare(a.postedOn) || b.id.localeCompare(a.id),
      ),
    [content.notices],
  );

  return (
    <>
      <PageHead
        title="공지"
        actions={
          <Link href="/admin2/notices/new" className="a2-btn a2-btn-primary">
            새 공지
          </Link>
        }
      />
      <Body>
        <Panel title="공지" flush>
          <DataTable
            rows={rows}
            cols={cols}
            filters={filters}
            getKey={(r) => r.id}
            searchHint="제목"
            empty="아직 올린 공지가 없습니다."
          />
        </Panel>
      </Body>
    </>
  );
}
