import { useState } from 'react';
import { Check, ChevronDown, ChevronUp, Flag, Trash2, Timer, Pencil } from 'lucide-react';
import {
  totals,
  toggleSet,
  setSetDone,
  updateSession,
  discardSession,
  finishSession,
  type Session as SessionData,
  type PerformedExercise,
} from '../domain';
import { type Tracker } from '../useTracker';
import { Modal } from './UI';
import { RestTimer } from './RestTimer';
import { completeSetAndStartRest, startRest, cancelRest } from '../rest';
import { enableRestSound } from '../restSound';
export function Session({ session, tracker }: { session: SessionData; tracker: Tracker }) {
  const { update, pending } = tracker;
  const progress = totals(session);
  const [collapsed, setCollapsed] = useState<string[]>(() =>
    session.exercises.slice(1).map((e) => e.id)
  );
  const [editing, setEditing] = useState<{ exerciseId: string; index: number } | null>(null);
  const [finish, setFinish] = useState(false);
  const mutate = (fn: (s: SessionData) => SessionData) =>
    update((state) => updateSession(state, session.id, fn));
  const editingSet = editing
    ? session.exercises.find((e) => e.id === editing.exerciseId)?.sets[editing.index]
    : undefined;
  const editingExercise = editing
    ? session.exercises.find((e) => e.id === editing.exerciseId)
    : undefined;
  const completed = session.exercises.filter((e) => e.completedAt).length;
  const end = async () => {
    if (await update((s) => finishSession(s, session.id, new Date()))) setFinish(false);
  };
  const completeExercise = (exercise: PerformedExercise) =>
    mutate((s) => {
      let next = s;
      const current = s.exercises.find((e) => e.id === exercise.id);
      if (!current) return s;
      for (let i = 0; i < current.sets.length; i++)
        if (!current.sets[i].done) next = toggleSet(next, exercise.id, i, new Date());
      return next;
    });
  return (
    <div className="session">
      <div className="session-summary">
        <div>
          <span className="eyebrow">
            <span className="live-dot" />
            TREINO EM ANDAMENTO
          </span>
          <h2>{session.workoutName}</h2>
          <p>
            <Timer size={15} /> Iniciado às{' '}
            {new Date(session.startedAt).toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
            })}{' '}
            · salvo neste dispositivo
          </p>
        </div>
        <strong className="session-count">
          {progress.done}
          <span>
            /{progress.total}
            <small>séries</small>
          </span>
        </strong>
      </div>
      <div className="progress-track">
        <div style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }} />
      </div>
      <div className="progress-caption">
        <span>
          {completed} de {session.exercises.length} exercícios concluídos
        </span>
        <strong>{Math.round((progress.done / progress.total) * 100)}%</strong>
      </div>
      <div className="session-exercises">
        {session.exercises.map((exercise, index) => {
          const isCollapsed = collapsed.includes(exercise.id);
          const done = exercise.sets.filter((s) => s.done).length;
          return (
            <article
              key={exercise.id}
              className={`session-exercise ${exercise.completedAt ? 'is-complete' : ''}`}
            >
              <button
                className="exercise-heading"
                onClick={() =>
                  setCollapsed((ids) =>
                    isCollapsed ? ids.filter((id) => id !== exercise.id) : [...ids, exercise.id]
                  )
                }
                aria-expanded={!isCollapsed}
              >
                <span className="exercise-number">
                  {exercise.completedAt ? <Check size={19} /> : String(index + 1).padStart(2, '0')}
                </span>
                <span className="exercise-info">
                  <h3>{exercise.name}</h3>
                  <p>
                    {done}/{exercise.sets.length} séries {exercise.completedAt ? '· Concluído' : ''}
                  </p>
                </span>
                {isCollapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
              </button>
              {!isCollapsed && (
                <div className="sets-area">
                  <div className="set-labels">
                    <span>SÉRIE</span>
                    <span>{exercise.metric === 'time' ? 'TEMPO' : 'REPS'}</span>
                    <span>CARGA</span>
                    <span>FEITO</span>
                  </div>
                  {exercise.sets.map((set, i) => (
                    <div className={`set-row ${set.done ? 'done' : ''}`} key={i}>
                      <span className="set-number">{i + 1}</span>
                      <span>{set.reps}</span>
                      <button
                        className="load-button"
                        aria-label={`Editar ${exercise.name}, série ${i + 1}`}
                        onClick={() => setEditing({ exerciseId: exercise.id, index: i })}
                      >
                        {set.load > 0 ? (
                          <>
                            {set.load} <small>kg</small>
                          </>
                        ) : (
                          <small>Sem carga</small>
                        )}
                        <Pencil size={12} />
                      </button>
                      <label className="check-container">
                        <input
                          type="checkbox"
                          aria-label={`${exercise.name}, série ${i + 1}`}
                          checked={set.done}
                          disabled={pending}
                          onChange={(event) => {
                            const done = event.currentTarget.checked;
                            if (done) {
                              enableRestSound();
                              void update((state) =>
                                completeSetAndStartRest(
                                  state,
                                  session.id,
                                  exercise.id,
                                  i,
                                  Date.now()
                                )
                              );
                            } else {
                              void mutate((s) => setSetDone(s, exercise.id, i, false, new Date()));
                            }
                          }}
                        />
                        <span>
                          <Check size={19} />
                        </span>
                      </label>
                    </div>
                  ))}
                  {!exercise.completedAt && (
                    <button
                      className="complete-exercise"
                      disabled={pending}
                      aria-label={`Concluir exercício ${exercise.name}`}
                      onClick={() => void completeExercise(exercise)}
                    >
                      <Check size={17} />
                      Concluir todas as séries
                    </button>
                  )}
                  <RestTimer
                    exercise={exercise}
                    pending={pending}
                    onStart={(seconds) => {
                      enableRestSound();
                      return update((state) =>
                        startRest(state, session.id, exercise.id, seconds, Date.now())
                      );
                    }}
                    onCancel={() => update((state) => cancelRest(state, session.id, exercise.id))}
                  />
                </div>
              )}
            </article>
          );
        })}
      </div>
      <div className="session-footer">
        <button
          className="primary full"
          disabled={pending}
          onClick={() => {
            if (progress.done === progress.total) void end();
            else setFinish(true);
          }}
        >
          <Flag size={18} />
          Finalizar treino
        </button>
        <button
          className="text-button danger"
          disabled={pending}
          onClick={() => {
            if (
              confirm(
                'Descartar este treino em andamento? As marcações desta sessão serão apagadas.'
              )
            )
              void update((s) => discardSession(s, session.id));
          }}
        >
          <Trash2 size={15} />
          Descartar sessão
        </button>
      </div>
      {editing && editingSet && (
        <Modal title={`Ajustar série ${editing.index + 1}`} onClose={() => setEditing(null)}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const data = new FormData(e.currentTarget);
              const reps = String(data.get('reps')).trim();
              const rawLoad = String(data.get('load')).trim();
              const load = rawLoad ? Number(rawLoad) : 0;
              if (!reps || !Number.isFinite(load) || load < 0) return;
              const saved = await mutate((s) => ({
                ...s,
                exercises: s.exercises.map((ex) =>
                  ex.id === editing.exerciseId
                    ? {
                        ...ex,
                        sets: ex.sets.map((set, i) =>
                          i === editing.index ? { ...set, reps, load } : set
                        ),
                      }
                    : ex
                ),
              }));
              if (saved) setEditing(null);
            }}
          >
            <div className="form-row two">
              <label>
                {editingExercise?.metric === 'time' ? 'Tempo' : 'Repetições'}
                <input autoFocus name="reps" type="text" required defaultValue={editingSet.reps} />
              </label>
              <label>
                Carga (kg)
                <input
                  name="load"
                  type="number"
                  min="0"
                  step="any"
                  defaultValue={editingSet.load || ''}
                />
              </label>
            </div>
            <p className="muted small">
              Esta alteração vale apenas para esta série. Deixe a carga vazia para registrar sem
              peso.
            </p>
            <button className="primary full" disabled={pending}>
              Salvar série
            </button>
          </form>
        </Modal>
      )}
      {finish && (
        <Modal title="Encerrar treino parcial?" onClose={() => setFinish(false)}>
          <p className="dialog-copy">
            Você realizou {progress.done} de {progress.total} séries. As séries feitas serão
            preservadas no histórico e a sequência avançará para o próximo treino.
          </p>
          <div className="modal-actions">
            <button className="secondary" onClick={() => setFinish(false)}>
              Continuar treino
            </button>
            <button className="primary" disabled={pending} onClick={() => void end()}>
              Encerrar parcial
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
