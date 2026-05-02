import { estimateOneRepMax } from './formulas.js';

function monthKey(date) {
  return date.slice(0, 7);
}

function numeric(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function linearSlope(records, getValue) {
  const points = records
    .map((record, index) => ({ x: index, y: numeric(getValue(record)) }))
    .filter((point) => point.y !== null);
  if (points.length < 2) return null;

  const meanX = points.reduce((sum, point) => sum + point.x, 0) / points.length;
  const meanY = points.reduce((sum, point) => sum + point.y, 0) / points.length;
  const numerator = points.reduce((sum, point) => sum + (point.x - meanX) * (point.y - meanY), 0);
  const denominator = points.reduce((sum, point) => sum + (point.x - meanX) ** 2, 0);
  return denominator ? Number((numerator / denominator).toFixed(2)) : null;
}

export function workoutsThisMonth(workouts, today = new Date()) {
  const currentMonth = today.toISOString().slice(0, 7);
  return workouts.filter((workout) => monthKey(workout.date) === currentMonth).length;
}

export function consistencyStreak(workouts) {
  const workoutDates = [...new Set(workouts.map((workout) => workout.date))].sort((a, b) => b.localeCompare(a));
  if (!workoutDates.length) return 0;

  let streak = 1;
  for (let index = 1; index < workoutDates.length; index += 1) {
    const previous = new Date(workoutDates[index - 1]);
    const current = new Date(workoutDates[index]);
    const gapDays = Math.round((previous - current) / 86400000);
    if (gapDays > 7) break;
    streak += 1;
  }
  return streak;
}

export function waistToWeightTrend(measurements, weights) {
  return measurements
    .map((measurement) => {
      const weight = [...weights].filter((entry) => entry.date <= measurement.date).at(-1);
      const waist = numeric(measurement.waist);
      if (!weight || !waist || !weight.bodyweight) return null;
      return {
        date: measurement.date,
        value: Number((waist / weight.bodyweight).toFixed(3)),
      };
    })
    .filter(Boolean);
}

export function exerciseOptions(workouts) {
  const options = new Map();
  workouts.forEach((workout) => {
    workout.exercisesCompleted.forEach((exercise) => {
      const key = exercise.movementPattern ?? exercise.baseExerciseId ?? exercise.id ?? exercise.name;
      if (!options.has(key)) {
        options.set(key, {
          id: key,
          label: exercise.originalName || exercise.name,
        });
      }
    });
  });
  return [...options.values()].sort((a, b) => a.label.localeCompare(b.label));
}

export function exerciseTrend(workouts, exerciseId) {
  return workouts
    .flatMap((workout) =>
      workout.exercisesCompleted
        .filter((exercise) => (exercise.movementPattern ?? exercise.baseExerciseId ?? exercise.id ?? exercise.name) === exerciseId)
        .map((exercise) => {
          const workingSets = exercise.sets.filter((set) => numeric(set.weight) !== null && numeric(set.reps) !== null);
          const bestWorkingWeight = Math.max(0, ...workingSets.map((set) => Number(set.weight)));
          const repsAchieved = workingSets.reduce((sum, set) => sum + Number(set.reps), 0);
          const estimatedOneRepMax = Math.max(0, ...workingSets.map((set) => estimateOneRepMax(set.weight, set.reps)));
          const volume = workingSets.reduce((sum, set) => sum + Number(set.weight) * Number(set.reps), 0);
          return {
            date: workout.date,
            bestWorkingWeight,
            repsAchieved,
            estimatedOneRepMax,
            volume: Math.round(volume),
            frequency: 1,
          };
        }),
    )
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function exerciseFrequencyByMonth(trend) {
  const totals = new Map();
  trend.forEach((entry) => {
    const key = monthKey(entry.date);
    totals.set(key, (totals.get(key) ?? 0) + 1);
  });
  return [...totals.entries()].map(([date, frequency]) => ({ date, frequency }));
}

function changeForPeriod(records, getValue, sinceISO) {
  const sorted = records
    .filter((record) => record.date >= sinceISO)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((record) => numeric(getValue(record)))
    .filter((value) => value !== null);
  if (sorted.length < 2) return null;
  return Number((sorted.at(-1) - sorted[0]).toFixed(2));
}

function strengthChangeForPeriod(workouts, sinceISO) {
  const byMovement = new Map();
  workouts
    .filter((workout) => workout.date >= sinceISO)
    .forEach((workout) => {
      workout.exercisesCompleted.forEach((exercise) => {
        const key = exercise.movementPattern ?? exercise.baseExerciseId ?? exercise.id ?? exercise.name;
        const best = Math.max(0, ...exercise.sets.map((set) => estimateOneRepMax(set.weight, set.reps)));
        if (!best) return;
        const entries = byMovement.get(key) ?? [];
        entries.push({ date: workout.date, best });
        byMovement.set(key, entries);
      });
    });

  let total = 0;
  byMovement.forEach((entries) => {
    const sorted = entries.sort((a, b) => a.date.localeCompare(b.date));
    if (sorted.length >= 2) total += sorted.at(-1).best - sorted[0].best;
  });

  return Number(total.toFixed(1));
}

export function coachingInsights({ weights, measurements, bodyCompositionLogs, workouts, sinceISO }) {
  const latestWeight = weights.at(-1)?.bodyweight ?? null;
  const weightChange = changeForPeriod(weights, (entry) => entry.bodyweight, sinceISO);
  const waistChange = changeForPeriod(measurements, (entry) => entry.waist, sinceISO);
  const bodyFatChange = changeForPeriod(
    bodyCompositionLogs.filter((entry) => entry.estimateAvailable),
    (entry) => entry.bodyFatPercent,
    sinceISO,
  );
  const leanMassChange = changeForPeriod(
    bodyCompositionLogs.filter((entry) => entry.estimateAvailable),
    (entry) => entry.leanBodyMass,
    sinceISO,
  );
  const strengthChange = strengthChangeForPeriod(workouts, sinceISO);
  const weightChangePercent = latestWeight && weightChange !== null ? (weightChange / latestWeight) * 100 : null;
  const insights = [];

  if ([weightChange, waistChange].some((value) => value === null)) {
    return [
      {
        title: 'Coaching signal',
        message: 'Log weight plus waist/neck over time to unlock coaching insights.',
        tone: 'default',
      },
    ];
  }

  if (weightChange > 0.5 && waistChange > 1.5 && (bodyFatChange === null || bodyFatChange > 0.5)) {
    insights.push({
      title: 'Gaining fat too fast',
      message: 'Weight is rising, but waist is climbing quickly. Reduce calories slightly or add steps.',
      tone: 'warning',
    });
  } else if (weightChange > 0.4 && waistChange <= 1 && (bodyFatChange === null || bodyFatChange <= 0.4) && strengthChange > 0) {
    insights.push({
      title: 'Lean bulk progressing well',
      message: 'Bodyweight and strength are moving up while waist gain is controlled. Keep the plan steady.',
      tone: 'success',
    });
  }

  if (Math.abs(weightChange) <= 0.5 && strengthChange > 0 && (waistChange <= 0 || (bodyFatChange !== null && bodyFatChange <= 0))) {
    insights.push({
      title: 'Recomp progress',
      message: 'Weight is stable while strength improves and waist/body fat is not rising. Good recomposition signal.',
      tone: 'success',
    });
  }

  if (weightChange < -0.5 && waistChange < 0 && (bodyFatChange === null || bodyFatChange <= 0)) {
    insights.push({
      title: 'Cut progress',
      message: 'Weight and waist are both trending down. Keep protein high and performance monitored.',
      tone: 'success',
    });
  }

  if (weightChangePercent !== null && weightChangePercent < -4) {
    insights.push({
      title: 'Muscle loss risk',
      message: 'Bodyweight is dropping fast. Consider a smaller deficit if strength or lean mass is falling.',
      tone: 'warning',
    });
  }

  if (
    Math.abs(weightChange) <= 0.3 &&
    Math.abs(waistChange) <= 0.3 &&
    Math.abs(strengthChange) < 2 &&
    (leanMassChange === null || Math.abs(leanMassChange) <= 0.3)
  ) {
    insights.push({
      title: 'Plateau warning',
      message: 'Weight, waist, and strength are mostly flat. Adjust calories, steps, or training load.',
      tone: 'caution',
    });
  }

  return insights.length
    ? insights.slice(0, 3)
    : [
        {
          title: 'Trend watch',
          message: 'Signals are mixed. Keep logging weight, waist, and training for a clearer read.',
          tone: 'default',
        },
      ];
}
