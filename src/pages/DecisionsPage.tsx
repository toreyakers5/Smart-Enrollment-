import { CONTEXT, type Level } from "../model/district.ts";
import { fallLabel, formatMoney, formatNumber, formatSigned, plural } from "../model/format.ts";
import type { SchoolRow, ViewModel } from "../model/insights.ts";

export function DecisionsPage({ view }: { view: ViewModel }) {
  const levels: Level[] = ["elementary", "middle", "high"];
  return (
    <>
      <p className="intro">
        Use this page when the board asks what to do. Figures compare {fallLabel(view.year)} with
        the teachers and buildings you have today.
      </p>
      <section className="block">
        <h3>Staffing</h3>
        <div className="split-row three">
          {levels.map((level) => {
            const rows = view.schools.filter((school) => school.level === level);
            const delta = rows.reduce((sum, school) => sum + school.teacherDelta, 0);
            return (
              <article key={level}>
                <h3>{level[0].toUpperCase() + level.slice(1)}</h3>
                <strong>{formatSigned(delta)}</strong>
                <p>Net teacher change for this level</p>
              </article>
            );
          })}
        </div>
        <div className="table-wrap">
          <p className="scroll-hint">Swipe sideways to see every column.</p>
          <table className="data">
            <caption>Teacher positions compared with today</caption>
            <thead>
              <tr>
                <th scope="col">School</th>
                <th scope="col">Today</th>
                <th scope="col">Needed</th>
                <th scope="col">Change</th>
                <th scope="col">Yearly cost change</th>
              </tr>
            </thead>
            <tbody>
              {[...view.schools]
                .sort((a, b) => b.teacherDelta - a.teacherDelta)
                .map((school) => (
                  <tr key={school.id}>
                    <th scope="row">{school.shortName}</th>
                    <td>{school.teachersNow}</td>
                    <td>{school.teachersNeeded}</td>
                    <td>{formatSigned(school.teacherDelta)}</td>
                    <td>{formatMoney(school.teacherDelta * CONTEXT.teacherCost)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <p className="fine">
          Cost uses {formatMoney(CONTEXT.teacherCost)} average salary and benefits per teacher. It is
          a planning estimate, separate from the salary schedule. A negative amount is an opening
          that can stay unfilled as people leave.
        </p>
      </section>

      <section className="block">
        <h3>Buildings</h3>
        <div className="table-wrap">
          <p className="scroll-hint">Swipe sideways to see every column.</p>
          <table className="data">
            <caption>Building pressure in {fallLabel(view.year)}</caption>
            <thead>
              <tr>
                <th scope="col">School</th>
                <th scope="col">Forecast</th>
                <th scope="col">Capacity</th>
                <th scope="col">Seats</th>
                <th scope="col">Next step</th>
              </tr>
            </thead>
            <tbody>
              {[...view.schools]
                .sort((a, b) => b.utilization - a.utilization)
                .map((school) => {
                  const seats = school.later - school.capacity;
                  return (
                    <tr key={school.id}>
                      <th scope="row">{school.shortName}</th>
                      <td>{formatNumber(school.later)}</td>
                      <td>{formatNumber(school.capacity)}</td>
                      <td>{seats > 0 ? `${formatNumber(seats)} over` : `${formatNumber(Math.abs(seats))} open`}</td>
                      <td>{buildingAdvice(school)}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="block">
        <h3>Boundaries</h3>
        {view.boundaries.length === 0 ? (
          <p>{view.boundaryEmpty}</p>
        ) : (
          <div className="stack">
            {view.boundaries.map((idea) => (
              <article key={idea.id} className="insight watch">
                <h3>
                  About {plural(idea.move, "student")} from {idea.fromName} to {idea.toName}
                </h3>
                <p>{idea.text}</p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="block">
        <h3>Consolidation</h3>
        {view.consolidation ? (
          <article className={`insight ${view.consolidation.ready ? "watch" : "steady"}`}>
            <h3>{view.consolidation.title}</h3>
            <p>{view.consolidation.text}</p>
            <p className="action">
              <span>What to do</span>
              {view.consolidation.action}
            </p>
          </article>
        ) : (
          <p>{view.consolidationEmpty}</p>
        )}
      </section>

      <section className="block">
        <h3>Transportation</h3>
        {view.transport.length === 0 ? (
          <p>Enrollment shifts in this window are too small to add or combine a bus on this planning rule.</p>
        ) : (
          <div className="stack">
            {view.transport.map((note) => (
              <article key={note.id} className="insight watch">
                <h3>{note.title}</h3>
                <p>{note.text}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function buildingAdvice(school: SchoolRow): string {
  const over = school.later - school.capacity;
  if (over >= 80) return "Addition plus a boundary study";
  if (over >= 25) return "Added classrooms or a boundary study";
  if (over > 0) return "An extra class section";
  if (school.tone === "tight" && school.delta < -20) return "Full now, with room opening later";
  if (school.tone === "tight") return "Little room for a large incoming class";
  if (school.delta <= -40) return "Watch for a later consolidation study";
  if (school.tone === "room") return "Space available";
  return "No building action";
}
