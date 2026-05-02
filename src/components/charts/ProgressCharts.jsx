import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export const chartTheme = {
  grid: '#263245',
  axis: '#8ea0bb',
  green: '#36d399',
  blue: '#60a5fa',
  amber: '#fbbf24',
  rose: '#fb7185',
};

export function ChartCard({ title, children }) {
  return (
    <article className="chart-card recharts-card">
      <div className="chart-header">
        <h3>{title}</h3>
      </div>
      {children}
    </article>
  );
}

export function TrendLine({ data, lines }) {
  const hasData = data.some((entry) => lines.some((line) => Number.isFinite(Number(entry[line.key]))));
  if (!hasData) return <ChartEmptyState message="Log a few entries to unlock this trend." />;

  return (
    <div className="recharts-frame">
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" />
          <XAxis dataKey="date" stroke={chartTheme.axis} tick={{ fontSize: 11 }} tickMargin={8} />
          <YAxis stroke={chartTheme.axis} tick={{ fontSize: 11 }} width={44} />
          <Tooltip
            contentStyle={{ background: '#0b1220', border: '1px solid #263245', borderRadius: 8, color: '#edf4ff' }}
            labelStyle={{ color: '#edf4ff' }}
          />
          {lines.map((line) => (
            <Line
              connectNulls
              dataKey={line.key}
              dot={false}
              key={line.key}
              name={line.name}
              stroke={line.color}
              strokeWidth={3}
              type="monotone"
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TrendBar({ data, dataKey, name }) {
  if (!data.length) return <ChartEmptyState message="Complete workouts to see frequency." />;

  return (
    <div className="recharts-frame">
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" />
          <XAxis dataKey="date" stroke={chartTheme.axis} tick={{ fontSize: 11 }} tickMargin={8} />
          <YAxis stroke={chartTheme.axis} tick={{ fontSize: 11 }} width={44} />
          <Tooltip
            contentStyle={{ background: '#0b1220', border: '1px solid #263245', borderRadius: 8, color: '#edf4ff' }}
            labelStyle={{ color: '#edf4ff' }}
          />
          <Bar dataKey={dataKey} fill={chartTheme.green} name={name} radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function ChartEmptyState({ message }) {
  return (
    <div className="chart-empty-state">
      <strong>No chart data yet</strong>
      <p>{message}</p>
    </div>
  );
}
