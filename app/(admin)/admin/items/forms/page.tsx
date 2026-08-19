import FormBuilder from "@/components/admin/FormBuilder";
import ItemsTabs from "@/components/admin/ItemsTabs";
import PermissionGate from "@/components/admin/PermissionGate";
import { PageHead } from "@/components/admin/Parts";

export const metadata = { title: "검사지 조립 · GENIXX 관리자" };

/**
 * 검사지 조립 (ADM-04-3).
 *
 * 문항 은행에서 갈라져 나온 화면이다. 목록은 찾는 곳이고 여기는 만드는 곳이라,
 * 한 페이지에 두면 문항 하나 찾으러 온 사람이 조립판까지 지나쳐야 했다.
 */
export default function ItemFormsPage() {
  return (
    <>
      <PageHead
        title="검사지 조립"
        lead="승인된 문항을 골라 한 회차의 검사지를 만듭니다. 기계가 조합을 제안하고 사람이 확정합니다."
      />

      <PermissionGate need="item.review">
        <ItemsTabs />
        <div id="ADM-04-3" className="scroll-mt-20">
          <FormBuilder />
        </div>
      </PermissionGate>
    </>
  );
}
