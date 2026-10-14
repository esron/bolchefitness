import { useState } from 'react';
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
  moveById,
  uid,
  type Exercise,
  type ExerciseMetric,
  type Sequence,
  type Workout,
} from '../domain';
import { type Tracker } from '../useTracker';
import { Modal, Empty, PageHeading } from '../components/UI';
type TargetDraft = { value: string; load: string };

function ExerciseForm({
  exercise,
  pending,
  error,
  onError,
  onSave,
}: {
  exercise: Exercise | null;
  pending: boolean;
  error: string;
  onError: (message: string) => void;
  onSave: (value: Exercise) => Promise<void>;
}) {
  const [metric, setMetric] = useState<ExerciseMetric>(exercise?.metric ?? 'reps');
  const [count, setCount] = useState(String(exercise?.sets ?? 3));
  const [targets, setTargets] = useState<TargetDraft[]>(() =>
    Array.from({ length: exercise?.sets ?? 3 }, (_, i) => ({
      value: exercise?.setTargets?.[i]?.value ?? exercise?.reps ?? '8–12',
      load: String(exercise?.setTargets?.[i]?.load ?? exercise?.load ?? 0),
    }))
  );
  const handleCountChange = (value: string) => {
    setCount(value);
    const n = Number(value);
    if (Number.isSafeInteger(n) && n > 0 && n <= 100)
      setTargets((rows) =>
        Array.from(
          { length: n },
          (_, i) => rows[i] ?? { value: metric === 'time' ? '30' : '8–12', load: '0' }
        )
      );
  };
  const updateTarget = (index: number, change: Partial<TargetDraft>) =>
    setTargets((rows) => rows.map((row, i) => (i === index ? { ...row, ...change } : row)));
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const name = String(data.get('name')).trim();
        const sets = Number(count);
        const invalidTarget = targets.slice(0, sets).some((target) => {
          const value = target.value.trim();
          return !value || (metric === 'time' && (!/^\d+$/.test(value) || Number(value) < 1));
        });
        if (!name || !Number.isSafeInteger(sets) || sets < 1 || sets > 100 || invalidTarget) {
          onError(
            metric === 'time'
              ? 'Preencha o nome e informe um tempo em segundos para cada série. Use de 1 a 100 séries.'
              : 'Preencha o nome e a meta de cada série. Use de 1 a 100 séries.'
          );
          return;
        }
        const value: Exercise = {
          id: exercise?.id ?? uid(),
          name,
          sets,
          metric,
          setTargets: targets.slice(0, sets).map((target) => ({
            value: target.value.trim(),
            load: Number(target.load) || 0,
          })),
          reps: targets[0].value.trim(),
          load: Number(targets[0].load) || 0,
        };
        void onSave(value);
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
      <div className="form-row two">
        <label>
          Séries
          <input
            name="sets"
            type="number"
            min="1"
            max="100"
            step="1"
            required
            value={count}
            onChange={(e) => handleCountChange(e.target.value)}
          />
        </label>
        <label>
          Registrar por
          <select
            aria-label="Registrar por"
            value={metric}
            onChange={(e) => {
              const nextMetric = e.target.value as ExerciseMetric;
              setMetric(nextMetric);
              if (nextMetric === 'time')
                setTargets((rows) =>
                  rows.map((row) => ({
                    ...row,
                    value: /^[1-9]\d*$/.test(row.value) ? row.value : '30',
                  }))
                );
            }}
          >
            <option value="reps">Repetições</option>
            <option value="time">Tempo</option>
          </select>
        </label>
      </div>
      <div className="target-editor">
        {targets.slice(0, Number(count) || 0).map((target, index) => (
          <div className="target-editor-row" key={index}>
            <strong>Série {index + 1}</strong>
            <label>
              {metric === 'time' ? 'Tempo (segundos)' : 'Repetições'}
              <input
                aria-label={`${metric === 'time' ? 'Tempo (segundos)' : 'Repetições'}${index === 0 ? '' : `, série ${index + 1}`}`}
                type={metric === 'time' ? 'number' : 'text'}
                inputMode={metric === 'time' ? 'numeric' : undefined}
                min={metric === 'time' ? '1' : undefined}
                step={metric === 'time' ? '1' : undefined}
                required
                value={target.value}
                placeholder={metric === 'time' ? '30' : '8–12'}
                onChange={(e) => updateTarget(index, { value: e.target.value })}
              />
            </label>
            <label>
              Carga (kg){index === 0 ? '' : `, série ${index + 1}`}
              <input
                aria-label={`Carga (kg)${index === 0 ? '' : `, série ${index + 1}`}`}
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={target.load}
                onChange={(e) => updateTarget(index, { load: e.target.value })}
              />
            </label>
          </div>
        ))}
      </div>
      <p className="muted small">
        {metric === 'time'
          ? 'Informe a duração em segundos. Deixe a carga em 0 para exercícios sem peso.'
          : 'Defina repetições e carga para cada série. Use 0 kg para exercícios sem peso.'}
      </p>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <button className="primary full" disabled={pending}>
        <Check size={18} />
        Salvar exercício
      </button>
    </form>
  );
}

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
  const moveExercise = (id: string, delta: -1 | 1) =>
    changeWorkout((w) => ({ ...w, exercises: moveById(w.exercises, id, delta) }));
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
                      onChange={(e) => {
                        const id = e.currentTarget.value;
                        void update((s) => ({ ...s, selectedSequenceId: id }));
                      }}
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
                          void changeSequence((seq) => ({
                            ...seq,
                            workouts: moveById(seq.workouts, w.id, -1),
                          }))
                        }
                      >
                        <ArrowUp size={16} />
                      </button>
                      <button
                        className="icon-button"
                        aria-label={`Mover treino ${w.label} para baixo`}
                        disabled={pending || index === sequence.workouts.length - 1}
                        onClick={() =>
                          void changeSequence((seq) => ({
                            ...seq,
                            workouts: moveById(seq.workouts, w.id, 1),
                          }))
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
                          {e.sets} séries <span>·</span>{' '}
                          {(
                            e.setTargets ??
                            Array.from({ length: e.sets }, () => ({ value: e.reps, load: e.load }))
                          )
                            .map((target) => target.value)
                            .join(' / ')}{' '}
                          {e.metric === 'time' ? 's' : 'reps'} <span>·</span> cargas por série
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
                          onClick={() => void moveExercise(e.id, -1)}
                        >
                          <ArrowUp size={17} />
                        </button>
                        <button
                          className="icon-button"
                          aria-label={`Descer ${e.name}`}
                          disabled={pending || index === workout.exercises.length - 1}
                          onClick={() => void moveExercise(e.id, 1)}
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
          <ExerciseForm
            exercise={exercise}
            pending={pending}
            error={formError}
            onError={setFormError}
            onSave={async (value) => {
              if (
                await changeWorkout((w) => ({
                  ...w,
                  exercises: exercise
                    ? w.exercises.map((ex) => (ex.id === exercise.id ? { ...ex, ...value } : ex))
                    : [...w.exercises, value],
                }))
              ) {
                setExercise(undefined);
                setFormError('');
              }
            }}
          />
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
