import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    // Retornar mock de highlights, já que a Brapi gratuita tem limites ou não tem endpoint direto de "destaques" simples
    // Ou podemos implementar uma busca por uma lista fixa de ativos populares

    const highlights = [
        { ticker: 'IBOV', name: 'Ibovespa', value: 128000, variation: 0.5, type: 'index' },
        { ticker: 'IFIX', name: 'Índice FIIs', value: 3350, variation: 0.1, type: 'index' },
        { ticker: 'USDBRL', name: 'Dólar', value: 5.85, variation: -0.2, type: 'currency' },
        { ticker: 'BTC-BRL', name: 'Bitcoin', value: 650000, variation: 2.5, type: 'crypto' }
    ];

    return NextResponse.json(highlights);
}
