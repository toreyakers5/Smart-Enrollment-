import {
  AREAS,
  BASE_YEAR,
  BOUNDARY_OPTIONS,
  CONSOLIDATION_OPTIONS,
  CONTEXT,
  GRADES,
  HOUSING,
  SCHOOLS,
  levelLabel,
  schoolById,
  type Grade,
  type Horizon,
  type Level,
  type Scenario,
  type School,
} from "./district.ts";
import {
  capacityLabel,
  capacityTone,
  fallLabel,
  formatMoney,
  formatNumber,
  formatPercent,
  formatShare,
  formatSigned,
  plural,
  schoolYear,
  type CapacityTone,
} from "./format.ts";
import {
  buildForecast,
  districtHistory,
  projectStudentYield,
  rideEstimate,
  type Forecast,
  type YearSnapshot,
} from "./forecast.ts";

export type Insight = {
  id: string;
  tone: "attention" | "watch" | "steady";
  kicker: string;
  title: string;
  text: string;
  action: string;
};

export type GradePoint = {
  grade: Grade;
  now: number;
  later: number;
  delta: number;
  origin: string;
  classesNow: number;
  classesLater: number;
};

export type SchoolRow = {
  id: string;
  name: string;
  shortName: string;
  level: Level;
  levelLabel: string;
  areaName: string;
  context: string;
  capacity: number;
  ratio: number;
  now: number;
  later: number;
  delta: number;
  deltaPct: number;
  utilization: number;
  tone: CapacityTone;
  status: string;
  teachersNow: number;
  teachersNeeded: number;
  teacherDelta: number;
  housingStudents: number;
  grades: GradePoint[];
  narrative: string;
  trend: { year: number; students: number }[];
};

export type AreaRow = {
  id: string;
  name: string;
  summary: string;
  medianAge: number;
  schoolAge: number;
  trend: string;
  economy: string;
  now: number;
  later: number;
  delta: number;
  deltaPct: number;
  births2018: number;
  births2026: number;
  capture: number;
  nextSchools: string;
  projects: {
    id: string;
    name: string;
    kind: string;
    units: number;
    students: number;
    occupied: number;
    note: string;
  }[];
};

export type BoundaryIdea = {
  id: string;
  fromName: string;
  toName: string;
  move: number;
  overflow: number;
  text: string;
};

export type ConsolidationIdea = {
  title: string;
  text: string;
  action: string;
  ready: boolean;
};

export type TransportNote = {
  id: string;
  title: string;
  text: string;
};

export type Answer = {
  title: string;
  paragraphs: string[];
  points?: string[];
};

export type ViewModel = {
  horizon: Horizon;
  scenario: Scenario;
  scenarioNote: string;
  year: number;
  baselineYear: number;
  totalNow: number;
  totalLater: number;
  delta: number;
  deltaPct: number;
  low: number;
  high: number;
  housingEffect: number;
  overSeats: number;
  openSeats: number;
  lead: string;
  gradesIntro: string;
  insights: Insight[];
  schools: SchoolRow[];
  grades: {
    grade: Grade;
    now: number;
    later: number;
    delta: number;
    origin: string;
  }[];
  areas: AreaRow[];
  boundaries: BoundaryIdea[];
  boundaryEmpty: string;
  consolidation: ConsolidationIdea | null;
  consolidationEmpty: string;
  transport: TransportNote[];
  netTeachers: number;
  hireCost: number;
  history: { year: number; students: number }[];
  forecastLine: { year: number; students: number }[];
  lowLine: { year: number; students: number }[];
  highLine: { year: number; students: number }[];
  source: {
    active: Forecast;
    bare: Forecast;
    low: Forecast;
    high: Forecast;
  };
};

export const GUIDE_PROMPTS = [
  "Which schools will be overcrowded?",
  "How many teachers should we plan for?",
  "What will new housing do to enrollment?",
  "Where could a boundary change help?",
  "How reliable is the five-year forecast?",
];

const packs = {
  expected: buildForecast("expected"),
  low: buildForecast("low"),
  high: buildForecast("high"),
  expectedBare: buildForecast("expected", { housingScale: 0 }),
  lowBare: buildForecast("low", { housingScale: 0 }),
  highBare: buildForecast("high", { housingScale: 0 }),
};

export function scenarioLabel(scenario: Scenario): string {
  switch (scenario) {
    case "low":
      return "Slower";
    case "expected":
      return "Expected";
    case "high":
      return "Faster";
  }
}

function scenarioNote(scenario: Scenario): string {
  switch (scenario) {
    case "expected":
      return "Expected pace: homes are occupied on the permit schedule, and families keep choosing district schools at today’s rate.";
    case "low":
      return "Slower pace: homes fill more slowly, and a few more families choose charter or private schools.";
    case "high":
      return "Faster pace: homes fill ahead of schedule, and a few more families choose district schools.";
  }
}

function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

function gradeSpoken(grade: Grade): string {
  return grade === "K" ? "kindergarten" : `grade ${grade}`;
}

function originFor(grade: Grade, horizon: Horizon): string {
  const index = GRADES.indexOf(grade) - horizon;
  if (index >= 0) {
    const prior = GRADES[index];
    return prior === "K" ? "These students are in kindergarten now" : `These students are in grade ${prior} now`;
  }
  return "Most of these children are not in school yet";
}

function at(forecast: Forecast, horizon: Horizon): YearSnapshot {
  return forecast.future[horizon - 1];
}

function lineFrom(forecast: Forecast): { year: number; students: number }[] {
  return [
    { year: forecast.baseline.year, students: forecast.baseline.total },
    ...forecast.future.map((year) => ({ year: year.year, students: year.total })),
  ];
}

function capacitySentence(tone: CapacityTone, utilization: number, capacity: number): string {
  const share = `${formatShare(utilization)} of its ${formatNumber(capacity)}-student capacity`;
  switch (tone) {
    case "over":
      return `That puts the building over capacity, at ${share}.`;
    case "tight":
      return `That leaves the building nearly full, at ${share}.`;
    case "ok":
      return `The building stays in a comfortable range, at ${share}.`;
    case "room":
      return `The building would have room to spare, at ${share}.`;
  }
}

function schoolNarrative(
  school: School,
  now: number,
  later: number,
  utilization: number,
  housing: number,
  year: number,
): string {
  const delta = later - now;
  const direction =
    delta === 0
      ? "stay about the same size"
      : delta > 0
        ? `gain ${plural(delta, "student")}`
        : `lose ${plural(Math.abs(delta), "student")}`;
  const housingLine =
    housing >= 15
      ? ` New homes account for about ${plural(housing, "student")} in this forecast.`
      : school.level === "elementary" && delta <= -20
        ? " New homes in this area bring very few students."
        : "";
  return `${school.name} is projected to ${direction} by ${fallLabel(year)}. ${capacitySentence(capacityTone(utilization), utilization, school.capacity)}${housingLine} ${school.context}`;
}

export function buildView(horizon: Horizon, scenario: Scenario): ViewModel {
  const active = packs[scenario];
  const bare =
    scenario === "low" ? packs.lowBare : scenario === "high" ? packs.highBare : packs.expectedBare;
  const future = at(active, horizon);
  const bareYear = at(bare, horizon);
  const baseline = active.baseline;
  const lowYear = at(packs.low, horizon);
  const highYear = at(packs.high, horizon);
  const delta = future.total - baseline.total;
  const history = districtHistory();

  const schools: SchoolRow[] = SCHOOLS.map((school) => {
    const nowSnap = baseline.schools[school.id];
    const laterSnap = future.schools[school.id];
    const housingStudents = laterSnap.enrollment - bareYear.schools[school.id].enrollment;
    const tone = capacityTone(laterSnap.utilization);
    const trend = [
      ...school.history,
      ...active.future.map((year) => ({
        year: year.year,
        students: year.schools[school.id].enrollment,
      })),
    ];
    return {
      id: school.id,
      name: school.name,
      shortName: school.shortName,
      level: school.level,
      levelLabel: levelLabel(school.level),
      areaName: AREAS.find((area) => area.id === school.areaId)?.name ?? "",
      context: school.context,
      capacity: school.capacity,
      ratio: school.ratio,
      now: nowSnap.enrollment,
      later: laterSnap.enrollment,
      delta: laterSnap.enrollment - nowSnap.enrollment,
      deltaPct: (laterSnap.enrollment - nowSnap.enrollment) / nowSnap.enrollment,
      utilization: laterSnap.utilization,
      tone,
      status: capacityLabel(tone),
      teachersNow: school.teachers,
      teachersNeeded: laterSnap.teachersNeeded,
      teacherDelta: laterSnap.teacherDelta,
      housingStudents,
      grades: school.grades.map((grade) => {
        const now = nowSnap.grades[grade];
        const later = laterSnap.grades[grade];
        return {
          grade,
          now,
          later,
          delta: later - now,
          origin: originFor(grade, horizon),
          classesNow: school.level === "elementary" ? Math.ceil(now / school.ratio) : 0,
          classesLater: school.level === "elementary" ? Math.ceil(later / school.ratio) : 0,
        };
      }),
      narrative: schoolNarrative(
        school,
        nowSnap.enrollment,
        laterSnap.enrollment,
        laterSnap.utilization,
        housingStudents,
        future.year,
      ),
      trend,
    };
  });

  let overSeats = 0;
  let openSeats = 0;
  for (const school of schools) {
    overSeats += Math.max(0, school.later - school.capacity);
    openSeats += Math.max(0, school.capacity - school.later);
  }

  const growing = [...schools].sort((a, b) => b.delta - a.delta)[0];
  const shrinking = [...schools].sort((a, b) => a.delta - b.delta)[0];
  const direction =
    delta >= 80 ? "grow" : delta <= -80 ? "ease down" : "stay about the same size";
  const historyClause =
    history[0] && baseline.total < history[0].students - 40
      ? ` Enrollment has already eased from ${formatNumber(history[0].students)} in ${fallLabel(history[0].year)}.`
      : "";
  const growingClause =
    growing && growing.delta >= 10
      ? ` ${growing.name} gains ${plural(growing.delta, "student")}.`
      : "";
  const shrinkingClause =
    shrinking && shrinking.delta <= -10
      ? ` ${shrinking.name} loses ${plural(Math.abs(shrinking.delta), "student")}.`
      : "";
  const lead = `In ${horizon === 1 ? "one year" : `${horizon} years`}, ${CONTEXT.district} is projected to ${direction}: ${formatNumber(future.total)} students in ${fallLabel(future.year)}, ${formatSigned(delta)} (${formatPercent(delta / baseline.total, 1)}) from ${formatNumber(baseline.total)} today. The range is ${formatNumber(lowYear.total)} to ${formatNumber(highYear.total)}.${growingClause}${shrinkingClause}${historyClause}`;

  const gradeRows = GRADES.map((grade) => ({
    grade,
    now: baseline.grades[grade],
    later: future.grades[grade],
    delta: future.grades[grade] - baseline.grades[grade],
    origin: originFor(grade, horizon),
  }));
  const biggestGrade = [...gradeRows].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))[0];
  const growingElementaries = schools.filter(
    (school) => school.level === "elementary" && school.delta >= 25,
  );
  const decliningElementaries = schools.filter(
    (school) => school.level === "elementary" && school.delta <= -25,
  );
  const gradeNote =
    biggestGrade && Math.abs(biggestGrade.delta) >= 25
      ? ` Across the whole district, ${gradeSpoken(biggestGrade.grade)} changes the most (${formatSigned(biggestGrade.delta)}). ${biggestGrade.origin}.`
      : "";
  const gradesIntro =
    growingElementaries.length > 0 && decliningElementaries.length > 0
      ? `District grade totals hide a split. ${joinNames(growingElementaries.map((school) => school.shortName))} are gaining students, while ${joinNames(decliningElementaries.map((school) => school.shortName))} are losing them.${gradeNote}`
      : biggestGrade
        ? `${gradeSpoken(biggestGrade.grade)} changes the most, ${formatSigned(biggestGrade.delta)} students. ${biggestGrade.origin}.`
        : "Grade counts are steady across the district.";

  const areas: AreaRow[] = AREAS.map((area) => {
    const elementaries = SCHOOLS.filter(
      (school) => school.areaId === area.id && school.level === "elementary",
    );
    const now = elementaries.reduce((sum, school) => sum + baseline.schools[school.id].enrollment, 0);
    const later = elementaries.reduce((sum, school) => sum + future.schools[school.id].enrollment, 0);
    let births2018 = 0;
    let births2026 = 0;
    let captured = 0;
    for (const school of elementaries) {
      const early = school.births[2018] ?? 0;
      const recent = school.births[2026] ?? 0;
      births2018 += early;
      births2026 += recent;
      captured += recent * school.capture;
    }
    const nextIds = new Set<string>();
    for (const school of elementaries) {
      for (const link of school.middleFeeders) nextIds.add(link.schoolId);
    }
    return {
      id: area.id,
      name: area.name,
      summary: area.summary,
      medianAge: area.medianAge,
      schoolAge: area.schoolAge,
      trend: area.trend,
      economy: area.economy,
      now,
      later,
      delta: later - now,
      deltaPct: now === 0 ? 0 : (later - now) / now,
      births2018,
      births2026,
      capture: births2026 === 0 ? 0 : captured / births2026,
      nextSchools: joinNames([...nextIds].map((id) => schoolById(id).name)),
      projects: HOUSING.filter((project) => project.areaId === area.id).map((project) => ({
        id: project.id,
        name: project.name,
        kind: project.kind,
        units: project.units,
        students: Math.round(projectStudentYield(project.id)),
        occupied: Object.entries(project.schedule).reduce((sum, [year, units]) => {
          const occ = Number(year);
          return occ > BASE_YEAR && occ <= future.year ? sum + units : sum;
        }, 0),
        note: project.note,
      })),
    };
  });

  const boundaries = boundaryIdeas(future);
  const consolidation = consolidationIdea(baseline, future);
  const modelBase: ViewModel = {
    horizon,
    scenario,
    scenarioNote: scenarioNote(scenario),
    year: future.year,
    baselineYear: baseline.year,
    totalNow: baseline.total,
    totalLater: future.total,
    delta,
    deltaPct: delta / baseline.total,
    low: lowYear.total,
    high: highYear.total,
    housingEffect: future.total - bareYear.total,
    overSeats,
    openSeats,
    lead,
    gradesIntro,
    insights: [],
    schools,
    grades: gradeRows,
    areas,
    boundaries,
    boundaryEmpty:
      boundaries.length > 0
        ? ""
        : `No boundary move is large enough to recommend for ${fallLabel(future.year)}. Overflows of a single class are a staffing question. Revisit boundaries when a school is a wing over capacity.`,
    consolidation,
    consolidationEmpty: consolidation
      ? ""
      : "A consolidation study is not the next step in this window. Keep both older elementary schools open and watch the three- and five-year forecasts.",
    transport: transportNotes(baseline, future),
    netTeachers: schools.reduce((sum, school) => sum + school.teacherDelta, 0),
    hireCost: schools
      .filter((school) => school.teacherDelta > 0)
      .reduce((sum, school) => sum + school.teacherDelta * CONTEXT.teacherCost, 0),
    history,
    forecastLine: lineFrom(active),
    lowLine: lineFrom(packs.low),
    highLine: lineFrom(packs.high),
    source: { active, bare, low: packs.low, high: packs.high },
  };
  modelBase.insights = collectInsights(modelBase);
  return modelBase;
}

function boundaryIdeas(future: YearSnapshot): BoundaryIdea[] {
  const ideas: BoundaryIdea[] = [];
  for (const option of BOUNDARY_OPTIONS) {
    const from = schoolById(option.fromId);
    const to = schoolById(option.toId);
    const overflow = Math.round(future.schools[from.id].enrollment - from.capacity);
    const spare = Math.round(to.capacity - future.schools[to.id].enrollment);
    if (overflow < 40 || spare < 40) continue;
    const move = Math.min(overflow, Math.round(spare * 0.45));
    if (move < 30) continue;
    const coverage = move >= overflow * 0.85 ? "most of" : "part of";
    ideas.push({
      id: `${from.id}-${to.id}`,
      fromName: from.shortName,
      toName: to.shortName,
      move,
      overflow,
      text: `Moving about ${plural(move, "student")} from ${from.name} to ${to.name} would cover ${coverage} the overflow of ${plural(overflow, "student")} and still leave room at ${to.name}. ${option.detail}`,
    });
  }
  return ideas;
}

function consolidationIdea(baseline: YearSnapshot, future: YearSnapshot): ConsolidationIdea | null {
  for (const option of CONSOLIDATION_OPTIONS) {
    const schools = option.schoolIds.map((id) => schoolById(id));
    const enrollments = schools.map((school) => future.schools[school.id].enrollment);
    const combined = enrollments[0] + enrollments[1];
    const larger = Math.max(schools[0].capacity, schools[1].capacity);
    const under = schools.every(
      (school) => future.schools[school.id].enrollment / school.capacity < 0.7,
    );
    const declining = schools.every(
      (school) =>
        future.schools[school.id].enrollment < baseline.schools[school.id].enrollment - 15,
    );
    if (!under || !declining) continue;
    const names = joinNames(schools.map((school) => school.name));
    if (combined <= larger * 0.88) {
      const host = schools[0].capacity >= schools[1].capacity ? schools[0] : schools[1];
      return {
        ready: true,
        title: `${names} could fit in one building`,
        text: `Together they are projected to serve ${plural(combined, "student")} in ${fallLabel(future.year)}. ${host.name} can hold ${formatNumber(host.capacity)}. ${option.detail}`,
        action:
          "If the board studies consolidation, include travel for elementary students, program access, and the cost of operating two partly filled buildings.",
      };
    }
    return {
      ready: false,
      title: `${names} are losing students`,
      text: `Together they are still projected to serve ${plural(combined, "student")} in ${fallLabel(future.year)}, which is more than either building can hold. Keep both schools open in this window.`,
      action:
        "Use the empty seats in a boundary conversation only where the neighborhoods actually touch. Review a one-building option when a later forecast shows the combined enrollment fitting.",
    };
  }
  return null;
}

function transportNotes(baseline: YearSnapshot, future: YearSnapshot): TransportNote[] {
  const notes: TransportNote[] = [];
  const north = ["northfield-es", "brookside-es"];
  const extra = north.reduce(
    (sum, id) => sum + future.schools[id].enrollment - baseline.schools[id].enrollment,
    0,
  );
  const buses = rideEstimate(extra);
  if (buses >= 1) {
    notes.push({
      id: "north-buses",
      title: `About ${plural(buses, "additional bus", "additional buses")} in Northfield`,
      text: `Elementary enrollment in Northfield is projected to rise by ${plural(extra, "student")} by ${fallLabel(future.year)}. At a ${formatShare(CONTEXT.rideRate)} ridership rate and about ${CONTEXT.studentsPerBus} students per bus, that is about ${plural(buses, "bus")}. Recheck routes when the first new homes are occupied.`,
    });
  }
  const harborDrop =
    baseline.schools["harbor-es"].enrollment - future.schools["harbor-es"].enrollment;
  const elmDrop = baseline.schools["elm-es"].enrollment - future.schools["elm-es"].enrollment;
  const routeParts: string[] = [];
  if (harborDrop >= 30) {
    routeParts.push(`Harbor View is projected to lose ${plural(harborDrop, "student")}`);
  }
  if (elmDrop >= 30) {
    routeParts.push(`Elm Street is projected to lose ${plural(elmDrop, "student")}`);
  }
  if (routeParts.length) {
    notes.push({
      id: "older-routes",
      title: "Review routes in the older neighborhoods",
      text: `${joinNames(routeParts)}. That is enough to review whether two routes can be combined, while keeping a stop for the younger children who still live there.`,
    });
  }
  return notes;
}

function collectInsights(view: ViewModel): Insight[] {
  return [
    buildingInsight(view),
    splitInsight(view),
    staffingInsight(view),
    housingInsight(view),
    boundaryInsight(view),
    centralInsight(view),
    consolidationInsight(view),
    highSchoolInsight(view),
    transportInsight(view),
  ].filter((insight): insight is Insight => insight !== null);
}

function buildingInsight(view: ViewModel): Insight | null {
  const y1 = view.source.active.future[0];
  const y3 = view.source.active.future[2];
  const y5 = view.source.active.future[4];
  const soon = SCHOOLS.filter((school) => y1.schools[school.id].utilization >= 0.98);
  const mid = SCHOOLS.filter((school) => y3.schools[school.id].utilization >= 1);
  const later = SCHOOLS.filter((school) => y5.schools[school.id].utilization >= 1);
  if (!soon.length && !mid.length && !later.length) return null;

  const phrase = (school: School, year: YearSnapshot) => {
    const over = Math.round(year.schools[school.id].enrollment - school.capacity);
    if (over > 0) return `${school.shortName} by about ${plural(over, "student")}`;
    return `${school.shortName} essentially full`;
  };
  const sentences: string[] = [];
  if (soon.length) {
    sentences.push(`Next fall the overflow is limited: ${joinNames(soon.map((school) => phrase(school, y1)))}.`);
  }
  if (mid.length) {
    sentences.push(
      `By ${fallLabel(y3.year)}, ${joinNames(mid.map((school) => `${school.shortName} is at ${formatShare(y3.schools[school.id].utilization)}`))}.`,
    );
  }
  if (later.length) {
    sentences.push(
      `By ${fallLabel(y5.year)}, ${joinNames(later.map((school) => `${school.shortName} is at ${formatShare(y5.schools[school.id].utilization)}`))}.`,
    );
  }
  const midOverflow = mid.reduce(
    (sum, school) => sum + Math.max(0, y3.schools[school.id].enrollment - school.capacity),
    0,
  );
  const action =
    midOverflow >= 80
      ? `Add the extra class sections for next fall. Start an addition and a boundary study for the ${fallLabel(y3.year)} crowd. A portable can cover one large kindergarten year. The later years are larger than that.`
      : "Add class sections for next fall, and check spring kindergarten registration before designing an addition.";
  return {
    id: "buildings",
    tone: "attention",
    kicker: "Buildings",
    title: `${joinNames((mid.length ? mid : soon).map((school) => school.shortName))} need a space plan`,
    text: sentences.join(" "),
    action,
  };
}

function splitInsight(view: ViewModel): Insight | null {
  const growing = [...view.schools].sort((a, b) => b.delta - a.delta)[0];
  const shrinking = [...view.schools].sort((a, b) => a.delta - b.delta)[0];
  if (!growing || !shrinking || growing.delta < 40 || shrinking.delta > -40) return null;
  const seats =
    view.overSeats >= 20 && view.openSeats >= 150
      ? ` About ${plural(view.overSeats, "student")} would be over capacity, while other buildings would still have ${plural(view.openSeats, "empty seat")}.`
      : "";
  return {
    id: "split",
    tone: "attention",
    kicker: "Enrollment",
    title: "Growth and decline are happening together",
    text: `${growing.shortName} is projected to gain ${plural(growing.delta, "student")} by ${fallLabel(view.year)}. ${shrinking.shortName} is projected to lose ${plural(Math.abs(shrinking.delta), "student")}.${seats}`,
    action: "Make staffing, boundary, and building decisions from the school numbers. The district total blends these patterns together.",
  };
}

function staffingInsight(view: ViewModel): Insight | null {
  const hires = view.schools.filter((school) => school.teacherDelta >= 2);
  const frees = view.schools.filter((school) => school.teacherDelta <= -2);
  if (!hires.length && !frees.length) return null;
  const future = at(view.source.active, view.horizon);
  const sentences: string[] = [];
  if (hires.length) {
    sentences.push(
      joinNames(
        hires
          .sort((a, b) => b.teacherDelta - a.teacherDelta)
          .map((school) => `${school.shortName} needs ${plural(school.teacherDelta, "more teacher")}`),
      ) + ".",
    );
  }
  if (frees.length) {
    const listed = [...frees].sort((a, b) => a.teacherDelta - b.teacherDelta).slice(0, 3);
    sentences.push(
      `${joinNames(listed.map((school) => `${school.shortName} can leave ${plural(Math.abs(school.teacherDelta), "position")} unfilled as people leave`))}.`,
    );
  }
  const misleading = (["elementary", "middle", "high"] as const).some((level) => {
    const rows = view.schools.filter((school) => school.level === level);
    const added = rows.reduce((sum, school) => sum + Math.max(0, school.teacherDelta), 0);
    const dropped = rows.reduce((sum, school) => sum + Math.min(0, school.teacherDelta), 0);
    return added >= 3 && dropped <= -3;
  });
  if (misleading) {
    sentences.push("A district-wide teacher total hides that split.");
  }
  const hireCount = hires.reduce((sum, school) => sum + school.teacherDelta, 0);
  if (hireCount > 0) {
    sentences.push(
      `Hiring those ${plural(hireCount, "teacher")} is about ${formatMoney(hireCount * CONTEXT.teacherCost)} a year at ${formatMoney(CONTEXT.teacherCost)} average salary and benefits.`,
    );
  }
  return {
    id: "staffing",
    tone: hires.length ? "attention" : "watch",
    kicker: "Staffing",
    title: `Staffing for ${fallLabel(future.year)}`,
    text: sentences.join(" "),
    action:
      "Write the staffing request by school. Refill openings where enrollment is rising before refilling openings where enrollment is falling. Elementary, middle, and high school certificates are separate plans.",
  };
}

function dwelling(kind: string, count: number): string {
  if (kind.startsWith("Apartment")) return plural(count, "apartment");
  if (kind.startsWith("Townhome")) return plural(count, "townhome");
  return plural(count, "home");
}

function housingInsight(view: ViewModel): Insight | null {
  const y3 = at(view.source.bare, 3);
  const active3 = view.source.active.future[2];
  const effect = view.housingEffect;
  const effect3 = active3.total - y3.total;
  if (effect < 25 && effect3 < 40) return null;
  const ranked = HOUSING.map((project) => ({
    project,
    students: Math.round(projectStudentYield(project.id)),
  })).sort((a, b) => b.students - a.students);
  const top = ranked[0];
  const quiet = ranked.filter((item) => item.students < 25).slice(0, 2);
  const landed = view.schools
    .filter((school) => school.housingStudents >= 20)
    .sort((a, b) => b.housingStudents - a.housingStudents)
    .slice(0, 3);
  const quietText = quiet.length
    ? ` ${quiet
        .map(
          (item) =>
            `${item.project.name} is ${dwelling(item.project.kind, item.project.units)} and about ${plural(item.students, "student")}`,
        )
        .join(". ")}.`
    : "";
  const where = landed.length
    ? ` Most of those students show up at ${joinNames(landed.map((school) => school.shortName))}.`
    : "";
  const timing =
    view.horizon === 1 && effect3 > effect + 40
      ? ` Next year that effect is about ${plural(effect, "student")}. By ${fallLabel(active3.year)} it is about ${plural(effect3, "student")}.`
      : ` In the ${fallLabel(view.year)} forecast, new homes account for about ${plural(effect, "student")}.`;
  return {
    id: "housing",
    tone: "watch",
    kicker: "Housing",
    title: "Count children, not building permits",
    text: `${top.project.name} is ${dwelling(top.project.kind, top.project.units)} and about ${plural(top.students, "student")}.${quietText}${timing}${where}`,
    action:
      "Ask the planning department twice a year which phases will actually be occupied. A delayed phase moves this forecast more than a small change in births.",
  };
}

function boundaryInsight(view: ViewModel): Insight | null {
  if (!view.boundaries.length) return null;
  return {
    id: "boundary",
    tone: "watch",
    kicker: "Boundaries",
    title:
      view.boundaries.length === 1
        ? `Sketch a boundary between ${view.boundaries[0].fromName} and ${view.boundaries[0].toName}`
        : "Two boundary sketches are worth drawing",
    text: view.boundaries.map((idea) => idea.text).join(" "),
    action:
      "Bring the board one map and the number of students who would change schools. Wait to adopt a boundary until that count is in the room.",
  };
}

function centralInsight(view: ViewModel): Insight | null {
  const school = schoolById("central-ms");
  const now = view.source.active.baseline.schools[school.id];
  const y3 = view.source.active.future[2].schools[school.id];
  const y5 = view.source.active.future[4].schools[school.id];
  if (now.utilization < 0.9 || y3.utilization > now.utilization - 0.08) return null;
  return {
    id: "central",
    tone: "steady",
    kicker: "Buildings",
    title: "Central Middle is full because of the older grades",
    text: `Central Middle is at ${formatShare(now.utilization)} this year. By ${fallLabel(BASE_YEAR + 3)} it is projected at ${formatShare(y3.utilization)}, and by ${fallLabel(BASE_YEAR + 5)} at ${formatShare(y5.utilization)}. The large classes are already in the older grades and will leave.`,
    action:
      "Staff Central Middle for the students enrolled now. Keep an addition off the plan. The building gains room as those classes move on.",
  };
}

function consolidationInsight(view: ViewModel): Insight | null {
  if (!view.consolidation) return null;
  return {
    id: "consolidation",
    tone: view.consolidation.ready ? "watch" : "steady",
    kicker: "Buildings",
    title: view.consolidation.title,
    text: view.consolidation.text,
    action: view.consolidation.action,
  };
}

function highSchoolInsight(view: ViewModel): Insight | null {
  const y5 = view.source.active.future[4];
  const y3 = view.source.active.future[2];
  const highs = SCHOOLS.filter((school) => school.level === "high");
  const elementaryPressure = SCHOOLS.some(
    (school) => school.level === "elementary" && y3.schools[school.id].utilization >= 1,
  );
  if (!elementaryPressure || highs.some((school) => y5.schools[school.id].utilization >= 0.9)) {
    return null;
  }
  return {
    id: "high-school",
    tone: "steady",
    kicker: "Buildings",
    title: "High school space can wait",
    text: `${joinNames(
      highs.map(
        (school) =>
          `${school.shortName} is projected at ${formatShare(y5.schools[school.id].utilization)} in ${fallLabel(y5.year)}`,
      ),
    )}. Kindergarten students in the crowded elementary schools reach ninth grade after this five-year window.`,
    action: "Keep a high school addition off this planning cycle and review it when those elementary classes reach middle school.",
  };
}

function transportInsight(view: ViewModel): Insight | null {
  if (!view.transport.length) return null;
  const first = view.transport[0];
  return {
    id: "transport",
    tone: "watch",
    kicker: "Transportation",
    title: first.title,
    text: view.transport.map((note) => note.text).join(" "),
    action: "Ask transportation for a route sketch tied to the first occupied phase of Northfield Crossing, before the homes are full.",
  };
}

function horizonInQuestion(question: string, fallback: Horizon): Horizon {
  const q = question.toLowerCase();
  if (/\b(next year|1[- ]year|one[- ]year)\b/.test(q)) return 1;
  if (/\b(5[- ]year|five[- ]year)\b/.test(q)) return 5;
  if (/\b(3[- ]year|three[- ]year)\b/.test(q)) return 3;
  return fallback;
}

function mentionedSchools(question: string): School[] {
  const q = question.toLowerCase();
  const named = SCHOOLS.filter(
    (school) => q.includes(school.name.toLowerCase()) || q.includes(school.shortName.toLowerCase()),
  );
  if (named.length) return named;
  let partial = SCHOOLS.filter((school) => {
    const token = school.name.toLowerCase().split(" ")[0];
    return token.length > 3 && q.includes(token);
  });
  if (q.includes("elementary")) partial = partial.filter((school) => school.level === "elementary");
  if (q.includes("middle")) partial = partial.filter((school) => school.level === "middle");
  if (q.includes("high school")) partial = partial.filter((school) => school.level === "high");
  if (partial.length === 1 && partial[0].id === "ashford-hs" && !q.includes("high")) return [];
  return partial;
}

export function answerQuestion(question: string, view: ViewModel): Answer {
  const q = question.toLowerCase().trim();
  if (!q) {
    return {
      title: "Ask about a decision",
      paragraphs: [
        "Ask which schools will be crowded, how many teachers to plan for, what the new homes mean, or whether a boundary change is worth a map.",
      ],
    };
  }
  const horizon = horizonInQuestion(q, view.horizon);
  const schools = mentionedSchools(q);
  if (schools.length) return schoolAnswer(schools, view, horizon);
  if (/\b(trust|reliab|accurat|sure|confidence|range|what if)\b/.test(q)) return trustAnswer(view, horizon);
  if (/\b(teacher|staff|hire|fte|section)\b/.test(q)) return staffingAnswer(view, horizon);
  if (/\b(hous|permit|subdivision|rooftop|apartment|development)\b/.test(q)) return housingAnswer(view, horizon);
  if (/\bboundar/.test(q)) return boundaryAnswer(view, horizon);
  if (/\b(consolidat|close|underused|empty seat|half full)\b/.test(q)) return consolidationAnswer(view, horizon);
  if (/\b(bus|transport|route)\b/.test(q)) return transportAnswer(view, horizon);
  if (q.includes("crowd") || /\b(capacity|full|space|portable|addition|classroom)s?\b/.test(q)) {
    return capacityAnswer(view, horizon);
  }
  if (/\b(grade|kindergarten|cohort|class)\b/.test(q)) return gradeAnswer(view, horizon);
  if (/\b(charter|private)\b/.test(q)) return choiceAnswer();
  if (/\b(budget|cost|money|dollar)\b/.test(q)) return staffingAnswer(view, horizon);
  if (q.includes("high school")) return schoolAnswer(SCHOOLS.filter((school) => school.level === "high"), view, horizon);
  return overviewAnswer(view, horizon);
}

function schoolAnswer(schools: School[], view: ViewModel, horizon: Horizon): Answer {
  const future = at(view.source.active, horizon);
  const bare = at(view.source.bare, horizon);
  const points = schools.map((school) => {
    const now = view.source.active.baseline.schools[school.id];
    const later = future.schools[school.id];
    const delta = later.enrollment - now.enrollment;
    const housing = later.enrollment - bare.schools[school.id].enrollment;
    const housingClause =
      housing >= 10 ? ` New homes account for about ${plural(housing, "student")} here.` : "";
    return `${school.name}: ${formatNumber(now.enrollment)} today, ${formatNumber(later.enrollment)} in ${fallLabel(future.year)} (${formatSigned(delta)}), ${formatShare(later.utilization)} of capacity, ${formatSigned(later.teacherDelta)} teachers.${housingClause} ${school.context}`;
  });
  return {
    title: schools.length === 1 ? schools[0].name : "Those schools",
    paragraphs: [
      `Here is the ${scenarioLabel(view.scenario).toLowerCase()} pace for ${fallLabel(future.year)} (${schoolYear(future.year)}).`,
    ],
    points,
  };
}

function trustAnswer(view: ViewModel, horizon: Horizon): Answer {
  const future = at(view.source.active, horizon);
  const low = at(view.source.low, horizon);
  const high = at(view.source.high, horizon);
  const spread = (high.total - low.total) / future.total;
  const confidence =
    horizon === 1 || spread < 0.04
      ? "The one-year figure is the right number to staff with. Those students are already enrolled in a younger grade, or they are next year’s kindergarten from births already recorded."
      : "The further out you look, the more the number depends on which homes are actually occupied and whether families choose district schools.";
  return {
    title: `How sure is ${fallLabel(future.year)}?`,
    paragraphs: [
      `The ${scenarioLabel(view.scenario).toLowerCase()} forecast is ${formatNumber(future.total)} students. The range is ${formatNumber(low.total)} to ${formatNumber(high.total)}.`,
      `${confidence} Each class moves up a grade using that school’s recent pattern of who stays and who leaves. Kindergarten comes from births and the share of families who choose Ashford. New homes add students at the rates similar homes have produced. The forecast leaves Lakeside Charter at about ${formatNumber(CONTEXT.charterStudents)} students and does not assume a new charter campus or a surprise employer.`,
    ],
  };
}

function staffingAnswer(view: ViewModel, horizon: Horizon): Answer {
  const future = at(view.source.active, horizon);
  const rows = SCHOOLS.map((school) => ({
    school,
    delta: future.schools[school.id].teacherDelta,
  }));
  const hires = rows.filter((row) => row.delta >= 1).sort((a, b) => b.delta - a.delta);
  const frees = rows.filter((row) => row.delta <= -1).sort((a, b) => a.delta - b.delta);
  const hireCount = hires.reduce((sum, row) => sum + row.delta, 0);
  return {
    title: `Teachers for ${fallLabel(future.year)}`,
    paragraphs: [
      hireCount > 0
        ? `Schools that are growing need ${plural(hireCount, "more teacher")}, about ${formatMoney(hireCount * CONTEXT.teacherCost)} a year at ${formatMoney(CONTEXT.teacherCost)} average salary and benefits. This is a planning estimate, separate from the contract schedule.`
        : `No school needs an added teacher for ${fallLabel(future.year)} under the ${scenarioLabel(view.scenario).toLowerCase()} pace.`,
      "Compare each school with the teachers working there today. Leave positions unfilled where enrollment is falling, and open positions where students are arriving. An elementary opening and a high school opening are different hiring plans.",
    ],
    points: [
      ...hires.map((row) => `${row.school.shortName}: add ${plural(row.delta, "teacher")}`),
      ...frees.map(
        (row) => `${row.school.shortName}: ${plural(Math.abs(row.delta), "position")} can go unfilled as people leave`,
      ),
    ],
  };
}

function housingAnswer(view: ViewModel, horizon: Horizon): Answer {
  const future = at(view.source.active, horizon);
  const bare = at(view.source.bare, horizon);
  const effect = future.total - bare.total;
  const points = HOUSING.map((project) => {
    const students = Math.round(projectStudentYield(project.id));
    return `${project.name}: ${dwelling(project.kind, project.units)}, about ${plural(students, "student")} if the project fills. ${project.note}`;
  });
  return {
    title: "What the new homes mean",
    paragraphs: [
      `Under the ${scenarioLabel(view.scenario).toLowerCase()} pace, homes occupied by ${fallLabel(future.year)} account for about ${plural(effect, "student")} in that year’s enrollment.`,
      "A single-family house in this district brings far more students than an apartment or an age-restricted home. Permits are a housing count. Enrollment follows the children those homes usually hold.",
    ],
    points,
  };
}

function boundaryAnswer(view: ViewModel, horizon: Horizon): Answer {
  const future = at(view.source.active, horizon);
  const ideas = boundaryIdeas(future);
  if (!ideas.length) {
    return {
      title: `Boundaries for ${fallLabel(future.year)}`,
      paragraphs: [
        `No boundary move is large enough to recommend for ${fallLabel(future.year)}. Schools that are only a class over capacity are a staffing question first.`,
        "Northfield Elementary meets Pinecrest along Mercer Road, and Brookside meets Meadowbrook on its west edge. Those are the pairs to sketch if the three-year forecast still shows a wing of overflow.",
      ],
    };
  }
  return {
    title: `Boundaries for ${fallLabel(future.year)}`,
    paragraphs: [
      "A boundary change is a way to use empty seats that already exist. It works when the neighborhoods share an edge and the receiving school still has room after the move.",
    ],
    points: ideas.map((idea) => idea.text),
  };
}

function consolidationAnswer(view: ViewModel, horizon: Horizon): Answer {
  const idea = consolidationIdea(view.source.active.baseline, at(view.source.active, horizon));
  if (!idea) {
    return {
      title: "Consolidation",
      paragraphs: [
        "The forecast does not support closing a school in this window. Empty seats and a school closing are different decisions, especially for young children.",
      ],
    };
  }
  return {
    title: idea.title,
    paragraphs: [idea.text, idea.action],
  };
}

function transportAnswer(view: ViewModel, horizon: Horizon): Answer {
  const notes = transportNotes(view.source.active.baseline, at(view.source.active, horizon));
  if (!notes.length) {
    return {
      title: "Transportation",
      paragraphs: ["Enrollment shifts in this window are too small to add or combine a bus on the planning rule used here."],
    };
  }
  return {
    title: "Transportation",
    paragraphs: notes.map((note) => note.text),
  };
}

function capacityAnswer(view: ViewModel, horizon: Horizon): Answer {
  const future = at(view.source.active, horizon);
  const rows = SCHOOLS.map((school) => ({
    school,
    util: future.schools[school.id].utilization,
    enrollment: future.schools[school.id].enrollment,
  })).sort((a, b) => b.util - a.util);
  const crowded = rows.filter((row) => row.util >= 0.98);
  return {
    title: `Space in ${fallLabel(future.year)}`,
    paragraphs: [
      crowded.length
        ? `${joinNames(crowded.map((row) => row.school.shortName))} ${crowded.length === 1 ? "is" : "are"} at or over capacity in ${fallLabel(future.year)}.`
        : `No school is over capacity in ${fallLabel(future.year)} under the ${scenarioLabel(view.scenario).toLowerCase()} pace.`,
      "Capacity here means program capacity: the number of students the building can serve in regular classes. Central Middle can look full this year because its older grades are large, then gain room as those students leave.",
    ],
    points: rows.slice(0, 5).map(
      (row) =>
        `${row.school.shortName}: ${formatNumber(row.enrollment)} students, ${formatShare(row.util)} of ${formatNumber(row.school.capacity)}`,
    ),
  };
}

function gradeAnswer(view: ViewModel, horizon: Horizon): Answer {
  const future = at(view.source.active, horizon);
  const baseline = view.source.active.baseline;
  const rows = GRADES.map((grade) => ({
    grade,
    delta: future.grades[grade] - baseline.grades[grade],
    later: future.grades[grade],
  })).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  const top = rows[0];
  return {
    title: `Grades in ${fallLabel(future.year)}`,
    paragraphs: [
      top
        ? `${gradeSpoken(top.grade)} changes the most district-wide, ${formatSigned(top.delta)} students, to ${formatNumber(top.later)}. ${originFor(top.grade, horizon)}.`
        : "Grade counts are steady.",
      "District grade totals can look calm while one elementary school is gaining a class and another is losing one. Check the school page before you set sections.",
    ],
    points: rows.slice(0, 4).map((row) => `${gradeSpoken(row.grade)}: ${formatSigned(row.delta)}`),
  };
}

function choiceAnswer(): Answer {
  return {
    title: "Charter and private enrollment",
    paragraphs: [
      `${CONTEXT.charterName} enrolls about ${formatNumber(CONTEXT.charterStudents)} students, and that count has been flat. ${CONTEXT.charterNote}`,
      CONTEXT.privateNote + " Those patterns are already built into the grade-to-grade ratios. A ratio under 1.00 means more students leave than move in between grades.",
    ],
  };
}

function overviewAnswer(view: ViewModel, horizon: Horizon): Answer {
  const future = at(view.source.active, horizon);
  const delta = future.total - view.source.active.baseline.total;
  return {
    title: `${CONTEXT.district} in ${fallLabel(future.year)}`,
    paragraphs: [
      `The ${scenarioLabel(view.scenario).toLowerCase()} forecast is ${formatNumber(future.total)} students, ${formatSigned(delta)} from today. The range is ${formatNumber(at(view.source.low, horizon).total)} to ${formatNumber(at(view.source.high, horizon).total)}.`,
      horizon === view.horizon && view.insights[0]
        ? `${view.insights[0].text} ${view.insights[0].action}`
        : "The school and decision pages list buildings, teachers, boundaries, and buses for the year selected at the top.",
    ],
  };
}

