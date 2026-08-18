import { contractLabel, orgs } from "@/lib/admin";
import { PageHead, TableCard, Badge, CountRows, Progress } from "@/components/admin/Parts";
import PermissionGate from "@/components/admin/PermissionGate";
import * as a from "@/components/admin/ui";

export const metadata = { title: "기관 · GENIXX 관리자" };

export default function OrgsPage() {
  const totalSeats = orgs.reduce((s, o) => s + o.seats[1], 0);
  const usedSeats = orgs.reduce((s, o) => s + o.seats[0], 0);

  return (
    <>
      <PageHead
        title="기관"
        lead="학원·학교·교육원·교육청 계약과 응시권 배정을 관리합니다. 기관 관리자가 학생 명부를 직접 등록합니다."
        action={
          <>
            <button type="button" className={a.btnGhost}>
              정산 자료 내려받기
            </button>
            <button type="button" className={a.btnPrimary}>
              기관 추가하기
            </button>
          </>
        }
      />

      <PermissionGate need="org.manage">
        <div className="mb-6 grid gap-x-8 gap-y-6 lg:grid-cols-[1fr_1.3fr]">
          <section>
            <h2 className={a.cardTitle}>응시권 배정 현황</h2>
            <p className="mt-1 adm-t-sm text-exam-muted">
              배정한 응시권 가운데 실제로 쓴 비율입니다.
            </p>
            <div className="mt-5">
              <Progress label="전체 응시권 사용" value={usedSeats} total={totalSeats} />
            </div>
            <p className="mt-4 adm-t-sm text-exam-muted">
              파일럿 회차는 전액 무료라 금액이 발생하지 않습니다. 정식 요금 적용 시점부터 이 숫자가
              그대로 정산 근거가 됩니다.
            </p>
          </section>

          <div className="self-start">
            <CountRows
              rows={[
                {
                  label: "계약중 기관",
                  value: orgs.filter((o) => o.contract === "active").length,
                  unit: "곳",
                },
                {
                  label: "시범 운영",
                  value: orgs.filter((o) => o.contract === "trial").length,
                  unit: "곳",
                  note: "기간이 끝나기 전에 연락해야 합니다",
                },
                {
                  label: "만료",
                  value: orgs.filter((o) => o.contract === "expired").length,
                  unit: "곳",
                  note: "재계약 문의 필요",
                },
                {
                  label: "등록 학생",
                  value: orgs.reduce((s, o) => s + o.students, 0),
                  unit: "명",
                },
              ]}
            />
          </div>
        </div>

        <TableCard
          title={`기관 ${orgs.length}곳`}
          caption="응시권이 모자라면 학생이 응시 화면에 들어가지 못합니다. 남은 수를 함께 표시합니다."
        >
          <table className={a.table}>
            <thead>
              <tr>
                <th className={a.th}>기관번호</th>
                <th className={a.th}>기관명</th>
                <th className={a.th}>구분</th>
                <th className={a.th}>지역</th>
                <th className={a.th}>담당자</th>
                <th className={a.th}>등록 학생</th>
                <th className={a.th}>응시권 (사용/배정)</th>
                <th className={a.th}>계약</th>
                <th className={a.th}>계약 만료일</th>
                <th className={a.th}>할 일</th>
              </tr>
            </thead>
            <tbody>
              {orgs.map((o) => {
                const [used, total] = o.seats;
                const left = total - used;
                return (
                  <tr key={o.id}>
                    <td className={a.td}>{o.id}</td>
                    <td className={a.tdStrong}>{o.name}</td>
                    <td className={a.td}>{o.kind}</td>
                    <td className={a.td}>{o.region}</td>
                    <td className={a.td}>{o.manager}</td>
                    <td className={a.tdNum}>{o.students.toLocaleString("ko-KR")}명</td>
                    <td className={a.tdNum}>
                      {used.toLocaleString("ko-KR")} / {total.toLocaleString("ko-KR")}
                      <span
                        className={`block adm-t-sm ${
                          left === 0 ? "font-bold text-rose-700" : "text-exam-muted"
                        }`}
                      >
                        {left === 0 ? "남은 응시권 없음" : `${left.toLocaleString("ko-KR")}개 남음`}
                      </span>
                    </td>
                    <td className={a.td}>
                      <Badge {...contractLabel[o.contract]} />
                    </td>
                    <td className={a.td}>{o.until}</td>
                    <td className={a.td}>
                      <button type="button" className={a.btnRowGhost}>
                        응시권 배정
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableCard>
      </PermissionGate>
    </>
  );
}
