"use client";

import Link from "next/link";
import { ROUTE_CUT, rubric, type RubricLevel } from "@/lib/expertStore";
import { designLinks } from "@/lib/designScreens";
import { PageSaveBar } from "@/components/admin2/EditGuard";
import { Body, FormRow, PageHead, Panel, Tag } from "@/components/admin2/ui";
import ConsoleFrame, { ConsoleDialog, type ConsoleMe } from "../ConsoleFrame";

/**
 * 채점 상세의 음성 입력 답 · 사진 답안 (실제 주소 /admin2/grading/[id] · WBS Q.1.6) — 디자인.
 *
 * 지금의 채점대(app/(admin2)/admin2/grading/[id]/ScoreBench.tsx)는 글로 쓴 답만 안다. 응시
 * 화면에는 답하는 길이 둘 더 있다 —
 *
 *   음성 입력   말한 것을 받아 적어 답 칸에 넣는다. **답은 여전히 글이다** — 녹음을 내는 것이
 *               아니라서 채점대에 들을 것은 없다. 다만 받아 적는 과정에서 문장 부호가 빠지고
 *               소리가 비슷한 다른 단어로 적히는 일이 있어, 채점자가 그것을 알고 읽어야 한다.
 *   사진 올리기 종이에 쓰거나 그린 것을 찍어 올린다. AI는 사진을 채점하지 않고 손글씨를 글로
 *               바꾸지도 않는다 — 채점자가 사진을 직접 보고 채점한다.
 *
 * 그래서 「문항」 판에 답하는 방식을 적고, 사진 답안은 「학생 답」 판이 사진을 보여 준다.
 * 사진을 알아볼 수 없을 때는 점수를 매기지 않고 운영자 확인으로 넘긴다.
 *
 * 판의 차례와 루브릭은 지금의 채점대 그대로다.
 */

const to = designLinks("grading-answers");
const noop = () => {};

/** 채점은 진단 위원 권한을 받은 전문가가 한다 */
const grader: ConsoleMe = { name: "윤태호", role: "전문가 · 진단 위원", loginId: "ex.taeho_yoon" };
const graderMenu = ["/admin2/grading", "/admin2/grading/members"];

const levels: RubricLevel[] = ["full", "partial", "none"];
const toneOf = (level: RubricLevel) =>
  level === "full" ? "var(--a2-ok)" : level === "partial" ? "var(--a2-warn)" : "var(--a2-danger)";

export default function GradingAnswers({ state }: { state: string }) {
  return (
    <ConsoleFrame at="/admin2/grading" me={grader} only={graderMenu}>
      {state === "voice" ? <Voice /> : <Photo state={state} />}
    </ConsoleFrame>
  );
}

const back = (
  <Link href="/admin2/grading" className="a2-btn">
    ← 채점 관리
  </Link>
);

const nextTask = (
  <button type="button" className="a2-btn">
    다음 대기 건 →
  </button>
);

/** 루브릭 세 칸 — 지금의 채점대와 같은 모양 */
function Rubric({ picked }: { picked?: RubricLevel }) {
  return (
    <span className="grid w-full gap-1.5">
      {levels.map((v) => (
        <label key={v} className="a2-choice items-start">
          <input type="radio" name="rubric-level" defaultChecked={picked === v} />
          <span className="grid gap-0.5">
            <span className="font-semibold" style={{ color: toneOf(v) }}>
              {rubric[v].label} · {rubric[v].point}점
            </span>
            <span className="a2-t-xs text-(--a2-ink-3)">{rubric[v].guide}</span>
          </span>
        </label>
      ))}
    </span>
  );
}

/* ───────────────────────── 음성으로 입력한 답 ───────────────────────── */

function Voice() {
  return (
    <>
      <PageHead title="0423 · 국어" back={back} actions={nextTask} />
      <Body>
        <div className="grid gap-3">
          <Panel title="문항" meta="초4 · 언어" flush>
            <div className="a2-form">
              <FormRow label="발문">
                <span className="a2-t-sm text-(--a2-ink)">
                  이 이야기를 아직 읽지 않은 친구에게 한두 문장으로 간추려 들려준다면 어떻게
                  말하겠습니까?
                </span>
              </FormRow>
              <FormRow label="응답 ID">
                <span className="a2-mono a2-t-sm text-(--a2-ink-3)">SC-2610-0131</span>
              </FormRow>
              <FormRow
                label="답한 방식"
                hint="말한 것을 받아 적어 답 칸에 넣은 글입니다. 녹음은 남지 않습니다."
              >
                <Tag>서술형</Tag>
                <Tag accent>음성 입력</Tag>
              </FormRow>
            </div>
          </Panel>

          <Panel title="학생 답" meta="음성 입력으로 받아 적은 글" flush>
            <div className="grid gap-2.5 px-3 py-3">
              <p className="a2-t-md whitespace-pre-wrap text-(--a2-ink)">
                민서가 봉숭아 씨앗을 심고 날마다 물을 줬는데 사흘째에 싹이 나와서 엄청 기뻐했어요
                처음에는 씨앗이 잘못된 줄 알고 걱정했는데 그래도 물은 계속 줬어요
              </p>
              <p className="a2-note">
                <span>
                  받아 적는 과정에서 <b>문장 부호와 띄어쓰기</b>가 정해집니다. 그 둘은 채점하지 않고
                  내용만 봅니다. 소리가 비슷한 다른 단어로 적힌 곳이 있으면 앞뒤 내용으로 읽어
                  주세요.
                </span>
              </p>
            </div>
          </Panel>

          <Panel title="AI 1차 채점" flush>
            <div className="a2-form">
              <FormRow label="판정">
                <span className="a2-t-sm font-semibold" style={{ color: toneOf("full") }}>
                  {rubric.full.label}
                </span>
                <span className="a2-mono a2-t-sm" style={{ color: "var(--a2-danger)" }}>
                  확신도 0.71
                </span>
                <span className="a2-t-xs" style={{ color: "var(--a2-danger)" }}>
                  {ROUTE_CUT} 미만이라 사람에게 넘어온 건입니다
                </span>
              </FormRow>
              <FormRow label="근거">
                <span className="a2-t-sm text-(--a2-ink-2)">
                  누가 무엇을 했는지(씨앗을 심고 물을 줌)와 그래서 어떻게 되었는지(사흘째에 싹이
                  남)를 모두 말했습니다. 문장 부호 없이 이어진 글이라 두 문장으로 나눠 읽었고, 그
                  때문에 확신도를 낮게 매겼습니다.
                </span>
              </FormRow>
            </div>
          </Panel>

          <Panel title="채점" flush>
            <div className="a2-form a2-form-lg">
              <FormRow label="루브릭" req>
                <Rubric />
              </FormRow>
              <FormRow label="메모">
                <textarea
                  className="a2-textarea"
                  rows={2}
                  defaultValue=""
                  placeholder="AI와 다르게 본 사유를 적어 두면 다음 회차에 무엇을 고칠지가 남습니다."
                />
              </FormRow>
            </div>
          </Panel>
        </div>

        <PageSaveBar dirty={false} onSave={noop} onCancel={noop} disabled />
      </Body>
    </>
  );
}

/* ───────────────────────── 사진 답안 ───────────────────────── */

function Photo({ state }: { state: string }) {
  const scored = state === "file/scored";
  const unreadable = state === "file/unreadable";

  return (
    <>
      <PageHead title="0418 · 수학" back={back} actions={nextTask} />
      <Body>
        <div className="grid gap-3">
          <Panel title="문항" meta="초4 · 수리·논리" flush>
            <div className="a2-form">
              <FormRow label="발문">
                <span className="a2-t-sm text-(--a2-ink)">
                  구슬 84개를 한 봉지에 7개씩 담는 모습을 종이에 그림이나 식으로 나타내고, 사진을
                  찍어 올려 보세요.
                </span>
              </FormRow>
              <FormRow label="응답 ID">
                <span className="a2-mono a2-t-sm text-(--a2-ink-3)">SC-2610-0164</span>
              </FormRow>
              <FormRow label="답한 방식" hint="종이에 쓰거나 그린 것을 찍어 올린 답입니다. 한 문항에 한 장입니다.">
                <Tag accent>사진 올리기</Tag>
              </FormRow>
            </div>
          </Panel>

          <Panel title="학생 답" meta="사진 1장" flush>
            <div className="grid gap-3 px-3 py-3 md:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
              <Link
                href={to("file/zoom")}
                aria-label="사진 크게 보기"
                className="block overflow-hidden rounded-(--a2-radius) border border-(--a2-line) bg-(--a2-raised)"
              >
                <AnswerPhoto blurred={unreadable} />
              </Link>
              <div className="grid content-start gap-2.5">
                <dl className="grid gap-1 a2-t-sm">
                  <div className="flex gap-2">
                    <dt className="w-16 shrink-0 text-(--a2-ink-4)">올린 시각</dt>
                    <dd className="a2-mono text-(--a2-ink-2)">2026-10-04 10:42</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="w-16 shrink-0 text-(--a2-ink-4)">크기</dt>
                    <dd className="a2-mono text-(--a2-ink-2)">1,600 × 1,200 · 412KB</dd>
                  </div>
                </dl>
                <div className="flex flex-wrap gap-1.5">
                  <Link href={to("file/zoom")} className="a2-btn a2-btn-sm">
                    크게 보기
                  </Link>
                  <button type="button" className="a2-btn a2-btn-sm">
                    왼쪽으로 돌리기
                  </button>
                  <button type="button" className="a2-btn a2-btn-sm">
                    오른쪽으로 돌리기
                  </button>
                </div>
                <p className="a2-hint">
                  아이가 올린 사진 그대로입니다. 돌리기는 이 화면에서 보는 방향만 바꾸고 사진을
                  고치지 않습니다.
                </p>
              </div>
            </div>
          </Panel>

          <Panel title="AI 1차 채점" flush>
            <div className="a2-form">
              <FormRow label="판정">
                <span className="a2-t-sm text-(--a2-ink-2)">
                  사진 답안은 AI가 채점하지 않습니다. 손글씨를 글로 바꾸지도 않습니다. 채점자가
                  사진을 직접 확인하고 채점합니다.
                </span>
              </FormRow>
            </div>
          </Panel>

          <Panel title="채점" flush>
            <div className="a2-form a2-form-lg">
              <FormRow label="루브릭" req>
                <span className="grid w-full gap-1.5">
                  <Rubric picked={scored ? "full" : undefined} />
                  <label className="a2-choice items-start border-t border-(--a2-line) pt-1.5">
                    <input type="radio" name="rubric-level" defaultChecked={unreadable} />
                    <span className="grid gap-0.5">
                      <span className="font-semibold text-(--a2-ink)">알아볼 수 없음 · 점수 없음</span>
                      <span className="a2-t-xs text-(--a2-ink-3)">
                        사진이 흐리거나 잘려서 답을 읽을 수 없습니다. 점수를 매기지 않고 운영자
                        확인으로 넘깁니다.
                      </span>
                    </span>
                  </label>
                </span>
              </FormRow>

              {unreadable && (
                <FormRow label="알아볼 수 없는 이유" req>
                  <select aria-label="알아볼 수 없는 이유" className="a2-select max-w-72" defaultValue="사진이 흐립니다">
                    <option>사진이 흐립니다</option>
                    <option>답의 일부가 잘렸습니다</option>
                    <option>너무 어둡거나 빛이 반사됩니다</option>
                    <option>문항과 관계없는 사진입니다</option>
                    <option>빈 종이입니다</option>
                  </select>
                </FormRow>
              )}

              <FormRow label="메모">
                <textarea
                  className="a2-textarea"
                  rows={2}
                  defaultValue={
                    scored
                      ? "식과 그림이 맞고, 7개씩 12봉지라는 것을 그림으로 확인했습니다."
                      : unreadable
                        ? "글씨가 전혀 보이지 않습니다. 그림의 봉지 수도 셀 수 없습니다."
                        : ""
                  }
                  placeholder="사진에서 무엇을 보고 그렇게 채점했는지 적어 둡니다."
                />
              </FormRow>
            </div>
          </Panel>

          {unreadable && (
            <p className="a2-note" style={{ borderLeftColor: "var(--a2-warn)" }}>
              <span>
                저장하면 이 응답은 채점 대기에서 빠지고 <b>운영자 확인</b>으로 넘어갑니다. 운영자가
                보호자에게 사진을 다시 올려 달라고 요청할 수 있고, 다시 올라온 사진은 이 화면에서
                이어서 채점합니다.
              </span>
            </p>
          )}

          {scored && (
            <Panel title="채점 기록" flush>
              <div className="a2-form">
                <FormRow label="1차">
                  <span className="a2-t-sm font-semibold" style={{ color: toneOf("full") }}>
                    {rubric.full.label}
                  </span>
                  <span className="a2-t-xs text-(--a2-ink-4)">
                    <span className="a2-mono">2026-10-12 11:20</span> · 윤태호
                  </span>
                  <span className="a2-t-xs text-(--a2-ink-4)">사진을 직접 확인해 채점함</span>
                  <span className="a2-t-sm w-full text-(--a2-ink-2)">
                    식과 그림이 맞고, 7개씩 12봉지라는 것을 그림으로 확인했습니다.
                  </span>
                </FormRow>
              </div>
            </Panel>
          )}
        </div>

        <PageSaveBar
          dirty={unreadable}
          onSave={noop}
          onCancel={noop}
          disabled={!unreadable}
          note={
            scored
              ? "확정한 응답입니다. 다시 채점하면 기록에 남습니다."
              : unreadable
                ? "저장하면 운영자 확인으로 넘어갑니다."
                : "사진을 확인한 뒤 루브릭에서 하나를 골라 주세요."
          }
        />
      </Body>

      {state === "file/zoom" && (
        <ConsoleDialog
          title="학생 답 사진"
          wide
          actions={
            <>
              <button type="button" className="a2-btn">
                왼쪽으로 돌리기
              </button>
              <button type="button" className="a2-btn">
                오른쪽으로 돌리기
              </button>
              <button type="button" className="a2-btn">
                새 창에서 열기
              </button>
              <Link href={to("file")} className="a2-btn a2-btn-primary">
                닫기
              </Link>
            </>
          }
        >
          <span className="block overflow-hidden rounded-(--a2-radius) border border-(--a2-line) bg-(--a2-raised)">
            <AnswerPhoto />
          </span>
          <span className="mt-2 block a2-t-xs text-(--a2-ink-4)">
            <span className="a2-mono">0418 · 수학 · SC-2610-0164</span> — 2026-10-04 10:42에 올린 사진
          </span>
        </ConsoleDialog>
      )}
    </>
  );
}

/**
 * 아이가 올린 사진의 예시 — 공책에 봉지 열두 개와 식을 적은 종이.
 * 실제로는 올린 사진이 그대로 보인다. 시안에 쓸 사진이 없어 그림으로 대신한다.
 */
function AnswerPhoto({ blurred = false }: { blurred?: boolean }) {
  return (
    <svg
      viewBox="0 0 400 300"
      role="img"
      aria-label={
        blurred
          ? "학생이 올린 사진 — 흐려서 알아볼 수 없습니다"
          : "학생이 올린 사진 — 공책에 구슬 봉지 열두 개를 그리고 84 ÷ 7 = 12 라고 적었습니다"
      }
      className="block h-auto w-full"
      style={blurred ? { filter: "blur(5px) brightness(0.72)" } : undefined}
    >
      <rect width="400" height="300" fill="#8c8377" />
      <g transform="rotate(-2.5 200 150)">
        <rect x="26" y="20" width="348" height="262" rx="3" fill="#fbf9f2" />
        {Array.from({ length: 10 }, (_, i) => (
          <line key={i} x1="26" x2="374" y1={52 + i * 24} y2={52 + i * 24} stroke="#cfd9e6" strokeWidth="1" />
        ))}
        <line x1="62" x2="62" y1="20" y2="282" stroke="#f0b4b4" strokeWidth="1" />
        {/* 봉지 열두 개 — 여섯 개씩 두 줄 */}
        {Array.from({ length: 12 }, (_, i) => {
          const x = 84 + (i % 6) * 46;
          const y = 62 + Math.floor(i / 6) * 64;
          return (
            <g key={i} stroke="#2b3550" strokeWidth="1.6" fill="none" strokeLinecap="round">
              <path d={`M${x} ${y + 8} q-4 18 2 34 q14 6 28 0 q6 -16 2 -34 z`} />
              <path d={`M${x + 4} ${y + 8} q12 -9 24 0`} />
              {[0, 1, 2, 3, 4, 5, 6].map((k) => (
                <circle
                  key={k}
                  cx={x + 7 + (k % 3) * 9}
                  cy={y + 19 + Math.floor(k / 3) * 8}
                  r="2.6"
                  fill="#2b3550"
                  stroke="none"
                />
              ))}
            </g>
          );
        })}
        <text x="84" y="222" fontSize="26" fontStyle="italic" fill="#2b3550" fontFamily="var(--font-noto-kr), sans-serif">
          84 ÷ 7 = 12
        </text>
        <text x="84" y="256" fontSize="17" fontStyle="italic" fill="#2b3550" fontFamily="var(--font-noto-kr), sans-serif">
          7개씩 12봉지, 남는 구슬 없음
        </text>
      </g>
    </svg>
  );
}
