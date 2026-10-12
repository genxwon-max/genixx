"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { designLinks } from "@/lib/designScreens";
import { seedTemplateRows, type TemplateRow } from "@/lib/reportAssetStore";
import TemplateBoard, { AddSlotDialog } from "@/components/admin2/TemplateBoard";
import TemplateDesk from "@/components/admin2/TemplateDesk";
import ConsoleFrame from "../ConsoleFrame";
import { ADMIN } from "./reportFlow";

/**
 * 해석 템플릿 (실제 주소 /admin2/reports/templates · /admin2/reports/templates/[칸]) — 디자인.
 *
 * 리포트에 들어가는 문구를 쓰는 화면이다. 조립 규칙이 이 문구 가운데 하나를 골라 리포트에 넣는다
 * (./ReportRules.tsx). 고친 문구가 **어느 리포트까지 걸리는지**가 바뀌어 화면의 안내 글이 달라졌다 —
 * 예전에는 「다음에 조립되는 리포트부터」였고, 지금은 **발행을 기다리는 리포트**에도 들어간다.
 * 이미 발행한 리포트는 바뀌지 않는다.
 *
 *   목록          학년 · 항목 · 재능 축 · 발현 밴드마다 한 칸
 *   템플릿 추가   리포트에 새 항목을 더하는 창 — 「문구를 채우면 발행을 기다리는 리포트부터 들어갑니다」
 *   한 칸         문구를 쓰고 고친다. 저장 줄의 안내가 걸리는 범위를 말한다
 *
 * 화면은 실제 조각(components/admin2/TemplateBoard.tsx · TemplateDesk.tsx)이고, 칸의 문구는 처음
 * 값 그대로다(lib/reportAssets.ts). 예시로 고른 칸은 「강하게 나타난 축 · 초등 4학년 · 언어 · L3」 —
 * 리포트 승인 디자인의 김하준 리포트에 들어간 그 문단이다(./reportFlow.ts). 창은 주소로 여닫는다.
 *
 * 실제 화면은 더한 항목을 지울 때 브라우저의 확인 창으로 한 번 더 묻는다(「… 발행을 기다리는
 * 리포트에서도 이 항목이 빠집니다 …」). 브라우저가 그리는 창이라 디자인에는 따로 두지 않았다.
 */

const to = designLinks("report-templates");
const AT = "/admin2/reports/templates";

/** 예시로 고른 칸 — 강하게 나타난 축 · 초등 4학년 · 언어 · L3 */
const ID = "top-e4-language-L3";

const rows = seedTemplateRows();
const seedRow = rows.find((r) => r.id === ID)!;

/** 고치던 글 — 근거가 된 문항 수를 밝혀 적었다 */
const DRAFT =
  "서술형 답마다 그렇게 생각한 이유를 함께 적었습니다. 자료에서 찾은 표현을 자기 말로 바꾸어 쓰는 모습이 세 문항 모두에서 나타납니다.";

/**
 * 저장한 뒤의 칸 — 「수정됨」이 붙고 기본 문구로 되돌릴 수 있다. 기본 문구를 처음 고친 것이라
 * 수정 이력은 아직 없다(앞의 글은 기본 문구이고, 그것은 「기본 문구로 되돌리기」가 들고 있다).
 */
const editedRow: TemplateRow = {
  ...seedRow,
  text: DRAFT,
  edited: true,
  editedAt: "2026-10-12 14:10",
  editedBy: ADMIN,
  history: [],
};

/** 한 번 더 고쳐 저장한 뒤 — 앞에 저장한 글이 수정 이력에 남는다 */
const editedAgain: TemplateRow = {
  ...editedRow,
  text: `${DRAFT} 글이 길어져도 근거를 끝까지 적었습니다.`,
  editedAt: "2026-10-12 14:32",
  history: [{ title: seedRow.title, text: DRAFT, at: "2026-10-12 14:10", by: ADMIN }],
};

/** 줄을 누르면 가는 상세 — 예시 한 칸으로 굳혔다 */
const hrefOf = () => to(ID);

export default function ReportTemplates({ state }: { state: string }) {
  const router = useRouter();
  const back = (
    <Link href={to()} className="a2-btn">
      ← 해석 템플릿
    </Link>
  );

  if (state.startsWith(ID)) {
    const tail = state.slice(ID.length + 1);
    return (
      <ConsoleFrame at={AT}>
        <TemplateDesk
          key={state}
          row={tail === "edited" ? editedRow : tail === "edited/again" ? editedAgain : seedRow}
          back={back}
          start={
            tail === "edit"
              ? { text: DRAFT }
              : tail === "blocked"
                ? { text: `${seedRow.text} 같은 학년에서 상위 10% 안에 드는 모습입니다.` }
                : undefined
          }
          onSave={() => {
            router.push(to(`${ID}/edited`));
            return true;
          }}
          onReset={() => router.push(to(ID))}
          onRemove={() => {}}
        />
      </ConsoleFrame>
    );
  }

  return (
    <ConsoleFrame at={AT}>
      <TemplateBoard rows={rows} hrefOf={hrefOf} onAdd={() => router.push(to("add"))}>
        {state.startsWith("add") && (
          <AddSlotDialog
            key={state}
            start={
              state === "add/filled"
                ? {
                    label: "선생님 한마디",
                    section: "담당 전문가가 전하는 말",
                    guide: "담당 전문가가 이번 진단에서 가장 눈여겨본 점을 한두 문장으로 적습니다.",
                  }
                : undefined
            }
            onSubmit={() => null}
            onClose={() => router.push(to())}
          />
        )}
      </TemplateBoard>
    </ConsoleFrame>
  );
}
