# /design4 홈 시안 — 그림 프롬프트

그림 8장. 만들어서 **`public/design4/`에 아래 파일 이름 그대로** 넣으면 코드 수정 없이 자리에 들어갑니다.
파일이 없으면 그 자리에 점선 상자와 파일 이름이 보입니다.

## 공통 규칙 (모든 프롬프트 앞에 붙임)

```
3D clay-style illustration, soft rounded shapes, matte plastic texture, gentle studio lighting,
soft shadow under object, pastel highlights, clean and friendly Korean public-education portal style,
single object centered, isolated on fully transparent background, no text, no letters, no logo,
no robots, no sparkles, no stars, no glow, no circuit or neural patterns,
PNG with alpha, square 1:1, 1024x1024
```

- 배경은 **반드시 투명**(PNG). 카드 색이 그림 뒤로 보여야 합니다.
- 글자 · 숫자 · 로고가 그림 안에 들어가지 않게 합니다(한글이 깨져 나옵니다).
- 사람은 얼굴 없이 손만, 혹은 아이 캐릭터는 단순한 점 눈 정도로만.
- **AI를 떠올리게 하는 모양은 쓰지 않습니다** — 로봇 · 반짝이(✨) · 별 · 빛나는 효과 · 회로 · 뇌 모양 금지(2026-11-12 요청).

---

## ① 큰 안내 판 (그림을 쓰는 판 2장 — 「전문가 참여」 판은 참여진 얼굴을 쓴다) — 판 오른쪽, 약 440×290px 영역

| 파일 | 놓이는 자리 | 프롬프트 |
|---|---|---|
| `hero-notice.png` | 파란 판 · 「2026 파일럿 회차 응시 접수」 | Two cartoon hands holding an open desk calendar with a big check mark on one date and a yellow pencil, blue and yellow accents |
| `hero-report.png` | 노란 판 · 「샘플 리포트」 | An open report booklet with abstract bar and radar chart shapes (no text) and a magnifying glass leaning on it, green and blue accents, warm yellow backdrop friendly |

## ② 바로가기 3칸 — 큰 판 아래 흰 띠, 글 왼쪽 약 64×64px (흰 바탕)

| 파일 | 놓이는 자리 | 프롬프트 |
|---|---|---|
| `quick-test.png` | 흰 띠 · 「무료 학력진단」 | A stack of three light lavender test sheets with checkbox lines and blue check marks, slightly tilted |
| `quick-service.png` | 흰 띠 · 「진단 서비스」 | A light blue clipboard with a white checklist sheet and a blue pencil resting diagonally on it |
| `quick-sample.png` | 흰 띠 · 「샘플 리포트」 | An open brown hardcover book with a red ribbon bookmark, held from below by one cartoon hand |

## ③ 더 알아보기 카드 3장 — 남색 판 위 카드 윗부분, 약 200×96px (어두운 바탕)

| 파일 | 놓이는 자리 | 프롬프트 |
|---|---|---|
| `more-talent.png` | 남색 판 · 「우리가 보는 재능이란?」 | A cartoon hand placing a blue jigsaw puzzle piece into place, viewed from the side |
| `more-hitl.png` | 남색 판 · 「AI와 전문가의 협진」 | Two cartoon hands from opposite sides holding one report sheet together, one hand placing a round green approval stamp on it, mint and white |
| `more-partner.png` | 남색 판 · 「학교·학원 도입 문의」 | A small cute school building with a clock on the front and a little flag, blue roof, white walls |

---

## 비고

- 크기는 정사각형으로 만들어도 `object-contain`으로 들어가므로 잘리지 않습니다.
