import {
  AREAS,
  BASE_YEAR,
  CONTEXT,
  GRADES,
  HOUSING,
  HOUSING_GRADE_SHARE,
  SCHOOLS,
  gradeLevel,
  previousGrade,
  validateDistrict,
  type Grade,
  type Scenario,
} from "./district.ts";

export type Grades = Record<Grade, number>;

export type SchoolSnapshot = {
  enrollment: number;
  grades: Grades;
  utilization: number;
  teachersNeeded: number;
  teacherDelta: number;
  housingAdded: number;
  birthsKindergarten: number;
};

export type YearSnapshot = {
  year: number;
  schools: Record<string, SchoolSnapshot>;
  grades: Grades;
  areas: Record<string, number>;
  total: number;
  housingStudents: number;
  kindergartenFromBirths: number;
};

export type Forecast = {
  scenario: Scenario;
  baseline: YearSnapshot;
  future: YearSnapshot[];
};

type Roster = Record<string, Grades>;

const problems = validateDistrict();
if (problems.length) {
  throw new Error(`District data is inconsistent:\n${problems.join("\n")}`);
}

const schoolMap = new Map(SCHOOLS.map((school) => [school.id, school]));

function blankGrades(): Grades {
  return {
    K: 0,
    "1": 0,
    "2": 0,
    "3": 0,
    "4": 0,
    "5": 0,
    "6": 0,
    "7": 0,
    "8": 0,
    "9": 0,
    "10": 0,
    "11": 0,
    "12": 0,
  };
}

function blankRoster(): Roster {
  return Object.fromEntries(SCHOOLS.map((school) => [school.id, blankGrades()]));
}

function applyRatio(base: number, delta: number): number {
  return Math.min(1.12, Math.max(0.84, base + delta));
}

const SCENARIO_SETTINGS: Record<
  Scenario,
  { housing: number; progressionDelta: number; captureDelta: number }
> = {
  low: { housing: 0.62, progressionDelta: -0.012, captureDelta: -0.035 },
  expected: { housing: 1, progressionDelta: 0, captureDelta: 0 },
  high: { housing: 1.18, progressionDelta: 0.01, captureDelta: 0.025 },
};

function teachersNeeded(enrollment: number, ratio: number): number {
  if (enrollment <= 0) return 0;
  return Math.ceil(enrollment / ratio);
}

function snapshot(
  year: number,
  roster: Roster,
  housingBySchool: Record<string, number>,
  birthsBySchool: Record<string, number>,
  housingStudents: number,
): YearSnapshot {
  const schools: Record<string, SchoolSnapshot> = {};
  const grades = blankGrades();
  const areas = Object.fromEntries(AREAS.map((area) => [area.id, 0]));
  let total = 0;
  let kindergartenFromBirths = 0;

  for (const school of SCHOOLS) {
    const gradeCounts = blankGrades();
    let enrollment = 0;
    for (const grade of school.grades) {
      const count = roster[school.id][grade];
      gradeCounts[grade] = count;
      grades[grade] += count;
      enrollment += count;
    }
    schools[school.id] = {
      enrollment,
      grades: gradeCounts,
      utilization: enrollment / school.capacity,
      teachersNeeded: teachersNeeded(enrollment, school.ratio),
      teacherDelta: teachersNeeded(enrollment, school.ratio) - school.teachers,
      housingAdded: housingBySchool[school.id] ?? 0,
      birthsKindergarten: birthsBySchool[school.id] ?? 0,
    };
    total += enrollment;
    kindergartenFromBirths += birthsBySchool[school.id] ?? 0;
    if (school.level === "elementary") {
      areas[school.areaId] += enrollment;
    }
  }

  return {
    year,
    schools,
    grades,
    areas,
    total,
    housingStudents,
    kindergartenFromBirths,
  };
}

function addHousing(
  next: Roster,
  housingBySchool: Record<string, number>,
  year: number,
  housingScale: number,
): number {
  let added = 0;
  for (const project of HOUSING) {
    const units = (project.schedule[year] ?? 0) * housingScale;
    if (units <= 0) continue;
    const students = units * project.yieldPerUnit;
    added += students;
    for (const grade of GRADES) {
      const portion = students * HOUSING_GRADE_SHARE[grade];
      const level = gradeLevel(grade);
      for (const dest of project.schools) {
        const elementary = schoolMap.get(dest.schoolId);
        if (!elementary) continue;
        if (level === "elementary") {
          const amount = portion * dest.share;
          next[elementary.id][grade] += amount;
          housingBySchool[elementary.id] += amount;
          continue;
        }
        for (const middleLink of elementary.middleFeeders) {
          if (level === "middle") {
            const amount = portion * dest.share * middleLink.share;
            next[middleLink.schoolId][grade] += amount;
            housingBySchool[middleLink.schoolId] += amount;
            continue;
          }
          const middle = schoolMap.get(middleLink.schoolId);
          if (!middle) continue;
          for (const highLink of middle.highFeeders) {
            const amount = portion * dest.share * middleLink.share * highLink.share;
            next[highLink.schoolId][grade] += amount;
            housingBySchool[highLink.schoolId] += amount;
          }
        }
      }
    }
  }
  return added;
}

function step(
  current: Roster,
  year: number,
  settings: { housing: number; progressionDelta: number; captureDelta: number },
): {
  roster: Roster;
  housingBySchool: Record<string, number>;
  birthsBySchool: Record<string, number>;
  housingStudents: number;
} {
  const next = blankRoster();
  const housingBySchool = Object.fromEntries(SCHOOLS.map((school) => [school.id, 0]));
  const birthsBySchool = Object.fromEntries(SCHOOLS.map((school) => [school.id, 0]));

  for (const school of SCHOOLS) {
    for (const grade of school.grades) {
      const prior = previousGrade(grade);
      if (!prior || !school.grades.includes(prior)) continue;
      const ratio = applyRatio(school.progression[grade] ?? 1, settings.progressionDelta);
      next[school.id][grade] += current[school.id][prior] * ratio;
    }
    for (const link of school.middleFeeders) {
      const ratio = applyRatio(link.ratio, settings.progressionDelta);
      next[link.schoolId]["6"] += current[school.id]["5"] * link.share * ratio;
    }
    for (const link of school.highFeeders) {
      const ratio = applyRatio(link.ratio, settings.progressionDelta);
      next[link.schoolId]["9"] += current[school.id]["8"] * link.share * ratio;
    }
  }

  for (const school of SCHOOLS) {
    if (school.level !== "elementary") continue;
    const births = school.births[year - 5];
    if (births == null) {
      throw new Error(`Missing births for ${school.id} in ${year - 5}`);
    }
    const capture = Math.min(0.95, Math.max(0.4, school.capture + settings.captureDelta));
    const kindergarten = Math.round(births * capture);
    next[school.id].K += kindergarten;
    birthsBySchool[school.id] = kindergarten;
  }

  const housingStudents = addHousing(next, housingBySchool, year, settings.housing);

  for (const school of SCHOOLS) {
    for (const grade of GRADES) {
      next[school.id][grade] = school.grades.includes(grade)
        ? Math.max(0, Math.round(next[school.id][grade]))
        : 0;
    }
  }

  return { roster: next, housingBySchool, birthsBySchool, housingStudents };
}

function baselineRoster(): Roster {
  const roster = blankRoster();
  for (const school of SCHOOLS) {
    for (const grade of GRADES) roster[school.id][grade] = school.enrollment[grade];
  }
  return roster;
}

export function buildForecast(
  scenario: Scenario,
  options?: { housingScale?: number },
): Forecast {
  const settings = { ...SCENARIO_SETTINGS[scenario] };
  if (options?.housingScale != null) settings.housing = options.housingScale;

  const birthsBySchool = Object.fromEntries(
    SCHOOLS.map((school) => [school.id, school.level === "elementary" ? school.enrollment.K : 0]),
  );
  const housingBySchool = Object.fromEntries(SCHOOLS.map((school) => [school.id, 0]));
  let roster = baselineRoster();
  const baseline = snapshot(BASE_YEAR, roster, housingBySchool, birthsBySchool, 0);
  const future: YearSnapshot[] = [];

  for (let year = BASE_YEAR + 1; year <= BASE_YEAR + 5; year += 1) {
    const stepped = step(roster, year, settings);
    roster = stepped.roster;
    future.push(
      snapshot(
        year,
        roster,
        stepped.housingBySchool,
        stepped.birthsBySchool,
        stepped.housingStudents,
      ),
    );
  }

  return { scenario, baseline, future };
}

export function horizonYear(forecast: Forecast, yearsAhead: number): YearSnapshot {
  const year = forecast.future[yearsAhead - 1];
  if (!year) throw new Error(`No forecast for +${yearsAhead} years`);
  return year;
}

export function districtHistory(): { year: number; students: number }[] {
  const years = SCHOOLS[0]?.history.map((point) => point.year) ?? [];
  return years.map((year) => ({
    year,
    students: SCHOOLS.reduce(
      (sum, school) => sum + (school.history.find((point) => point.year === year)?.students ?? 0),
      0,
    ),
  }));
}

export function projectStudentYield(projectId: string): number {
  const project = HOUSING.find((item) => item.id === projectId);
  if (!project) return 0;
  return project.units * project.yieldPerUnit;
}

export function rideEstimate(extraStudents: number): number {
  if (extraStudents <= 0) return 0;
  return Math.max(1, Math.round((extraStudents * CONTEXT.rideRate) / CONTEXT.studentsPerBus));
}
