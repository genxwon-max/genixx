import {
  accessReasons,
  can,
  currentRound,
  permissionIds,
  staffRoles,
  stubSections,
  userActions,
} from "@/lib/admin";
import { assessment, levels, questionCountText, subjects, totalQuestions } from "@/lib/exam";
import { company } from "@/lib/site";
import { Body, DescList, PageHead, Panel, SeedNote, Tag } from "@/components/admin2/ui";
import QualityPanel from "./QualityPanel";
import { row } from "./rows";

export const metadata = { title: "시스템 설정" };

/*
 * ADM-13 시스템 설정 — 읽기 전용 요약.
 *
 * 여기에는 입력칸도 저장 단추도 없다. 이 제품의 설정값은 아직 데이터베이스가 아니라
 * 저장소 파일 안에 상수로 박혀 있어서, 바꾸는 일이 곧 배포다. 그래서 화면이 할 수 있는
 * 유일하게 정직한 일은 **지금 무엇이 어떤 값으로 걸려 있고 그 값이 어느 파일에 사는지**를
 * 한자리에 펴 두는 것이다. 고칠 수 없는 값 옆에 회색 입력칸을 세워 두면, 눌러 보고 나서야
 * 못 고친다는 것을 알게 된다.
 *
 * 네 판으로 가른 기준은 「누가 바꾸자고 말하는가」다 —
 *   진단 설정      회차를 여는 사람이 바꾼다 (lib/exam.ts · lib/admin.ts)
 *   판정·품질 기준  평가팀이 바꾼다          (lib/expertStore.ts)
 *   권한·개인정보   보안·법무가 바꾼다        (lib/admin.ts)
 *   기관 정보      회사가 바뀌면 바꾼다      (lib/site.ts)
 * 값의 종류로 가르면 「숫자」 판과 「문자」 판이 되어, 정작 바꿀 사람이 자기 판을 못 찾는다.
 *
 * 일부러 뺀 것 —
 *  · 보관 기간·파기 주기: 저장소에 값이 없다. 빈 칸을 세워 두면 「0일」로 읽힌다.
 *  · 연동 키·엔드포인트: 값 자체가 없다. 이름만 맨 아래 판에 목록으로 남긴다.
 *  · 마지막 변경 시각·변경자: 감사 로그(ADM-11)의 일이고, 여기서 지어낼 값이 아니다.
 */

/* 과목마다 제한 시간이 갈릴 수 있다. 값이 하나로 모이면 한 줄로, 갈리면 늘어놓는다 —
   「40분」이라고 박아 두면 한 과목만 60분이 된 날 설정 화면이 조용히 거짓말을 한다. */
const limits = Array.from(new Set(subjects.map((s) => s.limitMin)));
const limitText = limits.length === 1 ? `${limits[0]}분` : limits.map((v) => `${v}분`).join(" · ");
const totalMin = subjects.reduce((sum, s) => sum + s.limitMin, 0);
const totalQ = totalQuestions();

/* 이 화면을 여는 권한(system.manage)을 실제로 누가 쥐고 있는지 역할 목록에서 센다.
   「관리자만」이라고 적어 두면 권한을 옮긴 날 이 줄만 옛말이 된다. */
const systemRoles = staffRoles.filter((r) => can(r.id, "system.manage")).map((r) => r.short);

const stub = stubSections.settings;

export default function Admin2Settings() {
  return (
    <>
      <PageHead
        title="시스템 설정"
      />
<Body>

        <div className="grid gap-3 xl:grid-cols-2">
          {/*
           * 진단 설정.
           *
           * 검사 규격(lib/exam.ts)과 운영 회차(lib/admin.ts)를 한 판에 겹쳐 둔다. 지금 이
           * 둘의 회차 이름과 마감일이 서로 다른데, 그 어긋남을 감추지 않고 위아래로 붙여
           * 적는다 — 붙일 때 한쪽으로 맞춰야 할 자리이고, 화면에 안 보이면 아무도 맞추지
           * 않는다. 어느 문항이 나가는지는 검사지 조립(ADM-04-3)의 일이라 여기 두지 않고,
           * 이 판은 「몇 과목 · 몇 문항 · 몇 분」까지만 답한다.
           */}
          <Panel title="진단 설정" meta="응시 화면이 읽는 규격">
            <DescList
              rows={[
                row("검사 이름", `${assessment.name} (${assessment.ko})`, "lib/exam.ts"),
                row("응시 화면 회차 표기", assessment.round, "lib/exam.ts"),
                row("응시 화면 마감", <span className="a2-mono">{assessment.deadline}</span>, "lib/exam.ts"),
                row(
                  "운영 회차",
                  <>
                    {currentRound.label} <span className="a2-mono">{currentRound.period}</span>
                  </>,
                  "lib/admin.ts",
                ),
                row(
                  "과목",
                  <span className="flex flex-wrap gap-1">
                    {subjects.map((s) => (
                      <Tag key={s.id}>{s.short}</Tag>
                    ))}
                  </span>,
                  "lib/exam.ts",
                ),
                row(
                  "과목별 문항",
                  <span className="a2-num">{questionCountText()}</span>,
                  "lib/exam.ts",
                ),
                row("과목당 제한 시간", <span className="a2-num">{limitText}</span>, "lib/exam.ts"),
                row(
                  "회차 전체",
                  <span className="a2-num">
                    {subjects.length}과목 · {totalQ}문항 · {totalMin}분
                  </span>,
                  "lib/exam.ts",
                ),
                row("문항 위계", levels.map((l) => `${l.id} ${l.name}`).join(" · "), "lib/exam.ts"),
              ]}
            />
          </Panel>

          <QualityPanel />

          {/*
           * 권한·개인정보.
           *
           * 「보관·개인정보」로 묶지 않았다. 보관 기간을 담은 값이 저장소에 하나도 없어서
           * 그 이름으로 판을 세우면 절반이 빈다. 대신 실제로 걸려 있는 것 — 누가 이 화면을
           * 열 수 있고, 학생 자료를 화면에 어떻게 적기로 했는가 — 만 적는다.
           *
           * 생년월일·연락처 원문은 칸 자체를 만들지 않는다. 마스킹된 값만 저장소에 있고,
           * 설정 화면에 「연락처 형식: 010-…」 같은 본보기를 적어 두는 순간 그 줄이 곧
           * 개인정보 표시가 된다.
           */}
          <Panel title="권한·개인정보" meta="열람 규칙은 화면이 아니라 코드가 강제한다">
            <DescList
              rows={[
                row(
                  "이 화면 권한",
                  <>
                    <span className="a2-mono">system.manage</span> · {systemRoles.join(" · ")}
                  </>,
                  "lib/admin.ts",
                ),
                row(
                  "권한·역할",
                  <>
                    권한 <span className="a2-num">{permissionIds.length}</span>개 · 역할{" "}
                    <span className="a2-num">{staffRoles.length}</span>가지
                  </>,
                  "lib/admin.ts",
                ),
                row("목록의 학생 표기", "이름 대신 회차 내 응시번호", "lib/admin.ts"),
                row("연락처 표기", "마스킹된 값만. 원문 칸을 두지 않는다", "lib/admin.ts"),
                row("개인정보 열람", "사유 입력 강제 · 전건 감사 로그", "lib/admin.ts"),
                row(
                  "표준 열람 사유",
                  <span className="flex flex-wrap gap-1">
                    {accessReasons.map((r) => (
                      <Tag key={r}>{r}</Tag>
                    ))}
                  </span>,
                  "lib/admin.ts",
                ),
                /* 정지와 삭제를 한 줄로 합치지 않는다. 하나는 되돌릴 수 있고 하나는 없다 —
                   그 차이가 이 판에서 가장 중요한 한 가지다. */
                row(
                  "계정 정지 사유",
                  <>
                    <span className="a2-num">{userActions.suspend.reasons.length}</span>가지 · 되돌릴 수 있음
                  </>,
                  "lib/admin.ts",
                ),
                row(
                  "계정 삭제 사유",
                  <>
                    <span className="a2-num">{userActions.delete.reasons.length}</span>가지 · 되돌릴 수 없음
                  </>,
                  "lib/admin.ts",
                ),
              ]}
            />
          </Panel>

          {/* 기관 정보 — 푸터·고객지원 화면과 같은 값을 본다. 두 곳이 갈리면 문의 응대에서
              서로 다른 번호를 불러 주게 되므로, 출처가 한 파일이라는 것을 여기서 보인다. */}
          <Panel title="기관 정보" meta="공개 존 푸터와 같은 출처">
            <DescList
              rows={[
                row("상호", company.name, "lib/site.ts"),
                row("대표", company.ceo, "lib/site.ts"),
                row("사업자등록번호", <span className="a2-mono">{company.bizNo}</span>, "lib/site.ts"),
                row("주소", company.address, "lib/site.ts"),
                row("대표전화", <span className="a2-mono">{company.tel}</span>, "lib/site.ts"),
                row("이메일", <span className="a2-mono">{company.email}</span>, "lib/site.ts"),
                row("상담 시간", company.hours, "lib/site.ts"),
              ]}
            />
          </Panel>
        </div>

        {/*
         * 아직 값이 없는 자리.
         *
         * 이 판만 DescList가 아니다. 값이 없는 항목을 이름:값 목록에 끼워 넣으면 오른쪽이
         * 전부 「—」로 서고, 그러면 값이 없는 것인지 0인 것인지 화면이 답하지 못한다.
         * 이름만 있는 것은 이름만 있는 대로 목록으로 세워 둔다 — 붙일 때 무엇을 채워야
         * 하는지가 곧 이 목록이다.
         */}
        <Panel className="mt-3" title="아직 값이 없는 자리" meta={stub.id}>
          <ul className="space-y-1 a2-t-sm text-(--a2-ink-2)">
            {stub.todo.map((t) => (
              <li key={t} className="flex gap-2">
                <span aria-hidden className="a2-dot mt-1.5 shrink-0 text-(--a2-ink-4)" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </Panel>

</Body>
      <SeedNote>
        회차·건수는 화면 설계를 위한 예시입니다(lib/admin.ts). 임계값과 기관 정보는 실제로 코드에 걸려 있는 값이며,
        고치려면 해당 파일을 바꿔 배포해야 합니다.
      </SeedNote>
    </>
  );
}
