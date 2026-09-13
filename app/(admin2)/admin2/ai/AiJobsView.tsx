"use client";

import Link from "next/link";
import { useMemo } from "react";
import { n } from "@/lib/admin2";
import { useHydrated } from "@/lib/examStore";
import { modelLabel } from "@/lib/aiModels";
import { aiJobs, bySubject, type AiJob } from "@/lib/aiPrompts";
import { useFlowModels, useFlowStat } from "@/lib/aiFlowStore";
import DataTable, { type Col } from "@/components/admin2/DataTable";
import { PageHead, Status, Tag } from "@/components/admin2/ui";

/**
 * ADM-13-1 AI 프롬프트 — 목록.
 *
 * 일곱 줄뿐이라 조회 조건 줄을 세우지 않는다. 답하는 것은 「AI가 어디에 서 있고, 그 자리에
 * 지금 몇 개가 걸려 있나」뿐이고, 짜는 일은 상세에서 한다.
 *
 * ⚠ AI 수·파일 수·모델은 브라우저 저장소에서 읽는다. 서버에서 셀 수 없으므로 하이드레이션
 *   전에는 씨앗 값을 그린다 — 저장분이 없는 업무에서는 그것이 곧 지금 값이다.
 */
export default function AiJobsView() {
  const hydrated = useHydrated();

  const cols: Col<AiJob>[] = useMemo(
    () => [
      {
        key: "code",
        head: "화면 ID",
        width: "6rem",
        nowrap: true,
        hide: "lg",
        value: (j) => j.code,
        cell: (j) => <span className="a2-mono a2-t-xs text-(--a2-ink-3)">{j.code}</span>,
      },
      {
        key: "label",
        head: "업무",
        width: "11rem",
        nowrap: true,
        value: (j) => j.label,
        cell: (j) => (
          <Link
            href={`/admin2/ai/${j.id}`}
            className="font-semibold text-(--a2-ink) hover:text-(--a2-accent) hover:underline"
          >
            {j.label}
          </Link>
        ),
      },
      {
        key: "desc",
        head: "하는 일",
        width: "100%",
        clip: true,
        value: (j) => j.desc,
        cell: (j) => (
          <span title={j.desc} className="a2-t-sm text-(--a2-ink-2)">
            {j.desc}
          </span>
        ),
      },
      {
        key: "where",
        head: "도는 화면",
        width: "11rem",
        nowrap: true,
        hide: "lg",
        value: (j) => j.href ?? j.where ?? "",
        cell: (j) =>
          j.href ? (
            <Link href={j.href} className="a2-mono a2-t-xs text-(--a2-accent) hover:underline">
              {j.href}
            </Link>
          ) : (
            <span className="a2-t-xs text-(--a2-ink-4)">{j.where}</span>
          ),
      },
      {
        key: "models",
        head: "모델",
        width: "8.5rem",
        nowrap: true,
        hide: "lg",
        cell: (j) => <JobModels job={j} hydrated={hydrated} />,
      },
      {
        key: "subjects",
        head: "과목 요구사항",
        width: "8.5rem",
        nowrap: true,
        hide: "lg",
        cell: (j) => <JobSubjects job={j} hydrated={hydrated} />,
      },
      {
        key: "steps",
        head: "AI",
        width: "6.5rem",
        num: true,
        nowrap: true,
        cell: (j) => <JobCount job={j} hydrated={hydrated} />,
      },
      {
        key: "act",
        head: "",
        width: "5.5rem",
        nowrap: true,
        cell: (j) => (
          <Link href={`/admin2/ai/${j.id}`} className="a2-btn a2-btn-sm" aria-label={`${j.label} 열기`}>
            열기
          </Link>
        ),
      },
    ],
    [hydrated],
  );

  return (
    <>
      <PageHead title="AI 프롬프트" />
      <DataTable
        rows={aiJobs}
        cols={cols}
        getKey={(j) => j.id}
        search={false}
        showCount={false}
        empty="AI가 도는 자리가 없습니다."
      />
    </>
  );
}

/* 훅은 조각 안에서만 부를 수 있어 칸 하나를 조각으로 뗀다 */
function JobCount({ job, hydrated }: { job: AiJob; hydrated: boolean }) {
  const stat = useFlowStat(job);
  if (!hydrated) return <span className="text-(--a2-ink-4)">—</span>;
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className="a2-num font-semibold">{n(stat.steps)}</span>
      {stat.files > 0 && <span className="a2-t-xs text-(--a2-ink-4)">📎{n(stat.files)}</span>}
      {stat.edited && <Status tone="info">고침</Status>}
    </span>
  );
}

/* 과목을 받지 않는 업무는 「—」, 받는데 적은 것이 없으면 「없음」 — 둘을 가른다. 과목 탭이
   아예 없는 업무와 탭은 있는데 비어 있는 업무는 고치러 갈 까닭이 다르다 */
function JobSubjects({ job, hydrated }: { job: AiJob; hydrated: boolean }) {
  const stat = useFlowStat(job);
  if (!bySubject(job)) return <span className="text-(--a2-ink-4)">—</span>;
  if (!hydrated) return <span className="text-(--a2-ink-4)">—</span>;
  if (stat.subjects.length === 0) return <span className="a2-t-xs text-(--a2-ink-4)">없음</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {stat.subjects.map((s) => (
        <Tag key={s}>{s}</Tag>
      ))}
    </span>
  );
}

function JobModels({ job, hydrated }: { job: AiJob; hydrated: boolean }) {
  const ids = useFlowModels(job);
  if (!hydrated) return <span className="text-(--a2-ink-4)">—</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {ids.map((id) => (
        <Tag key={id}>{modelLabel(id)}</Tag>
      ))}
    </span>
  );
}
