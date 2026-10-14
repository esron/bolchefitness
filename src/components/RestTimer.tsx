import { useEffect, useState } from 'react';
import { Timer, Play, X } from 'lucide-react';
import { DEFAULT_REST_SECONDS, MAX_REST_SECONDS, formatRest, remainingRestSeconds } from '../rest';
import type { PerformedExercise } from '../domain';
export function RestTimer({
  exercise,
  pending,
  onStart,
  onCancel,
}: {
  exercise: PerformedExercise;
  pending: boolean;
  onStart: (seconds: number) => Promise<boolean>;
  onCancel: () => Promise<boolean>;
}) {
  const seconds = exercise.restSeconds ?? DEFAULT_REST_SECONDS;
  const deadline = exercise.restEndsAt ?? null;
  const [duration, setDuration] = useState(String(seconds));
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    setDuration(String(seconds));
  }, [seconds]);
  useEffect(() => {
    setNow(Date.now());
    if (deadline === null || deadline <= Date.now()) return;
    const interval = window.setInterval(() => {
      const time = Date.now();
      setNow(time);
      if (time >= deadline) window.clearInterval(interval);
    }, 250);
    return () => window.clearInterval(interval);
  }, [deadline]);
  const remaining = deadline === null ? seconds : remainingRestSeconds(deadline, now);
  const running = deadline !== null && remaining > 0;
  const complete = deadline !== null && remaining === 0;
  return (
    <form
      className={`rest-timer ${complete ? 'rest-complete' : ''}`}
      onSubmit={(e) => {
        e.preventDefault();
        void onStart(Number(duration));
      }}
    >
      <div className="rest-title">
        <Timer size={15} />
        <span>Descanso</span>
      </div>
      <div className="rest-controls">
        <label className="rest-duration">
          <input
            aria-label={`Descanso em segundos de ${exercise.name}`}
            type="number"
            inputMode="numeric"
            min="1"
            max={MAX_REST_SECONDS}
            step="1"
            required
            value={duration}
            disabled={pending || running}
            onChange={(e) => setDuration(e.target.value)}
          />
          <span>seg</span>
        </label>
        <span
          className="rest-clock"
          role="timer"
          aria-live="off"
          aria-label={`Descanso de ${exercise.name}`}
        >
          {formatRest(remaining)}
        </span>
        {running ? (
          <button
            type="button"
            className="secondary"
            aria-label={`Cancelar descanso de ${exercise.name}`}
            disabled={pending}
            onClick={() => void onCancel()}
          >
            <X size={15} />
            Cancelar
          </button>
        ) : (
          <button
            className="secondary"
            aria-label={`Iniciar descanso de ${exercise.name}`}
            disabled={pending}
          >
            <Play size={14} />
            Iniciar
          </button>
        )}
      </div>
      {complete && (
        <span className="rest-done" role="status">
          Descanso concluído.
        </span>
      )}
    </form>
  );
}
