import { CONTEXT } from "../model/district.ts";
import {
  fallLabel,
  formatMoney,
  formatNumber,
  formatPercent,
  formatShare,
  formatSigned,
} from "../model/format.ts";
import type { ViewModel } from "../model/insights.ts";
import { TrendChart } from "../components/charts.tsx";

export function Briefing({ view }: { view: ViewModel }) {
  const hires = view.schools.reduce((sum, school) => sum + Math.max(0, school.teacherDelta), 0);
  const featured = view.insights.slice(0, 4);
  const more = view.insights.slice(4);
  return (
    <>
      <p className="lead" aria-live="polite">
        {view.lead}
      </p>
      <p className="pace-note">{view.scenarioNote}</p>
      <section className="stats" aria-label="Forecast summary">
        <article>
          <span>Students in {fallLabel(view.year)}</span>
          <strong>{formatNumber(view.totalLater)}</strong>
          <em>
            Range {formatNumber(view.low)}–{formatNumber(view.high)}
          </em>
        </article>
        <article>
          <span>Change from today</span>
          <strong>{formatSigned(view.delta)}</strong>
          <em>
            {formatPercent(view.deltaPct, 1)} from {fallLabel(view.baselineYear)}
          </em>
        </article>
        <article>
          <span>Students over capacity</span>
          <strong>{formatNumber(view.overSeats)}</strong>
          <em>{formatNumber(view.openSeats)} empty seats in other buildings</em>
        </article>
        <article>
          <span>Teachers to add</span>
          <strong>{formatNumber(hires)}</strong>
          <em>
            Net {formatSigned(view.netTeachers)} after unfilled openings · about{" "}
            {formatMoney(view.hireCost)}
          </em>
        </article>
      </section>

      <section className="stack" aria-label="What to pay attention to">
        {featured.map((insight) => (
          <article key={insight.id} className={`insight ${insight.tone}`}>
            <p className="kicker">{insight.kicker}</p>
            <h3>{insight.title}</h3>
            <p>{insight.text}</p>
            <p className="action">
              <span>What to do</span>
              {insight.action}
            </p>
          </article>
        ))}
      </section>
      {more.length > 0 && (
        <ul className="also">
          {more.map((insight) => (
            <li key={insight.id}>
              <strong>{insight.title}.</strong> {insight.action}
            </li>
          ))}
        </ul>
      )}

      <section className="panel">
        <div className="panel-head">
          <h3>District enrollment</h3>
          <p>Solid line is history. The teal line is this forecast. The band is slower to faster growth.</p>
        </div>
        <TrendChart
          history={view.history}
          forecast={view.forecastLine}
          low={view.lowLine}
          high={view.highLine}
          focusYear={view.year}
        />
        <p className="chart-note">
          The scale starts near the data so a change of a few hundred students is visible. Counts are
          fall headcount, the number used for staffing and space. Average daily attendance is about{" "}
          {formatShare(CONTEXT.attendanceRate)}.
        </p>
      </section>

      <details className="sources">
        <summary>Where these numbers come from</summary>
        <ul>
          <li>Fall enrollment by school and grade, 2022 through 2026.</li>
          <li>Births by attendance area, 2018 through 2026, and the share who enroll in district kindergarten.</li>
          <li>Building permits and the year those homes are expected to be occupied.</li>
          <li>School program capacity and the teachers assigned today.</li>
          <li>The recent pattern of students who stay, transfer, or leave for charter and private schools.</li>
          <li>{CONTEXT.jobsNote} District unemployment is about {CONTEXT.unemployment}.</li>
        </ul>
        <p>
          In a live district, the same pages would read the student information system, the state
          department of education, census and birth records, and the local planning department.
          {` ${CONTEXT.charterNote} ${CONTEXT.privateNote}`}
        </p>
      </details>
    </>
  );
}
