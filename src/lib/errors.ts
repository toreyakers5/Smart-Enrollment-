export function errorText(error: unknown, fallback: string): string {
  if (error instanceof Error && error.name !== "TypeError" && error.name !== "ReferenceError") {
    const message = error.message.trim();
    if (message && message.length <= 240) return message;
  }
  return fallback;
}

export function runUserAction(
  action: () => void,
  report: (message: string | null) => void,
  fallback: string,
): void {
  try {
    action();
    report(null);
  } catch (error) {
    report(errorText(error, fallback));
  }
}
