import { useState, useCallback } from 'react';
import useLocalStorage from './hooks/useLocalStorage';
import initialTree from './data/initialTree';
import CallMode from './components/CallMode';
import EditMode from './components/EditMode';
import StatsDashboard from './components/StatsDashboard';
import CallLogViewer from './components/CallLogViewer';
import VersionHistory from './components/VersionHistory';
import SettingsModal from './components/SettingsModal';
import './App.css';

const MODES = ['call', 'edit', 'stats', 'log'];
const MODE_LABELS = { call: 'Call', edit: 'Edit', stats: 'Stats', log: 'Call Log' };

export default function App() {
  const [mode, setMode] = useState('call');
  const [tree, setTree] = useLocalStorage('scriptTree', initialTree);
  const [callLogs, setCallLogs] = useLocalStorage('callLogs', []);
  const [aiObjections, setAiObjections] = useLocalStorage('aiObjections', []);
  const [versions, setVersions] = useLocalStorage('scriptVersions', () => {
    const stored = localStorage.getItem('scriptVersions');
    if (stored) return JSON.parse(stored);
    return [{ tree: initialTree, timestamp: Date.now(), label: 'Initial version' }];
  });
  const [showVersions, setShowVersions] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useLocalStorage('anthropicApiKey', '');

  const initVersionsIfNeeded = useCallback(() => {
    if (!versions || versions.length === 0) {
      setVersions([{ tree: initialTree, timestamp: Date.now(), label: 'Initial version' }]);
    }
  }, [versions, setVersions]);

  useState(() => { initVersionsIfNeeded(); });

  const saveTreeVersion = useCallback((newTree, label = '') => {
    setTree(newTree);
    setVersions(prev => {
      const newVersions = [
        { tree: newTree, timestamp: Date.now(), label },
        ...(prev || []),
      ].slice(0, 50);
      return newVersions;
    });
  }, [setTree, setVersions]);

  const addCallLog = useCallback((log) => {
    setCallLogs(prev => [log, ...prev]);
  }, [setCallLogs]);

  const addAiObjection = useCallback((objection) => {
    setAiObjections(prev => [objection, ...prev]);
  }, [setAiObjections]);

  const restoreVersion = useCallback((version) => {
    setTree(version.tree);
  }, [setTree]);

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-brand">SerraFi</div>
        <nav className="app-nav">
          {MODES.map(m => (
            <button
              key={m}
              className={`nav-btn ${mode === m ? 'nav-btn-active' : ''}`}
              onClick={() => setMode(m)}
            >
              {MODE_LABELS[m]}
            </button>
          ))}
        </nav>
        <div className="header-actions">
          <button className="icon-btn" onClick={() => setShowVersions(true)} title="Version history">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </button>
          <button className="icon-btn" onClick={() => setShowSettings(true)} title="Settings">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          </button>
        </div>
      </header>

      {mode === 'edit' && <div className="edit-banner">Editing script</div>}

      <main className={`app-main ${mode === 'edit' ? 'edit-bg' : ''}`}>
        {mode === 'call' && (
          <CallMode
            tree={tree}
            addCallLog={addCallLog}
            addAiObjection={addAiObjection}
            apiKey={apiKey}
            saveTreeVersion={saveTreeVersion}
          />
        )}
        {mode === 'edit' && (
          <EditMode
            tree={tree}
            saveTreeVersion={saveTreeVersion}
            setMode={setMode}
          />
        )}
        {mode === 'stats' && (
          <StatsDashboard
            callLogs={callLogs}
            aiObjections={aiObjections}
            tree={tree}
          />
        )}
        {mode === 'log' && (
          <CallLogViewer
            callLogs={callLogs}
            tree={tree}
          />
        )}
      </main>

      {showVersions && (
        <VersionHistory
          versions={versions}
          setVersions={setVersions}
          restoreVersion={restoreVersion}
          onClose={() => setShowVersions(false)}
        />
      )}

      {showSettings && (
        <SettingsModal
          apiKey={apiKey}
          setApiKey={setApiKey}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
