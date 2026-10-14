import { it, expect } from 'vitest';
import {
  createSequence,
  startSession,
  emptyState,
  validateBackup,
  finishSession,
} from '../src/domain';
import { startRest, cancelRest, remainingRestSeconds, formatRest } from '../src/rest';
function fixture() {
  const sequence = createSequence('Rotina', 2);
  sequence.workouts[0].exercises = [{ id: 'ex', name: 'Remada', sets: 3, reps: '10', load: 20 }];
  const session = startSession(sequence, sequence.nextWorkoutId, new Date('2026-10-14T10:00:00Z'));
  return {
    ...emptyState(),
    sequences: [sequence],
    selectedSequenceId: sequence.id,
    sessions: [session],
  };
}
it('salva duração e prazo sem alterar séries ou iniciar automaticamente', () => {
  const state = fixture();
  expect(state.sessions[0].exercises[0].restEndsAt ?? null).toBeNull();
  const next = startRest(state, state.sessions[0].id, 'ex', 90, 1000);
  expect(next.sessions[0].exercises[0].restEndsAt).toBe(91000);
  expect(next.sessions[0].exercises[0].restSeconds).toBe(90);
  expect(next.sequences[0].workouts[0].exercises[0].restSeconds).toBe(90);
  expect(next.sessions[0].exercises[0].sets).toEqual(state.sessions[0].exercises[0].sets);
  expect(validateBackup(JSON.parse(JSON.stringify(next)))).toEqual(next);
  expect(
    startSession(next.sequences[0], next.sequences[0].nextWorkoutId, new Date()).exercises[0]
      .restSeconds
  ).toBe(90);
  const cancelled = cancelRest(next, next.sessions[0].id, 'ex');
  expect(cancelled.sessions[0].exercises[0].restEndsAt).toBeNull();
  expect(cancelled.sessions[0].exercises[0].restSeconds).toBe(90);
});
it('calcula por prazo real, inclusive após pausa de execução e término', () => {
  expect(remainingRestSeconds(91000, 1000)).toBe(90);
  expect(remainingRestSeconds(91000, 52500)).toBe(39);
  expect(remainingRestSeconds(91000, 99999)).toBe(0);
  expect(formatRest(90)).toBe('01:30');
  expect(formatRest(0)).toBe('00:00');
});
it('rejeita duração inválida e alterações em sessões encerradas', () => {
  const state = fixture();
  const id = state.sessions[0].id;
  for (const seconds of [0, -1, 1.2, Infinity, 3601])
    expect(() => startRest(state, id, 'ex', seconds, 1000)).toThrow();
  expect(() => startRest(state, id, 'missing', 30, 1000)).toThrow();
  const ended = finishSession(state, id, new Date('2026-10-14T11:00:00Z'));
  expect(() => startRest(ended, id, 'ex', 30, 1000)).toThrow();
  expect(() => cancelRest(ended, id, 'ex')).toThrow();
});
it('mantém backups antigos e rejeita descanso corrompido', () => {
  const state = fixture();
  expect(validateBackup(state)).toEqual(state);
  const bad = structuredClone(state);
  bad.sessions[0].exercises[0].restSeconds = -1;
  expect(() => validateBackup(bad)).toThrow();
  const badDeadline = structuredClone(state);
  badDeadline.sessions[0].exercises[0].restEndsAt = NaN;
  expect(() => validateBackup(badDeadline)).toThrow();
});
