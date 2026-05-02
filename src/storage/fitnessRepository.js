import { createBackupPayload, parseBackupPayload } from './backup.js';
import { storage } from './db.js';
import {
  DEFAULT_PREFERENCES,
  migrateLegacyMeasurement,
  migrateLegacyPreferences,
  migrateLegacyWeight,
  migrateLegacyWorkout,
  normalizeMeasurementLog,
  normalizeBodyCompositionLog,
  normalizePreferences,
  normalizeWeightLog,
  normalizeWorkoutSession,
  PREFERENCES_ID,
} from './schema.js';
import { calculateBodyComposition } from '../utils/formulas.js';

function byDateAscending(records) {
  return [...records].sort((a, b) => a.date.localeCompare(b.date));
}

function byDateDescending(records) {
  return [...records].sort((a, b) => b.date.localeCompare(a.date));
}

function latestMeasurementValueForDate(measurementLogs, date, field) {
  return (
    byDateAscending(measurementLogs)
      .filter((measurement) => measurement.date <= date && measurement[field] !== null && measurement[field] !== undefined)
      .at(-1)?.[field] ?? null
  );
}

function latestWeightForDate(weightLogs, date) {
  return byDateAscending(weightLogs).filter((weight) => weight.date <= date).at(-1) ?? null;
}

function buildBodyCompositionLogs(weightLogs, measurementLogs, preferences) {
  const dates = [...new Set([...weightLogs.map((entry) => entry.date), ...measurementLogs.map((entry) => entry.date)])].sort();

  return dates.flatMap((date) => {
    const weightLog = latestWeightForDate(weightLogs, date);
    if (!weightLog) return [];

    const waist = latestMeasurementValueForDate(measurementLogs, date, 'waist');
    const neck = latestMeasurementValueForDate(measurementLogs, date, 'neck');
    const composition = calculateBodyComposition({
      bodyweight: weightLog.bodyweight,
      heightCm: preferences.profile.heightCm,
      waistCm: waist,
      neckCm: neck,
    });

    return normalizeBodyCompositionLog({
      id: `body-composition-${date}`,
      date,
      bodyweight: weightLog.bodyweight,
      waist,
      neck,
      heightCm: preferences.profile.heightCm,
      bodyFatPercent: composition?.bodyFatPercent ?? null,
      leanBodyMass: composition?.leanBodyMass ?? null,
      fatMass: composition?.fatMass ?? null,
      estimateAvailable: Boolean(composition),
      unavailableReason: composition ? '' : 'Missing waist or neck',
    });
  });
}

async function loadMigrated(currentStore, legacyStore, migrate) {
  const current = await storage.list(currentStore);
  if (current.length) return current;

  const legacy = await storage.list(legacyStore);
  if (!legacy.length) return [];

  const migrated = legacy.map(migrate);
  await storage.replaceAll(currentStore, migrated);
  return migrated;
}

export const fitnessRepository = {
  async loadAll() {
    const [weightLogs, measurementLogs, workoutSessions, preferencesRecords] = await Promise.all([
      loadMigrated('weightLogs', 'weights', migrateLegacyWeight),
      loadMigrated('measurementLogs', 'measurements', migrateLegacyMeasurement),
      loadMigrated('workoutSessions', 'workouts', migrateLegacyWorkout),
      loadMigrated('preferences', 'settings', migrateLegacyPreferences),
    ]);

    const preferences = preferencesRecords[0] ? normalizePreferences(preferencesRecords[0]) : normalizePreferences(DEFAULT_PREFERENCES);
    if (!preferencesRecords.length) await storage.upsert('preferences', preferences);
    const normalizedWeights = byDateAscending(weightLogs.map(normalizeWeightLog));
    const normalizedMeasurements = byDateAscending(measurementLogs.map(normalizeMeasurementLog));
    const expectedCompositionLogs = buildBodyCompositionLogs(normalizedWeights, normalizedMeasurements, preferences);
    await storage.replaceAll('bodyCompositionLogs', expectedCompositionLogs);

    return {
      weightLogs: normalizedWeights,
      measurementLogs: normalizedMeasurements,
      workoutSessions: byDateDescending(workoutSessions.map(normalizeWorkoutSession)),
      bodyCompositionLogs: byDateAscending(expectedCompositionLogs.map(normalizeBodyCompositionLog)),
      preferences,
    };
  },

  async recalculateBodyCompositionLogs() {
    const [weightLogs, measurementLogs, preferencesRecords] = await Promise.all([
      storage.list('weightLogs'),
      storage.list('measurementLogs'),
      storage.list('preferences'),
    ]);
    const preferences = preferencesRecords[0] ? normalizePreferences(preferencesRecords[0]) : normalizePreferences(DEFAULT_PREFERENCES);
    const logs = buildBodyCompositionLogs(weightLogs.map(normalizeWeightLog), measurementLogs.map(normalizeMeasurementLog), preferences);
    await storage.replaceAll('bodyCompositionLogs', logs);
    return byDateAscending(logs);
  },

  async createWeightLog(input) {
    const record = normalizeWeightLog(input);
    await storage.create('weightLogs', record);
    const bodyCompositionLogs = await this.recalculateBodyCompositionLogs();
    return { record, bodyCompositionLogs };
  },

  async updateWeightLog(id, updates) {
    const current = await storage.get('weightLogs', id);
    if (!current) throw new Error(`No weight log found for ${id}`);
    const record = await storage.update('weightLogs', id, normalizeWeightLog({ ...current, ...updates, id }));
    const bodyCompositionLogs = await this.recalculateBodyCompositionLogs();
    return { record, bodyCompositionLogs };
  },

  async deleteWeightLog(id) {
    await storage.remove('weightLogs', id);
    return this.recalculateBodyCompositionLogs();
  },

  async createMeasurementLog(input) {
    const record = normalizeMeasurementLog(input);
    await storage.create('measurementLogs', record);
    const bodyCompositionLogs = await this.recalculateBodyCompositionLogs();
    return { record, bodyCompositionLogs };
  },

  async updateMeasurementLog(id, updates) {
    const current = await storage.get('measurementLogs', id);
    if (!current) throw new Error(`No measurement log found for ${id}`);
    const record = await storage.update('measurementLogs', id, normalizeMeasurementLog({ ...current, ...updates, id }));
    const bodyCompositionLogs = await this.recalculateBodyCompositionLogs();
    return { record, bodyCompositionLogs };
  },

  async deleteMeasurementLog(id) {
    await storage.remove('measurementLogs', id);
    return this.recalculateBodyCompositionLogs();
  },

  async createWorkoutSession(input) {
    const record = normalizeWorkoutSession(input);
    return storage.create('workoutSessions', record);
  },

  async updateWorkoutSession(id, updates) {
    const current = await storage.get('workoutSessions', id);
    if (!current) throw new Error(`No workout session found for ${id}`);
    return storage.update('workoutSessions', id, normalizeWorkoutSession({ ...current, ...updates, id }));
  },

  deleteWorkoutSession(id) {
    return storage.remove('workoutSessions', id);
  },

  async savePreferences(input) {
    const preferences = normalizePreferences({ ...input, id: PREFERENCES_ID });
    await storage.upsert('preferences', preferences);
    const bodyCompositionLogs = await this.recalculateBodyCompositionLogs();
    return { preferences, bodyCompositionLogs };
  },

  async exportBackup() {
    const data = await this.loadAll();
    return createBackupPayload(data);
  },

  async importBackup(text) {
    const backup = parseBackupPayload(text);
    await Promise.all([
      storage.replaceAll('weightLogs', backup.weightLogs),
      storage.replaceAll('measurementLogs', backup.measurementLogs),
      storage.replaceAll('workoutSessions', backup.workoutSessions),
      storage.replaceAll('bodyCompositionLogs', backup.bodyCompositionLogs),
      storage.replaceAll('preferences', [backup.preferences]),
    ]);
    await this.recalculateBodyCompositionLogs();
    return this.loadAll();
  },

  clearAll() {
    return storage.clearStores();
  },
};
