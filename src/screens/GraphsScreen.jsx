import { useMemo, useState } from 'react';
import { ChartCard, TrendBar, TrendLine, chartTheme } from '../components/charts/ProgressCharts';
import { measurementFields } from '../config/measurementFields';
import {
  consistencyStreak,
  exerciseFrequencyByMonth,
  exerciseOptions,
  exerciseTrend,
  linearSlope,
  waistToWeightTrend,
  workoutsThisMonth,
} from '../utils/analytics';
import { daysAgo } from '../utils/date';
import { findMostImprovedLift } from '../utils/formulas';

function formatMetric(value, fallback = 'Not enough data') {
  return value === null || value === undefined ? fallback : value;
}

function bodySeries(weights, compositionLogs) {
  const weightByDate = new Map(weights.map((entry) => [entry.date, entry]));
  const compositionByDate = new Map(compositionLogs.map((entry) => [entry.date, entry]));
  const dates = [...new Set([...weights.map((entry) => entry.date), ...compositionLogs.map((entry) => entry.date)])].sort();

  return dates.map((date) => {
    const weight = weightByDate.get(date);
    const composition = compositionByDate.get(date);
    return {
      date,
      bodyweight: weight?.bodyweight ?? composition?.bodyweight ?? null,
      bodyFatPercent: composition?.bodyFatPercent ?? null,
      leanBodyMass: composition?.leanBodyMass ?? null,
      fatMass: composition?.fatMass ?? null,
    };
  });
}

function measurementSeries(measurements, fieldId) {
  return measurements
    .filter((entry) => entry[fieldId] !== null && entry[fieldId] !== undefined)
    .map((entry) => ({ date: entry.date, value: entry[fieldId] }));
}

export function GraphsScreen({ weights, measurements, workouts, bodyCompositionLogs, summary, settings }) {
  const [measurementId, setMeasurementId] = useState('waist');
  const exerciseChoices = useMemo(() => exerciseOptions(workouts), [workouts]);
  const [exerciseId, setExerciseId] = useState('');
  const selectedExerciseId = exerciseId || exerciseChoices[0]?.id || '';
  const bodyData = useMemo(() => bodySeries(weights, bodyCompositionLogs), [bodyCompositionLogs, weights]);
  const selectedMeasurement = measurementFields.find((field) => field.id === measurementId) ?? measurementFields[0];
  const measurementData = useMemo(() => measurementSeries(measurements, measurementId), [measurementId, measurements]);
  const selectedExerciseTrend = useMemo(() => exerciseTrend(workouts, selectedExerciseId), [selectedExerciseId, workouts]);
  const frequencyData = useMemo(() => exerciseFrequencyByMonth(selectedExerciseTrend), [selectedExerciseTrend]);
  const waistWeightData = useMemo(() => waistToWeightTrend(measurements, weights), [measurements, weights]);
  const weightSlope = useMemo(() => linearSlope(weights, (entry) => entry.bodyweight), [weights]);
  const waistWeightSlope = useMemo(() => linearSlope(waistWeightData, (entry) => entry.value), [waistWeightData]);
  const improvedLift = summary?.mostImprovedLift ?? findMostImprovedLift(workouts, daysAgo(30));

  return (
    <section className="stack graphs-page">
      <div>
        <p className="eyebrow">Graphs</p>
        <h2>Progress analytics</h2>
      </div>

      <div className="analytics-grid">
        <MetricTile label="Most improved lift 30d" value={improvedLift ? `${improvedLift.name} +${improvedLift.improvement}` : 'Need 2 sessions'} />
        <MetricTile label="Consistency streak" value={`${consistencyStreak(workouts)} workouts`} />
        <MetricTile label="Workouts this month" value={workoutsThisMonth(workouts)} />
        <MetricTile label="Weight trend slope" value={`${formatMetric(weightSlope)} ${settings.units.weight}/log`} />
        <MetricTile label="Waist/weight trend" value={formatMetric(waistWeightSlope)} />
      </div>

      <ChartCard title="Body composition">
        <TrendLine
          data={bodyData}
          lines={[
            { key: 'bodyweight', name: `Bodyweight (${settings.units.weight})`, color: chartTheme.green },
            { key: 'bodyFatPercent', name: 'Estimated body fat %', color: chartTheme.rose },
            { key: 'leanBodyMass', name: `Lean mass (${settings.units.weight})`, color: chartTheme.blue },
            { key: 'fatMass', name: `Fat mass (${settings.units.weight})`, color: chartTheme.amber },
          ]}
        />
      </ChartCard>

      <ChartCard title="Measurements">
        <label className="field chart-select">
          <span>Measurement</span>
          <select value={measurementId} onChange={(event) => setMeasurementId(event.target.value)}>
            {measurementFields.map((field) => (
              <option key={field.id} value={field.id}>
                {field.label}
              </option>
            ))}
          </select>
        </label>
        <TrendLine
          data={measurementData}
          lines={[{ key: 'value', name: `${selectedMeasurement.label} (${settings.units.measurement})`, color: chartTheme.green }]}
        />
      </ChartCard>

      <ChartCard title="Waist-to-weight ratio">
        <TrendLine data={waistWeightData} lines={[{ key: 'value', name: 'Waist / weight', color: chartTheme.blue }]} />
      </ChartCard>

      <ChartCard title="Workout exercise trends">
        <label className="field chart-select">
          <span>Exercise</span>
          <select value={selectedExerciseId} onChange={(event) => setExerciseId(event.target.value)}>
            {exerciseChoices.length ? (
              exerciseChoices.map((exercise) => (
                <option key={exercise.id} value={exercise.id}>
                  {exercise.label}
                </option>
              ))
            ) : (
              <option value="">No workouts logged</option>
            )}
          </select>
        </label>
        <TrendLine
          data={selectedExerciseTrend}
          lines={[
            { key: 'bestWorkingWeight', name: `Best working weight (${settings.units.weight})`, color: chartTheme.green },
            { key: 'repsAchieved', name: 'Reps achieved', color: chartTheme.blue },
            { key: 'estimatedOneRepMax', name: 'Estimated 1RM', color: chartTheme.rose },
            { key: 'volume', name: 'Volume', color: chartTheme.amber },
          ]}
        />
      </ChartCard>

      <ChartCard title="Exercise frequency">
        <TrendBar data={frequencyData} dataKey="frequency" name="Sessions" />
      </ChartCard>
    </section>
  );
}

function MetricTile({ label, value }) {
  return (
    <article className="summary-card analytics-tile">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}
