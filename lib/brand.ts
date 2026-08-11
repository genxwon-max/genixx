/**
 * GENIXX 브랜드 네이밍.
 * 여섯 글자가 각각 서비스의 축 하나씩을 가리키고,
 * 마지막 두 X가 교차(cross)하는 지점이 GENIXX가 하는 일이다.
 */
export type BrandLetter = {
  letter: string;
  word: string;
  ko: string;
  desc: string;
  tone: string;
};

export const brandLetters: BrandLetter[] = [
  {
    letter: "G",
    word: "Genius",
    ko: "지니어스",
    desc: "모든 아이 안에 있는 재능. 등급이 아니라 아직 드러나지 않은 가능성으로 봅니다.",
    tone: "bg-surface-blue text-brand-700",
  },
  {
    letter: "E",
    word: "Education",
    ko: "에듀케이션",
    desc: "진단에서 멈추지 않고 학습과 양육으로 이어지는 실행 가이드를 제공합니다.",
    tone: "bg-surface-violet text-accent-600",
  },
  {
    letter: "N",
    word: "Navigator",
    ko: "네비게이터",
    desc: "지금 어디쯤 왔고 다음에 어디로 가면 되는지, 성장 좌표를 안내합니다.",
    tone: "bg-surface-mint text-emerald-700",
  },
  {
    letter: "I",
    word: "Insight",
    ko: "인사이트",
    desc: "점수를 넘어 '왜 그런가'를 설명합니다. 해석은 사람 전문가가 확정합니다.",
    tone: "bg-surface-amber text-amber-700",
  },
  {
    letter: "X",
    word: "AI",
    ko: "인공지능",
    desc: "지필·설문·면담 데이터를 정량·정성으로 분석해 1차 제안값을 만드는 축입니다.",
    tone: "bg-surface-sky text-brand-600",
  },
  {
    letter: "X",
    word: "User",
    ko: "사용자",
    desc: "학생·학부모·교사, 그리고 판정에 참여하는 전문가. 최종 판단은 언제나 사람의 축입니다.",
    tone: "bg-surface-rose text-fuchsia-700",
  },
];

export const brandStory =
  "마지막 두 글자 X는 인공지능(AI)과 사용자(User)입니다. 두 축이 교차하는 자리에서 판단이 만들어진다는 뜻이고, GENIXX가 AI 단독 판정을 하지 않는 이유이기도 합니다.";
