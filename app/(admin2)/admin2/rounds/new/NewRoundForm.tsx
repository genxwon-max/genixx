"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { GradeBand } from "@/lib/blueprint";
import { questionCountText, subjects } from "@/lib/exam";
import { roundStateLabels } from "@/lib/admin";
import { n } from "@/lib/admin2";
import { useAdminPrefs } from "@/lib/adminStore";
import type { ItemDraft } from "@/lib/itemStore";
import {
  DEFAULT_CLOSE_AT,
  DEFAULT_OPEN_AT,
  blankNote,
  checkPeriod,
  createRound,
  defaultBand,
  planSubjects,
} from "@/lib/roundPlanStore";
import BodyEditor from "@/components/admin2/BodyEditor";
import PlanPicker from "@/components/admin2/PlanPicker";
import { Body, FormRow, PageHead } from "@/components/admin2/ui";

/**
 * ADM-05-1 회차 생성 — 이름표 칸과 입력 칸을 가로선으로 나눈 등록 폼.
 *
 * 한동안 회차 목록 위에서 판을 펼쳐 만들었다. 칸이 넷일 때는 그것으로 됐는데 공지·유의
 * 사항까지 붙으니 목록 위에 화면 반쪽이 얹혀, 만들다가 아래 목록을 보려면 접었다 폈다
 * 해야 했다. 등록은 목록과 다른 일이므로 주소를 갈랐다.
 *
 * ── 칸을 이 차례로 둔 까닭 ──
 * 위에서 아래로 「무엇을 · 언제 · 누구에게 · 무엇으로 · 무슨 말과 함께」다. 앞의 셋은
 * 회차를 부르는 값이고, 넷째(편성 칸)가 이 화면의 본체다. 공지·유의사항을 맨 아래 둔 것은
 * 비워도 되는 칸이라서다 — 필수 칸 사이에 선택 칸을 끼우면 어디까지 채워야 끝인지 흐려진다.
 *
 * ── 여기서 정하지 않는 것 ──
 * 상태는 늘 대기중으로 들어간다. 「시험중·시험완료」를 여기서 고르게 하면 검사지가 한 벌도
 * 없는 회차를 열 수 있고, 그 회차는 응시자에게 빈 시험지를 준다. 여는 일은 편성을 마친 뒤
 * 편성 화면의 관문을 지나야 한다 — 그 사실을 칸으로 세워 두고 고르지 못하게 적어 둔다.
 */
export default function NewRoundForm() {
  const prefs = useAdminPrefs();
  const router = useRouter();

  const [label, setLabel] = useState("");
  const [opensOn, setOpensOn] = useState("");
  const [closesOn, setClosesOn] = useState("");
  /* 시각은 바닥값을 깔고 시작한다 — 날짜만 정하면 그날 통째로 여는 것이고, 그것이
     이 화면에 오는 사람이 열에 아홉 바라는 것이다. 빈 칸으로 세워 두면 시각을 안 쓰는
     회차까지 두 칸을 더 채워야 만들 수 있다 */
  const [opensAt, setOpensAt] = useState(DEFAULT_OPEN_AT);
  const [closesAt, setClosesAt] = useState(DEFAULT_CLOSE_AT);
  /* 응시 정원 — **0이면 제한 없음**. 파일럿은 전면 무료라 정원을 두지 않는 것이
     기본값이고, 숫자를 적으면 그만큼만 받는다 */
  const [target, setTarget] = useState(0);
  const [band, setBand] = useState<GradeBand>(defaultBand);
  const [picked, setPicked] = useState<ItemDraft["subject"][]>([...planSubjects]);
  const [notice, setNotice] = useState(blankNote());
  const [caution, setCaution] = useState(blankNote());
  const [errors, setErrors] = useState<string[]>([]);

  const save = () => {
    const bad: string[] = [];
    if (!label.trim()) bad.push("회차 이름을 적어 주세요. 목록과 리포트에 그대로 나갑니다.");
    /* 기간은 편성 화면과 **같은 잣대**로 본다(checkPeriod). 여기서만 따로 재면
       만들 때는 통과한 기간이 편성 화면에서 막히는 날이 온다 */
    bad.push(...checkPeriod({ opensOn, opensAt, closesOn, closesAt }));
    if (picked.length === 0) bad.push("평가 과목을 하나 이상 넣어 주세요. 과목이 없으면 응시할 것이 없습니다.");
    if (!Number.isFinite(target) || target < 0 || !Number.isInteger(target))
      bad.push("응시 정원은 0 이상의 정수로 적어 주세요. 0이면 제한이 없습니다.");
    if (bad.length > 0) return setErrors(bad);

    const id = createRound(
      { label, opensOn, opensAt, closesOn, closesAt, target, band, subjects: picked, notice, caution },
      prefs.staffName || "운영자",
    );
    /* 만들고 바로 편성으로 보낸다. 목록에 줄만 하나 늘려 두면 「이제 뭘 하지」가 남는데,
       회차를 만든 다음에 할 일은 언제나 검사지를 짜는 것이다 */
    router.push(`/admin2/rounds/${id}`);
  };

  const days =
    opensOn && closesOn && closesOn >= opensOn
      ? Math.round((Date.parse(closesOn) - Date.parse(opensOn)) / 86_400_000) + 1
      : null;

  return (
    <>
      <PageHead
        title="회차 생성"
        actions={
          <Link href="/admin2/rounds" className="a2-btn">
            평가 회차
          </Link>
        }
      />

      <Body>
      <div className="a2-form">
        {/* ── 무엇을 ── */}
        <div className="a2-form-row">
          <div className="a2-form-label a2-form-req">회차 이름</div>
          <div className="a2-form-field">
            <input
              className="a2-input"
              style={{ maxWidth: "24rem" }}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="2027 파일럿 1회차"
            />
          </div>
        </div>

        {/* ── 언제 ── */}
        <div className="a2-form-row">
          <div className="a2-form-label a2-form-req">응시 시작</div>
          <div className="a2-form-field">
            <input
              type="date"
              className="a2-input"
              style={{ maxWidth: "11rem" }}
              aria-label="응시 시작일"
              value={opensOn}
              onChange={(e) => setOpensOn(e.target.value)}
            />
            <input
              type="time"
              className="a2-input"
              style={{ maxWidth: "8rem" }}
              aria-label="응시 시작 시각"
              value={opensAt}
              onChange={(e) => setOpensAt(e.target.value)}
            />
          </div>
        </div>

        <div className="a2-form-row">
          <div className="a2-form-label a2-form-req">응시 마감</div>
          <div className="a2-form-field">
            <input
              type="date"
              className="a2-input"
              style={{ maxWidth: "11rem" }}
              aria-label="응시 마감일"
              value={closesOn}
              onChange={(e) => setClosesOn(e.target.value)}
            />
            <input
              type="time"
              className="a2-input"
              style={{ maxWidth: "8rem" }}
              aria-label="응시 마감 시각"
              value={closesAt}
              onChange={(e) => setClosesAt(e.target.value)}
            />
            {days != null && (
              <span className="a2-t-sm text-(--a2-ink-3)">
                <span className="a2-num">{n(days)}</span>일간
              </span>
            )}
          </div>
        </div>

        {/* ── 누구에게 ── */}
        {/* 정원 — 적은 수만큼 결제되면 그 회차는 더 받지 않는다. 0은 제한이 없다는 뜻이다.
            「0이면 제한 없음」을 곁글로 적지 않고 **값 옆에 그대로 적는다** — 0을 넣어 본
            사람이 그 자리에서 답을 본다 */}
        <div className="a2-form-row">
          <div className="a2-form-label">응시 정원</div>
          <div className="a2-form-field">
            <input
              type="number"
              className="a2-input"
              style={{ maxWidth: "9rem" }}
              min={0}
              step={1}
              value={target}
              onChange={(e) => setTarget(Math.max(0, Math.round(Number(e.target.value) || 0)))}
            />
            <span className="a2-t-sm text-(--a2-ink-3)">
              {target === 0 ? "명 — 제한 없음" : "명까지 받습니다"}
            </span>
          </div>
        </div>

        {/* ── 무엇으로 — 이 화면의 본체 ──
            학년을 먼저 받고 과목을 넣는 까닭은 PlanPicker 머리 주석에 적어 두었다 */}
        {/* PlanPicker가 학년·평가 과목 두 줄을 그대로 낸다. 「편성」이라는 이름표로 한 번
            더 감싸지 않는다 — 감싸면 이름표가 두 겹이 되고, 편성 화면(ADM-05-4)과 여기가
            같은 줄을 다른 깊이로 그리게 된다 */}
        <PlanPicker
          band={band}
          subjects={picked}
          onChange={(next) => {
            setBand(next.band);
            setPicked(next.subjects);
          }}
        />

        {/* ── 정하지 않는 칸. 비워 두지 않고 왜 못 고치는지 적는다 ──
            상태 이름을 손으로 적지 않는다. 목록·대시보드와 같은 한 벌에서 끌어온다
            (lib/admin.ts의 roundStateLabels) — 여기만 옛 이름으로 남으면 만들자마자
            여는 화면이 다른 말을 쓴다 */}
        <div className="a2-form-row">
          <div className="a2-form-label">회차 상태</div>
          <div className="a2-form-field">
            {roundStateLabels.map((l, i) => (
              <label key={l} className="a2-choice">
                <input type="radio" checked={i === 0} disabled={i > 0} readOnly />
                {l}
              </label>
            ))}
          </div>
        </div>

        <div className="a2-form-row">
          <div className="a2-form-label">과목당 규격</div>
          <div className="a2-form-field">
            <span className="a2-t-sm text-(--a2-ink-2)">
              {subjects.map((s) => `${s.short} ${s.limitMin}분`).join(" · ")} ·{" "}
              {questionCountText()}
            </span>
          </div>
        </div>

        {/* ── 무슨 말과 함께 ── */}
        {/* 공지·유의사항은 편성 화면(ADM-05-4)과 같은 칸을 쓴다 — 글 · 마크다운 · HTML ·
            그림 네 갈래. 만드는 자리와 고치는 자리가 다른 편집기를 쓰면, 여기서 마크다운으로
            적은 것이 저기서는 글자 그대로 보인다 */}
        <FormRow label="회차 공지">
          <BodyEditor
            name="new-round-notice-mode"
            value={notice}
            disabled={false}
            rows={5}
            placeholder="이 회차에만 해당하는 안내를 적습니다. 예 — 이번 회차는 서술형 첨부 제출을 마감 30분 뒤까지 받습니다."
            onChange={(patch) => setNotice((v) => ({ ...v, ...patch }))}
          />
        </FormRow>

        <FormRow label="회차 유의사항">
          <BodyEditor
            name="new-round-caution-mode"
            value={caution}
            disabled={false}
            rows={5}
            placeholder="이 회차에서만 조심할 것을 적습니다."
            onChange={(patch) => setCaution((v) => ({ ...v, ...patch }))}
          />
        </FormRow>
      </div>

      {errors.length > 0 && (
        <ul className="a2-note mt-3" style={{ borderLeftColor: "var(--a2-danger)" }}>
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}

      {/* 등록·취소는 오른쪽 아래. 폼을 다 채우고 나면 눈이 마지막 줄 오른쪽에 있다 */}
      <div className="mt-3 flex flex-wrap items-center justify-end gap-1.5">
        <Link href="/admin2/rounds" className="a2-btn">
          취소
        </Link>
        <button type="button" className="a2-btn a2-btn-primary" onClick={save}>
          등록
        </button>
      </div>
      </Body>
    </>
  );
}
