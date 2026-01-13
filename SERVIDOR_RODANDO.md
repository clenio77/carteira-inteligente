# 🚀 Servidor Rodando!

## ✅ Status dos Servidores

### Backend (FastAPI)
- **URL**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **Health Check**: http://localhost:8000/health
- **Status**: ✅ ONLINE

### Frontend (Next.js)
- **URL**: http://localhost:3000
- **Status**: ✅ ONLINE

---

## 📱 Como Usar

### 1. Acesse o Frontend
Abra seu navegador em: **http://localhost:3000**

### 2. Crie uma Conta
1. Clique em "Começar Grátis" ou "Criar Conta"
2. Acesse `/register`
3. Preencha email e senha (mínimo 8 caracteres)
4. Clique em "Criar Conta"

### 3. Faça Login
1. Após criar a conta, você será redirecionado para `/login`
2. Entre com suas credenciais
3. Você será levado ao dashboard

### 4. Conecte ao CEI (Mock)
1. No dashboard, clique em "Conectar ao CEI"
2. Use qualquer CPF com 11 dígitos (ex: 12345678901)
3. Use qualquer senha
4. Clique em "Conectar e Sincronizar"
5. O sistema irá gerar dados mockados automaticamente!

### 5. Explore Sua Carteira
- **Dashboard**: Veja valor total, lucro/prejuízo, alocações
- **Lista de Ativos**: Clique em "Ver Todos os Ativos"
- **Detalhe do Ativo**: Clique em qualquer ativo para ver transações e proventos

---

## 🔧 Configuração Atual

### Banco de Dados
- **Tipo**: SQLite (arquivo local)
- **Localização**: `apps/api/carteira_dev.db`
- **Tabelas**: 6 tabelas criadas
  - users
  - assets
  - asset_positions
  - transactions
  - proceeds
  - cei_credentials

### Autenticação
- **Método**: JWT (JSON Web Tokens)
- **Expiração**: 30 minutos
- **Storage**: localStorage (frontend)

### CEI Integration
- **Tipo**: MOCK (demonstração)
- **Dados**: Gerados automaticamente
- **Ativos Mock**: 
  - PETR4 (Petrobras)
  - VALE3 (Vale)
  - ITUB4 (Itaú)
  - BBDC4 (Bradesco)
  - ABEV3 (Ambev)
  - BBAS3 (Banco do Brasil)
  - HGLG11 (FII Logística)
  - MXRF11 (FII Maxi Renda)
  - IVVB11 (ETF S&P 500)

---

## 📊 Endpoints API Disponíveis

### Autenticação
- `POST /auth/register` - Criar conta
- `POST /auth/login` - Fazer login
- `GET /auth/me` - Informações do usuário

### CEI
- `POST /cei/connect` - Conectar ao CEI
- `POST /cei/sync` - Sincronizar carteira
- `GET /cei/status` - Status da conexão

### Portfolio
- `GET /portfolio/overview` - Visão geral da carteira
- `GET /portfolio/assets` - Lista de ativos
- `GET /portfolio/assets/{ticker}` - Detalhe de um ativo

### Health
- `GET /health` - Status da API

---

## 🛑 Para Parar os Servidores

### Opção 1: Pelo Terminal
Pressione `Ctrl+C` em cada terminal onde os servidores estão rodando.

### Opção 2: Via Comando
```bash
# Parar todos os processos Node
pkill -f "next dev"

# Parar todos os processos Python (uvicorn)
pkill -f "uvicorn"
```

---

## 🔄 Para Reiniciar

### Backend
```bash
cd apps/api
source venv/bin/activate
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd apps/web
npm run dev
```

---

## 📝 Dados de Teste

### Usuário de Teste
Você pode criar qualquer usuário, por exemplo:
- **Email**: teste@exemplo.com
- **Senha**: senha12345

### CEI Mock
Qualquer CPF funciona, por exemplo:
- **CPF**: 123.456.789-01 (ou sem formatação)
- **Senha**: qualquer coisa

Os dados da carteira serão gerados automaticamente com:
- 2-4 transações por ativo
- Preços aleatórios
- Proventos (dividendos/JCP)
- Performance calculada automaticamente

---

## 🐛 Troubleshooting

### Erro: "Connection refused"
**Problema**: Servidor não está rodando  
**Solução**: Inicie o servidor conforme instruções acima

### Erro: "CORS error"
**Problema**: Frontend não consegue se comunicar com backend  
**Solução**: Verifique se ambos servidores estão rodando nas portas corretas

### Erro: "Token expired"
**Problema**: JWT expirou (30 min)  
**Solução**: Faça login novamente

### Página em branco
**Problema**: Erro no frontend  
**Solução**: Verifique o console do navegador (F12)

---

## 📊 Monitoramento

### Ver Logs Backend
Terminal onde iniciou o backend mostrará:
- Requisições HTTP
- Erros
- Logs de sincronização

### Ver Logs Frontend
Terminal onde iniciou o frontend mostrará:
- Compilação de páginas
- Erros de build
- Hot reload events

### Ver Logs no Navegador
Abra DevTools (F12) → Console para ver:
- Erros JavaScript
- Requisições de API
- Estado da aplicação

---

## 🎉 Próximos Passos

1. ✅ Explore a interface
2. ✅ Teste o fluxo completo (registro → login → CEI → dashboard)
3. ✅ Veja diferentes ativos e seus detalhes
4. ✅ Analise transações e proventos
5. 📖 Leia a documentação em `/PROXIMOS_PASSOS.md`

---

## ⚠️ Lembre-se

- **Dados são MOCKADOS**: Não são dados reais do CEI
- **SQLite local**: Dados serão perdidos se deletar o arquivo `.db`
- **Desenvolvimento**: Esta é uma configuração de desenvolvimento, não produção

---

**Aproveite o sistema!** 🚀

Se tiver dúvidas, consulte:
- 📖 QUICKSTART.md
- 📖 PROXIMOS_PASSOS.md
- 📖 PROJECT_COMPLETE_SUMMARY.md
- 🌐 http://localhost:8000/docs (API Docs)

---

**Status**: ✅ Tudo funcionando!  
**Data**: $(date)

