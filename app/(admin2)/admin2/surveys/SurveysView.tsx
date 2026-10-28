"use client";

import { useSurveyDocs } from "@/lib/surveyStore";
import SurveyBoard from "@/components/admin2/SurveyBoard";
import { SeedNote } from "@/components/admin2/ui";

/**
 * ADM-14 설문 관리 — 목록. 화면은 components/admin2/SurveyBoard.tsx가 그린다.
 */
export default function SurveysView() {
  const docs = useSurveyDocs();
  return (
    <SurveyBoard docs={docs}>
      <SeedNote>
        고친 설문은 이 브라우저에만 저장됩니다(lib/surveyStore.ts). 처음 판은 lib/survey.ts의 설문지
        v1.0입니다. 응답자 화면은 발행한 판만 읽습니다.
      </SeedNote>
    </SurveyBoard>
  );
}
