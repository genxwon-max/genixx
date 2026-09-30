"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "@/lib/authStore";
import { ageFromBirth } from "@/lib/account";
import { formatCode } from "@/lib/roster";
import { DefTable } from "@/components/account/ui";
import { Head, WhoNote, btnQuiet, cardBox, useSelf } from "./self";

/** 「20180314」 → 「2018.03.14」 */
function birthText(birth: string | undefined) {
  if (!birth || birth.length !== 8) return "—";
  return `${birth.slice(0, 4)}.${birth.slice(4, 6)}.${birth.slice(6)}`;
}

/**
 * 내 정보 (/student/account) — 학생이 자기 것을 확인하는 자리.
 *
 * 보호자 마이페이지(/mypage)를 그대로 물려주지 않는다. 저기에는 동의·수신·결제·탈퇴가
 * 있는데 그것은 모두 **보호자가 정하는 일**이다. 아이 화면에 세워 두면 누를 수 없는
 * 메뉴가 늘어서고, 누를 수 있게 두면 보호자 동의를 아이가 뒤집는 길이 된다.
 *
 * 그래서 여기는 읽는 자리다 — 내 이름·학교·접속코드가 맞는지 확인하고, 틀렸으면 보호자에게
 * 말하면 된다. 고치는 일은 등록한 사람이 명부에서 한다.
 */
export default function StudentAccount() {
  const self = useSelf();
  const router = useRouter();
  const s = self.student;
  const age = s ? ageFromBirth(s.birth) : null;

  return (
    <>
      <WhoNote self={self} />

      <Head
        title="내 정보"
        lead="이름·학교가 틀렸으면 나를 등록한 보호자·선생님께 말해 주세요. 고치는 일은 명부에서 합니다."
      />

      <div className={`mt-7 overflow-hidden ${cardBox}`}>
        <DefTable
          rows={[
            { k: "이름", v: self.hydrated ? (s?.name ?? self.name) : "—" },
            {
              k: "생년월일",
              v: self.hydrated ? (
                <>
                  {birthText(s?.birth)}
                  {age !== null && <span className="ml-2 text-soft-muted">만 {age}세</span>}
                </>
              ) : (
                "—"
              ),
            },
            { k: "학교", v: (self.hydrated && s?.school) || "—" },
            { k: "학년", v: (self.hydrated && s?.grade) || "—" },
            {
              k: "접속코드",
              v: self.hydrated && s ? (
                <span className="font-semibold tracking-[0.06em] tabular-nums text-soft-ink">
                  {formatCode(s.code)}
                </span>
              ) : (
                "—"
              ),
            },
            { k: "등록한 사람", v: (self.hydrated && s?.ownerName) || "—" },
          ]}
        />
      </div>

      <p className="mt-5 text-[13px] leading-[1.8] text-soft-muted">
        접속코드는 나만 씁니다. 다른 사람에게 알려 주면 그 사람이 내 이름으로 진단을 받을 수
        있습니다. 코드를 잃어버렸으면 보호자가 다시 발급해 줄 수 있습니다.
      </p>

      <div className="mt-7 flex flex-wrap gap-2.5 border-t border-soft-line pt-6">
        <a
          href="/support/inquiry"
          target="_blank"
          rel="noopener noreferrer"
          className={btnQuiet}
        >
          1:1 문의
        </a>
        <Link href="/exam/info" className={btnQuiet}>
          진단 안내
        </Link>
        <button
          type="button"
          onClick={() => {
            signOut();
            router.push("/login/student");
          }}
          className={`${btnQuiet} text-soft-muted`}
        >
          로그아웃
        </button>
      </div>
    </>
  );
}
