"use client";

import DataTable, { type Col, type Filter } from "@/components/admin2/DataTable";
import { Tag } from "@/components/admin2/ui";
import { auditLog, roleOf, type AuditRow } from "@/lib/admin";

/*
 * ADM-11 감사 로그 — 표.
 *
 * ── 칸 순서 ──
 * 「무엇이 남았나(ID·시각) → 누가(행위자·역할) → 무엇을 했나(동작·대상) → 왜(사유) → 어디서(IP)」.
 * 감사 로그를 여는 이유는 거의 언제나 「이 사람이 언제 무엇을 했나」이고, 그 문장의 어순을
 * 그대로 칸 순서로 옮겼다. IP를 맨 끝에 둔 것은 대조용 값이라서다 — 평소에는 안 읽히다가
 * 사고 조사에서만 필요해진다.
 *
 * ── 사유가 있는 줄을 가르는 방법 ──
 * 사유가 적힌 줄은 개인정보에 닿은 줄이다. 줄 전체에 면을 칠하지 않고 신호 둘을 세운다 —
 *   ① 동작 칸 맨 앞에 경고색 점 하나. 위에서 아래로 훑을 때 한 열만 보면 걸린다.
 *   ② 사유 칸의 글자를 본문 색으로 올린다. 사유가 없는 줄은 흐린 줄표다.
 * 점은 왼쪽 끝, 사유는 오른쪽. 줄을 어느 쪽에서 읽기 시작해도 표시가 먼저 온다.
 * 색만으로 가르지 않는다 — 점이 사라져도 사유 글자가 남아 있고, 그 글자가 곧 근거다.
 * 대시보드(ADM-01)의 최근 활동 표도 같은 점을 쓴다. 두 화면에서 같은 뜻이 같은 모양이어야
 * 「저 점이 뭐지」를 다시 배우지 않는다.
 *
 * ── 검색에 걸리는 범위 ──
 * DataTable은 value가 달린 칸을 이어 붙여 찾는다. 그래서 행위자·동작·대상·사유에 value를
 * 달았고, 역할과 IP에는 일부러 달지 않았다.
 *   · 역할은 거르개가 따로 있다. 검색에 섞이면 「마스터」가 절반을 끌고 온다.
 *   · IP는 앞자리가 전부 10.14로 같아, 검색에 넣으면 조각 하나가 전건을 끌고 온다.
 *     문자열 정렬도 뜻이 없어(10.14.2.31 < 10.14.5.72 는 우연) 정렬 화살표도 세우지 않았다.
 * ID와 시각에는 value를 달았다. 검색에 걸리는 것은 부수 효과지만, 다른 화면에서 들고 온
 * 로그 ID를 붙여 넣거나 날짜 앞자리(2026-08-08)로 좁히는 동작이 오히려 자연스럽다.
 */

/* 역할 거르개 — 로그에 실제로 등장한 역할만 세운다. 네 역할을 전부 세워 두면 고르는 순간
   0줄이 나오는 선택지가 생기고, 그러면 거르개 전체를 못 믿게 된다 */
const roleOptions = [...new Set(auditLog.map((l) => l.role))].map((id) => ({
  value: id,
  label: roleOf(id).short,
}));

const cols: Col<AuditRow>[] = [
  {
    key: "id",
    head: "로그 ID",
    width: "5.5rem",
    nowrap: true,
    value: (r) => r.id,
    cell: (r) => <span className="a2-mono">{r.id}</span>,
  },
  // 시각은 초까지 그대로 둔다. 감사 기록에서 분 단위로 자르면 같은 분에 일어난 두 동작의
  // 앞뒤가 사라지고, 그 앞뒤가 곧 「무엇을 보고 무엇을 고쳤나」다
  {
    key: "at",
    head: "시각",
    width: "9.5rem",
    nowrap: true,
    value: (r) => r.at,
    cell: (r) => <span className="a2-mono a2-t-sm">{r.at}</span>,
  },
  {
    key: "actor",
    head: "행위자",
    width: "5rem",
    nowrap: true,
    value: (r) => r.actor,
    cell: (r) => <span className="font-semibold text-(--a2-ink)">{r.actor}</span>,
  },
  // 역할은 상태가 아니라 분류값이라 Status(점+글자)가 아니라 Tag다. 행위자 바로 옆에 붙여
  // 「이 사람이 그때 무슨 자격으로 했나」를 한 덩어리로 읽게 한다
  {
    key: "role",
    head: "역할",
    width: "4.5rem",
    nowrap: true,
    hide: "sm",
    cell: (r) => <Tag>{roleOf(r.role).short}</Tag>,
  },
  {
    key: "action",
    head: "동작",
    width: "10rem",
    nowrap: true,
    value: (r) => r.action,
    cell: (r) => (
      <span className="text-(--a2-ink)">
        {r.reason && (
          <span
            role="img"
            aria-label="개인정보 열람 — 사유가 기록된 줄"
            title="개인정보 열람 — 사유가 기록된 줄"
            className="a2-dot mr-1.5 inline-block align-middle"
            style={{ color: "var(--a2-warn)" }}
          />
        )}
        {r.action}
      </span>
    ),
  },
  // 대상은 「C-2603-0421 (응시번호 0421)」처럼 ID와 설명이 붙어 온다. 잘라 내지 않고
  // 말줄임으로 두고 title에 전문을 넣는다 — 앞의 ID만 보여도 대개 할 일은 끝난다
  {
    key: "target",
    head: "대상",
    width: "16rem",
    clip: true,
    value: (r) => r.target,
    cell: (r) => (
      <span className="a2-t-sm" title={r.target}>
        {r.target}
      </span>
    ),
  },
  // 사유는 요약하거나 코드로 바꾸지 않고 적힌 그대로 둔다. 이 칸은 「사유를 받았다」는
  // 사실이 아니라 그 문장 자체가 근거이므로, 줄이면 남는 것이 없다
  {
    key: "reason",
    head: "사유",
    width: "20rem",
    clip: true,
    value: (r) => r.reason ?? "",
    cell: (r) =>
      r.reason ? (
        <span className="a2-t-sm text-(--a2-ink)" title={r.reason}>
          {r.reason}
        </span>
      ) : (
        <span className="text-(--a2-ink-4)">—</span>
      ),
  },
  {
    key: "ip",
    head: "IP",
    width: "7rem",
    nowrap: true,
    hide: "lg",
    cell: (r) => <span className="a2-mono a2-t-sm text-(--a2-ink-3)">{r.ip}</span>,
  },
];

const filters: Filter<AuditRow>[] = [
  { id: "role", label: "역할", options: roleOptions, match: (r, v) => r.role === v },
  /* 개인정보 열람만 — 이 콘솔에서 가장 자주 쓸 거르개다. 반대쪽(「그 외」)도 함께 둔 것은,
     감사에서 「사유 없이 일어난 일은 무엇인가」를 묻는 일이 그만큼 잦기 때문이다.
     사유 유무는 곧 열람 여부이므로 판정은 reason 한 칸으로 끝난다 */
  {
    id: "pii",
    label: "개인정보",
    options: [
      { value: "pii", label: "열람 기록만" },
      { value: "rest", label: "그 외" },
    ],
    match: (r, v) => (v === "pii" ? r.reason !== null : r.reason === null),
  },
];

export default function AuditTable() {
  return (
    <DataTable
      rows={auditLog}
      cols={cols}
      filters={filters}
      getKey={(r) => r.id}
      searchHint="행위자 · 동작 · 대상 · 사유"
      empty="조건에 맞는 기록이 없습니다."
      /* 고칠 수 없다는 약속을 표 바로 위에 적어 둔다. 이 화면에 「수정」·「삭제」 단추가
         없는 것이 실수가 아니라 설계라는 뜻이고, 표 아래 각주로 내리면 아무도 안 읽는다 */
      toolbarExtra={<span className="a2-t-xs text-(--a2-ink-4)">기록은 추가만 됩니다 · 고치거나 지울 수 없습니다</span>}
    />
  );
}
