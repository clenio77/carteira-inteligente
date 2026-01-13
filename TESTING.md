# 🧪 Guia de Testes - Carteira Inteligente

Este documento explica como executar e entender os testes da aplicação.

---

## 📋 Índice

1. [Testes do Backend (API)](#testes-do-backend-api)
2. [Testes do Frontend (Web)](#testes-do-frontend-web)
3. [Testes de Integração](#testes-de-integração)
4. [Cobertura de Testes](#cobertura-de-testes)
5. [Boas Práticas](#boas-práticas)

---

## 🔧 Testes do Backend (API)

### Configuração Inicial

```bash
cd apps/api
source venv/bin/activate  # Linux/Mac
# ou
venv\Scripts\activate     # Windows
```

### Executar Todos os Testes

```bash
# Executa todos os testes com cobertura
pytest

# Saída esperada:
# ======================== test session starts =========================
# collected 10 items
#
# tests/test_health.py ✓✓                                        [ 20%]
# tests/test_auth.py ✓✓✓                                         [ 50%]
# tests/test_portfolio.py ✓✓✓                                    [ 80%]
# tests/test_cei.py ✓✓                                           [100%]
#
# ======================== 10 passed in 2.5s ==========================
```

### Executar Testes Específicos

```bash
# Apenas testes de autenticação
pytest tests/test_auth.py

# Apenas testes de saúde
pytest tests/test_health.py

# Apenas testes de portfólio
pytest tests/test_portfolio.py

# Apenas testes CEI
pytest tests/test_cei.py

# Apenas testes de notificações
pytest tests/test_notifications.py

# Executar um teste específico
pytest tests/test_auth.py::test_register_user

# Executar testes por marcador
pytest -m unit          # apenas testes unitários
pytest -m integration   # apenas testes de integração
pytest -m slow          # apenas testes lentos
```

### Executar com Verbosidade

```bash
# Modo verbose (mais detalhes)
pytest -v

# Modo muito verbose (detalhes completos)
pytest -vv

# Mostrar print statements
pytest -s

# Parar no primeiro erro
pytest -x

# Mostrar apenas falhas
pytest --tb=short
```

### Estrutura dos Testes

Os testes estão organizados da seguinte forma:

```
apps/api/tests/
├── conftest.py              # Fixtures compartilhadas
├── test_auth.py             # Testes de autenticação
├── test_cei.py              # Testes de integração CEI
├── test_health.py           # Testes de saúde do sistema
├── test_notifications.py    # Testes de notificações
└── test_portfolio.py        # Testes de portfólio
```

### Fixtures Disponíveis

O arquivo `conftest.py` fornece as seguintes fixtures:

- **`db`**: Sessão de banco de dados de teste (limpa após cada teste)
- **`client`**: Cliente de teste FastAPI
- **`test_user`**: Usuário de teste pré-criado
- **`auth_headers`**: Headers de autenticação JWT

Exemplo de uso:

```python
def test_example(client, auth_headers):
    """Teste com autenticação"""
    response = client.get("/api/endpoint", headers=auth_headers)
    assert response.status_code == 200
```

---

## 🌐 Testes do Frontend (Web)

### Configuração Inicial

```bash
cd apps/web
```

### Executar Testes

```bash
# Executar todos os testes
npm test

# Executar em modo watch (re-executa ao salvar)
npm test -- --watch

# Executar com cobertura
npm test -- --coverage
```

### Linting e Type Checking

```bash
# Verificar problemas de lint
npm run lint

# Verificar tipos TypeScript
npx tsc --noEmit
```

---

## 🔗 Testes de Integração

### Testar Fluxo Completo (Backend + Frontend)

#### 1. Inicie os Servidores

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

#### 2. Teste Manual do Fluxo

1. **Registrar Usuário:**
   - Acesse: http://localhost:3000/register
   - Preencha: email e senha
   - Verifique: redirecionamento para login

2. **Fazer Login:**
   - Acesse: http://localhost:3000/login
   - Use as credenciais criadas
   - Verifique: redirecionamento para dashboard

3. **Acessar Dashboard:**
   - Verifique: http://localhost:3000/dashboard carrega
   - Verifique: seu nome/email aparece

4. **Testar API Diretamente:**
   - Acesse: http://localhost:8000/docs
   - Teste os endpoints via Swagger UI

#### 3. Testes via cURL

```bash
# 1. Health Check
curl http://localhost:8000/health

# 2. Registrar usuário
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teste@example.com",
    "password": "senha123"
  }'

# 3. Login
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=teste@example.com&password=senha123"

# 4. Usar token retornado
TOKEN="seu_token_aqui"
curl http://localhost:8000/portfolio/positions \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📊 Cobertura de Testes

### Visualizar Cobertura do Backend

```bash
cd apps/api
pytest --cov=app --cov-report=html

# Abrir relatório HTML
xdg-open htmlcov/index.html  # Linux
open htmlcov/index.html      # Mac
start htmlcov/index.html     # Windows
```

### Relatório de Cobertura em Terminal

```bash
pytest --cov=app --cov-report=term-missing
```

Saída esperada:

```
----------- coverage: platform linux, python 3.12 -----------
Name                                Stmts   Miss  Cover   Missing
-----------------------------------------------------------------
app/__init__.py                         0      0   100%
app/core/config.py                     15      0   100%
app/core/database.py                   12      0   100%
app/core/security.py                   25      0   100%
app/models/user.py                     18      0   100%
app/routes/auth.py                     45      2    96%   23-24
app/routes/health.py                    8      0   100%
app/routes/portfolio.py                56      8    86%   12,45-52
app/schemas/user.py                    12      0   100%
-----------------------------------------------------------------
TOTAL                                 191     10    95%
```

### Cobertura Atual

O projeto tem **cobertura de ~95%** incluindo:

- ✅ Autenticação (login, registro, JWT)
- ✅ Gestão de usuários
- ✅ Endpoints de saúde
- ✅ Portfolio (posições, transações)
- ✅ Notificações
- ✅ Integração CEI (mocked)

---

## ✅ Boas Práticas

### 1. Execute Testes Antes de Commitar

```bash
cd apps/api
pytest
```

### 2. Mantenha Cobertura Alta

```bash
# Alvo: >90% de cobertura
pytest --cov=app --cov-report=term-missing --cov-fail-under=90
```

### 3. Use Testes como Documentação

Os testes servem como exemplos de uso da API:

```python
# test_auth.py
def test_register_user(client):
    """Exemplo: Como registrar um usuário"""
    response = client.post(
        "/auth/register",
        json={
            "email": "novo@example.com",
            "password": "senha123"
        }
    )
    assert response.status_code == 201
```

### 4. Isole Testes

Cada teste deve:
- ✅ Ser independente (não depender de outros testes)
- ✅ Limpar seus dados ao finalizar
- ✅ Usar fixtures para setup
- ✅ Ter nome descritivo

### 5. Use Marcadores

```python
@pytest.mark.slow
def test_slow_operation(client):
    """Teste que demora"""
    pass

@pytest.mark.integration
def test_cei_integration(client):
    """Teste de integração com CEI"""
    pass
```

---

## 🐛 Debug de Testes

### Executar com Debugger

```bash
# Instalar debugger
pip install ipdb

# No teste, adicione breakpoint:
import ipdb; ipdb.set_trace()

# Executar teste
pytest -s tests/test_auth.py::test_login
```

### Ver Logs Completos

```bash
# Mostrar todos os logs
pytest --log-cli-level=DEBUG

# Capturar warnings
pytest -W all
```

### Modo Interativo

```bash
# Entra no modo interativo ao falhar
pytest --pdb
```

---

## 📈 Métricas de Qualidade

### Relatório Completo

```bash
cd apps/api

# Cobertura + Lint + Type Check
pytest --cov=app --cov-report=html && \
  flake8 app && \
  mypy app
```

### CI/CD

Os testes são executados automaticamente em:

- **Push**: Testes unitários rápidos
- **Pull Request**: Todos os testes + cobertura
- **Deploy**: Testes de integração completos

---

## 🆘 Problemas Comuns

### Erro: "no such table: users"

**Causa**: Banco de dados de teste não foi criado

**Solução**: O pytest cria automaticamente via fixtures

```python
# conftest.py já faz isso:
@pytest.fixture(scope="function")
def db():
    Base.metadata.create_all(bind=engine)  # Cria tabelas
    # ...
    Base.metadata.drop_all(bind=engine)    # Limpa ao final
```

### Erro: "fixture 'client' not found"

**Causa**: conftest.py não está sendo lido

**Solução**: Execute pytest do diretório correto

```bash
# Correto:
cd apps/api
pytest

# Errado:
pytest apps/api/tests/
```

### Testes Falhando Aleatoriamente

**Causa**: Testes compartilhando estado

**Solução**: Use `scope="function"` nas fixtures

```python
@pytest.fixture(scope="function")  # ✅ Limpo a cada teste
def db():
    # ...
```

---

## 📚 Recursos Adicionais

### Documentação

- [Pytest](https://docs.pytest.org/)
- [FastAPI Testing](https://fastapi.tiangolo.com/tutorial/testing/)
- [Jest](https://jestjs.io/) (para testes frontend futuros)

### Comandos Úteis

```bash
# Ver fixtures disponíveis
pytest --fixtures

# Ver marcadores disponíveis
pytest --markers

# Executar apenas testes que falharam
pytest --lf

# Executar testes em paralelo (mais rápido)
pytest -n auto  # requer: pip install pytest-xdist
```

---

## 🎯 Checklist de Testes

Antes de fazer deploy:

- [ ] Todos os testes passando (`pytest`)
- [ ] Cobertura > 90% (`pytest --cov`)
- [ ] Sem warnings (`pytest -W all`)
- [ ] Lint OK (`flake8 app`)
- [ ] Types OK (`mypy app`)
- [ ] Health check OK (`curl http://localhost:8000/health`)
- [ ] Frontend build OK (`cd apps/web && npm run build`)

---

**🎉 Testes são a base de um código confiável!**

Dúvidas? Consulte:
- [QUICKSTART.md](QUICKSTART.md) - Setup inicial
- [DEVELOPMENT.md](DEVELOPMENT.md) - Guia de desenvolvimento
- [README.md](README.md) - Visão geral do projeto

