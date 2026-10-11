"use client";

import Link from "next/link";
import { designLinks } from "@/lib/designScreens";
import DataTable, { type Col, type Filter } from "@/components/admin2/DataTable";
import { Body, FormRow, PageHead, Panel, SeedNote, Status, Switch, Tab, Tag } from "@/components/admin2/ui";
import ConsoleFrame, { ConsoleDialog } from "../ConsoleFrame";

/**
 * 면담 상품 (실제 주소 /admin2/consult-products · WBS L.2.11 「상담 상품 화면」) — 디자인.
 *
 * 보호자가 면담을 신청할 때 고르는 「얼마 동안 · 어떤 방식으로 · 얼마에」를 여기서 정한다.
 * 목록 → 줄을 눌러 수정, 오른쪽 위 「상품 등록」으로 새 상품. 다른 콘솔 목록과 같은 꼴이다.
 *
 * 지우는 대신 숨긴다. 이미 예약된 면담이 그 상품을 가리키고 있어서, 지우면 예약과 결제 내역이
 * 무엇을 산 것인지 알 수 없게 된다.
 *
 * 화면 이름은 「면담 상품」으로 적었다 — 보호자 화면과 콘솔 메뉴가 이 서비스를 「면담」이라
 * 부른다(면담 신청 · 면담 일정). WBS의 「상담 상품」과 같은 화면이다.
 */

const to = designLinks("consult-products");
const HERE = "/design/admin2/consult-products";

type Mode = "화상" | "전화" | "대면";

type Product = {
  id: string;
  name: string;
  span: number;
  modes: Mode[];
  price: number;
  shown: boolean;
  /** 이번 달 신청 건수 */
  month: number;
  /** 지금 예약이 잡혀 있는 건수 */
  live: number;
  updatedAt: string;
};

const products: Product[] = [
  { id: "CP-01", name: "결과 해석 면담 30분", span: 30, modes: ["화상", "전화"], price: 60000, shown: true, month: 42, live: 14, updatedAt: "2026-09-18" },
  { id: "CP-02", name: "결과 해석 면담 60분", span: 60, modes: ["화상", "전화", "대면"], price: 100000, shown: true, month: 31, live: 9, updatedAt: "2026-09-18" },
  { id: "CP-03", name: "진로 · 심화 면담 120분", span: 120, modes: ["대면"], price: 180000, shown: false, month: 0, live: 0, updatedAt: "2026-10-02" },
  { id: "CP-04", name: "첫 진단 안내 면담 20분", span: 20, modes: ["전화"], price: 0, shown: false, month: 0, live: 0, updatedAt: "2026-07-30" },
];

const won = (v: number) => (v === 0 ? "무료" : `${v.toLocaleString("ko-KR")}원`);
const noop = () => {};

const cols: Col<Product>[] = [
  {
    key: "id",
    head: "상품 번호",
    width: "6rem",
    nowrap: true,
    value: (r) => r.id,
    cell: (r) => <span className="a2-mono">{r.id}</span>,
  },
  {
    key: "name",
    head: "상품명",
    nowrap: true,
    value: (r) => r.name,
    /* 줄을 누르면 이 링크가 대신 눌린다(DataTable의 rowLink) */
    cell: (r) => (
      <Link href={to("CP-02")} className="font-semibold text-(--a2-ink)">
        {r.name}
      </Link>
    ),
  },
  {
    key: "span",
    head: "면담 시간",
    width: "6rem",
    num: true,
    nowrap: true,
    value: (r) => r.span,
    cell: (r) => `${r.span}분`,
  },
  {
    key: "modes",
    head: "방식",
    width: "9rem",
    nowrap: true,
    value: (r) => r.modes.join(" "),
    cell: (r) => (
      <span className="inline-flex items-center gap-2">
        {r.modes.map((m) => (
          <Tag key={m}>{m}</Tag>
        ))}
      </span>
    ),
  },
  {
    key: "price",
    head: "가격",
    width: "7rem",
    num: true,
    nowrap: true,
    value: (r) => r.price,
    cell: (r) => won(r.price),
  },
  {
    key: "month",
    head: "이번 달 신청",
    width: "7rem",
    num: true,
    nowrap: true,
    hide: "md",
    value: (r) => r.month,
    cell: (r) => `${r.month}건`,
  },
  {
    key: "shown",
    head: "노출",
    width: "6.5rem",
    nowrap: true,
    value: (r) => (r.shown ? "노출 중" : "숨김"),
    cell: (r) => (
      <span className="inline-flex items-center gap-2">
        <Switch on={r.shown} label={`${r.name} 노출`} onChange={noop} />
        {r.shown ? <Status tone="ok">노출 중</Status> : <Status tone="muted">숨김</Status>}
      </span>
    ),
  },
  {
    key: "updatedAt",
    head: "수정일",
    width: "6.5rem",
    nowrap: true,
    hide: "lg",
    value: (r) => r.updatedAt,
    cell: (r) => <span className="a2-mono a2-t-sm text-(--a2-ink-3)">{r.updatedAt}</span>,
  },
];

const filters: Filter<Product>[] = [
  {
    id: "mode",
    label: "방식",
    options: (["화상", "전화", "대면"] as Mode[]).map((m) => ({ value: m, label: m })),
    match: (r, v) => r.modes.includes(v as Mode),
  },
];

export default function ConsultProducts({ state }: { state: string }) {
  if (state === "" || state === "empty") return <List empty={state === "empty"} />;
  return <Edit state={state} />;
}

/* ───────────────────────── 목록 ───────────────────────── */

function List({ empty }: { empty: boolean }) {
  const rows = empty ? [] : products;
  return (
    <ConsoleFrame at={HERE}>
      <PageHead
        title="면담 상품"
        tabsLabel="노출 상태별 조회 조건"
        tabs={
          <>
            <Tab label="전체" count={rows.length} active onClick={noop} />
            <Tab label="노출 중" count={rows.filter((r) => r.shown).length} active={false} onClick={noop} />
            <Tab label="숨김" count={rows.filter((r) => !r.shown).length} active={false} onClick={noop} />
          </>
        }
        actions={
          <Link href={to("new")} className="a2-btn a2-btn-primary">
            상품 등록
          </Link>
        }
      />
      <DataTable
        rows={rows}
        cols={cols}
        filters={filters}
        getKey={(r) => r.id}
        rowLink
        searchHint="상품명 · 상품 번호"
        showCount={false}
        empty="등록된 면담 상품이 없습니다. 오른쪽 위 「상품 등록」으로 첫 상품을 만들어 주세요."
      />
      <SeedNote>
        노출 중인 상품만 보호자 · 학생의 면담 신청 화면에 표시됩니다. 이 화면의 값은 화면 설계를 위한
        예시입니다.
      </SeedNote>
    </ConsoleFrame>
  );
}

/* ───────────────────────── 등록 · 수정 ───────────────────────── */

const red = { color: "var(--a2-danger)" };
const redLine = { borderColor: "var(--a2-danger)" };

function Edit({ state }: { state: string }) {
  const isNew = state === "new";
  const bad = state === "CP-02/error";
  const row = products[1];
  const v = isNew
    ? { name: "", desc: "", span: 0, modes: [] as Mode[], price: "", shown: true }
    : bad
      ? { name: "", desc: descOf, span: 60, modes: [] as Mode[], price: "10만원", shown: true }
      : { name: row.name, desc: descOf, span: row.span, modes: row.modes, price: "100,000", shown: true };

  return (
    <ConsoleFrame at={HERE}>
      <PageHead
        title={isNew ? "면담 상품 등록" : row.name}
        back={
          <Link href={to()} className="a2-btn">
            ← 면담 상품
          </Link>
        }
        actions={
          isNew ? undefined : (
            <>
              <Status tone="ok">노출 중</Status>
              <Link href={to("CP-02/delete")} className="a2-btn a2-btn-danger">
                삭제
              </Link>
            </>
          )
        }
      />

      <Body className="grid gap-3">
        {bad && (
          <p className="a2-note" style={{ borderLeftColor: "var(--a2-danger)" }}>
            <span>
              <b style={red}>저장하지 못했습니다.</b> 표시된 3개 항목을 확인해 주세요.
            </span>
          </p>
        )}

        <Panel title="상품" meta={isNew ? "상품 번호는 저장할 때 정해집니다" : row.id} flush>
          <div className="a2-form">
            <FormRow
              label="상품명"
              req
              hint={
                bad ? (
                  <span style={red}>상품명을 입력해 주세요.</span>
                ) : (
                  "보호자의 면담 신청 화면과 결제 내역에 이 이름으로 표시됩니다."
                )
              }
            >
              <input
                aria-label="상품명"
                className="a2-input max-w-96"
                style={bad ? redLine : undefined}
                defaultValue={v.name}
                placeholder="예) 결과 해석 면담 60분"
              />
            </FormRow>

            <FormRow label="설명">
              <textarea
                aria-label="설명"
                className="a2-textarea"
                defaultValue={v.desc}
                placeholder="이 면담에서 무엇을 이야기하는지 한두 문장으로 적습니다."
              />
            </FormRow>

            <FormRow label="면담 시간" req hint="예약 화면의 시간표가 이 길이만큼 자리를 잡습니다. 예약이 있는 상품은 시간을 바꿀 수 없습니다.">
              <span className="flex flex-wrap items-center gap-x-5 gap-y-1">
                {[30, 60, 90, 120].map((s) => (
                  <label key={s} className="a2-choice">
                    <input type="radio" name="span" defaultChecked={v.span === s} disabled={!isNew && s !== v.span} />
                    {s}분
                  </label>
                ))}
              </span>
            </FormRow>

            <FormRow
              label="면담 방식"
              req
              hint={
                bad ? (
                  <span style={red}>방식을 하나 이상 선택해 주세요.</span>
                ) : (
                  "여러 개를 고르면 신청하는 사람이 그 가운데서 선택합니다."
                )
              }
            >
              <span className="flex flex-wrap items-center gap-x-5 gap-y-1">
                {(["화상", "전화", "대면"] as Mode[]).map((m) => (
                  <label key={m} className="a2-choice">
                    <input type="checkbox" defaultChecked={v.modes.includes(m)} />
                    {m}
                  </label>
                ))}
              </span>
            </FormRow>

            <FormRow
              label="가격"
              req
              hint={
                bad ? (
                  <span style={red}>가격은 숫자만 입력해 주세요. 예) 100000</span>
                ) : (
                  "부가세 포함 금액입니다. 0을 입력하면 무료 상품이 됩니다. 상담사가 따로 정한 가격이 있으면 그 상담사에게는 그 가격이 적용됩니다."
                )
              }
            >
              <input
                aria-label="가격"
                inputMode="numeric"
                className="a2-input a2-mono max-w-40 text-right"
                style={bad ? redLine : undefined}
                defaultValue={v.price}
                placeholder="0"
              />
              <span className="a2-t-sm text-(--a2-ink-3)">원</span>
            </FormRow>

            <FormRow label="신청 조건">
              <label className="a2-choice">
                <input type="checkbox" defaultChecked />
                발행된 진단 결과가 있는 학생만 신청할 수 있습니다
              </label>
            </FormRow>

            <FormRow label="노출" req hint="숨기면 새로 신청할 수 없습니다. 이미 예약된 면담은 그대로 진행됩니다.">
              <span className="flex flex-wrap items-center gap-x-5 gap-y-1">
                <label className="a2-choice">
                  <input type="radio" name="shown" defaultChecked={v.shown} />
                  노출
                </label>
                <label className="a2-choice">
                  <input type="radio" name="shown" defaultChecked={!v.shown} />
                  숨김
                </label>
              </span>
            </FormRow>
          </div>
        </Panel>

        {!isNew && (
          <div className="grid gap-3 lg:grid-cols-2">
            <Panel title="신청 현황" meta="2026-10">
              <dl className="grid grid-cols-3 gap-3">
                {[
                  { k: "이번 달 신청", v: `${row.month}건` },
                  { k: "진행 중인 예약", v: `${row.live}건` },
                  { k: "누적 신청", v: "212건" },
                ].map((s) => (
                  <div key={s.k}>
                    <dt className="a2-label">{s.k}</dt>
                    <dd className="mt-1 a2-metric text-(--a2-ink)">{s.v}</dd>
                  </div>
                ))}
              </dl>
            </Panel>
            <Panel
              title="이 상품을 맡는 상담사"
              meta="60분 면담을 받는 상담사 5명"
              actions={
                <Link href="/admin2/counselors" className="a2-btn a2-btn-sm">
                  상담사 관리
                </Link>
              }
            >
              <p className="flex flex-wrap gap-x-3 gap-y-1 a2-t-sm text-(--a2-ink)">
                {["김지원", "임도윤", "서민정", "최은비", "윤대현"].map((n) => (
                  <span key={n} className="font-semibold">
                    {n}
                  </span>
                ))}
              </p>
              <p className="a2-hint">어느 상담사가 몇 분 면담을 받는지는 상담사 관리에서 정합니다.</p>
            </Panel>
          </div>
        )}

        <div className="sticky bottom-0 z-10 -mx-3 mt-3 border-t border-(--a2-line) bg-(--a2-panel)/95 px-3 py-2.5 backdrop-blur">
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            <span className="mr-auto a2-t-xs text-(--a2-ink-4)">
              {isNew
                ? "상품명 · 면담 시간 · 방식 · 가격을 입력하면 등록할 수 있습니다."
                : bad
                  ? "확인이 필요한 항목이 3개 있습니다."
                  : "마지막 수정 2026-09-18 14:20 · 박서준"}
            </span>
            <Link href={to()} className="a2-btn">
              취소
            </Link>
            <button type="button" className="a2-btn a2-btn-primary" disabled={isNew}>
              {isNew ? "등록" : "저장"}
            </button>
          </div>
        </div>
      </Body>

      {state === "CP-02/delete" && (
        <ConsoleDialog
          title="이 상품은 지금 삭제할 수 없습니다"
          actions={
            <>
              <Link href={to("CP-02")} className="a2-btn">
                닫기
              </Link>
              <button type="button" className="a2-btn a2-btn-danger" disabled>
                삭제
              </button>
              <Link href={to("CP-02")} className="a2-btn a2-btn-primary">
                숨김으로 바꾸기
              </Link>
            </>
          }
        >
          <p>
            <b className="text-(--a2-ink)">「{row.name}」</b>에는 진행 중인 예약이{" "}
            <b className="text-(--a2-ink)">{row.live}건</b> 있습니다. 예약이 모두 끝나야 삭제할 수 있습니다.
          </p>
          <p className="a2-note mt-3" style={{ borderLeftColor: "var(--a2-warn)" }}>
            <span>
              새 신청만 막으려면 <b>숨김</b>으로 바꾸세요. 이미 예약된 면담과 결제 내역은 그대로 남습니다.
            </span>
          </p>
        </ConsoleDialog>
      )}
    </ConsoleFrame>
  );
}

const descOf =
  "진단 결과지를 전문가와 함께 읽고, 결과가 뜻하는 것과 가정에서 해 볼 수 있는 일을 안내합니다.";
