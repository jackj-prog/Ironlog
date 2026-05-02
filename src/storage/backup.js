import {
  APP_SCHEMA_VERSION,
  normalizeBodyCompositionLog,
  normalizeMeasurementLog,
  normalizePreferences,
  normalizeWeightLog,
  normalizeWorkoutSession,
} from './schema.js';

const APP_ID = 'ironlog';
const LEGACY_APP_IDS = ['personal-fitness-tracker'];

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function checksum(value) {
  const text = stableStringify(value);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function createBackupPayload(data) {
  const payload = {
    app: APP_ID,
    schemaVersion: APP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    data,
  };

  return {
    ...payload,
    checksum: checksum(payload),
  };
}

export function parseBackupPayload(text) {
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error('Backup JSON is not valid');
  }

  if (!payload || typeof payload !== 'object') throw new Error('Backup must be a JSON object');
  if (!payload.data || typeof payload.data !== 'object') throw new Error('Backup data is missing');
  if (typeof payload.checksum !== 'string') throw new Error('Backup checksum is missing');

  const { checksum: expectedChecksum, ...unsignedPayload } = payload;

  if (![APP_ID, ...LEGACY_APP_IDS].includes(payload.app)) throw new Error('Backup is for a different app');
  if (typeof payload.schemaVersion !== 'number') throw new Error('Backup schema version is missing');
  if (payload.schemaVersion > APP_SCHEMA_VERSION) throw new Error('Backup uses a newer schema version');
  if (checksum(unsignedPayload) !== expectedChecksum) throw new Error('Backup integrity check failed');

  return {
    weightLogs: (payload.data.weightLogs ?? []).map(normalizeWeightLog),
    measurementLogs: (payload.data.measurementLogs ?? []).map(normalizeMeasurementLog),
    workoutSessions: (payload.data.workoutSessions ?? []).map(normalizeWorkoutSession),
    bodyCompositionLogs: (payload.data.bodyCompositionLogs ?? []).map(normalizeBodyCompositionLog),
    preferences: normalizePreferences(payload.data.preferences),
  };
}
