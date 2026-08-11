/**
 * Figma 반입용 산출물 만들기.
 *
 * Figma는 파일 내용을 쓰는 공개 API가 없어서(플러그인 안에서만 노드를 만들 수 있다)
 * 코드에서 곧바로 밀어 넣을 수 없다. 대신 Figma가 받아들이는 두 가지를 뽑는다.
 *
 *  1) 화면별 단독 실행 HTML — CSS를 인라인해 파일 하나로 만든다.
 *     html.to.design 같은 플러그인에 그대로 올리면 레이어로 들어간다.
 *  2) 디자인 토큰 JSON — Tokens Studio 형식. 색·타이포·라운드를 변수로 가져간다.
 *
 * 개발 서버(next dev)가 켜져 있어야 한다. `node scripts/export-design.mjs`
 */

import fs from "node:fs/promises";
import path from "node:path";

const ORIGIN = process.env.ORIGIN ?? "http://localhost:3000";
const OUT = path.resolve("design-export");

/** 뽑아낼 화면 */
const SCREENS = [
  /* 시안 1 · 전문가 */
  { file: "v1-01-login", route: "/login1", title: "로그인 · 시안1" },
  { file: "v1-02-login-email", route: "/login1?view=email", title: "로그인 이메일 · 시안1" },
  { file: "v1-03-signup-type", route: "/signup1", title: "회원가입 개인·기관 · 시안1" },
  {
    file: "v1-05-signup-method",
    route: "/signup1?stage=method&type=parent",
    title: "회원가입 수단 · 시안1",
  },
  /* 시안 2 · 둥글둥글 */
  { file: "v2-01-login", route: "/login2", title: "로그인 · 시안2" },
  { file: "v2-02-login-email", route: "/login2?view=email", title: "로그인 이메일 · 시안2" },
  { file: "v2-03-signup-type", route: "/signup2", title: "회원가입 개인·기관 · 시안2" },
  {
    file: "v2-05-signup-method",
    route: "/signup2?stage=method&type=parent",
    title: "회원가입 수단 · 시안2",
  },
  /* 마이페이지 — 첫 화면(회원정보)만 뽑힌다. 나머지 섹션은 눌러야 나오므로
     플러그인 URL 모드로 직접 가져오는 편이 낫다. */
  { file: "v1-06-mypage", route: "/mypage1", title: "마이페이지 · 시안1" },
  { file: "v2-06-mypage", route: "/mypage2", title: "마이페이지 · 시안2" },
];

async function get(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.text();
}

/** 문서에서 <body> 안쪽만 꺼낸다 */
function bodyOf(html) {
  const m = /<body[^>]*>([\s\S]*)<\/body>/i.exec(html);
  return m ? m[1] : html;
}

/** <body> 태그의 class 속성 (폰트 클래스가 붙어 있다) */
function bodyClass(html) {
  const m = /<body[^>]*class="([^"]*)"/i.exec(html);
  return m ? m[1] : "";
}

/** 문서 안의 <style> 블록을 전부 모은다 */
function inlineStyles(html) {
  return [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join("\n");
}

/** 스타일시트 링크를 모아 실제 CSS를 가져온다 */
async function cssOf(html) {
  const hrefs = [...html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/gi)].map(
    (m) => m[1],
  );
  const parts = [];
  for (const href of hrefs) {
    const url = href.startsWith("http") ? href : `${ORIGIN}${href}`;
    parts.push(await get(url));
  }
  return parts.join("\n");
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });

  for (const s of SCREENS) {
    const html = await get(`${ORIGIN}${s.route}`);
    const css = await cssOf(html);
    // 폰트·이미지가 상대 경로라 절대 경로로 바꿔 둔다 (서버가 켜져 있는 동안 유효)
    const cssAbs = css.replace(/url\((["']?)\/_next\//g, `url($1${ORIGIN}/_next/`);

    const doc = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${s.title}</title>
<style>
${cssAbs}
${inlineStyles(html)}
</style>
</head>
<body class="${bodyClass(html)}">
${bodyOf(html).replace(/<script[\s\S]*?<\/script>/gi, "")}
</body>
</html>
`;
    const file = path.join(OUT, `${s.file}.html`);
    await fs.writeFile(file, doc, "utf8");
    console.log(`${s.file}.html  ${(doc.length / 1024).toFixed(0)}KB  ← ${s.route}`);
  }

  /* ── 디자인 토큰 (Tokens Studio 형식) ── */
  const tokens = {
    global: {
      "시안1-전문가": {
        primary: { value: "#0b4d8f", type: "color" },
        primaryDark: { value: "#083a6c", type: "color" },
        primarySoft: { value: "#f2f7fc", type: "color" },
        primaryLine: { value: "#cfe0ee", type: "color" },
        ink: { value: "#1b2733", type: "color" },
        body: { value: "#41525f", type: "color" },
        muted: { value: "#5f7183", type: "color" },
        dim: { value: "#7a8b9c", type: "color" },
        placeholder: { value: "#a8b4c0", type: "color" },
        line: { value: "#d5dfe9", type: "color" },
        field: { value: "#c8d4de", type: "color" },
        divider: { value: "#e3eaf1", type: "color" },
        hairline: { value: "#eef3f8", type: "color" },
        pageBg: { value: "#e9eef4", type: "color" },
        panel: { value: "#f8fafc", type: "color" },
        bar: { value: "#f4f7fa", type: "color" },
        required: { value: "#c8382c", type: "color" },
        radiusControl: { value: "4", type: "borderRadius" },
        radiusCard: { value: "0", type: "borderRadius" },
        btnHeight: { value: "54", type: "sizing" },
        fieldHeight: { value: "52", type: "sizing" },
      },
      "시안2-둥글둥글": {
        primary: { value: "#365eef", type: "color" },
        primaryDark: { value: "#2a4bc4", type: "color" },
        primarySoft: { value: "#eaf3ff", type: "color" },
        ink: { value: "#18181b", type: "color" },
        muted: { value: "#6b7280", type: "color" },
        line: { value: "#d9d9d9", type: "color" },
        pageBg: { value: "#eef3fe", type: "color" },
        required: { value: "#e5484d", type: "color" },
        radiusControl: { value: "12", type: "borderRadius" },
        radiusCard: { value: "14", type: "borderRadius" },
        radiusPill: { value: "9999", type: "borderRadius" },
        btnHeight: { value: "52", type: "sizing" },
        fieldHeight: { value: "52", type: "sizing" },
      },
      브랜드: {
        kakao: { value: "#FEE500", type: "color" },
        kakaoInk: { value: "#191600", type: "color" },
        naver: { value: "#03C75A", type: "color" },
      },
      타이포: {
        h1: { value: { fontSize: "26", fontWeight: "700", lineHeight: "1.3" }, type: "typography" },
        h2: { value: { fontSize: "21", fontWeight: "800", lineHeight: "1.4" }, type: "typography" },
        cardTitle: {
          value: { fontSize: "17", fontWeight: "700", lineHeight: "1.4" },
          type: "typography",
        },
        button: {
          value: { fontSize: "16", fontWeight: "700", lineHeight: "1.2" },
          type: "typography",
        },
        label: {
          value: { fontSize: "14", fontWeight: "600", lineHeight: "1.5" },
          type: "typography",
        },
        body: { value: { fontSize: "14", fontWeight: "400", lineHeight: "1.7" }, type: "typography" },
        caption: {
          value: { fontSize: "13", fontWeight: "400", lineHeight: "1.6" },
          type: "typography",
        },
      },
    },
  };

  await fs.writeFile(
    path.join(OUT, "design-tokens.json"),
    JSON.stringify(tokens, null, 2),
    "utf8",
  );
  console.log("design-tokens.json");
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
