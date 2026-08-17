import { findAdminMenu, stubSections } from "@/lib/admin";
import { PageHead, PlannedSection } from "./Parts";
import * as a from "./ui";

/**
 * 아직 화면 상세를 확정하지 않은 자리.
 * 빈 페이지를 두는 대신 "여기에 무엇이 들어가야 하는지"를 적어 둔다.
 * 공개 존의 [section] 처리와 같은 방식이다.
 *
 * 메뉴에 하위 항목이 달린 화면은 그 항목마다 구역을 하나씩 세운다. 메뉴에서 하위
 * 항목을 눌렀을 때 내려앉을 자리가 있어야 하기 때문이다 — 자리가 없으면 눌러도
 * 아무 일도 일어나지 않고, 쓰는 사람은 고장인지 아닌지 알 수 없다.
 */
export default function StubPage({ section }: { section: keyof typeof stubSections }) {
  const s = stubSections[section];
  const children = findAdminMenu(`/admin/${section}`)?.children ?? [];

  /* 할 일 줄은 「ADM-07-1 IRT 문항분석 — …」처럼 화면 ID로 시작한다. 그 번호로
     묶어 각 구역에 나눠 넣고, 어디에도 붙지 않는 줄은 맨 아래에 남긴다.
     번호와 이름은 이미 구역 제목에 있으므로 떼어 낸다 — 같은 말이 두 번 나오면
     읽는 사람은 둘이 다른 것인 줄 알고 두 번 읽는다. */
  const todoFor = (c: (typeof children)[number]) =>
    s.todo
      .filter((t) => t.startsWith(`${c.id} `))
      .map((t) => t.slice(c.id.length + 1).trim())
      .map((t) => {
        const head = t.match(/^(.+?)\s+—\s+/)?.[1];
        return head && c.label.includes(head) ? t.slice(t.indexOf("—") + 1).trim() : t;
      });
  const rest = s.todo.filter((t) => !children.some((c) => t.startsWith(`${c.id} `)));

  return (
    <>
      <PageHead id={s.id} title={s.title} lead={s.lead} />

      {children.length > 0 ? (
        <div className="space-y-8">
          {children.map((c) => {
            const todo = todoFor(c);
            /* 할 일 줄이 있으면 그것이 더 자세하다. 메뉴 설명(desc)까지 함께 적으면
               같은 내용이 두 줄로 겹친다. */
            return (
              <PlannedSection
                key={c.id}
                id={c.id}
                title={c.label}
                lead={todo.length > 0 ? undefined : c.desc}
                todo={todo}
              />
            );
          })}

          {rest.length > 0 && (
            <section>
              <h2 className={a.cardTitle}>그 밖에 담을 것</h2>
              <ul className="mt-3 border-b border-exam-line">
                {rest.map((t) => (
                  <li key={t} className="border-t border-exam-line py-3 adm-t-md text-exam-text">
                    {t}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      ) : (
        <section>
          <h2 className={a.cardTitle}>이 화면에 들어갈 것</h2>
          <p className={`${a.bodyText} mt-2`}>
            화면 설계가 확정되면 이 자리를 개별 화면으로 나눕니다. 지금은 무엇을 담을지만 적어
            둡니다.
          </p>
          <ul className="mt-4 border-b border-exam-line">
            {s.todo.map((t) => (
              <li key={t} className="border-t border-exam-line py-3 adm-t-md text-exam-text">
                {t}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
