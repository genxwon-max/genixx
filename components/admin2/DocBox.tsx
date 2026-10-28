"use client";

/**
 * 지문 · 문항을 **보이는 그대로** 한 상자에 그리고, 누르면 문서 편집기(DocEditor)를 연다
 * (2026-09-22 요청).
 *
 * 한동안 지문은 블록마다 칸이, 문항은 발문 칸 · 보기 칸 넷 · 자료 칸이 따로 섰다. 한글에서 원고를
 * 쓰는 출제위원에게는 칸을 오가며 옮겨 적는 일이 되고, 다 쓴 뒤에도 「아이에게 어떻게 보이나」는
 * 미리보기를 열어야 알았다. 이제 칸은 상자 하나다 — 쓰는 곳은 문서 편집기, 상자는 적용한 결과를
 * 응시 화면의 글꼴 · 표 · 〈보기〉 그대로 보여 준다.
 *
 * 상자는 내용만큼 늘어난다. 안에 스크롤을 두지 않는다 — 긴 지문을 상자 안에서 굴리면 표와 그림이
 * 어디서 끊기는지 안 보인다. 길어진 만큼은 화면이 굴러간다.
 *
 * 잠긴 문항(검수 대기 · 승인됨)은 보기만 한다 — 눌러도 편집기가 열리지 않고 단추도 서지 않는다.
 */
export default function DocBox({
  label,
  empty,
  disabled,
  filled,
  onOpen,
  children,
}: {
  /** 화면 낭독기가 읽는 이름 — 「지문」 · 「문항」 */
  label: string;
  /** 비었을 때 상자에 서는 한 줄 */
  empty: string;
  disabled: boolean;
  /** 그릴 것이 있는가 — 없으면 empty를 세운다 */
  filled: boolean;
  onOpen: () => void;
  children: React.ReactNode;
}) {
  const open = () => {
    if (!disabled) onOpen();
  };
  return (
    <div className={`a2-docbox${disabled ? " a2-docbox-locked" : ""}`}>
      <div
        role={disabled ? undefined : "button"}
        tabIndex={disabled ? undefined : 0}
        aria-label={disabled ? undefined : `${label} — 눌러서 문서 편집기로 고칩니다`}
        className="a2-docbox-body"
        onClick={open}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            open();
          }
        }}
      >
        {/* 단추는 첫 줄 오른쪽에 띄운다(float) — 자리를 세로로 통째 비우면 아래 표 · 그림이 그만큼 좁아진다.
            상자 전체가 눌리는 자리라 단추는 눈에 띄는 입구일 뿐, 따로 열지 않는다(누르면 상자로 올라간다) */}
        {!disabled && (
          <span className="a2-btn a2-btn-sm a2-docbox-open" aria-hidden>
            문서 편집기로 열기
          </span>
        )}
        {filled ? children : <p className="a2-docbox-empty">{empty}</p>}
      </div>
    </div>
  );
}
