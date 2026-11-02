import { formatNumber } from "../model/format.ts";
import type { SchoolRow } from "../model/insights.ts";

export function StatusPill({ tone, label }: { tone: SchoolRow["tone"]; label: string }) {
  return <span className={`status status-${tone}`}>{label}</span>;
}

export function CapacityMeter({ utilization }: { utilization: number }) {
  const scale = 1.3;
  const width = Math.min(utilization, scale) / scale;
  return (
    <div className="meter" aria-hidden="true">
      <span style={{ width: `${width * 100}%` }} />
      <i style={{ left: `${(1 / scale) * 100}%` }} />
    </div>
  );
}

export function MiniTrend({
  points,
  focusYear,
}: {
  points: { year: number; students: number }[];
  focusYear: number;
}) {
  if (points.length === 0 || points.some((point) => !Number.isFinite(point.students))) {
    return <p className="fine">This school’s enrollment trend could not be drawn.</p>;
  }
  const width = 180;
  const height = 56;
  const min = Math.min(...points.map((point) => point.students));
  const max = Math.max(...points.map((point) => point.students));
  const span = Math.max(20, max - min);
  const x = (index: number) => (index / Math.max(1, points.length - 1)) * (width - 8) + 4;
  const y = (value: number) => height - 8 - ((value - (min - span * 0.15)) / (span * 1.3)) * (height - 16);
  const d = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${x(index).toFixed(1)} ${y(point.students).toFixed(1)}`)
    .join(" ");
  const focus = points.findIndex((point) => point.year === focusYear);
  return (
    <svg className="mini" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Enrollment trend">
      <path d={d} />
      {focus >= 0 && <circle cx={x(focus)} cy={y(points[focus].students)} r="3.5" />}
    </svg>
  );
}

export function TrendChart({
  history,
  forecast,
  low,
  high,
  focusYear,
}: {
  history: { year: number; students: number }[];
  forecast: { year: number; students: number }[];
  low: { year: number; students: number }[];
  high: { year: number; students: number }[];
  focusYear: number;
}) {
  const width = 680;
  const height = 250;
  const pad = { l: 56, r: 16, t: 16, b: 32 };
  const today = history[history.length - 1]?.year ?? focusYear;
  const yearMin = history[0]?.year ?? focusYear;
  const yearMax = forecast[forecast.length - 1]?.year ?? focusYear;
  const values = [...history, ...forecast, ...low, ...high].map((point) => point.students);
  if (
    history.length === 0 ||
    forecast.length === 0 ||
    values.some((value) => !Number.isFinite(value)) ||
    yearMax === yearMin
  ) {
    return <p className="fine">The district chart could not be drawn for this year.</p>;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(80, max - min);
  const yMin = min - span * 0.45;
  const yMax = max + span * 0.3;
  const innerW = width - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;
  const xOf = (year: number) => pad.l + ((year - yearMin) / (yearMax - yearMin)) * innerW;
  const yOf = (value: number) => pad.t + (1 - (value - yMin) / (yMax - yMin)) * innerH;
  const line = (points: { year: number; students: number }[]) =>
    points
      .map(
        (point, index) =>
          `${index === 0 ? "M" : "L"} ${xOf(point.year).toFixed(1)} ${yOf(point.students).toFixed(1)}`,
      )
      .join(" ");
  const band = [...high, ...[...low].reverse()];
  const bandPath =
    band
      .map(
        (point, index) =>
          `${index === 0 ? "M" : "L"} ${xOf(point.year).toFixed(1)} ${yOf(point.students).toFixed(1)}`,
      )
      .join(" ") + " Z";
  const ticks = [yearMin, today, focusYear, yearMax].filter(
    (year, index, list) => list.indexOf(year) === index,
  );
  const summary = `District enrollment from ${formatNumber(history[0]?.students ?? 0)} in ${history[0]?.year ?? ""} to a forecast of ${formatNumber(forecast.find((point) => point.year === focusYear)?.students ?? 0)} in ${focusYear}.`;

  return (
    <svg className="chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={summary}>
      <path className="band" d={bandPath} />
      {[0, 0.5, 1].map((step) => {
        const value = yMin + (yMax - yMin) * step;
        const y = yOf(value);
        return (
          <g key={step}>
            <line x1={pad.l} x2={width - pad.r} y1={y} y2={y} className="grid" />
            <text x={pad.l - 8} y={y + 4} textAnchor="end">
              {formatNumber(value)}
            </text>
          </g>
        );
      })}
      <path className="past" d={line(history)} />
      <path className="future" d={line(forecast)} />
      <line className="marker" x1={xOf(today)} x2={xOf(today)} y1={pad.t} y2={height - pad.b} />
      <line className="focus" x1={xOf(focusYear)} x2={xOf(focusYear)} y1={pad.t} y2={height - pad.b} />
      {ticks.map((year) => (
        <text key={year} x={xOf(year)} y={height - 8} textAnchor="middle">
          {year}
        </text>
      ))}
    </svg>
  );
}
