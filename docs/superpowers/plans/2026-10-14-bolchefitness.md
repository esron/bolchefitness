# Bolchefitness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar e publicar um PWA pessoal para editar sequências de treinos, acompanhar séries e consultar o histórico offline.

**Architecture:** React e TypeScript com navegação interna sem rotas no servidor. Modelo de domínio puro para fichas e sessões; repositório IndexedDB para persistência transacional. Build Vite estático, manifest e service worker com precache de recursos locais.

**Tech Stack:** React, TypeScript, Vite, IndexedDB nativo, Vitest, Playwright para testes de fluxos e offline; GitHub Actions e Pages.

**Spec:** `docs/superpowers/specs/2026-10-14-bolchefitness-design.md`

## Global Constraints

- PWA mobile first, em português, para uso pessoal na academia.
- Sem login, servidor de aplicação ou banco de dados remoto.
- Publicação no GitHub Pages pessoal.
- Nunca impor um máximo de quatro fichas.
- Todos os caminhos respeitam o subdiretório do GitHub Pages.
- A primeira visita precisa de conexão; depois de baixar o aplicativo, os fluxos principais funcionam offline.
- Nenhuma chamada externa faz parte dos fluxos de treino.
- Datas do calendário seguem o horário local do dispositivo.
- Registros anteriores não mudam quando a ficha é editada.

## Review Focus

1. Mais de 26 fichas: identificadores continuam em AA, AB; sequência não perde fichas.
2. Remover a ficha indicada como próxima: ponteiro permanece válido e histórico é preservado.
3. Falha de gravação ou importação inválida: dados existentes permanecem intactos e a interface explica o erro.
4. Exercício concluído próximo da meia-noite: calendário usa a data local da conclusão.
5. Atualização do aplicativo durante uma sessão: nenhum progresso é perdido e nenhum reload ocorre automaticamente.

## Estrutura e contratos

- `src/domain.ts`: tipos, validação, criação de fichas, transições de sessões, datas e backup.
- `src/storage.ts`: abrir IndexedDB, carregar e salvar estado completo em uma transação.
- `src/useTracker.ts`: hidratação, fila de alterações e feedback de falha; expõe estado persistido e ações.
- `src/App.tsx`: navegação, contexto de estado, indicadores de carregamento, erro e offline.
- `src/screens/Today.tsx`: próximo treino, escolha manual e sessão em andamento.
- `src/screens/Workouts.tsx`: editor de sequências, fichas e exercícios.
- `src/screens/Calendar.tsx`: mês navegável e detalhes do dia.
- `src/screens/Settings.tsx`: instalação e backup.
- `src/components/Session.tsx`: checklist e edição de execução.
- `src/styles.css`: identidade visual, responsividade, foco e acessibilidade.
- `src/pwa.ts`, `scripts/build-pwa.mjs`, `public/icons/*`: registro, precache e ícones locais.
- `tests/domain.test.ts`, `tests/storage.test.ts`, `tests/tracker.spec.ts`: testes de invariantes, armazenamento e navegador.
- `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`: ambiente e build.
- `.github/workflows/pages.yml`, `README.md`, `.gitignore`: publicação e instruções.

Contratos do domínio:

```ts
export type Exercise = { id: string; name: string; sets: number; reps: string; load: number };
export type Workout = { id: string; label: string; name: string; exercises: Exercise[] };
export type Sequence = { id: string; name: string; workouts: Workout[]; nextWorkoutId: string };
export type PerformedSet = { reps: string; load: number; done: boolean };
export type PerformedExercise = { id: string; name: string; sets: PerformedSet[]; completedAt: string | null; completedDay: string | null };
export type Session = { id: string; sequenceId: string; workoutId: string; workoutName: string; startedAt: string; endedAt: string | null; exercises: PerformedExercise[] };
export type State = { version: 1; sequences: Sequence[]; selectedSequenceId: string | null; sessions: Session[] };
export function labelAt(index: number): string;
export function createSequence(name: string, count: number): Sequence;
export function startSession(sequence: Sequence, workoutId: string, now: Date): Session;
export function toggleSet(session: Session, exerciseId: string, setIndex: number, now: Date): Session;
export function removeWorkout(sequence: Sequence, workoutId: string): Sequence;
export function finishSession(state: State, sessionId: string, now: Date): State;
export function validateBackup(value: unknown): State;
export function localDay(now: Date): string;
export async function loadState(): Promise<State>;
export async function saveState(state: State): Promise<void>;
```

## Task 1: Modelo, sequências configuráveis e persistência

**Files:** configurações de build; `src/domain.ts`, `src/storage.ts`; `tests/domain.test.ts`, `tests/storage.test.ts`.

**Interfaces:** produz todos os contratos acima; armazenamento retorna estado vazio versionado no primeiro acesso.

- [ ] Criar ambiente React/TypeScript com scripts `dev`, `build`, `preview`, `test` e `test:e2e`. Usar Node 22 e arquivo de lock; ignorar `node_modules`, `dist` e resultados de testes.
- [ ] Escrever primeiro os testes de identificação e criação configurável:

```ts
expect(labelAt(0)).toBe('A');
expect(labelAt(25)).toBe('Z');
expect(labelAt(26)).toBe('AA');
expect(labelAt(27)).toBe('AB');
expect(createSequence('Minha rotina', 6).workouts).toHaveLength(6);
expect(() => createSequence('Minha rotina', 0)).toThrow();
```

- [ ] Executar `npm test -- tests/domain.test.ts`; confirmar que os contratos ainda ausentes fazem os testes falharem.
- [ ] Implementar IDs com `crypto.randomUUID()`, quantidade inteira positiva, nomes não vazios, séries inteiras positivas, repetições não vazias e cargas finitas não negativas. Gerar rótulos usando numeração bijetiva de base 26. Não associar dias da semana às fichas.
- [ ] Testar remoção: criar seis fichas, apontar a próxima para a terceira, removê-la e confirmar que `nextWorkoutId` ainda pertence a `workouts`. Impedir remoção da última ficha.
- [ ] Implementar validação completa de backup versão 1, IDs únicos, referências válidas, no máximo uma sessão aberta e consistência entre séries concluídas e data de conclusão. Rejeitar versão desconhecida antes de gravar.
- [ ] Testar armazenamento com IndexedDB simulado: salvar, reabrir e comparar estado; abortar transação de gravação e confirmar rejeição e preservação do estado anterior. `saveState` resolve apenas no evento `transaction.oncomplete`; abortos e erros rejeitam a Promise.
- [ ] Executar os testes e `npm run build`. Registrar a entrega em commit, se houver autorização de escrita em `.git`.

## Task 2: Sessões, calendário e invariantes de histórico

**Files:** `src/domain.ts`, `tests/domain.test.ts`.

**Interfaces:** consome `Sequence` e `State`; produz sessões independentes, datas locais e transições de conclusão.

- [ ] Escrever teste que inicia sessão com um exercício de três séries, edita a ficha original e confirma que nome, carga e repetições da sessão não mudam.
- [ ] Escrever teste que marca três séries com `toggleSet`, verifica `completedAt` e `completedDay` e desmarca uma série verificando ambas as datas nulas.
- [ ] Executar os testes para confirmar falha antes de implementar essas transições.
- [ ] Copiar exercícios para séries individuais no início. Impedir início de outra sessão enquanto houver uma aberta. Ao marcar a última série, registrar instante ISO e data local; ao desmarcar, limpar conclusão.
- [ ] Fixar teste de virada de dia usando `new Date(2026, 9, 14, 23, 59)`; confirmar `localDay` igual a `2026-10-14`, independentemente da representação UTC.
- [ ] Implementar encerramento completo/parcial preservando séries feitas e avançando para a próxima ficha existente na ordem. Se a ficha original foi removida, manter o próximo ponteiro válido. Encerrar não altera eventos de conclusão anteriores.
- [ ] Executar os testes e build. Registrar a entrega em commit quando permitido.

## Task 3: Interface mobile e edição de fichas

**Files:** `src/App.tsx`, `src/useTracker.ts`, `src/screens/Today.tsx`, `src/screens/Workouts.tsx`, `src/styles.css`, `tests/tracker.spec.ts`.

**Interfaces:** consome domínio e armazenamento; hook expõe `{state, ready, pending, error, update}`. `update` serializa alterações, salva primeiro e só então confirma o estado na interface.

- [ ] Escrever fluxo de navegador para criar sequência personalizada com seis fichas, editar nome e exercício, recarregar e verificar persistência.
- [ ] Executar `npm run test:e2e` e confirmar falha por ausência da interface.
- [ ] Construir shell escuro com destaque verde, navegação inferior e quatro telas, layout de celular e largura confortável em desktop. Usar ícones locais, foco visível e controles com área de toque de pelo menos 44 px.
- [ ] Na criação, oferecer AB, ABC e ABCD como atalhos e Personalizada com quantidade inteira positiva. Permitir adicionar/remover fichas depois, editar seus nomes e escolher sequência ativa.
- [ ] Implementar editor de exercícios com campos rotulados, adicionar, remover e mover para cima/baixo; validar sem perder conteúdo digitado. Confirmar exclusões de fichas ou sequências com conteúdo.
- [ ] Hidratar antes de permitir ações. Serializar mutações e impedir clique repetido enquanto a gravação estiver pendente. Falha de leitura oferece tentar novamente sem sobrescrever os dados.
- [ ] Testar erro de gravação com simulação de falha no repositório: ação não aparece como salva e mensagem permite tentar novamente.
- [ ] Executar testes, build e inspeção em 390 × 844, inclusive teclado aberto e nomes longos. Registrar a entrega em commit quando permitido.

## Task 4: Execução, histórico e backup

**Files:** `src/components/Session.tsx`, `src/screens/Calendar.tsx`, `src/screens/Settings.tsx`, `tests/tracker.spec.ts`.

**Interfaces:** consome `State`, ações do hook e domínio. Calendário consulta `completedDay` das sessões; backup usa `validateBackup` antes de uma única gravação.

- [ ] Escrever fluxo que inicia treino, marca série, recarrega, retoma, conclui exercício e verifica calendário; desmarcar deve remover a conclusão do dia.
- [ ] Executar teste para confirmar falha antes de construir a interface.
- [ ] Implementar checklist por série com ajuste de carga/repetições, progresso por exercício e ação concluir todas. Encerramento parcial e descarte pedem confirmação; descarte remove somente a sessão aberta.
- [ ] Implementar calendário mensal com navegação e seleção de dia. Dias com conclusão têm indicador acessível; detalhes mostram ficha, exercício e séries executadas, inclusive em sessão aberta.
- [ ] Implementar exportação JSON com Blob/download e importação com arquivo local, validação e resumo antes de confirmar substituição. Importação inválida não altera o estado; mostrar motivo legível.
- [ ] Testar exportação/importação, arquivo JSON truncado e versão desconhecida. Confirmar que exercício histórico preserva cargas depois de edição da ficha.
- [ ] Executar testes, build e inspeção mobile. Registrar a entrega em commit quando permitido.

## Task 5: PWA offline e publicação

**Files:** `src/pwa.ts`, `scripts/build-pwa.mjs`, `public/icons/*`, `vite.config.ts`, `.github/workflows/pages.yml`, `README.md`, `tests/tracker.spec.ts`.

**Interfaces:** base Vite derivada do destino; manifest e service worker usam o mesmo escopo. Build gera precache dos recursos em `dist`.

- [ ] Escrever teste do build em `/bolchefitness/`: abrir online, aguardar service worker controlar a página, ativar offline, recarregar e executar sessão. Confirmar que todos os recursos vêm do cache.
- [ ] Executar teste e confirmar falha sem service worker.
- [ ] Gerar ícones PNG de 192 e 512 px e ícone Apple local; criar manifest standalone com `start_url` e `scope` consistentes com a base. Registrar service worker somente em produção.
- [ ] Gerar lista de precache a partir do build, incluindo HTML, JS, CSS, manifest e ícones. Usar cache versionado e respostas do mesmo escopo. Instalação só completa quando os recursos essenciais forem armazenados.
- [ ] Manter atualização esperando em segundo plano; não usar reload automático nem `skipWaiting` durante sessão. Mostrar atualização disponível e permitir aplicação quando não houver sessão aberta. Testar que instalação de nova versão não apaga IndexedDB nem reinicia o treino.
- [ ] Documentar primeira carga online, instalação Android/iOS, backup, uso local e deploy.
- [ ] Criar workflow com checkout, Node 22, `npm ci`, testes, build, configuração Pages, upload de `dist` e deploy. Usar permissões `contents: read`, `pages: write`, `id-token: write` e ambiente `github-pages`.
- [ ] Inspecionar conta autenticada com `gh auth status` e destino existente antes de criar repositório ou publicar. Sem conta/destino resolvido, pedir apenas essa informação e concluir todos os testes locais independentes.
- [ ] Publicar no repositório correto, acompanhar Actions e abrir URL final; verificar assets, manifest e comportamento offline no endereço publicado. Não substituir site pessoal existente sem instrução explícita.

## Validação final e handoff

- [ ] Executar `npm test`, `npm run build` e `npm run test:e2e` sobre build de produção.
- [ ] Revisar fluxos de criação personalizada, retomada, calendário, backup e offline; corrigir falhas observadas antes de declarar conclusão.
- [ ] Entregar URL pública quando publicação confirmada; caso bloqueada por acesso, informar precisamente a etapa pendente e entregar projeto local validado.

## Referências verificadas

- Vite/GitHub Pages: https://vite.dev/guide/static-deploy.html#github-pages
- IndexedDB: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
- Service worker: https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API

## Execução proposta

Implementação nativa nesta sessão, por tarefas na ordem acima. Os componentes compartilham contratos de domínio e estado; execução sequencial reduz divergências e permite verificar cada fluxo ao integrá-lo.
