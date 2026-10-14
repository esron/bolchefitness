import { useCallback, useEffect, useRef, useState } from 'react';
import { emptyState, type State } from './domain';
import { loadState, mutateState } from './storage';
export function useTracker() {
  const [state, setState] = useState<State>(emptyState);
  const current = useRef(state);
  const lock = useRef(false);
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const reload = useCallback(async () => {
    setError('');
    try {
      const saved = await loadState();
      current.current = saved;
      setState(saved);
      setReady(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao ler dados.');
    }
  }, []);
  useEffect(() => {
    void reload();
  }, [reload]);
  useEffect(() => {
    const channel =
      'BroadcastChannel' in window ? new BroadcastChannel('bolchefitness-state') : null;
    if (channel)
      channel.onmessage = () => {
        if (!lock.current) void reload();
      };
    const focus = () => {
      if (!lock.current) void reload();
    };
    window.addEventListener('focus', focus);
    return () => {
      channel?.close();
      window.removeEventListener('focus', focus);
    };
  }, [reload]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (lock.current) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);
  const update = useCallback(
    async (change: (s: State) => State): Promise<boolean> => {
      if (lock.current || !ready) return false;
      lock.current = true;
      setPending(true);
      setError('');
      try {
        const next = await mutateState(change);
        current.current = next;
        setState(next);
        if ('BroadcastChannel' in window) {
          const channel = new BroadcastChannel('bolchefitness-state');
          channel.postMessage('saved');
          channel.close();
        }
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Não foi possível salvar. Tente novamente.');
        return false;
      } finally {
        lock.current = false;
        setPending(false);
      }
    },
    [ready]
  );
  return {
    state,
    ready,
    pending,
    error,
    update,
    reload,
    clearError: () => setError(''),
    canUpdate: () => !lock.current && !current.current.sessions.some((s) => !s.endedAt),
  };
}
export type Tracker = ReturnType<typeof useTracker>;
