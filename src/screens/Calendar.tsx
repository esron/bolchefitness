import { useState } from 'react';
import { ChevronLeft, ChevronRight, Check, CalendarDays } from 'lucide-react';
import { localDay, totals } from '../domain';
import { type Tracker } from '../useTracker';
import { PageHeading } from '../components/UI';
export function Calendar({ tracker }: { tracker: Tracker }) {
  const today = localDay(new Date());
  const [month, setMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  );
  const [selected, setSelected] = useState(today);
  const events = tracker.state.sessions.flatMap((s) =>
    s.exercises.filter((e) => e.completedDay).map((e) => ({ exercise: e, session: s }))
  );
  const days = new Set(events.map((e) => e.exercise.completedDay));
  const first = (month.getDay() + 6) % 7;
  const length = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const chosenEvents = events.filter((e) => e.exercise.completedDay === selected);
  const ended = tracker.state.sessions.filter(
    (s) => s.endedAt && localDay(new Date(s.endedAt)) === selected
  );
  const monthlyDays = [...days].filter((d) => d?.startsWith(localDay(month).slice(0, 7))).length;
  const shift = (n: number) => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + n, 1));
  return (
    <>
      <PageHeading
        eyebrow="UM TREINO DE CADA VEZ"
        title="Seu calendário"
        description="Cada marca é um passo que você deu."
      />
      <div className="calendar-layout">
        <section className="calendar-panel">
          <div className="month-nav">
            <button className="icon-button" aria-label="Mês anterior" onClick={() => shift(-1)}>
              <ChevronLeft size={21} />
            </button>
            <h2>{month.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</h2>
            <button className="icon-button" aria-label="Próximo mês" onClick={() => shift(1)}>
              <ChevronRight size={21} />
            </button>
          </div>
          <div className="calendar-grid">
            {['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'].map((day) => (
              <span key={day} className="weekday">
                {day}
              </span>
            ))}
            {Array.from({ length: first }, (_, i) => (
              <span key={`empty-${i}`} />
            ))}
            {Array.from({ length }, (_, i) => {
              const day = localDay(new Date(month.getFullYear(), month.getMonth(), i + 1));
              return (
                <button
                  key={day}
                  className={`calendar-day ${day === selected ? 'selected' : ''} ${day === today ? 'today' : ''} ${days.has(day) ? 'has-workout' : ''}`}
                  aria-label={`${i + 1} de ${month.toLocaleDateString('pt-BR', { month: 'long' })}${days.has(day) ? ', exercícios concluídos' : ''}`}
                  aria-pressed={day === selected}
                  onClick={() => setSelected(day)}
                >
                  <span>{i + 1}</span>
                  <i />
                </button>
              );
            })}
          </div>
          <div className="calendar-legend">
            <span>
              <i />
              Exercícios concluídos
            </span>
            <button
              className="text-button"
              onClick={() => {
                setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
                setSelected(today);
              }}
            >
              Hoje
            </button>
          </div>
          <div className="calendar-month-stat">
            <CalendarDays size={22} />
            <div>
              <strong>
                {monthlyDays} {monthlyDays === 1 ? 'dia de treino' : 'dias de treino'}
              </strong>
              <p>com exercícios concluídos neste mês</p>
            </div>
          </div>
        </section>
        <section className="day-panel">
          <span className="eyebrow">SEU REGISTRO</span>
          <h2>
            {new Date(`${selected}T12:00:00`).toLocaleDateString('pt-BR', {
              day: 'numeric',
              month: 'long',
            })}
          </h2>
          <p className="muted small">{chosenEvents.length} exercícios concluídos</p>
          {chosenEvents.length ? (
            <div className="history-exercises">
              {chosenEvents.map(({ exercise: e, session: s }) => (
                <article className="history-exercise" key={`${s.id}-${e.id}`}>
                  <div className="history-heading">
                    <span className="check-badge">
                      <Check size={17} />
                    </span>
                    <div>
                      <h3>{e.name}</h3>
                      <small>
                        {s.workoutName} ·{' '}
                        {new Date(e.completedAt!).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                        {s.endedAt ? '' : ' · Em andamento'}
                      </small>
                    </div>
                  </div>
                  <div className="history-sets">
                    {e.sets.map((set, i) => (
                      <div key={i}>
                        <span>Série {i + 1}</span>
                        <strong>
                          {set.reps} reps <span>·</span> {set.load} kg
                        </strong>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="day-empty">
              <CalendarDays size={32} />
              <p>Nenhum exercício concluído neste dia.</p>
            </div>
          )}
          {ended
            .filter((s) => totals(s).done < totals(s).total)
            .map((s) => (
              <article key={s.id} className="partial-record">
                <span className="tag neutral">PARCIAL</span>
                <h3>{s.workoutName}</h3>
                <p>
                  {totals(s).done}/{totals(s).total} séries realizadas
                </p>
                {s.exercises
                  .filter((e) => !e.completedAt && e.sets.some((set) => set.done))
                  .map((e) => (
                    <div key={e.id}>
                      <strong>{e.name}</strong>
                      {e.sets.map((set, i) =>
                        set.done ? (
                          <p key={i}>
                            Série {i + 1}: {set.reps} reps · {set.load} kg
                          </p>
                        ) : null
                      )}
                    </div>
                  ))}
              </article>
            ))}
        </section>
      </div>
    </>
  );
}
