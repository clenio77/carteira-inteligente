import { NextRequest, NextResponse } from 'next/server';

const BRAPI_TOKEN = process.env.BRAPI_TOKEN;
const BASE_URL = 'https://brapi.dev/api';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const tickers = searchParams.get('tickers');

        if (!tickers) {
            return NextResponse.json(
                { detail: 'Nenhum ticker fornecido' },
                { status: 400 }
            );
        }

        // Se tickers contém vírgula, busca múltiplos
        const url = `${BASE_URL}/quote/${tickers}?token=${BRAPI_TOKEN || 'public'}`;

        const response = await fetch(url);
        const data = await response.json();

        if (!response.ok) {
            console.error('Brapi API error:', data);
            return NextResponse.json(
                { detail: 'Erro ao buscar cotações' },
                { status: response.status }
            );
        }

        // Formatação para o formato esperado pelo frontend
        const quotes = data.results.map((item: any) => ({
            ticker: item.symbol,
            price: item.regularMarketPrice,
            change: item.regularMarketChange,
            change_percent: item.regularMarketChangePercent,
            logo: item.logourl,
            updated_at: item.regularMarketTime
        }));

        return NextResponse.json({
            success: true,
            count: quotes.length,
            quotes: quotes
        }, {
            headers: {
                'Cache-Control': 's-maxage=60, stale-while-revalidate=300'
            }
        });

    } catch (error) {
        console.error('Market quotes error:', error);
        return NextResponse.json(
            { detail: 'Erro interno do servidor' },
            { status: 500 }
        );
    }
}
