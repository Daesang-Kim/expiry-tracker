export const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Strips everything but digits and inserts hyphens as YYYY-MM-DD, so the user only ever types numbers. */
export function formatDateInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  return [digits.slice(0, 4), digits.slice(4, 6), digits.slice(6, 8)].filter(Boolean).join("-");
}
