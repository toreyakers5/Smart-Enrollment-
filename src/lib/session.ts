import { AREAS, SCHOOLS, type Horizon, type Level, type Scenario } from "../model/district.ts";
import type { Answer } from "../model/insights.ts";
import { validateQuestion, validateSchoolQuery } from "./validate.ts";

export type PageId = "briefing" | "schools" | "grades" | "neighborhoods" | "decisions";
export type LevelFilter = "all" | Level;
export type SortKey = "full" | "up" | "down" | "name";

export type SavedTurn = {
  id: string;
  question: string;
  answer: Answer;
};

export type SavedSession = {
  horizon: Horizon;
  scenario: Scenario;
  page: PageId;
  schoolId: string;
  level: LevelFilter;
  sort: SortKey;
  schoolQuery: string;
  areaId: string;
  draft: string;
  turns: SavedTurn[];
};

const STORAGE_KEY = "smart-enrollment-forecast.session.v1";

const PAGES: PageId[] = ["briefing", "schools", "grades", "neighborhoods", "decisions"];
const HORIZONS: Horizon[] = [1, 3, 5];
const SCENARIOS: Scenario[] = ["expected", "low", "high"];
const LEVELS: LevelFilter[] = ["all", "elementary", "middle", "high"];
const SORTS: SortKey[] = ["full", "up", "down", "name"];

export const DEFAULT_SESSION: SavedSession = {
  horizon: 3,
  scenario: "expected",
  page: "briefing",
  schoolId: "northfield-es",
  level: "all",
  sort: "full",
  schoolQuery: "",
  areaId: "northfield",
  draft: "",
  turns: [],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function oneOf<T extends string | number>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.some((item) => item === value) ? (value as T) : fallback;
}

function cleanAnswer(value: unknown): Answer | null {
  if (!isRecord(value)) return null;
  if (typeof value.title !== "string" || value.title.length > 200) return null;
  if (!Array.isArray(value.paragraphs) || value.paragraphs.length > 6) return null;
  if (!value.paragraphs.every((item) => typeof item === "string" && item.length <= 2000)) return null;
  let points: string[] | undefined;
  if (value.points !== undefined) {
    if (!Array.isArray(value.points) || value.points.length > 12) return null;
    if (!value.points.every((item) => typeof item === "string" && item.length <= 2000)) return null;
    points = value.points;
  }
  return { title: value.title, paragraphs: value.paragraphs, points };
}

function cleanTurns(value: unknown): SavedTurn[] {
  if (!Array.isArray(value)) return [];
  const turns: SavedTurn[] = [];
  for (const item of value) {
    if (!isRecord(item)) continue;
    if (typeof item.id !== "string" || item.id.length > 80) continue;
    if (typeof item.question !== "string" || validateQuestion(item.question)) continue;
    const answer = cleanAnswer(item.answer);
    if (!answer) continue;
    turns.push({ id: item.id, question: item.question.trim(), answer });
    if (turns.length === 5) break;
  }
  return turns;
}

export function sanitizeSession(value: unknown): { session: SavedSession; repaired: boolean } {
  const source = isRecord(value) ? value : {};
  const schoolIds = new Set(SCHOOLS.map((school) => school.id));
  const areaIds = new Set(AREAS.map((area) => area.id));
  const schoolQuery = typeof source.schoolQuery === "string" ? source.schoolQuery.slice(0, 40) : "";
  const draft = typeof source.draft === "string" ? source.draft.slice(0, 400) : "";
  const session: SavedSession = {
    horizon: oneOf(source.horizon, HORIZONS, DEFAULT_SESSION.horizon),
    scenario: oneOf(source.scenario, SCENARIOS, DEFAULT_SESSION.scenario),
    page: oneOf(source.page, PAGES, DEFAULT_SESSION.page),
    schoolId: schoolIds.has(String(source.schoolId))
      ? String(source.schoolId)
      : DEFAULT_SESSION.schoolId,
    level: oneOf(source.level, LEVELS, DEFAULT_SESSION.level),
    sort: oneOf(source.sort, SORTS, DEFAULT_SESSION.sort),
    schoolQuery: validateSchoolQuery(schoolQuery) ? "" : schoolQuery,
    areaId: areaIds.has(String(source.areaId)) ? String(source.areaId) : DEFAULT_SESSION.areaId,
    draft,
    turns: cleanTurns(source.turns),
  };
  const repaired =
    !isRecord(value) ||
    session.horizon !== source.horizon ||
    session.scenario !== source.scenario ||
    session.page !== source.page ||
    session.schoolId !== source.schoolId ||
    session.level !== source.level ||
    session.sort !== source.sort ||
    session.schoolQuery !== source.schoolQuery ||
    session.areaId !== source.areaId ||
    session.draft !== source.draft ||
    JSON.stringify(session.turns) !== JSON.stringify(source.turns ?? []);
  return { session, repaired };
}

export function loadSession(): { session: SavedSession; notice: string | null } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { session: DEFAULT_SESSION, notice: null };
    const { session, repaired } = sanitizeSession(JSON.parse(raw) as unknown);
    return {
      session,
      notice: repaired
        ? "Some saved choices were out of date, so those were reset."
        : null,
    };
  } catch {
    return {
      session: DEFAULT_SESSION,
      notice: "Saved choices could not be read on this device. Showing the standard forecast.",
    };
  }
}

export function saveSession(session: SavedSession): string | null {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    return null;
  } catch {
    return "Choices could not be saved on this device. They will last until you refresh.";
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* The next reload still starts from the standard forecast. */
  }
}
