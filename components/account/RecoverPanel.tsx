"use client";

import Link from "next/link";
import { useState } from "react";
import { themeOf } from "@/lib/authVariant";

/** 로그인 화면과 같은 톤(시안 2「둥글둥글」)을 쓴다 */
const t = themeOf(2);

type Tab = "id" | "pw";

const tabs: {
  key: Tab;
  label: string;
  lead: string;
  field: string;
  placeholder: string;
  inputMode: "tel" | "email";
  button: string;
  done: string;
}[] = [
  {
    key: "id",
    label: "아이디 찾기",
    lead: "가입 때 본인확인한 휴대폰 번호를 넣어 주세요. 가입한 아이디의 일부를 알려 드립니다.",
    field: "휴대폰 번호",
    placeholder: "010-1234-5678",
    inputMode: "tel",
    button: "아이디 찾기",
    done: "가입된 아이디는 gen***_parent 입니다.",
  },
  {
    key: "pw",
    label: "비밀번호 찾기",
    lead: "가입한 이메일로 재설정 링크를 보내 드립니다. 링크는 발송 후 30분간 유효합니다.",
    field: "이메일",
    placeholder: "parent@example.com",
    inputMode: "email",
    button: "재설정 링크 받기",
    done: "재설정 링크를 보냈습니다. 메일함을 확인해 주세요.",
  },
];

/**
 * ACC-02-2 계정 찾기.
 *
 * 로그인 화면과 같은 틀 — 연파랑 바탕, 가운데 좁은 열, 위에 밑줄 탭 — 을 그대로 쓴다.
 * 예전에는 계정 존 공용 카드(AccHead + 흰 카드 두 장)로 세웠는데, 로그인에서 링크를
 * 눌러 넘어오면 모서리·버튼·글꼴 무게가 다 달라서 딴 서비스로 건너간 것처럼 보였다.
 */
export default function RecoverPanel({ initialTab = "id" }: { initialTab?: Tab }) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [value, setValue] = useState("");
  const [sent, setSent] = useState(false);
  const cur = tabs.find((x) => x.key === tab)!;

  const switchTo = (next: Tab) => {
    setTab(next);
    setValue("");
    setSent(false);
  };

  const ready =
    tab === "id" ? value.replace(/\D/g, "").length >= 10 : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  return (
    <div className={`min-h-full ${t.page}`}>
      <div className="container-x pt-14 pb-24">
        <p className={t.crumb}>홈 &gt; 로그인 &gt; 계정 찾기</p>

        <div className={`mt-7 ${t.column}`}>
          <nav aria-label="찾을 항목" className={t.tabBar}>
            {tabs.map((x) => (
              <button
                key={x.key}
                type="button"
                onClick={() => switchTo(x.key)}
                aria-current={tab === x.key ? "page" : undefined}
                className={`flex-1 py-3.5 text-center text-[16px] transition-colors ${
                  tab === x.key ? t.tabOn : t.tabOff
                }`}
              >
                {x.label}
              </button>
            ))}
          </nav>

          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              if (ready) setSent(true);
            }}
            className="mt-12 flex flex-col gap-5"
          >
            <p className={t.lead}>{cur.lead}</p>

            <div className="flex flex-col gap-[7px]">
              <label htmlFor="recover-field" className={t.fieldLabel}>
                {cur.field} <span className={t.required}>*</span>
              </label>
              <input
                id="recover-field"
                type={tab === "pw" ? "email" : "tel"}
                inputMode={cur.inputMode}
                autoComplete={tab === "pw" ? "email" : "tel"}
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  setSent(false);
                }}
                placeholder={cur.placeholder}
                className={t.field}
              />
            </div>

            {sent && (
              <p role="status" className={`${t.cardSoft} px-5 py-4 text-[14.5px] font-semibold`}>
                {cur.done}
              </p>
            )}

            <button type="submit" disabled={!ready} className={t.btnPrimary}>
              {cur.button}
            </button>

            <p className={`text-center text-[13.5px] leading-relaxed ${t.muted}`}>
              카카오·네이버·구글로 가입하셨다면 해당 서비스의 계정 찾기를 이용해 주세요.
            </p>

            <div className={`flex justify-center gap-4 text-[14px] ${t.muted}`}>
              <Link href="/login" className="hover:underline">
                로그인
              </Link>
              <span aria-hidden>|</span>
              <Link href="/signup/type" className="hover:underline">
                회원가입
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
