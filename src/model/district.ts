export const GRADES = [
  "K",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "11",
  "12",
] as const;

export type Grade = (typeof GRADES)[number];
export type Level = "elementary" | "middle" | "high";

export const BASE_YEAR = 2026;
export const HORIZONS = [1, 3, 5] as const;
export type Horizon = (typeof HORIZONS)[number];
export type Scenario = "low" | "expected" | "high";

export const ELEMENTARY_GRADES: Grade[] = ["K", "1", "2", "3", "4", "5"];
export const MIDDLE_GRADES: Grade[] = ["6", "7", "8"];
export const HIGH_GRADES: Grade[] = ["9", "10", "11", "12"];

/** Share of students a newly occupied home typically adds, by grade. Sums to 1. */
export const HOUSING_GRADE_SHARE: Record<Grade, number> = {
  K: 0.12,
  "1": 0.11,
  "2": 0.1,
  "3": 0.09,
  "4": 0.08,
  "5": 0.07,
  "6": 0.08,
  "7": 0.07,
  "8": 0.06,
  "9": 0.07,
  "10": 0.06,
  "11": 0.05,
  "12": 0.04,
};

export const CONTEXT = {
  district: "Ashford Public Schools",
  studentsLabel: "fall headcount",
  attendanceRate: 0.946,
  teacherCost: 82_000,
  rideRate: 0.62,
  studentsPerBus: 46,
  charterName: "Lakeside Charter School",
  charterStudents: 430,
  charterNote:
    "Lakeside Charter has stayed near 430 students for five years. This forecast does not assume a new charter campus.",
  privateEstimate: 590,
  privateNote:
    "About 590 school-age children inside the district boundary attend private school. That share is higher in Old Town and Harbor.",
  jobsNote:
    "A clinic expansion in Northfield is adding about 400 jobs, which supports the housing already permitted. Employment in Harbor is flat.",
  unemployment: "3.8%",
};

export type FeederLink = {
  schoolId: string;
  share: number;
  ratio: number;
};

export type School = {
  id: string;
  name: string;
  shortName: string;
  level: Level;
  areaId: string;
  capacity: number;
  teachers: number;
  ratio: number;
  grades: Grade[];
  enrollment: Record<Grade, number>;
  history: { year: number; students: number }[];
  progression: Partial<Record<Grade, number>>;
  middleFeeders: FeederLink[];
  highFeeders: FeederLink[];
  births: Partial<Record<number, number>>;
  capture: number;
  context: string;
};

export type Area = {
  id: string;
  name: string;
  summary: string;
  medianAge: number;
  schoolAge: number;
  trend: string;
  economy: string;
};

export type HousingProject = {
  id: string;
  name: string;
  areaId: string;
  kind: string;
  units: number;
  yieldPerUnit: number;
  schedule: Record<number, number>;
  schools: { schoolId: string; share: number }[];
  note: string;
};

export type BoundaryOption = {
  fromId: string;
  toId: string;
  detail: string;
};

export type ConsolidationOption = {
  schoolIds: [string, string];
  detail: string;
};

function gradesOf(served: Grade[], values: number[]): Record<Grade, number> {
  const enrollment = Object.fromEntries(GRADES.map((grade) => [grade, 0])) as Record<
    Grade,
    number
  >;
  served.forEach((grade, index) => {
    enrollment[grade] = values[index] ?? 0;
  });
  return enrollment;
}

function history(values: number[]): { year: number; students: number }[] {
  return values.map((students, index) => ({
    year: BASE_YEAR - 4 + index,
    students,
  }));
}

const ELEMENTARY: Grade[] = ELEMENTARY_GRADES;
const MIDDLE: Grade[] = MIDDLE_GRADES;
const HIGH: Grade[] = HIGH_GRADES;

export const AREAS: Area[] = [
  {
    id: "northfield",
    name: "Northfield",
    summary:
      "The growth side of the district. Young families are moving into new houses and townhomes.",
    medianAge: 34,
    schoolAge: 2180,
    trend: "School-age population is rising about 2% a year.",
    economy:
      "A clinic expansion is adding about 400 jobs. Those jobs line up with the homes already permitted.",
  },
  {
    id: "pine-hills",
    name: "Pine Hills",
    summary: "An established family neighborhood with little new construction.",
    medianAge: 39,
    schoolAge: 1240,
    trend: "School-age population is about flat.",
    economy: "Few new homes or jobs. Enrollment follows the children already living here.",
  },
  {
    id: "west-meadow",
    name: "West Meadow",
    summary: "A stable neighborhood with one small cottage project on the schedule.",
    medianAge: 42,
    schoolAge: 1180,
    trend: "School-age population is easing down slightly.",
    economy: "Local employment is steady. Housing growth is limited to 40 cottages in 2028.",
  },
  {
    id: "old-town",
    name: "Old Town",
    summary: "Older households, fewer births, and apartments that bring few school-age children.",
    medianAge: 48,
    schoolAge: 960,
    trend: "School-age population is falling as households age.",
    economy:
      "New apartments are permitted. Similar buildings in this district have brought few students.",
  },
  {
    id: "harbor",
    name: "Harbor",
    summary: "The oldest part of the district, with the fewest births and the most empty classrooms.",
    medianAge: 52,
    schoolAge: 840,
    trend: "School-age population has been declining for several years.",
    economy: "Employment is flat. Most new permits are age-restricted homes.",
  },
];

export const SCHOOLS: School[] = [
  {
    id: "northfield-es",
    name: "Northfield Elementary",
    shortName: "Northfield ES",
    level: "elementary",
    areaId: "northfield",
    capacity: 660,
    teachers: 28,
    ratio: 22,
    grades: ELEMENTARY,
    enrollment: gradesOf(ELEMENTARY, [118, 110, 104, 98, 94, 90]),
    history: history([520, 544, 568, 592, 614]),
    progression: { "1": 1.012, "2": 1.012, "3": 1.012, "4": 1.012, "5": 1.012 },
    middleFeeders: [{ schoolId: "northfield-ms", share: 1, ratio: 0.99 }],
    highFeeders: [],
    births: {
      2018: 132,
      2019: 138,
      2020: 145,
      2021: 151,
      2022: 156,
      2023: 160,
      2024: 164,
      2025: 168,
      2026: 170,
    },
    capture: 0.78,
    context: "Serves the newest subdivisions north of Mercer Road.",
  },
  {
    id: "brookside-es",
    name: "Brookside Elementary",
    shortName: "Brookside ES",
    level: "elementary",
    areaId: "northfield",
    capacity: 540,
    teachers: 23,
    ratio: 22,
    grades: ELEMENTARY,
    enrollment: gradesOf(ELEMENTARY, [96, 90, 86, 82, 78, 74]),
    history: history([440, 456, 474, 490, 506]),
    progression: { "1": 1.01, "2": 1.01, "3": 1.01, "4": 1.01, "5": 1.01 },
    middleFeeders: [{ schoolId: "northfield-ms", share: 1, ratio: 0.99 }],
    highFeeders: [],
    births: {
      2018: 108,
      2019: 114,
      2020: 120,
      2021: 126,
      2022: 132,
      2023: 136,
      2024: 140,
      2025: 144,
      2026: 148,
    },
    capture: 0.76,
    context: "Townhome growth is planned on the east side of this attendance area.",
  },
  {
    id: "pinecrest-es",
    name: "Pinecrest Elementary",
    shortName: "Pinecrest ES",
    level: "elementary",
    areaId: "pine-hills",
    capacity: 620,
    teachers: 23,
    ratio: 22,
    grades: ELEMENTARY,
    enrollment: gradesOf(ELEMENTARY, [80, 81, 82, 82, 83, 82]),
    history: history([486, 488, 488, 490, 490]),
    progression: { "1": 1.004, "2": 1.004, "3": 1.004, "4": 1.004, "5": 1.004 },
    middleFeeders: [
      { schoolId: "northfield-ms", share: 0.7, ratio: 0.985 },
      { schoolId: "central-ms", share: 0.3, ratio: 0.985 },
    ],
    highFeeders: [],
    births: {
      2018: 102,
      2019: 104,
      2020: 103,
      2021: 104,
      2022: 104,
      2023: 105,
      2024: 104,
      2025: 105,
      2026: 106,
    },
    capture: 0.77,
    context: "Established neighborhood. A small infill project adds a few students later in the decade.",
  },
  {
    id: "meadowbrook-es",
    name: "Meadowbrook Elementary",
    shortName: "Meadowbrook ES",
    level: "elementary",
    areaId: "west-meadow",
    capacity: 600,
    teachers: 21,
    ratio: 22,
    grades: ELEMENTARY,
    enrollment: gradesOf(ELEMENTARY, [68, 72, 76, 78, 80, 82]),
    history: history([490, 482, 474, 464, 456]),
    progression: { "1": 0.998, "2": 0.998, "3": 0.998, "4": 0.998, "5": 0.998 },
    middleFeeders: [{ schoolId: "central-ms", share: 1, ratio: 0.98 }],
    highFeeders: [],
    births: {
      2018: 108,
      2019: 104,
      2020: 98,
      2021: 91,
      2022: 88,
      2023: 84,
      2024: 80,
      2025: 78,
      2026: 76,
    },
    capture: 0.75,
    context: "Stable family neighborhood on the west side, with room if a boundary needs to move.",
  },
  {
    id: "elm-es",
    name: "Elm Street Elementary",
    shortName: "Elm Street ES",
    level: "elementary",
    areaId: "old-town",
    capacity: 500,
    teachers: 18,
    ratio: 22,
    grades: ELEMENTARY,
    enrollment: gradesOf(ELEMENTARY, [40, 46, 52, 58, 64, 70]),
    history: history([420, 398, 374, 352, 330]),
    progression: { "1": 0.975, "2": 0.975, "3": 0.975, "4": 0.975, "5": 0.975 },
    middleFeeders: [{ schoolId: "central-ms", share: 1, ratio: 0.96 }],
    highFeeders: [],
    births: {
      2018: 86,
      2019: 78,
      2020: 70,
      2021: 59,
      2022: 54,
      2023: 48,
      2024: 44,
      2025: 42,
      2026: 40,
    },
    capture: 0.68,
    context:
      "Older neighborhood. Some families choose Lakeside Charter or private school after the elementary grades.",
  },
  {
    id: "harbor-es",
    name: "Harbor View Elementary",
    shortName: "Harbor View ES",
    level: "elementary",
    areaId: "harbor",
    capacity: 480,
    teachers: 16,
    ratio: 22,
    grades: ELEMENTARY,
    enrollment: gradesOf(ELEMENTARY, [34, 40, 48, 54, 60, 66]),
    history: history([390, 368, 346, 324, 302]),
    progression: { "1": 0.968, "2": 0.968, "3": 0.968, "4": 0.968, "5": 0.968 },
    middleFeeders: [{ schoolId: "central-ms", share: 1, ratio: 0.955 }],
    highFeeders: [],
    births: {
      2018: 80,
      2019: 72,
      2020: 64,
      2021: 52,
      2022: 46,
      2023: 42,
      2024: 38,
      2025: 36,
      2026: 34,
    },
    capture: 0.65,
    context: "Fewest young children in the district. Kindergarten classes get smaller each year.",
  },
  {
    id: "northfield-ms",
    name: "Northfield Middle",
    shortName: "Northfield MS",
    level: "middle",
    areaId: "northfield",
    capacity: 900,
    teachers: 25,
    ratio: 24,
    grades: MIDDLE,
    enrollment: gradesOf(MIDDLE, [210, 198, 188]),
    history: history([540, 554, 568, 582, 596]),
    progression: { "7": 1.012, "8": 1.012 },
    middleFeeders: [],
    highFeeders: [
      { schoolId: "ashford-hs", share: 0.85, ratio: 0.98 },
      { schoolId: "westlake-hs", share: 0.15, ratio: 0.98 },
    ],
    births: {},
    capture: 0,
    context: "Receives Northfield Elementary, Brookside Elementary, and most of Pinecrest.",
  },
  {
    id: "central-ms",
    name: "Central Middle",
    shortName: "Central MS",
    level: "middle",
    areaId: "old-town",
    capacity: 860,
    teachers: 34,
    ratio: 24,
    grades: MIDDLE,
    enrollment: gradesOf(MIDDLE, [250, 268, 286]),
    history: history([880, 860, 842, 822, 804]),
    progression: { "7": 0.99, "8": 0.99 },
    middleFeeders: [],
    highFeeders: [
      { schoolId: "ashford-hs", share: 0.35, ratio: 0.97 },
      { schoolId: "westlake-hs", share: 0.65, ratio: 0.97 },
    ],
    births: {},
    capture: 0,
    context: "Receives Elm Street, Harbor View, Meadowbrook, and part of Pinecrest.",
  },
  {
    id: "ashford-hs",
    name: "Ashford High",
    shortName: "Ashford HS",
    level: "high",
    areaId: "pine-hills",
    capacity: 1500,
    teachers: 43,
    ratio: 26,
    grades: HIGH,
    enrollment: gradesOf(HIGH, [262, 270, 276, 284]),
    history: history([1160, 1144, 1126, 1110, 1092]),
    progression: { "10": 0.992, "11": 0.992, "12": 0.992 },
    middleFeeders: [],
    highFeeders: [],
    births: {},
    capture: 0,
    context: "The larger high school. Most Northfield Middle students continue here.",
  },
  {
    id: "westlake-hs",
    name: "Westlake High",
    shortName: "Westlake HS",
    level: "high",
    areaId: "old-town",
    capacity: 1200,
    teachers: 36,
    ratio: 26,
    grades: HIGH,
    enrollment: gradesOf(HIGH, [214, 220, 226, 232]),
    history: history([980, 958, 936, 914, 892]),
    progression: { "10": 0.988, "11": 0.988, "12": 0.988 },
    middleFeeders: [],
    highFeeders: [],
    births: {},
    capture: 0,
    context: "More open seats than Ashford High. Most Central Middle students continue here.",
  },
];

export const HOUSING: HousingProject[] = [
  {
    id: "northfield-crossing",
    name: "Northfield Crossing",
    areaId: "northfield",
    kind: "Single-family homes",
    units: 420,
    yieldPerUnit: 0.52,
    schedule: { 2027: 80, 2028: 120, 2029: 120, 2030: 100 },
    schools: [
      { schoolId: "northfield-es", share: 0.6 },
      { schoolId: "brookside-es", share: 0.4 },
    ],
    note: "Largest project in the district. Homes are permitted and expected to sell over four years.",
  },
  {
    id: "brookside-towns",
    name: "Brookside Towns",
    areaId: "northfield",
    kind: "Townhomes",
    units: 180,
    yieldPerUnit: 0.3,
    schedule: { 2027: 60, 2028: 70, 2029: 50 },
    schools: [{ schoolId: "brookside-es", share: 1 }],
    note: "Townhomes bring fewer children per home than detached houses.",
  },
  {
    id: "mercer-infill",
    name: "Mercer Road infill",
    areaId: "pine-hills",
    kind: "Single-family homes",
    units: 60,
    yieldPerUnit: 0.4,
    schedule: { 2028: 30, 2029: 30 },
    schools: [{ schoolId: "pinecrest-es", share: 1 }],
    note: "Small infill along the Pinecrest and Northfield boundary.",
  },
  {
    id: "west-meadow-cottages",
    name: "West Meadow Cottages",
    areaId: "west-meadow",
    kind: "Single-family homes",
    units: 40,
    yieldPerUnit: 0.38,
    schedule: { 2028: 40 },
    schools: [{ schoolId: "meadowbrook-es", share: 1 }],
    note: "One-year occupancy. A modest addition to Meadowbrook.",
  },
  {
    id: "old-town-lofts",
    name: "Old Town Lofts",
    areaId: "old-town",
    kind: "Apartments",
    units: 140,
    yieldPerUnit: 0.12,
    schedule: { 2027: 80, 2028: 60 },
    schools: [{ schoolId: "elm-es", share: 1 }],
    note: "Many one-bedroom units. Apartments in Old Town have produced few students.",
  },
  {
    id: "harbor-senior",
    name: "Harbor Senior Commons",
    areaId: "harbor",
    kind: "Age-restricted homes",
    units: 80,
    yieldPerUnit: 0.02,
    schedule: { 2027: 40, 2028: 40 },
    schools: [{ schoolId: "harbor-es", share: 1 }],
    note: "Age-restricted housing. Permits here should not be read as future students.",
  },
];

export const BOUNDARY_OPTIONS: BoundaryOption[] = [
  {
    fromId: "northfield-es",
    toId: "pinecrest-es",
    detail:
      "The attendance areas meet along Mercer Road, so a change can follow a neighborhood edge.",
  },
  {
    fromId: "brookside-es",
    toId: "meadowbrook-es",
    detail: "Brookside’s west edge already borders Meadowbrook.",
  },
  {
    fromId: "ashford-hs",
    toId: "westlake-hs",
    detail:
      "Both high schools offer the same core program, which makes a boundary move more workable than it is in elementary school.",
  },
];

export const CONSOLIDATION_OPTIONS: ConsolidationOption[] = [
  {
    schoolIds: ["elm-es", "harbor-es"],
    detail:
      "The buildings are about 12 minutes apart in the older part of the district. A study should weigh empty seats against travel for young children and the cost of keeping both schools open.",
  },
];

export function schoolById(id: string): School {
  const school = SCHOOLS.find((item) => item.id === id);
  if (!school) throw new Error(`Unknown school ${id}`);
  return school;
}

export function areaById(id: string): Area {
  const area = AREAS.find((item) => item.id === id);
  if (!area) throw new Error(`Unknown area ${id}`);
  return area;
}

export function previousGrade(grade: Grade): Grade | null {
  const index = GRADES.indexOf(grade);
  return index <= 0 ? null : GRADES[index - 1];
}

export function gradeLevel(grade: Grade): Level {
  if (ELEMENTARY_GRADES.includes(grade)) return "elementary";
  if (MIDDLE_GRADES.includes(grade)) return "middle";
  return "high";
}

export function levelLabel(level: Level): string {
  switch (level) {
    case "elementary":
      return "Elementary";
    case "middle":
      return "Middle";
    case "high":
      return "High";
  }
}

export function validateDistrict(): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();

  const shareSum = HOUSING_GRADE_SHARE
    ? GRADES.reduce((sum, grade) => sum + HOUSING_GRADE_SHARE[grade], 0)
    : 0;
  if (Math.abs(shareSum - 1) > 0.001) {
    errors.push(`Housing grade shares sum to ${shareSum}`);
  }

  for (const school of SCHOOLS) {
    if (ids.has(school.id)) errors.push(`Duplicate school ${school.id}`);
    ids.add(school.id);
    const enrolled = GRADES.reduce((sum, grade) => sum + school.enrollment[grade], 0);
    const last = school.history[school.history.length - 1];
    if (!last || last.year !== BASE_YEAR || last.students !== enrolled) {
      errors.push(
        `${school.id} enrollment ${enrolled} does not match history ${last?.students}`,
      );
    }
    for (const grade of GRADES) {
      if (!school.grades.includes(grade) && school.enrollment[grade] !== 0) {
        errors.push(`${school.id} has students in unserved grade ${grade}`);
      }
    }
    const feederShares = (links: FeederLink[], label: string) => {
      if (!links.length) return;
      const total = links.reduce((sum, link) => sum + link.share, 0);
      if (Math.abs(total - 1) > 0.001) {
        errors.push(`${school.id} ${label} shares sum to ${total}`);
      }
    };
    feederShares(school.middleFeeders, "middle");
    feederShares(school.highFeeders, "high");
  }

  for (const project of HOUSING) {
    const scheduled = Object.values(project.schedule).reduce((sum, units) => sum + units, 0);
    if (scheduled !== project.units) {
      errors.push(`${project.id} schedule ${scheduled} does not match ${project.units} units`);
    }
    const share = project.schools.reduce((sum, item) => sum + item.share, 0);
    if (Math.abs(share - 1) > 0.001) {
      errors.push(`${project.id} school shares sum to ${share}`);
    }
  }

  return errors;
}
