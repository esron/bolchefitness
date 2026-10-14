import { describe, it, expect } from 'vitest';
import {
  createSequence,
  labelAt,
  removeWorkout,
  startSession,
  toggleSet,
  finishSession,
  localDay,
  validateBackup,
  emptyState,
  setSetDone,
  discardSession,
  updateSession,
  moveById,
} from '../src/domain';
function fixture() {
  const sequence = createSequence('Rotina', 6);
  sequence.workouts[0].exercises = [
    { id: 'ex', name: 'Agachamento', sets: 3, reps: '8–12', load: 30 },
  ];
  return sequence;
}
describe('sequências configuráveis', () => {
  it('continua os rótulos e aceita quantidades livres', () => {
    expect([0, 25, 26, 27].map(labelAt)).toEqual(['A', 'Z', 'AA', 'AB']);
    expect(createSequence('Rotina', 30).workouts).toHaveLength(30);
    for (const n of [0, -1, 1.2, NaN, Infinity])
      expect(() => createSequence('Rotina', n)).toThrow();
  });
  it('remove o próximo treino mantendo referência válida', () => {
    const seq = fixture();
    seq.nextWorkoutId = seq.workouts[2].id;
    const result = removeWorkout(seq, seq.nextWorkoutId);
    expect(result.workouts).toHaveLength(5);
    expect(result.workouts.some((w) => w.id === result.nextWorkoutId)).toBe(true);
    const one = createSequence('Único', 1);
    expect(() => removeWorkout(one, one.nextWorkoutId)).toThrow();
  });
});
describe('sessões e calendário', () => {
  it('preserva a ficha executada e retira conclusão ao desmarcar', () => {
    const seq = fixture();
    let session = startSession(seq, seq.nextWorkoutId, new Date());
    seq.workouts[0].exercises[0].load = 100;
    expect(session.exercises[0].sets[0].load).toBe(30);
    const now = new Date(2026, 9, 14, 23, 59);
    for (let i = 0; i < 3; i++) session = toggleSet(session, 'ex', i, now);
    expect(session.exercises[0].completedDay).toBe('2026-10-14');
    expect(session.exercises[0].completedAt).toBe(now.toISOString());
    session = toggleSet(session, 'ex', 0, now);
    expect(session.exercises[0].completedDay).toBeNull();
    expect(session.exercises[0].completedAt).toBeNull();
    expect(localDay(now)).toBe('2026-10-14');
  });
  it('encerra parcialmente e avança sem alterar histórico', () => {
    const seq = fixture();
    const session = toggleSet(
      startSession(seq, seq.nextWorkoutId, new Date()),
      'ex',
      0,
      new Date()
    );
    const state = {
      ...emptyState(),
      sequences: [seq],
      selectedSequenceId: seq.id,
      sessions: [session],
    };
    const result = finishSession(state, session.id, new Date());
    expect(result.sessions[0].endedAt).not.toBeNull();
    expect(result.sessions[0].exercises[0].sets.filter((s) => s.done)).toHaveLength(1);
    expect(result.sequences[0].nextWorkoutId).toBe(seq.workouts[1].id);
    expect(() => finishSession(result, session.id, new Date())).toThrow();
  });
});
describe('backup validado', () => {
  it('aceita estado válido e rejeita versões, referências e números inválidos', () => {
    const seq = fixture();
    const state = { ...emptyState(), sequences: [seq], selectedSequenceId: seq.id };
    expect(validateBackup(JSON.parse(JSON.stringify(state)))).toEqual(state);
    expect(() => validateBackup({ ...state, version: 2 })).toThrow();
    expect(() => validateBackup({ ...state, selectedSequenceId: 'missing' })).toThrow();
    const bad = structuredClone(state);
    bad.sequences[0].workouts[0].exercises[0].load = -1;
    expect(() => validateBackup(bad)).toThrow();
    expect(() => validateBackup({ ...state, sessions: [{}, {}] })).toThrow();
  });
  it('rejeita duas sessões abertas e conclusões inconsistentes', () => {
    const seq = fixture();
    const a = startSession(seq, seq.nextWorkoutId, new Date());
    const b = startSession(seq, seq.nextWorkoutId, new Date());
    const state = {
      ...emptyState(),
      sequences: [seq],
      selectedSequenceId: seq.id,
      sessions: [a, b],
    };
    expect(() => validateBackup(state)).toThrow();
    a.exercises[0].completedAt = new Date().toISOString();
    a.exercises[0].completedDay = '2026-10-14';
    expect(() => validateBackup({ ...state, sessions: [a] })).toThrow();
  });
});

it('rejeita conclusão antes do início ou depois do encerramento da sessão', () => {
  const seq = fixture();
  const started = new Date('2026-10-14T10:00:00Z');
  let session = startSession(seq, seq.nextWorkoutId, started);
  for (let i = 0; i < 3; i++)
    session = toggleSet(session, 'ex', i, new Date('2026-10-14T10:10:00Z'));
  session.endedAt = '2026-10-14T11:00:00Z';
  const state = {
    ...emptyState(),
    sequences: [seq],
    selectedSequenceId: seq.id,
    sessions: [session],
  };
  expect(() => validateBackup(state)).not.toThrow();
  for (const time of ['2026-10-14T09:00:00Z', '2026-10-14T12:00:00Z']) {
    const bad = structuredClone(state);
    bad.sessions[0].exercises[0].completedAt = time;
    expect(() => validateBackup(bad)).toThrow();
  }
});

it('marcações concorrentes são idempotentes e preservam a data de conclusão', () => {
  const seq = fixture();
  let session = startSession(seq, seq.nextWorkoutId, new Date('2026-10-14T10:00:00Z'));
  session = setSetDone(session, 'ex', 0, true, new Date('2026-10-14T10:01:00Z'));
  session = setSetDone(session, 'ex', 0, true, new Date('2026-10-14T10:02:00Z'));
  expect(session.exercises[0].sets[0].done).toBe(true);
  for (let i = 1; i < 3; i++)
    session = setSetDone(session, 'ex', i, true, new Date('2026-10-14T10:03:00Z'));
  const done = session.exercises[0].completedAt;
  session = setSetDone(session, 'ex', 2, true, new Date('2026-10-14T10:04:00Z'));
  expect(session.exercises[0].completedAt).toBe(done);
});
it('não permite descartar nem editar uma sessão já encerrada por outra aba', () => {
  const seq = fixture();
  const session = startSession(seq, seq.nextWorkoutId, new Date());
  const state = {
    ...emptyState(),
    sequences: [seq],
    selectedSequenceId: seq.id,
    sessions: [session],
  };
  const finished = finishSession(state, session.id, new Date());
  expect(() => discardSession(finished, session.id)).toThrow();
  expect(() =>
    updateSession(finished, session.id, (s) => ({ ...s, workoutName: 'Alterado' }))
  ).toThrow();
  expect(finished.sessions).toHaveLength(1);
  expect(discardSession(state, session.id).sessions).toHaveLength(0);
});
it('reordena pelo ID atual e revalida os limites', () => {
  const initial = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  const moved = moveById(initial, 'b', -1);
  expect(moved.map((x) => x.id)).toEqual(['b', 'a', 'c']);
  expect(moveById(moved, 'b', -1).map((x) => x.id)).toEqual(['b', 'a', 'c']);
  expect(moveById(moved, 'b', 1).map((x) => x.id)).toEqual(['a', 'b', 'c']);
});
