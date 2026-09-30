import { ageFromBirth, CONSENT_AGE } from "./account";
import { OBSERVATION_MAX, levelOf, sidoFrom, type SchoolLevel } from "./childOptions";
import { trackFromGrade } from "./examCatalog";
import {
  bulkColumnsFor,
  bulkSample,
  type BulkKey,
  type ChildProfile,
  type NewStudent,
  type Student,
} from "./roster";

/**
 * 학부모의 학생 일괄 등록 — 명단 한 줄의 모양과 그 줄을 읽는 규칙.
 *
 * 예전 일괄 등록은 붙여넣은 글을 곧바로 등록할 학생과 「N번째 줄 오류」로 갈랐다. 틀린 줄은
 * 목록에서 빠지고 이유만 남아서, 보호자는 엑셀로 돌아가 고친 뒤 통째로 다시 붙여야 했다.
 * 지금은 어디서 왔든(직접 입력 · 붙여넣기 · 파일) 모든 줄이 **같은 명단 표**에 선다. 틀린 칸은
 * 그 자리에서 빨갛게 보이고, 그 자리에서 고친다.
 *
 * 필수·선택 구분은 한 명씩 등록(ChildNew)과 같다 — 필수는 이름 · 생년월일 · 학교급 · 학년 ·
 * 아이 휴대전화(없으면 「없음」) 다섯이고, 나머지 여섯은 결과를 해석할 때만 쓰는 선택 항목이다.
 */

export type BulkRow = {
  /** 화면에서 줄을 가리키는 값 — 저장하지 않는다 */
  key: string;
  name: string;
  /** 숫자만, 8자리까지 */
  birth: string;
  level: SchoolLevel | "";
  /** 학년 숫자 — 「4」 */
  grade: string;
  /** 적은 그대로(숫자·하이픈) */
  phone: string;
  /** 아이에게 휴대전화가 없다고 골랐다 — 빈 칸과 구분한다 */
  noPhone: boolean;
  gender: string;
  /** 시·도 짧은 이름 — 「서울」 */
  region: string;
  school: string;
  interests: string[];
  learning: string[];
  observation: string;
  /** 명단 파일에서 불러온 줄 — 처음부터 확인 결과를 보여 준다 */
  imported?: boolean;
};

let seq = 0;

export function blankRow(): BulkRow {
  seq += 1;
  return {
    key: `row-${seq}`,
    name: "",
    birth: "",
    level: "",
    grade: "",
    phone: "",
    noPhone: false,
    gender: "",
    region: "",
    school: "",
    interests: [],
    learning: [],
    observation: "",
  };
}

/** 선택 항목 수 — 성별 · 거주 지역 · 학교명 · 관심 분야 · 학습 경험 · 관찰 특성 */
export const EXTRA_TOTAL = 6;

/** 선택 항목 가운데 채운 수 */
export function extraFilled(r: BulkRow) {
  return [
    r.gender,
    r.region,
    r.school.trim(),
    r.interests.length > 0,
    r.learning.length > 0,
    r.observation.trim(),
  ].filter(Boolean).length;
}

/** 아무것도 적지 않은 줄 — 등록할 때 건너뛴다. 「없음」만 눌러 둔 줄도 빈 줄이다 */
function isBlank(r: BulkRow) {
  return (
    !r.name.trim() &&
    !r.birth &&
    !r.level &&
    !r.grade &&
    !r.phone.trim() &&
    extraFilled(r) === 0
  );
}

/** 「01012345678」 → 「010-1234-5678」 */
export function dashPhone(v: string) {
  const d = v.replace(/\D/g, "");
  if (d.length === 11) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  return v;
}

/* ───────────────────────── 줄 확인 ───────────────────────── */

export type RowField = "name" | "birth" | "level" | "grade" | "phone";

export type RowCheck = {
  /** 빈 줄 — 세지도 막지도 않는다 */
  blank: boolean;
  /** 고쳐야 등록되는 칸 */
  errors: Partial<Record<RowField, string>>;
  /**
   * 그중 **틀린 값** — 적다 만 칸이 아니라 이미 틀린 것(없는 날짜 · 같은 학생 두 번)이라
   * 등록을 누르기 전에도 바로 보여 준다. 비어 있다는 말은 등록을 눌렀을 때 한꺼번에 한다.
   */
  wrong: Partial<Record<RowField, string>>;
  /** 만 나이 — 생년월일이 온전할 때만 */
  age: number | null;
  /** 막지는 않지만 알아 두어야 할 것 */
  notes: string[];
  ok: boolean;
};

/**
 * 명단 전체를 한 번에 확인한다. 같은 학생이 두 번 적혔는지는 줄 하나만 봐서는 알 수 없어서
 * 줄마다가 아니라 명단 단위로 센다.
 *
 * @param registered 이미 명부에 있는 이 보호자의 아이들 — 같은 이름 · 생년월일이면 막는다
 */
export function checkRows(rows: BulkRow[], registered: Student[]): RowCheck[] {
  const seen = new Map<string, number>();

  return rows.map((r, i) => {
    const errors: RowCheck["errors"] = {};
    const wrong: RowCheck["wrong"] = {};
    const age = r.birth.length === 8 ? ageFromBirth(r.birth) : null;

    if (isBlank(r)) return { blank: true, errors, wrong, age, notes: [], ok: false };

    const name = r.name.trim();
    if (!name) errors.name = "이름을 적어 주세요.";

    if (!r.birth) errors.birth = "생년월일을 적어 주세요.";
    else if (r.birth.length !== 8) errors.birth = "8자리로 적어 주세요. 예) 20160312";
    else if (age === null) errors.birth = wrong.birth = "날짜를 다시 확인해 주세요.";

    const lv = levelOf(r.level);
    const gradeNo = Number(r.grade);
    if (!lv) errors.level = "학교급을 골라 주세요.";
    else if (!r.grade) errors.grade = "학년을 골라 주세요.";
    else if (!lv.grades.includes(gradeNo))
      /* 학교급 이름이 모두 「학교」로 끝나 조사는 「는」 하나로 된다 */
      errors.grade = wrong.grade = `${lv.label}는 ${lv.grades.length}학년까지입니다.`;

    const digits = r.phone.replace(/\D/g, "");
    if (!r.noPhone) {
      if (!digits) errors.phone = "번호를 적거나 「없음」을 눌러 주세요.";
      else if (digits.length < 10 || digits.length > 11) {
        errors.phone = "휴대전화 번호를 확인해 주세요.";
        if (digits.length > 11 || r.imported) wrong.phone = errors.phone;
      }
    }

    /* 같은 학생 — 이름과 생년월일이 둘 다 같으면 같은 아이로 본다. 형제자매는 생일이 다르고,
       쌍둥이는 이름이 다르다 */
    if (name && age !== null) {
      const k = `${name}|${r.birth}`;
      if (registered.some((s) => s.name === name && s.birth === r.birth))
        errors.name = wrong.name = "이미 등록된 학생입니다.";
      else if (seen.has(k)) errors.name = wrong.name = `${seen.get(k)}번과 같은 학생입니다.`;
      else seen.set(k, i + 1);
    }

    const notes: string[] = [];
    if (age !== null && age >= CONSENT_AGE)
      notes.push(`만 ${age}세라 처음 접속할 때 본인 동의를 먼저 받습니다.`);
    if (lv && lv.grades.includes(gradeNo) && !trackFromGrade(`${lv.id} ${gradeNo}학년`))
      notes.push("재능 진단은 초등 3~6학년이 받습니다. 등록과 설문은 되지만 접수할 진단은 아직 없습니다.");

    return { blank: false, errors, wrong, age, notes, ok: Object.keys(errors).length === 0 };
  });
}

/** 명단 한 줄을 명부에 넣는 꼴로 */
export function toNewStudent(r: BulkRow): NewStudent {
  const profile: ChildProfile = {
    gender: r.gender || undefined,
    region: r.region || undefined,
    interests: r.interests.length ? r.interests : undefined,
    learning: r.learning.length ? r.learning : undefined,
    observation: r.observation.trim() || undefined,
  };
  return {
    name: r.name.trim(),
    birth: r.birth,
    grade: `${r.level} ${r.grade}학년`,
    phone: r.noPhone ? undefined : r.phone.replace(/\D/g, ""),
    school: r.school.trim() || undefined,
    profile: Object.values(profile).some((v) => v !== undefined) ? profile : undefined,
  };
}

/* ───────────────────────── 명단 파일 읽기 ───────────────────────── */

/**
 * 표 글을 칸으로 나눈다.
 *
 * 엑셀에서 복사해 붙이면 탭으로 갈린다 — 그때는 탭으로만 자른다. 관찰 특성 같은 글에 쉼표가
 * 들어 있어도 칸이 밀리지 않게. 파일(CSV)은 따옴표로 감싼 칸 안의 쉼표와 줄바꿈을 한 칸으로
 * 읽는다 — 엑셀이 CSV로 저장할 때 그런 칸을 따옴표로 감싼다.
 */
export function splitTable(text: string): string[][] {
  const first = text.split(/\r?\n/, 1)[0] ?? "";
  if (first.includes("\t")) {
    return text
      .split(/\r?\n/)
      .filter((l) => l.trim())
      .map((l) => l.split("\t").map((c) => c.trim()));
  }

  const out: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"' && cell.trim() === "") {
      quoted = true;
      cell = "";
    } else if (ch === "," || ch === ";") {
      row.push(cell.trim());
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i += 1;
      row.push(cell.trim());
      if (row.some((c) => c)) out.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  row.push(cell.trim());
  if (row.some((c) => c)) out.push(row);
  return out;
}

/** 「초등학교」 · 「중학교」 · 「고」 같은 적기를 초등 · 중등 · 고등으로 */
function levelWord(v: string): SchoolLevel | "" {
  if (/초/.test(v)) return "초등";
  if (/중/.test(v)) return "중등";
  if (/고/.test(v)) return "고등";
  return "";
}

const multi = (v: string) =>
  v
    .split("/")
    .map((x) => x.trim())
    .filter(Boolean);

/**
 * 붙여넣은 글이나 파일에서 명단 줄을 만든다. 틀린 줄도 버리지 않는다 — 명단 표에서 고친다.
 *
 * 첫 줄에 머리글(이름 · 생년월일 …)이 있으면 머리글 이름으로 열을 찾으므로 열 순서가 달라도
 * 된다. 없으면 양식의 열 순서대로 읽는다.
 */
export function rowsFromText(text: string): BulkRow[] {
  const cols = bulkColumnsFor(false);
  const table = splitTable(text);
  if (table.length === 0) return [];

  let index: Partial<Record<BulkKey, number>> = Object.fromEntries(cols.map((c, i) => [c.key, i]));
  const isHead = table[0].some((h) => /^(이름|성명|name)$/i.test(h));
  if (isHead) {
    index = {};
    table[0].forEach((h, i) => {
      const col = cols.find((c) => c.label === h || c.aliases?.includes(h));
      if (col && index[col.key] === undefined) index[col.key] = i;
    });
  }

  return table.slice(isHead ? 1 : 0).map((cells) => {
    const get = (k: BulkKey) => {
      const at = index[k];
      return at === undefined ? "" : (cells[at] ?? "").trim();
    };
    /* 학년 칸에 「초등 4학년」처럼 통째로 적어 둔 명단도 받는다 */
    const gradeRaw = get("grade");
    const phone = get("phone").replace(/\D/g, "");
    const gender = get("gender");
    return {
      ...blankRow(),
      name: get("name"),
      birth: get("birth").replace(/\D/g, "").slice(0, 8),
      level: levelWord(get("level")) || levelWord(gradeRaw),
      grade: gradeRaw.match(/\d+/)?.[0] ?? "",
      phone: phone ? dashPhone(phone) : "",
      /* 명단에서 비워 둔 휴대전화는 「없음」으로 읽고 표에 그렇게 보여 준다 — 보호자가
         그 자리에서 보고 번호를 적을 수 있다 */
      noPhone: !phone,
      gender: /남/.test(gender) ? "남자" : /여/.test(gender) ? "여자" : "",
      region: sidoFrom(get("region")),
      school: get("school"),
      interests: multi(get("interests")),
      learning: multi(get("learning")),
      observation: get("observation").slice(0, OBSERVATION_MAX),
      imported: true,
    };
  });
}

/**
 * 파일을 글로 읽는다.
 *
 * 한국어 엑셀이 「CSV(쉼표로 분리)」로 저장하면 UTF-8이 아니라 EUC-KR로 나온다. UTF-8로
 * 먼저 읽어 보고 깨지면 EUC-KR로 다시 읽는다 — 그대로 두면 이름이 전부 물음표로 들어온다.
 */
export async function readTableFile(file: File) {
  const buf = await file.arrayBuffer();
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buf);
  } catch {
    return new TextDecoder("euc-kr").decode(buf);
  }
}

/** 예시 명단 — 머리글 한 줄 + 두 명. 탭으로 잇는다(엑셀에 그대로 붙는다) */
export const sampleText = () => bulkSample(false);

/** 입력 양식 — 머리글과 예시 한 줄. 엑셀로 열어 채우면 된다 */
export function templateCsv() {
  const quote = (c: string) => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c);
  return sampleText()
    .split("\n")
    .slice(0, 2)
    .map((line) => line.split("\t").map(quote).join(","))
    .join("\n");
}
