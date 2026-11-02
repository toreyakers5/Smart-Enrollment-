import { Component, type ReactNode } from "react";
import { errorText } from "../lib/errors.ts";

type Props = { children: ReactNode; title: string };
type State = { error: Error | null };

export class SectionBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  retry = () => {
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) return this.props.children;
    const detail = errorText(this.state.error, "");
    return (
      <section className="gate inline" role="alert">
        <h2>{this.props.title}</h2>
        <p>
          That part of the page stopped. The year, pace, and other sections are still available.
          Try this section again, or choose another page.
        </p>
        {detail && <p className="fine">{detail}</p>}
        <button type="button" onClick={this.retry}>
          Try again
        </button>
      </section>
    );
  }
}
