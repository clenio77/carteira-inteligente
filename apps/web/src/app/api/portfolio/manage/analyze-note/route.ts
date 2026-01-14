import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || '';

export async function POST(request: NextRequest) {
    try {
        // Check if Gemini API is configured
        if (!GOOGLE_API_KEY) {
            return NextResponse.json(
                { detail: 'Serviço de IA não configurado. Configure GOOGLE_API_KEY.' },
                { status: 503 }
            );
        }

        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json(
                { detail: 'Nenhum arquivo enviado' },
                { status: 400 }
            );
        }

        // Check file type
        const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
        if (!validTypes.includes(file.type)) {
            return NextResponse.json(
                { detail: 'Tipo de arquivo não suportado. Use: JPEG, PNG, WebP ou PDF' },
                { status: 400 }
            );
        }

        // Convert file to base64
        const bytes = await file.arrayBuffer();
        const base64 = Buffer.from(bytes).toString('base64');

        // Initialize Gemini
        const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-001' });

        // Prepare prompt for brokerage note analysis
        const prompt = `Analise esta nota de corretagem e extraia as seguintes informações em formato JSON:

{
  "corretora": "nome da corretora",
  "data_pregao": "YYYY-MM-DD",
  "numero_nota": "número da nota",
  "operacoes": [
    {
      "tipo": "COMPRA ou VENDA",
      "ticker": "código do ativo (ex: PETR4)",
      "quantidade": número,
      "preco": número (preço unitário),
      "valor_total": número,
      "taxas": número (se houver)
    }
  ],
  "taxas_totais": {
    "emolumentos": número,
    "taxa_liquidacao": número,
    "corretagem": número,
    "iss": número,
    "outros": número
  },
  "valor_liquido": número
}

Se alguma informação não estiver clara ou não for encontrada, use null.
Retorne APENAS o JSON, sem explicações adicionais.`;


        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    mimeType: file.type,
                    data: base64
                }
            }
        ]);

        const response = result.response;
        const text = response.text();

        console.log('Gemini raw response:', text); // Debug log

        // Try to parse JSON from response
        try {
            // Helper to clean and find JSON
            let jsonStr = text.trim();

            // 1. Try extracting from markdown blocks
            const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
            if (jsonMatch) {
                jsonStr = jsonMatch[1].trim();
            } else {
                // 2. Try extracting from code blocks without language
                const codeMatch = text.match(/```\s*([\s\S]*?)\s*```/);
                if (codeMatch) {
                    jsonStr = codeMatch[1].trim();
                } else {
                    // 3. Try finding first { and last }
                    const firstBrace = text.indexOf('{');
                    const lastBrace = text.lastIndexOf('}');
                    if (firstBrace !== -1 && lastBrace !== -1) {
                        jsonStr = text.substring(firstBrace, lastBrace + 1);
                    }
                }
            }

            // Remove comments if any (simple regex for //)
            jsonStr = jsonStr.replace(/\/\/.*$/gm, '');

            console.log('Cleaned JSON string:', jsonStr); // Debug log
            const parsedData = JSON.parse(jsonStr);

            return NextResponse.json({
                success: true,
                ...parsedData
            });
        } catch (parseError) {
            console.error('Failed to parse Gemini response:', parseError);
            console.error('Raw text was:', text);

            return NextResponse.json({
                success: false,
                raw_response: text,
                detail: 'Não foi possível interpretar a estrutura do JSON. Veja o log do servidor.'
            }, { status: 422 });
        }
    } catch (error: any) {
        console.error('Analyze note error:', error);
        return NextResponse.json(
            { detail: error.message || 'Erro ao analisar nota' },
            { status: 500 }
        );
    }
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS() {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    });
}
