"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { GradeBand } from "@/lib/blueprint";
import { QUESTIONS_PER_SUBJECT, subjects } from "@/lib/exam";
import { n } from "@/lib/admin2";
import { useAdminPrefs } from "@/lib/adminStore";
import type { ItemDraft } from "@/lib/itemStore";
import { blankNote, createRound, defaultBand, planSubjects } from "@/lib/roundPlanStore";
import NoteField from "@/components/admin2/NoteField";
import PlanPicker from "@/components/admin2/PlanPicker";
import { Body, PageHead } from "@/components/admin2/ui";

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
 * 상태는 늘 준비중으로 들어간다. 「시험중·시험완료」를 여기서 고르게 하면 검사지가 한 벌도
 * 없는 회차를 열 수 있고, 그 회차는 응시자에게 빈 시험지를 준다. 여는 일은 편성을 마친 뒤
 * 편성 화면의 관문을 지나야 한다 — 그 사실을 칸으로 세워 두고 고르지 못하게 적어 둔다.
 */
export default function NewRoundForm() {
  const prefs = useAdminPrefs();
  const router = useRouter();

  const [label, setLabel] = useState("");
  const [opensOn, setOpensOn] = useState("");
  const [closesOn, setClosesOn] = useState("");
  const [target, setTarget] = useState(1000);
  const [band, setBand] = useState<GradeBand>(defaultBand);
  const [picked, setPicked] = useState<ItemDraft["subject"][]>([...planSubjects]);
  const [notice, setNotice] = useState(blankNote());
  const [caution, setCaution] = useState(blankNote());
  const [errors, setErrors] = useState<string[]>([]);

  const save = () => {
    const bad: string[] = [];
    if (!label.trim()) bad.push("회차 이름을 적어 주세요. 목록과 리포트에 그대로 나갑니다.");
    if (!opensOn || !closesOn) bad.push("응시 기간을 정해 주세요.");
    else if (closesOn < opensOn) bad.push("마감일이 시작일보다 앞섭니다.");
    if (picked.length === 0) bad.push("평가 과목을 하나 이상 넣어 주세요. 과목이 없으면 응시할 것이 없습니다.");
    if (!Number.isFinite(target) || target <= 0) bad.push("응시 대상 수를 한 명 이상으로 적어 주세요.");
    if (bad.length > 0) return setErrors(bad);

    const id = createRound(
      { label, opensOn, closesOn, target, band, subjects: picked, notice, caution },
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
        meta={
          <>
            <span>새 평가 회차를 만듭니다</span>
            <span aria-hidden>·</span>
            <span>
              <span className="a2-form-req" />는 꼭 채워야 하는 칸입니다
            </span>
          </>
        }
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
            <span className="a2-hint">회차 목록 · 리포트 · 응시 화면에 이 이름 그대로 나갑니다.</span>
          </div>
        </div>

        {/* ── 언제 ── */}
        <div className="a2-form-row">
          <div className="a2-form-label a2-form-req">응시 시작</div>
          <div className="a2-form-field">
            <input
              type="date"
              className="a2-input"
              style={{ maxWidth: "12rem" }}
              value={opensOn}
              onChange={(e) => setOpensOn(e.target.value)}
            />
          </div>
        </div>

        <div className="a2-form-row">
          <div className="a2-form-label a2-form-req">응시 마감</div>
          <div className="a2-form-field">
            <input
              type="date"
              className="a2-input"
              style={{ maxWidth: "12rem" }}
              value={closesOn}
              onChange={(e) => setClosesOn(e.target.value)}
            />
            {days != null && (
              <span className="a2-t-sm text-(--a2-ink-3)">
                <span className="a2-num">{n(days)}</span>일간
              </span>
            )}
            <span className="a2-hint">
              기간은 나중에 편성 화면에서 고칠 수 있습니다. 고치면 까닭이 회차 기록에 남습니다.
            </span>
          </div>
        </div>

        {/* ── 누구에게 ── */}
        <div className="a2-form-row">
          <div className="a2-form-label a2-form-req">응시 대상</div>
          <div className="a2-form-field">
            <input
              type="number"
              className="a2-input"
              style={{ maxWidth: "9rem" }}
              min={1}
              value={target}
              onChange={(e) => setTarget(Math.round(Number(e.target.value) || 0))}
            />
            <span className="a2-t-sm text-(--a2-ink-3)">명</span>
            <span className="a2-hint">제출률의 분모입니다. 실제 응시자 수가 아니라 내보낼 대상 수입니다.</span>
          </div>
        </div>

        {/* ── 무엇으로 — 이 화면의 본체 ──
            학년군을 먼저 받고 과목을 넣는 까닭은 PlanPicker 머리 주석에 적어 두었다 */}
        <div className="a2-form-row">
          <div className="a2-form-label a2-form-req">편성</div>
          <div className="a2-form-field">
            <div className="w-full">
              <PlanPicker
                band={band}
                subjects={picked}
                onChange={(next) => {
                  setBand(next.band);
                  setPicked(next.subjects);
                }}
              />
            </div>
            <span className="a2-hint">
              한 벌 {QUESTIONS_PER_SUBJECT}문항 기준입니다. 나중에 편성 화면에서 다시 정할 수 있습니다.
            </span>
          </div>
        </div>

        {/* ── 정하지 않는 칸. 비워 두지 않고 왜 못 고치는지 적는다 ── */}
        <div className="a2-form-row">
          <div className="a2-form-label">회차 상태</div>
          <div className="a2-form-field">
            <label className="a2-choice">
              <input type="radio" checked readOnly />
              준비중
            </label>
            <label className="a2-choice">
              <input type="radio" disabled />
              응시 진행중
            </label>
            <label className="a2-choice">
              <input type="radio" disabled />
              채점중
            </label>
            <label className="a2-choice">
              <input type="radio" disabled />
              마감
            </label>
            <span className="a2-hint">
              새 회차는 늘 준비중으로 들어갑니다. 검사지가 한 벌도 없는 회차를 열면 응시자가 빈 시험지를 받으므로, 여는
              일은 편성을 마친 뒤 편성 화면의 관문을 지나야 합니다.
            </span>
          </div>
        </div>

        <div className="a2-form-row">
          <div className="a2-form-label">과목당 규격</div>
          <div className="a2-form-field">
            <span className="a2-t-sm text-(--a2-ink-2)">
              {subjects.map((s) => `${s.short} ${s.limitMin}분`).join(" · ")} · 과목당{" "}
              <span className="a2-num">{QUESTIONS_PER_SUBJECT}</span>문항
            </span>
            <span className="a2-hint">
              응시 화면이 쓰는 값입니다(lib/exam.ts). 회차마다 다르게 두는 길은 아직 없습니다.
            </span>
          </div>
        </div>

        {/* ── 무슨 말과 함께 ── */}
        <div className="a2-form-row">
          <div className="a2-form-label">회차 공지</div>
          <div className="a2-form-field">
            <div className="w-full">
              <NoteField
                label="회차 공지"
                value={notice}
                onChange={setNotice}
                placeholder="이 회차에만 해당하는 안내를 적습니다. 예 — 이번 회차는 서술형 첨부 제출을 마감 30분 뒤까지 받습니다."
                hint="비워 두어도 됩니다. 편성 화면에서 나중에 적거나 고칠 수 있습니다."
              />
            </div>
          </div>
        </div>

        <div className="a2-form-row">
          <div className="a2-form-label">회차 유의사항</div>
          <div className="a2-form-field">
            <div className="w-full">
              <NoteField
                label="회차 유의사항"
                value={caution}
                onChange={setCaution}
                placeholder="이 회차에서만 조심할 것을 적습니다."
                hint="검사 전체의 유의사항과 다릅니다 — 저쪽은 회차가 바뀌어도 같은 말이고, 이 칸은 이번 회차에서만 참인 말입니다."
              />
            </div>
          </div>
        </div>
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
