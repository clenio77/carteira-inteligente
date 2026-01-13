# ⚡ Início Rápido - Carteira Inteligente

Rode o projeto em **5 minutos**!

---

## 📋 Pré-requisitos

```bash
# Verifique se tem instalado:
node --version    # v18+
python --version  # 3.11+
git --version     # qualquer versão
```

---

## 🚀 Setup Rápido (Desenvolvimento Local)

### 1️⃣ Clone e Instale

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/carteira-inteligente.git
cd carteira-inteligente

# Instale dependências Node.js
npm install

# Instale dependências Python
cd apps/api
python -m venv venv
source venv/bin/activate  # Linux/Mac
# ou
venv\Scripts\activate     # Windows
pip install -r requirements.txt
cd ../..
```

### 2️⃣ Configure o Banco de Dados

**Opção A: Docker (Recomendado)**

```bash
docker run --name carteira-postgres \
  -e POSTGRES_USER=carteira_user \
  -e POSTGRES_PASSWORD=carteira_pass \
  -e POSTGRES_DB=carteira_dev \
  -p 5432:5432 \
  -d postgres:15
```

**Opção B: PostgreSQL Local**

```sql
CREATE DATABASE carteira_dev;
CREATE USER carteira_user WITH PASSWORD 'carteira_pass';
GRANT ALL PRIVILEGES ON DATABASE carteira_dev TO carteira_user;
```

### 3️⃣ Configure as Variáveis de Ambiente

```bash
# Backend
cd apps/api
cat > .env << EOF
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
EOF

# Frontend
cd ../web
cat > .env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:8000
EOF

cd ../..
```

### 4️⃣ Execute as Migrações

```bash
cd apps/api
source venv/bin/activate  # ou venv\Scripts\activate no Windows
alembic upgrade head
cd ../..
```

### 5️⃣ Inicie os Servidores

**Terminal 1 - Backend:**

```bash
cd apps/api
source venv/bin/activate
uvicorn main:app --reload --port 8000
```

**Terminal 2 - Frontend:**

```bash
cd apps/web
npm run dev
```

### 6️⃣ Acesse a Aplicação

```
Frontend:  http://localhost:3000
Backend:   http://localhost:8000
API Docs:  http://localhost:8000/docs
```

---

## ✅ Teste se Está Funcionando

### 1. Teste o Backend

```bash
curl http://localhost:8000/health
# Deve retornar: {"status":"healthy",...}
```

### 2. Teste o Frontend

Abra http://localhost:3000 - deve ver a landing page

### 3. Teste o Fluxo Completo

1. Acesse http://localhost:3000/register
2. Crie uma conta com email e senha
3. Faça login em http://localhost:3000/login
4. Você deve ser redirecionado para http://localhost:3000/dashboard

**🎉 Sucesso!** Você está rodando a Carteira Inteligente localmente!

---

## 🧪 Execute os Testes

```bash
# Backend
cd apps/api
source venv/bin/activate
pytest

# Deve passar 10/10 testes
```

---

## 🐛 Problemas Comuns

### Erro: "no such table: users"

**Solução**: Execute as migrações

```bash
cd apps/api
alembic upgrade head
```

### Erro: "connection refused" (PostgreSQL)

**Solução**: Verifique se o PostgreSQL está rodando

```bash
docker ps  # Deve mostrar container carteira-postgres
# ou
pg_isready  # Se PostgreSQL nativo
```

### Erro: "CORS policy"

**Solução**: Verifique se ALLOWED_ORIGINS está correto em `.env`

```bash
ALLOWED_ORIGINS=http://localhost:3000
```

### Erro: "Module not found" (Python)

**Solução**: Ative o venv e reinstale

```bash
cd apps/api
source venv/bin/activate
pip install -r requirements.txt
```

---

## 📚 Próximos Passos

1. ✅ Projeto rodando localmente
2. 📖 Leia o [README.md](README.md) para visão geral
3. 🚀 Leia o [DEPLOYMENT.md](DEPLOYMENT.md) para deploy em produção
4. 💻 Leia o [DEVELOPMENT.md](DEVELOPMENT.md) para desenvolvimento
5. 📊 Leia o [SUMMARY.md](SUMMARY.md) para entender o que foi implementado

---

## 🆘 Precisa de Ajuda?

- 📖 Documentação completa: `README.md`
- 🐛 Issues: GitHub Issues
- 💬 Discussões: GitHub Discussions

---

**Desenvolvido com ❤️ usando Next.js + FastAPI**

