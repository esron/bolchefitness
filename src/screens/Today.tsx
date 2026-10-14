import { useState } from 'react';
import {
  ArrowUpRight,
  Play,
  CalendarDays,
  CheckCheck,
  Dumbbell,
  TrendingUp,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { startSession, localDay, totals } from '../domain';
import { type Tracker } from '../useTracker';
import { Session } from '../components/Session';
import { Empty, PageHeading } from '../components/UI';
export function Today({
  tracker,
  onCreate,
  onWorkouts,
  onCalendar,
}: {
  tracker: Tracker;
  onCreate: () => void;
  onWorkouts: () => void;
  onCalendar: () => void;
}) {
  const { state, update, pending } = tracker;
  const [chosen, setChosen] = useState('');
  const active = state.sessions.find((s) => !s.endedAt);
  const sequence =
    state.sequences.find((s) => s.id === state.selectedSequenceId) ?? state.sequences[0];
  const workout =
    sequence?.workouts.find((w) => w.id === (chosen || sequence.nextWorkoutId)) ??
    sequence?.workouts[0];
  const sessions = state.sessions.filter((s) => s.endedAt && totals(s).done > 0);
  const month = localDay(new Date()).slice(0, 7);
  const thisMonth = sessions.filter((s) => localDay(new Date(s.endedAt!)).startsWith(month));
  const totalCompleted = state.sessions.reduce(
    (n, s) => n + s.exercises.filter((e) => e.completedAt).length,
    0
  );
  const recent = [...sessions].reverse().slice(0, 3);
  const date = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  return (
    <>
      <PageHeading
        eyebrow={date.toLocaleUpperCase('pt-BR')}
        title={active ? 'Vamos continuar.' : 'Seu próximo passo.'}
        description={
          active
            ? 'Uma série de cada vez. Seu progresso está salvo.'
            : 'Consistência se constrói um treino de cada vez.'
        }
      />
      {active ? (
        <Session session={active} tracker={tracker} />
      ) : !sequence ? (
        <Empty
          title="Seu treino, do seu jeito."
          description="Crie suas fichas, acompanhe cada série e veja sua evolução. Tudo aqui, mesmo sem internet."
          action="Criar minha sequência"
          onAction={onCreate}
        />
      ) : (
        workout && (
          <div className="home-layout">
            <section className="next-workout">
              <div className="hero-top">
                <span>
                  <span className="status-dot" />
                  PRONTO PARA TREINAR
                </span>
                <Dumbbell size={28} />
              </div>
              <div className="hero-content">
                <span className="hero-letter">{workout.label}</span>
                <div>
                  <p>{sequence.name}</p>
                  <h2>{workout.name}</h2>
                  <span>
                    {workout.exercises.length} exercícios <span className="hero-separator">/</span>{' '}
                    {workout.exercises.reduce((n, e) => n + e.sets, 0)} séries
                  </span>
                </div>
              </div>
              <div className="hero-preview">
                {workout.exercises.slice(0, 3).map((e) => (
                  <span key={e.id}>{e.name}</span>
                ))}
                {workout.exercises.length > 3 && <span>+{workout.exercises.length - 3}</span>}
                {workout.exercises.length === 0 && (
                  <span>Adicione exercícios à sua ficha para começar</span>
                )}
              </div>
              <button
                className="hero-start"
                disabled={pending}
                onClick={() => {
                  if (workout.exercises.length === 0) {
                    onWorkouts();
                    return;
                  }
                  void update((s) => {
                    if (s.sessions.some((session) => !session.endedAt))
                      throw new Error('Já existe um treino em andamento.');
                    const latest = s.sequences.find((seq) => seq.id === sequence.id);
                    if (!latest) throw new Error('Esta sequência foi removida. Escolha outra.');
                    return {
                      ...s,
                      sessions: [...s.sessions, startSession(latest, workout.id, new Date())],
                    };
                  });
                  setChosen('');
                }}
              >
                <Play size={19} fill="currentColor" />
                {workout.exercises.length ? 'Iniciar treino' : 'Montar esta ficha'}
                <ArrowUpRight size={20} />
              </button>
              <div className="workout-chooser">
                <label htmlFor="choose-workout">Outro treino hoje?</label>
                <select
                  id="choose-workout"
                  value={workout.id}
                  disabled={pending}
                  onChange={(e) => setChosen(e.target.value)}
                >
                  {sequence.workouts.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>
            </section>
            <aside className="motivation-card">
              <Sparkles size={24} />
              <span className="eyebrow">NO SEU RITMO</span>
              <h3>
                O importante é<br />
                continuar.
              </h3>
              <p>Marque cada série feita. Seu próximo treino começa de onde você parou.</p>
              <div className="mini-bars" aria-hidden="true">
                {[30, 48, 40, 64, 53, 78, 100].map((h, i) => (
                  <span key={i} style={{ height: `${h}%` }} />
                ))}
              </div>
            </aside>
          </div>
        )
      )}
      <div className="stats-grid">
        <div className="stat-card">
          <span>
            <CalendarDays size={19} />
            ESTE MÊS
          </span>
          <strong>
            {thisMonth.length}
            <small>treinos</small>
          </strong>
        </div>
        <div className="stat-card">
          <span>
            <CheckCheck size={19} />
            CONCLUÍDOS
          </span>
          <strong>
            {totalCompleted}
            <small>exercícios</small>
          </strong>
        </div>
        <div className="stat-card">
          <span>
            <TrendingUp size={19} />
            NA ROTINA
          </span>
          <strong>
            {sequence?.workouts.length ?? 0}
            <small>fichas</small>
          </strong>
        </div>
      </div>
      <div className="section-heading">
        <h2>Últimos treinos</h2>
        <button className="text-button" onClick={onCalendar}>
          Ver calendário
          <ChevronRight size={17} />
        </button>
      </div>
      {recent.length ? (
        <div className="recent-list">
          {recent.map((s) => (
            <button className="recent-item" key={s.id} onClick={onCalendar}>
              <span className="recent-icon">
                <Dumbbell size={20} />
              </span>
              <div>
                <strong>{s.workoutName}</strong>
                <small>
                  {new Date(s.endedAt!).toLocaleDateString('pt-BR', {
                    day: 'numeric',
                    month: 'short',
                  })}{' '}
                  · {totals(s).done}/{totals(s).total} séries
                </small>
              </div>
              <span className={`tag ${totals(s).done < totals(s).total ? 'neutral' : ''}`}>
                {totals(s).done === totals(s).total ? 'CONCLUÍDO' : 'PARCIAL'}
              </span>
              <ChevronRight size={18} />
            </button>
          ))}
        </div>
      ) : (
        <div className="quiet-empty">
          <CalendarDays size={22} />
          <div>
            <strong>Seu histórico está começando.</strong>
            <p>Os treinos que você finalizar aparecerão aqui.</p>
          </div>
        </div>
      )}
      <div className="local-note">
        <span className="status-dot" />
        Seus dados ficam neste dispositivo. Seu foco fica no treino.
      </div>
    </>
  );
}
