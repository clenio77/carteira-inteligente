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

        const { data: positions, error } = await supabase
            .from('asset_positions')
            .select('*')
            .eq('user_id', userId)
            .gt('quantity', 0)
            .order('total_invested', { ascending: false });

        if (error) {
            console.error('Query error:', error);
            return NextResponse.json([]);
        }

        // Transform to expected format
        const result = (positions || []).map(pos => ({
            id: pos.id,
            user_id: pos.user_id,
            asset_id: pos.id, // Using position id as asset_id since we don't have separate assets table
            quantity: pos.quantity,
            average_price: pos.average_price,
            current_price: pos.current_price || pos.average_price,
            total_value: pos.quantity * (pos.current_price || pos.average_price),
            total_invested: pos.total_invested || (pos.quantity * pos.average_price),
            profit_loss: (pos.quantity * (pos.current_price || pos.average_price)) - (pos.total_invested || (pos.quantity * pos.average_price)),
            profit_loss_percentage: pos.average_price > 0 ?
                (((pos.current_price || pos.average_price) - pos.average_price) / pos.average_price) * 100 : 0,
            last_updated: pos.last_updated,
            created_at: pos.created_at,
            asset: {
                id: pos.id,
                ticker: pos.ticker,
                name: pos.asset_name || pos.ticker,
                type: pos.asset_type || 'ACAO',
                sector: null,
                description: null
            }
        }));

        return NextResponse.json(result);
    } catch (error) {
        console.error('Assets error:', error);
        return NextResponse.json([]);
    }
}
