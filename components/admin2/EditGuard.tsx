"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * 고치는 칸의 공통 장치 — 초안 · 저장 줄 · 나가기 확인.
 *
 * 이 콘솔의 상세 화면들은 한동안 **글자를 칠 때마다 저장**했다. 저장 단추가 없으니
 * 저장을 잊을 일도 없다는 것이 그때의 이유였는데, 실제로 써 보면 대가가 더 컸다 —
 *
 *  · 되돌릴 수가 없다. 계약 상태를 잘못 골라 「만료」로 두는 순간 그 기관의 응시가
 *    막히고, 되돌리려면 원래 값이 무엇이었는지 기억해 내야 한다.
 *  · 반쯤 친 값이 저장된다. 담당자 이름을 「박」까지 쳤을 때 이미 저장된 상태라,
 *    같은 시각 다른 화면이 그 기관을 「박」이 맡고 있다고 말한다.
 *  · 고친 티가 안 난다. 무엇을 만졌는지 화면이 알려 주지 않으니 확인할 방법이 없다.
 *
 * 그래서 **저장은 누를 때만** 한다. 대신 저장을 잊는 문제는 나가는 길목에서 막는다 —
 * 손댄 채로 다른 화면으로 가려 하면 붙잡고 물어본다.
 *
 * 붙잡는 자리는 셋이다 — ① 화면 안의 링크(목록으로·기둥 메뉴·이름표) ② 창 닫기·새로고침
 * ③ 브라우저 뒤로가기.
 *
 * ── 뒤로가기를 잡는 법 ──
 * 뒤로가기는 눌린 뒤에야 알 수 있다. popstate가 올 때는 이미 앞 화면으로 넘어간 뒤라
 * 그 자리에서 막을 방법이 없다. 그래서 **손대는 순간 같은 주소를 히스토리에 한 칸 더
 * 깔아 둔다.** 뒤로가기를 누르면 그 칸으로 떨어지므로 화면이 바뀌지 않고, 우리는 다시
 * 한 칸을 깔면서 물어본다. 깐 칸과 판 칸이 1:1이라 **깔린 칸은 언제나 하나뿐이다.**
 *
 * 그 하나를 반드시 도로 걷어야 한다. 남겨 두면 저장한 뒤 뒤로가기를 두 번 눌러야 나가는
 * 화면이 된다 —
 *   · 저장·취소로 손댄 것이 없어지면  history.back()으로 깐 칸을 걷는다(주소가 같아 화면은 그대로).
 *   · 뒤로가기로 붙잡혔다가 나가면    history.go(-2)로 깐 칸과 지금 화면을 함께 지나간다.
 *   · 링크로 붙잡혔다가 나가면        replace로 깐 칸을 목적지가 덮어쓴다.
 *
 * ⚠ pushState는 Next 라우터가 쓰는 history.state를 갈아엎지 않도록 **기존 state 위에**
 *   표식만 얹는다. 통째로 덮으면 뒤로가기가 라우터의 자리 기억을 잃는다.
 */

/** 얕은 값은 그대로, 객체(회차 공지처럼)는 펴서 견준다 */
function same(a: unknown, b: unknown) {
  if (a === b) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * 저장된 값에서 초안을 뜬다.
 *
 * `saved`는 화면이 그릴 때마다 새로 만들어지는 객체여도 된다 — 값끼리 견주지 객체
 * 신원으로 견주지 않는다. 저장이 끝나면 `saved`가 초안을 따라잡으므로 dirty가 저절로
 * 내려간다. 바깥에서 값이 바뀌어도 초안은 따라가지 않는다 — 치고 있는 글자를 남의
 * 저장이 밀어내면 안 되기 때문이다.
 */
export function useEditDraft<T extends Record<string, unknown>>(saved: T) {
  const [value, setValue] = useState<T>(saved);

  const dirty = (Object.keys(saved) as (keyof T)[]).some((k) => !same(value[k], saved[k]));

  return {
    value,
    dirty,
    set: <K extends keyof T>(k: K, v: T[K]) => setValue((d) => ({ ...d, [k]: v })),
    /** 여러 칸을 한 번에 (문항처럼 한 동작이 여러 값을 건드릴 때) */
    patch: (p: Partial<T>) => setValue((d) => ({ ...d, ...p })),
    reset: () => setValue(saved),
  };
}

export type LeaveGuard = {
  /** 붙잡아 둔 이동이 있는가 */
  pending: boolean;
  /**
   * 어떤 이동을 붙잡았는가 — 물음의 말을 고르는 데만 쓴다.
   *
   * 「나가기」와 「옮기기」는 사람에게 다른 일이다. 과목 탭을 옮기려다 붙잡혔는데
   * 「이 화면을 떠나면」이라고 물으면, 화면째 닫히는 줄 알고 계속 편집을 누른다.
   */
  kind: "link" | "back" | "run" | null;
  stay: () => void;
  discard: () => void;
  saveAndGo: () => void;
  /**
   * 주소가 바뀌지 않는 이동을 물어보고 보낸다 — 과목 탭을 옮기거나 편성판의 다른 칸을
   * 여는 것처럼, 화면은 그대로인데 고치던 판만 갈리는 자리다.
   *
   * 링크·뒤로가기는 저절로 붙잡히지만 이런 이동은 단추 하나라 잡을 것이 없다. 부르는
   * 쪽에서 「가려는 일」을 통째로 넘기면, 손댄 것이 없을 때는 바로 하고 있을 때는
   * 같은 물음을 띄운다.
   */
  ask: (run: () => void) => void;
};

/** 어디로 가려다 붙잡혔는가 */
type Pending =
  | { kind: "link"; href: string }
  | { kind: "back" }
  /** 주소는 그대로 두고 이 일만 하려던 참 */
  | { kind: "run"; run: () => void }
  | null;

/** Next 라우터의 state를 그대로 두고 표식만 얹는다 */
function markState() {
  const state = (history.state ?? {}) as Record<string, unknown>;
  history.pushState({ ...state, a2guard: true }, "", location.href);
}

/**
 * 손댄 채로 나가려는 것을 붙잡는다.
 *
 * `save`가 **false를 돌려주면 저장이 안 된 것으로 본다** — 그때는 보내지 않는다.
 * 「저장하고 나가기」를 눌렀는데 값이 어긋나 저장이 걸러졌고 화면은 떠나 버리면, 사람이
 * 저장했다고 믿는 순간에 고친 것이 통째로 사라진다.
 *
 * `discard`는 **주소가 바뀌지 않는 이동(ask)** 에서만 쓴다. 화면을 떠나는 길은 조각이
 * 통째로 사라지므로 초안도 함께 사라지지만, 판만 갈리는 이동은 조각이 그대로 살아 있어
 * 버린 줄 알았던 값이 다음 저장에 딸려 나간다.
 */
export function useUnsavedGuard(
  dirty: boolean,
  save: () => void | boolean,
  discard?: () => void,
): LeaveGuard {
  const router = useRouter();
  const [pending, setPending] = useState<Pending>(null);
  /** 히스토리에 깔아 둔 칸이 있는가 — 언제나 0개 아니면 1개다 */
  const laid = useRef(false);
  /** 지금 나가는 중인가. 나가는 길은 제 손으로 히스토리를 치우므로 자동 회수를 건너뛴다 */
  const leaving = useRef(false);

  /* ① 창 닫기·새로고침 — 브라우저가 제 문구로 묻는다 */
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  /* ② 화면 안의 링크 — 누른 것을 잡아 두고 물어본 뒤에 보낸다.
     캡처 단계에서 잡는 까닭은 Next의 Link가 제 클릭 처리를 먼저 하기 때문이다. */
  useEffect(() => {
    if (!dirty) return;

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; // 새 탭으로 여는 것은 그냥 둔다

      const a = (e.target as HTMLElement | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;

      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;

      const here = location.pathname + location.search;
      const there = url.pathname + url.search;
      if (there === here) return; // 같은 화면 안의 앵커

      e.preventDefault();
      e.stopPropagation();
      setPending({ kind: "link", href: there + url.hash });
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [dirty]);

  /* ③ 브라우저 뒤로가기 — 떨어질 자리를 미리 깔아 두고 그 위에서 붙잡는다 */
  useEffect(() => {
    if (!dirty) {
      // 손댄 것이 없어졌다 — 깔아 둔 칸을 걷는다. 주소가 같아 화면은 그대로다
      if (laid.current && !leaving.current) {
        laid.current = false;
        history.back();
      }
      return;
    }

    if (!laid.current) {
      markState();
      laid.current = true;
    }

    const onPop = () => {
      // 방금 한 칸을 잃었다. 같은 자리에 다시 깔아 두고 물어본다 (깔린 칸은 늘 하나)
      markState();
      setPending({ kind: "back" });
    };

    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [dirty]);

  /* ④ 손댄 채로 이 조각이 화면에서 사라질 때 — 주소는 그대로인데 고치던 판만 갈리는
     자리(과목 탭)다. 깔아 둔 칸을 걷어 두지 않으면 그 뒤로 뒤로가기가 한 번 헛돈다.
     주소가 같으므로 이 back()으로는 화면이 바뀌지 않는다. 나가는 길(depart)은 제 손으로
     히스토리를 치우므로 leaving 표식을 보고 건너뛴다. */
  useEffect(
    () => () => {
      if (laid.current && !leaving.current) history.back();
    },
    [],
  );

  const depart = (p: Exclude<Pending, null>) => {
    setPending(null);
    if (p.kind === "run") {
      /* 주소는 그대로다. 깔아 둔 칸은 손댄 것이 없어지면 ③이, 판이 갈려 사라지면
         ④가 걷는다 — 여기서 히스토리를 건드리지 않는다 */
      p.run();
      return;
    }
    leaving.current = true;
    laid.current = false;
    if (p.kind === "back") {
      // 깔아 둔 칸 + 지금 화면 = 두 칸을 지나가야 원래 뒤로 갈 곳에 닿는다
      history.go(-2);
    } else {
      // 깔아 둔 칸을 목적지가 덮어쓴다 — 그 칸이 없었던 것처럼 남는다
      router.replace(p.href);
    }
  };

  return {
    pending: pending !== null,
    kind: pending?.kind ?? null,
    stay: () => setPending(null),
    discard: () => {
      if (!pending) return;
      /* 판만 갈리는 이동은 조각이 살아남는다 — 버리기로 했으면 초안도 여기서 버려야
         한다. 그러지 않으면 「저장하지 않고 옮기기」로 두고 온 값이 다음 저장에 딸려 나간다 */
      if (pending.kind === "run") discard?.();
      depart(pending);
    },
    saveAndGo: () => {
      /* 저장이 걸러졌으면 보내지 않는다. 물음만 닫고 화면에 남겨, 무엇이 걸렸는지를
         그 자리에서 보게 한다 */
      if (save() === false) return setPending(null);
      if (pending) depart(pending);
    },
    ask: (run: () => void) => {
      if (!dirty) return run();
      setPending({ kind: "run", run });
    },
  };
}

/**
 * 상세 화면의 고치는 칸 하나 — 이름표 + 입력.
 *
 * 칸 밑에 설명을 달지 않는다. 「이사·전근으로 실제로 바뀌는 칸입니다」처럼 왜 그 칸이
 * 있는지 적어 두면 열 칸짜리 화면이 스무 줄이 되고, 정작 고치러 온 사람은 그 줄을
 * 읽지 않는다. 칸 이름이 제 일을 못 하면 설명이 아니라 이름을 고쳐야 한다.
 */
export function Field({
  label,
  value,
  onChange,
  type = "text",
  disabled = false,
  readOnly = false,
  mono = false,
}: {
  label: string;
  value: string | number;
  onChange?: (v: string) => void;
  type?: "text" | "email" | "tel" | "date" | "number";
  disabled?: boolean;
  /** 고칠 수 없는 칸 — 식별자·시스템 기록처럼 사람이 손대지 않는 값 */
  readOnly?: boolean;
  mono?: boolean;
}) {
  return (
    <label className="a2-field block">
      <span className="a2-label">{label}</span>
      <input
        type={type}
        className={`a2-input ${mono ? "a2-mono" : ""}`}
        value={value}
        disabled={disabled || readOnly}
        readOnly={readOnly}
        onChange={(e) => onChange?.(e.target.value)}
      />
    </label>
  );
}

/** 판 아래에 붙는 저장 줄. 손대기 전에는 둘 다 눌리지 않는다 */
export function SaveBar({
  dirty,
  onSave,
  onCancel,
  disabled = false,
  note,
}: {
  dirty: boolean;
  onSave: () => void;
  onCancel: () => void;
  /** 잠긴 화면(마감된 회차·승인된 문항)에서는 저장 자체를 막는다 */
  disabled?: boolean;
  note?: React.ReactNode;
}) {
  return (
    <div className="mt-3 flex flex-wrap items-center justify-end gap-1.5 border-t border-(--a2-line) pt-3">
      <span className="mr-auto a2-t-xs text-(--a2-ink-4)">
        {note ?? (dirty ? "저장하지 않은 변경이 있습니다." : "")}
      </span>
      <button type="button" className="a2-btn" disabled={!dirty} onClick={onCancel}>
        취소
      </button>
      <button
        type="button"
        className="a2-btn a2-btn-primary"
        disabled={!dirty || disabled}
        onClick={onSave}
      >
        저장
      </button>
    </div>
  );
}

/**
 * 화면 아래에 붙어 따라다니는 저장 줄.
 *
 * 판 안에 두면 「이 판만 저장하는 것」으로 읽히고, 칸이 길어지면 저장이 화면 밖으로
 * 밀려난다. 상세 화면은 고칠 칸이 여럿이고 세로로 기니까 **화면 오른쪽 아래에 고정해
 * 두고 따라다니게** 한다 — 어느 칸을 고치고 있든 저장은 늘 같은 자리에 있다.
 */
export function PageSaveBar({
  dirty,
  onSave,
  onCancel,
  disabled = false,
  note,
}: {
  dirty: boolean;
  onSave: () => void;
  onCancel: () => void;
  disabled?: boolean;
  note?: React.ReactNode;
}) {
  return (
    <div className="sticky bottom-0 z-30 -mx-3 mt-3 border-t border-(--a2-line) bg-(--a2-panel)/95 px-3 py-2.5 backdrop-blur">
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        <span className="mr-auto a2-t-xs text-(--a2-ink-4)">
          {note ?? (dirty ? "저장하지 않은 변경이 있습니다." : "")}
        </span>
        <button type="button" className="a2-btn" disabled={!dirty} onClick={onCancel}>
          취소
        </button>
        <button
          type="button"
          className="a2-btn a2-btn-primary"
          disabled={!dirty || disabled}
          onClick={onSave}
        >
          저장
        </button>
      </div>
    </div>
  );
}

/** 나가려는 것을 붙잡았을 때 뜨는 물음 */
export function LeaveDialog({ guard }: { guard: LeaveGuard }) {
  useEffect(() => {
    if (!guard.pending) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") guard.stay();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [guard]);

  if (!guard.pending) return null;

  /* 주소가 바뀌는 이동은 「나가기」, 판만 갈리는 이동은 「옮기기」로 묻는다 */
  const away = guard.kind === "run" ? "옮기기" : "나가기";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4"
      onClick={guard.stay}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="a2-leave-title"
        className="a2-panel w-full max-w-[24rem] p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="a2-leave-title" className="a2-h">
          저장하지 않은 변경이 있습니다
        </h2>
        <p className="mt-2 a2-t-sm leading-[1.6] text-(--a2-ink-2)">
          {guard.kind === "run"
            ? "다른 것을 열면 고친 내용이 사라집니다. 저장하고 옮길까요?"
            : "이 화면을 떠나면 고친 내용이 사라집니다. 저장하고 나갈까요?"}
        </p>
        <div className="mt-4 flex flex-wrap justify-end gap-1.5">
          <button type="button" className="a2-btn" onClick={guard.stay}>
            계속 편집
          </button>
          <button type="button" className="a2-btn" onClick={guard.discard}>
            저장하지 않고 {away}
          </button>
          <button type="button" className="a2-btn a2-btn-primary" onClick={guard.saveAndGo}>
            저장하고 {away}
          </button>
        </div>
      </div>
    </div>
  );
}
