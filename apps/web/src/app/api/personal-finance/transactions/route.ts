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
        const { searchParams } = new URL(request.url);

        let query = supabase
            .from('pf_transactions')
            .select(`
        *,
        pf_accounts(name),
        pf_categories(name)
      `)
            .eq('user_id', userId)
            .order('date', { ascending: false });

        const startDate = searchParams.get('start_date');
        const endDate = searchParams.get('end_date');
        const accountId = searchParams.get('account_id');
        const limit = searchParams.get('limit');

        if (startDate) query = query.gte('date', startDate);
        if (endDate) query = query.lte('date', endDate);
        if (accountId) query = query.eq('account_id', accountId);
        if (limit) query = query.limit(parseInt(limit, 10));

        const { data, error } = await query;

        if (error) {
            console.error('Query error:', error);
            return NextResponse.json([], { status: 200 });
        }

        // Transform data
        const transformed = (data || []).map(tx => ({
            ...tx,
            account_name: tx.pf_accounts?.name,
            category_name: tx.pf_categories?.name,
        }));

        return NextResponse.json(transformed);
    } catch (error) {
        console.error('Transactions error:', error);
        return NextResponse.json([], { status: 200 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const userId = await getUserId(request);
        if (!userId) {
            return NextResponse.json({ detail: 'Não autorizado' }, { status: 401 });
        }

        const supabase = createClient(supabaseUrl, supabaseKey);
        const body = await request.json();

        const { account_id, category_id, type, amount, description, date, is_paid } = body;

        // Insert transaction
        const { data: tx, error: txError } = await supabase
            .from('pf_transactions')
            .insert([{
                user_id: userId,
                account_id,
                category_id,
                type,
                amount,
                description,
                date,
                is_paid: is_paid ?? true
            }])
            .select()
            .single();

        if (txError) {
            return NextResponse.json({ detail: txError.message }, { status: 500 });
        }

        // Update account balance
        const balanceChange = type === 'INCOME' ? amount : -amount;
        await supabase.rpc('adjust_account_balance', {
            account_id,
            amount: balanceChange
        });

        return NextResponse.json(tx, { status: 201 });
    } catch (error) {
        return NextResponse.json({ detail: 'Erro interno' }, { status: 500 });
    }
}
