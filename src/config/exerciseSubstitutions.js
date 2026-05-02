export const exerciseSubstitutions = {
  'bench-press': {
    movementPattern: 'horizontal-press',
    options: ['Dumbbell Bench', 'Machine Chest Press', 'Smith Bench'],
  },
  'back-squat': {
    movementPattern: 'squat',
    options: ['Hack Squat', 'Leg Press', 'Bulgarian Split Squat'],
  },
  deadlift: {
    movementPattern: 'hinge',
    options: ['Trap Bar Deadlift', 'Rack Pull', 'Romanian Deadlift'],
  },
  'pull-ups': {
    movementPattern: 'vertical-pull',
    options: ['Lat Pulldown', 'Assisted Pull-Up'],
  },
  'barbell-row': {
    movementPattern: 'row',
    options: ['Chest Supported Row', 'Cable Row', 'Dumbbell Row'],
  },
  'row-variation': {
    movementPattern: 'row',
    options: ['Chest Supported Row', 'Cable Row', 'Dumbbell Row'],
  },
  'incline-db-press': {
    movementPattern: 'incline-press',
    options: ['Incline Machine Press', 'Smith Incline Press', 'Low Incline Barbell Press'],
  },
  'overhead-press': {
    movementPattern: 'vertical-press',
    options: ['Dumbbell Shoulder Press', 'Machine Shoulder Press', 'Landmine Press'],
  },
  'face-pulls': {
    movementPattern: 'rear-delt',
    options: ['Reverse Pec Deck', 'Rear Delt Cable Fly', 'Band Face Pull'],
  },
  'weighted-dips': {
    movementPattern: 'dip',
    options: ['Machine Dip', 'Close-Grip Bench', 'Deficit Push-Up'],
  },
  'ez-curl': {
    movementPattern: 'curl',
    options: ['Cable Curl', 'Dumbbell Curl', 'Preacher Curl'],
  },
  'leg-press': {
    movementPattern: 'squat-accessory',
    options: ['Hack Squat', 'Front Squat', 'Goblet Squat'],
  },
  'walking-lunges': {
    movementPattern: 'single-leg',
    options: ['Reverse Lunge', 'Bulgarian Split Squat', 'Step-Up'],
  },
  'calf-raise-a': {
    movementPattern: 'calf-raise',
    options: ['Seated Calf Raise', 'Standing Calf Raise', 'Leg Press Calf Raise'],
  },
  'calf-raise-b': {
    movementPattern: 'calf-raise',
    options: ['Seated Calf Raise', 'Standing Calf Raise', 'Leg Press Calf Raise'],
  },
  'leg-extension': {
    movementPattern: 'knee-extension',
    options: ['Sissy Squat', 'Spanish Squat', 'Single-Leg Extension'],
  },
  'lateral-raise': {
    movementPattern: 'lateral-delt',
    options: ['Cable Lateral Raise', 'Machine Lateral Raise', 'Lean-Away Lateral Raise'],
  },
  'cable-fly': {
    movementPattern: 'chest-fly',
    options: ['Pec Deck', 'Dumbbell Fly', 'Machine Fly'],
  },
  'hammer-curl': {
    movementPattern: 'curl',
    options: ['Cable Hammer Curl', 'Cross-Body Curl', 'Rope Curl'],
  },
  pushdown: {
    movementPattern: 'triceps-extension',
    options: ['Overhead Cable Extension', 'Machine Extension', 'Close-Grip Push-Up'],
  },
  'romanian-deadlift': {
    movementPattern: 'hinge-accessory',
    options: ['Good Morning', 'Cable Pull-Through', 'Hip Thrust'],
  },
  'leg-curl': {
    movementPattern: 'knee-flexion',
    options: ['Seated Leg Curl', 'Nordic Curl', 'Stability Ball Curl'],
  },
  'hip-thrust': {
    movementPattern: 'hip-extension',
    options: ['Glute Bridge', 'Cable Pull-Through', '45-Degree Back Extension'],
  },
  'squat-variation': {
    movementPattern: 'squat',
    options: ['Back Squat', 'Hack Squat', 'Leg Press', 'Bulgarian Split Squat'],
  },
  'bench-variation': {
    movementPattern: 'horizontal-press',
    options: ['Bench Press', 'Dumbbell Bench', 'Machine Chest Press', 'Smith Bench'],
  },
  'weak-point-block': {
    movementPattern: 'weak-point',
    options: ['Rear Delt Block', 'Arm Block', 'Core Block', 'Calf Block'],
  },
};

export function getExerciseSubstitutions(exerciseId) {
  return exerciseSubstitutions[exerciseId]?.options ?? [];
}

export function getMovementPattern(exerciseId) {
  return exerciseSubstitutions[exerciseId]?.movementPattern ?? exerciseId;
}
