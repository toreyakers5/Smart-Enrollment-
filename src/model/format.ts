export function formatNumber(value: number): string {
  return Math.round(value).toLocaleString("en-US");
}

export function formatSigned(value: number): string {
  const rounded = Math.round(value);
  if (rounded === 0) return "0";
  const body = Math.abs(rounded).toLocaleString("en-US");
  return rounded > 0 ? `+${body}` : `−${body}`;
}

export function formatPercent(value: number, digits = 0): string {
  const pct = value * 100;
  const rounded = Number(pct.toFixed(digits));
  if (rounded === 0) return `${(0).toFixed(digits)}%`;
  const body = Math.abs(rounded).toFixed(digits);
  return rounded > 0 ? `+${body}%` : `−${body}%`;
}

export function formatShare(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function formatMoney(value: number): string {
  const rounded = Math.round(value);
  const sign = rounded < 0 ? "−" : "";
  return `${sign}$${Math.abs(rounded).toLocaleString("en-US")}`;
}

function pluralWord(singular: string): string {
  if (/(s|x|ch|sh)$/.test(singular)) return `${singular}es`;
  return `${singular}s`;
}

export function plural(count: number, singular: string, pluralForm?: string): string {
  const n = Math.abs(Math.round(count));
  const word = n === 1 ? singular : pluralForm ?? pluralWord(singular);
  return `${n.toLocaleString("en-US")} ${word}`;
}

export function fallLabel(year: number): string {
  return `Fall ${year}`;
}

export function schoolYear(year: number): string {
  return `${year}–${String(year + 1).slice(-2)}`;
}

export type CapacityTone = "over" | "tight" | "ok" | "room";

export function capacityTone(utilization: number): CapacityTone {
  if (utilization >= 1) return "over";
  if (utilization >= 0.9) return "tight";
  if (utilization >= 0.75) return "ok";
  return "room";
}

export function capacityLabel(tone: CapacityTone): string {
  switch (tone) {
    case "over":
      return "Over capacity";
    case "tight":
      return "Nearly full";
    case "ok":
      return "Comfortable";
    case "room":
      return "Room to spare";
  }
}
