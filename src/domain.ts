export type Exercise = { id: string; name: string; sets: number; reps: string; load: number };
export type Workout = { id: string; label: string; name: string; exercises: Exercise[] };
export type Sequence = { id: string; name: string; workouts: Workout[]; nextWorkoutId: string };
export type PerformedSet = { reps: string; load: number; done: boolean };
export type PerformedExercise = {
  id: string;
  name: string;
  sets: PerformedSet[];
  completedAt: string | null;
  completedDay: string | null;
};
export type Session = {
  id: string;
  sequenceId: string;
  workoutId: string;
  workoutName: string;
  startedAt: string;
  endedAt: string | null;
  exercises: PerformedExercise[];
};
export type State = {
  version: 1;
  sequences: Sequence[];
  selectedSequenceId: string | null;
  sessions: Session[];
};
export const uid = () => crypto.randomUUID();
export const emptyState = (): State => ({
  version: 1,
  sequences: [],
  selectedSequenceId: null,
  sessions: [],
});
export function labelAt(index: number): string {
  if (!Number.isSafeInteger(index) || index < 0) throw new Error('Índice inválido.');
  let n = index + 1,
    label = '';
  while (n > 0) {
    n--;
    label = String.fromCharCode(65 + (n % 26)) + label;
    n = Math.floor(n / 26);
  }
  return label;
}
export function createWorkout(index: number): Workout {
  const label = labelAt(index);
  return { id: uid(), label, name: `Treino ${label}`, exercises: [] };
}
export function createSequence(name: string, count: number): Sequence {
  if (!name.trim() || !Number.isSafeInteger(count) || count < 1)
    throw new Error('Informe um nome e uma quantidade inteira positiva.');
  const workouts = Array.from({ length: count }, (_, i) => createWorkout(i));
  return { id: uid(), name: name.trim(), workouts, nextWorkoutId: workouts[0].id };
}
export function removeWorkout(sequence: Sequence, workoutId: string): Sequence {
  if (sequence.workouts.length <= 1) throw new Error('Mantenha pelo menos um treino na sequência.');
  const index = sequence.workouts.findIndex((w) => w.id === workoutId);
  if (index < 0) throw new Error('Treino não encontrado.');
  const workouts = sequence.workouts.filter((w) => w.id !== workoutId);
  return {
    ...sequence,
    workouts,
    nextWorkoutId:
      sequence.nextWorkoutId === workoutId
        ? workouts[index % workouts.length].id
        : sequence.nextWorkoutId,
  };
}
export function localDay(now: Date): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
export function startSession(sequence: Sequence, workoutId: string, now: Date): Session {
  const workout = sequence.workouts.find((w) => w.id === workoutId);
  if (!workout || workout.exercises.length === 0)
    throw new Error('Adicione exercícios antes de iniciar o treino.');
  return {
    id: uid(),
    sequenceId: sequence.id,
    workoutId,
    workoutName: workout.name,
    startedAt: now.toISOString(),
    endedAt: null,
    exercises: workout.exercises.map((e) => ({
      id: e.id,
      name: e.name,
      sets: Array.from({ length: e.sets }, () => ({ reps: e.reps, load: e.load, done: false })),
      completedAt: null,
      completedDay: null,
    })),
  };
}
export function toggleSet(
  session: Session,
  exerciseId: string,
  setIndex: number,
  now: Date
): Session {
  if (session.endedAt) throw new Error('Este treino já foi encerrado.');
  return {
    ...session,
    exercises: session.exercises.map((e) => {
      if (e.id !== exerciseId) return e;
      if (!e.sets[setIndex]) throw new Error('Série não encontrada.');
      const sets = e.sets.map((s, i) => (i === setIndex ? { ...s, done: !s.done } : s));
      const complete = sets.every((s) => s.done);
      return {
        ...e,
        sets,
        completedAt: complete ? now.toISOString() : null,
        completedDay: complete ? localDay(now) : null,
      };
    }),
  };
}
export function finishSession(state: State, sessionId: string, now: Date): State {
  const session = state.sessions.find((s) => s.id === sessionId);
  if (!session || session.endedAt) throw new Error('Não há treino em andamento.');
  return {
    ...state,
    sessions: state.sessions.map((s) =>
      s.id === sessionId ? { ...s, endedAt: now.toISOString() } : s
    ),
    sequences: state.sequences.map((seq) => {
      if (seq.id !== session.sequenceId) return seq;
      const index = seq.workouts.findIndex((w) => w.id === session.workoutId);
      return index < 0
        ? seq
        : { ...seq, nextWorkoutId: seq.workouts[(index + 1) % seq.workouts.length].id };
    }),
  };
}
export function totals(session: Session) {
  const sets = session.exercises.flatMap((e) => e.sets);
  return { done: sets.filter((s) => s.done).length, total: sets.length };
}
// Parse each field into a fresh value, rather than trusting arbitrary imported objects.
export function validateBackup(value: unknown): State {
  const invalid = (): never => {
    throw new Error('Backup inválido: formato, versão ou dados inconsistentes.');
  };
  const obj = (v: unknown): Record<string, unknown> =>
    v !== null && typeof v === 'object' && !Array.isArray(v)
      ? (v as Record<string, unknown>)
      : invalid();
  const str = (v: unknown) => (typeof v === 'string' && v.trim().length > 0 ? v : invalid());
  const arr = (v: unknown) => (Array.isArray(v) ? v : invalid());
  const num = (v: unknown) =>
    typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : invalid();
  const date = (v: unknown) => {
    const s = str(v);
    return Number.isFinite(Date.parse(s)) ? s : invalid();
  };
  const unique = (ids: string[]) => {
    if (new Set(ids).size !== ids.length) invalid();
  };
  const root = obj(value);
  if (root.version !== 1) invalid();
  const sequences: Sequence[] = arr(root.sequences).map((v) => {
    const seq = obj(v);
    const workouts: Workout[] = arr(seq.workouts).map((v) => {
      const w = obj(v);
      const exercises: Exercise[] = arr(w.exercises).map((v) => {
        const e = obj(v);
        const sets = num(e.sets);
        if (!Number.isSafeInteger(sets) || sets < 1) invalid();
        return { id: str(e.id), name: str(e.name), sets, reps: str(e.reps), load: num(e.load) };
      });
      unique(exercises.map((e) => e.id));
      return { id: str(w.id), label: str(w.label), name: str(w.name), exercises };
    });
    if (workouts.length === 0) invalid();
    unique(workouts.map((w) => w.id));
    const nextWorkoutId = str(seq.nextWorkoutId);
    if (!workouts.some((w) => w.id === nextWorkoutId)) invalid();
    return { id: str(seq.id), name: str(seq.name), workouts, nextWorkoutId };
  });
  unique(sequences.map((s) => s.id));
  const selectedSequenceId = root.selectedSequenceId === null ? null : str(root.selectedSequenceId);
  if (selectedSequenceId !== null && !sequences.some((s) => s.id === selectedSequenceId)) invalid();
  const sessions: Session[] = arr(root.sessions).map((v) => {
    const s = obj(v);
    const startedAt = date(s.startedAt);
    const endedAt = s.endedAt === null ? null : date(s.endedAt);
    if (endedAt && Date.parse(endedAt) < Date.parse(startedAt)) invalid();
    const exercises: PerformedExercise[] = arr(s.exercises).map((v) => {
      const e = obj(v);
      const sets: PerformedSet[] = arr(e.sets).map((v) => {
        const set = obj(v);
        if (typeof set.done !== 'boolean') invalid();
        return { reps: str(set.reps), load: num(set.load), done: set.done as boolean };
      });
      if (sets.length === 0) invalid();
      const completedAt = e.completedAt === null ? null : date(e.completedAt);
      const completedDay = e.completedDay === null ? null : str(e.completedDay);
      if (
        completedAt &&
        (Date.parse(completedAt) < Date.parse(startedAt) ||
          (endedAt && Date.parse(completedAt) > Date.parse(endedAt)))
      )
        invalid();
      if (
        sets.every((set) => set.done) !== Boolean(completedAt) ||
        Boolean(completedAt) !== Boolean(completedDay)
      )
        invalid();
      if (completedDay) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(completedDay)) invalid();
        const d = new Date(`${completedDay}T12:00:00`);
        if (!Number.isFinite(d.getTime()) || localDay(d) !== completedDay) invalid();
      }
      return { id: str(e.id), name: str(e.name), sets, completedAt, completedDay };
    });
    unique(exercises.map((e) => e.id));
    if (!exercises.length) invalid();
    return {
      id: str(s.id),
      sequenceId: str(s.sequenceId),
      workoutId: str(s.workoutId),
      workoutName: str(s.workoutName),
      startedAt,
      endedAt,
      exercises,
    };
  });
  unique(sessions.map((s) => s.id));
  if (sessions.filter((s) => s.endedAt === null).length > 1) invalid();
  return { version: 1, sequences, selectedSequenceId, sessions };
}
