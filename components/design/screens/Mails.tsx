import Link from "next/link";
import { LogoLockup } from "@/components/Logo";
import { company } from "@/lib/site";
import { photoFlow, retakeTips } from "./photoFlow";

/**
 * 이메일 알림 본문 (WBS Q3 1.1 「이메일」 · v4/ns/7.1.2) — 디자인.
 *
 * 알림 하나마다 주소 하나다. 화면 위쪽의 작은 판(제목 · 보낸 사람 · 미리보기 글)은 받은편지함에
 * 보이는 값이고, 그 아래 600px 판이 메일 본문이다.
 *
 * 본문은 모든 메일이 같은 뼈대를 쓴다 — 로고 → 제목 → 인사와 본문 → 정리표 → 단추 하나 →
 * 덧붙이는 말 → 바닥글. 단추는 한 메일에 하나만 둔다. 메일에서 할 일은 늘 「열어 보기」 하나다.
 *
 * 접속코드 · 비밀번호 같은 값은 메일에 적지 않는다. 메일은 전달되고 오래 남는다.
 *
 * 콘솔에서 일하는 사람은 운영자가 계정을 만들어 주지 않고 전문가로 가입해 승인을 받는다 —
 * 그래서 「계정 발급」 메일은 없고, 가입 신청 접수 · 승인 · 반려 세 가지가 있다.
 *
 * 답 사진 다시 올리기 세 가지(2026-10-21) — 운영자의 요청 · 기한 하루 전 안내 · 다시 올린 사진을
 * 받았다는 안내. 받는 사람은 이서준의 보호자 이정민이다(./photoFlow.ts). 앞의 둘은 결과가 늦어지는
 * 일이라 수신 설정과 관계없이 보낸다. 같은 내용을 알림톡으로도 보낸다(./Alimtalk.tsx).
 */

const photoTo = `${photoFlow.guardian.name} <${photoFlow.guardian.email}>`;
const photoRows: [string, string][] = [
  ["진단", photoFlow.diag.name],
  ["학생", `${photoFlow.student.name} · ${photoFlow.student.grade}`],
  ["문항", `${photoFlow.question.label} · 사진으로 답하는 문항`],
];
/** 「밝은 곳에서 · 종이 전체가 들어오게 · 위에서 똑바로」 */
const tipLine = retakeTips
  .slice(0, 3)
  .map((tip) => tip.head)
  .join(" · ");

type Mail = {
  /** 받은편지함에 보이는 제목 */
  subject: string;
  /** 제목 옆에 흐리게 보이는 미리보기 글 */
  preview: string;
  /** 받는 사람 */
  to: string;
  title: string;
  /** 본문 단락 */
  body: string[];
  /** 정리표 — 이름 · 값 */
  rows?: [string, string][];
  /** 크게 보여 줄 값 한 줄 (인증번호 · 일회용 비밀번호) */
  code?: { label: string; value: string; note: string };
  cta?: { label: string; href: string };
  /** 단추 아래 덧붙이는 말 */
  notes?: string[];
  /** 꼭 받아야 하는 메일인가 — 바닥글의 수신 안내가 달라진다 */
  required?: boolean;
};

const parent = "김지은 <jieun.kim@example.com>";

const mails: Record<string, Mail> = {
  verify: {
    subject: "[GENIXX] 이메일 인증번호를 확인해 주세요",
    preview: "인증번호 482 913 · 10분 안에 입력해 주세요.",
    to: parent,
    title: "이메일 인증번호",
    body: ["안녕하세요. GENIXX 회원가입을 위한 인증번호입니다.", "가입 화면에 아래 숫자 6자리를 입력해 주세요."],
    code: { label: "인증번호", value: "482 913", note: "10분 동안만 쓸 수 있습니다." },
    notes: ["직접 요청하지 않으셨다면 이 메일을 무시해 주세요. 인증번호를 입력하지 않으면 가입되지 않습니다."],
    required: true,
  },
  welcome: {
    subject: "[GENIXX] 가입을 환영합니다",
    preview: "이제 학생을 등록하고 진단을 접수할 수 있습니다.",
    to: parent,
    title: "가입이 완료되었습니다",
    body: [
      "김지은님, GENIXX에 오신 것을 환영합니다.",
      "먼저 진단을 받을 학생을 등록해 주세요. 등록하면 학생이 로그인할 때 쓰는 접속코드가 발급됩니다.",
    ],
    rows: [
      ["가입한 계정", "jieun.kim@example.com"],
      ["회원 유형", "개인 회원 (보호자)"],
      ["가입한 때", "2026.10.05(월) 09:12"],
    ],
    cta: { label: "학생 등록하기", href: "/my/children/new" },
    required: true,
  },
  "reset-password": {
    subject: "[GENIXX] 비밀번호 재설정 안내",
    preview: "아래 버튼으로 새 비밀번호를 정해 주세요. 30분 동안 쓸 수 있습니다.",
    to: parent,
    title: "비밀번호를 다시 정해 주세요",
    body: ["비밀번호 재설정을 요청하셨습니다.", "아래 버튼을 눌러 새 비밀번호를 정해 주세요. 버튼은 30분 동안만 쓸 수 있습니다."],
    cta: { label: "새 비밀번호 정하기", href: "/login/recover" },
    notes: ["직접 요청하지 않으셨다면 이 메일을 무시해 주세요. 비밀번호는 바뀌지 않습니다."],
    required: true,
  },
  "student-registered": {
    subject: "[GENIXX] 김서아 학생이 등록되었습니다",
    preview: "접속코드가 발급되었습니다. 학생 화면에서 확인해 주세요.",
    to: parent,
    title: "학생이 등록되었습니다",
    body: [
      "김서아 학생을 등록하셨습니다.",
      "학생은 접속코드와 생년월일로 로그인합니다. 접속코드는 보안을 위해 메일에 적지 않습니다 — 아래 버튼으로 들어가 확인해 주세요.",
    ],
    rows: [
      ["학생", "김서아 · 초등 3학년"],
      ["학교", "서울한빛초등학교"],
      ["등록한 때", "2026.10.05(월) 09:31"],
    ],
    cta: { label: "접속코드 확인하기", href: "/my/children" },
  },
  "exam-applied": {
    subject: "[GENIXX] 진단 접수가 완료되었습니다",
    preview: "2026 4분기 초3 진단 · 10.31(토)까지 응시할 수 있습니다.",
    to: parent,
    title: "진단 접수가 완료되었습니다",
    body: ["김서아 학생의 진단을 접수했습니다.", "응시 기간 안에 학생이 접속코드로 들어가 응시하면 됩니다. 과목은 하루에 다 보지 않아도 됩니다."],
    rows: [
      ["진단", "2026 4분기 초3 진단 (유료 진단)"],
      ["학생", "김서아 · 초등 3학년"],
      ["응시 기간", "2026.10.06(화) ~ 10.31(토)"],
      ["과목", "국어 · 수학 · 과학"],
    ],
    cta: { label: "응시 안내 보기", href: "/exam/guide" },
  },
  "payment-done": {
    subject: "[GENIXX] 결제가 완료되었습니다 (39,000원)",
    preview: "2026 4분기 초3 진단 응시권 · 주문번호 GX2026-000148",
    to: parent,
    title: "결제가 완료되었습니다",
    body: ["결제해 주셔서 감사합니다. 결제 내용은 아래와 같습니다."],
    rows: [
      ["주문번호", "GX2026-000148"],
      ["상품", "2026 4분기 초3 진단 응시권"],
      ["학생", "김서아"],
      ["결제 금액", "39,000원"],
      ["결제 수단", "신용카드 · KB국민 1234"],
      ["결제한 때", "2026.10.05(월) 09:40"],
    ],
    cta: { label: "결제 내역 보기", href: "/my/payments" },
    notes: ["응시를 시작하기 전까지는 전액 환불됩니다. 자세한 내용은 환불 정책을 확인해 주세요."],
    required: true,
  },
  "exam-open": {
    subject: "[GENIXX] 오늘부터 진단에 응시할 수 있습니다",
    preview: "2026 4분기 초3 진단 · 10.31(토)까지",
    to: parent,
    title: "응시가 시작되었습니다",
    body: ["김서아 학생이 접수한 진단의 응시 기간이 시작되었습니다.", "학생이 접속코드로 로그인하면 「내 진단」에서 바로 응시할 수 있습니다."],
    rows: [
      ["진단", "2026 4분기 초3 진단"],
      ["응시 기간", "2026.10.06(화) ~ 10.31(토)"],
      ["걸리는 시간", "과목마다 40분 안팎"],
    ],
    cta: { label: "학생 로그인 화면 열기", href: "/login/student" },
  },
  "exam-remind": {
    subject: "[GENIXX] 아직 끝내지 않은 과목이 있습니다",
    preview: "김서아 학생 · 수학 · 과학이 남았습니다. 10.31(토)까지 응시해 주세요.",
    to: parent,
    title: "아직 끝내지 않은 과목이 있습니다",
    body: ["김서아 학생이 진단을 다 마치지 않았습니다.", "풀던 곳부터 이어서 응시할 수 있습니다. 응시 기간이 지나면 남은 과목은 응시할 수 없습니다."],
    rows: [
      ["진단", "2026 4분기 초3 진단"],
      ["마친 과목", "국어"],
      ["남은 과목", "수학 (진행 중) · 과학"],
      ["응시 마감", "2026.10.31(토) 23:59 · 7일 남음"],
    ],
    cta: { label: "진행 상황 보기", href: "/my" },
  },
  "report-published": {
    subject: "[GENIXX] 김도현 학생의 진단 결과가 나왔습니다",
    preview: "전문가가 확정한 결과를 지금 확인할 수 있습니다.",
    to: parent,
    title: "진단 결과가 발행되었습니다",
    body: [
      "김도현 학생의 진단 결과를 전문가가 확정해 발행했습니다.",
      "결과 화면에서 요약 보고서를 바로 볼 수 있고, 결과를 함께 읽어 줄 전문가 면담도 신청할 수 있습니다.",
    ],
    rows: [
      ["진단", "2026 3분기 초4 진단"],
      ["학생", "김도현 · 초등 4학년"],
      ["발행한 때", "2026.10.11(일) 10:00"],
    ],
    cta: { label: "진단 결과 보기", href: "/exam/result" },
    notes: ["결과에는 점수와 재능 유형이 담겨 있어 메일에는 적지 않습니다. 로그인한 뒤 확인해 주세요."],
  },
  "photo-request": {
    subject: `[GENIXX] ${photoFlow.student.name} 학생의 수학 답 사진을 다시 올려 주세요 (${photoFlow.request.dueShort}까지)`,
    preview: "사진이 흐려서 채점자가 답을 읽지 못했습니다. 처음 쓴 종이를 다시 찍어 올려 주세요.",
    to: photoTo,
    title: "답 사진을 다시 올려 주세요",
    body: [
      `${photoFlow.student.name} 학생이 ${photoFlow.diag.name}의 ${photoFlow.question.label} 답으로 올린 사진이 흐려서, 채점자가 답을 읽지 못했습니다.`,
      "학생이 처음에 쓴 종이를 밝은 곳에서 다시 찍어 올려 주세요. 답을 고치거나 새로 쓰지 말고 그 종이를 그대로 찍어 주셔야 합니다.",
    ],
    rows: [
      ...photoRows,
      ["다시 올릴 이유", photoFlow.flagged.reason],
      ["다시 찍는 법", tipLine],
      ["올릴 기한", `2026.10.17(토) 23:59까지`],
    ],
    cta: { label: "사진 다시 올리기", href: `/design${photoFlow.request.link}` },
    notes: [
      "버튼은 로그인하지 않아도 열리며, 기한까지만 쓸 수 있습니다. 학생 대시보드의 「내 진단」에서도 올릴 수 있고, 둘 중 한 곳에서만 올리면 됩니다.",
      "기한까지 올리지 않으면 지금 사진으로 채점합니다. 글씨를 읽을 수 없으면 이 문항은 점수를 받지 못할 수 있습니다.",
      "다른 문항의 답은 고칠 수 없습니다.",
    ],
    required: true,
  },
  "photo-remind": {
    subject: "[GENIXX] 내일까지 답 사진을 다시 올려 주세요",
    preview: `${photoFlow.student.name} 학생 · ${photoFlow.question.label} · ${photoFlow.request.dueText}까지`,
    to: photoTo,
    title: "답 사진 올릴 기한이 하루 남았습니다",
    body: [
      `${photoFlow.student.name} 학생의 ${photoFlow.question.label} 답 사진이 아직 올라오지 않았습니다.`,
      "내일 밤 23:59까지 올려 주시면 채점을 이어서 합니다. 처음에 쓴 종이를 그대로 찍어 주세요.",
    ],
    rows: [...photoRows, ["올릴 기한", "2026.10.17(토) 23:59까지 · 하루 남음"]],
    cta: { label: "사진 다시 올리기", href: `/design${photoFlow.request.link}` },
    notes: [
      "기한까지 올리지 않으면 지금 사진으로 채점합니다. 글씨를 읽을 수 없으면 이 문항은 점수를 받지 못할 수 있습니다.",
      "이미 올리셨다면 이 메일은 무시해 주세요. 올리신 뒤에는 이 안내가 가지 않습니다.",
    ],
    required: true,
  },
  "photo-received": {
    subject: "[GENIXX] 다시 올리신 답 사진을 받았습니다",
    preview: `${photoFlow.student.name} 학생 · ${photoFlow.question.label} · 채점을 이어서 합니다.`,
    to: photoTo,
    title: "다시 올리신 사진을 받았습니다",
    body: [
      "보내 주신 사진으로 채점을 이어서 합니다.",
      `채점이 모두 끝나면 ${photoFlow.student.name} 학생의 진단 결과가 발행되고, 발행되면 다시 알려 드립니다.`,
    ],
    rows: [...photoRows, ["받은 때", "2026.10.15(목) 20:12"]],
    /* 받았다는 안내라 할 일이 없다 — 단추를 두지 않는다 */
    notes: ["사진을 잘못 보내셨다면 기한(10.17 토 23:59) 안에 1:1 문의로 알려 주세요."],
  },
  "counsel-confirmed": {
    subject: "[GENIXX] 면담 예약이 확정되었습니다 (10.15 목 14:00)",
    preview: "김지원 전문가 · 화상 면담 60분 · 예약번호 CS-2610-0012",
    to: parent,
    title: "면담 예약이 확정되었습니다",
    body: ["결제가 끝나 면담 예약이 확정되었습니다.", "화상 면담 링크는 면담 일정 화면에서 확인할 수 있고, 면담 10분 전부터 들어오실 수 있습니다."],
    rows: [
      ["예약번호", "CS-2610-0012"],
      ["일시", "2026.10.15(목) 14:00 ~ 15:00"],
      ["전문가", "김지원 (책임연구원 · 진단 총괄)"],
      ["학생", "김도현 · 초등 4학년"],
      ["방식", "화상 면담"],
      ["결제 금액", "100,000원"],
    ],
    cta: { label: "면담 일정 보기", href: "/design/my/interviews/detail" },
    notes: ["면담 하루 전(10.14 14:00)까지 취소하면 전액 환불됩니다."],
    required: true,
  },
  "counsel-changed": {
    subject: "[GENIXX] 면담 일정이 바뀌었습니다",
    preview: "10.15(목) 14:00 → 10.16(금) 10:00 · 김지원 전문가",
    to: parent,
    title: "면담 일정이 바뀌었습니다",
    body: ["전문가 사정으로 면담 시간이 바뀌어 안내드립니다. 불편을 드려 죄송합니다.", "바뀐 시간이 어려우시면 면담 일정 화면에서 취소하실 수 있고, 이 경우 전액 환불됩니다."],
    rows: [
      ["예약번호", "CS-2610-0012"],
      ["바뀌기 전", "2026.10.15(목) 14:00 ~ 15:00"],
      ["바뀐 뒤", "2026.10.16(금) 10:00 ~ 11:00"],
      ["전문가", "김지원"],
      ["방식", "화상 면담 (그대로)"],
    ],
    cta: { label: "바뀐 일정 확인하기", href: "/design/my/interviews/detail" },
    required: true,
  },
  "counsel-remind": {
    subject: "[GENIXX] 내일 14:00에 면담이 있습니다",
    preview: "김지원 전문가 · 화상 면담 · 10분 전부터 들어오실 수 있습니다.",
    to: parent,
    title: "내일 면담이 있습니다",
    body: ["예약하신 면담이 하루 앞으로 다가왔습니다.", "진단 결과지를 함께 보며 이야기합니다. 결과 화면을 미리 열어 두시면 좋습니다."],
    rows: [
      ["일시", "2026.10.15(목) 14:00 ~ 15:00"],
      ["전문가", "김지원"],
      ["방식", "화상 면담 · 13:50부터 입장"],
    ],
    cta: { label: "면담 일정 보기", href: "/design/my/interviews/detail" },
    notes: ["지금부터는 취소해도 환불 정책에 따라 일부만 환불될 수 있습니다."],
  },
  "inquiry-answered": {
    subject: "[GENIXX] 문의하신 내용에 답변드렸습니다",
    preview: "「접속코드를 잃어버렸어요」 문의에 답변이 등록되었습니다.",
    to: parent,
    title: "문의에 답변드렸습니다",
    body: ["남겨 주신 1:1 문의에 답변이 등록되었습니다."],
    rows: [
      ["문의 제목", "접속코드를 잃어버렸어요"],
      ["문의한 때", "2026.10.07(수) 16:22"],
      ["답변한 때", "2026.10.08(목) 09:48"],
    ],
    cta: { label: "답변 보기", href: "/support/inquiry" },
    notes: ["답변 내용에는 개인정보가 포함될 수 있어 메일에는 적지 않습니다."],
  },
  "leave-requested": {
    subject: "[GENIXX] 회원 탈퇴가 접수되었습니다",
    preview: "30일 뒤(11.10)에 계정이 삭제됩니다. 그 전에는 다시 로그인해 되돌릴 수 있습니다.",
    to: parent,
    title: "회원 탈퇴가 접수되었습니다",
    body: [
      "회원 탈퇴를 접수했습니다. 30일 동안은 계정이 삭제되지 않고 보관됩니다.",
      "마음이 바뀌시면 그 안에 다시 로그인해 탈퇴를 취소할 수 있습니다. 30일이 지나면 계정과 등록한 학생 2명의 정보가 알아볼 수 없게 처리됩니다.",
    ],
    rows: [
      ["탈퇴를 접수한 때", "2026.10.11(일) 11:20"],
      ["삭제되는 날", "2026.11.10(화)"],
      ["함께 처리되는 학생", "김도현 · 김서아"],
    ],
    cta: { label: "탈퇴 취소하기", href: "/login" },
    notes: ["결제 기록은 관련 법에 따라 5년 동안 따로 보관한 뒤 삭제합니다."],
    required: true,
  },
  "expert-applied": {
    subject: "[GENIXX] 전문가 가입 신청이 접수되었습니다",
    preview: "운영진이 확인한 뒤 승인 결과를 알려 드립니다. 보통 1~2 영업일이 걸립니다.",
    to: "한지수 <jisu.han@example.com>",
    title: "전문가 가입 신청이 접수되었습니다",
    body: [
      "한지수님, 전문가 회원 가입 신청이 접수되었습니다.",
      "운영진이 소속과 경력을 확인한 뒤 맡으실 역할을 정해 계정을 엽니다. 승인 전에는 로그인해도 진행 상태만 보입니다.",
    ],
    rows: [
      ["신청 번호", "EX-2610-004"],
      ["가입 수단", "아이디 가입 · jisu_han"],
      ["신청한 때", "2026.10.11(일) 09:40"],
      ["걸리는 시간", "보통 1~2 영업일"],
    ],
    cta: { label: "진행 상태 보기", href: "/design/admin2/waiting" },
    notes: ["확인에 필요한 자료가 있으면 등록하신 연락처로 따로 요청드립니다."],
    required: true,
  },
  "expert-approved": {
    subject: "[GENIXX] 전문가 회원 가입이 승인되었습니다",
    preview: "출제자 · 상담사 권한이 부여되었습니다. 로그인하면 받은 권한의 화면이 열립니다.",
    to: "한지수 <jisu.han@example.com>",
    title: "전문가 회원 가입이 승인되었습니다",
    body: [
      "한지수님, 전문가 회원 가입 신청이 승인되었습니다.",
      "사이트에서 로그인하면 받은 권한의 화면이 바로 열립니다. 먼저 「내 정보」에서 사진 · 연혁 · 소개를 채워 주세요. 상담사 권한을 받으셨으니 상담 가능 시간도 등록해 주세요.",
    ],
    rows: [
      ["신청 번호", "EX-2610-004"],
      ["받은 권한", "출제자 · 상담사"],
      ["승인한 때", "2026.10.12(월) 10:05"],
    ],
    cta: { label: "로그인하기", href: "/login" },
    notes: ["권한은 운영진이 정하며, 승인된 뒤에도 바뀔 수 있습니다. 바뀌면 다시 알려 드립니다."],
    required: true,
  },
  "expert-rejected": {
    subject: "[GENIXX] 전문가 가입 신청 결과를 알려 드립니다",
    preview: "이번 신청은 승인되지 않았습니다. 사유를 확인하신 뒤 다시 신청하실 수 있습니다.",
    to: "한지수 <jisu.han@example.com>",
    title: "가입 신청이 승인되지 않았습니다",
    body: [
      "한지수님, 전문가 회원 가입 신청을 검토했으나 이번에는 승인해 드리지 못했습니다.",
      "아래 사유를 확인하신 뒤 다시 신청하실 수 있습니다.",
    ],
    rows: [
      ["신청 번호", "EX-2610-004"],
      ["사유", "경력이 확인되지 않음 — 적어 주신 소속에 확인했으나 재직 기록을 찾지 못했습니다."],
      ["처리한 때", "2026.10.12(월) 14:20"],
    ],
    cta: { label: "신청 결과 보기", href: "/design/admin2/waiting/rejected" },
    notes: ["결과에 대해 궁금한 점은 1:1 문의로 남겨 주세요."],
    required: true,
  },
};

export default function Mails({ state }: { state: string }) {
  const m = mails[state];
  if (!m) return null;

  return (
    <div className="min-h-full flex-1 bg-[#eef1f6] px-4 py-8 text-[#1f2340] sm:py-12">
      {/* 받은편지함에 보이는 값 — 메일 본문이 아니다 */}
      <dl className="mx-auto w-full max-w-[600px] rounded-lg border border-slate-200 bg-white px-5 py-4 text-[13px]">
        {[
          ["제목", m.subject],
          ["보낸 사람", "GENIXX <no-reply@genixx.kr>"],
          ["받는 사람", m.to],
          ["미리보기 글", m.preview],
        ].map(([k, v], i) => (
          <div key={k} className="flex gap-3 py-1">
            <dt className="w-[5.5rem] shrink-0 text-slate-500">{k}</dt>
            <dd className={i === 0 ? "font-bold text-slate-900" : "text-slate-700"}>{v}</dd>
          </div>
        ))}
      </dl>

      {/* ── 메일 본문 (폭 600px) ── */}
      <div className="mx-auto mt-4 w-full max-w-[600px] overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="border-b-[3px] border-brand-900 px-8 py-6 sm:px-10">
          <LogoLockup className="text-[1.5rem]" />
        </div>

        <div className="px-8 py-9 sm:px-10">
          <h1 className="text-[22px] font-bold leading-snug tracking-tight text-brand-950">{m.title}</h1>

          <div className="mt-5 space-y-3 text-[15px] leading-[1.8] text-slate-700">
            {m.body.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>

          {m.rows && (
            <table className="mt-6 w-full border-collapse border-t-2 border-brand-900 text-[14px]">
              <tbody>
                {m.rows.map(([k, v]) => (
                  <tr key={k} className="border-b border-slate-200">
                    <th scope="row" className="w-[8.5rem] bg-slate-50 px-4 py-3 text-left font-semibold text-slate-600">
                      {k}
                    </th>
                    <td className="px-4 py-3 font-medium text-slate-900">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {m.code && (
            <div className="mt-6 rounded-lg bg-brand-50 px-6 py-5 text-center">
              <p className="text-[13px] font-semibold text-brand-700">{m.code.label}</p>
              <p className="mt-1.5 font-mono text-[28px] font-bold tracking-[0.08em] text-brand-950">{m.code.value}</p>
              <p className="mt-1.5 text-[13px] text-slate-600">{m.code.note}</p>
            </div>
          )}

          {m.cta && (
            <p className="mt-8 text-center">
              <Link
                href={m.cta.href}
                className="inline-block rounded-lg bg-brand-900 px-9 py-3.5 text-[15px] font-bold text-white hover:bg-brand-800"
              >
                {m.cta.label}
              </Link>
            </p>
          )}

          {m.cta && (
            <p className="mt-4 text-center text-[12.5px] leading-[1.7] text-slate-500">
              버튼이 눌리지 않으면 아래 주소를 브라우저에 붙여 넣어 주세요.
              <br />
              <span className="break-all text-brand-700 underline">
                https://genixx.kr{m.cta.href.replace("/design", "")}
              </span>
            </p>
          )}

          {m.notes && (
            <ul className="mt-8 space-y-1.5 border-t border-slate-200 pt-5 text-[13px] leading-[1.75] text-slate-600">
              {m.notes.map((n) => (
                <li key={n}>· {n}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-slate-100 px-8 py-6 text-[12px] leading-[1.75] text-slate-500 sm:px-10">
          <p>
            이 메일은 보내기 전용이라 답장을 받을 수 없습니다. 궁금한 점은{" "}
            <Link href="/support/inquiry" className="font-semibold text-slate-700 underline">
              1:1 문의
            </Link>
            로 남겨 주세요.
          </p>
          <p className="mt-1">
            {m.required ? (
              "가입 · 결제 · 예약처럼 꼭 알려 드려야 하는 내용이라 수신 설정과 관계없이 보내 드립니다."
            ) : (
              <>
                이 알림을 그만 받으려면{" "}
                <Link href="/my/account/notification" className="font-semibold text-slate-700 underline">
                  알림 설정
                </Link>
                에서 이메일 수신을 꺼 주세요.
              </>
            )}
          </p>
          <p className="mt-3 border-t border-slate-200 pt-3">
            {company.name} · 대표 {company.ceo} · 사업자등록번호 {company.bizNo}
            <br />
            {company.address} · 고객센터 {company.tel} ({company.hours})
          </p>
          <p className="mt-2">
            <Link href="/legal/terms" className="underline">
              이용약관
            </Link>{" "}
            ·{" "}
            <Link href="/legal/privacy" className="font-semibold text-slate-700 underline">
              개인정보처리방침
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
