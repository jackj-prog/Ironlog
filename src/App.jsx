import { Activity, Dumbbell, Home, LineChart, Ruler, Settings } from 'lucide-react';
import { useEffect, useState } from 'react';
import { brand } from './config/branding';

const tabs = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'workout', label: 'Workout', icon: Dumbbell },
  { id: 'body', label: 'Body', icon: Ruler },
  { id: 'graphs', label: 'Graphs', icon: LineChart },
  { id: 'settings', label: 'Settings', icon: Settings },
];

function normalizeTabId(tabId) {
  return tabs.some((tab) => tab.id === tabId) ? tabId : 'home';
}

function getInitialTab() {
  return normalizeTabId(new URLSearchParams(window.location.search).get('tab'));
}

export default function App() {
  const [activeTab, setActiveTab] = useState(getInitialTab);

  useEffect(() => {
    document.body.classList.remove('light-mode');
  }, []);

  function openTab(tabId) {
    const nextTab = normalizeTabId(tabId);
    setActiveTab(nextTab);
    const url = new URL(window.location.href);
    if (nextTab === 'home') url.searchParams.delete('tab');
    else url.searchParams.set('tab', nextTab);
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true" />
          <div>
            <p className="eyebrow">{brand.eyebrow || 'Private training log'}</p>
            <h1>{brand.name || 'IronLog'}</h1>
          </div>
        </div>
        <div className="status-pill">
          <Activity size={16} /> Live
        </div>
      </header>

      <main className="screen">
        <section className="stack">
          <div className="hero-card">
            <p className="eyebrow">Launch check</p>
            <h2>IronLog is online</h2>
            <p>Your GitHub Pages deployment is working. The full tracker shell is loading safely.</p>
          </div>
          <div className="summary-grid">
            <div className="metric-card"><span>Current weight</span><strong>172 lb</strong><small>Starting baseline</small></div>
            <div className="metric-card"><span>Goal mode</span><strong>Lean gain</strong><small>6 month foundation</small></div>
            <div className="metric-card"><span>Training</span><strong>5x/week</strong><small>Upper/lower/full split</small></div>
            <div className="metric-card"><span>Next</span><strong>{tabs.find((tab) => tab.id === activeTab)?.label}</strong><small>Selected tab</small></div>
          </div>
          <div className="action-grid">
            <button className="primary-action" type="button" onClick={() => openTab('workout')}><Dumbbell /> Start Workout</button>
            <button className="primary-action" type="button" onClick={() => openTab('body')}><Ruler /> Log Weight / Measurements</button>
            <button className="primary-action" type="button" onClick={() => openTab('graphs')}><LineChart /> View Progress</button>
          </div>
        </section>
      </main>

      <nav className="bottom-tabs" aria-label="Primary navigation">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} className={activeTab === tab.id ? 'tab active' : 'tab'} type="button" onClick={() => openTab(tab.id)}>
              <Icon size={20} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
