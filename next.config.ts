import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // 히어로 사진은 인물·차트가 함께 들어가 있어 기본 75보다 조금 높게 뽑는다
    qualities: [75, 90],
  },
  /**
   * 응시 존의 옛 탭 주소 — 접수 · 응시 · 정답과 해설 · 결과를 학생 대시보드(/student)로
   * 모으면서 없앤 주소들이다. 넘겨 둔 링크나 즐겨찾기가 빈 화면에 닿지 않게 새 자리로 보낸다.
   * 접수 창의 ?apply= · ?applied= 같은 물음표 뒤 값은 그대로 따라간다.
   */
  redirects() {
    return [
      { source: "/exam/apply", destination: "/student/apply", permanent: false },
      { source: "/exam/answers", destination: "/student/answers", permanent: false },
      { source: "/exam/report", destination: "/student/results", permanent: false },
      // 과목 판 — 학년(e3~e6)으로만 잡는다. /exam/session/free 같은 응시 주소가 걸리면 안 된다
      {
        source: "/exam/:round/:track(e[3-6])",
        destination: "/student/exams/:round/:track",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
