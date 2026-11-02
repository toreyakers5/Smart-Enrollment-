export function LoadingScreen() {
  return (
    <div className="app">
      <section className="gate" role="status" aria-live="polite">
        <p className="eyebrow">Smart Enrollment Forecast</p>
        <h1>Opening the forecast</h1>
        <p>Reading saved choices and calculating enrollment for 1, 3, and 5 years.</p>
        <div className="loading-bar" aria-hidden="true">
          <span />
        </div>
      </section>
    </div>
  );
}

export function ForecastProblem({ message, onReset }: { message: string; onReset: () => void }) {
  return (
    <section className="gate" role="alert">
      <h2>The forecast could not be calculated</h2>
      <p>
        The district records did not produce a complete forecast. You can clear saved choices and
        open the standard view.
      </p>
      <p className="fine">{message}</p>
      <button type="button" onClick={onReset}>
        Start over
      </button>
    </section>
  );
}
