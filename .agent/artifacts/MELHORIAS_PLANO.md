# Plano de Melhorias - Carteira Inteligente

## Fase 1: Quick Wins (Hoje/Amanhã)
- [x] ~~Corrigir fallback de preços genéricos~~
- [x] ~~Aumentar delay do Brapi para evitar rate limit~~
- [x] **Gráfico de Alocação por Tipo** (Pizza: Ações, FIIs, RF) ✅
- [ ] **Atualização automática de preços** (Cron job diário)

## Fase 2: Proventos (2-3 dias)
- [x] **API de proventos** (CRUD + Summary) ✅
- [x] **Tela de cadastro de proventos** ✅
- [x] **Dashboard de proventos recebidos** (tabela + cards) ✅
- [ ] **Yield on Cost** (dividendo / preço médio Ativos)

## Fase 3: Comparação com Benchmarks (2 dias)
- [x] **API de Benchmarks** (IBOV, CDI, SELIC) ✅
- [x] **Componente de Comparação no Dashboard** ✅
- [x] **Alpha vs IBOV** (carteira vs índice) ✅

## Fase 4: Relatórios (2-3 dias)
- [x] **Exportar posições para CSV** ✅
- [x] **Exportar transações para CSV** ✅
- [x] **Exportar proventos para CSV** ✅
- [ ] **Relatório para IR** (posição em 31/12)

## Fase 5: Alertas (2 dias)
- [ ] **5.1 Tabela de alertas de preço**
- [ ] **5.2 Verificação automática**
- [ ] **5.3 Notificações (email ou push)**

---

## 🆕 Fase 6: Calculadora Preço Teto Barsi (NOVO!)
- [x] **Serviço de cálculo Barsi** (dividendos / 6%) ✅
- [x] **API endpoint /market/barsi/{ticker}** ✅
- [x] **Página frontend com busca e resultados** ✅
- [x] **Histórico de dividendos por ano** ✅
- [x] **Recomendação de compra/venda** ✅
- [ ] **Análise em lote da carteira**
- [ ] **Integração com API Bacen SGS para CDI/SELIC reais**

---

## Prioridade de Execução:
1. ✅ Gráfico de Alocação (visual, impacto imediato)
2. ✅ Proventos (funcionalidade core)
3. ✅ Benchmarks (análise)
4. ✅ Exportar CSV (praticidade)
5. ✅ **Calculadora Preço Teto Barsi** (diferencial competitivo!)
6. Alertas (nice to have)
