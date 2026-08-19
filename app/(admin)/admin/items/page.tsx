import { Foldable, PageHead } from "@/components/admin/Parts";
import ItemBank from "@/components/admin/ItemBank";
import ItemsTabs from "@/components/admin/ItemsTabs";
import PermissionGate from "@/components/admin/PermissionGate";
import * as a from "@/components/admin/ui";

export const metadata = { title: "문항 은행 · GENIXX 관리자" };

/** 문항이 거치는 단계. 순서를 그림 대신 글자로 적는다. */
const flow = [
  { step: "1", label: "작성", desc: "출제위원이 학년별 성취기준에 맞춰 만듭니다" },
  { step: "2", label: "교차 검수", desc: "작성자가 아닌 다른 사람이 반드시 봅니다" },
  { step: "3", label: "승인", desc: "승인된 문항만 회차에 배치할 수 있습니다" },
  { step: "4", label: "출제 후 점검", desc: "정답률이 너무 높거나 낮으면 사용을 멈춥니다" },
];

/**
 * 문항 은행 — 문항 목록 (ADM-04-1).
 *
 * 정의서의 ADM-04는 하위 화면이 넷인데, 처음에는 그 넷을 한 페이지 안의 네 구역으로
 * 세웠다. 화면 열 장 길이가 되었고, 하는 일도 성격이 달랐다 — 목록은 찾는 곳,
 * 조립은 만드는 곳, 회전은 살피는 곳, 보안은 정하는 곳. 그래서 주소를 갈랐다.
 *
 *   /admin/items           문항 목록 (여기)
 *   /admin/items/forms     검사지 조립     (ADM-04-3)
 *   /admin/items/rotation  문항 회전·앵커  (ADM-04-4 · ADM-04-2)
 *   /admin/rounds/security 응시 화면 보호  (ADM-05-3 — 응시 조건이라 회차 쪽으로)
 *
 * 문항 목록을 첫 화면으로 둔 것은 여기 오는 열에 아홉이 문항을 찾으러 오기 때문이다.
 *
 * ⚠ 세 화면의 머리글은 **제목 하나로 똑같이 둔다.** 갈래를 눌렀는데 갈래 줄이
 *   위아래로 움직이면 다음 갈래를 누르려고 눈과 손이 매번 자리를 다시 찾는다.
 *   화면마다 다른 설명은 갈래 줄 아래에 적는다.
 */
export default function ItemsPage() {
  return (
    <>
      {/* 제목만 둔다. 여기는 보는 자리라 머리글에 할 일이 없다 — 만드는 길은
          출제 워크벤치 하나이고, 그 길은 왼쪽 메뉴에 늘 서 있다. 셋이 같은 머리글을
          쓰므로 갈래를 눌러도 갈래 줄이 움직이지 않는다. */}
      <PageHead title="문항 은행" />

      <PermissionGate need="item.review">
        <ItemsTabs />

        <p className={`${a.bodyText} mb-5`}>
          확정된 문항을 좌표·태그·난이도·상태로 훑습니다. 정답률이 90%를 넘거나 40% 아래로
          떨어지면 변별이 되지 않아 다시 봅니다.
        </p>

        {/* 단계 설명은 처음 한 번 읽으면 되는 글이다. 매일 오는 사람에게 화면 위쪽
            네 칸을 계속 내주지 않도록 접어 두고, 필요할 때만 펼치게 한다. */}
        <div className="mb-5">
          <Foldable title="문항이 거치는 네 단계">
            <ol>
              {flow.map((f) => (
                <li key={f.step} className="flex flex-wrap items-baseline gap-x-2.5 py-1.5">
                  <span className="adm-t-sm tabular-nums text-exam-muted">{f.step}</span>
                  <span className="adm-t-md font-bold text-exam-text">{f.label}</span>
                  <span className="adm-t-sm text-exam-muted">{f.desc}</span>
                </li>
              ))}
            </ol>
          </Foldable>
        </div>

        {/* 화면 자체가 ADM-04-1이라 구역 제목을 따로 세우지 않는다 — 제목이 둘이면
            읽는 사람은 둘이 다른 것인 줄 알고 두 번 읽는다. 왼쪽 메뉴의 하위 항목이
            내려앉을 자리로 id만 남긴다. */}
        <div id="ADM-04-1" className="scroll-mt-20">
          <ItemBank />
        </div>
      </PermissionGate>
    </>
  );
}
