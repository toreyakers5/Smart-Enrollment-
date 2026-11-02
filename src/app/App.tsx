import { FormEvent, useEffect, useRef, useState } from "react";
import "../styles/app.css";
import { CONTEXT, type Horizon, type Scenario } from "../model/district.ts";
import {
  clearSession,
  loadSession,
  saveSession,
  type LevelFilter,
  type PageId,
  type SavedTurn,
  type SortKey,
} from "../lib/session.ts";
import { errorText, runUserAction } from "../lib/errors.ts";
import { validateQuestion, validateSchoolQuery } from "../lib/validate.ts";
import { fallLabel, schoolYear } from "../model/format.ts";
import { answerQuestion, buildView, scenarioLabel, type ViewModel } from "../model/insights.ts";
import { Guide } from "../components/Guide.tsx";
import { SectionBoundary } from "../components/SectionBoundary.tsx";
import { ForecastProblem, LoadingScreen } from "../components/StatusScreens.tsx";
import { Briefing } from "../pages/Briefing.tsx";
import { DecisionsPage } from "../pages/DecisionsPage.tsx";
import { GradesPage } from "../pages/GradesPage.tsx";
import { NeighborhoodsPage } from "../pages/NeighborhoodsPage.tsx";
import { SchoolsPage } from "../pages/SchoolsPage.tsx";

type Turn = SavedTurn;

function newTurnId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  } catch {
    /* Some browsers block randomUUID outside a secure page. */
  }
  return `turn-${Date.now().toString(36)}-${Math.random().toString(16).slice(2)}`;
}

const PAGES: { id: PageId; label: string }[] = [
  { id: "briefing", label: "Briefing" },
  { id: "schools", label: "Schools" },
  { id: "grades", label: "Grades" },
  { id: "neighborhoods", label: "Neighborhoods" },
  { id: "decisions", label: "Decisions" },
];

const PAGE_TITLE: Record<PageId, string> = {
  briefing: "Briefing",
  schools: "Schools",
  grades: "Grades",
  neighborhoods: "Neighborhoods",
  decisions: "Decisions",
};

export default function App() {
  const restored = useState(loadSession)[0];
  const [horizon, setHorizon] = useState<Horizon>(restored.session.horizon);
  const [scenario, setScenario] = useState<Scenario>(restored.session.scenario);
  const [page, setPage] = useState<PageId>(restored.session.page);
  const [schoolId, setSchoolId] = useState(restored.session.schoolId);
  const [level, setLevel] = useState<LevelFilter>(restored.session.level);
  const [sort, setSort] = useState<SortKey>(restored.session.sort);
  const [schoolQuery, setSchoolQuery] = useState(restored.session.schoolQuery);
  const [areaId, setAreaId] = useState(restored.session.areaId);
  const [draft, setDraft] = useState(restored.session.draft);
  const [turns, setTurns] = useState<Turn[]>(restored.session.turns);
  const [notice, setNotice] = useState<string | null>(restored.notice);
  const [saveWarning, setSaveWarning] = useState<string | null>(null);
  const [view, setView] = useState<ViewModel | null>(null);
  const [forecastError, setForecastError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [questionError, setQuestionError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  function perform(action: () => void, fallback: string) {
    runUserAction(action, setActionError, fallback);
  }

  useEffect(() => {
    let active = true;
    setUpdating(true);
    const timer = window.setTimeout(() => {
      if (!active) return;
      try {
        setView(buildView(horizon, scenario));
        setForecastError(null);
      } catch (error) {
        setForecastError(errorText(error, "The forecast could not be calculated."));
      } finally {
        if (active) setUpdating(false);
      }
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [horizon, scenario]);

  useEffect(() => {
    if (!view && !forecastError) return;
    setSaveWarning(
      saveSession({
        horizon,
        scenario,
        page,
        schoolId,
        level,
        sort,
        schoolQuery: validateSchoolQuery(schoolQuery) ? "" : schoolQuery,
        areaId,
        draft,
        turns,
      }),
    );
  }, [
    view,
    forecastError,
    horizon,
    scenario,
    page,
    schoolId,
    level,
    sort,
    schoolQuery,
    areaId,
    draft,
    turns,
  ]);

  function ask(text: string) {
    if (asking) {
      setQuestionError("An answer is already being prepared. Wait a moment, then ask again.");
      return;
    }
    if (!view) {
      setQuestionError("The forecast is not ready yet. Wait until the numbers appear, then ask again.");
      return;
    }
    const problem = validateQuestion(text);
    if (problem) {
      setQuestionError(problem);
      return;
    }
    const question = text.trim();
    const currentView = view;
    setQuestionError(null);
    setActionError(null);
    setAsking(true);
    window.setTimeout(() => {
      if (!mounted.current) return;
      try {
        const answer = answerQuestion(question, currentView);
        if (!answer.title.trim() || answer.paragraphs.length === 0) {
          setQuestionError("That question did not produce an answer. Try one of the suggested questions.");
          return;
        }
        setTurns((current) =>
          [...current, { id: newTurnId(), question, answer }].slice(-5),
        );
        setDraft("");
      } catch (error) {
        setQuestionError(
          errorText(error, "That question could not be answered from this forecast. Try it again."),
        );
      } finally {
        if (mounted.current) setAsking(false);
      }
    }, 0);
  }

  function onAsk(event: FormEvent) {
    event.preventDefault();
    ask(draft);
  }

  function onDraft(value: string) {
    perform(() => {
      setDraft(value);
      if (questionError) setQuestionError(null);
    }, "That question could not be edited. Try it again.");
  }

  if (!view && !forecastError) {
    return <LoadingScreen />;
  }

  return (
    <div className="app">
      <a className="skip" href="#content">
        Skip to content
      </a>
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <span className="mark" aria-hidden="true">
              SE
            </span>
            <div>
              <p className="eyebrow">Smart Enrollment Forecast</p>
              <h1>{CONTEXT.district}</h1>
            </div>
          </div>
          <div className="controls">
            <div className="segment" role="group" aria-label="Forecast horizon">
              {([1, 3, 5] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  aria-pressed={horizon === item}
                  onClick={() => perform(() => setHorizon(item), "That year could not be opened. Try it again.")}
                >
                  <strong>{item === 1 ? "1 year" : `${item} years`}</strong>
                  <span>{fallLabel(2026 + item)}</span>
                </button>
              ))}
            </div>
            <div className="segment pace" role="group" aria-label="Growth pace">
              {(["expected", "low", "high"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  aria-pressed={scenario === item}
                  onClick={() =>
                    perform(() => setScenario(item), "That pace could not be opened. Try it again.")
                  }
                >
                  {scenarioLabel(item)}
                </button>
              ))}
            </div>
          </div>
        </div>
        <nav className="tabs" aria-label="Sections">
          {PAGES.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-current={page === item.id ? "page" : undefined}
              onClick={() => perform(() => setPage(item.id), "That page could not be opened. Try it again.")}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </header>

      <div className="layout">
        <main id="content" aria-busy={updating}>
          {notice && (
            <p className="banner warn" role="status">
              {notice}
              <button type="button" onClick={() => perform(() => setNotice(null), "That notice could not be closed.")}>
                Dismiss
              </button>
            </p>
          )}
          {saveWarning && (
            <p className="banner warn" role="alert">
              {saveWarning}
            </p>
          )}
          {actionError && (
            <p className="banner warn" role="alert">
              {actionError}
              <button type="button" onClick={() => setActionError(null)}>
                Dismiss
              </button>
            </p>
          )}
          {updating && view && (
            <p className="status-line" role="status">
              Updating the forecast…
            </p>
          )}
          {forecastError || !view ? (
            <ForecastProblem
              message={forecastError ?? "The forecast is not ready."}
              onReset={() =>
              perform(() => {
                clearSession();
                window.location.reload();
              }, "The page could not be reset. Refresh the browser to open the standard forecast.")
            }
            />
          ) : (
            <>
              <p className="banner">
                Sample district for practice. Ashford Public Schools is fictional. The forecast moves
                each class up a grade, estimates kindergarten from births, and adds students from new
                homes.
              </p>
              <p className="when">
                <span>
                  {fallLabel(view.year)} · {schoolYear(view.year)}
                </span>
                <span>{scenarioLabel(view.scenario)} pace</span>
              </p>
              <h2 className="page-title">{PAGE_TITLE[page]}</h2>
              <SectionBoundary key={`${page}-${view.year}-${view.scenario}`} title="This section could not be drawn">
                {page === "briefing" && <Briefing view={view} />}
                {page === "schools" && (
                  <SchoolsPage
                    view={view}
                    schoolId={schoolId}
                    level={level}
                    sort={sort}
                    query={schoolQuery}
                    onSchool={(id) => perform(() => setSchoolId(id), "That school could not be opened.")}
                    onLevel={(next) => perform(() => setLevel(next), "That school level could not be applied.")}
                    onSort={(next) => perform(() => setSort(next), "That sort could not be applied.")}
                    onQuery={(next) => perform(() => setSchoolQuery(next), "That school name could not be used.")}
                  />
                )}
                {page === "grades" && <GradesPage view={view} />}
                {page === "neighborhoods" && (
                  <NeighborhoodsPage
                    view={view}
                    areaId={areaId}
                    onArea={(id) => perform(() => setAreaId(id), "That neighborhood could not be opened.")}
                  />
                )}
                {page === "decisions" && <DecisionsPage view={view} />}
              </SectionBoundary>
            </>
          )}
        </main>
        {view && (
          <SectionBoundary title="The guide could not be drawn">
            <Guide
              draft={draft}
              turns={turns}
              asking={asking}
              questionError={questionError}
              onDraft={onDraft}
              onAsk={onAsk}
              onPrompt={ask}
            />
          </SectionBoundary>
        )}
      </div>
    </div>
  );
}
