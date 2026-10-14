# Bolchefitness — proposta de design

## Objetivo
PWA mobile first, em português, para uso pessoal na academia. Criar e editar sequências com quantidade configurável de treinos, acompanhar séries e consultar exercícios concluídos em um calendário. Sem login, servidor de aplicação ou banco de dados remoto. Publicação no GitHub Pages pessoal.

## Abordagens
1. React com TypeScript, build estático, IndexedDB e service worker: recomendada pela separação entre interface, armazenamento local e instalação offline.
2. JavaScript sem framework: reduz dependências, mas torna mais trabalhoso manter edição, sessão em andamento e histórico sincronizados na interface.
3. Framework com servidor: adiciona infraestrutura desnecessária para este uso.

## Experiência
Interface mobile first com navegação inferior: Hoje, Treinos, Calendário e Configurações. Botões confortáveis para toque, contraste acessível, campos rotulados e estados vazios com orientação. Visual esportivo, escuro, com destaque verde; nenhum recurso depende de fontes ou imagens externas.

Hoje apresenta a sequência escolhida, o próximo treino e a sessão em andamento. A sequência avança quando uma sessão é encerrada; o usuário pode escolher outro treino manualmente.

Treinos permite criar e nomear sequências com qualquer quantidade positiva de fichas. Na criação, oferecer os atalhos AB, ABC e ABCD e a opção Personalizada, inicialmente com uma ficha. São sugestões de organização, sem prescrição de exercícios ou dias da semana. Permitir adicionar e remover fichas também depois da criação. Gerar identificadores A a Z, depois AA, AB e assim por diante; os nomes das fichas são editáveis. Nunca impor um máximo de quatro fichas. Ao remover uma ficha, preservar seu histórico e ajustar o próximo treino para uma ficha existente; impedir que a sequência fique sem fichas. Cada ficha contém exercícios ordenados com nome, quantidade de séries, repetições e carga em kg. É possível adicionar, editar, remover e reordenar exercícios. Repetições aceitam texto curto, como 8–12; cargas aceitam decimais e zero.

Ao iniciar uma sessão, copiar a ficha para um registro independente. Exibir exercícios como checklist, com uma marcação por série e progresso total. Permitir ajustar carga e repetições durante a sessão. Concluir um exercício exige todas as séries marcadas; oferecer ação para marcar todas. Salvar imediatamente cada alteração. Reabrir o app recupera a sessão em andamento.

Cada exercício concluído recebe data e hora de conclusão. O calendário marca os dias com exercícios concluídos e permite consultar nome, ficha, séries, repetições e cargas daquela execução, inclusive de uma sessão ainda aberta. Desmarcar uma série retira o estado de conclusão do exercício. Registros anteriores não mudam quando a ficha é editada.

Encerrar uma sessão parcialmente concluída exige confirmação e preserva somente o progresso realizado como histórico parcial. Uma sessão encerrada não é reaberta. Permitir descartar uma sessão em andamento com confirmação.

Configurações oferece orientações de instalação e exportação/importação de backup JSON versionado. Validar um backup antes de substituir dados locais e pedir confirmação para substituição. Explicar que os dados pertencem ao navegador/dispositivo e podem ser removidos ao limpar dados do site.

## Dados e offline
IndexedDB armazena sequências, configurações e sessões. Acesso encapsulado em módulo próprio, com validação de entrada e versão do esquema. Falhas de armazenamento devem aparecer na interface; nunca sinalizar salvamento que falhou.

Service worker armazena o aplicativo e os recursos estáticos após o primeiro acesso online. Manifest inclui nome, ícones, cores e modo standalone. Todos os caminhos respeitam o subdiretório do GitHub Pages. A primeira visita precisa de conexão; depois de baixar o aplicativo, os fluxos principais funcionam offline. Atualizações preservam dados e não recarregam uma sessão em andamento automaticamente.

Datas do calendário seguem o horário local do dispositivo; instantes também são preservados para histórico. Nenhuma chamada externa faz parte dos fluxos de treino.

## Publicação
Gerar build estático e workflow de GitHub Actions para GitHub Pages. Confirmar conta e repositório pelo ambiente autenticado quando disponíveis; se ausentes, obter o destino com o usuário. Publicar sem sobrescrever um site pessoal existente. O nome do repositório determina o caminho base. Publicação depende de acesso autorizado à conta GitHub.

## Validação
Testar persistência e retomada, independência entre ficha e histórico, conclusão/desmarcação, calendário por data local, validação de backup e avanço da sequência. Verificar interface em viewport de celular, build de produção, manifest, instalação quando suportada e navegação offline após carregamento inicial. Verificar workflow e URL publicada quando o acesso ao GitHub permitir.

## Escopo
Sem sincronização entre dispositivos, contas, prescrição automática de exercícios ou integrações externas. O aplicativo começa com orientação para criar a primeira sequência, sem inventar uma ficha pessoal de treino.
