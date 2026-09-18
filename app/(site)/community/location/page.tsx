import type { Metadata } from "next";
import PageTitle from "@/components/community/PageTitle";
import { company } from "@/lib/site";

export const metadata: Metadata = {
  title: "오시는 길",
  description: `${company.name} 주소와 연락처. (PUB-09-3)`,
};

/*
 * 주소·전화·이메일은 이 화면에 적지 않는다 — 푸터·고객지원과 같은 값(lib/site.ts)을 읽는다.
 * 한 곳을 고쳤는데 오시는 길만 옛 주소로 남는 일을 막는다.
 *
 * 지도는 키가 필요 없는 구글 지도 끼워 넣기로 그린다. 카카오·네이버 지도는 앱 키를
 * 받아야 끼울 수 있어서, 지금은 그쪽으로 여는 링크만 둔다.
 */
export default function LocationPage() {
  const q = encodeURIComponent(company.address);
  const rows = [
    { label: "주소", value: company.address },
    {
      label: "대표전화",
      value: (
        <a href={`tel:${company.tel.replace(/-/g, "")}`} className="hover:text-brand-700">
          {company.tel}
        </a>
      ),
    },
    {
      label: "이메일",
      value: (
        <a href={`mailto:${company.email}`} className="hover:text-brand-700">
          {company.email}
        </a>
      ),
    },
    { label: "운영시간", value: company.hours },
  ];

  return (
    <section className="section-y">
      <div className="container-x max-w-5xl">
        <PageTitle title="오시는 길" lead="찾아오시는 길과 연락처를 안내해 드립니다." />

        <div className="overflow-hidden rounded-3xl border border-brand-100 shadow-card">
          <iframe
            title={`${company.name} 위치 지도`}
            src={`https://maps.google.com/maps?q=${q}&z=16&output=embed`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="block h-[320px] w-full border-0 md:h-[420px]"
          />

          <div className="grid gap-8 bg-white p-6 md:grid-cols-[1fr_auto] md:items-end md:p-9">
            <dl className="grid gap-4">
              {rows.map((r) => (
                <div key={r.label} className="grid gap-1 sm:grid-cols-[96px_1fr] sm:gap-4">
                  <dt className="type-meta font-bold text-brand-700">{r.label}</dt>
                  <dd className="type-body text-slate-800">{r.value}</dd>
                </div>
              ))}
            </dl>

            <div className="flex flex-wrap gap-2 md:flex-col">
              <a
                href={`https://map.kakao.com/?q=${q}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-sm border border-brand-200 bg-white text-brand-800 hover:border-brand-400"
              >
                카카오맵에서 보기
              </a>
              <a
                href={`https://map.naver.com/p/search/${q}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-sm border border-brand-200 bg-white text-brand-800 hover:border-brand-400"
              >
                네이버 지도에서 보기
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
