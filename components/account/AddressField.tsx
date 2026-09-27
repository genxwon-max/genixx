"use client";

import { useEffect, useRef, useState } from "react";
import { field as input, labelText as fieldLabel } from "./ui";

/**
 * 주소 입력 — 우편번호 찾기 창을 띄우고, 고른 주소를 칸에 채운다.
 *
 * 주소를 직접 치게 두지 않는다. 「서울시 강남구」·「서울 강남」·「서울특별시 강남구」가
 * 모두 같은 곳인데 글자가 달라, 나중에 지역별로 세거나 묶을 수가 없다. 우편번호 서비스가
 * 돌려주는 값은 한 가지 꼴이라 그 걱정이 없고, 보호자도 동 이름만 치면 끝난다.
 *
 * 창은 브라우저 창(window.open)이 아니라 화면 위에 띄우는 판이다. 팝업 차단에 걸리지 않고,
 * 아이폰 사파리에서도 같은 자리에서 열린다.
 *
 * ⚠ 다음(카카오) 우편번호 서비스를 외부에서 불러온다(t1.daum.net). 키가 필요 없고 국내
 *   서비스가 거의 다 이것을 쓰지만, **바깥 스크립트**라는 사실은 남는다 — 이 화면을 연
 *   사람의 브라우저가 다음에 한 번 붙는다. 불러오지 못하면(사내망·오프라인) 창이 「직접
 *   적어 주세요」로 바뀌고 칸이 열린다. 주소 하나 때문에 등록이 막히면 안 된다.
 */

type PostcodeData = {
  zonecode: string;
  roadAddress: string;
  jibunAddress: string;
  autoRoadAddress?: string;
  autoJibunAddress?: string;
  userSelectedType: "R" | "J";
  sido: string;
  sigungu: string;
  buildingName?: string;
  apartment?: "Y" | "N";
};

declare global {
  interface Window {
    daum?: {
      Postcode: new (options: {
        oncomplete: (data: PostcodeData) => void;
        onclose?: (state: string) => void;
        onresize?: (size: { width: number; height: number }) => void;
        width?: string | number;
        height?: string | number;
      }) => { embed: (el: HTMLElement, opts?: { autoClose?: boolean }) => void };
    };
  }
}

const SRC = "https://t1.daum.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";

/** 한 번만 불러오고, 여러 칸이 같은 약속을 나눠 쓴다 */
let pending: Promise<void> | null = null;

function loadPostcode(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.daum?.Postcode) return Promise.resolve();
  if (!pending) {
    pending = new Promise<void>((resolve, reject) => {
      const el = document.createElement("script");
      el.src = SRC;
      el.async = true;
      el.onload = () => resolve();
      el.onerror = () => {
        pending = null;
        reject(new Error("postcode script failed"));
      };
      document.head.appendChild(el);
    });
  }
  return pending;
}

export type AddressValue = {
  /** 우편번호 5자리 */
  zonecode: string;
  /** 도로명(또는 지번) 주소 */
  address: string;
  /** 동·호수처럼 보호자가 직접 적는 나머지 */
  detail: string;
  /** 시·도 — 주소에서 딴다. 지역별로 묶어 볼 때 쓴다 */
  sido: string;
  /** 시·군·구 */
  sigungu: string;
};

export const emptyAddress: AddressValue = {
  zonecode: "",
  address: "",
  detail: "",
  sido: "",
  sigungu: "",
};

/**
 * 시·도 — 창에서 고르면 그 값(「서울」), 직접 적었으면 첫 마디를 쓴다.
 *
 * 직접 적는 길은 창을 못 열었을 때만 열리는데, 그때도 지역별로 세는 칸은 채워 두어야
 * 한다. 첫 마디가 시·도가 아닌 주소를 적는 사람도 있겠지만, 비워 두는 것보다 낫다.
 */
export function sidoOf(a: AddressValue) {
  return a.sido || a.address.trim().split(/\s+/)[0] || "";
}

/** 한 줄로 적은 주소 — 명부·상세 화면이 읽는 꼴 */
export function addressText(a: AddressValue | undefined) {
  if (!a?.address) return "";
  return [a.address, a.detail].filter(Boolean).join(" ");
}

const btn =
  "inline-flex h-[3.25rem] shrink-0 items-center justify-center rounded-[12px] border border-soft-line bg-white px-5 text-[14px] font-semibold text-soft-ink transition-colors hover:bg-slate-50";

export default function AddressField({
  id,
  label = "거주지 주소",
  hint,
  value,
  onChange,
}: {
  id: string;
  label?: string;
  hint?: string;
  value: AddressValue;
  onChange: (v: AddressValue) => void;
}) {
  const [open, setOpen] = useState(false);
  /** 스크립트를 못 불러왔다 — 직접 치는 길을 연다 */
  const [manual, setManual] = useState(false);
  const detailRef = useRef<HTMLInputElement>(null);

  const picked = value.address !== "";

  return (
    <div>
      <p id={id} className={fieldLabel}>
        {label}
      </p>

      <div className="mt-2 grid gap-2">
        <div className="flex gap-2">
          <input
            aria-label="우편번호"
            value={value.zonecode}
            readOnly={!manual}
            onChange={(e) => onChange({ ...value, zonecode: e.target.value })}
            placeholder="우편번호"
            /* 폭은 덧붙이지 않고 바꿔 끼운다 — 같은 속성의 클래스가 둘 다 있으면
               어느 쪽이 이기는지는 CSS가 생성된 순서에 달려 있다(ChildNew의 inputBad와 같은 규칙) */
            className={`${input.replace("w-full", "w-[7.5rem]")} shrink-0 ${manual ? "" : "bg-slate-50"}`}
          />
          <button type="button" onClick={() => setOpen(true)} className={btn}>
            주소 찾기
          </button>
          {picked && (
            <button
              type="button"
              onClick={() => {
                onChange(emptyAddress);
                setManual(false);
              }}
              className={`${btn} text-soft-muted`}
            >
              지우기
            </button>
          )}
        </div>

        <input
          aria-label={label}
          value={value.address}
          readOnly={!manual}
          onChange={(e) => onChange({ ...value, address: e.target.value })}
          placeholder={manual ? "주소를 적어 주세요" : "주소 찾기를 눌러 주세요"}
          className={`${input} ${manual ? "" : "bg-slate-50"}`}
        />

        {/* 상세주소는 늘 직접 친다 — 동·호수는 우편번호 서비스가 알 수 없다 */}
        <input
          ref={detailRef}
          aria-label="상세주소"
          value={value.detail}
          onChange={(e) => onChange({ ...value, detail: e.target.value })}
          placeholder="상세주소 (동·호수)"
          className={input}
        />
      </div>

      {hint && <p className="mt-1.5 text-[12px] text-soft-muted">{hint}</p>}

      {open && (
        <PostcodeDialog
          onClose={() => setOpen(false)}
          onManual={() => {
            setManual(true);
            setOpen(false);
          }}
          onPick={(d) => {
            const road = d.userSelectedType === "R" ? d.roadAddress : d.jibunAddress;
            onChange({
              zonecode: d.zonecode,
              address: road,
              detail: value.detail,
              sido: d.sido,
              sigungu: d.sigungu,
            });
            setOpen(false);
            /* 고르고 나면 다음에 칠 곳은 동·호수다. 거기로 커서를 옮겨 준다 */
            setTimeout(() => detailRef.current?.focus(), 0);
          }}
        />
      )}
    </div>
  );
}

/** 우편번호 찾기 판 */
function PostcodeDialog({
  onPick,
  onClose,
  onManual,
}: {
  onPick: (d: PostcodeData) => void;
  onClose: () => void;
  onManual: () => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  /* oncomplete는 스크립트 안에서 불리므로, 최신 콜백을 담아 두고 그것을 부른다 */
  const pick = useRef(onPick);
  useEffect(() => {
    pick.current = onPick;
  }, [onPick]);

  useEffect(() => {
    let alive = true;
    loadPostcode()
      .then(() => {
        if (!alive || !box.current || !window.daum) return;
        new window.daum.Postcode({
          oncomplete: (d) => pick.current(d),
          width: "100%",
          height: "100%",
        }).embed(box.current, { autoClose: false });
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  /* 바깥을 누르거나 Esc를 눌러 닫는다 */
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 py-6"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="주소 찾기"
        className="flex max-h-full w-full max-w-[32rem] flex-col overflow-hidden rounded-[14px] bg-white shadow-[0_20px_60px_rgba(15,23,42,0.25)]"
      >
        <div className="flex items-center justify-between border-b border-soft-line px-5 py-4">
          <p className="text-[15px] font-bold text-soft-ink">주소 찾기</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="text-[18px] leading-none text-soft-muted transition-colors hover:text-soft-ink"
          >
            ✕
          </button>
        </div>

        {failed ? (
          <div className="px-6 py-10 text-center">
            <p className="text-[14px] font-bold text-soft-ink">주소 찾기를 열지 못했습니다</p>
            <p className="mx-auto mt-2 max-w-xs text-[13px] leading-[1.75] text-soft-muted">
              인터넷 연결이 끊겼거나 사내망에서 막혀 있을 수 있습니다. 직접 적으셔도 됩니다.
            </p>
            <button
              type="button"
              onClick={onManual}
              className="mt-5 inline-flex h-[3rem] items-center justify-center rounded-full bg-soft-primary px-6 text-[14px] font-semibold text-white transition-colors hover:bg-soft-primary-dark"
            >
              직접 적기
            </button>
          </div>
        ) : (
          /* 우편번호 서비스가 이 칸을 채운다 */
          <div ref={box} className="h-[30rem] w-full" />
        )}
      </div>
    </div>
  );
}
