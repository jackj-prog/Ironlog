import { Activity, Dumbbell, Home, LineChart, Ruler, Settings } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useFitnessData } from './hooks/useFitnessData';
import { brand } from './config/branding';
import { BodyScreen } from './screens/BodyScreen';
import { GraphsScreen } from './screens/GraphsScreen';
import { HomeScreen } from './screens/HomeScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { WorkoutScreen } from './screens/WorkoutScreen';

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
  const data = useFitnessData();

  useEffect(() => {
    document.body.classList.toggle('light-mode', !data.settings.darkMode);
  }, [data.settings.darkMode]);

  function openTab(tabId) {
    const nextTab = normalizeTabId(tabId);
    setActiveTab(nextTab);

    const url = new URL(window.location.href);
    if (nextTab === 'home') {
      url.searchParams.delete('tab');
    } else {
      url.searchParams.set('tab', nextTab);
    }
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
  }

  const props = { ...data, setActiveTab: openTab };
  let activeScreen = <HomeScreen {...props} />;
  if (activeTab === 'workout') activeScreen = <WorkoutScreen {...props} />;
  if (activeTab === 'body') activeScreen = <BodyScreen {...props} />;
  if (activeTab === 'graphs') activeScreen = <GraphsScreen {...props} />;
  if (activeTab === 'settings') activeScreen = <SettingsScreen {...props} />;

  return (
    <div className={data.settings.darkMode ? 'app-shell' : 'app-shell light-mode'}>
      <header className="topbar">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true" />
          <div>
            <p className="eyebrow">{brand.eyebrow}</p>
            <h1>{brand.name}</h1>
          </div>
        </div>
        <div className="status-pill">
          <Activity size={16} />
          {brand.status}
        </div>
      </header>

      <main className="screen">
        {data.lastError ? <StateMessage title="Could not load local data" message={data.lastError} /> : data.isReady ? activeScreen : <LoadingScreen />}
      </main>

      <nav className="bottom-tabs" aria-label="Primary navigation">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              className={activeTab === tab.id ? 'tab active' : 'tab'}
              type="button"
              aria-current={activeTab === tab.id ? 'page' : undefined}
              title={tab.label}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon size={20} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

function LoadingScreen() {
  return (
    <section className="stack loading-screen" aria-live="polite">
      <div className="loading-brand">
        <span className="brand-mark brand-mark-large" aria-hidden="true" />
        <div>
          <p className="eyebrow">{brand.name}</p>
          <h2>Loading your progress</h2>
        </div>
      </div>
      <div className="skeleton skeleton-title" />
      <div className="skeleton skeleton-action" />
      <div className="summary-grid">
        <div className="skeleton skeleton-card" />
        <div className="skeleton skeleton-card" />
        <div className="skeleton skeleton-card" />
        <div className="skeleton skeleton-card" />
      </div>
    </section>
  );
}

function StateMessage({ title, message }) {
  return (
    <section className="empty-state app-state-message">
      <div>
        <h2>{title}</h2>
        <p>{message}</p>
      </div>
    </section>
  );
}
