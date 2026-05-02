export function toISODate(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function daysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return toISODate(date);
}

function parseISODate(value) {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

export function formatShortDate(value) {
  if (!value) return 'Not logged';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(parseISODate(value));
}

export function formatLongDate(value) {
  if (!value) return 'Select date';
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(parseISODate(value));
}

export function isWithinDays(value, days) {
  return value >= daysAgo(days);
}
