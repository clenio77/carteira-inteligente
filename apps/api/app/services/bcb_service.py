"""
Banco Central do Brasil - SGS API Service

Serviço para buscar indicadores econômicos do Sistema Gerenciador de Séries Temporais.
API gratuita e pública.

Documentação: https://dadosabertos.bcb.gov.br/
"""
import httpx
import logging
from datetime import datetime
from typing import Dict, Any, Optional
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class MacroIndicators:
    """Indicadores macroeconômicos do Brasil"""
    selic_meta: float  # Taxa SELIC Meta (% a.a.)
    selic_over: float  # Taxa SELIC Over (% a.a.)
    cdi: float  # CDI (% a.a.)
    ipca_mensal: float  # IPCA mensal (%)
    ipca_12m: float  # IPCA acumulado 12 meses (%)
    dolar: float  # Dólar PTAX (R$)
    ibovespa: Optional[float]  # Pontos do IBOV
    updated_at: str


class BCBService:
    """
    Serviço para consumir a API do Banco Central do Brasil.
    
    Códigos das séries mais usadas:
    - 432: SELIC Meta (% a.a.)
    - 1178: SELIC Over (% a.a.)
    - 4389: CDI diário
    - 4390: CDI mensal
    - 433: IPCA mensal
    - 13522: IPCA acumulado 12 meses
    - 1: Dólar PTAX venda
    """
    
    BASE_URL = "https://api.bcb.gov.br/dados/serie/bcdata.sgs"
    
    # Códigos das séries
    SERIES = {
        "selic_meta": 432,
        "selic_over": 1178,
        "cdi_mensal": 4390,
        "ipca_mensal": 433,
        "ipca_12m": 13522,
        "dolar_ptax": 1,
    }
    
    @staticmethod
    async def get_latest_value(serie_code: int) -> Optional[float]:
        """Busca o último valor de uma série do BCB"""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{BCBService.BASE_URL}.{serie_code}/dados/ultimos/1",
                    params={"formato": "json"}
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data and len(data) > 0:
                        valor = data[0].get("valor", "0")
                        return float(str(valor).replace(",", "."))
                
                return None
                
        except Exception as e:
            logger.error(f"Error fetching BCB serie {serie_code}: {e}")
            return None
    
    @staticmethod
    async def get_macro_indicators() -> MacroIndicators:
        """
        Busca os principais indicadores macroeconômicos.
        
        Retorna SELIC, CDI, IPCA e Dólar atualizados.
        """
        import asyncio
        
        # Buscar todos os indicadores em paralelo
        results = await asyncio.gather(
            BCBService.get_latest_value(BCBService.SERIES["selic_meta"]),
            BCBService.get_latest_value(BCBService.SERIES["selic_over"]),
            BCBService.get_latest_value(BCBService.SERIES["cdi_mensal"]),
            BCBService.get_latest_value(BCBService.SERIES["ipca_mensal"]),
            BCBService.get_latest_value(BCBService.SERIES["ipca_12m"]),
            BCBService.get_latest_value(BCBService.SERIES["dolar_ptax"]),
            return_exceptions=True
        )
        
        # Extrair valores (usar 0 se falhar)
        def safe_value(result, default=0.0):
            if isinstance(result, Exception) or result is None:
                return default
            return result
        
        # CDI anual aproximado (CDI mensal * 12)
        cdi_mensal = safe_value(results[2])
        cdi_anual = cdi_mensal * 12 if cdi_mensal else safe_value(results[0])  # Fallback para SELIC
        
        return MacroIndicators(
            selic_meta=safe_value(results[0]),
            selic_over=safe_value(results[1]),
            cdi=round(cdi_anual, 2),
            ipca_mensal=safe_value(results[3]),
            ipca_12m=safe_value(results[4]),
            dolar=safe_value(results[5]),
            ibovespa=None,  # Não disponível no BCB
            updated_at=datetime.now().isoformat()
        )
    
    @staticmethod
    async def get_macro_context() -> Dict[str, Any]:
        """
        Retorna contexto macroeconômico formatado para uso em prompts de IA.
        """
        indicators = await BCBService.get_macro_indicators()
        
        # Determinar cenário
        if indicators.selic_meta >= 12:
            juros_nivel = "alta"
        elif indicators.selic_meta >= 8:
            juros_nivel = "moderada"
        else:
            juros_nivel = "baixa"
        
        if indicators.ipca_12m >= 6:
            inflacao_nivel = "alta"
        elif indicators.ipca_12m >= 4:
            inflacao_nivel = "moderada"
        else:
            inflacao_nivel = "controlada"
        
        return {
            "selic": indicators.selic_meta,
            "cdi": indicators.cdi,
            "ipca_mensal": indicators.ipca_mensal,
            "ipca_12m": indicators.ipca_12m,
            "dolar": indicators.dolar,
            "juros_nivel": juros_nivel,
            "inflacao_nivel": inflacao_nivel,
            "resumo": f"SELIC {indicators.selic_meta}% (juros {juros_nivel}), IPCA {indicators.ipca_12m}% (inflação {inflacao_nivel}), Dólar R$ {indicators.dolar:.2f}",
            "updated_at": indicators.updated_at
        }
