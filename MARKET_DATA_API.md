# 📈 API de Dados de Mercado (brapi.dev)

Este documento descreve as rotas de dados de mercado disponíveis na API do Carteira Inteligente.

## 🔗 Base URL

```
http://localhost:8000/market
```

## 🔐 Autenticação

Todas as rotas (exceto `/market/free-stocks`) requerem autenticação JWT.

```bash
Authorization: Bearer <seu-token-jwt>
```

---

## Endpoints

### `GET /market/free-stocks`

Retorna informações sobre ações disponíveis gratuitamente (sem token brapi.dev).

**Autenticação**: Não requer

**Resposta**:
```json
{
    "message": "The following stocks are available without a BRAPI token",
    "free_stocks": ["PETR4", "VALE3", "ITUB4", "MGLU3"],
    "note": "For access to all 4000+ stocks, get a free token at https://brapi.dev/dashboard"
}
```

---

### `GET /market/quote/{ticker}`

Obtém cotação atual de uma ação.

**Parâmetros**:
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `ticker` | path | Código da ação (ex: PETR4) |
| `fundamental` | query | Incluir dados fundamentalistas (default: false) |
| `dividends` | query | Incluir histórico de dividendos (default: false) |

**Exemplo**:
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/market/quote/PETR4?fundamental=true"
```

**Resposta**:
```json
{
    "ticker": "PETR4",
    "name": "PETROBRAS PN",
    "full_name": "Petróleo Brasileiro S.A. - Petrobras",
    "currency": "BRL",
    "price": 30.20,
    "previous_close": 29.83,
    "open": 29.90,
    "high": 30.45,
    "low": 29.80,
    "volume": 45678901,
    "change": 0.37,
    "change_percent": 1.24,
    "market_cap": 393000000000,
    "updated_at": "2026-01-08T20:00:00.000Z",
    "logo_url": "https://icons.brapi.dev/logos/PETR4.png",
    "pe_ratio": 5.5,
    "eps": 5.49,
    "dividend_yield": 12.5
}
```

---

### `GET /market/quotes`

Obtém cotações de múltiplas ações de uma vez.

**Parâmetros**:
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `tickers` | query | Lista de tickers separados por vírgula (máx: 20) |
| `fundamental` | query | Incluir dados fundamentalistas (default: false) |

**Exemplo**:
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/market/quotes?tickers=PETR4,VALE3,ITUB4"
```

**Resposta**:
```json
{
    "success": true,
    "count": 3,
    "quotes": [
        {"ticker": "PETR4", "name": "PETROBRAS PN", "price": 30.20, ...},
        {"ticker": "VALE3", "name": "VALE ON", "price": 58.50, ...},
        {"ticker": "ITUB4", "name": "ITAU UNIBANCO PN", "price": 32.80, ...}
    ]
}
```

---

### `GET /market/historical/{ticker}`

Obtém histórico de preços de uma ação.

**Parâmetros**:
| Parâmetro | Tipo | Valores | Descrição |
|-----------|------|---------|-----------|
| `ticker` | path | - | Código da ação |
| `range` | query | 1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, max | Período (default: 1mo) |
| `interval` | query | 1d, 1wk, 1mo | Intervalo dos dados (default: 1d) |

**Nota**: No plano gratuito da brapi.dev, o histórico é limitado a 3 meses.

**Exemplo**:
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/market/historical/PETR4?range=1mo&interval=1d"
```

**Resposta**:
```json
{
    "success": true,
    "ticker": "PETR4",
    "data": [
        {"date": 1704672000, "open": 29.50, "high": 30.00, "low": 29.20, "close": 29.80, "volume": 40000000},
        {"date": 1704758400, "open": 29.80, "high": 30.20, "low": 29.60, "close": 30.10, "volume": 38000000},
        ...
    ]
}
```

---

### `GET /market/search`

Pesquisa ações por nome ou ticker.

**Parâmetros**:
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `q` | query | Termo de busca (mínimo 2 caracteres) |

**Exemplo**:
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/market/search?q=petro"
```

**Resposta**:
```json
{
    "success": true,
    "count": 5,
    "results": [
        {"stock": "PETR4", "name": "PETROBRAS PN", "close": 30.20, ...},
        {"stock": "PETR3", "name": "PETROBRAS ON", "close": 33.50, ...},
        ...
    ]
}
```

---

### `GET /market/check/{ticker}`

Verifica se uma ação está disponível no tier gratuito.

**Exemplo**:
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/market/check/PETR4"
```

**Resposta**:
```json
{
    "ticker": "PETR4",
    "is_free": true,
    "message": "This stock is available without a token"
}
```

---

## 🔧 Configuração

### Variáveis de Ambiente

```bash
# Token da brapi.dev (opcional)
# Sem token: apenas PETR4, VALE3, ITUB4, MGLU3 disponíveis
# Com token gratuito: acesso a +4.000 ativos
BRAPI_TOKEN=seu-token-aqui
```

### Obter Token Gratuito

1. Acesse [brapi.dev/dashboard](https://brapi.dev/dashboard)
2. Crie uma conta gratuita
3. Copie seu token da seção "Chaves de API"
4. Configure no arquivo `.env`

### Limites do Plano Gratuito

| Recurso | Limite |
|---------|--------|
| Requisições | 15.000/mês |
| Ativos por request | 1 |
| Histórico | 3 meses |
| Delay | 30 minutos |

---

## 📊 Tipos de Ativos Suportados

- **Ações** (PETR4, VALE3, etc.)
- **FIIs** - Fundos Imobiliários (HGLG11, MXRF11, etc.)
- **ETFs** (IVVB11, BOVA11, etc.)
- **BDRs** (AAPL34, GOOGL34, etc.)

---

## 🧪 Testando a API

```bash
# 1. Primeiro, faça login para obter o token JWT
TOKEN=$(curl -s -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"seu@email.com","password":"suasenha"}' | jq -r '.access_token')

# 2. Consulte uma ação gratuita
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/market/quote/PETR4"

# 3. Veja o histórico
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/market/historical/PETR4?range=1mo"
```

---

**Documentação completa da brapi.dev**: https://brapi.dev/docs
