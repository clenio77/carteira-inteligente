PRD: Carteira Inteligente
Data de Criação: 29/09/2025
Versão: 1.5
Autor: John (PM)

1. Objetivos e Contexto
1.1. Objetivos do Produto
Primário: Fornecer aos investidores brasileiros uma plataforma unificada e automática para consolidar e analisar as suas carteiras de investimentos, eliminando a necessidade de gestão manual em planilhas.

Secundário: Evoluir de um simples agregador para uma ferramenta de wealth management inteligente, oferecendo insights quantitativos que capacitem o utilizador a tomar decisões de investimento mais informadas.

Negócio: Validar o product-market fit com um MVP focado na dor principal (consolidação), construir uma base de utilizadores engajados e estabelecer a fundação técnica para futuras funcionalidades premium.

1.2. Contexto de Fundo
O mercado de investimentos no Brasil tem crescido exponencialmente, mas as ferramentas disponíveis para o investidor individual continuam fragmentadas. A gestão de uma carteira diversificada, distribuída por múltiplas corretoras, torna-se rapidamente uma tarefa manual, demorada e propensa a erros. O "Carteira Inteligente" nasce para resolver este problema, oferecendo uma solução "conectar e esquecer" que centraliza todas as informações relevantes (posições, transações, proventos) de forma segura e fidedigna, diretamente da fonte oficial (CEI da B3).

1.3. Histórico de Alterações
Data

Versão

Descrição

Autor

29/09/2025

1.0

Versão inicial com Objetivos.

John (PM)

29/09/2025

1.1

Adicionados Requisitos Funcionais e N-F.

John (PM)

29/09/2025

1.2

Adicionados Objetivos de Design de UI.

John (PM)

29/09/2025

1.3

Adicionadas Suposições Técnicas.

John (PM)

29/09/2025

1.4

Adicionada lista de Épicos.

John (PM)

29/09/2025

1.5

Detalhamento dos Épicos 1, 2 e 3.

John (PM)

2. Requisitos
2.1. Requisitos Funcionais (FR)
FR1: O sistema deve permitir que o utilizador se conecte de forma segura à sua conta do Canal Eletrônico do Investidor (CEI) da B3 para sincronizar os dados da sua carteira.

FR2: O sistema deve extrair e armazenar automaticamente as posições de ativos, o histórico de transações e os proventos recebidos.

FR3: O sistema deve atualizar os dados da carteira do utilizador periodicamente (ex: diariamente) de forma assíncrona.

FR4: A aplicação deve exibir um dashboard principal com o valor total da carteira, a sua evolução histórica e a alocação de ativos por tipo e setor.

FR5: A aplicação deve apresentar uma lista detalhada de todos os ativos na carteira do utilizador.

FR6: A aplicação deve fornecer uma visão detalhada para cada ativo, incluindo histórico de transações e proventos.

FR7: O sistema deve enviar notificações ao utilizador sobre eventos corporativos relevantes para os seus ativos (ex: pagamento de dividendos).

2.2. Requisitos Não Funcionais (NFR)
NFR1: A aplicação deve ser um Progressive Web App (PWA) totalmente responsivo, funcionando de forma otimizada em desktops, tablets e smartphones.

NFR2: Todos os dados sensíveis do utilizador, especialmente as credenciais do CEI, devem ser armazenados de forma encriptada e segura. A comunicação deve ser feita exclusivamente via HTTPS.

NFR3: O tempo de carregamento inicial da aplicação (First Contentful Paint) deve ser inferior a 3 segundos em uma conexão 3G.

NFR4: O processo de deploy para produção deve ser automatizado (CI/CD), com testes e linting a serem executados a cada alteração no código.

NFR5: A arquitetura deve ser escalável para suportar um aumento de 10x no número de utilizadores sem degradação significativa da performance.

NFR6: O sistema deve ter uma fiabilidade de 99.9% (uptime), com monitorização para detetar e alertar sobre falhas rapidamente.

3. Objetivos de Design da Interface do Utilizador (UI)
Visão Geral da UX: A experiência do utilizador deve ser clean, moderna e focada em dados. O objetivo é transformar dados financeiros complexos em visualizações claras e intuitivas. Menos é mais: a interface não deve ser poluída.

Paradigmas de Interação: A navegação deve ser simples, baseada em um menu lateral (em desktop) ou inferior (em mobile). Os dashboards devem ser interativos, permitindo que o utilizador explore os dados (ex: hover sobre gráficos para ver detalhes).

Ecrãs Principais: Dashboard Geral, Lista de Ativos, Detalhe do Ativo, Ecrã de Notificações, Perfil/Configurações.

Acessibilidade: A aplicação deve seguir as diretrizes WCAG AA, garantindo o contraste de cores e a navegação por teclado.

Branding: O design deve transmitir confiança, seriedade e modernidade, utilizando uma paleta de cores sóbria (tons de azul escuro, cinza e branco, com um toque de cor para destaques).

Plataformas Alvo: PWA Responsivo, com foco principal na experiência mobile-first.

4. Suposições Técnicas
Estrutura do Repositório: Será utilizado um Monorepo (gerido com Turborepo) para alojar as aplicações de frontend e backend.

Arquitetura de Serviços: A abordagem inicial para o backend será um Monólito Modular, permitindo uma separação lógica dos domínios (autenticação, portfólio, notificações) para facilitar uma futura migração para microsserviços, se necessário.

Requisitos de Testes: A estratégia de testes seguirá a pirâmide de testes, com uma base sólida de testes unitários, testes de integração para a API e os serviços, e testes end-to-end (E2E) para os fluxos críticos do utilizador.

Stack Tecnológica Preferida:

Frontend: Next.js (React) com TypeScript e Tailwind CSS.

Backend: Python com o framework FastAPI.

Base de Dados: PostgreSQL.

Infraestrutura: Vercel (para o frontend) e AWS (para o backend e base de dados).

5. Épicos e Histórias de Utilizador
Lista de Épicos do MVP
Épico 1: Fundação e Autenticação do Utilizador: Construir a estrutura base do projeto, o pipeline de CI/CD e o sistema de registo e login de utilizadores.

Épico 2: Consolidação e Visualização da Carteira: Implementar a funcionalidade central de conexão com a B3, sincronização de dados e exibição da carteira consolidada.

Épico 3: Notificações e Engajamento Proativo: Criar o sistema de notificações para manter o utilizador informado sobre eventos importantes da sua carteira.

Épico 1: Fundação e Autenticação do Utilizador
Objetivo do Épico: Estabelecer a fundação técnica do projeto, incluindo a estrutura do monorepo, o pipeline de CI/CD, a infraestrutura de base na AWS e um sistema de autenticação seguro. Ao final deste épico, um utilizador poderá registar-se e fazer login na aplicação.

História 1.1: Configuração do Monorepo e CI/CD inicial

Como um programador, eu quero ter a estrutura do monorepo configurada com um pipeline de CI/CD básico, para que possamos garantir a qualidade do código e automatizar os deploys desde o primeiro dia.

Critérios de Aceitação:

O monorepo deve ser inicializado utilizando Turborepo.

A estrutura de pastas deve conter apps/web (Next.js) e apps/api (Python).

A aplicação Next.js (apps/web) deve estar conectada à Vercel para deployments automáticos.

Um pipeline de CI/CD no GitHub Actions deve ser configurado para o backend (apps/api), executando linting e testes a cada push.

História 1.2: Configuração do Backend na AWS e Base de Dados

Como um programador, eu quero ter a infraestrutura básica do backend e da base de dados configurada na AWS, para que a nossa aplicação tenha uma fundação segura e escalável.

Critérios de Aceitação:

Uma instância do AWS RDS for PostgreSQL deve ser criada e estar acessível.

O modelo de dados inicial (tabela User) deve ser criado na base de dados via migração (ex: Alembic).

A aplicação FastAPI deve ser configurada para ser executada (ex: via Lambda ou ECS) e conectada à base de dados.

O Amazon API Gateway deve ser configurado para expor a API do FastAPI de forma segura.

História 1.3: Implementação do Registo de Utilizador

Como um novo utilizador, eu quero poder registar-me na plataforma usando um e-mail e uma palavra-passe, para que eu possa criar a minha conta.

Critérios de Aceitação:

Deve existir um endpoint POST /auth/register no backend.

A palavra-passe do utilizador deve ser armazenada na base de dados usando um hash seguro (ex: bcrypt).

O frontend deve ter uma página de registo (/register) com um formulário para e-mail e palavra-passe.

O sistema deve validar se o e-mail já está em uso.

História 1.4: Implementação do Login de Utilizador

Como um utilizador registado, eu quero poder fazer login na plataforma, para que eu possa aceder à minha carteira.

Critérios de Aceitação:

Deve existir um endpoint POST /auth/login que, em caso de sucesso, retorna um token JWT.

O frontend deve ter uma página de login (/login) com um formulário para e-mail e palavra-passe.

Após o login com sucesso, o token JWT deve ser armazenado de forma segura no cliente (ex: httpOnly cookie).

O utilizador deve ser redirecionado para o dashboard principal após o login.

As rotas protegidas (ex: dashboard) devem ser inacessíveis para utilizadores não autenticados.

Épico 2: Consolidação e Visualização da Carteira
Objetivo do Épico: Implementar a principal proposta de valor do MVP: a sincronização automática da carteira do utilizador a partir do CEI e a sua visualização num dashboard claro e intuitivo. Ao final deste épico, o utilizador poderá ver todos os seus ativos e a sua performance consolidada.

História 2.1: Conexão com o CEI e Sincronização Inicial

Como um utilizador autenticado, eu quero poder conectar a minha conta do CEI da B3 de forma segura, para que a plataforma possa sincronizar a minha carteira de investimentos.

Critérios de Aceitação:

O frontend deve ter uma secção (ex: num ecrã de onboarding ou configurações) para o utilizador inserir as suas credenciais do CEI (CPF e palavra-passe).

Deve existir um endpoint POST /cei/connect que recebe e encripta as credenciais antes de as armazenar de forma segura (ex: AWS Secrets Manager).

Após a conexão, o backend deve disparar um job assíncrono para iniciar a primeira sincronização completa.

O serviço de sincronização deve conseguir fazer login no CEI, navegar e extrair os dados de posições, transações e proventos.

Os dados extraídos devem ser processados e armazenados corretamente nas tabelas da nossa base de dados (Asset, AssetPosition, Transaction, Proceed).

História 2.2: Implementação do Dashboard Principal

Como um utilizador com a carteira sincronizada, eu quero ver um dashboard principal com uma visão geral do meu portfólio, para que eu possa entender rapidamente a minha situação financeira.

Critérios de Aceitação:

Deve existir um endpoint GET /portfolio/overview que retorna os dados agregados da carteira do utilizador.

O dashboard (/dashboard) deve exibir o valor total atualizado do portfólio.

O dashboard deve conter um gráfico de linhas mostrando a evolução do património ao longo do tempo.

O dashboard deve conter um gráfico (pizza ou barras) mostrando a alocação da carteira por tipo de ativo (Ações, FIIs, etc.).

O dashboard deve apresentar KPIs de diversificação, como a alocação por setor (ex: Financeiro, Energia, etc.) e a concentração nos 5 maiores ativos.

História 2.3: Implementação da Lista de Ativos

Como um utilizador, eu quero ver uma lista detalhada de todos os ativos que possuo, para que eu possa analisar cada posição individualmente.

Critérios de Aceitação:

Deve existir um endpoint GET /portfolio/assets que retorna a lista de AssetPosition do utilizador.

O frontend deve ter uma página (/dashboard/assets) que exibe uma tabela ou lista com todos os ativos.

Para cada ativo, a lista deve mostrar: ticker, nome da empresa, quantidade, preço médio, cotação atual, valor total da posição e rentabilidade.

História 2.4: Implementação do Detalhe do Ativo

Como um utilizador, eu quero poder clicar num ativo da minha lista para ver todos os detalhes sobre ele, para que eu possa entender o seu histórico completo.

Critérios de Aceitação:

Deve existir um endpoint GET /portfolio/assets/{ticker} que retorna o histórico de um ativo.

O frontend deve ter uma página dinâmica (/dashboard/assets/[ticker]).

Esta página deve exibir uma lista de todas as transações (compras e vendas) para aquele ativo, com data, quantidade e preço.

A página deve também exibir uma lista de todos os proventos (dividendos, JCP) recebidos para aquele ativo, com data e valor.

Épico 3: Notificações e Engajamento Proativo
Objetivo do Épico: Adicionar uma camada de inteligência proativa à plataforma, mantendo o utilizador informado sobre eventos importantes que afetam os seus investimentos. Ao final deste épico, a aplicação deixará de ser apenas uma ferramenta de consulta para se tornar um assistente de investimentos.

História 3.1: Implementação do Sistema de Notificações no Backend

Como um programador, eu quero ter um sistema no backend que possa gerar e armazenar notificações para os utilizadores, para que possamos informá-los sobre eventos relevantes.

Critérios de Aceitação:

Deve existir uma tabela Notification na base de dados.

O serviço de sincronização assíncrono deve ser modificado para identificar eventos futuros (ex: próximas datas de pagamento de dividendos) e criar notificações na base de dados para os utilizadores afetados.

Deve existir um endpoint GET /notifications para o frontend buscar as notificações de um utilizador.

Deve existir um endpoint POST /notifications/read para marcar as notificações como lidas.

História 3.2: Exibição das Notificações no Frontend

Como um utilizador, eu quero ver um ícone de notificações na interface que me alerte sobre novos eventos, para que eu possa manter-me informado.

Critérios de Aceitação:

A interface principal (ex: no header) deve ter um ícone de sino que exiba um contador de notificações não lidas.

Ao clicar no ícone, deve abrir um painel ou uma página (/dashboard/notifications) com a lista de todas as notificações, destacando as não lidas.

O utilizador deve ter a opção de marcar uma ou todas as notificações como lidas.

Opcional (se o PWA estiver instalado): O sistema deve ser capaz de enviar notificações push para o dispositivo do utilizador.