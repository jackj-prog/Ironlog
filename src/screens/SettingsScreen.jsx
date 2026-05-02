import { Download, Moon, Sun, Trash2, Upload } from 'lucide-react';
import { useEffect, useState } from 'react';

function downloadJson(filename, jsonText) {
  const blob = new Blob([jsonText], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function SettingsScreen({ settings, saveSettings, resetAllData, exportBackup, importBackup }) {
  const [draft, setDraft] = useState(settings);
  const [backupText, setBackupText] = useState('');
  const [status, setStatus] = useState('');
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  function update(key, value) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function updateNested(group, key, value) {
    setDraft((current) => ({ ...current, [group]: { ...current[group], [key]: value } }));
  }

  async function saveProfile(event) {
    event.preventDefault();
    try {
      await saveSettings({ ...draft, profile: { ...draft.profile, heightCm: Number(draft.profile.heightCm) } });
      setStatus('Settings saved');
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function handleExport() {
    try {
      const backup = await exportBackup();
      const json = JSON.stringify(backup, null, 2);
      setBackupText(json);
      downloadJson(`fitness-backup-${new Date().toISOString().slice(0, 10)}.json`, json);
      await saveSettings({ ...settings, backup: { ...settings.backup, lastBackupAt: new Date().toISOString() } });
      setStatus('Backup exported');
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function handleImport() {
    try {
      await importBackup(backupText);
      setStatus('Backup imported and validated');
      setIsConfirmingClear(false);
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function handleClearAll() {
    await resetAllData();
    setBackupText('');
    setIsConfirmingClear(false);
    setStatus('All local data cleared');
  }

  return (
    <section className="stack">
      <div>
        <p className="eyebrow">Settings</p>
        <h2>Profile and data</h2>
      </div>

      <form className="panel form-panel" onSubmit={saveProfile}>
        <label className="field">
          <span>Weight units</span>
          <select value={draft.units.weight} onChange={(event) => updateNested('units', 'weight', event.target.value)}>
            <option value="kg">kg</option>
            <option value="lb">lb</option>
          </select>
        </label>
        <label className="field">
          <span>Measurement units</span>
          <select value={draft.units.measurement} onChange={(event) => updateNested('units', 'measurement', event.target.value)}>
            <option value="cm">cm</option>
            <option value="in">in</option>
          </select>
        </label>
        <label className="field">
          <span>Height (cm)</span>
          <input
            inputMode="decimal"
            min="0"
            type="number"
            value={draft.profile.heightCm}
            onChange={(event) => updateNested('profile', 'heightCm', event.target.value)}
          />
        </label>
        <label className="field">
          <span>Body fat formula sex</span>
          <select value={draft.profile.sex} onChange={(event) => updateNested('profile', 'sex', event.target.value)}>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </label>
        <label className="toggle-row">
          <span>{draft.darkMode ? 'Dark mode' : 'Light mode'}</span>
          <button className="icon-button" type="button" onClick={() => update('darkMode', !draft.darkMode)} aria-label="Toggle dark or light mode">
            {draft.darkMode ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </label>
        <button className="primary-button" type="submit">
          Save settings
        </button>
      </form>

      <article className="panel form-panel">
        <div>
          <h3>Data protection</h3>
          <p className="muted">Exports include schema metadata and an integrity checksum. Imports are validated before replacing local data.</p>
        </div>
        <button className="primary-button" type="button" onClick={handleExport}>
          <Download size={18} />
          Export all data to JSON
        </button>
        <label className="field">
          <span>Import backup JSON</span>
          <textarea
            aria-label="Backup JSON"
            placeholder="Paste backup JSON here"
            value={backupText}
            onChange={(event) => setBackupText(event.target.value)}
          />
        </label>
        <button className="primary-button secondary" type="button" onClick={handleImport}>
          <Upload size={18} />
          Validate and import backup
        </button>
        {status ? <p className="save-status">{status}</p> : null}
      </article>

      <article className="panel danger-zone">
        <div>
          <h3>Clear all data</h3>
          <p>Everything is stored on this device. Export a backup before clearing.</p>
        </div>
        {isConfirmingClear ? (
          <div className="clear-confirm">
            <p>Confirm clear all local fitness data?</p>
            <div className="button-row">
              <button className="danger-button" type="button" onClick={handleClearAll}>
                <Trash2 size={18} />
                Yes, clear all data
              </button>
              <button className="primary-button secondary" type="button" onClick={() => setIsConfirmingClear(false)}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button className="danger-button" type="button" onClick={() => setIsConfirmingClear(true)}>
            <Trash2 size={18} />
            Clear all data
          </button>
        )}
      </article>
    </section>
  );
}
