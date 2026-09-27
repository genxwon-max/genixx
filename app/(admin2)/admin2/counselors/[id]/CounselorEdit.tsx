"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import {
  counselModes,
  counselTopics,
  spanLabel,
  SPANS,
  topicList,
  type CounselMode,
  type CounselTopic,
  type Span,
} from "@/lib/counselors";
import {
  blankCounselorRow,
  canonRow,
  personOf,
  removeCounselor,
  saveCounselor,
  useCounselFees,
  useCounselorRows,
  type CounselorRow,
} from "@/lib/counselorStore";
import { WEEK_KO } from "@/lib/calendar";
import { LeaveDialog, PageSaveBar, useEditDraft, useUnsavedGuard } from "@/components/admin2/EditGuard";
import { Body, FormRow, PageHead, Panel } from "@/components/admin2/ui";

/**
 * EXP-06-2-1 상담사 상세 — 한 사람을 등록하고 고친다.
 *
 * `new`는 아직 저장소에 없는 사람이다. 저장을 눌러야 목록에 서고, 그때 제 번호를 받아 그
 * 주소로 갈아탄다 — 화면을 열기만 해도 빈 줄이 생기면 목록이 이름 없는 줄로 늘어난다
 * (공지 상세와 같은 규칙).
 *
 * ── 판을 셋으로 나눈 까닭 ──
 *   사람      누구인가 — 이름·직함·경력. **참여진(lib/people.ts)이 주인인 칸**
 *   면담       무엇을 얼마에 — 맡는 물음 · 길이 · 값 · 방식
 *   근무       언제 — 요일 · 시간 · 비우는 구간
 *
 * 한 판에 쌓으면 스무 칸이 한 줄로 내려간다. 무엇보다 첫 판은 대개 **비워 두는 판**이라
 * (아래), 채워야 하는 칸과 같은 판에 서면 안 채운 것처럼 보인다.
 *
 * ── 프로필 칸을 비워 두는 것이 정상이다 ──
 * 이름·경력은 참여진이 들고 있다. 비워 두면 그 값을 그대로 쓰고, 채우면 그 칸만 덮는다.
 * 자리표시 글에 참여진의 값을 그대로 띄워 두는 까닭이 그것이다 — 비어 있는 칸이 무엇으로
 * 채워지는지 보이지 않으면, 운영자는 같은 값을 손으로 한 번 더 적는다.
 */

/** 여러 줄 칸 — 한 줄에 하나씩 적는다 */
const linesToText = (v: string[]) => v.join("\n");
const textToLines = (v: string) => v.split("\n");

export default function CounselorEdit({ id }: { id: string }) {
  const router = useRouter();
  const rows = useCounselorRows();
  const fresh = id === "new";

  /* 새 줄은 **한 번만** 짓는다 — rows를 일부러 딸림값에서 뺀다. 넣으면 다른 상담사를
     저장할 때마다 번호가 다시 매겨지고 쓰던 초안이 날아간다 */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const made = useMemo(() => (fresh ? blankCounselorRow(rows) : null), [fresh]);
  const saved = made ?? rows.find((r) => r.id === id) ?? null;

  if (!saved) {
    return (
      <>
        <PageHead
          title="없는 상담사"
          back={
            <Link href="/admin2/counselors" className="a2-btn">
              ← 상담사 관리
            </Link>
          }
        />
        <Body>
          <Panel title="찾지 못했습니다">
            <p className="a2-t-sm text-(--a2-ink-2)">
              <span className="a2-mono">{id}</span> 상담사가 목록에 없습니다. 지워졌거나 다른
              브라우저에서 등록한 사람일 수 있습니다(명단은 이 브라우저에만 저장됩니다).
            </p>
          </Panel>
        </Body>
      </>
    );
  }

  return <Editor key={saved.id} row={saved} fresh={fresh} router={router} />;
}

function Editor({
  row,
  fresh,
  router,
}: {
  row: CounselorRow;
  fresh: boolean;
  router: ReturnType<typeof useRouter>;
}) {
  const fees = useCounselFees();
  /** 참여진에 있는 사람인가 — 있으면 빈 칸이 그 값으로 채워진다 */
  const person = personOf(row.id);

  const draft = useEditDraft({
    name: row.name,
    role: row.role,
    org: row.org,
    headline: row.headline,
    bio: row.bio,
    tags: row.tags,
    career: row.career,
    duty: row.duty,
    focus: row.focus,
    topics: row.topics,
    spans: row.spans,
    fees: row.fees,
    modes: row.modes,
    days: row.days,
    from: row.from,
    to: row.to,
    off: row.off,
    shown: row.shown,
  });
  const v = draft.value;

  const next: CounselorRow = { ...row, ...v };
  const name = v.name.trim() || person?.name || "";

  /* 비워 두면 보호자 화면에서 고를 수 없는 상담사가 되는 칸들 — 저장을 막는다.
     안내는 띄우지 않는다. 이 화면은 채우는 자리이지 읽는 자리가 아니라, 막지 않을 말은
     아예 적지 않는다 */
  const bad: string[] = [];
  if (!name) bad.push("이름을 적어 주세요.");
  if (v.spans.length === 0) bad.push("면담 길이를 하나 이상 골라 주세요.");
  if (v.modes.length === 0) bad.push("만나는 방식을 하나 이상 골라 주세요.");
  if (v.days.length === 0) bad.push("면담을 받는 요일을 하나 이상 골라 주세요.");
  if (v.from >= v.to) bad.push("근무 마감이 시작보다 앞이거나 같습니다.");
  if (v.off[0] >= v.off[1]) bad.push("비우는 구간의 끝이 시작보다 앞이거나 같습니다.");

  const save = () => {
    if (bad.length > 0) return false;
    const clean = canonRow(next);
    saveCounselor(clean);
    /* 저장소가 다듬은 꼴을 초안에도 되돌려 넣는다 — 넣지 않으면 줄 끝 빈 칸 하나로
       저장 줄이 영영 켜져 있다(lib/counselorStore.ts의 canonRow) */
    draft.patch({
      name: clean.name,
      role: clean.role,
      org: clean.org,
      headline: clean.headline,
      bio: clean.bio,
      tags: clean.tags,
      career: clean.career,
      duty: clean.duty,
      focus: clean.focus,
      spans: clean.spans,
      days: clean.days,
    });
    if (fresh) router.replace(`/admin2/counselors/${row.id}`);
    return true;
  };

  const dirty = fresh || draft.dirty;
  const guard = useUnsavedGuard(dirty, save, draft.reset);

  /** 갈래 하나를 켜고 끈다 — 차례는 목록의 차례를 지킨다 */
  const toggle = <T,>(list: T[], all: readonly T[], one: T) =>
    list.includes(one) ? list.filter((x) => x !== one) : all.filter((x) => list.includes(x) || x === one);

  return (
    <>
      <PageHead
        title={name || (fresh ? "새 상담사" : "이름 없음")}
        back={
          <Link href="/admin2/counselors" className="a2-btn">
            ← 상담사 관리
          </Link>
        }
        actions={
          !fresh && (
            <button
              type="button"
              className="a2-btn a2-btn-danger"
              onClick={() => {
                /* 지운 상담사에게 잡혀 있던 면담은 이름을 잃는다. 내려 두는 길이 따로
                   있으므로 여기까지 오는 것은 잘못 등록한 줄을 걷어 낼 때다 */
                const ok = window.confirm(
                  `「${name || row.id}」 상담사를 지웁니다.\n\n면담을 더 받지 않으려면 지우지 말고 노출을 끄세요 — 그러면 새 예약은 안 들어오고 이미 잡힌 면담은 이름을 그대로 찾습니다.\n\n지울까요?`,
                );
                if (!ok) return;
                removeCounselor(row.id);
                router.replace("/admin2/counselors");
              }}
            >
              지우기
            </button>
          )
        }
      />

      <Body className="flex flex-col gap-3">
        {/* ── ① 사람 ── */}
        <Panel title="사람" meta={row.id} flush>
          <div className="a2-form">
            <FormRow label="이름" req={!person}>
              <input
                className="a2-input"
                style={{ maxWidth: "14rem" }}
                value={v.name}
                onChange={(e) => draft.set("name", e.target.value)}
                placeholder={person?.name ?? "김지원"}
              />
            </FormRow>

            <FormRow label="직함">
              <input
                className="a2-input"
                style={{ maxWidth: "24rem" }}
                value={v.role}
                onChange={(e) => draft.set("role", e.target.value)}
                placeholder={person?.role ?? "책임연구원 · 진단 총괄"}
              />
            </FormRow>

            <FormRow label="소속">
              <input
                className="a2-input"
                style={{ maxWidth: "24rem" }}
                value={v.org}
                onChange={(e) => draft.set("org", e.target.value)}
                placeholder={person?.org ?? "GENIXX 재능연구소"}
              />
            </FormRow>

            <FormRow label="전문 분야">
              <input
                className="a2-input"
                style={{ maxWidth: "28rem" }}
                value={v.tags.join(", ")}
                onChange={(e) => draft.set("tags", e.target.value.split(","))}
                placeholder={person?.tags.join(", ") ?? "영재교육, 구인 타당도"}
              />
            </FormRow>

            <FormRow label="소개 한 줄">
              <input
                className="a2-input"
                style={{ maxWidth: "34rem" }}
                value={v.headline}
                onChange={(e) => draft.set("headline", e.target.value)}
                placeholder={person?.headline ?? "재능을 등급이 아니라 발현 조건으로 읽습니다"}
              />
            </FormRow>

            <FormRow label="소개">
              <textarea
                className="a2-textarea"
                rows={4}
                value={v.bio}
                onChange={(e) => draft.set("bio", e.target.value)}
                placeholder={person?.bio ?? "어떤 자리에서 무엇을 해 온 사람인지 적습니다."}
              />
            </FormRow>

            <FormRow label="연혁">
              <textarea
                className="a2-textarea"
                rows={4}
                value={linesToText(v.career)}
                onChange={(e) => draft.set("career", textToLines(e.target.value))}
                placeholder={person ? linesToText(person.career) : "교육학 박사 (영재교육 전공)"}
              />
            </FormRow>

            <FormRow label="맡는 일">
              <textarea
                className="a2-textarea"
                rows={3}
                value={linesToText(v.duty)}
                onChange={(e) => draft.set("duty", textToLines(e.target.value))}
                placeholder={person ? linesToText(person.duty) : "결과 해석 면담 진행"}
              />
            </FormRow>
          </div>
        </Panel>

        {/* ── ② 면담 ── */}
        <Panel title="면담" flush>
          <div className="a2-form">
            <FormRow label="한 줄 소개">
              <input
                className="a2-input"
                style={{ maxWidth: "34rem" }}
                value={v.focus}
                onChange={(e) => draft.set("focus", e.target.value)}
                placeholder="결과지의 여덟 축을 「집에서 무엇을 바꿀지」로 옮겨 드립니다."
              />
            </FormRow>

            <FormRow label="맡는 물음" req>
              {topicList.map((t) => (
                <label key={t} className="a2-choice">
                  <input
                    type="checkbox"
                    checked={v.topics.includes(t)}
                    onChange={() => draft.set("topics", toggle<CounselTopic>(v.topics, topicList, t))}
                  />
                  {counselTopics[t]}
                </label>
              ))}
            </FormRow>

            <FormRow label="면담 길이" req>
              {SPANS.map((s) => (
                <label key={s} className="a2-choice">
                  <input
                    type="checkbox"
                    checked={v.spans.includes(s)}
                    onChange={() => draft.set("spans", toggle<Span>(v.spans, SPANS, s))}
                  />
                  {spanLabel(s)}
                </label>
              ))}
            </FormRow>

            {/* 값은 고른 길이에만 물어본다 — 받지 않는 길이의 값을 받아 두면 그 값이 어디에도
                안 쓰이는 채로 남고, 뒤에 그 길이를 열었을 때 잊고 있던 값이 튀어나온다 */}
            <FormRow label="면담 값">
              {v.spans.length === 0 ? (
                <span className="a2-t-sm text-(--a2-ink-4)">—</span>
              ) : (
                <span className="flex w-full flex-wrap items-center gap-x-4 gap-y-2">
                  {v.spans.map((s) => (
                    <span key={s} className="inline-flex items-center gap-1.5">
                      <span className="a2-t-sm text-(--a2-ink-2)">{spanLabel(s)}</span>
                      <input
                        className="a2-input a2-num"
                        style={{ maxWidth: "9.5rem" }}
                        inputMode="numeric"
                        aria-label={`${spanLabel(s)} 면담 값`}
                        value={v.fees[s] != null ? v.fees[s]!.toLocaleString("ko-KR") : ""}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/[^0-9]/g, "");
                          const mine = { ...v.fees };
                          if (digits === "") delete mine[s];
                          else mine[s] = Number(digits);
                          draft.set("fees", mine);
                        }}
                        /* 자리표시 글에 단위를 붙이지 않는다 — 칸 오른쪽에 「원」이 이미
                           서 있어 「60,000원 원」으로 읽힌다 */
                        placeholder={fees[s].toLocaleString("ko-KR")}
                      />
                      <span className="a2-t-sm text-(--a2-ink-3)">원</span>
                    </span>
                  ))}
                </span>
              )}
            </FormRow>

            <FormRow label="만나는 방식" req>
              {(Object.keys(counselModes) as CounselMode[]).map((m) => (
                <label key={m} className="a2-choice">
                  <input
                    type="checkbox"
                    checked={v.modes.includes(m)}
                    onChange={() =>
                      draft.set("modes", toggle<CounselMode>(v.modes, Object.keys(counselModes) as CounselMode[], m))
                    }
                  />
                  {counselModes[m]}
                </label>
              ))}
            </FormRow>

            <FormRow label="노출">
              <label className="a2-choice">
                <input
                  type="checkbox"
                  checked={v.shown}
                  onChange={(e) => draft.set("shown", e.target.checked)}
                />
                보호자·학생 화면의 목록에 세웁니다
              </label>
            </FormRow>
          </div>
        </Panel>

        {/* ── ③ 근무 ── */}
        <Panel title="근무" flush>
          <div className="a2-form">
            <FormRow label="요일" req>
              {WEEK_KO.map((label, d) => (
                <label key={label} className="a2-choice">
                  <input
                    type="checkbox"
                    checked={v.days.includes(d)}
                    onChange={() =>
                      draft.set(
                        "days",
                        v.days.includes(d)
                          ? v.days.filter((x) => x !== d)
                          : [...v.days, d].sort((a, b) => a - b),
                      )
                    }
                  />
                  {label}
                </label>
              ))}
            </FormRow>

            <FormRow label="여는 시간" req>
              <input
                type="time"
                step={1800}
                className="a2-input a2-mono"
                style={{ maxWidth: "8rem" }}
                aria-label="근무 시작"
                value={v.from}
                onChange={(e) => draft.set("from", e.target.value)}
              />
              <span className="a2-t-sm text-(--a2-ink-3)">—</span>
              <input
                type="time"
                step={1800}
                className="a2-input a2-mono"
                style={{ maxWidth: "8rem" }}
                aria-label="근무 마감"
                value={v.to}
                onChange={(e) => draft.set("to", e.target.value)}
              />
            </FormRow>

            <FormRow label="비우는 구간">
              <input
                type="time"
                step={1800}
                className="a2-input a2-mono"
                style={{ maxWidth: "8rem" }}
                aria-label="비우는 구간 시작"
                value={v.off[0]}
                onChange={(e) => draft.set("off", [e.target.value, v.off[1]])}
              />
              <span className="a2-t-sm text-(--a2-ink-3)">—</span>
              <input
                type="time"
                step={1800}
                className="a2-input a2-mono"
                style={{ maxWidth: "8rem" }}
                aria-label="비우는 구간 끝"
                value={v.off[1]}
                onChange={(e) => draft.set("off", [v.off[0], e.target.value])}
              />
            </FormRow>
          </div>
        </Panel>

        {bad.length > 0 && (
          <Panel title="짚을 것">
            <ul className="flex flex-col gap-1">
              {bad.map((e) => (
                <li key={e} className="a2-t-sm" style={{ color: "var(--a2-danger)" }}>
                  · {e}
                </li>
              ))}
            </ul>
          </Panel>
        )}

        <PageSaveBar
          dirty={dirty}
          onSave={save}
          onCancel={fresh ? () => router.push("/admin2/counselors") : draft.reset}
          disabled={bad.length > 0}
          note={bad.length > 0 ? bad[0] : undefined}
        />
      </Body>
      <LeaveDialog guard={guard} />
    </>
  );
}
