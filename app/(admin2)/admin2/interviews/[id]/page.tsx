import InterviewDetail from "./InterviewDetail";

export const metadata = { title: "면담 상세" };

/*
 * EXP-06 면담 상세 — 이 아이를 언제 누가 어떻게 만나는가.
 *
 * 일정을 실제로 잡고 고치는 **유일한 자리**다. 목록에서도 달력에서도 이리로만 들어온다.
 * 잡는 자리를 둘로 두면 같은 일이 두 규율로 서고(한쪽은 저장 단추, 한쪽은 붙잡개),
 * 「지금 무엇이 저장된 상태인가」가 화면마다 달라진다.
 *
 * 자료는 셋에서 온다 — 케이스와 선발 사유는 전문가 콘솔(lib/expertStore.ts), 신청은
 * lib/interviews.ts, 우리가 잡은 일정은 lib/interviewStore.ts. 셋을 합치는 코드는
 * useInterview 한 자리에만 둔다. 화면마다 이어 붙이면 옛 scheduledAt을 읽어 주는 자리도
 * 화면 수만큼 생긴다.
 *
 * ⚠ key를 면담 번호로 준다. 같은 경로 꼴 안에서 건만 갈아 끼우면 React가 조각을 그대로
 *   두어, 앞 아이에게 잡던 날짜와 장소가 다음 아이 화면에 그대로 남는다.
 *
 * ⚠ 면담 기록(프로토콜 일곱)과 코딩 확정은 여기서 하지 않는다. 그것은 면담원이 아이 말을
 *   받아 적으며 하는 일이고 /admin/interview에 이미 있다 — 같은 값을 두 콘솔이 다른 저장
 *   방식으로 물면 뒤엣것이 이긴다. 여기서는 읽기만 하고 링크를 낸다.
 *
 * ⚠ 정적 조각 calendar가 이 동적 조각을 이긴다. 면담 번호가 IV-로 시작하므로 지금은
 *   부딪칠 값이 없지만, 뒤에 오는 사람이 상세 주소 꼴을 바꾸면 /admin2/interviews/calendar가
 *   조용히 달력 대신 상세로 열린다.
 */
export default async function Admin2InterviewPage({
  params,
}: PageProps<"/admin2/interviews/[id]">) {
  const { id } = await params;
  return <InterviewDetail key={id} id={id} />;
}
