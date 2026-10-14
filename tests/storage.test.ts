import 'fake-indexeddb/auto';
import { it, expect, vi } from 'vitest';
import { loadState, saveState, mutateState } from '../src/storage';
import { emptyState, createSequence } from '../src/domain';
it('persiste, reabre e mantém o estado anterior se a transação abortar', async () => {
  const seq = createSequence('Minha rotina', 6);
  const state = { ...emptyState(), sequences: [seq], selectedSequenceId: seq.id };
  await saveState(state);
  expect(await loadState()).toEqual(state);
  const real = IDBObjectStore.prototype.put;
  const spy = vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(function (
    this: IDBObjectStore,
    ...args: Parameters<IDBObjectStore['put']>
  ) {
    const result = real.apply(this, args);
    this.transaction.abort();
    return result;
  });
  await expect(saveState(emptyState())).rejects.toThrow();
  spy.mockRestore();
  expect(await loadState()).toEqual(state);
});

it('aplica alterações de abas antigas sobre o estado mais recente em uma transação', async () => {
  const seq = createSequence('Rotina', 3);
  await saveState({ ...emptyState(), sequences: [seq], selectedSequenceId: seq.id });
  const stale = await loadState();
  await mutateState((s) => ({
    ...s,
    sequences: s.sequences.map((x) => ({ ...x, name: 'Novo nome' })),
  }));
  await mutateState((s) => ({
    ...s,
    sequences: s.sequences.map((x) =>
      x.id === stale.sequences[0].id
        ? {
            ...x,
            workouts: [...x.workouts, { id: 'extra', label: 'D', name: 'Treino D', exercises: [] }],
          }
        : x
    ),
  }));
  const result = await loadState();
  expect(result.sequences[0].name).toBe('Novo nome');
  expect(result.sequences[0].workouts).toHaveLength(4);
});
