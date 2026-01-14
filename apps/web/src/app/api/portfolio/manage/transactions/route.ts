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
        const { searchParams } = new URL(request.url);
        const ticker = searchParams.get('ticker');
        const limit = parseInt(searchParams.get('limit') || '50');

        let query = supabase
            .from('transactions')
            .select('*')
            .eq('user_id', userId)
            .order('transaction_date', { ascending: false })
            .limit(limit);

        if (ticker) {
            query = query.eq('ticker', ticker.toUpperCase());
        }

        const { data: transactions, error } = await query;

        if (error) {
            console.error('Query error:', error);
            return NextResponse.json(
                { detail: 'Erro ao buscar transações' },
                { status: 500 }
            );
        }

        return NextResponse.json(transactions || []);
    } catch (error: any) {
        console.error('Transactions error:', error);
        return NextResponse.json(
            { detail: 'Erro interno do servidor' },
            { status: 500 }
        );
    }
}
