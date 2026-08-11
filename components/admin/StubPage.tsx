import { stubSections } from "@/lib/admin";
import { PageHead } from "./Parts";
import * as a from "./ui";

/**
 * 아직 화면 상세를 확정하지 않은 자리.
 * 빈 페이지를 두는 대신 "여기에 무엇이 들어가야 하는지"를 적어 둔다.
 * 공개 존의 [section] 처리와 같은 방식이다.
 */
export default function StubPage({ section }: { section: keyof typeof stubSections }) {
  const s = stubSections[section];

  return (
    <>
      <PageHead id={s.id} title={s.title} lead={s.lead} />

      <section>
        <h2 className={a.cardTitle}>이 화면에 들어갈 것</h2>
        <p className={`${a.bodyText} mt-2`}>
          화면 설계가 확정되면 이 자리를 개별 화면으로 나눕니다. 지금은 무엇을 담을지만 적어 둡니다.
        </p>
        <ul className="mt-4 border-b border-exam-line">
          {s.todo.map((t) => (
            <li key={t} className="border-t border-exam-line py-3 adm-t-md text-exam-text">
              {t}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
