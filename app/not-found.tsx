import Link from "next/link";

export default function NotFound() {
  return (
    <section className="bg-gradient-to-b from-brand-50 to-white py-24">
      <div className="container-x text-center">
        <p className="text-6xl font-black text-brand-200">404</p>
        <h1 className="mt-5 text-2xl font-black text-brand-950 md:text-3xl">
          요청하신 페이지를 찾을 수 없습니다
        </h1>
        <p className="mt-3 text-sm text-slate-600">
          주소가 변경되었거나 삭제된 페이지일 수 있습니다.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/"
            className="rounded-full bg-brand-900 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-800"
          >
            홈으로 가기
          </Link>
          <Link
            href="/support"
            className="rounded-full border border-brand-200 px-6 py-3 text-sm font-bold text-brand-800 transition-colors hover:border-brand-400"
          >
            고객센터 문의
          </Link>
        </div>
      </div>
    </section>
  );
}
