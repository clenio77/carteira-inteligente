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

        // Get positions with current value (using average_price as current for now)
        const { data: positions, error } = await supabase
            .from('asset_positions')
            .select('*')
            .eq('user_id', userId)
            .gt('quantity', 0);

        if (error) {
            console.error('Query error:', error);
            return NextResponse.json({
                total_value: 0,
                total_invested: 0,
                profit_loss: 0,
                profit_loss_percentage: 0,
                allocation_by_type: [],
                allocation_by_sector: [],
                top_positions: [],
                positions_count: 0
            });
        }

        let totalInvested = 0;
        let totalValue = 0;
        const allocationByType: Record<string, number> = {};

        (positions || []).forEach(pos => {
            const invested = pos.total_invested || (pos.quantity * pos.average_price);
            const currentValue = pos.quantity * (pos.current_price || pos.average_price);

            totalInvested += invested;
            totalValue += currentValue;

            const type = pos.asset_type || 'ACAO';
            allocationByType[type] = (allocationByType[type] || 0) + currentValue;
        });

        const profitLoss = totalValue - totalInvested;
        const profitLossPercentage = totalInvested > 0 ? (profitLoss / totalInvested) * 100 : 0;

        // Format allocation
        const allocation = Object.entries(allocationByType).map(([type, value]) => ({
            type,
            value,
            percentage: totalValue > 0 ? (value / totalValue) * 100 : 0
        }));

        // Top positions
        const topPositions = (positions || [])
            .sort((a, b) => (b.total_invested || 0) - (a.total_invested || 0))
            .slice(0, 5)
            .map(pos => ({
                ticker: pos.ticker,
                name: pos.asset_name || pos.ticker,
                value: pos.quantity * (pos.current_price || pos.average_price),
                percentage: totalValue > 0 ? ((pos.quantity * (pos.current_price || pos.average_price)) / totalValue) * 100 : 0,
                profit_loss_percentage: pos.average_price > 0 ?
                    (((pos.current_price || pos.average_price) - pos.average_price) / pos.average_price) * 100 : 0
            }));

        return NextResponse.json({
            total_value: totalValue,
            total_invested: totalInvested,
            profit_loss: profitLoss,
            profit_loss_percentage: profitLossPercentage,
            allocation_by_type: allocation,
            allocation_by_sector: [],
            top_positions: topPositions,
            positions_count: (positions || []).length
        });
    } catch (error) {
        console.error('Overview error:', error);
        return NextResponse.json({
            total_value: 0,
            total_invested: 0,
            profit_loss: 0,
            profit_loss_percentage: 0,
            allocation_by_type: [],
            allocation_by_sector: [],
            top_positions: [],
            positions_count: 0
        });
    }
}
