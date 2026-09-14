"use client";

import Link from "next/link";
import { useMemo } from "react";
import { faqGroups, useContent, type Faq } from "@/lib/contentStore";
import DataTable, { type Col, type Filter } from "@/components/admin2/DataTable";
import { Body, PageHead, Panel, Status, Tag } from "@/components/admin2/ui";

/**
 * ADM-15-1 자주 묻는 질문 — 고객지원(PUB-06-1)과 홈이 읽는 목록.
 *
 * 여태 질문과 답이 화면 파일 두 곳에 나뉘어 박혀 있었다(components/site/HomeFaq.tsx ·
 * app/(site)/support/faq/page.tsx). 같은 질문을 두 곳에 적어 두면 한쪽만 고쳐지는 날이
 * 반드시 오고, 무엇보다 운영자가 손댈 수 없는 글이 된다.
 *
 * ── 목록과 고치는 자리를 가른다 ──
 * 답은 여러 문단이 되기도 하고 그림도 붙는 글이라, 목록 아래에서 펴면 그 판이 목록보다
 * 몇 배 길어진다. 상세는 제 주소로 간다(/admin2/faq/[id]) — 주소가 있어야 「이 답 좀 봐
 * 달라」고 링크를 건넬 수 있다.
 *
 * ── 분류는 목록에서 고른다 ──
 * 분류를 따로 관리하는 화면은 두지 않는다. 다섯 갈래(진단·응시·결과 해석·개인정보·결제)는
 * 고객지원 화면의 뼈대이고 자주 갈리는 값이 아니다. 새 갈래가 필요하면 그때 늘린다.
 */

const dash = <span className="text-(--a2-ink-4)">—</span>;

export default function FaqView() {
  const content = useContent();

  const cols: Col<Faq>[] = useMemo(
    () => [
      {
        key: "group",
        head: "분류",
        width: "7rem",
        nowrap: true,
        value: (r) => r.group,
        cell: (r) => <Tag>{r.group}</Tag>,
      },
      {
        key: "q",
        head: "질문",
        width: "100%",
        clip: true,
        value: (r) => r.q,
        cell: (r) => (
          <Link
            href={`/admin2/faq/${r.id}`}
            className="font-semibold text-(--a2-ink) hover:text-(--a2-accent) hover:underline"
            title={r.q}
          >
            {r.q || <span className="text-(--a2-ink-4)">질문 없음</span>}
          </Link>
        ),
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
        key: "home",
        head: "홈",
        width: "4rem",
        nowrap: true,
        value: (r) => (r.home ? "홈" : ""),
        cell: (r) => (r.home ? <span className="a2-t-sm">홈</span> : dash),
      },
      {
        key: "act",
        head: "관리",
        width: "5.5rem",
        nowrap: true,
        cell: (r) => (
          <Link
            href={`/admin2/faq/${r.id}`}
            className="a2-btn a2-btn-sm"
            aria-label={`${r.q || r.id} 수정하기`}
          >
            수정하기
          </Link>
        ),
      },
    ],
    [],
  );

  const filters: Filter<Faq>[] = useMemo(
    () => [
      {
        id: "group",
        label: "분류",
        options: faqGroups.map((g) => ({ value: g, label: g })),
        match: (r, v) => r.group === v,
      },
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
        id: "home",
        label: "홈",
        options: [
          { value: "y", label: "홈에도" },
          { value: "n", label: "고객지원만" },
        ],
        match: (r, v) => (v === "y" ? r.home : !r.home),
      },
    ],
    [],
  );

  /* 공개 화면과 같은 차례로 세운다 — 분류 순서 그대로, 그 안에서는 넣은 차례 그대로.
     콘솔에서 본 차례와 사람이 보는 차례가 다르면 「세 번째 질문」이 서로 다른 것이 된다 */
  const rows = useMemo(() => {
    const rank = (g: string) => {
      const i = faqGroups.indexOf(g);
      return i < 0 ? faqGroups.length : i;
    };
    return [...content.faqs].sort((a, b) => rank(a.group) - rank(b.group) || a.id.localeCompare(b.id));
  }, [content.faqs]);

  return (
    <>
      <PageHead
        title="자주 묻는 질문"
        actions={
          <Link href="/admin2/faq/new" className="a2-btn a2-btn-primary">
            새 질문
          </Link>
        }
      />
      <Body>
        <Panel title="자주 묻는 질문" flush>
          <DataTable
            rows={rows}
            cols={cols}
            filters={filters}
            getKey={(r) => r.id}
            searchHint="질문"
            empty="아직 올린 질문이 없습니다."
          />
        </Panel>
      </Body>
    </>
  );
}
