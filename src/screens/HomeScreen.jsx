import { Dumbbell, Ruler, Scale } from 'lucide-react';
import { ActionButton } from '../components/ActionButton';
import { SummaryCard } from '../components/SummaryCard';
import { formatShortDate } from '../utils/date';

function formatChange(value, unit) {
  if (value === null || value === undefined) return 'Need more logs';
  const prefix = value > 0 ? '+' : '';
  return `${prefix}${value} ${unit}`;
}

function formatPercentChange(value) {
  if (value === null || value === undefined) return 'Need more logs';
  const prefix = value > 0 ? '+' : '';
  return `${prefix}${value}%`;
}

export function HomeScreen({ summary, settings, setActiveTab }) {
  const weightUnit = settings.units.weight;
  const measurementUnit = settings.units.measurement;

  return (
    <section className="stack">
      <div className="hero-block">
        <p className="eyebrow">Today</p>
        <h2>Ready when you are.</h2>
      </div>

      <div className="action-grid">
        <ActionButton icon={Dumbbell} label="Start Workout" detail="Use a saved template" onClick={() => setActiveTab('workout')} />
        <ActionButton icon={Scale} label="Log Weight" detail="Quick bodyweight entry" onClick={() => setActiveTab('body')} />
        <ActionButton icon={Ruler} label="Log Measurements" detail="Waist, neck, limbs" onClick={() => setActiveTab('body')} />
      </div>

      <div className="summary-grid">
        <SummaryCard
          label="Current bodyweight"
          value={summary.currentBodyweight ? `${summary.currentBodyweight} ${weightUnit}` : 'Not logged'}
          tone="accent"
        />
        <SummaryCard
          label="Estimated body fat"
          value={summary.estimatedBodyFat ? `${summary.estimatedBodyFat}%` : summary.bodyFatUnavailableReason || 'Add waist + neck'}
        />
        <SummaryCard label="Body fat change 30d" value={formatPercentChange(summary.bodyFatChange30)} />
        <SummaryCard label="Lean mass trend 30d" value={formatChange(summary.leanMassTrend30, weightUnit)} tone="success" />
        <SummaryCard label="Current lean mass" value={summary.leanBodyMass ? `${summary.leanBodyMass} ${weightUnit}` : 'Unavailable'} />
        <SummaryCard label="Current fat mass" value={summary.fatMass ? `${summary.fatMass} ${weightUnit}` : 'Unavailable'} />
        <SummaryCard
          label="Latest workout"
          value={summary.latestWorkout ? `${summary.latestWorkout.workoutType} - ${formatShortDate(summary.latestWorkout.date)}` : 'None yet'}
        />
        <SummaryCard label="Weight change 30d" value={formatChange(summary.weightChange30, weightUnit)} />
        <SummaryCard label="Waist change 30d" value={formatChange(summary.waistChange30, measurementUnit)} />
        <SummaryCard
          label="Most improved lift"
          value={
            summary.mostImprovedLift
              ? `${summary.mostImprovedLift.name} +${summary.mostImprovedLift.improvement} est. 1RM`
              : 'Need 2 sessions'
          }
        />
      </div>

      <div className="coaching-section">
        <div>
          <p className="eyebrow">Coaching</p>
          <h2>Current read</h2>
        </div>
        <div className="summary-grid">
          {(summary.coachingInsights ?? []).map((insight) => (
            <SummaryCard key={insight.title} label={insight.title} value={insight.message} tone={insight.tone} />
          ))}
        </div>
      </div>
    </section>
  );
}
