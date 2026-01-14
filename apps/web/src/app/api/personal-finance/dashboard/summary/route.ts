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

export async function POST(request: NextRequest) {
    try {
        const userId = await getUserId(request);
        if (!userId) {
            return NextResponse.json({ detail: 'Não autorizado' }, { status: 401 });
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // Get total balance from accounts
        const { data: accounts } = await supabase
            .from('pf_accounts')
            .select('balance')
            .eq('user_id', userId);

        const totalBalance = (accounts || []).reduce((sum, acc) => sum + (acc.balance || 0), 0);

        // Get current month transactions
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

        const { data: transactions } = await supabase
            .from('pf_transactions')
            .select('type, amount')
            .eq('user_id', userId)
            .gte('date', firstDay)
            .lte('date', lastDay);

        let income = 0;
        let expense = 0;

        (transactions || []).forEach(tx => {
            if (tx.type === 'INCOME') {
                income += tx.amount;
            } else if (tx.type === 'EXPENSE') {
                expense += tx.amount;
            }
        });

        return NextResponse.json({
            total_balance: totalBalance,
            current_month: {
                income,
                expense,
                balance: income - expense
            }
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        return NextResponse.json({
            total_balance: 0,
            current_month: { income: 0, expense: 0, balance: 0 }
        });
    }
}
