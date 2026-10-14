# Bolchefitness

PWA mobile first, grátis e de código aberto para bolcheviques fitness. Organize treinos, acompanhe séries e consulte o histórico. Em português, sem conta, sem backend e sem envio de dados de treino.

## Usar

1. Crie uma sequência: AB, ABC e ABCD são sugestões; Personalizada aceita qualquer quantidade positiva de fichas.
2. Adicione exercícios e configure cada série por repetições (como `8–12`) ou por tempo em texto livre (como `1 minuto` ou `30 a 40 minutos`), além da carga em kg. Use zero para exercícios sem carga adicional.
3. Inicie o treino e marque cada série. Apenas o primeiro exercício começa expandido. Dentro de cada exercício há um descanso manual: ajuste os segundos e toque em Iniciar; Cancelar interrompe a contagem. A duração é salva ao iniciar, e o temporizador continua ao trocar de tela ou reabrir o aplicativo. Você pode ajustar cargas e repetições de cada série durante a execução. O progresso é salvo imediatamente e retomado ao reabrir.
4. Consulte os exercícios concluídos no calendário. O histórico mantém os valores realizados mesmo depois de editar ou excluir fichas.
5. Exporte um backup em Configurações. Importar um backup validado substitui os dados atuais após confirmação.

Finalizar um treino avança a sequência. Um treino parcial mantém as séries realizadas; somente exercícios completos marcam o calendário. Descartar apaga apenas a sessão em andamento.

## Instalação e offline

A primeira visita precisa de internet para baixar o aplicativo. Depois de carregado, ele funciona offline no mesmo navegador/dispositivo. Instale pelo menu do navegador no Android. No iPhone, abra no Safari e use Compartilhar → Adicionar à Tela de Início.

Os dados ficam no IndexedDB local. Cada navegador/dispositivo tem seus próprios dados. Limpar os dados do site ou remover seu armazenamento pode apagar fichas e histórico; guarde backups. Não há sincronização automática entre dispositivos.

Atualizações ficam em espera e só são aplicadas pelo usuário quando não há treino em andamento. O aplicativo não recarrega automaticamente durante a sessão. Fontes, ícones e recursos são locais.

## Desenvolvimento

Node.js 22 e npm:

```bash
npm ci
npm run dev
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

O endereço local usa `/bolchefitness/`. `npm run preview` serve o build de produção, necessário para verificar o service worker. Para publicar em outro caminho, defina `BASE_PATH=/outro-repositorio/` no build e ajuste o workflow/testes.

## GitHub Pages

O workflow `.github/workflows/pages.yml` testa e publica a branch `main` via GitHub Actions. Em Settings → Pages, selecione GitHub Actions como fonte. A publicação prevista é `https://esron.github.io/bolchefitness/`.

## Organização

- `src/domain.ts`: sequências, snapshots de execução, calendário e validação de backup.
- `src/storage.ts`: transações IndexedDB.
- `src/useTracker.ts`: estado, hidratação e gravações.
- `src/screens/`, `src/components/`: interface.
- `scripts/build-pwa.mjs`: manifest e precache versionado.
- `tests/`: testes de domínio, persistência e fluxo mobile/offline.
