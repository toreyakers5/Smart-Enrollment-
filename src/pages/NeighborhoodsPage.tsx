import {
  fallLabel,
  formatNumber,
  formatPercent,
  formatShare,
  formatSigned,
  plural,
} from "../model/format.ts";
import type { ViewModel } from "../model/insights.ts";

export function NeighborhoodsPage({
  view,
  areaId,
  onArea,
}: {
  view: ViewModel;
  areaId: string;
  onArea: (id: string) => void;
}) {
  return (
    <>
      <p className="intro">
        Neighborhood totals are elementary students, the clearest picture of where children live.
        Middle and high schools draw from more than one neighborhood.
      </p>
      <div className="sketch" role="group" aria-label="District neighborhoods">
        {view.areas.map((area) => {
          const tone = area.deltaPct >= 0.04 ? "growth" : area.deltaPct <= -0.04 ? "decline" : "steady";
          return (
            <button
              key={area.id}
              type="button"
              className={`zone zone-${tone} zone-${area.id}`}
              aria-pressed={areaId === area.id}
              onClick={() => onArea(area.id)}
            >
              <span>{area.name}</span>
              <strong>{formatSigned(area.delta)}</strong>
              <small>{formatPercent(area.deltaPct, 0)} elementary</small>
            </button>
          );
        })}
      </div>
      <div className="area-list">
        {view.areas.map((area) => (
          <article
            key={area.id}
            id={`area-${area.id}`}
            className={area.id === areaId ? "area-card is-selected" : "area-card"}
          >
            <header>
              <h3>{area.name}</h3>
              <p>{area.summary}</p>
            </header>
            <p className="area-stat">
              <strong>{formatNumber(area.later)}</strong> elementary students in {fallLabel(view.year)},{" "}
              {formatSigned(area.delta)} from {formatNumber(area.now)} today.
            </p>
            <dl>
              <div>
                <dt>School-age children</dt>
                <dd>
                  About {formatNumber(area.schoolAge)}. {area.trend}
                </dd>
              </div>
              <div>
                <dt>Households</dt>
                <dd>Median age about {area.medianAge}. {area.economy}</dd>
              </div>
              <div>
                <dt>Births</dt>
                <dd>
                  {area.births2026 >= area.births2018
                    ? `Births rose from ${formatNumber(area.births2018)} in 2018 to ${formatNumber(area.births2026)} in 2026.`
                    : `Births fell from ${formatNumber(area.births2018)} in 2018 to ${formatNumber(area.births2026)} in 2026.`}{" "}
                  About {formatShare(area.capture)} enroll in district kindergarten.
                </dd>
              </div>
              <div>
                <dt>Next school</dt>
                <dd>{area.nextSchools}</dd>
              </div>
            </dl>
            {area.projects.length > 0 && (
              <ul className="projects">
                {area.projects.map((project) => (
                  <li key={project.id}>
                    <strong>{project.name}</strong>
                    <span>
                      {project.kind} · {formatNumber(project.units)} units · about{" "}
                      {plural(project.students, "student")} if full
                    </span>
                    <span>
                      {formatNumber(project.occupied)} of {formatNumber(project.units)} are occupied by{" "}
                      {fallLabel(view.year)}.
                    </span>
                    <span>{project.note}</span>
                  </li>
                ))}
              </ul>
            )}
          </article>
        ))}
      </div>
    </>
  );
}
