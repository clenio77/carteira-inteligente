"""
Barsi Price Target Calculator Service

Implementa a metodologia do Luiz Barsi para calcular o Preço Teto de ações.
Fórmula: Preço Teto = Dividendo Médio Anual / Taxa Mínima de Retorno (6%)
"""
import httpx
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class BarsiAnalysis:
    """Resultado da análise Barsi"""
    ticker: str
    current_price: float
    average_annual_dividend: float
    price_target: float  # Preço Teto
    current_yield: float  # Dividend Yield atual
    target_yield: float = 6.0  # Yield mínimo Barsi (6%)
    is_below_target: bool = False  # Se está abaixo do teto (oportunidade)
    upside_to_target: float = 0.0  # % até o teto
    margin_of_safety: float = 0.0  # Margem de segurança
    dividend_history: List[Dict] = None
    years_analyzed: int = 0
    recommendation: str = ""


class BarsiCalculator:
    """
    Calculadora de Preço Teto usando a metodologia Barsi.
    
    A filosofia Barsi:
    - Foco em dividendos consistentes
    - Yield mínimo de 6% ao ano
    - Investir abaixo do Preço Teto
    - Ignorar oscilações de curto prazo
    """
    
    # Taxa mínima de retorno (6% ao ano - benchmark Barsi)
    MINIMUM_YIELD = 0.06
    
    # Anos de histórico para calcular média
    YEARS_HISTORY = 5
    
    @staticmethod
    async def calculate_price_target(ticker: str) -> BarsiAnalysis:
        """
        Calcula o Preço Teto Barsi para uma ação.
        
        Args:
            ticker: Código da ação (ex: PETR4, BBAS3)
            
        Returns:
            BarsiAnalysis com todos os dados da análise
        """
        from app.core.config import settings
        
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                # Buscar dados com dividendos e fundamentalistas
                # range=5y é necessário para buscar histórico de dividendos
                params = {
                    "fundamental": "true",
                    "dividends": "true",
                    "range": "5y",  # Buscar 5 anos de histórico
                    "interval": "1mo"  # Intervalo mensal
                }
                if settings.BRAPI_TOKEN:
                    params["token"] = settings.BRAPI_TOKEN
                
                response = await client.get(
                    f"https://brapi.dev/api/quote/{ticker.upper()}",
                    params=params
                )
                
                if response.status_code != 200:
                    logger.error(f"BrAPI error for {ticker}: {response.status_code}")
                    return BarsiCalculator._create_error_response(ticker, "Erro ao buscar dados da API")
                
                data = response.json()
                results = data.get("results", [])
                
                if not results:
                    return BarsiCalculator._create_error_response(ticker, "Ativo não encontrado")
                
                quote = results[0]
                
                # Log para debug
                logger.info(f"BrAPI response keys for {ticker}: {quote.keys()}")
                
                # Extrair dados
                current_price = quote.get("regularMarketPrice", 0)
                
                # BrAPI pode retornar dividendos em diferentes estruturas
                # Tentar múltiplos formatos
                cash_dividends = []
                
                # Formato 1: dividendsData.cashDividends
                dividends_data = quote.get("dividendsData", {})
                if dividends_data:
                    cash_dividends = dividends_data.get("cashDividends", [])
                    logger.info(f"{ticker}: Found {len(cash_dividends)} dividends in dividendsData.cashDividends")
                
                # Formato 2: cashDividends diretamente
                if not cash_dividends:
                    cash_dividends = quote.get("cashDividends", [])
                    logger.info(f"{ticker}: Found {len(cash_dividends)} dividends in cashDividends")
                
                # Formato 3: historicalDataPrice pode ter dividendos
                if not cash_dividends:
                    historical = quote.get("historicalDataPrice", [])
                    if historical:
                        logger.info(f"{ticker}: Checking historicalDataPrice for dividends")
                
                # Formato 4: summaryProfile.dividendRate (yield atual)
                summary = quote.get("summaryProfile", {}) or quote.get("defaultKeyStatistics", {})
                dividend_rate = quote.get("dividendRate", 0) or summary.get("dividendRate", 0)
                dividend_yield = quote.get("dividendYield", 0) or summary.get("dividendYield", 0)
                
                logger.info(f"{ticker}: dividendRate={dividend_rate}, dividendYield={dividend_yield}")
                
                if not current_price:
                    return BarsiCalculator._create_error_response(ticker, "Cotação não disponível")
                
                # Calcular dividendos por ano
                dividend_by_year = BarsiCalculator._group_dividends_by_year(cash_dividends)
                
                # Se não encontrou histórico mas tem dividendYield, estimar
                if not dividend_by_year and dividend_rate and dividend_rate > 0:
                    current_year = datetime.now().year
                    # Estimar dividendo anual baseado no dividendRate
                    dividend_by_year[current_year - 1] = dividend_rate
                    logger.info(f"{ticker}: Using dividendRate as estimate: R${dividend_rate}")
                
                # Se não tem nada, tentar buscar do dividendYield
                if not dividend_by_year and dividend_yield and dividend_yield > 0:
                    # dividendYield é em %, converter para valor
                    estimated_dividend = (dividend_yield / 100) * current_price
                    current_year = datetime.now().year
                    dividend_by_year[current_year - 1] = estimated_dividend
                    logger.info(f"{ticker}: Estimated from dividendYield ({dividend_yield}%): R${estimated_dividend:.2f}")
                
                # Calcular média anual (últimos N anos)
                avg_annual_dividend = BarsiCalculator._calculate_average_dividend(dividend_by_year)
                
                # Calcular Preço Teto
                if avg_annual_dividend > 0:
                    price_target = avg_annual_dividend / BarsiCalculator.MINIMUM_YIELD
                else:
                    price_target = 0
                
                # Calcular métricas derivadas
                current_yield = (avg_annual_dividend / current_price * 100) if current_price > 0 else 0
                is_below_target = current_price < price_target if price_target > 0 else False
                upside_to_target = ((price_target - current_price) / current_price * 100) if current_price > 0 and price_target > 0 else 0
                margin_of_safety = upside_to_target if is_below_target else 0
                
                # Definir recomendação
                recommendation = BarsiCalculator._get_recommendation(
                    current_price, price_target, current_yield, avg_annual_dividend
                )
                
                return BarsiAnalysis(
                    ticker=ticker.upper(),
                    current_price=round(current_price, 2),
                    average_annual_dividend=round(avg_annual_dividend, 4),
                    price_target=round(price_target, 2),
                    current_yield=round(current_yield, 2),
                    is_below_target=is_below_target,
                    upside_to_target=round(upside_to_target, 2),
                    margin_of_safety=round(margin_of_safety, 2),
                    dividend_history=[
                        {"year": year, "total": round(total, 4)}
                        for year, total in sorted(dividend_by_year.items(), reverse=True)
                    ][:BarsiCalculator.YEARS_HISTORY],
                    years_analyzed=min(len(dividend_by_year), BarsiCalculator.YEARS_HISTORY),
                    recommendation=recommendation
                )
                
        except Exception as e:
            logger.error(f"Error calculating Barsi target for {ticker}: {e}")
            return BarsiCalculator._create_error_response(ticker, str(e))
    
    @staticmethod
    def _group_dividends_by_year(cash_dividends: List[Dict]) -> Dict[int, float]:
        """Agrupa dividendos por ano"""
        dividend_by_year = {}
        current_year = datetime.now().year
        
        for div in cash_dividends:
            try:
                # payment_date format: "2024-05-15 00:00:00" ou similar
                payment_date = div.get("paymentDate", "")
                if payment_date:
                    year = int(payment_date[:4])
                    # Considerar apenas últimos N anos
                    if year >= current_year - BarsiCalculator.YEARS_HISTORY:
                        value = float(div.get("value", 0))
                        dividend_by_year[year] = dividend_by_year.get(year, 0) + value
            except (ValueError, TypeError) as e:
                continue
        
        return dividend_by_year
    
    @staticmethod
    def _calculate_average_dividend(dividend_by_year: Dict[int, float]) -> float:
        """Calcula a média anual de dividendos"""
        if not dividend_by_year:
            return 0
        
        # Pegar últimos N anos com dados
        current_year = datetime.now().year
        years_with_data = [
            year for year in dividend_by_year.keys()
            if year >= current_year - BarsiCalculator.YEARS_HISTORY and year < current_year
        ]
        
        if not years_with_data:
            # Se não tem anos completos, usar o que tem
            total = sum(dividend_by_year.values())
            count = len(dividend_by_year)
            return total / count if count > 0 else 0
        
        total = sum(dividend_by_year.get(year, 0) for year in years_with_data)
        return total / len(years_with_data)
    
    @staticmethod
    def _get_recommendation(
        current_price: float,
        price_target: float,
        current_yield: float,
        avg_dividend: float
    ) -> str:
        """Gera recomendação baseada na análise"""
        
        if avg_dividend <= 0:
            return "❌ Sem histórico de dividendos - Não atende critério Barsi"
        
        if price_target <= 0:
            return "⚠️ Dados insuficientes para calcular Preço Teto"
        
        margin = ((price_target - current_price) / current_price * 100) if current_price > 0 else 0
        
        if margin >= 30:
            return "🟢 FORTE COMPRA - Muito abaixo do Preço Teto (margem > 30%)"
        elif margin >= 15:
            return "🟢 COMPRA - Abaixo do Preço Teto com boa margem"
        elif margin >= 0:
            return "🟡 PERTO DO TETO - Considerar entrada parcial"
        elif margin >= -15:
            return "🟡 ACIMA DO TETO - Aguardar correção"
        else:
            return "🔴 MUITO ACIMA DO TETO - Evitar compra"
    
    @staticmethod
    def _create_error_response(ticker: str, error: str) -> BarsiAnalysis:
        """Cria resposta de erro"""
        return BarsiAnalysis(
            ticker=ticker.upper(),
            current_price=0,
            average_annual_dividend=0,
            price_target=0,
            current_yield=0,
            recommendation=f"❌ Erro: {error}",
            dividend_history=[],
            years_analyzed=0
        )
    
    @staticmethod
    async def analyze_portfolio(tickers: List[str]) -> List[BarsiAnalysis]:
        """
        Analisa múltiplos ativos de uma carteira.
        
        Args:
            tickers: Lista de códigos de ações
            
        Returns:
            Lista de análises Barsi ordenadas por margem de segurança
        """
        import asyncio
        
        # Buscar análises em paralelo (com limite de concorrência)
        analyses = []
        for ticker in tickers:
            analysis = await BarsiCalculator.calculate_price_target(ticker)
            analyses.append(analysis)
            await asyncio.sleep(1.5)  # Rate limiting
        
        # Ordenar por margem de segurança (maiores oportunidades primeiro)
        analyses.sort(key=lambda x: x.margin_of_safety, reverse=True)
        
        return analyses
