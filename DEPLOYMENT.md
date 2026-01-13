# 🚀 Guia de Deploy - Carteira Inteligente

## Índice
1. [Pré-requisitos](#pré-requisitos)
2. [Deploy do Frontend (Vercel)](#deploy-do-frontend-vercel)
3. [Deploy do Backend (Render)](#deploy-do-backend-render)
4. [Deploy do Banco de Dados (Render PostgreSQL)](#deploy-do-banco-de-dados-render-postgresql)
5. [Variáveis de Ambiente](#variáveis-de-ambiente)
6. [Monitoramento e Logs](#monitoramento-e-logs)

---

## Pré-requisitos

- Conta no [GitHub](https://github.com)
- Conta no [Vercel](https://vercel.com)
- Conta no [Render](https://render.com)
- Git instalado localmente

---

## Deploy do Frontend (Vercel)

### 1. Conectar Repositório

1. Acesse [Vercel Dashboard](https://vercel.com/dashboard)
2. Clique em **"New Project"**
3. Importe seu repositório do GitHub
4. Selecione o projeto `carteira-inteligente`

### 2. Configurar Build

```yaml
Framework Preset: Next.js
Root Directory: apps/web
Build Command: npm run build
Output Directory: .next
Install Command: npm install
```

### 3. Configurar Variáveis de Ambiente

```bash
NEXT_PUBLIC_API_URL=https://sua-api.onrender.com
```

### 4. Deploy

- Clique em **"Deploy"**
- Aguarde o build e deploy automático
- Sua aplicação estará disponível em `https://seu-projeto.vercel.app`

### 5. Configurar Domínio Personalizado (Opcional)

1. Vá em **Settings** > **Domains**
2. Adicione seu domínio personalizado
3. Configure DNS conforme instruções

---

## Deploy do Banco de Dados (Render PostgreSQL)

### 1. Criar Database

1. Acesse [Render Dashboard](https://dashboard.render.com)
2. Clique em **"New +"** > **"PostgreSQL"**
3. Configure:
   - **Name**: `carteira-inteligente-db`
   - **Database**: `carteira_db`
   - **User**: `carteira_user`
   - **Region**: `Oregon (US West)` ou mais próximo
   - **Plan**: `Free` (para desenvolvimento) ou `Starter` (produção)

4. Clique em **"Create Database"**
5. **Importante**: Copie a **Internal Database URL** (será usada no backend)

### 2. Verificar Conexão

```bash
# Conectar via psql
psql <INTERNAL_DATABASE_URL>

# Ou use a ferramenta de query do Render Dashboard
```

---

## Deploy do Backend (Render)

### 1. Criar Web Service

1. Acesse [Render Dashboard](https://dashboard.render.com)
2. Clique em **"New +"** > **"Web Service"**
3. Conecte seu repositório do GitHub
4. Configure:

```yaml
Name: carteira-inteligente-api
Region: Oregon (US West)
Branch: main
Root Directory: apps/api
Runtime: Python 3
```

### 2. Configurar Build & Start Commands

```bash
# Build Command
pip install -r requirements.txt

# Start Command
alembic upgrade head && uvicorn main:app --host 0.0.0.0 --port $PORT
```

> ⚠️ **Importante**: O comando `alembic upgrade head` executa as migrações do banco de dados antes de iniciar o servidor. Isso resolve o erro "no such table" mencionado nas suas regras.

### 3. Configurar Variáveis de Ambiente

Na seção **Environment**:

```bash
# Application
APP_NAME=Carteira Inteligente API
APP_VERSION=1.0.0
DEBUG=False
ENVIRONMENT=production

# Database (cole a Internal Database URL do Render PostgreSQL)
DATABASE_URL=<INTERNAL_DATABASE_URL>

# Security (IMPORTANTE: Gere uma chave segura)
SECRET_KEY=<GERAR_CHAVE_SEGURA>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# CORS (adicione o domínio do Vercel)
ALLOWED_ORIGINS=https://seu-projeto.vercel.app,https://seu-dominio.com
```

### 4. Gerar SECRET_KEY Segura

```python
# Execute localmente:
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

### 5. Deploy

1. Clique em **"Create Web Service"**
2. O Render irá:
   - Instalar dependências
   - Executar migrações
   - Iniciar o servidor
3. Aguarde o deploy (pode levar alguns minutos)
4. Sua API estará disponível em `https://carteira-inteligente-api.onrender.com`

### 6. Testar a API

```bash
# Health check
curl https://sua-api.onrender.com/health

# Documentação interativa
https://sua-api.onrender.com/docs
```

---

## Variáveis de Ambiente

### Frontend (Vercel)

```bash
NEXT_PUBLIC_API_URL=https://sua-api.onrender.com
```

### Backend (Render)

```bash
# Application
APP_NAME=Carteira Inteligente API
APP_VERSION=1.0.0
DEBUG=False
ENVIRONMENT=production

# Database
DATABASE_URL=postgresql://user:pass@host:5432/database

# Security
SECRET_KEY=<SUA_CHAVE_SEGURA_AQUI>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# CORS
ALLOWED_ORIGINS=https://seu-frontend.vercel.app

# CEI (opcional - para próximos épicos)
CEI_BASE_URL=https://cei.b3.com.br
```

---

## Monitoramento e Logs

### Vercel

1. **Logs**: Dashboard > Seu Projeto > Deployments > Ver logs
2. **Analytics**: Dashboard > Analytics
3. **Métricas**: Core Web Vitals, Performance

### Render

1. **Logs**: Dashboard > Seu Serviço > Logs (real-time)
2. **Métricas**: Dashboard > Metrics (CPU, RAM, Requests)
3. **Health Checks**: Configurado automaticamente

### Alertas

Configure alertas no Render:
- CPU > 80%
- Memória > 80%
- Downtime > 1 minuto

---

## Troubleshooting

### Erro "no such table: auth_user"

**Causa**: Migrações não foram executadas.

**Solução**:
1. Verifique se o Start Command inclui `alembic upgrade head`
2. Corrija para: `alembic upgrade head && uvicorn main:app --host 0.0.0.0 --port $PORT`
3. Faça um novo deploy

### Erro de CORS

**Causa**: Frontend não está nos ALLOWED_ORIGINS.

**Solução**:
1. Adicione o domínio do Vercel em ALLOWED_ORIGINS
2. Formato: `https://seu-projeto.vercel.app`
3. Redeploy o backend

### Database Connection Failed

**Causa**: DATABASE_URL incorreta.

**Solução**:
1. Use a **Internal Database URL** do Render (não External)
2. Verifique se o database está no mesmo region do backend
3. Teste a conexão via psql

---

## Checklist de Deploy

- [ ] Criar database no Render PostgreSQL
- [ ] Copiar Internal Database URL
- [ ] Criar web service no Render
- [ ] Configurar variáveis de ambiente do backend
- [ ] Gerar SECRET_KEY segura
- [ ] Deploy do backend
- [ ] Testar endpoint /health
- [ ] Conectar repositório no Vercel
- [ ] Configurar variáveis de ambiente do frontend
- [ ] Deploy do frontend
- [ ] Testar fluxo de registro
- [ ] Testar fluxo de login
- [ ] Configurar domínio personalizado (opcional)
- [ ] Configurar alertas de monitoramento

---

## Próximos Passos

Após o deploy do Épico 1:
- ✅ Autenticação funcionando
- ⏳ Implementar Épico 2 (Consolidação de Carteira)
- ⏳ Implementar Épico 3 (Notificações)

