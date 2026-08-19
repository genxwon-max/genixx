import FormBuilder from "@/components/admin/FormBuilder";
import ItemsTabs from "@/components/admin/ItemsTabs";
import PermissionGate from "@/components/admin/PermissionGate";
import { PageHead } from "@/components/admin/Parts";
import * as a from "@/components/admin/ui";

export const metadata = { title: "검사지 조립 · GENIXX 관리자" };

/**
 * 검사지 조립 (ADM-04-3).
 *
 * 문항 은행에서 갈라져 나온 화면이다. 목록은 찾는 곳이고 여기는 만드는 곳이라,
 * 한 페이지에 두면 문항 하나 찾으러 온 사람이 조립판까지 지나쳐야 했다.
 *
 * ⚠ 머리글은 문항 목록·문항 회전과 **똑같이** 둔다. 갈래를 눌렀는데 갈래 줄이
 *   위아래로 움직이면 다음 갈래를 누르려고 눈과 손이 매번 자리를 다시 찾는다.
 */
export default function ItemFormsPage() {
  return (
    <>
      {/* 제목만 둔다. 여기는 보는 자리라 머리글에 할 일이 없다 — 만드는 길은
          출제 워크벤치 하나이고, 그 길은 왼쪽 메뉴에 늘 서 있다. 셋이 같은 머리글을
          쓰므로 갈래를 눌러도 갈래 줄이 움직이지 않는다. */}
      <PageHead title="문항 은행" />

      <PermissionGate need="item.review">
        <ItemsTabs />

        <p className={`${a.bodyText} mb-5`}>
          승인된 문항을 골라 한 회차의 검사지를 만듭니다. 기계가 조합을 제안하고 사람이
          확정합니다.
        </p>

        <div id="ADM-04-3" className="scroll-mt-20">
          <FormBuilder />
        </div>
      </PermissionGate>
    </>
  );
}
