"use client";

import { useRouter } from "next/navigation";
import { recordAction, useAdminPrefs } from "@/lib/adminStore";
import { createSurvey, surveySlugOf, useSurveyDocs } from "@/lib/surveyStore";
import SurveyBoard from "@/components/admin2/SurveyBoard";
import { SeedNote } from "@/components/admin2/ui";

/**
 * ADM-14 설문지 — 목록. 화면은 components/admin2/SurveyBoard.tsx가 그린다. 「새 설문지」로 만든 설문지는
 * 보관 상태로 생기고, 만든 뒤 바로 그 설문지를 연다.
 */
export default function SurveysView() {
  const docs = useSurveyDocs();
  const router = useRouter();
  const by = useAdminPrefs().staffName || "운영자";
  return (
    <SurveyBoard
      docs={docs}
      onCreate={(spec) => {
        const id = createSurvey(spec, by);
        if (!id) return "설문지 이름을 적어 주세요.";
        recordAction(
          spec.name,
          "새 설문지",
          spec.from ? "복사해 만듦" : spec.start === "blank" ? "빈 양식으로 만듦" : "기본 양식으로 만듦",
          by,
        );
        router.push(`/admin2/surveys/${surveySlugOf(id)}`);
        return null;
      }}
    >
      <SeedNote>
        설문지는 이 브라우저에만 저장됩니다(lib/surveyStore.ts). 처음 설문지와 「기본 양식」은
        lib/survey.ts의 설문지 v1.0입니다. 응답자 화면은 사용 중인 설문지의 발행한 판만 읽습니다.
      </SeedNote>
    </SurveyBoard>
  );
}
