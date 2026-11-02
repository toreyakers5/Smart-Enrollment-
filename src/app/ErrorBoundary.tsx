import { Component, type ReactNode } from "react";
import { clearSession } from "../lib/session.ts";

type Props = { children: ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  reset = () => {
    try {
      clearSession();
      window.location.reload();
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : "The page could not be reset. Refresh the browser to open the standard forecast.";
      this.setState({ error: new Error(message) });
    }
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="app">
        <section className="gate" role="alert">
          <p className="eyebrow">Smart Enrollment Forecast</p>
          <h1>This page hit a problem</h1>
          <p>
            The forecast screen stopped while drawing. Your saved choices can be cleared and the
            page opened again.
          </p>
          <p className="fine">{this.state.error.message}</p>
          <button type="button" onClick={this.reset}>
            Start over
          </button>
        </section>
      </div>
    );
  }
}
