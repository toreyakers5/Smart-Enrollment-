const SCHOOL_QUERY = /^[\p{L}\p{N} .'-]*$/u;

export function validateSchoolQuery(value: string): string | null {
  if (value.length > 40) return "Use 40 characters or fewer for a school name.";
  if (!SCHOOL_QUERY.test(value)) {
    return "Use letters, numbers, spaces, or hyphens. This field finds a school name.";
  }
  return null;
}

export function validateQuestion(value: string): string | null {
  const text = value.trim();
  if (!text) return "Enter a question before asking for an answer.";
  if (text.length < 8) return "Write a fuller question, at least a few words.";
  if (text.length > 400) return "Shorten the question to 400 characters or fewer.";
  if (!/[A-Za-z]/.test(text)) return "Include words so the guide can match a school or a topic.";
  return null;
}
