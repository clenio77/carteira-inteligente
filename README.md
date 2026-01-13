# 💼 Carteira Inteligente

> Plataforma unificada para consolidar e analisar carteiras de investimentos brasileiros

## 📖 Sobre

O **Carteira Inteligente** é uma solução "conectar e esquecer" que centraliza todas as informações relevantes (posições, transações, proventos) de forma segura e fidedigna, diretamente da fonte oficial (CEI da B3).

## 🏗️ Arquitetura

Este é um monorepo gerenciado com **Turborepo**, contendo:

### Apps
- **`apps/web`**: Frontend Next.js (React + TypeScript + Tailwind CSS)
- **`apps/api`**: Backend FastAPI (Python)

### Packages
- **`packages/shared`**: Tipos TypeScript compartilhados
- **`packages/ui`**: Componentes React reutilizáveis

## 🚀 Tecnologias

### Frontend
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Shadcn/ui
- React Query
- Zustand

### Backend
- FastAPI
- SQLAlchemy
- Alembic (migrations)
- PostgreSQL
- JWT Authentication
- bcrypt
- **brapi.dev** (Dados de mercado em tempo real)

### DevOps
- Vercel (Frontend)
- Render (Backend + Database)
- GitHub Actions (CI/CD)

## 📈 Dados de Mercado (brapi.dev)

O projeto integra com a **[brapi.dev](https://brapi.dev)** para obter dados reais do mercado brasileiro:

- ✅ Cotações em tempo real (15-30 min delay)
- ✅ Histórico de preços (até 10 anos no plano Pro)
- ✅ Dividendos e proventos
- ✅ Dados fundamentalistas (P/L, P/VP, etc.)
- ✅ +4.000 ativos (Ações, FIIs, ETFs, BDRs)

### Ações Gratuitas (sem token)

Para desenvolvimento e testes, estas ações estão disponíveis sem configurar token:
- **PETR4** (Petrobras)
- **VALE3** (Vale)
- **ITUB4** (Itaú)
- **MGLU3** (Magazine Luiza)

### Configurar Token (opcional)

Para acessar todos os +4.000 ativos, obtenha um token gratuito em [brapi.dev/dashboard](https://brapi.dev/dashboard) e configure no `.env`:

```bash
BRAPI_TOKEN=seu-token-aqui
```

## 📦 Instalação

```bash
# Instalar dependências do Node.js
npm install

# Configurar ambiente Python (backend)
cd apps/api
python -m venv venv
source venv/bin/activate  # Linux/Mac
pip install -r requirements.txt
```

## 🔧 Desenvolvimento

```bash
# Executar todos os serviços
npm run dev

# Executar apenas o frontend
cd apps/web && npm run dev

# Executar apenas o backend
cd apps/api && source venv/bin/activate && uvicorn main:app --reload
```

## 📝 Scripts Disponíveis

- `npm run dev` - Inicia todos os serviços em modo desenvolvimento
- `npm run build` - Compila todos os projetos
- `npm run lint` - Executa linting em todos os projetos
- `npm run test` - Executa testes em todos os projetos
- `npm run format` - Formata código com Prettier

## 🏛️ Estrutura do Projeto

```
carteira-inteligente/
├── apps/
│   ├── web/              # Frontend Next.js
│   │   ├── src/
│   │   │   ├── app/      # App Router
│   │   │   ├── components/
│   │   │   ├── lib/
│   │   │   └── styles/
│   │   └── package.json
│   └── api/              # Backend FastAPI
│       ├── app/
│       │   ├── models/
│       │   ├── routes/
│       │   ├── services/
│       │   └── core/
│       ├── alembic/
│       ├── requirements.txt
│       └── main.py
├── packages/
│   ├── shared/           # Tipos compartilhados
│   └── ui/               # Componentes UI
├── turbo.json
└── package.json
```

## 📄 Licença

MIT

## 👥 Autores

Desenvolvido seguindo o PRD v1.5 por John (PM)

