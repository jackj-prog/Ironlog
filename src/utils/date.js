export function toISODate(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function daysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return toISODate(date);
}

export function formatShortDate(value) {
  if (!value) return 'Not logged';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(value));
}

export function isWithinDays(value, days) {
  return value >= daysAgo(days);
}
