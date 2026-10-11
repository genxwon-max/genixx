"use client";

import Link from "next/link";
import { GRADES } from "@/lib/adminUsers";
import { designLinks } from "@/lib/designScreens";
import { Body, FormRow, PageHead, Panel, Tag } from "@/components/admin2/ui";
import ConsoleFrame, { ConsoleDialog } from "../ConsoleFrame";

/**
 * 학생 등록 — 운영자가 대신 등록 (실제 주소 /admin2/students/new · WBS v4/new/students-new) — 디자인.
 *
 * 학생 상세(/admin2/students/[id])의 「기본정보」와 같은 칸을 쓰고, 처음 만들 때만 정하는 것
 * 셋을 더한다 — 생년월일(학생 로그인에 쓰인다) · 보호자 · 대신 등록하는 사유.
 *
 * 학생은 스스로 가입하지 않고 보호자 회원 아래에 등록된다. 그래서 보호자를 먼저 찾아 고른다.
 * 접속코드는 등록하는 순간 발급되고, 그 뒤로는 학생 상세에서 보고 다시 발급한다.
 */

const to = designLinks("student-new");

type Slug = "" | "filled" | "error" | "guardian" | "confirm" | "done";

const guardian = { name: "김지은", id: "M-100100", phone: "010-4821-7730", mail: "jieun.kim@example.com" };

const filled = {
  name: "김도현",
  birth: "2016-03-14",
  gender: "남",
  school: "서울한빛초등학교",
  grade: "초4",
  relation: "어머니",
  why: "보호자 요청 (전화)",
  memo: "보호자가 휴대전화 인증 오류로 직접 등록하지 못해 전화로 요청함.",
};

/** 보호자 찾기 창의 검색 결과 — 「김지」로 찾은 것 */
const found = [
  { ...guardian, children: 1 },
  { name: "김지훈", id: "M-100412", phone: "010-9034-1182", mail: "jihun.k@example.com", children: 2 },
  { name: "김지아", id: "M-101077", phone: "010-5567-2049", mail: "jia_kim@example.com", children: 0 },
];

const red = { color: "var(--a2-danger)" };
const redLine = { borderColor: "var(--a2-danger)" };

export default function StudentNew({ state }: { state: string }) {
  const slug = state as Slug;
  const blank = slug === "" || slug === "guardian";
  const bad = slug === "error";
  const v = blank
    ? { name: "", birth: "", gender: "", school: "", grade: "", relation: "", why: "", memo: "" }
    : bad
      ? { ...filled, school: "" }
      : filled;
  const picked = !blank;

  return (
    <ConsoleFrame at="/admin2/students">
      <PageHead
        title="학생 등록"
        back={
          <Link href="/admin2/students" className="a2-btn">
            ← 학생·접속코드
          </Link>
        }
      />

      <Body className="grid gap-3">
        {bad && (
          <p className="a2-note" style={{ borderLeftColor: "var(--a2-danger)" }}>
            <span>
              <b style={red}>등록하지 못했습니다.</b> 이 보호자에게 이름과 생년월일이 같은 학생이 이미
              있습니다 —{" "}
              <Link href="/admin2/students/S-200400" className="font-bold text-(--a2-accent-2) underline">
                김도현 <span className="a2-mono">S-200400</span>
              </Link>
              . 같은 학생이면 그 학생의 상세에서 수정해 주세요.
            </span>
          </p>
        )}

        <Panel title="기본정보" flush>
          <div className="a2-form">
            <FormRow label="이름" req>
              <input
                aria-label="이름"
                className="a2-input max-w-80"
                style={bad ? redLine : undefined}
                defaultValue={v.name}
                placeholder="예) 김도현"
              />
            </FormRow>

            <FormRow label="생년월일" req hint="학생은 접속코드와 생년월일로 로그인합니다. 등록한 뒤에는 학생 상세에서만 고칠 수 있습니다.">
              <input
                aria-label="생년월일"
                type="date"
                className="a2-input a2-mono max-w-40"
                style={bad ? redLine : undefined}
                defaultValue={v.birth}
              />
              {v.birth && <span className="a2-t-sm text-(--a2-ink-3)">만 10세</span>}
            </FormRow>

            <FormRow label="성별">
              <span className="flex flex-wrap items-center gap-x-5 gap-y-1">
                {["남", "여", "선택 안 함"].map((g) => (
                  <label key={g} className="a2-choice">
                    <input type="radio" name="gender" defaultChecked={v.gender === g} />
                    {g}
                  </label>
                ))}
              </span>
            </FormRow>

            <FormRow
              label="학교"
              req
              hint={bad ? <span style={red}>학교를 입력해 주세요.</span> : undefined}
            >
              <input
                aria-label="학교"
                className="a2-input max-w-80"
                style={bad ? redLine : undefined}
                defaultValue={v.school}
                placeholder="예) 서울한빛초등학교"
              />
            </FormRow>

            <FormRow label="학년" req>
              <select aria-label="학년" className="a2-select max-w-40" defaultValue={v.grade}>
                <option value="">선택</option>
                {GRADES.map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </select>
            </FormRow>
          </div>
        </Panel>

        <Panel title="보호자" flush>
          <div className="a2-form">
            <FormRow
              label="보호자 회원"
              req
              hint="학생은 보호자 회원 아래에 등록됩니다. 보호자가 아직 가입하지 않았다면 회원가입부터 안내해 주세요."
            >
              {picked ? (
                <>
                  <Link
                    href={`/admin2/members/${guardian.id}`}
                    className="inline-flex items-baseline gap-1.5 a2-t-sm font-semibold text-(--a2-accent-2) underline"
                  >
                    {guardian.name}
                    <span className="a2-mono a2-t-xs">{guardian.id}</span>
                  </Link>
                  <span className="flex flex-wrap items-center gap-x-2 a2-mono a2-t-xs text-(--a2-ink-3)">
                    <span>{guardian.phone}</span>
                    <span aria-hidden>·</span>
                    <span>{guardian.mail}</span>
                  </span>
                  <Link href={to("guardian")} className="a2-btn a2-btn-sm">
                    다시 찾기
                  </Link>
                </>
              ) : (
                <>
                  <span className="a2-t-sm text-(--a2-ink-4)">아직 고르지 않았습니다</span>
                  <Link href={to("guardian")} className="a2-btn">
                    보호자 찾기
                  </Link>
                </>
              )}
            </FormRow>

            <FormRow label="학생과의 관계">
              <select aria-label="학생과의 관계" className="a2-select max-w-40" defaultValue={v.relation}>
                <option value="">선택</option>
                {["어머니", "아버지", "조부모", "그 밖의 보호자"].map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </FormRow>
          </div>
        </Panel>

        <Panel title="등록 사유" meta="운영자가 대신 등록한 기록은 감사 로그에 남습니다" flush>
          <div className="a2-form">
            <FormRow label="대신 등록하는 사유" req>
              <select aria-label="대신 등록하는 사유" className="a2-select max-w-64" defaultValue={v.why}>
                <option value="">선택</option>
                {["보호자 요청 (전화)", "보호자 요청 (1:1 문의)", "기관 단체 등록 지원", "그 밖의 사유"].map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </FormRow>
            <FormRow label="메모">
              <textarea
                aria-label="메모"
                className="a2-textarea"
                defaultValue={v.memo}
                placeholder="누가 언제 어떻게 요청했는지 적어 둡니다. 주민등록번호 같은 개인정보는 적지 않습니다."
              />
            </FormRow>
          </div>
        </Panel>

        <Panel title="접속코드" meta="8자리 · 등록하면 바로 발급됩니다" flush>
          <div className="a2-form">
            <FormRow label="보호자에게 알림">
              <label className="a2-choice">
                <input type="checkbox" defaultChecked />
                학생 등록 알림과 접속코드를 보호자 휴대전화로 보냅니다
              </label>
              <span className="a2-hint">끄면 접속코드를 운영자가 직접 전달해야 합니다. 코드는 학생 상세에서 다시 볼 수 있습니다.</span>
            </FormRow>
          </div>
        </Panel>

        <div className="sticky bottom-0 z-10 -mx-3 mt-3 border-t border-(--a2-line) bg-(--a2-panel)/95 px-3 py-2.5 backdrop-blur">
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            <span className="mr-auto a2-t-xs text-(--a2-ink-4)">
              {blank
                ? "이름 · 생년월일 · 학교 · 학년 · 보호자 · 사유를 입력하면 등록할 수 있습니다."
                : bad
                  ? "확인이 필요한 항목이 있습니다."
                  : "등록하면 접속코드가 발급되고 감사 로그에 「학생 대리 등록」으로 남습니다."}
            </span>
            <Link href="/admin2/students" className="a2-btn">
              취소
            </Link>
            {blank ? (
              <button type="button" className="a2-btn a2-btn-primary" disabled>
                등록
              </button>
            ) : (
              <Link href={to("confirm")} className="a2-btn a2-btn-primary">
                등록
              </Link>
            )}
          </div>
        </div>
      </Body>

      {slug === "guardian" && (
        <ConsoleDialog
          title="보호자 찾기"
          wide
          actions={
            <Link href={to()} className="a2-btn">
              닫기
            </Link>
          }
        >
          <div className="flex gap-1.5">
            <input
              aria-label="보호자 검색"
              className="a2-input"
              defaultValue="김지"
              placeholder="이름 · 휴대전화 · 이메일"
            />
            <button type="button" className="a2-btn a2-btn-primary">
              검색
            </button>
          </div>
          <p className="mt-2 a2-t-xs text-(--a2-ink-4)">학부모 회원 3명을 찾았습니다.</p>
          <div className="mt-1.5 overflow-hidden rounded-(--a2-radius) border border-(--a2-line)">
            <table className="a2-table">
              <thead>
                <tr>
                  <th scope="col">이름</th>
                  <th scope="col">휴대전화</th>
                  <th scope="col" className="a2-th-num">
                    등록 학생
                  </th>
                  <th scope="col" />
                </tr>
              </thead>
              <tbody>
                {found.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <span className="font-semibold text-(--a2-ink)">{m.name}</span>{" "}
                      <span className="a2-mono a2-t-xs text-(--a2-ink-4)">{m.id}</span>
                      <span className="block a2-mono a2-t-xs text-(--a2-ink-3)">{m.mail}</span>
                    </td>
                    <td className="a2-mono a2-nowrap a2-t-sm">{m.phone}</td>
                    <td className="a2-td-num">{m.children}명</td>
                    <td className="a2-nowrap text-right">
                      <Link href={to("filled")} className="a2-btn a2-btn-sm">
                        선택
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="a2-hint mt-2">찾는 보호자가 없으면 아직 가입하지 않은 것입니다. 회원가입 뒤에 다시 등록해 주세요.</p>
        </ConsoleDialog>
      )}

      {slug === "confirm" && (
        <ConsoleDialog
          title="학생을 등록할까요?"
          actions={
            <>
              <Link href={to("filled")} className="a2-btn">
                취소
              </Link>
              <Link href={to("done")} className="a2-btn a2-btn-primary">
                등록
              </Link>
            </>
          }
        >
          <dl className="grid grid-cols-[5.5rem_1fr] gap-x-3 gap-y-1">
            <dt className="text-(--a2-ink-3)">학생</dt>
            <dd className="font-semibold text-(--a2-ink)">
              {filled.name} <span className="a2-mono font-normal text-(--a2-ink-3)">{filled.birth}</span>
            </dd>
            <dt className="text-(--a2-ink-3)">학교 · 학년</dt>
            <dd className="text-(--a2-ink)">
              {filled.school} · {filled.grade}
            </dd>
            <dt className="text-(--a2-ink-3)">보호자</dt>
            <dd className="text-(--a2-ink)">
              {guardian.name} <span className="a2-mono text-(--a2-ink-3)">{guardian.id}</span>
            </dd>
            <dt className="text-(--a2-ink-3)">사유</dt>
            <dd className="text-(--a2-ink)">{filled.why}</dd>
          </dl>
          <p className="mt-3">
            등록하면 접속코드가 발급되고, 보호자 휴대전화(<span className="a2-mono">{guardian.phone}</span>)로
            알림이 갑니다.
          </p>
        </ConsoleDialog>
      )}

      {slug === "done" && (
        <ConsoleDialog
          title="학생을 등록했습니다"
          actions={
            <>
              <Link href={to()} className="a2-btn">
                한 명 더 등록
              </Link>
              <Link href="/admin2/students/S-200400" className="a2-btn a2-btn-primary">
                학생 상세 보기
              </Link>
            </>
          }
        >
          <p className="flex flex-wrap items-center gap-x-2">
            <b className="text-(--a2-ink)">{filled.name}</b>
            <span className="a2-mono">S-204318</span>
            <Tag>{filled.grade}</Tag>
            <span>· 보호자 {guardian.name}</span>
          </p>
          <div className="mt-3 rounded-(--a2-radius) border border-(--a2-line) bg-(--a2-raised) p-3">
            <p className="a2-label">접속코드</p>
            <p className="mt-1 flex flex-wrap items-center gap-2">
              <span className="a2-metric text-(--a2-ink)">H7KM-2QXP</span>
              <button type="button" className="a2-btn a2-btn-sm">
                복사
              </button>
            </p>
          </div>
          <p className="a2-note mt-3" style={{ borderLeftColor: "var(--a2-ok)" }}>
            <span>보호자 휴대전화로 등록 알림과 접속코드를 보냈습니다. 코드는 학생 상세에서 다시 보거나 재발급할 수 있습니다.</span>
          </p>
        </ConsoleDialog>
      )}
    </ConsoleFrame>
  );
}
