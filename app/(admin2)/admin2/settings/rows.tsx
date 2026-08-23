import type { ReactNode } from "react";

/**
 * 설정 한 줄 — 이름 : 값 : 출처.
 *
 * 값의 오른쪽 끝에 그 값이 사는 파일 경로를 붙인다. 설정 화면 앞에서 가장 자주
 * 나오는 물음이 「이 숫자는 어디서 오나」이고, 이 콘솔은 아직 읽기 전용이라 화면에서
 * 고칠 수가 없다. 답이 화면에 없으면 사람은 저장소를 처음부터 뒤지게 된다.
 *
 * 경로를 값 아래 줄이 아니라 같은 줄 오른쪽 끝에 세운 까닭 — 세로로 훑을 때 왼쪽은
 * 값만, 오른쪽은 경로만 읽힌다. 아래에 깔면 줄 수가 두 배가 되고 그만큼 판이 길어진다.
 * 그래서 경로 쪽은 줄을 바꾸지 않고(shrink-0), 값이 길면 값만 제 자리에서 접힌다 —
 * 경로가 값 밑으로 흘러내리면 오른쪽 끝의 세로줄이 끊겨 훑는 눈이 매번 되돌아온다.
 *
 * page.tsx(서버)와 QualityPanel.tsx(클라이언트) 양쪽이 같은 줄 모양을 써야 해서
 * 지시자 없는 파일로 따로 뺐다 — 한쪽에 두면 다른 쪽이 경계를 넘어 가져오게 된다.
 */
export function row(k: string, v: ReactNode, src: string) {
  return {
    k,
    v: (
      <span className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 flex-1">{v}</span>
        <span className="a2-mono a2-t-xs shrink-0 text-(--a2-ink-4)">{src}</span>
      </span>
    ),
  };
}
