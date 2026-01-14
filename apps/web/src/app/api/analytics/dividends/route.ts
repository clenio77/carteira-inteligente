import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { jwtVerify } from 'jose';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';
const jwtSecret = process.env.SECRET_KEY || 'development-secret-key';

async function getUserId(request: NextRequest): Promise<number | null> {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) return null;

    try {
        const secret = new TextEncoder().encode(jwtSecret);
        const { payload } = await jwtVerify(authHeader.split(' ')[1], secret);
        return parseInt(payload.sub as string, 10);
    } catch {
        return null;
    }
}

export async function GET(request: NextRequest) {
    try {
        const userId = await getUserId(request);
        if (!userId) {
            return NextResponse.json({ detail: 'Não autorizado' }, { status: 401 });
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // Tentar buscar da tabela proceeds se existir
        // Se der erro (tabela não existir), retorna vazio
        try {
            const { data: dividends, error } = await supabase
                .from('proceeds')
                .select('*')
                .eq('user_id', userId)
                .order('date', { ascending: true });

            if (error) throw error;

            // Agrupar por mês
            const dividendsByMonth: Record<string, number> = {};

            (dividends || []).forEach(div => {
                const date = new Date(div.date);
                const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                dividendsByMonth[key] = (dividendsByMonth[key] || 0) + (div.total_value || 0);
            });

            const result = Object.entries(dividendsByMonth).map(([date, value]) => ({
                date,
                value
            })).sort((a, b) => a.date.localeCompare(b.date));

            return NextResponse.json(result);

        } catch (tableError) {
            // Tabela pode não existir ainda, retornar vazio
            return NextResponse.json([]);
        }

    } catch (error) {
        console.error('Analytics dividends error:', error);
        return NextResponse.json([]);
    }
}
