import { updateSession, type State } from './domain';
export const DEFAULT_REST_SECONDS = 60;
export const MAX_REST_SECONDS = 3600;
export function startRest(
  state: State,
  sessionId: string,
  exerciseId: string,
  seconds: number,
  now: number
): State {
  if (
    !Number.isInteger(seconds) ||
    seconds < 1 ||
    seconds > MAX_REST_SECONDS ||
    !Number.isFinite(now)
  )
    throw new Error('Informe um descanso entre 1 e 3600 segundos.');
  const next = updateSession(state, sessionId, (session) => {
    if (!session.exercises.some((e) => e.id === exerciseId))
      throw new Error('Exercício não encontrado.');
    return {
      ...session,
      exercises: session.exercises.map((e) =>
        e.id === exerciseId ? { ...e, restSeconds: seconds, restEndsAt: now + seconds * 1000 } : e
      ),
    };
  });
  const session = next.sessions.find((s) => s.id === sessionId)!;
  // Remember this exercise's preference for future sessions, without changing old snapshots.
  return {
    ...next,
    sequences: next.sequences.map((seq) =>
      seq.id === session.sequenceId
        ? {
            ...seq,
            workouts: seq.workouts.map((w) =>
              w.id === session.workoutId
                ? {
                    ...w,
                    exercises: w.exercises.map((e) =>
                      e.id === exerciseId ? { ...e, restSeconds: seconds } : e
                    ),
                  }
                : w
            ),
          }
        : seq
    ),
  };
}
export function cancelRest(state: State, sessionId: string, exerciseId: string): State {
  return updateSession(state, sessionId, (session) => {
    if (!session.exercises.some((e) => e.id === exerciseId))
      throw new Error('Exercício não encontrado.');
    return {
      ...session,
      exercises: session.exercises.map((e) =>
        e.id === exerciseId ? { ...e, restEndsAt: null } : e
      ),
    };
  });
}
export function remainingRestSeconds(deadline: number, now: number): number {
  return Math.max(0, Math.ceil((deadline - now) / 1000));
}
export function formatRest(seconds: number): string {
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}
