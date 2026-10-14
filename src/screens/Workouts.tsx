import { useState, type FormEvent } from 'react';
import {
  Plus,
  ChevronRight,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Pencil,
  Trash2,
  Check,
  Layers,
  Dumbbell,
} from 'lucide-react';
import {
  createSequence,
  createWorkout,
  removeWorkout,
  uid,
  type Exercise,
  type Sequence,
  type Workout,
} from '../domain';
import { type Tracker } from '../useTracker';
import { Modal, Empty, PageHeading } from '../components/UI';
export function Workouts({
  tracker,
  createRequested,
  onCreated,
}: {
  tracker: Tracker;
  createRequested: boolean;
  onCreated: () => void;
}) {
  const { state, update, pending } = tracker;
  const [create, setCreate] = useState(createRequested);
  const [selected, setSelected] = useState<string | null>(null);
  const [exercise, setExercise] = useState<Exercise | null | undefined>(undefined);
  const [renaming, setRenaming] = useState<'sequence' | 'workout' | null>(null);
  const [formError, setFormError] = useState('');
  const sequence =
    state.sequences.find((s) => s.id === state.selectedSequenceId) ?? state.sequences[0];
  const workout = sequence?.workouts.find((w) => w.id === selected);
  const changeSequence = async (fn: (s: Sequence) => Sequence) =>
    sequence
      ? update((s) => ({
          ...s,
          sequences: s.sequences.map((seq) => (seq.id === sequence.id ? fn(seq) : seq)),
        }))
      : false;
  const changeWorkout = async (fn: (w: Workout) => Workout) =>
    changeSequence((s) => ({
      ...s,
      workouts: s.workouts.map((w) => (w.id === selected ? fn(w) : w)),
    }));
  const addWorkout = () =>
    changeSequence((seq) => {
      let index = seq.workouts.length;
      let w = createWorkout(index);
      while (seq.workouts.some((existing) => existing.label === w.label))
        w = createWorkout(++index);
      return { ...seq, workouts: [...seq.workouts, w] };
    });
  const moveExercise = (index: number, delta: number) =>
    changeWorkout((w) => {
      const exercises = [...w.exercises];
      [exercises[index], exercises[index + delta]] = [exercises[index + delta], exercises[index]];
      return { ...w, exercises };
    });
  const closeCreate = () => {
    setCreate(false);
    onCreated();
  };
  return (
    <>
      <PageHeading
        eyebrow="SUA ROTINA"
        title={workout ? workout.name : 'Meus treinos'}
        description={
          workout
            ? 'Uma ficha que acompanha sua evolução.'
            : 'Organize sua sequência. Treine no seu ritmo.'
        }
      >
        {workout ? (
          <button className="secondary" onClick={() => setSelected(null)}>
            <ArrowLeft size={17} />
            Todos os treinos
          </button>
        ) : (
          <button className="primary" onClick={() => setCreate(true)}>
            <Plus size={18} />
            Nova sequência
          </button>
        )}
      </PageHeading>
      {!sequence ? (
        <Empty
          title="Sua rotina começa aqui"
          description="Escolha uma sugestão ou monte uma sequência do seu jeito. Você pode ajustar tudo depois."
          action="Criar minha sequência"
          onAction={() => setCreate(true)}
        />
      ) : (
        <>
          {!workout ? (
            <>
              <div className="sequence-bar">
                <div className="sequence-select">
                  <Layers size={20} />
                  <label>
                    Sequência ativa
                    <select
                      aria-label="Sequência ativa"
                      value={sequence.id}
                      disabled={pending}
                      onChange={(e) =>
                        void update((s) => ({ ...s, selectedSequenceId: e.target.value }))
                      }
                    >
                      {state.sequences.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="actions">
                  <button
                    className="icon-button"
                    aria-label="Renomear sequência"
                    onClick={() => setRenaming('sequence')}
                  >
                    <Pencil size={18} />
                  </button>
                  <button
                    className="icon-button danger"
                    aria-label="Excluir sequência"
                    disabled={pending}
                    onClick={async () => {
                      if (
                        confirm('Excluir esta sequência? O histórico dos treinos será preservado.')
                      )
                        await update((s) => {
                          const sequences = s.sequences.filter((seq) => seq.id !== sequence.id);
                          return { ...s, sequences, selectedSequenceId: sequences[0]?.id ?? null };
                        });
                    }}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              <div className="section-heading">
                <h2>
                  Suas fichas <span className="count">{sequence.workouts.length}</span>
                </h2>
                <span>Na ordem que você escolher</span>
              </div>
              <div className="workout-grid">
                {sequence.workouts.map((w, index) => (
                  <article className="workout-card" key={w.id}>
                    <button
                      className="workout-open"
                      aria-label={`Abrir treino ${w.label}`}
                      onClick={() => setSelected(w.id)}
                    >
                      <div className="workout-top">
                        <span className="letter">{w.label}</span>
                        {w.id === sequence.nextWorkoutId ? (
                          <span className="tag">PRÓXIMO</span>
                        ) : (
                          <span className="muted small">{String(index + 1).padStart(2, '0')}</span>
                        )}
                      </div>
                      <h3>{w.name}</h3>
                      <p>
                        {w.exercises.length} {w.exercises.length === 1 ? 'exercício' : 'exercícios'}{' '}
                        · {w.exercises.reduce((n, e) => n + e.sets, 0)} séries
                      </p>
                      <div className="workout-bottom">
                        <span>Ver ficha</span>
                        <ChevronRight size={18} />
                      </div>
                    </button>
                    <div className="card-tools">
                      <button
                        className="icon-button"
                        aria-label={`Mover treino ${w.label} para cima`}
                        disabled={pending || index === 0}
                        onClick={() =>
                          void changeSequence((seq) => {
                            const workouts = [...seq.workouts];
                            [workouts[index], workouts[index - 1]] = [
                              workouts[index - 1],
                              workouts[index],
                            ];
                            return { ...seq, workouts };
                          })
                        }
                      >
                        <ArrowUp size={16} />
                      </button>
                      <button
                        className="icon-button"
                        aria-label={`Mover treino ${w.label} para baixo`}
                        disabled={pending || index === sequence.workouts.length - 1}
                        onClick={() =>
                          void changeSequence((seq) => {
                            const workouts = [...seq.workouts];
                            [workouts[index], workouts[index + 1]] = [
                              workouts[index + 1],
                              workouts[index],
                            ];
                            return { ...seq, workouts };
                          })
                        }
                      >
                        <ArrowDown size={16} />
                      </button>
                      <button
                        className="icon-button danger"
                        aria-label={`Excluir treino ${w.label}`}
                        disabled={pending || sequence.workouts.length === 1}
                        onClick={() => {
                          if (confirm(`Excluir ${w.name}? Seu histórico será preservado.`))
                            void changeSequence((seq) => removeWorkout(seq, w.id));
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </article>
                ))}
                <button className="add-card" disabled={pending} onClick={() => void addWorkout()}>
                  <Plus size={26} />
                  <strong>Adicionar treino</strong>
                  <span>Sua sequência pode crescer</span>
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="editor-banner">
                <div>
                  <span className="letter">{workout.label}</span>
                  <span>
                    <strong>{workout.exercises.length} exercícios</strong>
                    <small>
                      {workout.exercises.reduce((n, e) => n + e.sets, 0)} séries na ficha
                    </small>
                  </span>
                </div>
                <button className="secondary" onClick={() => setRenaming('workout')}>
                  <Pencil size={16} />
                  Renomear
                </button>
              </div>
              {workout.exercises.length === 0 ? (
                <Empty
                  title="Vamos montar essa ficha?"
                  description="Adicione os exercícios, séries, repetições e cargas do seu treino."
                  action="Adicionar exercício"
                  onAction={() => setExercise(null)}
                />
              ) : (
                <div className="exercise-list">
                  {workout.exercises.map((e, index) => (
                    <article className="editor-exercise" key={e.id}>
                      <span className="exercise-number">{String(index + 1).padStart(2, '0')}</span>
                      <div className="exercise-info">
                        <h3>{e.name}</h3>
                        <p>
                          {e.sets} séries <span>·</span> {e.reps} reps <span>·</span> {e.load} kg
                        </p>
                      </div>
                      <div className="actions">
                        <button
                          className="icon-button"
                          aria-label={`Editar ${e.name}`}
                          onClick={() => setExercise(e)}
                        >
                          <Pencil size={17} />
                        </button>
                        <button
                          className="icon-button"
                          aria-label={`Subir ${e.name}`}
                          disabled={pending || index === 0}
                          onClick={() => void moveExercise(index, -1)}
                        >
                          <ArrowUp size={17} />
                        </button>
                        <button
                          className="icon-button"
                          aria-label={`Descer ${e.name}`}
                          disabled={pending || index === workout.exercises.length - 1}
                          onClick={() => void moveExercise(index, 1)}
                        >
                          <ArrowDown size={17} />
                        </button>
                        <button
                          className="icon-button danger"
                          aria-label={`Excluir ${e.name}`}
                          disabled={pending}
                          onClick={() => {
                            if (confirm(`Excluir ${e.name} da ficha?`))
                              void changeWorkout((w) => ({
                                ...w,
                                exercises: w.exercises.filter((ex) => ex.id !== e.id),
                              }));
                          }}
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
              {workout.exercises.length > 0 && (
                <button className="secondary full add-exercise" onClick={() => setExercise(null)}>
                  <Plus size={18} />
                  Adicionar exercício
                </button>
              )}
              <p className="footnote">
                As alterações na ficha valem para os próximos treinos. Seu histórico continua como
                foi realizado.
              </p>
            </>
          )}
        </>
      )}
      {create && (
        <CreateSequence
          pending={pending}
          onClose={closeCreate}
          onSave={async (name, count) => {
            const seq = createSequence(name, count);
            if (
              await update((s) => ({
                ...s,
                sequences: [...s.sequences, seq],
                selectedSequenceId: seq.id,
              }))
            ) {
              setSelected(null);
              closeCreate();
            }
          }}
        />
      )}
      {exercise !== undefined && workout && (
        <Modal
          title={exercise ? 'Editar exercício' : 'Novo exercício'}
          onClose={() => {
            setExercise(undefined);
            setFormError('');
          }}
        >
          <form
            onSubmit={async (e: FormEvent<HTMLFormElement>) => {
              e.preventDefault();
              const data = new FormData(e.currentTarget);
              const value: Exercise = {
                id: exercise?.id ?? uid(),
                name: String(data.get('name')).trim(),
                sets: Number(data.get('sets')),
                reps: String(data.get('reps')).trim(),
                load: Number(data.get('load')),
              };
              if (
                !value.name ||
                !value.reps ||
                !Number.isSafeInteger(value.sets) ||
                value.sets < 1 ||
                !Number.isFinite(value.load) ||
                value.load < 0
              ) {
                setFormError(
                  'Preencha nome e repetições. Séries devem ser inteiras e a carga não pode ser negativa.'
                );
                return;
              }
              if (
                await changeWorkout((w) => ({
                  ...w,
                  exercises: exercise
                    ? w.exercises.map((ex) => (ex.id === exercise.id ? value : ex))
                    : [...w.exercises, value],
                }))
              ) {
                setExercise(undefined);
                setFormError('');
              }
            }}
          >
            <label>
              Nome do exercício
              <input
                autoFocus
                name="name"
                required
                defaultValue={exercise?.name}
                placeholder="Ex.: Agachamento livre"
              />
            </label>
            <div className="form-row">
              <label>
                Séries
                <input
                  name="sets"
                  type="number"
                  min="1"
                  step="1"
                  required
                  defaultValue={exercise?.sets ?? 3}
                />
              </label>
              <label>
                Repetições
                <input
                  name="reps"
                  required
                  defaultValue={exercise?.reps ?? '8–12'}
                  placeholder="8–12"
                />
              </label>
              <label>
                Carga (kg)
                <input
                  name="load"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="any"
                  required
                  defaultValue={exercise?.load ?? 0}
                />
              </label>
            </div>
            <p className="muted small">Use 0 kg para exercícios sem carga adicional.</p>
            {formError && (
              <p role="alert" className="form-error">
                {formError}
              </p>
            )}
            <button className="primary full" disabled={pending}>
              <Check size={18} />
              Salvar exercício
            </button>
          </form>
        </Modal>
      )}
      {renaming && sequence && (
        <Modal title="Renomear" onClose={() => setRenaming(null)}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const name = String(new FormData(e.currentTarget).get('name')).trim();
              if (!name) return;
              const saved =
                renaming === 'sequence'
                  ? await changeSequence((s) => ({ ...s, name }))
                  : await changeWorkout((w) => ({ ...w, name }));
              if (saved) setRenaming(null);
            }}
          >
            <label>
              Nome
              <input
                autoFocus
                name="name"
                required
                defaultValue={renaming === 'sequence' ? sequence.name : workout?.name}
              />
            </label>
            <button className="primary full" disabled={pending}>
              Salvar nome
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
function CreateSequence({
  onClose,
  onSave,
  pending,
}: {
  onClose: () => void;
  onSave: (name: string, count: number) => Promise<void>;
  pending: boolean;
}) {
  const [count, setCount] = useState(3);
  const [preset, setPreset] = useState('ABC');
  const [error, setError] = useState('');
  return (
    <Modal title="Sua nova sequência" onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const name = String(new FormData(e.currentTarget).get('name')).trim();
          if (!name || !Number.isSafeInteger(count) || count < 1) {
            setError('Informe um nome e uma quantidade inteira positiva.');
            return;
          }
          await onSave(name, count);
        }}
      >
        <label>
          Nome da sequência
          <input autoFocus name="name" required placeholder="Ex.: Minha rotina" />
        </label>
        <span className="field-label">Comece com uma sugestão</span>
        <div className="presets">
          {['AB', 'ABC', 'ABCD', 'Personalizada'].map((p) => (
            <button
              type="button"
              key={p}
              aria-label={p}
              className={preset === p ? 'preset selected' : 'preset'}
              onClick={() => {
                setPreset(p);
                setCount(p === 'Personalizada' ? 1 : p.length);
              }}
              aria-pressed={preset === p}
            >
              {p === 'Personalizada' ? <Layers size={18} /> : <Dumbbell size={18} />}
              <strong>{p}</strong>
              <small>{p === 'Personalizada' ? 'Do seu jeito' : `${p.length} treinos`}</small>
            </button>
          ))}
        </div>
        {preset === 'Personalizada' && (
          <label>
            Quantidade de treinos
            <input
              type="number"
              inputMode="numeric"
              min="1"
              step="1"
              required
              value={Number.isNaN(count) ? '' : count}
              onChange={(e) => setCount(e.target.valueAsNumber)}
            />
          </label>
        )}
        <p className="muted small">
          São sugestões de organização. Você escolhe os exercícios e pode adicionar mais fichas
          depois.
        </p>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button className="primary full" disabled={pending}>
          <Plus size={18} />
          Criar sequência
        </button>
      </form>
    </Modal>
  );
}
