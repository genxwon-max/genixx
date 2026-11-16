# /design4 홈 시안 — 그림 프롬프트

그림 8장. 만들어서 **`public/design4/`에 아래 파일 이름 그대로** 넣으면 코드 수정 없이 자리에 들어갑니다.
파일이 없으면 그 자리에 점선 상자와 파일 이름이 보입니다. 그림은 배포할 때 들어가므로, 넣은 뒤에는 커밋 · 배포해야 사이트에 보입니다.

## 한눈에 — 파일 · 비율

| 묶음 | 파일 | 자리 크기 | 비율 | 바탕 |
|---|---|---|---|---|
| ① 큰 안내 판 | `hero-notice.png` · `hero-report.png` | 약 440×290px | **3:2** | 파랑 · 노랑 판 |
| ② 바로가기 | `quick-test.png` · `quick-service.png` · `quick-sample.png` | 약 64×64px | **1:1** | 흰 띠(마우스를 올리면 연한 파랑) |
| ③ 더 알아보기 | `more-talent.png` · `more-hitl.png` · `more-partner.png` | 약 200×96px | 약 2:1 → **16:9**로 생성 | 남색 판 |

그림은 자리에 `object-contain`으로 들어간다 — 잘리지 않고 통째로 줄어들며, 비율이 조금 달라도 양옆이나 위아래가 빌 뿐이다.

## 공통 규칙 (모든 프롬프트 앞에 붙임)

```
3D clay-style illustration, soft rounded shapes, matte plastic texture, gentle studio lighting,
soft shadow under object, pastel highlights, clean and friendly Korean public-education portal style,
single object centered, isolated on a plain solid pure white background, no floor, no scene, no backdrop,
no text, no letters, no logo, no robots, no sparkles, no stars, no glow, no circuit or neural patterns
```

- 완성 파일은 **반드시 배경이 투명한 PNG**. 판 · 카드 색이 그림 뒤로 보여야 합니다.
  흰 배경이 남으면 색 판 위에 흰 네모가 뜨고, 바로가기 칸도 마우스를 올렸을 때 흰 네모가 드러납니다.
- 투명 배경으로 바로 뽑아 주는 도구가 거의 없어(아래 하이퍼리얼도 없음) **흰 배경으로 만들고 배경을 지우는 것**을 기본으로 합니다.
  투명 배경 설정이 있는 도구(GPT Image 2.5 API의 `background: "transparent"` 등)라면 그 설정을 켜고, 위 프롬프트의
  `isolated on a plain solid pure white background` 부분을 `isolated on fully transparent background`로 바꿉니다.
- 배경을 지울 때 그림자가 함께 지워지거나 가장자리가 지저분하면 `soft shadow under object`를 빼고 다시 만듭니다.
- 글자 · 숫자 · 로고가 그림 안에 들어가지 않게 합니다(한글이 깨져 나옵니다).
- 사람은 얼굴 없이 손만, 혹은 아이 캐릭터는 단순한 점 눈 정도로만.
- **AI를 떠올리게 하는 모양은 쓰지 않습니다** — 로봇 · 반짝이(✨) · 별 · 빛나는 효과 · 회로 · 뇌 모양 금지(2026-11-12 요청).

## 하이퍼리얼(hyperreal.video/image)에서 만드는 순서

화면 아래 입력창에서 모델 · 비율 · 해상도 · 품질 · 장수 · 네거티브 프롬프트를 고를 수 있다. **투명 배경 설정은 없다**(2026-11-16 확인).

1. **모델** — Nano Banana 2 · Nano Banana Lite · GPT Image 2.5 Sunburst · GPT Image 2.5 Flare 중 그림체가 마음에 드는 것. 어느 것이든 배경은 칠해져 나온다.
2. **비율** — 위 표대로(큰 판 3:2 · 바로가기 1:1 · 더 알아보기 16:9).
3. **해상도 1K · 품질 high**면 충분하다.
4. **프롬프트** — 공통 규칙 + 그림별 프롬프트를 이어 붙인다.
5. **네거티브 프롬프트**(슬라이더 모양 아이콘) — 아래를 넣고 저장한다.
   ```
   text, letters, numbers, logo, watermark, robot, sparkles, stars, glow, circuit, brain, background scene, floor, table
   ```
6. 생성 → 내려받기.
7. **배경 지우기** — 윈도우 11 그림판의 「배경 제거」, remove.bg 등. **PNG로 저장**한다.
8. 파일 이름을 아래 표 그대로 바꿔 `public/design4/`에 넣는다.
9. 넣기 전에 진한 남색 바탕 위에 얹어 보고 흰 테두리 · 흰 네모가 없는지 확인한다.

---

## ① 큰 안내 판 (그림을 쓰는 판 2장 — 「전문가 참여」 판은 참여진 얼굴을 쓴다) — 판 오른쪽, 약 440×290px · **3:2**

| 파일 | 놓이는 자리 | 프롬프트 |
|---|---|---|
| `hero-notice.png` | 파란 판 · 「2026 파일럿 회차 응시 접수」 | Two cartoon hands holding an open desk calendar with a big check mark on one date and a yellow pencil, blue and yellow accents |
| `hero-report.png` | 노란 판 · 「샘플 리포트」 | An open report booklet with abstract bar and radar chart shapes (no text) and a magnifying glass leaning on it, green and blue accents |

## ② 바로가기 3칸 — 큰 판 아래 흰 띠, 글 왼쪽 약 64×64px · **1:1** (흰 바탕, 마우스를 올리면 연한 파랑)

| 파일 | 놓이는 자리 | 프롬프트 |
|---|---|---|
| `quick-test.png` | 흰 띠 · 「무료 학력진단」 | A stack of three light lavender test sheets with checkbox lines and blue check marks, slightly tilted |
| `quick-service.png` | 흰 띠 · 「진단 서비스」 | A light blue clipboard with a white checklist sheet and a blue pencil resting diagonally on it |
| `quick-sample.png` | 흰 띠 · 「샘플 리포트」 | An open brown hardcover book with a red ribbon bookmark, held from below by one cartoon hand |

## ③ 더 알아보기 카드 3장 — 남색 판 위 카드 윗부분, 약 200×96px · **16:9로 생성** (어두운 바탕)

| 파일 | 놓이는 자리 | 프롬프트 |
|---|---|---|
| `more-talent.png` | 남색 판 · 「우리가 보는 재능이란?」 | A cartoon hand placing a blue jigsaw puzzle piece into place, viewed from the side |
| `more-hitl.png` | 남색 판 · 「AI와 전문가의 협진」 | Two cartoon hands from opposite sides holding one report sheet together, one hand placing a round green approval stamp on it, mint and white |
| `more-partner.png` | 남색 판 · 「학교·학원 도입 문의」 | A small cute school building with a clock on the front and a little flag, blue roof, white walls |

---

## 비고

- 크기 · 비율이 조금 달라도 `object-contain`으로 들어가므로 잘리지 않습니다.
- 그림 둘레의 빈 여백도 그림 크기에 들어갑니다 — 여백이 넓으면 물건이 작게 보이므로, 물건이 화면을 넉넉히 채우게 만드세요.
  배경을 지운 뒤 빈 둘레를 잘라 내면(그림판 「자르기」) 자리에서 더 크게 보입니다.
