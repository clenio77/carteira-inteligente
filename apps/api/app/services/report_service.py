"""
Portfolio Report Service

Gera relatórios gerenciais completos da carteira usando IA (Gemini).
Analisa cada ativo, contexto macro e fornece insights estratégicos.
"""
import google.generativeai as genai
import httpx
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, asdict

from app.core.config import settings
from app.services.bcb_service import BCBService

logger = logging.getLogger(__name__)


@dataclass
class AssetSummary:
    """Resumo de um ativo para o relatório"""
    ticker: str
    name: str
    sector: Optional[str]
    quantity: float
    average_price: float
    current_price: float
    total_invested: float
    current_value: float
    profit_loss: float
    profit_loss_pct: float
    weight_pct: float  # Peso na carteira
    price_earnings: Optional[float] = None
    dividend_yield: Optional[float] = None


@dataclass
class PortfolioReport:
    """Relatório completo da carteira"""
    generated_at: str
    
    # Resumo Geral
    total_invested: float
    total_value: float
    total_profit_loss: float
    total_profit_loss_pct: float
    assets_count: int
    
    # Contexto Macro
    macro_context: Dict[str, Any]
    
    # Resumo por Ativo
    assets: List[Dict[str, Any]]
    
    # Análise IA
    executive_summary: str  # Resumo executivo
    risk_analysis: str  # Análise de riscos
    opportunities: str  # Oportunidades identificadas
    recommendations: str  # Recomendações
    dividend_projection: str  # Projeção de dividendos


class ReportService:
    """
    Serviço para geração de relatórios de carteira.
    
    Usa Gemini 2.5-flash-lite (tokens ilimitados) para análises detalhadas.
    """
    
    # Modelo com tokens ilimitados
    MODEL_NAME = "gemini-2.5-flash-lite"
    
    @staticmethod
    async def _get_portfolio_data(user_id: int = None) -> List[AssetSummary]:
        """
        Busca os dados da carteira.
        Por enquanto, busca via API BrAPI simulando uma carteira.
        Em produção, buscaria do banco de dados.
        """
        # TODO: Integrar com banco de dados real
        # Por enquanto, retorna dados de exemplo para teste
        return []
    
    @staticmethod
    async def _enrich_with_market_data(assets: List[Dict]) -> List[AssetSummary]:
        """Enriquece os dados dos ativos com informações de mercado em paralelo"""
        from app.services.market_data import MarketDataService
        import asyncio
        
        enriched = []
        tasks = []

        # Função auxiliar para processar um único ativo
        async def process_asset(asset):
            ticker = asset.get('ticker', '')
            try:
                # Timeout agressivo por ativo para não travar o todo
                quote = await asyncio.wait_for(MarketDataService.get_quote(ticker), timeout=5.0)
                
                if quote:
                    current_price = quote.get("current_price") or asset.get('current_price', 0)
                    quantity = asset.get('quantity', 0)
                    average_price = asset.get('average_price', current_price)
                    total_invested = quantity * average_price
                    current_value = quantity * current_price
                    profit_loss = current_value - total_invested
                    profit_loss_pct = (profit_loss / total_invested * 100) if total_invested > 0 else 0
                    
                    return AssetSummary(
                        ticker=ticker.upper(),
                        name=quote.get('name', ticker),
                        sector=asset.get('sector'),
                        quantity=quantity,
                        average_price=average_price,
                        current_price=current_price,
                        total_invested=total_invested,
                        current_value=current_value,
                        profit_loss=profit_loss,
                        profit_loss_pct=profit_loss_pct,
                        weight_pct=0,  # Calculado depois
                        price_earnings=quote.get('price_earnings'),
                        dividend_yield=quote.get('dividend_yield')
                    )
            except Exception as e:
                logger.warning(f"Failed to enrich {ticker}: {e}")
            
            # Fallback em caso de erro ou timeout
            current_price = asset.get('current_price', 0)
            quantity = asset.get('quantity', 0)
            return AssetSummary(
                ticker=ticker.upper(),
                name=ticker,
                sector=asset.get('sector'),
                quantity=quantity,
                average_price=asset.get('average_price', 0),
                current_price=current_price,
                total_invested=quantity * asset.get('average_price', 0),
                current_value=quantity * current_price,
                profit_loss=0,
                profit_loss_pct=0,
                weight_pct=0,
                price_earnings=None,
                dividend_yield=None
            )

        # Criar tarefas para todos os ativos
        for asset in assets:
            tasks.append(process_asset(asset))
        
        # Executar tudo junto
        if tasks:
            enriched = await asyncio.gather(*tasks)
            # Filtrar possíveis Nones se algo muito estranho acontecer (embora o fallback previna)
            enriched = [e for e in enriched if e]
        
        # Calcular pesos
        total_value = sum(a.current_value for a in enriched)
        for asset in enriched:
            asset.weight_pct = (asset.current_value / total_value * 100) if total_value > 0 else 0
        
        return enriched
    
    @staticmethod
    async def generate_report(portfolio_assets: List[Dict]) -> PortfolioReport:
        """
        Gera um relatório completo da carteira.
        
        Args:
            portfolio_assets: Lista de ativos com ticker, quantity, average_price
            
        Returns:
            PortfolioReport: Relatório completo com análise IA
        """
        # 1. Enriquecer dados com mercado
        assets = await ReportService._enrich_with_market_data(portfolio_assets)
        
        if not assets:
            return ReportService._create_empty_report()
        
        # 2. Calcular totais
        total_invested = sum(a.total_invested for a in assets)
        total_value = sum(a.current_value for a in assets)
        total_profit_loss = total_value - total_invested
        total_profit_loss_pct = (total_profit_loss / total_invested * 100) if total_invested > 0 else 0
        
        # 3. Buscar contexto macro
        try:
            macro_context = await BCBService.get_macro_context()
        except Exception:
            macro_context = {"resumo": "Dados macro indisponíveis"}
        
        # 4. Gerar análises com IA
        assets_data = [asdict(a) for a in assets]
        
        ai_analysis = await ReportService._generate_ai_analysis(
            assets_data,
            total_invested,
            total_value,
            total_profit_loss_pct,
            macro_context
        )
        
        return PortfolioReport(
            generated_at=datetime.now().isoformat(),
            total_invested=round(total_invested, 2),
            total_value=round(total_value, 2),
            total_profit_loss=round(total_profit_loss, 2),
            total_profit_loss_pct=round(total_profit_loss_pct, 2),
            assets_count=len(assets),
            macro_context=macro_context,
            assets=assets_data,
            **ai_analysis
        )
    
    @staticmethod
    async def _generate_ai_analysis(
        assets: List[Dict],
        total_invested: float,
        total_value: float,
        profit_loss_pct: float,
        macro_context: Dict
    ) -> Dict[str, str]:
        """Gera as análises usando Gemini"""
        
        if not settings.GOOGLE_API_KEY:
            return {
                "executive_summary": "Configure GOOGLE_API_KEY para análise IA",
                "risk_analysis": "",
                "opportunities": "",
                "recommendations": "",
                "dividend_projection": ""
            }
        
        try:
            genai.configure(api_key=settings.GOOGLE_API_KEY)
            model = genai.GenerativeModel(ReportService.MODEL_NAME)
            
            # Construir contexto da carteira
            portfolio_text = ""
            for a in assets:
                portfolio_text += f"""
- {a['ticker']}: {a['quantity']:.0f} ações
  Preço Médio: R$ {a['average_price']:.2f} | Atual: R$ {a['current_price']:.2f}
  Resultado: {'+' if a['profit_loss'] >= 0 else ''}{a['profit_loss_pct']:.1f}%
  Peso: {a['weight_pct']:.1f}% da carteira
  P/L: {a.get('price_earnings', 'N/A')} | DY: {a.get('dividend_yield', 'N/A')}%
"""
            
            prompt = f"""Você é um analista de investimentos brasileiro experiente.
Analise a carteira de investimentos abaixo e gere um relatório gerencial completo.

=== CARTEIRA ===
Total Investido: R$ {total_invested:,.2f}
Valor Atual: R$ {total_value:,.2f}
Resultado: {'+' if profit_loss_pct >= 0 else ''}{profit_loss_pct:.1f}%

=== ATIVOS ==={portfolio_text}

=== CENÁRIO MACROECONÔMICO ===
{macro_context.get('resumo', 'N/A')}

=== INSTRUÇÕES ===
Gere um relatório com EXATAMENTE estas 5 seções, separadas por "###":

### RESUMO EXECUTIVO
(3-4 parágrafos com visão geral da carteira, perfil de risco, e situação atual)

### ANÁLISE DE RISCOS
(Identificar os principais riscos da carteira: concentração, setorial, macro)

### OPORTUNIDADES
(Identificar oportunidades com base na análise dos ativos e cenário)

### RECOMENDAÇÕES
(Sugestões práticas de ajustes, rebalanceamento ou monitoramento)

### PROJEÇÃO DE DIVIDENDOS
(Estimar dividendos anuais esperados com base no DY dos ativos)

REGRAS:
- Seja específico sobre CADA ativo quando relevante
- Use dados reais fornecidos, não invente números
- Considere o cenário macro brasileiro atual
- Linguagem profissional mas acessível
- NÃO dê recomendação de compra/venda específica (compliance)
"""
            
            response = model.generate_content(prompt)
            
            if response and response.text:
                return ReportService._parse_ai_response(response.text)
            
            return ReportService._get_default_analysis()
            
        except Exception as e:
            logger.error(f"Error generating AI analysis: {e}")
            return ReportService._get_default_analysis()
    
    @staticmethod
    def _parse_ai_response(text: str) -> Dict[str, str]:
        """Parse a resposta do Gemini em seções"""
        sections = {
            "executive_summary": "",
            "risk_analysis": "",
            "opportunities": "",
            "recommendations": "",
            "dividend_projection": ""
        }
        
        # Dividir por ###
        parts = text.split("###")
        
        for part in parts:
            part_lower = part.lower().strip()
            content = part.strip()
            
            # Remover o título da seção
            lines = content.split('\n', 1)
            if len(lines) > 1:
                content = lines[1].strip()
            
            if "resumo executivo" in part_lower:
                sections["executive_summary"] = content
            elif "risco" in part_lower:
                sections["risk_analysis"] = content
            elif "oportunidade" in part_lower:
                sections["opportunities"] = content
            elif "recomenda" in part_lower:
                sections["recommendations"] = content
            elif "dividendo" in part_lower or "projeção" in part_lower:
                sections["dividend_projection"] = content
        
        return sections
    
    @staticmethod
    def _get_default_analysis() -> Dict[str, str]:
        return {
            "executive_summary": "Análise não disponível no momento.",
            "risk_analysis": "",
            "opportunities": "",
            "recommendations": "",
            "dividend_projection": ""
        }
    
    @staticmethod
    def _create_empty_report() -> PortfolioReport:
        return PortfolioReport(
            generated_at=datetime.now().isoformat(),
            total_invested=0,
            total_value=0,
            total_profit_loss=0,
            total_profit_loss_pct=0,
            assets_count=0,
            macro_context={},
            assets=[],
            executive_summary="Nenhum ativo na carteira para análise.",
            risk_analysis="",
            opportunities="",
            recommendations="Adicione ativos à sua carteira para receber análises personalizadas.",
            dividend_projection=""
        )
