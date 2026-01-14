import { NextRequest, NextResponse } from 'next/server';

// BRAPI.dev API for market data
const BRAPI_BASE_URL = 'https://brapi.dev/api';
const BRAPI_TOKEN = process.env.BRAPI_TOKEN || '';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const query = searchParams.get('q') || '';

        if (!query || query.length < 2) {
            return NextResponse.json({
                success: true,
                count: 0,
                results: []
            });
        }

        // Call BRAPI search endpoint
        const url = new URL(`${BRAPI_BASE_URL}/available`);
        if (BRAPI_TOKEN) {
            url.searchParams.append('token', BRAPI_TOKEN);
        }
        url.searchParams.append('search', query);

        const response = await fetch(url.toString(), {
            headers: {
                'Accept': 'application/json',
            },
            next: { revalidate: 300 } // Cache for 5 minutes
        });

        if (!response.ok) {
            console.error('BRAPI error:', response.status, response.statusText);
            return NextResponse.json({
                success: false,
                count: 0,
                results: [],
                error: 'Erro ao buscar dados do mercado'
            }, { status: 502 });
        }

        const data = await response.json();

        // Transform BRAPI response to our format
        const results = (data.stocks || []).slice(0, 10).map((ticker: string) => ({
            stock: ticker,
            name: ticker, // BRAPI available endpoint doesn't return names
            close: null,
            change: null,
            volume: null,
            market_cap: null,
            logo: null,
            sector: null
        }));

        return NextResponse.json({
            success: true,
            count: results.length,
            results
        });
    } catch (error: any) {
        console.error('Market search error:', error);
        return NextResponse.json({
            success: false,
            count: 0,
            results: [],
            error: 'Erro interno ao buscar ativos'
        }, { status: 500 });
    }
}
