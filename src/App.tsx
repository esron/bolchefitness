import { useState } from 'react';
import {
  House,
  Dumbbell,
  CalendarDays,
  Settings as SettingsIcon,
  WifiOff,
  ShieldCheck,
  X,
  LoaderCircle,
  RefreshCw,
} from 'lucide-react';
import { useTracker } from './useTracker';
import { usePwa } from './pwa';
import { PersistenceError } from './components/UI';
import { Today } from './screens/Today';
import { Workouts } from './screens/Workouts';
import { Calendar } from './screens/Calendar';
import { Settings } from './screens/Settings';
type Tab = 'today' | 'workouts' | 'calendar' | 'settings';
const tabs = [
  { id: 'today' as const, label: 'Hoje', icon: House },
  { id: 'workouts' as const, label: 'Treinos', icon: Dumbbell },
  { id: 'calendar' as const, label: 'Calendário', icon: CalendarDays },
  { id: 'settings' as const, label: 'Configurações', icon: SettingsIcon },
];
export default function App() {
  const tracker = useTracker();
  const pwa = usePwa(tracker.canUpdate);
  const [tab, setTab] = useState<Tab>('today');
  const [create, setCreate] = useState(false);
  const go = (next: Tab) => {
    setTab(next);
    window.scrollTo({ top: 0 });
  };
  return (
    <PersistenceError.Provider value={tracker.error}>
      <div className="app-shell">
        <header className="app-header">
          <button className="brand" aria-label="Bolchefitness, início" onClick={() => go('today')}>
            <span className="brand-mark">
              b<span>f</span>
            </span>
            <span>
              bolche<span>fitness</span>
              <small>SEU TREINO, NO SEU RITMO</small>
            </span>
          </button>
          <div className={`connection ${pwa.offline ? 'offline' : ''}`}>
            {pwa.offline ? <WifiOff size={15} /> : <ShieldCheck size={15} />}
            <span>{pwa.offline ? 'Modo offline' : 'Salvo no dispositivo'}</span>
          </div>
        </header>
        <nav className="desktop-nav" aria-label="Navegação principal">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={tab === id ? 'active' : ''}
              aria-current={tab === id ? 'page' : undefined}
              onClick={() => go(id)}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </nav>
        <main>
          {tracker.error && (
            <div role="alert" className="error-banner">
              <span>{tracker.error}</span>
              {!tracker.ready ? (
                <button className="secondary" onClick={() => void tracker.reload()}>
                  Tentar novamente
                </button>
              ) : (
                <button
                  className="icon-button"
                  aria-label="Fechar erro"
                  onClick={tracker.clearError}
                >
                  <X size={18} />
                </button>
              )}
            </div>
          )}
          {!tracker.ready ? (
            <div className="loading">
              <LoaderCircle className="spin" size={30} />
              <p>{tracker.error ? 'Seus dados não foram alterados.' : 'Abrindo sua rotina…'}</p>
            </div>
          ) : (
            <>
              {pwa.hasUpdate &&
                !tracker.pending &&
                !tracker.state.sessions.some((s) => !s.endedAt) && (
                  <div className="update-banner">
                    <span>Uma nova versão está pronta.</span>
                    <button className="text-button" onClick={pwa.applyUpdate}>
                      <RefreshCw size={16} />
                      Atualizar
                    </button>
                  </div>
                )}
              {tab === 'today' && (
                <Today
                  tracker={tracker}
                  onCreate={() => {
                    setCreate(true);
                    go('workouts');
                  }}
                  onWorkouts={() => go('workouts')}
                  onCalendar={() => go('calendar')}
                />
              )}{' '}
              {tab === 'workouts' && (
                <Workouts
                  tracker={tracker}
                  createRequested={create}
                  onCreated={() => setCreate(false)}
                />
              )}{' '}
              {tab === 'calendar' && <Calendar tracker={tracker} />}{' '}
              {tab === 'settings' && <Settings tracker={tracker} pwa={pwa} />}
            </>
          )}
        </main>
        <nav className="bottom-nav" aria-label="Navegação no celular">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={tab === id ? 'active' : ''}
              aria-current={tab === id ? 'page' : undefined}
              onClick={() => go(id)}
            >
              <Icon size={21} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        {tracker.pending && (
          <div className="saving" role="status">
            <LoaderCircle size={15} className="spin" />
            Salvando…
          </div>
        )}
      </div>
    </PersistenceError.Provider>
  );
}
