export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));
}

export function matchesQuery(values: Array<string | undefined>, query: string): boolean {
  const haystack = values.filter(Boolean).join(" ").toLowerCase();
  return haystack.includes(query.trim().toLowerCase());
}
