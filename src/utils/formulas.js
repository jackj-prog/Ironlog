export function estimateOneRepMax(weight, reps) {
  const load = Number(weight);
  const count = Number(reps);
  if (!load || !count) return 0;
  return Math.round(load * (1 + count / 30));
}

function cmToInches(value) {
  return Number(value) / 2.54;
}

export function estimateMaleBodyFatPercent({ heightCm, waistCm, neckCm }) {
  const height = Number(heightCm);
  const waist = Number(waistCm);
  const neck = Number(neckCm);
  if (!height || !waist || !neck) return null;
  if (waist <= neck) return null;

  const heightIn = cmToInches(height);
  const waistIn = cmToInches(waist);
  const neckIn = cmToInches(neck);
  return 86.01 * Math.log10(waistIn - neckIn) - 70.041 * Math.log10(heightIn) + 36.76;
}

export function estimateBodyFatPercent({ sex = 'male', heightCm, waistCm, neckCm, hipsCm }) {
  if (sex === 'male') return estimateMaleBodyFatPercent({ heightCm, waistCm, neckCm });

  const height = cmToInches(heightCm);
  const waist = cmToInches(waistCm);
  const neck = cmToInches(neckCm);
  const hips = cmToInches(hipsCm);
  if (!height || !waist || !neck || !hips) return null;

  if (sex === 'female') {
    return 163.205 * Math.log10(waist + hips - neck) - 97.684 * Math.log10(height) - 78.387;
  }

  return null;
}

export function calculateBodyComposition({ bodyweight, heightCm, waistCm, neckCm }) {
  const bodyFatPercent = estimateMaleBodyFatPercent({ heightCm, waistCm, neckCm });
  const weight = Number(bodyweight);
  if (!Number.isFinite(bodyFatPercent) || !weight) return null;

  const fatMass = weight * (bodyFatPercent / 100);
  const leanBodyMass = weight - fatMass;
  return {
    bodyFatPercent: Number(bodyFatPercent.toFixed(1)),
    leanBodyMass: Number(leanBodyMass.toFixed(1)),
    fatMass: Number(fatMass.toFixed(1)),
  };
}

export function changeOverPeriod(entries, valueGetter, sinceISO) {
  const sorted = [...entries].filter((entry) => entry.date >= sinceISO).sort((a, b) => a.date.localeCompare(b.date));
  if (sorted.length < 2) return null;
  const first = Number(valueGetter(sorted[0]));
  const last = Number(valueGetter(sorted[sorted.length - 1]));
  if (!Number.isFinite(first) || !Number.isFinite(last)) return null;
  return Number((last - first).toFixed(1));
}

export function findMostImprovedLift(workouts, sinceISO) {
  const lifts = new Map();

  workouts
    .filter((workout) => workout.date >= sinceISO)
    .forEach((workout) => {
      workout.exercisesCompleted.forEach((exercise) => {
        const best = Math.max(...exercise.sets.map((set) => estimateOneRepMax(set.weight, set.reps)));
        if (!best) return;
        const key = exercise.movementPattern ?? exercise.baseExerciseId ?? exercise.name;
        const history = lifts.get(key) ?? [];
        history.push({ date: workout.date, best });
        lifts.set(key, history);
      });
    });

  let winner = null;
  lifts.forEach((history, name) => {
    const sorted = history.sort((a, b) => a.date.localeCompare(b.date));
    if (sorted.length < 2) return;
    const improvement = sorted[sorted.length - 1].best - sorted[0].best;
    if (!winner || improvement > winner.improvement) {
      winner = { name, improvement };
    }
  });

  return winner;
}
