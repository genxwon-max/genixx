import { AnchorSection, PageHead, PlannedSection } from "@/components/admin/Parts";
import PermissionGate from "@/components/admin/PermissionGate";
import AuditLog from "@/components/admin/AuditLog";
import * as a from "@/components/admin/ui";

export const metadata = { title: "개인정보·감사 로그 · GENIXX 관리자" };

export default function AuditPage() {
  return (
    <>
      <PageHead
        title="개인정보 · 감사 로그"
        lead="누가 언제 무엇을 봤는지 전부 남습니다. 보호자가 요청하면 이 기록을 그대로 보여 드립니다."
        action={
          <button type="button" className={a.btnGhost}>
            기록 내려받기
          </button>
        }
      />
      <PermissionGate need="audit.read">
        <div className="space-y-8">
          <PlannedSection
            id="ADM-10-1"
            title="동의 이력 조회"
            lead="누가 언제 무엇에 동의했고 언제 거두었는지를 전건으로 봅니다."
            todo={[
              "granted / withdrawn 전건 조회 — 동의 항목별·시각별",
              "증빙 출력 — 분쟁이 생겼을 때 그대로 낼 수 있는 형태",
              "만 14세 기준으로 본인 동의와 보호자 동의를 나눠 표시",
            ]}
          />
          <PlannedSection
            id="ADM-10-2"
            title="파기 스케줄러"
            lead="보관기간이 찬 자료는 저절로 지워지고, 철회한 자료는 곧바로 지워집니다."
            todo={[
              "보관기간(5년) 도래분 자동 파기와 그 결과 기록",
              "동의 철회 즉시 파기 큐 — 처리 대기 건수와 경과 시간",
              "파기했다는 사실 자체는 남깁니다. 무엇을 지웠는지는 남기지 않습니다",
            ]}
          />
          <AnchorSection
            id="ADM-10-3"
            title="개인정보 접근 감사"
            lead="사유 없이 열 수 있는 길을 두지 않습니다. 연 사람과 사유가 함께 남습니다."
          >
            <AuditLog />
          </AnchorSection>
        </div>
      </PermissionGate>
    </>
  );
}
