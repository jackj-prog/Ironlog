import { Check, ClipboardPen, Pencil, Plus, Ruler, Scale, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { DateField } from '../components/DateField';
import { measurementFields } from '../config/measurementFields';
import { formatShortDate, toISODate } from '../utils/date';

function emptyMeasurements() {
  return Object.fromEntries(measurementFields.map((field) => [field.id, '']));
}

function latestMeasurementValues(measurements) {
  const latest = {};
  measurementFields.forEach((field) => {
    const record = [...measurements].reverse().find((entry) => entry[field.id] !== null && entry[field.id] !== undefined);
    latest[field.id] = record?.[field.id] ?? '';
  });
  return latest;
}

function fieldSummary(record, fields, unit) {
  return fields
    .filter((field) => record[field.id] !== null && record[field.id] !== undefined)
    .slice(0, 3)
    .map((field) => `${field.label} ${record[field.id]} ${unit}`)
    .join(' / ');
}

export function BodyScreen({
  addWeight,
  updateWeight,
  deleteWeight,
  addMeasurements,
  updateMeasurements,
  deleteMeasurements,
  weights,
  measurements,
  settings,
}) {
  const [activeMode, setActiveMode] = useState('weight');
  const weightUnit = settings.units.weight;
  const measurementUnit = settings.units.measurement;
  const fields = useMemo(() => measurementFields.map((field) => ({ ...field, unit: measurementUnit })), [measurementUnit]);

  return (
    <section className="stack">
      <div>
        <p className="eyebrow">Body</p>
        <h2>Body log</h2>
      </div>

      <div className="segmented-control" aria-label="Body log mode">
        <button className={activeMode === 'weight' ? 'active' : ''} type="button" onClick={() => setActiveMode('weight')}>
          <Scale size={17} />
          Weight
        </button>
        <button className={activeMode === 'measurements' ? 'active' : ''} type="button" onClick={() => setActiveMode('measurements')}>
          <Ruler size={17} />
          Measurements
        </button>
      </div>

      {activeMode === 'weight' ? (
        <WeightLogPanel
          addWeight={addWeight}
          deleteWeight={deleteWeight}
          updateWeight={updateWeight}
          weightUnit={weightUnit}
          weights={weights}
        />
      ) : (
        <MeasurementLogPanel
          addMeasurements={addMeasurements}
          deleteMeasurements={deleteMeasurements}
          fields={fields}
          measurementUnit={measurementUnit}
          measurements={measurements}
          updateMeasurements={updateMeasurements}
        />
      )}
    </section>
  );
}

function WeightLogPanel({ addWeight, updateWeight, deleteWeight, weights, weightUnit }) {
  const [editingId, setEditingId] = useState(null);
  const [date, setDate] = useState(toISODate());
  const [bodyweight, setBodyweight] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState(null);

  function resetForm() {
    setEditingId(null);
    setDate(toISODate());
    setBodyweight('');
    setNotes('');
  }

  function editLog(log) {
    setEditingId(log.id);
    setDate(log.date);
    setBodyweight(log.bodyweight);
    setNotes(log.notes ?? '');
    setStatus('');
  }

  async function saveLog(event) {
    event.preventDefault();
    try {
      if (editingId) {
        await updateWeight(editingId, { date, bodyweight, notes });
        setStatus('Weight log updated');
      } else {
        await addWeight(bodyweight, date, notes);
        setStatus('Weight saved');
      }
      resetForm();
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function removeLog(id) {
    await deleteWeight(id);
    if (editingId === id) resetForm();
    setPendingDeleteId(null);
    setStatus('Weight log deleted');
  }

  return (
    <>
      <form className="panel form-panel" onSubmit={saveLog}>
        <div className="section-heading">
          <h2>Log Weight</h2>
          {editingId ? (
            <button className="icon-button" type="button" onClick={resetForm} aria-label="Cancel edit">
              <X size={18} />
            </button>
          ) : null}
        </div>
        <DateField value={date} onChange={setDate} />
        <label className="field">
          <span>Bodyweight ({weightUnit})</span>
          <input
            inputMode="decimal"
            min="0"
            required
            type="number"
            value={bodyweight}
            onChange={(event) => setBodyweight(event.target.value)}
          />
        </label>
        <label className="field">
          <span>Notes</span>
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} />
        </label>
        <button className="primary-button" type="submit">
          {editingId ? <Check size={18} /> : <Plus size={18} />}
          {editingId ? 'Update weight' : 'Save weight'}
        </button>
        {status ? <p className="save-status">{status}</p> : null}
      </form>

      <HistoryList title="Recent weight logs">
        {[...weights].reverse().map((entry) => (
          <article className="history-card" key={entry.id}>
            <div>
              <span>{formatShortDate(entry.date)}</span>
              <strong>
                {entry.bodyweight} {weightUnit}
              </strong>
              {entry.notes ? <small>{entry.notes}</small> : null}
            </div>
            <div className="row-actions">
              {pendingDeleteId === entry.id ? (
                <>
                  <button className="icon-button danger" type="button" onClick={() => removeLog(entry.id)} aria-label="Confirm delete weight log">
                    <Check size={17} />
                  </button>
                  <button className="icon-button" type="button" onClick={() => setPendingDeleteId(null)} aria-label="Cancel delete weight log">
                    <X size={17} />
                  </button>
                </>
              ) : (
                <>
                  <button className="icon-button" type="button" onClick={() => editLog(entry)} aria-label="Edit weight log">
                    <Pencil size={17} />
                  </button>
                  <button className="icon-button danger" type="button" onClick={() => setPendingDeleteId(entry.id)} aria-label="Delete weight log">
                    <Trash2 size={17} />
                  </button>
                </>
              )}
            </div>
          </article>
        ))}
      </HistoryList>
    </>
  );
}

function MeasurementLogPanel({ addMeasurements, updateMeasurements, deleteMeasurements, measurements, fields, measurementUnit }) {
  const previousValues = useMemo(() => latestMeasurementValues(measurements), [measurements]);
  const [editingId, setEditingId] = useState(null);
  const [date, setDate] = useState(toISODate());
  const [values, setValues] = useState(emptyMeasurements);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState(null);

  useEffect(() => {
    if (!editingId) setValues(previousValues);
  }, [editingId, previousValues]);

  function updateValue(id, value) {
    setValues((current) => ({ ...current, [id]: value }));
  }

  function resetForm(usePrevious = true) {
    setEditingId(null);
    setDate(toISODate());
    setNotes('');
    setValues(usePrevious ? previousValues : emptyMeasurements());
  }

  function editLog(log) {
    setEditingId(log.id);
    setDate(log.date);
    setNotes(log.notes ?? '');
    setValues(Object.fromEntries(fields.map((field) => [field.id, log[field.id] ?? ''])));
    setStatus('');
  }

  async function saveLog(event) {
    event.preventDefault();
    try {
      if (editingId) {
        await updateMeasurements(editingId, { ...values, date, notes });
        setStatus('Measurements updated. Body fat recalculated.');
      } else {
        await addMeasurements(values, date, notes);
        setStatus('Measurements saved. Body fat recalculated.');
      }
      resetForm(true);
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function removeLog(id) {
    await deleteMeasurements(id);
    if (editingId === id) resetForm(true);
    setPendingDeleteId(null);
    setStatus('Measurement log deleted. Body fat recalculated.');
  }

  return (
    <>
      <form className="panel form-panel" onSubmit={saveLog}>
        <div className="section-heading">
          <h2>Log Measurements</h2>
          <button className="icon-button" type="button" onClick={() => setValues(previousValues)} aria-label="Fill previous measurements">
            <ClipboardPen size={18} />
          </button>
        </div>
        <DateField value={date} onChange={setDate} />
        <div className="field-grid measurement-grid">
          {fields.map((field) => (
            <label key={field.id} className="field">
              <span>{field.label}</span>
              <input
                inputMode="decimal"
                min="0"
                placeholder={field.unit}
                type="number"
                value={values[field.id] ?? ''}
                onChange={(event) => updateValue(field.id, event.target.value)}
              />
            </label>
          ))}
        </div>
        <label className="field">
          <span>Notes</span>
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} />
        </label>
        <div className="button-row">
          {editingId ? (
            <button className="primary-button secondary" type="button" onClick={() => resetForm(true)}>
              <X size={18} />
              Cancel
            </button>
          ) : null}
          <button className="primary-button" type="submit">
            {editingId ? <Check size={18} /> : <Plus size={18} />}
            {editingId ? 'Update measurements' : 'Save measurements'}
          </button>
        </div>
        {status ? <p className="save-status">{status}</p> : null}
      </form>

      <HistoryList title="Recent measurement logs">
        {[...measurements].reverse().map((entry) => (
          <article className="history-card" key={entry.id}>
            <div>
              <span>{formatShortDate(entry.date)}</span>
              <strong>{fieldSummary(entry, fields, measurementUnit) || 'Measurements logged'}</strong>
              {entry.notes ? <small>{entry.notes}</small> : null}
            </div>
            <div className="row-actions">
              {pendingDeleteId === entry.id ? (
                <>
                  <button className="icon-button danger" type="button" onClick={() => removeLog(entry.id)} aria-label="Confirm delete measurement log">
                    <Check size={17} />
                  </button>
                  <button className="icon-button" type="button" onClick={() => setPendingDeleteId(null)} aria-label="Cancel delete measurement log">
                    <X size={17} />
                  </button>
                </>
              ) : (
                <>
                  <button className="icon-button" type="button" onClick={() => editLog(entry)} aria-label="Edit measurement log">
                    <Pencil size={17} />
                  </button>
                  <button className="icon-button danger" type="button" onClick={() => setPendingDeleteId(entry.id)} aria-label="Delete measurement log">
                    <Trash2 size={17} />
                  </button>
                </>
              )}
            </div>
          </article>
        ))}
      </HistoryList>
    </>
  );
}

function HistoryList({ title, children }) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);

  return (
    <article className="panel history-list rich-history">
      <h3>{title}</h3>
      {hasChildren ? children : <p className="muted">No logs yet.</p>}
    </article>
  );
}
