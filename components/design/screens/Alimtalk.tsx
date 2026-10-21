import Link from "next/link";
import { designLinks } from "@/lib/designScreens";
import { company } from "@/lib/site";
import { photoFlow, retakeTips } from "./photoFlow";

/**
 * 알림톡 · 문자 본문 (WBS v4/ns/7.1.2) — 디자인.
 *
 * 카카오 알림톡은 미리 심사받은 틀(템플릿)에 값만 바꿔 넣어 보낸다. 틀 하나마다 주소 하나다. 위쪽의 작은
 * 판(틀 이름 · 보내는 때 · 받는 사람 · 받을 수 없을 때)은 보내는 쪽에서 보는 값이고, 그 아래가 받는
 * 사람의 휴대전화에 보이는 모양이다.
 *
 * 알림톡을 받을 수 없는 번호(카카오톡을 쓰지 않거나 채널 알림을 막은 번호)에는 같은 내용을 장문 문자로
 * 보낸다(…/sms). 문자에는 단추를 달 수 없어 링크 주소를 글 안에 적는다.
 *
 * 지금 있는 틀은 답 사진 다시 올리기의 둘이다(2026-10-21) — 운영자의 요청과 기한 하루 전 안내. 받는
 * 사람은 이서준의 보호자 이정민이고, 값은 메일과 같다(./photoFlow.ts · ./Mails.tsx).
 */

const to = designLinks("alimtalk");
const { student, guardian, question, request, diag } = photoFlow;

/** 받는 사람이 누르는 단추가 여는 화면 — 보호자의 사진 다시 올리기 디자인 */
const AGAIN = `/design${request.link}`;
const AGAIN_URL = `https://genixx.kr${request.link}`;

type Talk = {
  template: string;
  when: string;
  title: string;
  /** 본문 — 빈 줄은 문단 사이 */
  lines: string[];
  button: string;
  /** 알림톡을 받을 수 없을 때 대신 보내는 장문 문자 */
  sms: string[];
};

const talks: Record<string, Talk> = {
  "photo-request": {
    template: "답 사진 다시 올리기 요청",
    when: "운영자가 운영자 확인에서 「요청 보내기」를 누를 때",
    title: "답 사진을 다시 올려 주세요",
    lines: [
      `${guardian.name} 님, ${student.name} 학생이 「${diag.name}」 ${question.label} 답으로 올린 사진이 흐려서 채점자가 답을 읽지 못했습니다.`,
      "",
      "처음에 쓴 종이를 밝은 곳에서 다시 찍어 올려 주세요. 답을 고치거나 새로 쓰지 말고 그 종이를 그대로 찍어 주세요.",
      "",
      `■ 올릴 기한: ${request.dueText}까지`,
      `■ 다시 찍는 법: ${retakeTips
        .slice(0, 3)
        .map((tip) => tip.head)
        .join(" · ")}`,
      "",
      "기한까지 올리지 않으면 지금 사진으로 채점합니다.",
    ],
    button: "사진 다시 올리기",
    sms: [
      "[GENIXX] 답 사진을 다시 올려 주세요",
      `${student.name} 학생의 「${diag.name}」 ${question.label} 답 사진이 흐려서 채점자가 답을 읽지 못했습니다. 처음 쓴 종이를 밝은 곳에서 그대로 다시 찍어 10/17(토) 23:59까지 올려 주세요.`,
      AGAIN_URL,
      "기한까지 올리지 않으면 지금 사진으로 채점합니다.",
    ],
  },
  "photo-remind": {
    template: "답 사진 올릴 기한 하루 전",
    when: "기한 하루 전 18:00 · 그때까지 사진이 올라오지 않았을 때만",
    title: "답 사진 올릴 기한이 하루 남았습니다",
    lines: [
      `${guardian.name} 님, ${student.name} 학생의 ${question.label} 답 사진이 아직 올라오지 않았습니다.`,
      "",
      `■ 올릴 기한: ${request.dueText}까지`,
      "",
      "기한까지 올리지 않으면 지금 사진으로 채점합니다. 글씨를 읽을 수 없으면 이 문항은 점수를 받지 못할 수 있습니다.",
    ],
    button: "사진 다시 올리기",
    sms: [
      "[GENIXX] 답 사진 올릴 기한이 하루 남았습니다",
      `${student.name} 학생의 ${question.label} 답 사진이 아직 올라오지 않았습니다. 10/17(토) 23:59까지 올려 주세요.`,
      AGAIN_URL,
    ],
  },
};

/** 문자 요금을 가르는 바이트 수 — 한글 · 기호는 2바이트, 영문 · 숫자는 1바이트(EUC-KR) */
const bytesOf = (text: string) => [...text].reduce((n, ch) => n + (ch.charCodeAt(0) <= 0x7f ? 1 : 2), 0);

export default function Alimtalk({ state }: { state: string }) {
  const sms = state.endsWith("/sms");
  const key = sms ? state.slice(0, -"/sms".length) : state;
  const talk = talks[key];
  if (!talk) return null;

  const talkText = [talk.title, ...talk.lines].join("\n");
  const smsText = talk.sms.join("\n");

  return (
    <div className="min-h-full flex-1 bg-[#eef1f6] px-4 py-8 text-[#1f2340] sm:py-12">
      {/* 보내는 쪽에서 보는 값 — 받는 사람의 화면에는 없다 */}
      <dl className="mx-auto w-full max-w-[600px] rounded-lg border border-slate-200 bg-white px-5 py-4 text-[13px]">
        {[
          ["보내는 것", sms ? "장문 문자 (LMS)" : "카카오 알림톡"],
          ["틀 이름", talk.template],
          ["보내는 때", talk.when],
          ["받는 사람", `보호자 ${guardian.name} · ${guardian.phone}`],
          sms
            ? ["길이", `${bytesOf(smsText).toLocaleString()}바이트 · 90바이트를 넘어 장문으로 보냅니다`]
            : ["길이", `${[...talkText].length.toLocaleString()}자 · 알림톡은 1,000자까지`],
        ].map(([k, v], i) => (
          <div key={k} className="flex gap-3 py-1">
            <dt className="w-[5.5rem] shrink-0 text-slate-500">{k}</dt>
            <dd className={i === 1 ? "font-bold text-slate-900" : "text-slate-700"}>{v}</dd>
          </div>
        ))}
        <div className="flex gap-3 py-1">
          <dt className="w-[5.5rem] shrink-0 text-slate-500">{sms ? "알림톡" : "받을 수 없을 때"}</dt>
          <dd className="text-slate-700">
            {sms ? (
              <>
                알림톡을 받을 수 없는 번호에만 보냅니다.{" "}
                <Link href={to(key)} className="font-semibold text-blue-700 underline">
                  알림톡 보기
                </Link>
              </>
            ) : key === "photo-request" ? (
              <>
                같은 내용을 장문 문자로 보냅니다.{" "}
                <Link href={to(`${key}/sms`)} className="font-semibold text-blue-700 underline">
                  대신 보내는 문자 보기
                </Link>
              </>
            ) : (
              "같은 내용을 장문 문자로 보냅니다."
            )}
          </dd>
        </div>
      </dl>

      {/* ── 받는 사람의 휴대전화 ── */}
      <div className="mx-auto mt-5 w-full max-w-[380px] overflow-hidden rounded-[28px] border border-slate-300 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.10)]">
        {sms ? <SmsScreen text={talk.sms} /> : <TalkScreen talk={talk} />}
      </div>

      <p className="mx-auto mt-4 max-w-[380px] text-center text-[12.5px] leading-[1.7] text-slate-500">
        {sms
          ? "문자의 링크를 누르면 알림톡의 단추와 같은 화면이 열립니다."
          : "단추를 누르면 로그인하지 않고 사진 다시 올리기 화면이 열립니다. 링크는 기한까지만 열립니다."}
      </p>
    </div>
  );
}

/** 카카오톡 채팅방 — 채널 이름 아래로 알림톡 말풍선 하나 */
function TalkScreen({ talk }: { talk: Talk }) {
  return (
    <div className="bg-[#b2c7d9]">
      <div className="flex items-center gap-2 bg-[#a9bdce] px-4 py-3">
        <span aria-hidden className="text-[16px] text-slate-700">
          ‹
        </span>
        <span className="text-[15px] font-bold text-slate-900">GENIXX</span>
      </div>
      <div className="flex gap-2 px-3 pb-8 pt-4">
        <span
          aria-hidden
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[13px] bg-[#1f2a5a] text-[11px] font-extrabold tracking-[0.06em] text-white"
        >
          GX
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] text-slate-700">GENIXX</p>
          <div className="mt-1 flex items-end gap-1.5">
            <div className="w-full max-w-[16.5rem] overflow-hidden rounded-[12px] bg-white">
              <p className="bg-[#fee500] px-3.5 py-2 text-[12.5px] font-bold text-[#3c1e1e]">알림톡 도착</p>
              <div className="px-3.5 pb-3 pt-3">
                <p className="text-[14px] font-bold leading-[1.5] text-slate-900">{talk.title}</p>
                <div className="mt-2 text-[13px] leading-[1.65] text-slate-800">
                  {talk.lines.map((line, i) => (line ? <p key={i}>{line}</p> : <p key={i} aria-hidden className="h-2" />))}
                </div>
                <Link
                  href={AGAIN}
                  className="mt-3.5 block rounded-[6px] bg-slate-100 py-2.5 text-center text-[13.5px] font-semibold text-slate-900 hover:bg-slate-200"
                >
                  {talk.button}
                </Link>
              </div>
            </div>
            <span className="shrink-0 pb-0.5 text-[10.5px] text-slate-600">오후 2:30</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** 문자 앱 — 보낸 번호 아래로 장문 문자 하나 */
function SmsScreen({ text }: { text: string[] }) {
  return (
    <div className="bg-white">
      <div className="border-b border-slate-200 px-4 py-3 text-center">
        <p className="text-[15px] font-bold text-slate-900">{company.tel}</p>
        <p className="text-[11.5px] text-slate-500">문자 메시지</p>
      </div>
      <div className="px-4 pb-8 pt-4">
        <p className="text-center text-[11.5px] text-slate-400">오늘 오후 2:30</p>
        <div className="mt-3 max-w-[17.5rem] rounded-[16px] rounded-bl-[4px] bg-slate-100 px-3.5 py-3 text-[13.5px] leading-[1.65] text-slate-900">
          <p className="mb-1 text-[11px] font-semibold text-slate-500">[Web발신]</p>
          {text.map((line) =>
            line.startsWith("https://") ? (
              <p key={line}>
                <Link href={AGAIN} className="break-all text-blue-700 underline">
                  {line}
                </Link>
              </p>
            ) : (
              <p key={line}>{line}</p>
            ),
          )}
        </div>
      </div>
    </div>
  );
}
