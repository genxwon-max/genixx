import { accessReasons, auditLog } from "@/lib/admin";
import { n } from "@/lib/admin2";
import { Body, PageHead, Panel, SeedNote, Tag } from "@/components/admin2/ui";
import AuditTable from "./AuditTable";
import LocalActions from "./LocalActions";

export const metadata = { title: "감사 로그" };

/*
 * ADM-11 감사 로그.
 *
 * 이 화면에 오는 길은 둘이다. ① 사고나 문의가 생겨 「누가 언제 이걸 만졌나」를 되짚는다.
 * ② 점검 때 「개인정보를 본 기록이 전건 남아 있나」를 확인한다. 표 하나로 둘 다 되지만,
 * 머리에 세우는 숫자는 다르다 — 전체 건수는 규모고, 개인정보 열람 건수는 약속이다.
 *
 * 그래서 머리 한 줄에 숫자 둘만 세운다. Kpi 띠를 두르지 않았다. 이 화면의 본체는 표이고,
 * 넉 줄짜리 지표 띠를 얹으면 표 머리가 100px쯤 밀린다. 실제로 매일 보는 숫자는 둘뿐이다.
 *
 * 개인정보 열람을 따로 세는 까닭 — 이 제품은 학생 개인정보를 열 때 사유 입력을 강제하고
 * 전건을 남긴다고 약속했다. 그 약속이 지켜지고 있는지는 「사유가 적힌 줄이 몇인가」로만
 * 확인된다. 사유 없이 열람이 일어났다면 그 줄은 애초에 여기 없어야 하므로, 이 숫자는
 * 곧 열람 횟수다.
 *
 * 오른쪽에 「내보내기」·「보관」 같은 단추를 두지 않았다. 동작하지 않는 단추를 세워 두면
 * 감사 화면에서 특히 나쁘다 — 눌러 봤다는 사실 자체가 기록으로 남을 것처럼 읽힌다.
 */

/** 사유가 적힌 줄 = 개인정보에 닿은 줄. 판정 기준을 화면 두 곳(머리·거르개)에서 같게 쓴다 */
const piiCount = auditLog.filter((l) => l.reason !== null).length;

export default function Admin2AuditPage() {
  return (
    <>
      <PageHead
        title="감사 로그"
        meta={
          <>
            <span>
              전체 <span className="a2-num text-(--a2-ink-2)">{n(auditLog.length)}</span>건
            </span>
            <span aria-hidden>·</span>
            <span>
              개인정보 열람 <span className="a2-num text-(--a2-ink-2)">{n(piiCount)}</span>건
            </span>
          </>
        }
      />

      <AuditTable />
<Body>

        {/* 이 브라우저에서 실제로 누른 동작 — 위 표는 서버 기록의 예시라 움직이지 않는다 */}
        <LocalActions />

        {/* 표준 사유 목록을 표 아래로 내렸다. 매일 읽는 것이 아니라 「사유 칸의 저 문장은
            어디서 온 값인가」를 확인할 때만 필요한 대조표라서다.
            거르개로 만들지 않았다 — 로그의 사유는 표준 문구를 고른 뒤 사건마다 덧붙여
            적히므로 목록과 글자가 정확히 일치하지 않는다. 그대로 거르개에 세우면 골라도
            0줄이 나오는 선택지가 생긴다. */}
        <Panel title="표준 열람 사유" meta="사유 칸에 적히기 전 고르는 값" className="mt-3">
          <div className="flex flex-wrap gap-1.5">
            {accessReasons.map((r) => (
              <Tag key={r}>{r}</Tag>
            ))}
          </div>
          <p className="mt-2 a2-t-xs text-(--a2-ink-4)">
            학생 개인정보를 열 때 이 중 하나를 고른 뒤 사건별 내용을 덧붙입니다. 사유 없이는 열람 자체가 진행되지
            않으므로, 위 표에 사유가 빈 줄은 개인정보에 닿지 않은 동작입니다.
          </p>
        </Panel>

</Body>
      <SeedNote>
        이 화면의 기록은 화면 설계를 위한 예시입니다. 실제 감사 로그가 아니며, 붙일 때는 고칠 수 없는 저장소(추가만
        되는 기록)에서 읽어 옵니다. 이 콘솔에는 로그를 고치거나 지우는 길이 없습니다.
      </SeedNote>
    </>
  );
}
