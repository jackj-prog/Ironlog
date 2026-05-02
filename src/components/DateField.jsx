import { formatLongDate } from '../utils/date';

export function DateField({ label = 'Date', value, onChange }) {
  return (
    <label className="field date-field">
      <span>{label}</span>
      <span className="date-input-shell">
        <span className="date-display">{formatLongDate(value)}</span>
        <input
          aria-label={label}
          className="native-date-input"
          type="date"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </span>
    </label>
  );
}
