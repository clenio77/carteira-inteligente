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
        const fundamental = searchParams.get('fundamental') === 'true';
        const dividends = searchParams.get('dividends') === 'true';

        if (!ticker) {
            return NextResponse.json(
                { detail: 'Ticker obrigatório' },
                { status: 400 }
            );
        }

        let url = `${BASE_URL}/quote/${ticker}?token=${BRAPI_TOKEN || 'public'}`;
        if (fundamental) url += '&fundamental=true';
        if (dividends) url += '&dividends=true';

        const response = await fetch(url);
        const data = await response.json();

        if (!response.ok) {
            console.error('Brapi API error:', data);
            return NextResponse.json(
                { detail: 'Erro ao buscar cotação' },
                { status: response.status }
            );
        }

        const result = data.results[0];

        // Retornar no formato que a API da Brapi retorna, pois o frontend deve estar esperando isso
        // já que a rota original provavelmente era apenas um proxy
        return NextResponse.json(result);

    } catch (error) {
        console.error('Market quote error:', error);
        return NextResponse.json(
            { detail: 'Erro interno do servidor' },
            { status: 500 }
        );
    }
}
