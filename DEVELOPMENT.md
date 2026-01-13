# 💻 Guia de Desenvolvimento Local

## Configuração Inicial

### 1. Clonar Repositório

```bash
git clone https://github.com/seu-usuario/carteira-inteligente.git
cd carteira-inteligente
```

### 2. Instalar Dependências Node.js

```bash
npm install
```

### 3. Configurar Backend Python

```bash
cd apps/api
python -m venv venv

# Linux/Mac
source venv/bin/activate

# Windows
venv\Scripts\activate

pip install -r requirements.txt
```

### 4. Configurar PostgreSQL Local

#### Opção A: Docker (Recomendado)

```bash
docker run --name carteira-postgres \
  -e POSTGRES_USER=carteira_user \
  -e POSTGRES_PASSWORD=carteira_pass \
  -e POSTGRES_DB=carteira_dev \
  -p 5432:5432 \
  -d postgres:15
```

#### Opção B: PostgreSQL Nativo

Instale PostgreSQL e crie o database:

```sql
CREATE DATABASE carteira_dev;
CREATE USER carteira_user WITH PASSWORD 'carteira_pass';
GRANT ALL PRIVILEGES ON DATABASE carteira_dev TO carteira_user;
```

### 5. Configurar Variáveis de Ambiente

#### Backend (.env)

```bash
cd apps/api
cp .env.example .env
```

Edite `apps/api/.env`:

```bash
APP_NAME=Carteira Inteligente API
APP_VERSION=1.0.0
DEBUG=True
ENVIRONMENT=development

DATABASE_URL=postgresql://carteira_user:carteira_pass@localhost:5432/carteira_dev

SECRET_KEY=dev-secret-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

ALLOWED_ORIGINS=http://localhost:3000

CEI_BASE_URL=https://cei.b3.com.br
```

#### Frontend (.env.local)

```bash
cd apps/web
cp .env.example .env.local
```

Edite `apps/web/.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 6. Executar Migrações

```bash
cd apps/api
alembic upgrade head
```

### 7. Iniciar Servidores

#### Terminal 1 - Backend

```bash
cd apps/api
source venv/bin/activate
uvicorn main:app --reload --port 8000
```

Acesse: http://localhost:8000/docs

#### Terminal 2 - Frontend

```bash
cd apps/web
npm run dev
```

Acesse: http://localhost:3000

---

## Comandos Úteis

### Backend

```bash
# Criar nova migração
alembic revision --autogenerate -m "descrição"

# Executar migrações
alembic upgrade head

# Reverter migração
alembic downgrade -1

# Linting
flake8 app/
black app/
mypy app/

# Testes
pytest
pytest --cov=app
```

### Frontend

```bash
# Desenvolvimento
npm run dev

# Build de produção
npm run build

# Linting
npm run lint

# Testes
npm run test
```

### Monorepo

```bash
# Executar em todos os projetos
npm run dev
npm run lint
npm run build
```

---

## Estrutura de Desenvolvimento

```
carteira-inteligente/
├── apps/
│   ├── web/              # Frontend Next.js
│   └── api/              # Backend FastAPI
├── packages/             # Pacotes compartilhados (futuro)
├── .github/              # CI/CD workflows
├── prd.md                # Product Requirements Document
├── DEPLOYMENT.md         # Guia de deploy
└── DEVELOPMENT.md        # Este arquivo
```

---

## Workflow Git

### Branches

- `main` - Produção
- `develop` - Desenvolvimento
- `feature/*` - Novas funcionalidades
- `bugfix/*` - Correções

### Commits Convencionais

```
feat: adiciona autenticação JWT
fix: corrige erro no login
docs: atualiza README
style: formata código com black
refactor: refatora serviço de auth
test: adiciona testes para user model
chore: atualiza dependências
```

### Pull Requests

1. Crie uma branch a partir de `develop`
2. Implemente a funcionalidade
3. Execute testes e linting
4. Abra PR para `develop`
5. Aguarde revisão e CI passar
6. Merge após aprovação

---

## Debugging

### Backend (VSCode)

Crie `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "FastAPI",
      "type": "python",
      "request": "launch",
      "module": "uvicorn",
      "args": ["main:app", "--reload"],
      "cwd": "${workspaceFolder}/apps/api",
      "envFile": "${workspaceFolder}/apps/api/.env"
    }
  ]
}
```

### Frontend (VSCode)

Crie `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Next.js",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "cwd": "${workspaceFolder}/apps/web",
      "console": "integratedTerminal"
    }
  ]
}
```

---

## Próximos Passos

Após configuração local:
1. ✅ Testar criação de conta
2. ✅ Testar login
3. ✅ Acessar dashboard
4. ⏳ Implementar Épico 2 (Consolidação)

