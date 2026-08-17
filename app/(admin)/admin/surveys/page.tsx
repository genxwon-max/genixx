import PermissionGate from "@/components/admin/PermissionGate";
import SurveyEditor from "@/components/admin/SurveyEditor";

export const metadata = { title: "설문 원본 · GENIXX 관리자" };

/** ADM-14 설문 원본 — 출제자가 고치고 검수자가 발행한다 */
export default function SurveysPage() {
  return (
    <PermissionGate need={["item.write", "item.review"]}>
      <SurveyEditor />
    </PermissionGate>
  );
}
