"use client";

import { useMemo, useState } from "react";
import { approvals, type Approval } from "@/lib/admin";
import DataList, { Picker, type Column } from "./DataList";
import { Badge, Callout, CountStrip } from "./Parts";
import * as a from "./ui";

/**
 * 교사·기관 가입 승인 (ADM-02-2).
 *
 * 예전에는 한 건이 카드 하나였다. 한 건마다 확인할 것이 다르니 넓게 펴 두자는
 * 뜻이었는데, 신청이 일곱 건만 되어도 화면 세 장이 되어 「지금 몇 건이 밀려 있나」를
 * 세려면 스크롤을 해야 했다. 승인은 훑고 고르는 일이지 읽는 일이 아니다.
 *
 * 그래서 콘솔의 다른 목록과 같은 표로 갈아입힌다(DataList). 줄마다 증빙·신청 시각·
 * 걸린 것이 한 줄에 서고, 할 일 칸에 「증빙 보기 · 반려 · 승인」 셋이 함께 있다.
 *
 * 승인·반려는 되돌리기 어려우므로 한 번 더 묻는 것은 그대로다. 다만 물음이 카드가
 * 아니라 대화상자라, 목록을 보던 자리를 잃지 않는다.
 */

const kindLabel = { teacher: "교사", org: "기관" } as const;
const kindTone = { teacher: "text-emerald-700", org: "text-accent-600" } as const;

type Handled = Record<string, "approved" | "rejected">;

export default function ApprovalList() {
  const [handled, setHandled] = useState<Handled>({});
  const [asking, setAsking] = useState<{ item: Approval; kind: "approve" | "reject" } | null>(null);
  const [proof, setProof] = useState<Approval | null>(null);

  const [q, setQ] = useState("");
  const [kind, setKind] = useState("all");
  const [state, setState] = useState("all");

  const waiting = approvals.filter((x) => !handled[x.id]);
  const flagged = waiting.filter((x) => x.warning);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return approvals.filter((x) => {
      const done = handled[x.id];
      if (kind !== "all" && x.kind !== kind) return false;
      if (state === "wait" && done) return false;
      if (state === "flag" && (done || !x.warning)) return false;
      if (state === "done" && !done) return false;
      return (
        !needle ||
        [x.id, x.name, x.org, x.detail, x.proof].some((f) => f.toLowerCase().includes(needle))
      );
    });
  }, [q, kind, state, handled]);

  const filtering = q.trim() !== "" || kind !== "all" || state !== "all";
  const reset = () => {
    setQ("");
    setKind("all");
    setState("all");
  };

  const columns: Column<Approval>[] = [
    {
      key: "who",
      head: "신청자",
      cell: (x) => (
        <span className="block min-w-[11rem]">
          <span className="flex flex-wrap items-baseline gap-x-2">
            <Badge label={kindLabel[x.kind]} className={kindTone[x.kind]} />
            <span className="adm-t-md font-bold text-exam-text">{x.name}</span>
          </span>
          <span className="mt-0.5 block adm-t-sm text-exam-muted">{x.org}</span>
        </span>
      ),
    },
    {
      key: "detail",
      head: "소속 · 확인할 것",
      cell: (x) => (
        <span className="block min-w-[13rem]">
          <span className="line-clamp-1 adm-t-md text-exam-text" title={x.detail}>
            {x.detail}
          </span>
          {/* 걸린 것은 줄 안에서 붉게 적는다. 따로 판을 세우면 줄이 두 배가 된다. */}
          {x.warning && (
            <span className="mt-0.5 block adm-t-sm font-bold text-rose-700" title={x.warning}>
              {x.warning}
            </span>
          )}
        </span>
      ),
    },
    /* 증빙은 넓을 때만 편다. 좁아지면 접되 「증빙 보기」로 언제든 열 수 있으므로
       잃는 것이 없다 — 접히면 안 되는 것은 눌러야 할 단추 쪽이다. */
    { key: "proof", head: "제출 증빙", hide: "xl", cell: (x) => x.proof },
    {
      key: "at",
      head: "신청 시각",
      hide: "xl",
      nowrap: true,
      cell: (x) => <span className="tabular-nums">{x.requestedAt}</span>,
    },
    {
      key: "act",
      head: "할 일",
      nowrap: true,
      cell: (x) => {
        const done = handled[x.id];
        if (done) {
          return (
            <Badge
              label={done === "approved" ? "승인 완료" : "반려 처리됨"}
              className={done === "approved" ? "text-emerald-700" : "text-rose-700"}
            />
          );
        }
        /* 셋을 한 줄에 세운다. 줄바꿈을 허용하면 칸이 좁을 때 세 줄이 되어 행
           높이가 줄마다 달라지고, 세로로 훑던 눈이 매 줄에서 멈춘다. 표가 넓어지면
           옆으로 밀리게 두는 편이 낫다(표는 overflow-x-auto 안에 있다). */
        return (
          <span className="flex flex-nowrap gap-2">
            <button type="button" onClick={() => setProof(x)} className={a.btnRowGhost}>
              증빙 보기
            </button>
            <button
              type="button"
              onClick={() => setAsking({ item: x, kind: "reject" })}
              className={`${a.btnRowGhost} text-rose-700`}
            >
              반려하기
            </button>
            <button
              type="button"
              onClick={() => setAsking({ item: x, kind: "approve" })}
              className={a.btnRow}
            >
              승인하기
            </button>
          </span>
        );
      },
    },
  ];

  return (
    <>
      <div className="mb-5">
        <CountStrip
          rows={[
            { label: "확인 대기", value: waiting.length, unit: "건" },
            {
              label: "확인 필요",
              value: flagged.length,
              unit: "건",
              tone: flagged.length > 0 ? "warn" : undefined,
            },
            { label: "처리함", value: Object.keys(handled).length, unit: "건" },
          ]}
        />
      </div>

      <DataList
        rows={rows}
        totalCount={approvals.length}
        columns={columns}
        rowKey={(x) => x.id}
        searchPlaceholder="이름 · 기관 · 소속 · 증빙으로 찾기"
        query={q}
        onQuery={setQ}
        filtering={filtering}
        onReset={reset}
        emptyText="조건에 맞는 신청이 없습니다."
        filters={
          <>
            <Picker
              label="구분 전체"
              options={[
                { value: "teacher", label: "교사" },
                { value: "org", label: "기관" },
              ]}
              value={kind}
              onChange={setKind}
              className="w-full sm:w-32"
            />
            <Picker
              label="상태 전체"
              options={[
                { value: "wait", label: "확인 대기" },
                { value: "flag", label: "확인 필요" },
                { value: "done", label: "처리함" },
              ]}
              value={state}
              onChange={setState}
              className="w-full sm:w-36"
            />
          </>
        }
      />

      <p className={`${a.hint} mt-3`}>
        승인하면 즉시 계정이 열리고, 그 순간부터 담당 학생의 설문 화면에 접근할 수 있게 됩니다.
      </p>

      {proof && (
        <ProofDialog item={proof} onClose={() => setProof(null)} />
      )}

      {asking && (
        <ConfirmDialog
          item={asking.item}
          kind={asking.kind}
          onClose={() => setAsking(null)}
          onDone={() => {
            setHandled((prev) => ({
              ...prev,
              [asking.item.id]: asking.kind === "approve" ? "approved" : "rejected",
            }));
            setAsking(null);
          }}
        />
      )}
    </>
  );
}

/** 증빙은 목록을 떠나지 않고 그 자리에서 본다 */
function ProofDialog({ item, onClose }: { item: Approval; onClose: () => void }) {
  return (
    <Dialog title="제출한 증빙" onClose={onClose}>
      <p className={`${a.bodyText} mt-2.5`}>
        <b className="text-exam-text">
          {item.name} · {item.org}
        </b>
      </p>
      <dl className="mt-4 space-y-2.5">
        <Row k="구분" v={kindLabel[item.kind]} />
        <Row k="소속" v={item.detail} />
        <Row k="증빙" v={item.proof} />
        <Row k="신청 시각" v={item.requestedAt} />
      </dl>

      {item.warning && (
        <div className="mt-4">
          <Callout tone="warn" title="자동 점검에서 걸린 것">
            {item.warning}
          </Callout>
        </div>
      )}

      <p className={`${a.hint} mt-4`}>
        화면 설계 단계라 파일 자체는 붙어 있지 않습니다. 실제로는 이 자리에 제출한 파일이
        열립니다.
      </p>

      <div className="mt-7">
        <button type="button" onClick={onClose} className={a.btnGhost}>
          닫기
        </button>
      </div>
    </Dialog>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex flex-wrap gap-x-3">
      <dt className="w-24 shrink-0 adm-t-sm font-bold text-exam-text">{k}</dt>
      <dd className="min-w-0 adm-t-md text-exam-muted">{v}</dd>
    </div>
  );
}

/** 되돌리기 어려운 동작은 무엇이 일어나는지 문장으로 적고 한 번 더 묻는다 */
function ConfirmDialog({
  item,
  kind,
  onClose,
  onDone,
}: {
  item: Approval;
  kind: "approve" | "reject";
  onClose: () => void;
  onDone: () => void;
}) {
  const approve = kind === "approve";
  return (
    <Dialog title={approve ? "이 신청을 승인할까요?" : "이 신청을 반려할까요?"} onClose={onClose}>
      <p className={`${a.bodyText} mt-3`}>
        <b className="text-exam-text">
          {item.name} · {item.org}
        </b>
      </p>
      <ul className={`${a.bodyText} mt-3 list-disc space-y-1.5 pl-5`}>
        {approve ? (
          <>
            <li>계정이 즉시 활성화됩니다.</li>
            <li>담당 학생의 관찰 설문 화면에 접근할 수 있게 됩니다.</li>
            <li>승인한 사람과 시각이 감사 로그에 남습니다.</li>
          </>
        ) : (
          <>
            <li>신청자에게 반려 사유가 메일로 안내됩니다.</li>
            <li>증빙을 다시 제출하면 재신청할 수 있습니다.</li>
            <li>반려한 사람과 시각이 감사 로그에 남습니다.</li>
          </>
        )}
      </ul>

      <div className="mt-7 flex flex-wrap gap-3">
        <button type="button" onClick={onDone} className={approve ? a.btnPrimary : a.btnDanger}>
          네, {approve ? "승인합니다" : "반려합니다"}
        </button>
        <button type="button" onClick={onClose} className={a.btnGhost}>
          아니요, 취소합니다
        </button>
      </div>
    </Dialog>
  );
}

function Dialog({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-brand-950/50 p-4"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-lg border border-exam-line bg-white p-6 sm:p-8">
        <h2 className={a.pageTitle}>{title}</h2>
        {children}
      </div>
    </div>
  );
}
