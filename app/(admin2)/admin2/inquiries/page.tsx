import { inquiries, inquiryStates, type InquiryRow } from "@/lib/admin";
import { n, pct, queueCounts } from "@/lib/admin2";
import { Kpi, PageHead, SeedNote } from "@/components/admin2/ui";
import InquiriesTable from "./InquiriesTable";

export const metadata = { title: "문의" };

/*
 * ADM-10 문의 — 들어온 문의를 한 장에 모아 둔다.
 *
 * 이 화면을 여는 사람이 던지는 질문은 둘이다.
 *   ① 오늘 답해야 할 것이 얼마나 쌓였고, 그중 약속을 깬 것이 몇인가   지표 다섯
 *   ② 그중 무엇부터 여나                                          표 한 장
 *
 * 회원(ADM-02)에서는 지표 띠를 걷어 냈다. 거기서 실제로 쓰는 숫자가 승인 대기 하나뿐이라
 * 한 개를 위해 100px을 내줄 이유가 없었다. 여기는 반대다 — 다섯 숫자가 전부 「오늘 할 일의
 * 크기」이고, 특히 목표 초과는 표를 열기 전에 알아야 하는 값이다. 그래서 띠를 두른다.
 *
 * ⚠ 응답 목표 24시간은 데이터(overdue)가 이미 판정해 온 값이다. 여기서 다시 계산하지 않는다 —
 *   화면과 데이터가 각자 기준을 들면 둘이 어긋나는 날이 온다.
 *
 * ⚠ 오른쪽 동작 단추를 두지 않았다. 이 화면에서 할 수 있는 일은 줄 단위 답변뿐이고,
 *   그 단추는 표 오른쪽 끝에 있다. 머리에 동작하지 않는 「내보내기」를 세우지 않는다.
 *
 * 개인정보: 작성자는 원본이 이미 가려 둔 형태(김****)로 온다. 연락처·메일·생년월일은
 * 데이터에도 없고 칸도 만들지 않는다.
 *
 * ⚠ 숫자는 전부 예시다(lib/admin.ts). 화면 맨 아래에 그렇게 적어 둔다.
 */

const byState = (s: InquiryRow["state"]) => inquiries.filter((i) => i.state === s).length;

/** 24시간 목표를 넘긴 것 — 이 화면의 유일한 「이미 깨진 약속」 */
const overdue = inquiries.filter((i) => i.overdue).length;
/** 미배정 중 기관 도입 — 개인 문의와 받는 창구가 달라 따로 센다 */
const newOrg = inquiries.filter((i) => i.state === "new" && i.channel === "기관 도입").length;
/** 사람이 붙어 있는데도 넘긴 것 — 배정만 하고 손을 놓은 줄이 여기서 드러난다 */
const workingOverdue = inquiries.filter((i) => i.state === "working" && i.overdue).length;

export default function Admin2InquiriesPage() {
  return (
    <>
      <PageHead
        title="문의"
        meta={
          <>
            <span>
              답변 대기 <span className="a2-num text-(--a2-ink-2)">{n(queueCounts.inquiries)}</span>건
            </span>
            <span aria-hidden>·</span>
            <span>
              목표 초과 <span className="a2-num text-(--a2-ink-2)">{n(overdue)}</span>건
            </span>
            <span aria-hidden>·</span>
            <span>응답 목표 24시간</span>
          </>
        }
        statCols={5}
        /* ① 얼마나 쌓였나 — 「답변 대기」는 왼쪽 기둥의 배지와 같은 값을 쓴다(lib/admin2.ts).
           두 자리에서 다른 수가 보이면 둘 다 못 믿게 된다 */
        stats={
          <>
            <Kpi label="전체 문의" value={n(inquiries.length)} unit="건" sub={`답변 대기 ${n(queueCounts.inquiries)}건`} />
            <Kpi
              label={inquiryStates.new.label}
              value={n(byState("new"))}
              unit="건"
              sub={`이 중 기관 도입 ${n(newOrg)}건`}
            />
            <Kpi
              label={inquiryStates.working.label}
              value={n(byState("working"))}
              unit="건"
              sub={`이 중 목표 초과 ${n(workingOverdue)}건`}
            />
            <Kpi
              label={inquiryStates.answered.label}
              value={n(byState("answered"))}
              unit="건"
              sub={`전체의 ${pct(byState("answered"), inquiries.length)}%`}
            />
            {/* 지표 다섯 중 유일하게 「줄여야 하는」 수라 맨 오른쪽 끝에 따로 세운다 */}
            <Kpi label="24시간 목표 초과" value={n(overdue)} unit="건" sub="접수 후 24시간 기준" />
          </>
        }
      />
      {/* ② 무엇부터 여나 */}
      <InquiriesTable />

      <SeedNote>
        이 화면의 문의·대기 시간은 화면 설계를 위한 예시입니다. 실제 접수 내역이 아니며, 작성자 이름은 데이터를 만들
        때부터 가려진 형태로만 두었습니다 — 관리자 화면 설계본에 온전한 개인 이름이 남아 있을 이유가 없습니다.
      </SeedNote>
    </>
  );
}
