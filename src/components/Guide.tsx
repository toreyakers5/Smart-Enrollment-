import type { FormEvent } from "react";
import type { SavedTurn } from "../lib/session.ts";
import { GUIDE_PROMPTS } from "../model/insights.ts";

type Turn = SavedTurn;

export function Guide({
  draft,
  turns,
  asking,
  questionError,
  onDraft,
  onAsk,
  onPrompt,
}: {
  draft: string;
  turns: Turn[];
  asking: boolean;
  questionError: string | null;
  onDraft: (value: string) => void;
  onAsk: (event: FormEvent) => void;
  onPrompt: (question: string) => void;
}) {
  return (
    <aside className="guide" aria-label="Forecast guide">
      <h2>Ask about this forecast</h2>
      <p>Answers come from the forecast on screen. Your question and the year you picked stay on this device after a refresh.</p>
      <div className="chips">
        {GUIDE_PROMPTS.map((prompt) => (
          <button key={prompt} type="button" disabled={asking} onClick={() => onPrompt(prompt)}>
            {prompt}
          </button>
        ))}
      </div>
      <form onSubmit={onAsk} noValidate aria-busy={asking}>
        <label htmlFor="ask">Your question</label>
        <textarea
          id="ask"
          name="question"
          value={draft}
          rows={3}
          maxLength={400}
          required
          disabled={asking}
          aria-invalid={Boolean(questionError)}
          aria-describedby={questionError ? "ask-error ask-help" : "ask-help"}
          onChange={(event) => onDraft(event.target.value)}
          placeholder="Example: Will Harbor View have room in three years?"
        />
        <p id="ask-help" className="fine">
          Use a few words, up to 400 characters.
        </p>
        {questionError && (
          <p id="ask-error" className="field-error" role="alert">
            {questionError}
          </p>
        )}
        <button type="submit" disabled={asking}>
          {asking ? "Answering…" : "Answer"}
        </button>
      </form>
      <div className="turns">
        {turns.map((turn) => {
          const paragraphs = Array.isArray(turn.answer?.paragraphs) ? turn.answer.paragraphs : null;
          if (!turn.answer?.title || !paragraphs) {
            return (
              <article key={turn.id}>
                <h3>{turn.question || "Saved question"}</h3>
                <p className="field-error" role="alert">
                  This saved answer could not be shown. Ask the question again.
                </p>
              </article>
            );
          }
          return (
            <article key={turn.id}>
              <h3>{turn.question}</h3>
              <p className="answer-title">{turn.answer.title}</p>
              {paragraphs.map((paragraph, index) => (
                <p key={`${turn.id}-${index}`}>{paragraph}</p>
              ))}
              {turn.answer.points && (
                <ul>
                  {turn.answer.points.map((point, index) => (
                    <li key={`${turn.id}-point-${index}`}>{point}</li>
                  ))}
                </ul>
              )}
            </article>
          );
        })}
      </div>
    </aside>
  );
}
