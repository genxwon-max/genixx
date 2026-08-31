import { examStateLabel, students, type ExamState } from "@/lib/adminUsers";
import { n, pct } from "@/lib/admin2";
import { Kpi, PageHead, SeedNote } from "@/components/admin2/ui";
import StudentsTable from "./StudentsTable";

export const metadata = { title: "학생·접속코드" };

/*
 * ADM-02-1 학생·접속코드.
 *
 * 학생은 스스로 가입하지 않는다. 보호자나 교사가 등록하고, 학생은 8자리 접속코드로만
 * 시험에 들어온다. 그래서 이 화면에서 나오는 질문은 「누가 있나」가 아니라
 * 「코드를 받은 148명 중 아직 안 들어온 사람이 몇인가」다. 지표 다섯 칸을 계정 상태가
 * 아니라 응시 상태(examStateLabel)로, 그것도 미응시 → 응시 중 → 제출 완료 →
 * 리포트 발행이라는 진행 순서 그대로 세운 이유가 그것이다. 회차 마감 전날 운영자가
 * 보는 숫자는 왼쪽 두 칸이고, 마감 뒤에 보는 숫자는 오른쪽 두 칸이다.
 *
 * ⚠ 생년월일 칸을 두지 않는다. 이 저장소는 학생 생년월일을 목록에 두지 않기로 했다 —
 *   개인정보 열람은 사유를 받아 감사 로그에 남기는 별도 흐름이고, 목록을 훑는 일에는
 *   필요한 적이 없다. 접속코드는 그 자체가 이 목록의 값이라 그대로 적는다.
 *
 * 지표 다섯 칸은 서버에서 센 값을 그대로 쓴다. 기관 화면과 달리 여기서는 그래도 된다 —
 * 다섯 칸이 전부 응시 상태이거나 전체·휴면 수인데, 상세(ADM-02-1-1)에서 바꿀 수 있는
 * 것은 학년·코드·활성/정지/탈퇴뿐이라 이 다섯 중 어느 것도 움직이지 않는다.
 * 움직이는 값을 지표에 올리게 되면 기관 화면처럼 지표째 클라이언트로 내려야 한다.
 */

const byExam = (s: ExamState) => students.filter((x) => x.exam === s).length;

const total = students.length;
const dormant = students.filter((s) => s.state === "dormant").length;

/** 지표 넉 줄은 표의 응시 상태 거르개와 같은 순서·같은 이름을 쓴다 */
const stages: ExamState[] = ["not-started", "in-progress", "submitted", "reported"];

export default function Admin2Students() {
  return (
    <>
      <PageHead
        statCols={5}
        title="학생·접속코드"
        meta={
          <>
            <span>
              전체 <span className="a2-mono text-(--a2-ink-2)">{n(total)}</span>명
            </span>
            <span aria-hidden>·</span>
            <span>접속코드 8자리</span>
          </>
        }
        stats={
          <>
            <Kpi label="전체 학생" value={n(total)} unit="명" sub={`휴면 ${n(dormant)} 포함`} />
            {stages.map((s) => {
              const v = byExam(s);
              return (
                <Kpi
                  key={s}
                  label={examStateLabel[s].label}
                  value={n(v)}
                  unit="명"
                  sub={`전체의 ${pct(v, total)}%`}
                />
              );
            })}
          </>
        }
      />
      <StudentsTable />

      <SeedNote>
        이 화면의 학생·보호자·접속코드는 화면 설계를 위한 예시입니다. 실제 응시자가 아니며, 여기서 바꾼 값은 이
        브라우저에만 남습니다.
      </SeedNote>
    </>
  );
}
