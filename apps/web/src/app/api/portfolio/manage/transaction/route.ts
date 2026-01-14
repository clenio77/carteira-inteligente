import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { jwtVerify } from 'jose';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';
const jwtSecret = process.env.SECRET_KEY || 'development-secret-key';

// Helper to get user from token
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

export async function POST(request: NextRequest) {
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
        const body = await request.json();

        const {
            ticker,
            asset_name,
            asset_type,
            transaction_type,
            quantity,
            price,
            transaction_date,
            broker,
            fees,
            notes,
            pf_account_id
        } = body;

        // Validate required fields
        if (!ticker || !quantity || !price || !transaction_type) {
            return NextResponse.json(
                { detail: 'Campos obrigatórios: ticker, quantity, price, transaction_type' },
                { status: 400 }
            );
        }

        const totalAmount = quantity * price + (fees || 0);

        // Insert transaction
        const { data: transaction, error: insertError } = await supabase
            .from('transactions')
            .insert([{
                user_id: userId,
                ticker: ticker.toUpperCase(),
                asset_name: asset_name || ticker,
                asset_type: asset_type || 'ACAO',
                transaction_type,
                quantity,
                price,
                total_amount: totalAmount,
                fees: fees || 0,
                broker,
                notes,
                transaction_date: transaction_date || new Date().toISOString().split('T')[0]
            }])
            .select()
            .single();

        if (insertError) {
            console.error('Insert error:', insertError);
            return NextResponse.json(
                { detail: 'Erro ao adicionar transação' },
                { status: 500 }
            );
        }

        // Update or create position
        const { data: existingPosition } = await supabase
            .from('asset_positions')
            .select('*')
            .eq('user_id', userId)
            .eq('ticker', ticker.toUpperCase())
            .single();

        if (existingPosition) {
            // Update existing position
            let newQuantity = existingPosition.quantity;
            let newTotalInvested = existingPosition.total_invested;

            if (transaction_type === 'COMPRA') {
                newQuantity += quantity;
                newTotalInvested += totalAmount;
            } else {
                newQuantity -= quantity;
                newTotalInvested -= quantity * existingPosition.average_price;
            }

            const newAveragePrice = newQuantity > 0 ? newTotalInvested / newQuantity : 0;

            await supabase
                .from('asset_positions')
                .update({
                    quantity: newQuantity,
                    total_invested: newTotalInvested,
                    average_price: newAveragePrice
                })
                .eq('id', existingPosition.id);
        } else if (transaction_type === 'COMPRA') {
            // Create new position
            await supabase
                .from('asset_positions')
                .insert([{
                    user_id: userId,
                    ticker: ticker.toUpperCase(),
                    asset_name: asset_name || ticker,
                    asset_type: asset_type || 'ACAO',
                    quantity,
                    average_price: price,
                    total_invested: totalAmount
                }]);
        }

        // Handle pf_account_id if provided
        if (pf_account_id) {
            const adjustmentAmount = transaction_type === 'COMPRA' ? -totalAmount : totalAmount;

            await supabase.rpc('adjust_account_balance', {
                account_id: pf_account_id,
                amount: adjustmentAmount
            });
        }

        return NextResponse.json({
            message: 'Transação adicionada com sucesso',
            transaction,
            position_updated: true
        }, { status: 201 });
    } catch (error: any) {
        console.error('Transaction error:', error);
        return NextResponse.json(
            { detail: 'Erro interno do servidor' },
            { status: 500 }
        );
    }
}
