import Link from "next/link";
import { can, permissionIds, staffRoles, type PermissionId } from "@/lib/admin";
import { staffDirectory } from "@/lib/adminUsers";
import { n } from "@/lib/admin2";
import { Body, PageHead, Panel, SeedNote } from "@/components/admin2/ui";
import TableBox from "@/components/admin2/TableBox";
import StaffTable from "./StaffTable";

export const metadata = { title: "운영자·권한" };

/*
 * ADM-03 운영자·권한.
 *
 * 이 콘솔에서 슈퍼 관리자만 여는 화면이고, 여기서 답해야 하는 질문은 둘뿐이다 —
 *
 *   ① 누가 들어올 수 있는가        운영자 목록 (계정 · 역할 · 2단계 인증 · 상태)
 *   ② 그 역할은 무엇을 할 수 있는가  역할 × 권한 대조표
 *
 * 두 덩이를 세로로 쌓아 한 화면에 함께 둔다. 「출제자 계정이 열두 개 있다」와 「출제자는
 * 학생 개인정보를 못 본다」는 따로 있으면 아무 뜻이 없고, 둘을 겹쳐야 비로소 「지금
 * 개인정보에 닿을 수 있는 사람이 몇인가」가 된다. 대조표를 딴 화면으로 빼지 않은 까닭이다.
 *
 * 지표 띠(Kpi)를 두지 않았다. 넉 줄짜리 띠를 얹으면 표 머리가 100px 밀리는데 이 화면에서
 * 실제로 쓰는 숫자는 넷 다 한 줄로 적히는 종류다. 그래서 제목 옆 meta로 붙였다.
 * 최고권한 계정 수와 2단계 미설정 수를 나란히 세운 것은 이 둘이 겹치는 순간이 사고라서다.
 *
 * ⚠ 계정·이름은 전부 예시다(lib/adminUsers.ts). 권한 표만은 예시가 아니라 실제 정의로,
 *   lib/admin.ts의 staffRoles.permissions를 can()으로 그대로 읽어 찍는다. 손으로 옮겨
 *   적으면 정의가 바뀌었을 때 화면만 옛말을 하게 된다.
 */

/** 권한 ID 옆에 붙일 뜻 — lib/admin.ts PermissionId 선언에 달린 주석을 그대로 옮긴다 */
const permissionLabel: Record<PermissionId, string> = {
  "member.read": "회원 목록 열람",
  "member.approve": "교사·기관 가입 승인",
  "student.pii": "학생 개인정보(생년월일·연락처) 열람",
  "student.code": "접속코드 발급·회수",
  "round.manage": "회차 개설·마감",
  "item.write": "문항 작성",
  "item.review": "문항 교차 검수·승인",
  "grade.review": "AI 제안값 검토 의견 등록",
  "grade.confirm": "판정 확정·리포트 발행",
  "org.manage": "기관 계약·응시권 배정",
  "billing.read": "결제·정산 열람",
  "content.publish": "콘텐츠 발행",
  "inquiry.reply": "문의 답변",
  "audit.read": "감사 로그 열람",
  "staff.manage": "운영자 계정·권한 관리",
  "report.publish": "리포트 발행 승인 (EXP-08-3)",
  "psychometrics.read": "심리측정 분석 콘솔 (ADM-07)",
  "system.manage": "시스템 설정 (ADM-13)",
};

/* 머리에 세울 넷. 셋은 규모고 하나(2단계 미설정)는 오늘 할 일이다 */
const superCount = staffDirectory.filter((s) => s.role === "super").length;
const mfaOff = staffDirectory.filter((s) => !s.mfa).length;
const inactive = staffDirectory.filter((s) => s.state !== "active").length;

export default function Admin2StaffPage() {
  return (
    <>
    <PageHead
      title="운영자·권한"
      meta={
        <>
          <span>
            계정 <span className="a2-num text-(--a2-ink-2)">{n(staffDirectory.length)}</span>
          </span>
          <span aria-hidden>·</span>
          <span>
            최고권한 <span className="a2-num text-(--a2-ink-2)">{n(superCount)}</span>
          </span>
          <span aria-hidden>·</span>
          <span>
            2단계 미설정 <span className="a2-num text-(--a2-ink-2)">{n(mfaOff)}</span>
          </span>
          <span aria-hidden>·</span>
          <span>
            정지·휴면 <span className="a2-num text-(--a2-ink-2)">{n(inactive)}</span>
          </span>
        </>
      }
      actions={
        /* 이 화면에서 못 하는 일로 나가는 문 하나. 계정을 만졌으면 그 기록이 어디에
           남는지가 바로 다음 질문이라 감사 로그를 붙였다. 동작하지 않는 「운영자 추가」
           같은 단추는 두지 않았다 */
        <Link href="/admin2/audit" className="a2-btn">
          감사 로그
        </Link>
      }
    />

      {/* ① 누가 들어올 수 있는가 */}
      <StaffTable />
<Body>

        {/* ② 그 역할은 무엇을 할 수 있는가 —
            이 화면의 핵심. 슈퍼 관리자가 「출제자가 학생 개인정보를 볼 수 있나」를 확인하러
            오는 자리다. 세로축을 권한, 가로축을 역할로 잡은 것은 질문이 늘 권한 쪽에서
            시작하기 때문이다. 역할이 넷뿐이라 가로로 두면 스크롤 없이 한눈에 들어오고,
            권한 열여덟은 세로로 훑는 편이 빠르다. 뒤집으면 열여덟 칸짜리 가로 표가 된다.
            권한 순서는 permissionIds에 적힌 차례 그대로 둔다 — 회원 → 학생 → 회차 → 문항 →
            판정 → 기관·정산 → 콘텐츠·문의 → 감사·계정·시스템 순으로 이미 일이 흐르는
            차례라, 화면에서 다시 정렬하면 정의서와 대조할 때 줄을 세어야 한다. */}
        <div id="roles" className="mt-3 scroll-mt-14">
          <Panel
            title="역할 × 권한"
            meta={`권한 ${permissionIds.length} · 역할 ${staffRoles.length} · ● 있음 / − 없음`}
            flush
          >
            <TableBox>
              <table className="a2-table">
                <thead>
                  <tr>
                    <th scope="col" style={{ width: "10.5rem" }}>
                      권한 ID
                    </th>
                    <th scope="col">뜻</th>
                    {staffRoles.map((role) => (
                      /* 역할 이름 옆에 가진 권한 수를 늘 세워 둔다. 세로로 ● 개수를 세게
                         두지 않으려는 것이고, 「관리자 18」은 곧 전권이라는 뜻이 된다 */
                      <th
                        key={role.id}
                        scope="col"
                        title={role.desc}
                        className="text-center"
                        style={{ width: "6.5rem" }}
                      >
                        {role.short}{" "}
                        <span className="a2-num text-(--a2-ink-4)">{role.permissions.length}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {permissionIds.map((p) => (
                    <tr key={p}>
                      <td className="a2-td-key a2-mono a2-nowrap a2-t-sm">{p}</td>
                      <td className="a2-t-sm">{permissionLabel[p]}</td>
                      {staffRoles.map((role) => {
                        const on = can(role.id, p);
                        return (
                          /* ●/− 모양만으로 가르지 않는다. 칸마다 title을 달고 sr-only로
                             읽을 글자를 함께 둔다 — 이 표는 확대해서 한 칸씩 짚어 보는
                             일이 잦고, 그때 마우스를 올린 칸이 무슨 뜻인지가 답이다 */
                          <td
                            key={role.id}
                            className="text-center"
                            title={`${role.short} — ${permissionLabel[p]} ${on ? "있음" : "없음"}`}
                          >
                            <span
                              aria-hidden
                              className={on ? "text-(--a2-ink)" : "text-(--a2-ink-4)"}
                            >
                              {on ? "●" : "−"}
                            </span>
                            <span className="sr-only">{on ? "있음" : "없음"}</span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableBox>

            {/* 이 표에서 빈칸 둘은 아직 안 붙인 권한이 아니라 일부러 갈라 둔 칸이다.
                적어 두지 않으면 다음 사람이 「출제자에게도 검수를 열어 주자」로 읽는다 */}
            <p className="border-t border-(--a2-line) px-2.5 py-1.5 a2-t-xs text-(--a2-ink-3)">
              출제자에게 <span className="a2-mono">item.review</span>가, 검수자에게{" "}
              <span className="a2-mono">item.write</span>가 없는 것은 빠뜨린 것이 아니라 이해충돌을
              막으려고 맞물려 갈라 둔 칸입니다. 자기가 낸 문항을 자기가 승인하지 못하게 하는 것이
              이 콘솔의 전제입니다(정의서 9장). 예외는 슈퍼 관리자뿐이고, 그때도 검수 기록에
              &lsquo;본인 출제 문항 자가 검수&rsquo;로 남습니다.
            </p>
          </Panel>
        </div>

</Body>
      <SeedNote>
        운영자 계정·이름·접속 시각은 화면 설계를 위한 예시이며 실존 인물이 아닙니다. 다만 역할 ×
        권한 대조표는 예시가 아니라 <span className="a2-mono">lib/admin.ts</span>의 역할 정의를{" "}
        <span className="a2-mono">can()</span>으로 그대로 읽어 찍은 것입니다.
      </SeedNote>
    </>
  );
}
