import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { jwtVerify } from 'jose';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';
const jwtSecret = process.env.SECRET_KEY || 'development-secret-key';

async function getUserFromToken(request: NextRequest) {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }

    const token = authHeader.split(' ')[1];
    try {
        const secret = new TextEncoder().encode(jwtSecret);
        const { payload } = await jwtVerify(token, secret);
        return payload.sub;
    } catch {
        return null;
    }
}

export async function GET(request: NextRequest) {
    try {
        if (!supabaseUrl || !supabaseKey) {
            return NextResponse.json(
                { detail: 'Serviço não configurado' },
                { status: 503 }
            );
        }

        const userId = await getUserFromToken(request);
        if (!userId) {
            return NextResponse.json(
                { detail: 'Não autorizado' },
                { status: 401 }
            );
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        const { data: positions, error } = await supabase
            .from('asset_positions')
            .select('ticker, asset_name, quantity, average_price, total_invested')
            .eq('user_id', userId)
            .gt('quantity', 0)
            .order('total_invested', { ascending: false });

        if (error) {
            console.error('Query error:', error);
            return NextResponse.json(
                { detail: 'Erro ao buscar posições' },
                { status: 500 }
            );
        }

        // Transform to expected format
        const result = (positions || []).map(pos => ({
            ticker: pos.ticker,
            name: pos.asset_name,
            quantity: pos.quantity,
            average_price: pos.average_price,
            total_invested: pos.total_invested
        }));

        return NextResponse.json(result);
    } catch (error: any) {
        console.error('Positions error:', error);
        return NextResponse.json(
            { detail: 'Erro interno do servidor' },
            { status: 500 }
        );
    }
}
