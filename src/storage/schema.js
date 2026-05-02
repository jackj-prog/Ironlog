export const APP_SCHEMA_VERSION = 2;
export const PREFERENCES_ID = 'app-preferences';

export const DEFAULT_PREFERENCES = {
  id: PREFERENCES_ID,
  schemaVersion: APP_SCHEMA_VERSION,
  units: {
    weight: 'kg',
    measurement: 'cm',
  },
  darkMode: true,
  backup: {
    autoBackup: false,
    includeNotes: true,
    lastBackupAt: null,
  },
  profile: {
    heightCm: 190.5,
    sex: 'male',
  },
  createdAt: null,
  updatedAt: null,
};

const MEASUREMENT_FIELDS = ['chest', 'shoulders', 'neck', 'sleeve', 'waist', 'hips', 'thigh', 'inseam', 'wrists'];

function nowISO() {
  return new Date().toISOString();
}

function id(prefix) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function assertDate(value, field = 'date') {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? '')) {
    throw new Error(`${field} must use YYYY-MM-DD format`);
  }
}

function optionalText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function numberRequired(value, field, min = 0) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= min) {
    throw new Error(`${field} must be a positive number`);
  }
  return number;
}

function numberOptional(value, field, min = 0) {
  if (value === '' || value === null || value === undefined) return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < min) {
    throw new Error(`${field} must be a valid number`);
  }
  return number;
}

function withMeta(record, prefix) {
  const timestamp = nowISO();
  return {
    ...record,
    id: record.id ?? id(prefix),
    schemaVersion: APP_SCHEMA_VERSION,
    createdAt: record.createdAt ?? timestamp,
    updatedAt: timestamp,
  };
}

export function normalizeWeightLog(input) {
  assertDate(input.date);
  return withMeta(
    {
      ...input,
      bodyweight: numberRequired(input.bodyweight, 'bodyweight'),
      notes: optionalText(input.notes),
    },
    'weight',
  );
}

export function normalizeMeasurementLog(input) {
  assertDate(input.date);
  const measurements = Object.fromEntries(
    MEASUREMENT_FIELDS.map((field) => [field, numberOptional(input[field], field)]),
  );

  if (Object.values(measurements).every((value) => value === null)) {
    throw new Error('At least one measurement is required');
  }

  return withMeta({ ...input, ...measurements, notes: optionalText(input.notes) }, 'measurement');
}

function normalizeWorkoutSet(set, index) {
  const reps = numberRequired(set.reps, `set ${index + 1} reps`);
  const weight = numberOptional(set.weight, `set ${index + 1} weight`);
  const rpe = numberOptional(set.rpe, `set ${index + 1} RPE`);
  if (rpe !== null && (rpe < 1 || rpe > 10)) throw new Error('RPE must be between 1 and 10');

  return {
    setNumber: index + 1,
    reps,
    weight: weight ?? 0,
    rpe,
    notes: optionalText(set.notes),
  };
}

export function normalizeWorkoutSession(input) {
  assertDate(input.date);
  if (!optionalText(input.workoutType)) throw new Error('workout type is required');

  const exercisesCompleted = (input.exercisesCompleted ?? []).map((exercise) => {
    if (!optionalText(exercise.name)) throw new Error('exercise name is required');
    const sets = (exercise.sets ?? []).map(normalizeWorkoutSet);
    if (!sets.length) throw new Error(`${exercise.name} needs at least one completed set`);
    return {
      id: exercise.id ?? id('exercise'),
      baseExerciseId: optionalText(exercise.baseExerciseId ?? exercise.id),
      originalName: optionalText(exercise.originalName ?? exercise.name),
      movementPattern: optionalText(exercise.movementPattern ?? exercise.id),
      wasSwapped: Boolean(exercise.wasSwapped),
      name: optionalText(exercise.name),
      sets,
      notes: optionalText(exercise.notes),
    };
  });

  if (!exercisesCompleted.length) throw new Error('At least one completed exercise is required');

  return withMeta(
    {
      ...input,
      workoutType: optionalText(input.workoutType),
      exercisesCompleted,
      exercises: exercisesCompleted,
      duration: numberOptional(input.duration, 'duration') ?? 0,
      notes: optionalText(input.notes),
    },
    'workout',
  );
}

export function normalizeBodyCompositionLog(input) {
  assertDate(input.date);
  const estimateAvailable = Boolean(input.estimateAvailable);
  return withMeta(
    {
      ...input,
      bodyweight: numberRequired(input.bodyweight, 'bodyweight'),
      waist: numberOptional(input.waist, 'waist'),
      neck: numberOptional(input.neck, 'neck'),
      heightCm: numberRequired(input.heightCm, 'heightCm'),
      bodyFatPercent: estimateAvailable ? numberRequired(input.bodyFatPercent, 'bodyFatPercent') : null,
      leanBodyMass: estimateAvailable ? numberRequired(input.leanBodyMass, 'leanBodyMass') : null,
      fatMass: estimateAvailable ? numberRequired(input.fatMass, 'fatMass') : null,
      estimateAvailable,
      unavailableReason: estimateAvailable ? '' : optionalText(input.unavailableReason || 'Missing waist or neck'),
    },
    'body-composition',
  );
}

export function normalizePreferences(input = {}) {
  const timestamp = nowISO();
  const merged = {
    ...DEFAULT_PREFERENCES,
    ...input,
    units: { ...DEFAULT_PREFERENCES.units, ...(input.units ?? {}) },
    backup: { ...DEFAULT_PREFERENCES.backup, ...(input.backup ?? {}) },
    profile: { ...DEFAULT_PREFERENCES.profile, ...(input.profile ?? {}) },
  };

  if (!['kg', 'lb'].includes(merged.units.weight)) throw new Error('weight unit must be kg or lb');
  if (!['cm', 'in'].includes(merged.units.measurement)) throw new Error('measurement unit must be cm or in');
  if (!['male', 'female'].includes(merged.profile.sex)) throw new Error('profile sex must be male or female');

  return {
    ...merged,
    id: PREFERENCES_ID,
    schemaVersion: APP_SCHEMA_VERSION,
    darkMode: Boolean(merged.darkMode),
    profile: {
      ...merged.profile,
      heightCm: numberRequired(merged.profile.heightCm, 'heightCm'),
    },
    createdAt: merged.createdAt ?? timestamp,
    updatedAt: timestamp,
  };
}

export function migrateLegacyWeight(record) {
  return normalizeWeightLog({
    id: record.id,
    date: record.date,
    bodyweight: record.bodyweight ?? record.value,
    notes: record.notes,
    createdAt: record.createdAt,
  });
}

export function migrateLegacyMeasurement(record) {
  return normalizeMeasurementLog({
    id: record.id,
    date: record.date,
    ...(record.values ?? record),
    thigh: record.values?.thigh ?? record.values?.leftThigh ?? record.thigh,
    wrists: record.values?.wrists ?? record.wrists,
    notes: record.notes,
    createdAt: record.createdAt,
  });
}

export function migrateLegacyWorkout(record) {
  return normalizeWorkoutSession({
    id: record.id,
    date: record.date ?? record.completedAt,
    workoutType: record.workoutType ?? record.name,
    duration: record.duration,
    notes: record.notes,
    exercisesCompleted: (record.exercisesCompleted ?? record.exercises ?? []).map((exercise) => ({
      id: exercise.id,
      name: exercise.name,
      notes: exercise.notes,
      sets: exercise.sets ?? [],
    })),
    createdAt: record.createdAt,
  });
}

export function migrateLegacyPreferences(record) {
  return normalizePreferences({
    units: {
      weight: record.units?.weight ?? record.unit,
      measurement: record.units?.measurement ?? 'cm',
    },
    darkMode: record.darkMode ?? true,
    backup: record.backup,
    profile: {
      heightCm: record.profile?.heightCm ?? record.heightCm,
      sex: record.profile?.sex ?? record.sex,
    },
    createdAt: record.createdAt,
  });
}
