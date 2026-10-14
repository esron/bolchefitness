import { test, expect } from '@playwright/test';
test('sequência livre, retomada, calendário, backup e offline', async ({ page, context }) => {
  test.setTimeout(30000);
  await page.goto('./');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
    .toBe(true);
  await page.getByRole('button', { name: 'Criar minha sequência' }).click();
  await page.getByLabel('Nome da sequência').fill('Rotina pessoal');
  await page.getByRole('button', { name: 'Personalizada', exact: true }).click();
  await page.getByLabel('Quantidade de treinos').fill('6');
  await page.getByRole('button', { name: 'Criar sequência', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Abrir treino F' })).toBeVisible();
  await page.getByRole('button', { name: 'Abrir treino A' }).click();
  await page.getByRole('button', { name: 'Adicionar exercício', exact: true }).click();
  await page.getByLabel('Nome do exercício').fill('Agachamento');
  await page.getByLabel('Séries', { exact: true }).fill('3');
  await page.getByLabel('Repetições', { exact: true }).fill('8–12');
  await page.getByLabel('Carga (kg)', { exact: true }).fill('30');
  await page.getByRole('button', { name: 'Salvar exercício', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.getByText('Agachamento', { exact: true })).toBeVisible();
  await page.reload();
  await page
    .getByRole('navigation', { name: 'Navegação no celular' })
    .getByRole('button', { name: 'Hoje', exact: true })
    .click();
  await page.screenshot({ path: '.superpowers/home-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Iniciar treino', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Agachamento, série 1' }).click();
  await expect(page.getByRole('checkbox', { name: 'Agachamento, série 1' })).toBeChecked();
  await page.reload();
  await expect(page.getByRole('checkbox', { name: 'Agachamento, série 1' })).toBeChecked();
  await page.screenshot({ path: '.superpowers/session-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Concluir exercício Agachamento' }).click();
  await expect(page.getByRole('checkbox', { name: 'Agachamento, série 3' })).toBeChecked();
  await page
    .getByRole('navigation', { name: 'Navegação no celular' })
    .getByRole('button', { name: 'Calendário', exact: true })
    .click();
  await expect(page.getByText('Agachamento', { exact: true })).toBeVisible();
  await page.screenshot({ path: '.superpowers/calendar-mobile.png', fullPage: true });
  await expect(page.getByText('30 kg', { exact: false }).first()).toBeVisible();
  await page
    .getByRole('navigation', { name: 'Navegação no celular' })
    .getByRole('button', { name: 'Hoje', exact: true })
    .click();
  await page.getByRole('checkbox', { name: 'Agachamento, série 1' }).click();
  await expect(page.getByRole('checkbox', { name: 'Agachamento, série 1' })).not.toBeChecked();
  await page
    .getByRole('navigation', { name: 'Navegação no celular' })
    .getByRole('button', { name: 'Calendário', exact: true })
    .click();
  await expect(page.getByText('Nenhum exercício concluído neste dia.')).toBeVisible();
  await page
    .getByRole('navigation', { name: 'Navegação no celular' })
    .getByRole('button', { name: 'Hoje', exact: true })
    .click();
  await page.getByRole('button', { name: 'Concluir exercício Agachamento' }).click();
  await expect(page.getByRole('checkbox', { name: 'Agachamento, série 3' })).toBeChecked();
  await page.getByRole('button', { name: 'Finalizar treino', exact: true }).click();
  await expect(page.getByText('Treino B', { exact: true }).first()).toBeVisible();
  await page
    .getByRole('navigation', { name: 'Navegação no celular' })
    .getByRole('button', { name: 'Configurações', exact: true })
    .click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar backup', exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/bolchefitness.*json/);
  await page.getByLabel('Importar backup').setInputFiles({
    name: 'invalido.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{'),
  });
  await expect(page.getByRole('alert')).toContainText('Backup inválido');
  const exported = await download.path();
  await page.getByLabel('Importar backup').setInputFiles(exported!);
  await expect(page.getByRole('dialog')).toContainText('Substituir dados');
  await page.getByRole('button', { name: 'Substituir dados', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise<void>((resolve) =>
        navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), {
          once: true,
        })
      );
  });
  await context.setOffline(true);
  await page.reload();
  await page.screenshot({ path: '.superpowers/offline-mobile.png', fullPage: true });
  await page
    .getByRole('navigation', { name: 'Navegação no celular' })
    .getByRole('button', { name: 'Treinos', exact: true })
    .click();
  await expect(page.getByRole('button', { name: 'Abrir treino F' })).toBeVisible();
  await page
    .getByRole('navigation', { name: 'Navegação no celular' })
    .getByRole('button', { name: 'Calendário', exact: true })
    .click();
  await expect(page.getByText('Agachamento', { exact: true })).toBeVisible();
  await expect(page.locator('body')).toHaveJSProperty(
    'scrollWidth',
    await page.locator('body').evaluate((el) => el.clientWidth)
  );
  // Editing a template offline must preserve the executed snapshot.
  const nav = page.getByRole('navigation', { name: 'Navegação no celular' });
  await nav.getByRole('button', { name: 'Treinos', exact: true }).click();
  await page.getByRole('button', { name: 'Abrir treino A' }).click();
  await page.getByRole('button', { name: 'Editar Agachamento', exact: true }).click();
  await page.getByLabel('Carga (kg)', { exact: true }).fill('40');
  await page.getByRole('button', { name: 'Salvar exercício', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await nav.getByRole('button', { name: 'Calendário', exact: true }).click();
  await expect(page.getByText('30 kg', { exact: false }).first()).toBeVisible();
  await nav.getByRole('button', { name: 'Hoje', exact: true }).click();
  await page.getByLabel('Outro treino hoje?').selectOption({ label: 'Treino A' });
  await page.getByRole('button', { name: 'Iniciar treino', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Agachamento, série 1' }).click();
  await expect(page.getByRole('checkbox', { name: 'Agachamento, série 1' })).toBeChecked();
  await page.reload();
  await expect(page.getByRole('checkbox', { name: 'Agachamento, série 1' })).toBeChecked();
  await expect(page.getByRole('button', { name: 'Editar Agachamento, série 1' })).toContainText(
    '40'
  );
  await context.setOffline(false);
});

test('falha ao salvar mantém o formulário e permite recuperação', async ({ page }) => {
  await page.goto('./');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
    .toBe(true);
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.put;
    (window as unknown as { restorePut: () => void }).restorePut = () => {
      IDBObjectStore.prototype.put = original;
    };
    IDBObjectStore.prototype.put = function (...args) {
      const request = original.apply(this, args);
      this.transaction.abort();
      return request;
    };
  });
  await page.getByRole('button', { name: 'Criar minha sequência' }).click();
  await page.getByLabel('Nome da sequência').fill('Sem perder dados');
  await page.getByRole('button', { name: 'Criar sequência', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText(
    'Não foi possível salvar'
  );
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByLabel('Nome da sequência')).toHaveValue('Sem perder dados');
  await page.evaluate(() => (window as unknown as { restorePut: () => void }).restorePut());
  await page.getByRole('button', { name: 'Criar sequência', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.reload();
  await page
    .getByRole('navigation', { name: 'Navegação no celular' })
    .getByRole('button', { name: 'Treinos', exact: true })
    .click();
  await expect(page.getByLabel('Sequência ativa')).toHaveValue(/.+/);
  await expect(page.getByRole('button', { name: 'Abrir treino C' })).toBeVisible();
});

test('nova versão espera pelo fim da sessão e conserva progresso', async ({ page }) => {
  const { readFile, writeFile } = await import('node:fs/promises');
  const seq = {
    id: 'seq',
    name: 'Teste atualização',
    nextWorkoutId: 'w',
    workouts: [
      {
        id: 'w',
        label: 'A',
        name: 'Treino A',
        exercises: [{ id: 'e', name: 'Remada', sets: 2, reps: '10', load: 20 }],
      },
    ],
  };
  await page.goto('./');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
    .toBe(true);
  await page.evaluate(async (sequence) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open('bolchefitness', 1);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('data', 'readwrite');
      tx.objectStore('data').put(
        { version: 1, sequences: [sequence], selectedSequenceId: sequence.id, sessions: [] },
        'state'
      );
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error);
    });
    db.close();
  }, seq);
  await page.reload();
  await page.getByRole('button', { name: 'Iniciar treino', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Remada, série 1' }).click();
  await expect(page.getByRole('checkbox', { name: 'Remada, série 1' })).toBeChecked();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise<void>((r) =>
        navigator.serviceWorker.addEventListener('controllerchange', () => r(), { once: true })
      );
    (window as unknown as { sentinel: string }).sentinel = 'still here';
  });
  const original = await readFile('dist/sw.js', 'utf8');
  try {
    await writeFile(
      'dist/sw.js',
      original.replace(/const CACHE=(.+);/, "const CACHE=($1)+'-update-test';")
    );
    await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.ready;
      await reg.update();
    });
    await expect
      .poll(() => page.evaluate(async () => Boolean((await navigator.serviceWorker.ready).waiting)))
      .toBe(true);
    expect(await page.evaluate(() => (window as unknown as { sentinel: string }).sentinel)).toBe(
      'still here'
    );
    await expect(page.getByRole('checkbox', { name: 'Remada, série 1' })).toBeChecked();
    await expect(page.getByRole('button', { name: 'Atualizar', exact: true })).not.toBeVisible();
    await page.getByRole('button', { name: 'Concluir exercício Remada' }).click();
    await expect(page.getByRole('checkbox', { name: 'Remada, série 2' })).toBeChecked();
    await page.getByRole('button', { name: 'Finalizar treino', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Atualizar', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Atualizar', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Iniciar treino', exact: true })).toBeVisible();
    await page
      .getByRole('navigation', { name: 'Navegação no celular' })
      .getByRole('button', { name: 'Calendário', exact: true })
      .click();
    await expect(page.getByText('Remada', { exact: true })).toBeVisible();
  } finally {
    await writeFile('dist/sw.js', original);
  }
});
