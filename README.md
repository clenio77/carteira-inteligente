# 💼 Carteira Inteligente

> Plataforma unificada para consolidar, analisar e otimizar carteiras de investimentos com o poder da Inteligência Artificial.

## 📖 Sobre

O **Carteira Inteligente** é uma solução completa que centraliza seus investimentos e utiliza IA de última geração para gerar insights acionáveis. Mais do que apenas mostrar saldo, o sistema atua como um consultor financeiro pessoal, analisando riscos, oportunidades e alinhamento com o cenário macroeconômico.

### ✨ Principais Funcionalidades

- **Dashboard Unificado**: Visão consolidada de Ações, FIIs, Renda Fixa e Tesouro Direto.
- **Relatório Gerencial com IA**: Análise profunda da carteira gerada pelo **Google Gemini 2.0 Flash**, oferecendo:
    - Resumo Executivo da performance.
    - Análise de Riscos e Diversificação.
    - Oportunidades de rebalanceamento.
    - Projeção Inteligente de Dividendos.
- **Dados de Mercado em Tempo Real**: Integração robusta com múltiplas fontes para garantir que você nunca fique sem cotações.
- **Contexto Macroeconômico**: Monitoramento automático da Taxa SELIC, IPCA e Dólar PTAX para contextualizar seus rendimentos.

## 🏗️ Arquitetura

Este é um monorepo gerenciado com **Turborepo**, contendo:

### Apps
- **`apps/web`**: Frontend Next.js 14 (App Router + Server Components).
- **`apps/api`**: Backend FastAPI (Python 3.10+ com AsyncIO).

## 🚀 Tecnologias

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Linguagem**: TypeScript
- **Estilização**: Tailwind CSS + Shadcn/ui
- **Estado**: React Query + Zustand
- **Visualização**: Recharts

### Backend
- **Framework**: FastAPI (Python)
- **Database**: PostgreSQL (via Supabase) / SQLAlchemy
- **AI Engine**: Google Gemini 2.0 Flash
- **Task Runner**: AsyncIO (High Performance Parallel Fetching)

## 📊 Fontes de Dados

O sistema utiliza uma arquitetura resiliente de múltiplas fontes para garantir a precisão dos dados:

### 1. Dados de Mercado (Ações e FIIs)
- **Fonte Primária**: **[Brapi.dev](https://brapi.dev)**
    - Cotações em tempo real (B3).
    - Indicadores fundamentalistas (P/L, P/VP, Dividend Yield).
    - Histórico de dividendos.
- **Fonte Secundária (Fallback)**: **Yahoo Finance (`yfinance`)**
    - Ativado automaticamente caso a fonte primária falhe.
    - Garante continuidade do serviço mesmo em instabilidades.

### 2. Dados Macroeconômicos
- **Fonte**: **Banco Central do Brasil (BCB SGS)**
    - Taxa SELIC Meta.
    - IPCA (Inflação oficial acumulada 12 meses).
    - Dólar PTAX (Venda).

### 3. Inteligência Artificial
- **Modelo**: **Google Gemini 2.0 Flash**
    - Processa os dados quantitativos da carteira e do mercado.
    - Gera análises qualitativas, resumos em linguagem natural e recomendações estratégicas.

### 4. Dados do Usuário
- **Armazenamento**: **Supabase (PostgreSQL)**
    - Posições, transações e histórico do usuário.
    - Segurança com RLS (Row Level Security).

## 📦 Instalação

```bash
# 1. Instalar dependências do projeto (Node.js)
npm install

# 2. Configurar variáveis de ambiente
# Copie os arquivos .env.example para .env em apps/web e apps/api

# 3. Configurar ambiente Python (Backend)
cd apps/api
python -m venv venv
source venv/bin/activate  # Linux/Mac
# ou .\venv\Scripts\activate no Windows
pip install -r requirements.txt
```

## 🔧 Executando o Projeto

```bash
# Na raiz do projeto, inicie todos os serviços:
npm run dev

# O Frontend estará disponível em: http://localhost:3000
# O Backend estará disponível em: http://localhost:8000
# Documentação da API (Swagger): http://localhost:8000/docs
```

## 📝 Scripts Disponíveis

- `npm run dev` - Inicia desenvolvimento (Web + API).
- `npm run build` - Compila para produção.
- `npm run lint` - Verifica qualidade do código.

## 🏛️ Estrutura do Projeto

```
carteira-inteligente/
├── apps/
│   ├── web/              # Frontend (Next.js)
│   │   ├── src/app/dashboard/report/  # Página do Relatório IA
│   └── api/              # Backend (FastAPI)
│       ├── app/services/
│       │   ├── market_data.py         # Adaptador Híbrido (BrAPI/YFinance)
│       │   ├── report_service.py      # Orquestrador do Relatório
│       │   └── bcb_service.py         # Conector Banco Central
├── packages/             # Bibliotecas compartilhadas
└── turbo.json            # Configuração do Monorepo
```

## 📄 Licença

MIT

## 👥 Autores

Desenvolvido por **Clenio Consultory**.

---
© 2026 Clenio Consultory. Todos os direitos reservados.
