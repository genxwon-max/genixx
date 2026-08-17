import { inquiries, inquiryStates } from "@/lib/admin";
import { PageHead, TableCard, Badge, CountRows } from "@/components/admin/Parts";
import PermissionGate from "@/components/admin/PermissionGate";
import * as a from "@/components/admin/ui";

export const metadata = { title: "문의 · GENIXX 관리자" };

export default function InquiriesPage() {
  const overdue = inquiries.filter((i) => i.overdue).length;

  return (
    <>
      <PageHead
        id="ADM-10"
        title="문의"
        lead="홈페이지 1:1 문의와 기관 도입 문의가 함께 들어옵니다. 답변 목표는 접수 후 24시간입니다."
        action={
          <button type="button" className={a.btnPrimary}>
            내가 맡을 문의 가져오기
          </button>
        }
      />

      <PermissionGate need="inquiry.reply">
        <div className="mb-6">
          <CountRows
            rows={[
              {
                label: "아직 담당자가 없는 문의",
                value: inquiries.filter((i) => i.state === "new").length,
                unit: "건",
              },
              {
                label: "24시간을 넘긴 문의",
                value: overdue,
                unit: "건",
                note: overdue ? "개인정보 관련 문의가 포함되어 있습니다" : "없습니다",
              },
              { label: "오늘 답변 완료", value: 14, unit: "건" },
            ]}
          />
        </div>

        <TableCard
          title={`문의 ${inquiries.length}건`}
          caption="개인정보 파기·정정 요청은 법정 기한이 있어 다른 문의보다 먼저 처리합니다."
        >
          <table className={a.table}>
            <thead>
              <tr>
                <th className={a.th}>접수번호</th>
                <th className={a.th}>경로</th>
                <th className={a.th}>분류</th>
                <th className={a.th}>제목</th>
                <th className={a.th}>작성자</th>
                <th className={a.th}>기다린 시간</th>
                <th className={a.th}>상태</th>
                <th className={a.th}>할 일</th>
              </tr>
            </thead>
            <tbody>
              {inquiries.map((q) => (
                <tr key={q.id}>
                  <td className={a.td}>{q.id}</td>
                  <td className={a.td}>{q.channel}</td>
                  <td className={a.td}>{q.category}</td>
                  <td className={`${a.tdStrong} min-w-[20rem] text-left`}>{q.title}</td>
                  <td className={a.td}>{q.writer}</td>
                  <td className={a.td}>
                    <span
                      className={
                        q.overdue ? "font-bold text-rose-700" : "tabular-nums text-exam-muted"
                      }
                    >
                      {q.waited}
                    </span>
                    {q.overdue && (
                      <span className="mt-0.5 block adm-t-sm font-bold text-rose-700">
                        기한 넘김
                      </span>
                    )}
                  </td>
                  <td className={a.td}>
                    <Badge {...inquiryStates[q.state]} />
                  </td>
                  <td className={a.td}>
                    <button
                      type="button"
                      className={q.state === "answered" ? a.btnRowGhost : a.btnRow}
                    >
                      {q.state === "answered" ? "답변 보기" : "답변하기"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>

        <p className="mt-4 adm-t-md leading-relaxed text-exam-muted">
          접속코드 분실 문의는 <b className="text-exam-text">학생·접속코드</b> 화면에서 코드를 다시
          발급한 뒤, 발급한 코드가 아니라 <b className="text-exam-text">발급했다는 사실</b>만 답변에
          적습니다. 코드는 보호자 화면에서 직접 확인하도록 안내합니다.
        </p>
      </PermissionGate>
    </>
  );
}
