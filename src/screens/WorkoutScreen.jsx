import { ArrowLeft, Check, Clock, Dumbbell, Pause, Play, Plus, RefreshCw, Save, TimerReset, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { exerciseSubstitutions, getExerciseSubstitutions, getMovementPattern } from '../config/exerciseSubstitutions';
import { workoutTemplates } from '../config/workoutTemplates';
import { toISODate } from '../utils/date';
import { estimateOneRepMax } from '../utils/formulas';

const DRAFT_KEY = 'ironlog:active-workout-draft';
const LEGACY_DRAFT_KEY = 'personal-fitness-tracker:active-workout-draft';
const DEFAULT_REST_SECONDS = 120;

const warmUpPresets = {
  upper: ['Band pull-aparts 2x20', 'Dead hangs 2x30 sec'],
  lower: ['Hip flexor stretch 2x30 sec', 'Bodyweight squats', 'Dead hangs optional'],
};

const defaultNewExercise = {
  name: '',
  sets: 3,
  reps: '10',
  target: 'accessory',
};

function slugifyExerciseName(name) {
  return String(name)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function positiveInteger(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.round(number) : fallback;
}

function numericTarget(reps) {
  const match = String(reps).match(/\d+/);
  return match ? Number(match[0]) : '';
}

function createSet(exercise, previousSet, shouldOverload, increment) {
  const previousWeight = Number(previousSet?.weight || 0);
  return {
    reps: previousSet?.reps ?? numericTarget(exercise.reps),
    weight: previousWeight ? Number((previousWeight + (shouldOverload ? increment : 0)).toFixed(1)) : '',
    rpe: previousSet?.rpe ?? '',
    notes: '',
    completed: false,
  };
}

function movementKey(exercise) {
  return exercise.movementPattern ?? getMovementPattern(exercise.baseExerciseId ?? exercise.id);
}

function findPreviousExercise(workouts, exercise) {
  const key = movementKey(exercise);
  return (workouts ?? [])
    .flatMap((workout) =>
      (workout.exercisesCompleted ?? []).map((completed) => ({
        ...completed,
        workoutDate: workout.date,
      })),
    )
    .filter((completed) => (completed.movementPattern ?? completed.baseExerciseId ?? completed.id ?? completed.name) === key)
    .sort((a, b) => b.workoutDate.localeCompare(a.workoutDate))[0];
}

function targetAchieved(previousExercise, targetReps, targetSets) {
  if (!previousExercise?.sets?.length || !targetReps) return false;
  if (previousExercise.sets.length < targetSets) return false;
  return previousExercise.sets.every((set) => Number(set.reps) >= targetReps);
}

function bestOneRepMaxForExercise(workouts, exercise) {
  const key = movementKey(exercise);
  return Math.max(
    0,
    ...(workouts ?? []).flatMap((workout) =>
      (workout.exercisesCompleted ?? [])
        .filter((completed) => (completed.movementPattern ?? completed.baseExerciseId ?? completed.id ?? completed.name) === key)
        .flatMap((completed) => (completed.sets ?? []).map((set) => estimateOneRepMax(set.weight, set.reps))),
    ),
  );
}

function buildExerciseSets(exercise, workouts, weightUnit) {
  const increment = weightUnit === 'lb' ? 5 : 2.5;
  const previous = findPreviousExercise(workouts, exercise);
  const target = numericTarget(exercise.reps);
  const shouldOverload = targetAchieved(previous, target, exercise.sets);
  return Array.from({ length: exercise.sets }, (_, index) => createSet(exercise, previous?.sets?.[index], shouldOverload, increment));
}

function buildSets(exercises, workouts, weightUnit) {
  return Object.fromEntries(exercises.map((exercise) => [exercise.id, buildExerciseSets(exercise, workouts, weightUnit)]));
}

function buildSuggestions(exercises, workouts, weightUnit) {
  const increment = weightUnit === 'lb' ? 5 : 2.5;
  return Object.fromEntries(
    exercises.map((exercise) => {
      const previous = findPreviousExercise(workouts, exercise);
      const target = numericTarget(exercise.reps);
      return [
        exercise.id,
        previous && targetAchieved(previous, target, exercise.sets)
          ? `Target hit last time. Try +${increment} ${weightUnit}.`
          : previous
            ? 'Match last session, then add reps if strong.'
            : 'First tracked session for this movement.',
      ];
    }),
  );
}

function buildExerciseOptions(workouts) {
  const options = new Map();
  const addOption = ({ name, baseExerciseId, movementPattern, target = 'custom' }) => {
    const cleanName = String(name ?? '').trim();
    if (!cleanName || cleanName.toLowerCase() === 'weak point block') return;
    const id = baseExerciseId ?? slugifyExerciseName(cleanName);
    const key = cleanName.toLowerCase();
    if (!options.has(key)) {
      options.set(key, {
        name: cleanName,
        baseExerciseId: id,
        movementPattern: movementPattern ?? getMovementPattern(id),
        target,
      });
    }
  };

  workoutTemplates.forEach((template) => {
    template.exercises.forEach((exercise) =>
      addOption({
        name: exercise.name,
        baseExerciseId: exercise.id,
        movementPattern: movementKey(exercise),
        target: exercise.target,
      }),
    );
  });

  Object.entries(exerciseSubstitutions).forEach(([baseExerciseId, config]) => {
    config.options.forEach((name) =>
      addOption({
        name,
        baseExerciseId,
        movementPattern: config.movementPattern,
      }),
    );
  });

  (workouts ?? []).forEach((workout) => {
    (workout.exercisesCompleted ?? []).forEach((exercise) =>
      addOption({
        name: exercise.name,
        baseExerciseId: exercise.baseExerciseId ?? exercise.id,
        movementPattern: exercise.movementPattern,
        target: 'logged',
      }),
    );
  });

  return [...options.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function createSessionExercise(input, exerciseOptions, order) {
  const name = String(input.name ?? '').trim();
  const option = exerciseOptions.find((item) => item.name.toLowerCase() === name.toLowerCase());
  const baseExerciseId = option?.baseExerciseId ?? slugifyExerciseName(name);
  const uniqueId = globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

  return {
    id: `custom-${slugifyExerciseName(name)}-${uniqueId}`,
    baseExerciseId,
    movementPattern: option?.movementPattern ?? getMovementPattern(baseExerciseId),
    order,
    name,
    sets: positiveInteger(input.sets, 3),
    reps: String(input.reps || '10'),
    target: option?.target ?? String(input.target || 'accessory'),
    custom: true,
  };
}

function warmUpsForTemplate(template) {
  return template.id.includes('upper') ? warmUpPresets.upper : warmUpPresets.lower;
}

function formatElapsed(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

function sessionVolume(exercisesCompleted) {
  return Math.round(
    exercisesCompleted.reduce(
      (total, exercise) => total + exercise.sets.reduce((sum, set) => sum + Number(set.weight || 0) * Number(set.reps || 0), 0),
      0,
    ),
  );
}

function prsHit(exercisesCompleted, previousBests) {
  return exercisesCompleted
    .map((exercise) => {
      const best = Math.max(...exercise.sets.map((set) => estimateOneRepMax(set.weight, set.reps)));
      if (!best) return null;
      const previousBest = previousBests[exercise.id] ?? previousBests[exercise.baseExerciseId] ?? 0;
      return best > previousBest ? `${exercise.name} ${best}` : null;
    })
    .filter(Boolean);
}

export function WorkoutScreen({ addWorkout, settings, workouts }) {
  const [activeTemplateId, setActiveTemplateId] = useState(null);
  const activeTemplate = workoutTemplates.find((item) => item.id === activeTemplateId);
  const [date, setDate] = useState(toISODate());
  const [sessionExercises, setSessionExercises] = useState([]);
  const [setsByExercise, setSetsByExercise] = useState({});
  const [swapsByExercise, setSwapsByExercise] = useState({});
  const [exerciseNotes, setExerciseNotes] = useState({});
  const [newExercise, setNewExercise] = useState(defaultNewExercise);
  const [warmUps, setWarmUps] = useState({});
  const [sessionNotes, setSessionNotes] = useState('');
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [restSeconds, setRestSeconds] = useState(0);
  const [isMarkedComplete, setIsMarkedComplete] = useState(false);
  const [completedSummary, setCompletedSummary] = useState(null);
  const [status, setStatus] = useState('');

  const activeExercises = useMemo(() => {
    if (!activeTemplate) return [];
    return sessionExercises.length ? sessionExercises : activeTemplate.exercises;
  }, [activeTemplate, sessionExercises]);

  const exerciseOptions = useMemo(() => buildExerciseOptions(workouts), [workouts]);

  const suggestions = useMemo(() => {
    if (!activeTemplate) return {};
    return buildSuggestions(activeExercises, workouts, settings.units.weight);
  }, [activeExercises, activeTemplate, settings.units.weight, workouts]);

  const previousBests = useMemo(() => {
    if (!activeTemplate) return {};
    return Object.fromEntries(activeExercises.map((exercise) => [exercise.id, bestOneRepMaxForExercise(workouts, exercise)]));
  }, [activeExercises, activeTemplate, workouts]);

  useEffect(() => {
    try {
      const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? localStorage.getItem(LEGACY_DRAFT_KEY) ?? 'null');
      if (!draft?.activeTemplateId) return;
      const draftTemplate = workoutTemplates.find((template) => template.id === draft.activeTemplateId);
      setActiveTemplateId(draft.activeTemplateId);
      setDate(draft.date ?? toISODate());
      setSessionExercises(draft.sessionExercises ?? draftTemplate?.exercises ?? []);
      setSetsByExercise(draft.setsByExercise ?? {});
      setSwapsByExercise(draft.swapsByExercise ?? {});
      setExerciseNotes(draft.exerciseNotes ?? {});
      setNewExercise(draft.newExercise ?? defaultNewExercise);
      setWarmUps(draft.warmUps ?? {});
      setSessionNotes(draft.sessionNotes ?? '');
      setIsMarkedComplete(Boolean(draft.isMarkedComplete));
      setElapsedSeconds(Number(draft.elapsedSeconds ?? 0));
      setRestSeconds(Number(draft.restSeconds ?? 0));
      setIsTimerRunning(Boolean(draft.isTimerRunning));
    } catch {
      localStorage.removeItem(DRAFT_KEY);
      localStorage.removeItem(LEGACY_DRAFT_KEY);
    }
  }, []);

  useEffect(() => {
    if (!activeTemplateId) return;
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        activeTemplateId,
        date,
        sessionExercises,
        setsByExercise,
        swapsByExercise,
        exerciseNotes,
        newExercise,
        warmUps,
        sessionNotes,
        isMarkedComplete,
        elapsedSeconds,
        restSeconds,
        isTimerRunning,
      }),
    );
    localStorage.removeItem(LEGACY_DRAFT_KEY);
  }, [
    activeTemplateId,
    date,
    elapsedSeconds,
    exerciseNotes,
    isMarkedComplete,
    isTimerRunning,
    newExercise,
    restSeconds,
    sessionNotes,
    sessionExercises,
    setsByExercise,
    swapsByExercise,
    warmUps,
  ]);

  useEffect(() => {
    if (!isTimerRunning) return undefined;
    const interval = window.setInterval(() => setElapsedSeconds((current) => current + 1), 1000);
    return () => window.clearInterval(interval);
  }, [isTimerRunning]);

  useEffect(() => {
    if (!restSeconds) return undefined;
    const interval = window.setInterval(() => setRestSeconds((current) => Math.max(0, current - 1)), 1000);
    return () => window.clearInterval(interval);
  }, [restSeconds]);

  const completedSetCount = useMemo(() => Object.values(setsByExercise).flat().filter((set) => set.completed).length, [setsByExercise]);
  const totalSetCount = useMemo(() => Object.values(setsByExercise).flat().length, [setsByExercise]);

  function startWorkout(template) {
    setActiveTemplateId(template.id);
    setDate(toISODate());
    setSessionExercises(template.exercises);
    setSetsByExercise(buildSets(template.exercises, workouts, settings.units.weight));
    setSwapsByExercise({});
    setExerciseNotes({});
    setNewExercise(defaultNewExercise);
    setWarmUps(Object.fromEntries(warmUpsForTemplate(template).map((item) => [item, false])));
    setSessionNotes('');
    setElapsedSeconds(0);
    setRestSeconds(0);
    setIsTimerRunning(true);
    setIsMarkedComplete(false);
    setCompletedSummary(null);
    setStatus('');
  }

  function leaveWorkout() {
    setIsTimerRunning(false);
    setActiveTemplateId(null);
    setStatus('');
  }

  function updateSet(exerciseId, index, key, value) {
    setSetsByExercise((current) => ({
      ...current,
      [exerciseId]: (current[exerciseId] ?? []).map((set, setIndex) => (setIndex === index ? { ...set, [key]: value } : set)),
    }));
    setIsMarkedComplete(false);
  }

  function toggleSetComplete(exerciseId, index, forceComplete) {
    setSetsByExercise((current) => ({
      ...current,
      [exerciseId]: (current[exerciseId] ?? []).map((set, setIndex) => {
        if (setIndex !== index) return set;
        const completed = forceComplete ?? !set.completed;
        if (completed && !set.completed) setRestSeconds(DEFAULT_REST_SECONDS);
        return { ...set, completed };
      }),
    }));
    setIsMarkedComplete(false);
  }

  function updateExerciseNotes(exerciseId, value) {
    setExerciseNotes((current) => ({ ...current, [exerciseId]: value }));
  }

  function swapExercise(exerciseId, replacementName) {
    setSwapsByExercise((current) => {
      if (!replacementName) {
        const rest = { ...current };
        delete rest[exerciseId];
        return rest;
      }
      return { ...current, [exerciseId]: replacementName };
    });
  }

  function updateNewExercise(key, value) {
    setNewExercise((current) => ({ ...current, [key]: value }));
  }

  function addExerciseToSession() {
    if (!newExercise.name.trim()) {
      setStatus('Choose or enter an exercise first.');
      return;
    }

    const exercise = createSessionExercise(newExercise, exerciseOptions, activeExercises.length + 1);
    setSessionExercises((current) => [...(current.length ? current : activeTemplate.exercises), exercise]);
    setSetsByExercise((current) => ({
      ...current,
      [exercise.id]: buildExerciseSets(exercise, workouts, settings.units.weight),
    }));
    setNewExercise(defaultNewExercise);
    setIsMarkedComplete(false);
    setStatus(`${exercise.name} added`);
  }

  function removeExerciseFromSession(exerciseId) {
    if (activeExercises.length <= 1) {
      setStatus('Keep at least one exercise in the workout.');
      return;
    }

    setSessionExercises((current) =>
      (current.length ? current : activeTemplate.exercises)
        .filter((exercise) => exercise.id !== exerciseId)
        .map((exercise, index) => ({ ...exercise, order: index + 1 })),
    );
    setSetsByExercise((current) => {
      const next = { ...current };
      delete next[exerciseId];
      return next;
    });
    setSwapsByExercise((current) => {
      const next = { ...current };
      delete next[exerciseId];
      return next;
    });
    setExerciseNotes((current) => {
      const next = { ...current };
      delete next[exerciseId];
      return next;
    });
    setIsMarkedComplete(false);
    setStatus('Exercise removed');
  }

  function markWorkoutComplete() {
    setSetsByExercise((current) =>
      Object.fromEntries(Object.entries(current).map(([exerciseId, sets]) => [exerciseId, sets.map((set) => ({ ...set, completed: true }))])),
    );
    setIsTimerRunning(false);
    setRestSeconds(0);
    setIsMarkedComplete(true);
  }

  function buildCompletedExercises() {
    return activeExercises
      .map((exercise) => {
        const replacementName = swapsByExercise[exercise.id];
        return {
          id: exercise.id,
          baseExerciseId: exercise.baseExerciseId ?? exercise.id,
          originalName: exercise.name,
          movementPattern: movementKey(exercise),
          wasSwapped: Boolean(replacementName),
          name: replacementName || exercise.name,
          notes: exerciseNotes[exercise.id] ?? '',
          sets: (setsByExercise[exercise.id] ?? [])
            .filter((set) => set.completed || set.weight || set.rpe || set.notes)
            .map((set) => ({ reps: set.reps, weight: set.weight, rpe: set.rpe, notes: set.notes })),
        };
      })
      .filter((exercise) => exercise.sets.length);
  }

  async function saveSession() {
    if (!activeTemplate) return;
    try {
      const exercisesCompleted = buildCompletedExercises();
      if (!exercisesCompleted.length) {
        setStatus('Log at least one set before saving.');
        return;
      }
      const summary = {
        totalVolume: sessionVolume(exercisesCompleted),
        prs: prsHit(exercisesCompleted, previousBests),
        duration: Math.max(1, Math.round(elapsedSeconds / 60)),
        notes: sessionNotes,
      };
      await addWorkout({
        date,
        templateId: activeTemplate.id,
        workoutType: activeTemplate.name,
        duration: summary.duration,
        notes: sessionNotes,
        exercisesCompleted,
      });
      localStorage.removeItem(DRAFT_KEY);
      localStorage.removeItem(LEGACY_DRAFT_KEY);
      setIsTimerRunning(false);
      setRestSeconds(0);
      setSwapsByExercise({});
      setActiveTemplateId(null);
      setCompletedSummary(summary);
      setStatus('Workout saved');
    } catch (error) {
      setStatus(error.message);
    }
  }

  if (!activeTemplate) {
    return <SelectWorkoutScreen completedSummary={completedSummary} onStart={startWorkout} status={status} />;
  }

  return (
    <section className="stack workout-engine">
      <div className="section-heading">
        <button className="icon-button" type="button" onClick={leaveWorkout} aria-label="Back to workout selection">
          <ArrowLeft size={18} />
        </button>
        <div className="workout-title">
          <p className="eyebrow">Active workout</p>
          <h2>{activeTemplate.name}</h2>
        </div>
      </div>

      <article className="panel timer-panel">
        <div>
          <span className="eyebrow">Timer</span>
          <strong>{formatElapsed(elapsedSeconds)}</strong>
        </div>
        <div className="timer-actions">
          <button className="icon-button" type="button" onClick={() => setIsTimerRunning((current) => !current)} aria-label="Start or pause timer">
            {isTimerRunning ? <Pause size={18} /> : <Play size={18} />}
          </button>
          <button className="icon-button" type="button" onClick={() => setElapsedSeconds(0)} aria-label="Reset timer">
            <TimerReset size={18} />
          </button>
        </div>
      </article>

      <div className="panel workout-meta">
        <label className="field">
          <span>Date</span>
          <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </label>
        <div className="progress-stat">
          <span>Sets complete</span>
          <strong>
            {completedSetCount}/{totalSetCount}
          </strong>
        </div>
      </div>

      {restSeconds ? (
        <article className="panel rest-timer">
          <div>
            <span className="eyebrow">Rest</span>
            <strong>{formatElapsed(restSeconds)}</strong>
          </div>
          <button className="primary-button secondary" type="button" onClick={() => setRestSeconds(0)}>
            Skip
          </button>
        </article>
      ) : null}

      <WarmUpChecklist warmUps={warmUps} onToggle={(item) => setWarmUps((current) => ({ ...current, [item]: !current[item] }))} />

      {activeExercises.map((exercise) => (
        <ExerciseLogger
          canRemove={activeExercises.length > 1}
          exercise={exercise}
          exerciseNotes={exerciseNotes}
          key={exercise.id}
          onRemoveExercise={removeExerciseFromSession}
          onSwipeComplete={(index) => toggleSetComplete(exercise.id, index, true)}
          onSwapExercise={swapExercise}
          onToggleSetComplete={toggleSetComplete}
          onUpdateExerciseNotes={updateExerciseNotes}
          onUpdateSet={updateSet}
          previousBest={previousBests[exercise.id]}
          sets={setsByExercise[exercise.id] ?? []}
          suggestion={suggestions[exercise.id]}
          swappedName={swapsByExercise[exercise.id]}
          weightUnit={settings.units.weight}
        />
      ))}

      <AddExercisePanel
        exerciseOptions={exerciseOptions}
        newExercise={newExercise}
        onAddExercise={addExerciseToSession}
        onUpdateNewExercise={updateNewExercise}
      />

      <label className="field panel">
        <span>Session notes</span>
        <textarea value={sessionNotes} onChange={(event) => setSessionNotes(event.target.value)} />
      </label>

      <div className="button-row sticky-action">
        <button className="primary-button secondary" type="button" onClick={markWorkoutComplete}>
          <Check size={18} />
          Mark complete
        </button>
        <button className="primary-button" type="button" onClick={saveSession}>
          <Save size={18} />
          {isMarkedComplete ? 'Save session' : 'Save session anyway'}
        </button>
      </div>
      {status ? <p className="save-status">{status}</p> : null}
    </section>
  );
}

function WarmUpChecklist({ warmUps, onToggle }) {
  const items = Object.keys(warmUps);
  if (!items.length) return null;
  return (
    <article className="panel warmup-card">
      <div>
        <p className="eyebrow">Warm-up</p>
        <h3>Checklist</h3>
      </div>
      <div className="warmup-list">
        {items.map((item) => (
          <button className={warmUps[item] ? 'warmup-item done' : 'warmup-item'} key={item} type="button" onClick={() => onToggle(item)}>
            <span>{warmUps[item] ? <Check size={15} /> : null}</span>
            {item}
          </button>
        ))}
      </div>
    </article>
  );
}

function ExerciseLogger({
  canRemove,
  exercise,
  exerciseNotes,
  onRemoveExercise,
  onSwipeComplete,
  onSwapExercise,
  onToggleSetComplete,
  onUpdateExerciseNotes,
  onUpdateSet,
  previousBest,
  sets,
  suggestion,
  swappedName,
  weightUnit,
}) {
  const substitutions = getExerciseSubstitutions(exercise.baseExerciseId ?? exercise.id);
  const displayName = swappedName || exercise.name;

  return (
    <article className="panel exercise-card">
      <div className="exercise-title">
        <div>
          <p className="eyebrow">Exercise {exercise.order}</p>
          <h3>{displayName}</h3>
          <p>
            {exercise.sets} x {exercise.reps}
            {swappedName ? ` / swapped from ${exercise.name}` : ''}
          </p>
        </div>
        <div className="exercise-actions">
          <span className="target-pill">{previousBest ? `Best ${previousBest}` : exercise.target}</span>
          {canRemove ? (
            <button className="icon-button danger" type="button" onClick={() => onRemoveExercise(exercise.id)} aria-label={`Remove ${exercise.name}`}>
              <Trash2 size={17} />
            </button>
          ) : null}
        </div>
      </div>

      <p className="overload-tip">{suggestion}</p>

      {substitutions.length ? (
        <label className="field swap-field">
          <span>
            <RefreshCw size={15} />
            Swap Exercise
          </span>
          <select value={swappedName ?? ''} onChange={(event) => onSwapExercise(exercise.id, event.target.value)}>
            <option value="">Keep {exercise.name}</option>
            {substitutions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <div className="set-grid">
        {sets.map((set, index) => (
          <SwipeSetRow
            displayName={displayName}
            exerciseId={exercise.id}
            index={index}
            key={`${exercise.id}-${index}`}
            onSwipeComplete={onSwipeComplete}
            onToggleSetComplete={onToggleSetComplete}
            onUpdateSet={onUpdateSet}
            previousBest={previousBest}
            set={set}
            weightUnit={weightUnit}
          />
        ))}
      </div>

      <label className="field">
        <span>Exercise notes</span>
        <textarea value={exerciseNotes[exercise.id] ?? ''} onChange={(event) => onUpdateExerciseNotes(exercise.id, event.target.value)} />
      </label>
    </article>
  );
}

function AddExercisePanel({ exerciseOptions, newExercise, onAddExercise, onUpdateNewExercise }) {
  const selectedExercise = exerciseOptions.some((option) => option.name === newExercise.name) ? newExercise.name : '';

  return (
    <article className="panel add-exercise-card">
      <div>
        <p className="eyebrow">Customize</p>
        <h3>Add Exercise</h3>
      </div>

      <label className="field">
        <span>Choose exercise</span>
        <select value={selectedExercise} onChange={(event) => onUpdateNewExercise('name', event.target.value)}>
          <option value="">Custom exercise</option>
          {exerciseOptions.map((option) => (
            <option key={`${option.baseExerciseId}-${option.name}`} value={option.name}>
              {option.name}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>Exercise name</span>
        <input
          list="exercise-options"
          placeholder="Type any exercise"
          value={newExercise.name}
          onChange={(event) => onUpdateNewExercise('name', event.target.value)}
        />
        <datalist id="exercise-options">
          {exerciseOptions.map((option) => (
            <option key={option.name} value={option.name} />
          ))}
        </datalist>
      </label>

      <div className="exercise-add-grid">
        <label className="field">
          <span>Sets</span>
          <input
            inputMode="numeric"
            min="1"
            type="number"
            value={newExercise.sets}
            onChange={(event) => onUpdateNewExercise('sets', event.target.value)}
          />
        </label>
        <label className="field">
          <span>Target reps</span>
          <input
            inputMode="numeric"
            placeholder="10"
            value={newExercise.reps}
            onChange={(event) => onUpdateNewExercise('reps', event.target.value)}
          />
        </label>
      </div>

      <button className="primary-button" type="button" onClick={onAddExercise}>
        <Plus size={18} />
        Add exercise
      </button>
    </article>
  );
}

function SwipeSetRow({ displayName, exerciseId, index, onSwipeComplete, onToggleSetComplete, onUpdateSet, previousBest, set, weightUnit }) {
  const startX = useRef(null);

  function endSwipe(clientX) {
    if (startX.current !== null && clientX - startX.current > 70) onSwipeComplete(index);
    startX.current = null;
  }

  return (
    <div
      className={set.completed ? 'set-row logged swipe-row' : 'set-row swipe-row'}
      onMouseDown={(event) => {
        startX.current = event.clientX;
      }}
      onMouseUp={(event) => endSwipe(event.clientX)}
      onTouchStart={(event) => {
        startX.current = event.touches[0].clientX;
      }}
      onTouchEnd={(event) => endSwipe(event.changedTouches[0].clientX)}
    >
      <button
        className="set-check"
        type="button"
        onClick={() => onToggleSetComplete(exerciseId, index)}
        aria-label={`Mark ${displayName} set ${index + 1} complete`}
      >
        {set.completed ? <Check size={15} /> : index + 1}
      </button>
      <input
        inputMode="numeric"
        placeholder="reps"
        type="number"
        value={set.reps}
        onChange={(event) => onUpdateSet(exerciseId, index, 'reps', event.target.value)}
      />
      <input
        inputMode="decimal"
        placeholder={weightUnit}
        type="number"
        value={set.weight}
        onChange={(event) => onUpdateSet(exerciseId, index, 'weight', event.target.value)}
      />
      <input
        inputMode="decimal"
        max="10"
        min="1"
        placeholder="RPE"
        type="number"
        value={set.rpe}
        onChange={(event) => onUpdateSet(exerciseId, index, 'rpe', event.target.value)}
      />
      <small>{previousBest ? `Best ${previousBest}` : 'Swipe'}</small>
    </div>
  );
}

function SelectWorkoutScreen({ completedSummary, onStart, status }) {
  return (
    <section className="stack">
      <div>
        <p className="eyebrow">Workout</p>
        <h2>Select Workout</h2>
      </div>

      {completedSummary ? <WorkoutSummary summary={completedSummary} /> : null}

      <div className="workout-template-grid">
        {workoutTemplates.map((template) => (
          <button className="workout-template-button" key={template.id} type="button" onClick={() => onStart(template)}>
            <span className="action-icon">
              <Dumbbell size={22} />
            </span>
            <span>
              <strong>{template.name}</strong>
              <small>{template.focus}</small>
              <em>
                <Clock size={14} />
                {template.estimatedMinutes} min / {template.exercises.length} exercises
              </em>
            </span>
          </button>
        ))}
      </div>
      {status ? <p className="save-status">{status}</p> : null}
    </section>
  );
}

function WorkoutSummary({ summary }) {
  return (
    <article className="panel workout-summary">
      <div>
        <p className="eyebrow">Workout saved</p>
        <h3>Session summary</h3>
      </div>
      <div className="summary-grid compact">
        <div>
          <span>Total volume</span>
          <strong>{summary.totalVolume}</strong>
        </div>
        <div>
          <span>Duration</span>
          <strong>{summary.duration} min</strong>
        </div>
        <div>
          <span>PRs hit</span>
          <strong>{summary.prs.length || 0}</strong>
        </div>
      </div>
      {summary.prs.length ? <p className="muted">{summary.prs.join(', ')}</p> : <p className="muted">No PRs this time.</p>}
      {summary.notes ? <p>{summary.notes}</p> : null}
    </article>
  );
}
