"""
Market Intelligence Service

Fornece análises quantitativas simples:
- Score de Volatilidade
- Detector de Anomalias
- Indicadores de risco
"""
import httpx
import logging
import math
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class VolatilityScore:
    """Score de volatilidade de um ativo"""
    ticker: str
    current_price: float
    volatility_daily: float  # Desvio padrão diário (%)
    volatility_score: int  # 1-10 (1=baixa, 10=alta)
    volatility_level: str  # "baixa", "moderada", "alta", "extrema"
    avg_daily_range: float  # Range médio diário em %
    max_drawdown_30d: float  # Maior queda nos últimos 30 dias
    trend: str  # "alta", "lateral", "baixa"
    recommendation: str


@dataclass
class AnomalyAlert:
    """Alerta de anomalia detectada"""
    ticker: str
    anomaly_type: str  # "volume", "price", "volatility"
    severity: str  # "low", "medium", "high"
    current_value: float
    average_value: float
    deviation_percent: float  # Quanto desviou da média (%)
    message: str
    detected_at: str


class MarketIntelligence:
    """
    Serviço de inteligência de mercado para análises quantitativas.
    Não tenta "prever preço" - foca em volatilidade e anomalias.
    """
    
    # Thresholds para classificação de volatilidade
    VOLATILITY_THRESHOLDS = {
        "baixa": (0, 1.5),
        "moderada": (1.5, 3.0),
        "alta": (3.0, 5.0),
        "extrema": (5.0, float("inf"))
    }
    
    # Threshold para detectar anomalia (desvios padrão)
    ANOMALY_THRESHOLD = 2.0  # 2 desvios padrão = ~5% de chance
    
    @staticmethod
    async def calculate_volatility(ticker: str) -> VolatilityScore:
        """
        Calcula o score de volatilidade de um ativo.
        
        Usa dados históricos de 30 dias para calcular:
        - Desvio padrão dos retornos diários
        - Maior queda (drawdown)
        - Tendência geral
        """
        from app.core.config import settings
        
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                params = {
                    "range": "1mo",
                    "interval": "1d"
                }
                if settings.BRAPI_TOKEN:
                    params["token"] = settings.BRAPI_TOKEN
                
                response = await client.get(
                    f"https://brapi.dev/api/quote/{ticker.upper()}",
                    params=params
                )
                
                if response.status_code != 200:
                    return MarketIntelligence._create_error_volatility(ticker)
                
                data = response.json()
                results = data.get("results", [])
                
                if not results:
                    return MarketIntelligence._create_error_volatility(ticker)
                
                quote = results[0]
                current_price = quote.get("regularMarketPrice", 0)
                historical = quote.get("historicalDataPrice", [])
                
                if not historical or len(historical) < 5:
                    return MarketIntelligence._create_error_volatility(ticker)
                
                # Calcular retornos diários
                returns = []
                prices = [day.get("close", 0) for day in historical if day.get("close")]
                
                for i in range(1, len(prices)):
                    if prices[i-1] > 0:
                        daily_return = (prices[i] - prices[i-1]) / prices[i-1] * 100
                        returns.append(daily_return)
                
                if not returns:
                    return MarketIntelligence._create_error_volatility(ticker)
                
                # Calcular volatilidade (desvio padrão dos retornos)
                mean_return = sum(returns) / len(returns)
                variance = sum((r - mean_return) ** 2 for r in returns) / len(returns)
                volatility_daily = math.sqrt(variance)
                
                # Calcular range médio diário
                daily_ranges = []
                for day in historical:
                    high = day.get("high", 0)
                    low = day.get("low", 0)
                    if high > 0 and low > 0:
                        daily_range = (high - low) / low * 100
                        daily_ranges.append(daily_range)
                
                avg_daily_range = sum(daily_ranges) / len(daily_ranges) if daily_ranges else 0
                
                # Calcular max drawdown
                peak = prices[0]
                max_drawdown = 0
                for price in prices:
                    if price > peak:
                        peak = price
                    drawdown = (peak - price) / peak * 100 if peak > 0 else 0
                    max_drawdown = max(max_drawdown, drawdown)
                
                # Determinar tendência
                if len(prices) >= 2:
                    first_price = prices[0]
                    last_price = prices[-1]
                    change_pct = (last_price - first_price) / first_price * 100 if first_price > 0 else 0
                    
                    if change_pct > 5:
                        trend = "alta"
                    elif change_pct < -5:
                        trend = "baixa"
                    else:
                        trend = "lateral"
                else:
                    trend = "indefinida"
                
                # Classificar volatilidade
                volatility_level = "baixa"
                for level, (low, high) in MarketIntelligence.VOLATILITY_THRESHOLDS.items():
                    if low <= volatility_daily < high:
                        volatility_level = level
                        break
                
                # Score de 1 a 10
                volatility_score = min(10, max(1, int(volatility_daily / 0.5) + 1))
                
                # Recomendação
                recommendation = MarketIntelligence._get_volatility_recommendation(
                    volatility_level, trend, max_drawdown
                )
                
                return VolatilityScore(
                    ticker=ticker.upper(),
                    current_price=round(current_price, 2),
                    volatility_daily=round(volatility_daily, 2),
                    volatility_score=volatility_score,
                    volatility_level=volatility_level,
                    avg_daily_range=round(avg_daily_range, 2),
                    max_drawdown_30d=round(max_drawdown, 2),
                    trend=trend,
                    recommendation=recommendation
                )
                
        except Exception as e:
            logger.error(f"Error calculating volatility for {ticker}: {e}")
            return MarketIntelligence._create_error_volatility(ticker)
    
    @staticmethod
    async def detect_anomalies(ticker: str) -> List[AnomalyAlert]:
        """
        Detecta anomalias em volume, preço e volatilidade.
        
        Compara valores atuais com médias históricas.
        Alerta quando algo está fora do padrão.
        """
        from app.core.config import settings
        
        anomalies = []
        
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                params = {
                    "range": "1mo",
                    "interval": "1d"
                }
                if settings.BRAPI_TOKEN:
                    params["token"] = settings.BRAPI_TOKEN
                
                response = await client.get(
                    f"https://brapi.dev/api/quote/{ticker.upper()}",
                    params=params
                )
                
                if response.status_code != 200:
                    return anomalies
                
                data = response.json()
                results = data.get("results", [])
                
                if not results:
                    return anomalies
                
                quote = results[0]
                historical = quote.get("historicalDataPrice", [])
                
                if not historical or len(historical) < 10:
                    return anomalies
                
                # Dados atuais
                current_volume = quote.get("regularMarketVolume", 0)
                current_change = quote.get("regularMarketChangePercent", 0)
                
                # Calcular médias históricas
                volumes = [day.get("volume", 0) for day in historical if day.get("volume")]
                changes = []
                prices = [day.get("close", 0) for day in historical if day.get("close")]
                
                for i in range(1, len(prices)):
                    if prices[i-1] > 0:
                        change = abs((prices[i] - prices[i-1]) / prices[i-1] * 100)
                        changes.append(change)
                
                # Estatísticas de volume
                if volumes:
                    avg_volume = sum(volumes) / len(volumes)
                    std_volume = math.sqrt(sum((v - avg_volume) ** 2 for v in volumes) / len(volumes))
                    
                    if std_volume > 0 and current_volume > 0:
                        volume_zscore = (current_volume - avg_volume) / std_volume
                        
                        if abs(volume_zscore) > MarketIntelligence.ANOMALY_THRESHOLD:
                            deviation_pct = (current_volume - avg_volume) / avg_volume * 100
                            
                            if volume_zscore > 0:
                                severity = "high" if volume_zscore > 3 else "medium"
                                message = f"📈 Volume {deviation_pct:.0f}% ACIMA da média"
                            else:
                                severity = "low"
                                message = f"📉 Volume {abs(deviation_pct):.0f}% ABAIXO da média"
                            
                            anomalies.append(AnomalyAlert(
                                ticker=ticker.upper(),
                                anomaly_type="volume",
                                severity=severity,
                                current_value=current_volume,
                                average_value=avg_volume,
                                deviation_percent=round(deviation_pct, 1),
                                message=message,
                                detected_at=datetime.now().isoformat()
                            ))
                
                # Estatísticas de variação de preço
                if changes:
                    avg_change = sum(changes) / len(changes)
                    std_change = math.sqrt(sum((c - avg_change) ** 2 for c in changes) / len(changes))
                    
                    if std_change > 0:
                        change_zscore = (abs(current_change) - avg_change) / std_change
                        
                        if change_zscore > MarketIntelligence.ANOMALY_THRESHOLD:
                            deviation_pct = (abs(current_change) - avg_change) / avg_change * 100 if avg_change > 0 else 0
                            severity = "high" if change_zscore > 3 else "medium"
                            
                            direction = "alta" if current_change > 0 else "queda"
                            anomalies.append(AnomalyAlert(
                                ticker=ticker.upper(),
                                anomaly_type="price",
                                severity=severity,
                                current_value=abs(current_change),
                                average_value=avg_change,
                                deviation_percent=round(deviation_pct, 1),
                                message=f"⚠️ Movimento de {direction} atípico: {abs(current_change):.2f}%",
                                detected_at=datetime.now().isoformat()
                            ))
                
                return anomalies
                
        except Exception as e:
            logger.error(f"Error detecting anomalies for {ticker}: {e}")
            return anomalies
    
    @staticmethod
    async def analyze_portfolio_risk(tickers: List[str]) -> Dict[str, Any]:
        """
        Analisa o risco de uma carteira inteira.
        
        Retorna:
        - Score médio de volatilidade
        - Anomalias detectadas
        - Alertas de risco
        """
        import asyncio
        
        volatilities = []
        all_anomalies = []
        
        for ticker in tickers[:20]:  # Limite de 20 ativos
            vol = await MarketIntelligence.calculate_volatility(ticker)
            volatilities.append(vol)
            
            anomalies = await MarketIntelligence.detect_anomalies(ticker)
            all_anomalies.extend(anomalies)
            
            await asyncio.sleep(1.0)  # Rate limiting
        
        # Calcular métricas agregadas
        valid_vols = [v for v in volatilities if v.volatility_score > 0]
        
        avg_volatility = sum(v.volatility_daily for v in valid_vols) / len(valid_vols) if valid_vols else 0
        max_volatility = max((v.volatility_daily for v in valid_vols), default=0)
        high_vol_count = sum(1 for v in valid_vols if v.volatility_level in ["alta", "extrema"])
        
        # Ordenar anomalias por severidade
        severity_order = {"high": 0, "medium": 1, "low": 2}
        all_anomalies.sort(key=lambda a: severity_order.get(a.severity, 99))
        
        # Gerar alerta geral
        if high_vol_count > len(valid_vols) * 0.5:
            risk_level = "alto"
            risk_message = "⚠️ Mais de 50% da carteira está em alta volatilidade"
        elif high_vol_count > 0:
            risk_level = "moderado"
            risk_message = f"📊 {high_vol_count} ativo(s) em alta volatilidade"
        else:
            risk_level = "baixo"
            risk_message = "✅ Carteira com volatilidade controlada"
        
        return {
            "portfolio_volatility": round(avg_volatility, 2),
            "max_volatility": round(max_volatility, 2),
            "high_volatility_count": high_vol_count,
            "risk_level": risk_level,
            "risk_message": risk_message,
            "assets_analyzed": len(valid_vols),
            "anomalies_detected": len(all_anomalies),
            "anomalies": [
                {
                    "ticker": a.ticker,
                    "type": a.anomaly_type,
                    "severity": a.severity,
                    "message": a.message,
                    "deviation_percent": a.deviation_percent
                }
                for a in all_anomalies[:10]  # Top 10 anomalias
            ],
            "volatility_details": [
                {
                    "ticker": v.ticker,
                    "score": v.volatility_score,
                    "level": v.volatility_level,
                    "daily_volatility": v.volatility_daily,
                    "trend": v.trend
                }
                for v in sorted(valid_vols, key=lambda x: x.volatility_score, reverse=True)
            ]
        }
    
    @staticmethod
    def _get_volatility_recommendation(level: str, trend: str, drawdown: float) -> str:
        """Gera recomendação baseada na análise"""
        if level == "extrema":
            return "🔴 ALTA VOLATILIDADE - Cuidado com posições alavancadas. Considere proteção."
        elif level == "alta":
            if trend == "baixa":
                return "⚠️ Volatilidade alta em tendência de baixa. Cautela recomendada."
            else:
                return "⚠️ Volatilidade alta. Bom para trades curtos, arriscado para buy & hold."
        elif level == "moderada":
            return "📊 Volatilidade moderada. Comportamento típico de mercado."
        else:
            if trend == "lateral":
                return "😴 Baixa volatilidade em lateralização. Pode preceder movimento forte."
            else:
                return "✅ Baixa volatilidade. Bom momento para estratégias de longo prazo."
    
    @staticmethod
    def _create_error_volatility(ticker: str) -> VolatilityScore:
        return VolatilityScore(
            ticker=ticker.upper(),
            current_price=0,
            volatility_daily=0,
            volatility_score=0,
            volatility_level="desconhecido",
            avg_daily_range=0,
            max_drawdown_30d=0,
            trend="indefinida",
            recommendation="❌ Dados insuficientes para análise"
        )
    
    @staticmethod
    async def get_ai_insight(
        ticker: str, 
        volatility_data: Dict[str, Any], 
        anomalies: List[Dict] = None,
        fundamentals: Dict[str, Any] = None,
        macro_context: Dict[str, Any] = None
    ) -> str:
        """
        Usa Google Gemini para gerar insights inteligentes sobre a volatilidade.
        
        Analisa os dados quantitativos + macro + fundamentalistas e gera um contexto
        em linguagem natural explicando POR QUE o ativo está se comportando dessa forma.
        """
        import google.generativeai as genai
        from app.core.config import settings
        
        if not settings.GOOGLE_API_KEY:
            return "💡 Configure GOOGLE_API_KEY para insights de IA"
        
        try:
            genai.configure(api_key=settings.GOOGLE_API_KEY)
            model = genai.GenerativeModel("gemini-2.0-flash")
            
            # Construir contexto de anomalias
            anomaly_text = ""
            if anomalies:
                anomaly_text = f"\nAnomalias detectadas: {', '.join(a.get('message', '') for a in anomalies[:3])}"
            
            # Construir contexto de fundamentalistas
            fundamental_text = ""
            if fundamentals:
                pe = fundamentals.get('priceEarnings')
                eps = fundamentals.get('earningsPerShare')
                market_cap = fundamentals.get('marketCap')
                div_yield = fundamentals.get('dividendYield')
                
                parts = []
                if pe: parts.append(f"P/L: {pe:.1f}")
                if eps: parts.append(f"LPA: R$ {eps:.2f}")
                if market_cap: parts.append(f"Market Cap: R$ {market_cap/1e9:.1f}B")
                if div_yield: parts.append(f"DY: {div_yield:.1f}%")
                
                if parts:
                    fundamental_text = f"\nIndicadores: {', '.join(parts)}"
            
            # Construir contexto macroeconômico
            macro_text = ""
            if macro_context:
                macro_text = f"\nCenário Macro: {macro_context.get('resumo', 'N/A')}"
            
            prompt = f"""Você é um analista de mercado brasileiro especializado em B3.
Analise os seguintes dados de {ticker} e forneça um insight CURTO (máximo 3-4 frases) sobre o comportamento do ativo.

DADOS DO ATIVO:
- Ticker: {volatility_data.get('ticker', ticker)}
- Preço atual: R$ {volatility_data.get('current_price', 'N/A')}
- Volatilidade diária: {volatility_data.get('volatility_daily', 0):.2f}%
- Nível volatilidade: {volatility_data.get('volatility_level', 'N/A')}
- Max Drawdown (30d): {volatility_data.get('max_drawdown_30d', 0):.1f}%
- Tendência: {volatility_data.get('trend', 'N/A')}{fundamental_text}{anomaly_text}

CONTEXTO MACROECONÔMICO:{macro_text}

REGRAS:
1. Seja BREVE (3-4 frases no máximo)
2. RELACIONE o ativo com o cenário macro quando relevante (ex: bancos x SELIC, FIIs x juros)
3. Use os indicadores fundamentalistas se disponíveis para contextualizar valuation
4. NÃO dê recomendação de compra/venda
5. NÃO mencione preços-alvo específicos
6. Use linguagem acessível para investidor pessoa física
7. Comece com um emoji relevante ao setor

RESPOSTA:"""
            
            response = model.generate_content(prompt)
            
            if response and response.text:
                # Limpar resposta
                insight = response.text.strip()
                # Limitar tamanho
                if len(insight) > 400:
                    insight = insight[:397] + "..."
                return insight
            
            return "💡 Não foi possível gerar insight para este ativo"
            
        except Exception as e:
            logger.error(f"Error generating AI insight for {ticker}: {e}")
            return f"💡 Análise automática indisponível no momento"
    
    @staticmethod
    async def get_full_analysis(ticker: str) -> Dict[str, Any]:
        """
        Retorna análise completa de um ativo com:
        - Dados quantitativos (volatilidade, anomalias)
        - Indicadores fundamentalistas (P/L, LPA, Market Cap)
        - Contexto macroeconômico (SELIC, IPCA, Dólar)
        - Insight de IA (Gemini) integrando tudo
        """
        from dataclasses import asdict
        from app.services.bcb_service import BCBService
        from app.core.config import settings
        import httpx
        
        # Buscar dados quantitativos
        volatility = await MarketIntelligence.calculate_volatility(ticker)
        anomalies = await MarketIntelligence.detect_anomalies(ticker)
        
        volatility_dict = asdict(volatility)
        anomalies_list = [asdict(a) for a in anomalies]
        
        # Buscar contexto macroeconômico (BCB)
        try:
            macro_context = await BCBService.get_macro_context()
        except Exception as e:
            logger.warning(f"Failed to get macro context: {e}")
            macro_context = None
        
        # Buscar indicadores fundamentalistas (BrAPI)
        fundamentals = None
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                params = {"fundamental": "true"}
                if settings.BRAPI_TOKEN:
                    params["token"] = settings.BRAPI_TOKEN
                
                response = await client.get(
                    f"https://brapi.dev/api/quote/{ticker.upper()}",
                    params=params
                )
                
                if response.status_code == 200:
                    data = response.json()
                    results = data.get("results", [])
                    if results:
                        quote = results[0]
                        fundamentals = {
                            "priceEarnings": quote.get("priceEarnings"),
                            "earningsPerShare": quote.get("earningsPerShare"),
                            "marketCap": quote.get("marketCap"),
                            "dividendYield": quote.get("dividendYield"),
                            "fiftyTwoWeekHigh": quote.get("fiftyTwoWeekHigh"),
                            "fiftyTwoWeekLow": quote.get("fiftyTwoWeekLow"),
                        }
        except Exception as e:
            logger.warning(f"Failed to get fundamentals: {e}")
        
        # Gerar insight com IA (incluindo macro + fundamentals)
        ai_insight = await MarketIntelligence.get_ai_insight(
            ticker, 
            volatility_dict, 
            anomalies_list,
            fundamentals,
            macro_context
        )
        
        return {
            "ticker": ticker.upper(),
            "volatility": volatility_dict,
            "anomalies": anomalies_list,
            "fundamentals": fundamentals,
            "macro": macro_context,
            "ai_insight": ai_insight,
            "analyzed_at": datetime.now().isoformat()
        }

