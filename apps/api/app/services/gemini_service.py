"""
Gemini AI Service for OCR and Financial Analysis
"""
import google.generativeai as genai
import json
import logging
from typing import Optional, Dict, Any
from app.core.config import settings

logger = logging.getLogger(__name__)

class GeminiService:
    def __init__(self):
        self.api_key = settings.GOOGLE_API_KEY
        if self.api_key:
            genai.configure(api_key=self.api_key)
        else:
            logger.warning("GOOGLE_API_KEY not set. Gemini features will be disabled.")

    async def analyze_brokerage_note(self, file_content: bytes, mime_type: str) -> Optional[Dict[str, Any]]:
        """
        Analyze a brokerage note (image or PDF) and extract transaction data.
        """
        if not self.api_key:
            raise ValueError("Chave de API do Google não configurada.")
            
        try:
            model = genai.GenerativeModel('gemini-2.5-flash')
            
            prompt = """
            Você é um assistente financeiro especializado em ler notas de corretagem brasileiras (B3).
            Analise a imagem/documento fornecido e extraia as operações realizadas.
            
            Retorne APENAS um objeto JSON com a seguinte estrutura (sem markdown, sem explicações adicionais):
            {
                "data_pregao": "YYYY-MM-DD",
                "corretora": "Nome da Corretora",
                "transacoes": [
                    {
                        "ticker": "Código do Ativo (ex: PETR4)",
                        "tipo": "COMPRA" ou "VENDA",
                        "quantidade": 100 (numero inteiro),
                        "preco": 25.50 (numero float),
                        "taxas": 0.00 (numero float, rateio das taxas se possível ou 0)
                    }
                ],
                "taxas_totais": 5.50 (soma de corretagem, emolumentos, liquidacao, etc)
            }
            
            Se houver várias operações, liste todas.
            Para a data, procure por "Data do Pregão" ou similar.
            Para as taxas, some todos os custos explicitos (taxa de liquidação, emolumentos, corretagem, ISS, etc) que aparecem no resumo financeiro.
            """
            
            # Create content part based on mime type
            content = [
                prompt,
                {
                    "mime_type": mime_type,
                    "data": file_content
                }
            ]
            
            response = await model.generate_content_async(content)
            
            # Clean response text to ensure valid JSON
            text = response.text.strip()
            if text.startswith("```json"):
                text = text.replace("```json", "").replace("```", "")
            elif text.startswith("```"):
                text = text.replace("```", "")
                
            return json.loads(text)
            
        except Exception as e:
            logger.error(f"Error calling Gemini: {str(e)}")
            raise e

gemini_service = GeminiService()
