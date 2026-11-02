import { fallLabel, formatNumber, formatSigned } from "../model/format.ts";
import type { ViewModel } from "../model/insights.ts";

export function GradesPage({ view }: { view: ViewModel }) {
  const max = Math.max(...view.grades.flatMap((grade) => [grade.now, grade.later]), 1);
  const elementaries = view.schools.filter((school) => school.level === "elementary");
  const groups = [
    {
      label: "Growing elementaries",
      rows: elementaries.filter((school) => school.delta >= 25),
    },
    {
      label: "Steady elementaries",
      rows: elementaries.filter((school) => school.delta < 25 && school.delta > -25),
    },
    {
      label: "Declining elementaries",
      rows: elementaries.filter((school) => school.delta <= -25),
    },
  ];
  return (
    <>
      <p className="intro">{view.gradesIntro}</p>
      <div className="split-row">
        {groups.map((group) => {
          const now = group.rows.reduce((sum, school) => sum + school.now, 0);
          const later = group.rows.reduce((sum, school) => sum + school.later, 0);
          return (
            <article key={group.label}>
              <h3>{group.label}</h3>
              <strong>{formatSigned(later - now)}</strong>
              <p>
                {group.rows.length
                  ? group.rows.map((school) => school.shortName).join(", ")
                  : "None in this window"}
              </p>
              <em>
                {formatNumber(now)} today · {formatNumber(later)} in {fallLabel(view.year)}
              </em>
            </article>
          );
        })}
      </div>
      <section className="panel">
        <div className="grade-legend">
          <span>
            <i className="swatch now" /> Today
          </span>
          <span>
            <i className="swatch later" /> {fallLabel(view.year)}
          </span>
        </div>
        <div className="grade-chart">
          {view.grades.map((grade) => (
            <div key={grade.grade} className="grade-row">
              <span className="grade-name">{grade.grade}</span>
              <div className="grade-bars">
                <div style={{ width: `${(grade.now / max) * 100}%` }} className="bar now">
                  <span>{formatNumber(grade.now)}</span>
                </div>
                <div style={{ width: `${(grade.later / max) * 100}%` }} className="bar later">
                  <span>{formatNumber(grade.later)}</span>
                </div>
              </div>
              <span className={grade.delta < 0 ? "delta down" : "delta"}>{formatSigned(grade.delta)}</span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
