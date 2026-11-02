import { useEffect, useState } from "react";
import { validateSchoolQuery } from "../lib/validate.ts";
import {
  fallLabel,
  formatNumber,
  formatShare,
  formatSigned,
  plural,
} from "../model/format.ts";
import type { SchoolRow, ViewModel } from "../model/insights.ts";
import type { LevelFilter, SortKey } from "../lib/session.ts";
import { CapacityMeter, MiniTrend, StatusPill } from "../components/charts.tsx";

export function SchoolsPage({
  view,
  schoolId,
  level,
  sort,
  query,
  onSchool,
  onLevel,
  onSort,
  onQuery,
}: {
  view: ViewModel;
  schoolId: string;
  level: LevelFilter;
  sort: SortKey;
  query: string;
  onSchool: (id: string) => void;
  onLevel: (level: LevelFilter) => void;
  onSort: (sort: SortKey) => void;
  onQuery: (query: string) => void;
}) {
  const queryError = validateSchoolQuery(query);
  const [findError, setFindError] = useState<string | null>(null);
  const [appliedQuery, setAppliedQuery] = useState(() => (validateSchoolQuery(query) ? "" : query));
  useEffect(() => {
    if (!queryError) setAppliedQuery(query);
  }, [query, queryError]);
  const needle = appliedQuery.trim().toLowerCase();
  const rows = view.schools
    .filter((school) => (level === "all" ? true : school.level === level))
    .filter((school) =>
      needle
        ? school.name.toLowerCase().includes(needle) || school.shortName.toLowerCase().includes(needle)
        : true,
    )
    .sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "up") return b.delta - a.delta;
      if (sort === "down") return a.delta - b.delta;
      return b.utilization - a.utilization;
    });
  const selected = view.schools.find((school) => school.id === schoolId) ?? rows[0];

  return (
    <>
      <p className="intro">
        Capacity is program capacity: how many students the building can serve in regular classes.
        Sorted figures are for {fallLabel(view.year)}.
      </p>
      <div className="filters">
        <div className="segment" role="group" aria-label="School level">
          {(
            [
              ["all", "All"],
              ["elementary", "Elementary"],
              ["middle", "Middle"],
              ["high", "High"],
            ] as const
          ).map(([id, label]) => (
            <button key={id} type="button" aria-pressed={level === id} onClick={() => onLevel(id)}>
              {label}
            </button>
          ))}
        </div>
        <form
          className="finder"
          onSubmit={(event) => {
            event.preventDefault();
            try {
              const problem = validateSchoolQuery(query);
              if (problem) {
                setFindError(null);
                event.currentTarget.querySelector("input")?.focus();
                return;
              }
              const results = document.getElementById("school-results");
              if (!results) {
                setFindError("No school list is available to search yet.");
                return;
              }
              setFindError(null);
              results.focus();
            } catch {
              setFindError("The school list could not be opened. Check the name and try Find again.");
            }
          }}
        >
          <label htmlFor="school-sort">Sort</label>
          <select
            id="school-sort"
            value={sort}
            onChange={(event) => {
              const next = event.target.value;
              if (next === "full" || next === "up" || next === "down" || next === "name") onSort(next);
            }}
          >
            <option value="full">Fullest buildings</option>
            <option value="up">Largest increase</option>
            <option value="down">Largest decrease</option>
            <option value="name">Name</option>
          </select>
          <label htmlFor="school-find">Find a school</label>
          <input
            id="school-find"
            name="school"
            value={query}
            maxLength={40}
            aria-invalid={Boolean(queryError)}
            aria-describedby={queryError ? "school-find-error" : "school-find-help"}
            onChange={(event) => onQuery(event.target.value)}
            placeholder="Northfield or Harbor"
            autoComplete="off"
          />
          <button type="submit">Find</button>
          <p id="school-find-help" className="fine">
            Letters, numbers, spaces, and hyphens. Leave it blank to show every school.
          </p>
          {queryError && (
            <p id="school-find-error" className="field-error" role="alert">
              {queryError}
            </p>
          )}
          {!queryError && findError && (
            <p className="field-error" role="alert">
              {findError}
            </p>
          )}
        </form>
      </div>
      <div className="legend">
        <span className="status status-over">Over capacity</span>
        <span className="status status-tight">Nearly full</span>
        <span className="status status-ok">Comfortable</span>
        <span className="status status-room">Room to spare</span>
      </div>
      {rows.length === 0 ? (
        <p className="empty" id="school-results" tabIndex={-1}>
          No school matches that name.
        </p>
      ) : (
        <div className="table-wrap" id="school-results" tabIndex={-1}>
          <p className="scroll-hint">Swipe sideways to see every column.</p>
          <table className="data">
            <caption>Enrollment by school, today and {fallLabel(view.year)}</caption>
            <thead>
              <tr>
                <th scope="col">School</th>
                <th scope="col">Today</th>
                <th scope="col">{fallLabel(view.year)}</th>
                <th scope="col">Change</th>
                <th scope="col">Full</th>
                <th scope="col">Teachers</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((school) => (
                <tr
                  key={school.id}
                  className={selected?.id === school.id ? "is-selected" : ""}
                  tabIndex={0}
                  aria-selected={selected?.id === school.id}
                  onClick={() => onSchool(school.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onSchool(school.id);
                    }
                  }}
                >
                  <th scope="row">
                    {school.shortName}
                    <small>{school.levelLabel}</small>
                  </th>
                  <td>{formatNumber(school.now)}</td>
                  <td>{formatNumber(school.later)}</td>
                  <td>{formatSigned(school.delta)}</td>
                  <td>
                    <StatusPill tone={school.tone} label={school.status} />
                    <small>{formatShare(school.utilization)}</small>
                  </td>
                  <td>{formatSigned(school.teacherDelta)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {selected && <SchoolDetail school={selected} year={view.year} />}
    </>
  );
}

function SchoolDetail({ school, year }: { school: SchoolRow; year: number }) {
  const classShift = school.grades
    .map((grade) => ({ ...grade, classDelta: grade.classesLater - grade.classesNow }))
    .sort((a, b) => Math.abs(b.classDelta) - Math.abs(a.classDelta))[0];
  return (
    <section className="detail" id="school-detail">
      <div className="detail-head">
        <div>
          <p className="kicker">{school.areaName}</p>
          <h3>{school.name}</h3>
          <p>{school.narrative}</p>
        </div>
        <MiniTrend points={school.trend} focusYear={year} />
      </div>
      <CapacityMeter utilization={school.utilization} />
      <p className="meter-label">
        {formatNumber(school.later)} students in a building for {formatNumber(school.capacity)}.{" "}
        {formatSigned(school.teacherDelta)} teachers versus the {school.ratio}-student target. Today
        the school has {plural(school.teachersNow, "teacher")}.
      </p>
      {school.level === "elementary" && classShift && classShift.classDelta !== 0 && (
        <p className="callout">
          {classShift.grade === "K" ? "Kindergarten" : `Grade ${classShift.grade}`} would need{" "}
          {plural(classShift.classesLater, "class")} at {school.ratio} students,{" "}
          {formatSigned(classShift.classDelta)} from today.
        </p>
      )}
      <div className="table-wrap">
          <p className="scroll-hint">Swipe sideways to see every column.</p>
        <table className="data compact">
          <caption>Grades at {school.shortName}</caption>
          <thead>
            <tr>
              <th scope="col">Grade</th>
              <th scope="col">Today</th>
              <th scope="col">{fallLabel(year)}</th>
              <th scope="col">Change</th>
              {school.level === "elementary" && <th scope="col">Classes</th>}
            </tr>
          </thead>
          <tbody>
            {school.grades.map((grade) => (
              <tr key={grade.grade}>
                <th scope="row">{grade.grade}</th>
                <td>{formatNumber(grade.now)}</td>
                <td>{formatNumber(grade.later)}</td>
                <td>{formatSigned(grade.delta)}</td>
                {school.level === "elementary" && (
                  <td>
                    {grade.classesNow} → {grade.classesLater}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {school.level !== "elementary" && (
        <p className="fine">
          Middle and high school staffing uses a students-per-teacher target, because teachers are
          shared across classes.
        </p>
      )}
    </section>
  );
}
