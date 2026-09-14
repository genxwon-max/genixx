/**
 * 붙여 넣은 문항 글을 발문 · 보기 · 정답으로 가른다.
 *
 * 출제위원은 문항을 한글(HWP)에 발문과 ①~⑤를 이어서 쓴다. 그것을 보기 칸 다섯에 하나씩
 * 옮겨 붙이게 하면 번거롭고, 옮기다 두 보기를 한 칸에 붙이거나 순서를 바꾸는 일이 난다.
 * 그래서 쓰던 그대로 통째로 붙여 넣으면 여기서 가르고, 가른 것은 보기 줄에 그대로 세워
 * 사람이 확인한다(app/(admin2)/admin2/items/[id]/QuestionEditor.tsx).
 *
 * 저장은 여전히 보기 하나씩이다. 응시 화면이 보기를 따로 누르게 하고, 채점 · 보기마다의
 * 오답 설계 의도 · 오답지 선택률이 모두 「몇 번 보기」로 말한다.
 *
 * ── 가르는 규칙 ──
 *   · 줄 맨 앞의 ①이 보기의 시작이다. 그 앞은 전부 발문이다. 발문 안에서 「그림 ①~④」처럼
 *     문장 가운데 선 ①은 보기로 보지 않는다.
 *   · 그다음 보기는 **다음 번호**만 찾는다(② 다음은 ③). 줄 맨 앞에 서 있거나, 한 줄에 여럿을
 *     늘어놓아(「① 높다 — 낮다   ② 열다 — 닫다」) 번호 앞뒤가 띄어져 있으면 가른다.
 *     보기 글 안의 「②보다 크다」 · 발문의 「①번과 ②번 중」은 번호 뒤가 붙어 있어 가르지 않는다.
 *     그래서 「①높다 ②낮다」처럼 한 줄에 붙여 쓴 것은 가르지 못한다 — 줄을 나누어 붙이면 된다.
 *   · 「정답: ③」 · 「정답 ③」 · 「답 3번」처럼 그 줄에 정답만 적힌 줄은 정답으로 읽고 뺀다.
 *   · 보기가 둘 이상이어야 가른다. 아니면 null — 붙여 넣기를 그대로 둔다.
 *   · 보기 칸은 한 줄짜리라, 두 줄에 걸친 보기 글은 띄어쓰기 하나로 잇는다.
 *
 * 번호는 ⑥까지만 본다 — 보기 칸이 여섯까지다.
 */

const MARKS = "①②③④⑤⑥";

export type PastedItem = {
  /** 첫 보기 앞의 글. 보기만 붙여 넣었으면 빈 글자 */
  stem: string;
  choices: string[];
  /** 정답 보기 index. 정답 줄이 없었거나 보기 수를 넘으면 null */
  answer: number | null;
};

const ANSWER_LINE =
  /^[^\S\n]*[[(【]?(?:정답|답)[\])】]?[^\S\n]*[:：]?[^\S\n]*([①-⑥]|[1-6])[^\S\n]*번?[^\S\n]*$/m;

export function splitPastedItem(raw: string): PastedItem | null {
  let text = raw.replace(/\r\n?/g, "\n");

  let answer: number | null = null;
  const line = ANSWER_LINE.exec(text);
  if (line) {
    const mark = line[1];
    answer = MARKS.includes(mark) ? MARKS.indexOf(mark) : Number(mark) - 1;
    text = text.slice(0, line.index) + text.slice(line.index + line[0].length);
  }

  const head = /(^|\n)[^\S\n]*①/.exec(text);
  if (!head) return null;
  const first = head.index + head[0].length - 1;
  const stem = text.slice(0, first).trim();

  const choices: string[] = [];
  let rest = text.slice(first + 1);
  for (let k = 1; k < MARKS.length; k += 1) {
    /* 줄 맨 앞의 번호, 또는 줄 가운데서 앞뒤가 띄어진 번호 — 둘 중 먼저 선 것 */
    const atLine = new RegExp(`\\n[^\\S\\n]*${MARKS[k]}`).exec(rest);
    const inLine = new RegExp(`\\s${MARKS[k]}(?=\\s)`).exec(rest);
    const next =
      atLine && inLine ? (atLine.index <= inLine.index ? atLine : inLine) : (atLine ?? inLine);
    if (!next) break;
    const at = next.index + next[0].length - 1;
    choices.push(rest.slice(0, at));
    rest = rest.slice(at + 1);
  }
  choices.push(rest);
  if (choices.length < 2) return null;

  const cleaned = choices.map((c) => c.replace(/\s+/g, " ").trim());
  return {
    stem,
    choices: cleaned,
    answer: answer !== null && answer < cleaned.length ? answer : null,
  };
}
