import { NextRequest, NextResponse } from 'next/server';

const BRAPI_TOKEN = process.env.BRAPI_TOKEN;
const BASE_URL = 'https://brapi.dev/api';

export async function GET(
    request: NextRequest,
    { params }: { params: { ticker: string } }
) {
    try {
        const { ticker } = params;
        const searchParams = request.nextUrl.searchParams;
        const range = searchParams.get('range') || '1mo';
        const interval = searchParams.get('interval') || '1d';

        if (!ticker) {
            return NextResponse.json(
                { detail: 'Ticker obrigatório' },
                { status: 400 }
            );
        }

        const url = `${BASE_URL}/quote/${ticker}?range=${range}&interval=${interval}&token=${BRAPI_TOKEN || 'public'}&fundamental=true&dividends=true`;

        const response = await fetch(url);
        const data = await response.json();

        if (!response.ok) {
            console.error('Brapi API error:', data);
            return NextResponse.json(
                { detail: 'Erro ao buscar dados históricos' },
                { status: response.status }
            );
        }

        const result = data.results[0];

        // Formatação para o frontend
        const historicalData = {
            symbol: result.symbol,
            longName: result.longName,
            regularMarketPrice: result.regularMarketPrice,
            logourl: result.logourl,
            historicalDataPrice: result.historicalDataPrice?.map((h: any) => ({
                date: new Date(h.date * 1000).toISOString().split('T')[0],
                close: h.close
            })) || [],
            dividendsData: result.dividendsData?.cashDividends?.map((d: any) => ({
                assetIssued: result.symbol,
                paymentDate: d.paymentDate,
                rate: d.rate,
                relatedTo: d.relatedTo
            })) || []
        };

        return NextResponse.json(historicalData);

    } catch (error) {
        console.error('Market historical error:', error);
        return NextResponse.json(
            // Retornar mock em caso de erro para não quebrar a tela
            {
                symbol: params.ticker,
                historicalDataPrice: []
            },
            { status: 200 }
        );
    }
}
