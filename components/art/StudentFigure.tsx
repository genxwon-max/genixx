/**
 * 히어로 영역 학생 일러스트 (플랫 스타일 SVG).
 * public/hero-student.* 파일이 있으면 실제 이미지가 대신 사용된다.
 */
export default function StudentFigure({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 320 400"
      className={className}
      role="img"
      aria-label="교복을 입고 밝게 웃는 학생 일러스트"
    >
      <defs>
        <linearGradient id="sf-hair" x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stopColor="#4a3b39" />
          <stop offset="100%" stopColor="#2b211f" />
        </linearGradient>
        <linearGradient id="sf-vest" x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0%" stopColor="#efe7d8" />
          <stop offset="100%" stopColor="#ddd1bc" />
        </linearGradient>
        <linearGradient id="sf-skin" x1="0.3" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stopColor="#fadfc6" />
          <stop offset="100%" stopColor="#f2cba9" />
        </linearGradient>
      </defs>

      {/* 뒷머리 */}
      <path
        d="M96 150c0-52 25-88 64-88s64 36 64 88c0 46 7 84 14 108H82c7-24 14-62 14-108z"
        fill="url(#sf-hair)"
      />

      {/* 목 */}
      <path d="M140 178h40v46h-40z" fill="#f0c5a3" />
      <path d="M140 196c12 10 28 10 40 0v-18h-40z" fill="#dfae8c" />

      {/* 흰 블라우스 */}
      <path
        d="M160 206c-20 0-38 7-51 16-16 11-25 29-27 51l-4 47h164l-4-47c-2-22-11-40-27-51-13-9-31-16-51-16z"
        fill="#ffffff"
      />
      {/* 블라우스 깃 */}
      <path d="M140 206l20 24-14 12-20-28z" fill="#f4f5f8" />
      <path d="M180 206l-20 24 14 12 20-28z" fill="#f4f5f8" />

      {/* 니트 조끼 (V넥) */}
      <path
        d="M128 216c9 18 20 30 32 30s23-12 32-30c14 6 25 14 32 24 10 13 15 30 16 49l2 31H78l2-31c1-19 6-36 16-49 7-10 18-18 32-24z"
        fill="url(#sf-vest)"
      />
      {/* 니트 결 */}
      <g stroke="#cfc2ab" strokeWidth="1.6" opacity="0.7">
        <path d="M104 272v46M120 264v54M200 264v54M216 272v46" />
      </g>

      {/* 리본 타이 */}
      <path d="M160 244l-20-12-6 20 26 8 26-8-6-20z" fill="#2b3a7a" />
      <path d="M147 238l4 14M173 238l-4 14" stroke="#e6ebf7" strokeWidth="3" strokeLinecap="round" />
      <path d="M160 240l8 10-8 10-8-10z" fill="#1b2a6b" />

      {/* 얼굴 */}
      <ellipse cx="160" cy="132" rx="46" ry="52" fill="url(#sf-skin)" />
      {/* 귀 */}
      <ellipse cx="115" cy="136" rx="7" ry="10" fill="#f0c5a3" />
      <ellipse cx="205" cy="136" rx="7" ry="10" fill="#f0c5a3" />

      {/* 앞머리 */}
      <path
        d="M114 128c-3-40 19-64 46-64s49 24 46 64c-5-16-12-27-22-33-11 14-33 22-58 22-5 3-9 7-12 11z"
        fill="url(#sf-hair)"
      />

      {/* 눈썹 */}
      <path d="M132 118c6-4 15-4 21 1" stroke="#3a2c29" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M167 119c6-5 15-5 21-1" stroke="#3a2c29" strokeWidth="3" strokeLinecap="round" fill="none" />
      {/* 눈 (위를 바라보는 미소 눈) */}
      <path d="M134 136c5-6 14-6 19 0" stroke="#2f2320" strokeWidth="4" strokeLinecap="round" fill="none" />
      <path d="M167 136c5-6 14-6 19 0" stroke="#2f2320" strokeWidth="4" strokeLinecap="round" fill="none" />
      {/* 볼 */}
      <ellipse cx="130" cy="152" rx="9" ry="5.5" fill="#f5a99b" opacity="0.5" />
      <ellipse cx="190" cy="152" rx="9" ry="5.5" fill="#f5a99b" opacity="0.5" />
      {/* 코 & 입 */}
      <path d="M160 145v6" stroke="#dda986" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M150 160c6 7 14 7 20 0" stroke="#c96f5c" strokeWidth="3.4" strokeLinecap="round" fill="none" />

      {/* 책상 */}
      <rect x="24" y="332" width="272" height="16" rx="8" fill="#f2f5fc" />
      <rect x="48" y="348" width="224" height="9" rx="4.5" fill="#dde4f2" opacity="0.8" />

      {/* 노트 & 연필 */}
      <rect x="70" y="312" width="82" height="20" rx="3" fill="#ffffff" stroke="#dde3f1" strokeWidth="2" />
      <path d="M82 322h56" stroke="#c6cee5" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M196 320l28-19 7 10-28 19z" fill="#efb14b" />
      <path d="M196 320l-7 7 10-1z" fill="#5c5468" />
    </svg>
  );
}
