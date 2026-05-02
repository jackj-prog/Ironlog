import { useCallback, useEffect, useMemo, useState } from 'react';
import { fitnessRepository } from '../storage/fitnessRepository';
import { DEFAULT_PREFERENCES } from '../storage/schema';
import { coachingInsights } from '../utils/analytics';
import { daysAgo, toISODate } from '../utils/date';
import { changeOverPeriod, findMostImprovedLift } from '../utils/formulas';

function sortByDate(records) {
  return [...records].sort((a, b) => a.date.localeCompare(b.date));
}

export function useFitnessData() {
  const [weights, setWeights] = useState([]);
  const [measurements, setMeasurements] = useState([]);
  const [workouts, setWorkouts] = useState([]);
  const [bodyCompositionLogs, setBodyCompositionLogs] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_PREFERENCES);
  const [isReady, setIsReady] = useState(false);
  const [lastError, setLastError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const saved = await fitnessRepository.loadAll();
        setWeights(saved.weightLogs);
        setMeasurements(saved.measurementLogs);
        setWorkouts(saved.workoutSessions);
        setBodyCompositionLogs(saved.bodyCompositionLogs);
        setSettings(saved.preferences);
      } catch (error) {
        setLastError(error.message);
      } finally {
        setIsReady(true);
      }
    }

    load();
  }, []);

  const addWeight = useCallback(async (bodyweight, date = toISODate(), notes = '') => {
    const { record, bodyCompositionLogs: composition } = await fitnessRepository.createWeightLog({ date, bodyweight, notes });
    setWeights((current) => sortByDate([...current, record]));
    setBodyCompositionLogs(composition);
  }, []);

  const updateWeight = useCallback(async (id, updates) => {
    const { record, bodyCompositionLogs: composition } = await fitnessRepository.updateWeightLog(id, updates);
    setWeights((current) => sortByDate(current.map((item) => (item.id === id ? record : item))));
    setBodyCompositionLogs(composition);
  }, []);

  const deleteWeight = useCallback(async (id) => {
    const composition = await fitnessRepository.deleteWeightLog(id);
    setWeights((current) => current.filter((item) => item.id !== id));
    setBodyCompositionLogs(composition);
  }, []);

  const addMeasurements = useCallback(async (values, date = toISODate(), notes = '') => {
    const { record, bodyCompositionLogs: composition } = await fitnessRepository.createMeasurementLog({ ...values, date, notes });
    setMeasurements((current) => sortByDate([...current, record]));
    setBodyCompositionLogs(composition);
  }, []);

  const updateMeasurements = useCallback(async (id, updates) => {
    const { record, bodyCompositionLogs: composition } = await fitnessRepository.updateMeasurementLog(id, updates);
    setMeasurements((current) => sortByDate(current.map((item) => (item.id === id ? record : item))));
    setBodyCompositionLogs(composition);
  }, []);

  const deleteMeasurements = useCallback(async (id) => {
    const composition = await fitnessRepository.deleteMeasurementLog(id);
    setMeasurements((current) => current.filter((item) => item.id !== id));
    setBodyCompositionLogs(composition);
  }, []);

  const addWorkout = useCallback(async (workout) => {
    const record = await fitnessRepository.createWorkoutSession({ ...workout, date: workout.date ?? toISODate() });
    setWorkouts((current) => [record, ...current].sort((a, b) => b.date.localeCompare(a.date)));
  }, []);

  const updateWorkout = useCallback(async (id, updates) => {
    const record = await fitnessRepository.updateWorkoutSession(id, updates);
    setWorkouts((current) => current.map((item) => (item.id === id ? record : item)).sort((a, b) => b.date.localeCompare(a.date)));
  }, []);

  const deleteWorkout = useCallback(async (id) => {
    await fitnessRepository.deleteWorkoutSession(id);
    setWorkouts((current) => current.filter((item) => item.id !== id));
  }, []);

  const saveSettings = useCallback(async (nextSettings) => {
    const { preferences: record, bodyCompositionLogs: composition } = await fitnessRepository.savePreferences({ ...settings, ...nextSettings });
    setSettings(record);
    setBodyCompositionLogs(composition);
  }, [settings]);

  const exportBackup = useCallback(() => fitnessRepository.exportBackup(), []);

  const importBackup = useCallback(async (text) => {
    const saved = await fitnessRepository.importBackup(text);
    setWeights(saved.weightLogs);
    setMeasurements(saved.measurementLogs);
    setWorkouts(saved.workoutSessions);
    setBodyCompositionLogs(saved.bodyCompositionLogs);
    setSettings(saved.preferences);
  }, []);

  const resetAllData = useCallback(async () => {
    await fitnessRepository.clearAll();
    setWeights([]);
    setMeasurements([]);
    setWorkouts([]);
    setBodyCompositionLogs([]);
    setSettings(DEFAULT_PREFERENCES);
  }, []);

  const summary = useMemo(() => {
    const latestWeight = weights.at(-1);
    const availableComposition = bodyCompositionLogs.filter((entry) => entry.estimateAvailable);
    const latestComposition = bodyCompositionLogs.at(-1) ?? null;

    return {
      currentBodyweight: latestWeight?.bodyweight ?? null,
      estimatedBodyFat: latestComposition?.bodyFatPercent ?? null,
      bodyFatChange30: changeOverPeriod(availableComposition, (entry) => entry.bodyFatPercent, daysAgo(30)),
      leanMassTrend30: changeOverPeriod(availableComposition, (entry) => entry.leanBodyMass, daysAgo(30)),
      leanBodyMass: latestComposition?.leanBodyMass ?? null,
      fatMass: latestComposition?.fatMass ?? null,
      bodyFatUnavailableReason: latestComposition?.estimateAvailable === false ? latestComposition.unavailableReason : '',
      latestWorkout: workouts[0] ?? null,
      weightChange30: changeOverPeriod(weights, (entry) => entry.bodyweight, daysAgo(30)),
      waistChange30: changeOverPeriod(measurements, (entry) => entry.waist, daysAgo(30)),
      mostImprovedLift: findMostImprovedLift(workouts, daysAgo(30)),
      coachingInsights: coachingInsights({
        weights,
        measurements,
        bodyCompositionLogs,
        workouts,
        sinceISO: daysAgo(30),
      }),
    };
  }, [bodyCompositionLogs, measurements, weights, workouts]);

  return {
    isReady,
    weights,
    measurements,
    workouts,
    bodyCompositionLogs,
    settings,
    summary,
    lastError,
    addWeight,
    updateWeight,
    deleteWeight,
    addMeasurements,
    updateMeasurements,
    deleteMeasurements,
    addWorkout,
    updateWorkout,
    deleteWorkout,
    saveSettings,
    exportBackup,
    importBackup,
    resetAllData,
  };
}
