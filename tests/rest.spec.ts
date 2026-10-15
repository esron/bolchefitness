import { test, expect } from '@playwright/test';
test('primeiro exercício aberto e descanso manual configurável, persistente e offline', async ({
  page,
  context,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'vibrate', {
      configurable: true,
      value: (pattern: number | number[]) => {
        (window as Window & { vibrationPattern?: number | number[] }).vibrationPattern = pattern;
        return true;
      },
    });
  });
  await page.goto('./');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
    .toBe(true);
  const sequence = {
    id: 'seq',
    name: 'Rotina',
    nextWorkoutId: 'w',
    workouts: [
      {
        id: 'w',
        label: 'A',
        name: 'Treino A',
        exercises: [
          { id: 'a', name: 'Remada', sets: 2, reps: '10', load: 20 },
          { id: 'b', name: 'Supino', sets: 2, reps: '8', load: 30 },
          { id: 'c', name: 'Rosca', sets: 2, reps: '12', load: 10 },
        ],
      },
    ],
  };
  await page.evaluate(async (seq) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open('bolchefitness', 1);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('data', 'readwrite');
      tx.objectStore('data').put(
        { version: 1, sequences: [seq], selectedSequenceId: seq.id, sessions: [] },
        'state'
      );
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error);
    });
    db.close();
  }, sequence);
  await page.reload();
  await page.getByRole('button', { name: 'Iniciar treino', exact: true }).click();
  await expect(page.locator('.exercise-heading').nth(0)).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('.exercise-heading').nth(1)).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('.exercise-heading').nth(2)).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('checkbox', { name: 'Supino, série 1' })).not.toBeVisible();
  const timer = page.getByRole('timer', { name: 'Descanso de Remada' });
  await expect(timer).toHaveText('01:00');
  await page.getByRole('checkbox', { name: 'Remada, série 1' }).click();
  await expect(page.getByRole('checkbox', { name: 'Remada, série 1' })).toBeChecked();
  await expect(timer).toHaveText('01:00');
  await expect(page.getByRole('button', { name: 'Cancelar descanso de Remada' })).toBeVisible();
  await page.getByRole('button', { name: 'Cancelar descanso de Remada' }).click();
  await expect(page.getByRole('button', { name: 'Iniciar descanso de Remada' })).toBeVisible();
  await page.clock.install();
  await context.setOffline(true);
  await page.getByLabel('Descanso em segundos de Remada').fill('90');
  await page.getByRole('button', { name: 'Iniciar descanso de Remada' }).click();
  await expect(page.getByRole('button', { name: 'Cancelar descanso de Remada' })).toBeVisible();
  await expect(timer).toHaveText('01:30');
  await page.clock.runFor(3000);
  await expect(timer).toHaveText('01:27');
  // Switching screens and reloading must not reset the timer.
  const nav = page.getByRole('navigation', { name: 'Navegação no celular' });
  await nav.getByRole('button', { name: 'Calendário', exact: true }).click();
  await page.clock.runFor(2000);
  await nav.getByRole('button', { name: 'Hoje', exact: true }).click();
  await expect(timer).toHaveText('01:25');
  await page.reload();
  await expect(timer).toHaveText('01:25');
  await expect(page.getByLabel('Descanso em segundos de Remada')).toHaveValue('90');
  await page.getByRole('button', { name: 'Cancelar descanso de Remada' }).click();
  await expect(page.getByRole('button', { name: 'Iniciar descanso de Remada' })).toBeVisible();
  await expect(timer).toHaveText('01:30');
  await page.getByLabel('Descanso em segundos de Remada').fill('2');
  await page.getByRole('button', { name: 'Iniciar descanso de Remada' }).click();
  await expect(page.getByRole('button', { name: 'Cancelar descanso de Remada' })).toBeVisible();
  await page.clock.runFor(2000);
  await expect(timer).toHaveText('00:00');
  await expect(page.getByRole('status')).toHaveText('Descanso concluído.');
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & { vibrationPattern?: number | number[] }).vibrationPattern
      )
    )
    .toEqual([180, 80, 180]);
  await page.locator('.exercise-heading').nth(1).click();
  await expect(page.getByRole('checkbox', { name: 'Supino, série 1' })).toBeVisible();
  await expect(page.getByRole('timer', { name: 'Descanso de Supino' })).toHaveText('01:00');
  await page.screenshot({ path: '.superpowers/rest-mobile.png', fullPage: true });
  // Editing an exercise must keep its configured rest for the next workout.
  await page.getByRole('button', { name: 'Finalizar treino', exact: true }).click();
  await page.getByRole('button', { name: 'Encerrar parcial', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await nav.getByRole('button', { name: 'Treinos', exact: true }).click();
  await page.getByRole('button', { name: 'Abrir treino A' }).click();
  await page.getByRole('button', { name: 'Editar Remada', exact: true }).click();
  await page.getByLabel('Carga (kg)', { exact: true }).fill('25');
  await page.getByRole('button', { name: 'Salvar exercício', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await nav.getByRole('button', { name: 'Hoje', exact: true }).click();
  await page.getByRole('button', { name: 'Iniciar treino', exact: true }).click();
  await expect(page.getByLabel('Descanso em segundos de Remada')).toHaveValue('2');
  await expect(page.locator('.exercise-heading').nth(1)).toHaveAttribute('aria-expanded', 'false');
  await context.setOffline(false);
});
