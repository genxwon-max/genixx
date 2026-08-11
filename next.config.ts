import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // 히어로 사진은 인물·차트가 함께 들어가 있어 기본 75보다 조금 높게 뽑는다
    qualities: [75, 90],
  },
};

export default nextConfig;
